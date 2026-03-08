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

const doPool = new Pool(doDbConfig);
const replitPool = new NeonPool({ connectionString: replitDbUrl });

async function migrateUsers() {
  try {
    console.log('🚀 Starting user migration from Digital Ocean to Replit...\n');
    
    // Test connections
    await doPool.query('SELECT 1');
    console.log('✅ Digital Ocean database connected');
    
    await replitPool.query('SELECT 1');
    console.log('✅ Replit database connected\n');

    // Check existing users in Replit
    const existingUsersResult = await replitPool.query('SELECT COUNT(*) as count FROM users');
    const existingCount = parseInt(existingUsersResult.rows[0].count);
    console.log(`📊 Existing users in Replit: ${existingCount}`);

    // Get users from Digital Ocean
    console.log('📦 Fetching users from Digital Ocean...');
    const doUsersResult = await doPool.query('SELECT * FROM users ORDER BY created_at');
    const doUsers = doUsersResult.rows;
    console.log(`   Found ${doUsers.length} users in Digital Ocean\n`);

    if (doUsers.length === 0) {
      console.log('ℹ️  No users to migrate');
      return;
    }

    // Show sample users
    console.log('👥 Sample users from Digital Ocean:');
    doUsers.slice(0, 3).forEach(user => {
      console.log(`   - ${user.email} (${user.role}, VIP: ${user.vip_level})`);
    });

    // Migrate users
    console.log('\n🚀 Starting migration...\n');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < doUsers.length; i++) {
      const user = doUsers[i];
      
      try {
        // Check if user already exists
        const existingUser = await replitPool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length > 0) {
          skipCount++;
          console.log(`   ⏭️  Skipped: ${user.email} (already exists)`);
          continue;
        }

        // Prepare user data - handle missing fields
        const userData = {
          ...user,
          withdrawal_password_hash: user.withdrawal_password_hash || null,
          profile_photo: user.profile_photo || null,
          referral_code: user.referral_code || null,
          referred_by: user.referred_by || null,
          registration_ip: user.registration_ip || null,
          registration_country: user.registration_country || null,
          last_login_ip: user.last_login_ip || null,
          two_factor_secret: user.two_factor_secret || null,
          // Add missing required fields with defaults
          lifetime_commission_earned: user.lifetime_commission_earned || '0.00000000',
          remaining_required_bet_amount: user.remaining_required_bet_amount || '0.00000000',
          is_banned: user.is_banned || false,
          banned_until: user.banned_until || null,
          ban_reason: user.ban_reason || null,
          enable_animations: user.enable_animations !== undefined ? user.enable_animations : true,
          wingo_mode: user.wingo_mode || false,
          last_withdrawal_request_at: user.last_withdrawal_request_at || null,
        };

        const columns = Object.keys(userData);
        const values = Object.values(userData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO users (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
        `;
        
        await replitPool.query(insertQuery, values);
        successCount++;
        console.log(`   ✅ Migrated: ${user.email}`);
        
      } catch (error: any) {
        errorCount++;
        errors.push({ email: user.email, error: error.message });
        console.log(`   ❌ Error: ${user.email} - ${error.message}`);
      }
    }

    // Print results
    console.log('\n📊 Migration Results:');
    console.log(`   ✅ Successfully migrated: ${successCount} users`);
    console.log(`   ⏭️  Skipped (already exist): ${skipCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);

    if (errors.length > 0) {
      console.log('\n❌ Errors detail:');
      errors.forEach(({ email, error }) => {
        console.log(`   ${email}: ${error}`);
      });
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const finalCountResult = await replitPool.query('SELECT COUNT(*) as count FROM users');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    console.log(`   Total users in Replit now: ${finalCount}`);
    console.log(`   Total users in Digital Ocean: ${doUsers.length}`);
    
    console.log('\n✨ Migration complete!');
    console.log('\n📝 Note: Login history (IP sessions) දත Digital Ocean එකේ නැති නිසා migrate වෙන්නේ නැහැ.');
    console.log('   Users නැවත login වුණාම නව IP history data එකතු වෙනවා.');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await doPool.end();
    await replitPool.end();
  }
}

migrateUsers().catch(console.error);
