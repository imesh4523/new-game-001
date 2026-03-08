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

async function diagnose() {
  try {
    console.log('🔍 Diagnosing migration issues...\n');
    
    // Test connections
    await doPool.query('SELECT 1');
    console.log('✅ Digital Ocean database connected');
    
    await replitPool.query('SELECT 1');
    console.log('✅ Replit database connected\n');

    // Check user_sessions in Digital Ocean
    console.log('📊 Checking user_sessions in Digital Ocean...');
    const doSessionsResult = await doPool.query('SELECT COUNT(*) as count FROM user_sessions');
    const doSessionsCount = parseInt(doSessionsResult.rows[0].count);
    console.log(`   Total sessions in Digital Ocean: ${doSessionsCount}`);
    
    if (doSessionsCount > 0) {
      const doSampleResult = await doPool.query('SELECT * FROM user_sessions LIMIT 3');
      console.log(`   Sample sessions:`, doSampleResult.rows);
    }

    // Check user_sessions in Replit
    console.log('\n📊 Checking user_sessions in Replit...');
    const replitSessionsResult = await replitPool.query('SELECT COUNT(*) as count FROM user_sessions');
    const replitSessionsCount = parseInt(replitSessionsResult.rows[0].count);
    console.log(`   Total sessions in Replit: ${replitSessionsCount}`);
    
    if (replitSessionsCount > 0) {
      const replitSampleResult = await replitPool.query('SELECT * FROM user_sessions LIMIT 3');
      console.log(`   Sample sessions:`, replitSampleResult.rows);
    }

    // Check for orphaned sessions (sessions without matching users)
    console.log('\n🔍 Checking for orphaned sessions in Digital Ocean...');
    const orphanedResult = await doPool.query(`
      SELECT us.id, us.user_id, us.ip_address 
      FROM user_sessions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE u.id IS NULL
      LIMIT 10
    `);
    
    if (orphanedResult.rows.length > 0) {
      console.log(`   ⚠️  Found ${orphanedResult.rows.length} orphaned sessions (no matching user):`);
      console.log(orphanedResult.rows);
    } else {
      console.log('   ✅ No orphaned sessions found');
    }

    // Check user_sessions grouped by user
    console.log('\n📊 Sessions per user in Digital Ocean:');
    const sessionsPerUserDO = await doPool.query(`
      SELECT u.email, COUNT(us.id) as session_count
      FROM users u
      LEFT JOIN user_sessions us ON u.id = us.user_id
      GROUP BY u.email
      ORDER BY session_count DESC
      LIMIT 10
    `);
    console.log(sessionsPerUserDO.rows);

    console.log('\n📊 Sessions per user in Replit:');
    const sessionsPerUserReplit = await replitPool.query(`
      SELECT u.email, COUNT(us.id) as session_count
      FROM users u
      LEFT JOIN user_sessions us ON u.id = us.user_id
      GROUP BY u.email
      ORDER BY session_count DESC
      LIMIT 10
    `);
    console.log(sessionsPerUserReplit.rows);

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Digital Ocean sessions: ${doSessionsCount}`);
    console.log(`   Replit sessions: ${replitSessionsCount}`);
    console.log(`   Missing sessions: ${doSessionsCount - replitSessionsCount}`);
    
    if (doSessionsCount > replitSessionsCount) {
      console.log(`   ⚠️  Migration incomplete: ${doSessionsCount - replitSessionsCount} sessions missing!`);
    } else if (replitSessionsCount === 0 && doSessionsCount > 0) {
      console.log('   ❌ CRITICAL: No sessions migrated at all!');
    } else {
      console.log('   ✅ All sessions migrated successfully!');
    }

  } catch (error: any) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error(error);
  } finally {
    await doPool.end();
    await replitPool.end();
  }
}

diagnose().catch(console.error);
