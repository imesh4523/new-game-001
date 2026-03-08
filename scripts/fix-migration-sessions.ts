import pg from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const { Pool } = pg;

// Digital Ocean database connection
const doDbConfig = {
  host: process.env.DO_DB_HOST,
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  database: process.env.DO_DB_NAME,
  user: process.env.DO_DB_USER,
  password: process.env.DO_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
};

// Replit database connection
const replitDbUrl = process.env.DATABASE_URL;

if (!replitDbUrl) {
  throw new Error('DATABASE_URL not found');
}

if (!doDbConfig.host || !doDbConfig.database || !doDbConfig.user || !doDbConfig.password) {
  throw new Error('Digital Ocean database credentials not found. Please provide DO_DB_HOST, DO_DB_PORT, DO_DB_NAME, DO_DB_USER, DO_DB_PASSWORD');
}

const doPool = new Pool(doDbConfig);
const replitPool = new NeonPool({ connectionString: replitDbUrl });

async function fixUserSessionsMigration() {
  try {
    console.log('🔧 Fixing user_sessions migration...\n');
    
    // Test connections
    await doPool.query('SELECT 1');
    console.log('✅ Digital Ocean database connected');
    
    await replitPool.query('SELECT 1');
    console.log('✅ Replit database connected\n');

    // Step 1: Clear existing sessions in Replit
    console.log('🗑️  Clearing existing sessions in Replit...');
    await replitPool.query('TRUNCATE TABLE user_sessions CASCADE');
    console.log('✅ Cleared\n');

    // Step 2: Get all sessions from Digital Ocean
    console.log('📦 Fetching sessions from Digital Ocean...');
    const sessionsResult = await doPool.query('SELECT * FROM user_sessions ORDER BY login_time DESC');
    const sessions = sessionsResult.rows;
    console.log(`   Found ${sessions.length} sessions\n`);

    if (sessions.length === 0) {
      console.log('ℹ️  No sessions to migrate');
      return;
    }

    // Step 3: Get all user IDs from Replit to validate foreign keys
    console.log('🔍 Validating user IDs...');
    const usersResult = await replitPool.query('SELECT id FROM users');
    const validUserIds = new Set(usersResult.rows.map(row => row.id));
    console.log(`   Found ${validUserIds.size} users in Replit\n`);

    // Step 4: Migrate sessions with detailed error tracking
    console.log('🚀 Migrating sessions...\n');
    let successCount = 0;
    let errorCount = 0;
    let orphanedCount = 0;
    const errors: Array<{ session: any; error: string }> = [];

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      
      // Check if user exists
      if (!validUserIds.has(session.user_id)) {
        orphanedCount++;
        if (orphanedCount <= 5) {
          console.log(`⚠️  Skipping orphaned session (user ${session.user_id} not found)`);
        }
        continue;
      }

      try {
        const columns = Object.keys(session);
        const values = Object.values(session);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO user_sessions (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
        `;
        
        await replitPool.query(insertQuery, values);
        successCount++;
        
        // Show progress every 100 rows
        if ((i + 1) % 100 === 0) {
          console.log(`   Progress: ${i + 1}/${sessions.length} processed...`);
        }
      } catch (error: any) {
        errorCount++;
        if (errors.length < 10) {
          errors.push({ 
            session: { 
              id: session.id, 
              user_id: session.user_id, 
              ip_address: session.ip_address 
            }, 
            error: error.message 
          });
        }
      }
    }

    // Print results
    console.log('\n📊 Migration Results:');
    console.log(`   ✅ Successfully migrated: ${successCount} sessions`);
    console.log(`   ⚠️  Orphaned sessions skipped: ${orphanedCount} sessions`);
    console.log(`   ❌ Errors: ${errorCount} sessions`);

    if (errors.length > 0) {
      console.log('\n❌ Sample errors:');
      errors.forEach(({ session, error }) => {
        console.log(`   Session ${session.id} (user: ${session.user_id}, IP: ${session.ip_address}): ${error}`);
      });
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyResult = await replitPool.query('SELECT COUNT(*) as count FROM user_sessions');
    const finalCount = parseInt(verifyResult.rows[0].count);
    console.log(`   Total sessions in Replit: ${finalCount}`);
    
    if (finalCount === successCount) {
      console.log('   ✅ Verification successful!');
    } else {
      console.log(`   ⚠️  Count mismatch: expected ${successCount}, got ${finalCount}`);
    }

    console.log('\n✨ Migration complete!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await doPool.end();
    await replitPool.end();
  }
}

fixUserSessionsMigration().catch(console.error);
