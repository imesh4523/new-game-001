import pg from 'pg';

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

const doPool = new Pool(doDbConfig);

async function checkTables() {
  try {
    console.log('🔍 Checking Digital Ocean database tables...\n');
    
    await doPool.query('SELECT 1');
    console.log('✅ Connected to Digital Ocean database\n');

    // Get all tables
    const tablesResult = await doPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📊 Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    // Check users table structure
    console.log('\n📋 Users table structure:');
    const usersColumns = await doPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log(`   Columns: ${usersColumns.rows.length}`);
    usersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Count users
    const usersCount = await doPool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total users: ${usersCount.rows[0].count}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await doPool.end();
  }
}

checkTables().catch(console.error);
