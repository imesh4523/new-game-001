import pg from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const { Pool } = pg;

// Digital Ocean database connection (using standard pg library)
const doDbConfig = {
  host: process.env.DO_DB_HOST,
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  database: process.env.DO_DB_NAME,
  user: process.env.DO_DB_USER,
  password: process.env.DO_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
};

// Replit database connection (using Neon serverless)
const replitDbUrl = process.env.DATABASE_URL;

if (!replitDbUrl) {
  throw new Error('DATABASE_URL not found');
}

if (!doDbConfig.host || !doDbConfig.database || !doDbConfig.user || !doDbConfig.password) {
  throw new Error('Digital Ocean database credentials not found. Please provide DO_DB_HOST, DO_DB_PORT, DO_DB_NAME, DO_DB_USER, DO_DB_PASSWORD');
}

const doPool = new Pool(doDbConfig);
const replitPool = new NeonPool({ connectionString: replitDbUrl });

async function clearReplitDatabase() {
  console.log('🗑️  Clearing Replit database...');
  
  const tables = [
    'promo_code_redemptions',
    'promo_codes',
    'push_subscriptions',
    'notifications',
    'withdrawal_requests',
    'passkeys',
    'agent_activities',
    'agent_profiles',
    'password_reset_tokens',
    'page_views',
    'user_sessions',
    'game_analytics',
    'admin_actions',
    'transactions',
    'referrals',
    'bets',
    'games',
    'vip_settings',
    'database_connections',
    'system_settings',
    'golden_live_events',
    'golden_live_stats',
    'users'
  ];

  for (const table of tables) {
    try {
      await replitPool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      console.log(`✅ Cleared table: ${table}`);
    } catch (error: any) {
      console.log(`⚠️  Table ${table} not found or already empty`);
    }
  }
}

async function migrateTable(tableName: string, customQuery?: string) {
  try {
    console.log(`\n📦 Migrating table: ${tableName}`);
    
    // Get data from Digital Ocean
    const query = customQuery || `SELECT * FROM "${tableName}"`;
    const result = await doPool.query(query);
    
    if (result.rows.length === 0) {
      console.log(`ℹ️  No data found in ${tableName}`);
      return;
    }

    console.log(`📊 Found ${result.rows.length} rows in ${tableName}`);

    // Insert into Replit database
    let successCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      try {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await replitPool.query(insertQuery, values);
        successCount++;
      } catch (error: any) {
        errorCount++;
        if (errorCount <= 3) {
          console.error(`❌ Error inserting row: ${error.message}`);
        }
      }
    }

    console.log(`✅ ${tableName}: ${successCount} rows migrated successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
  } catch (error: any) {
    console.error(`❌ Error migrating ${tableName}: ${error.message}`);
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting migration from Digital Ocean to Replit...\n');
    
    // Test connections
    console.log('🔌 Testing Digital Ocean connection...');
    await doPool.query('SELECT 1');
    console.log('✅ Digital Ocean database connected');
    
    console.log('🔌 Testing Replit connection...');
    await replitPool.query('SELECT 1');
    console.log('✅ Replit database connected\n');

    // Clear Replit database
    await clearReplitDatabase();

    console.log('\n📦 Starting data migration...\n');

    // Migrate tables in order (respecting foreign key constraints)
    await migrateTable('users');
    await migrateTable('system_settings');
    await migrateTable('vip_settings');
    await migrateTable('database_connections');
    await migrateTable('golden_live_stats');
    await migrateTable('golden_live_events');
    await migrateTable('games');
    await migrateTable('bets');
    await migrateTable('referrals');
    await migrateTable('transactions');
    await migrateTable('admin_actions');
    await migrateTable('game_analytics');
    await migrateTable('user_sessions');
    await migrateTable('page_views');
    await migrateTable('password_reset_tokens');
    await migrateTable('agent_profiles');
    await migrateTable('agent_activities');
    await migrateTable('passkeys');
    await migrateTable('withdrawal_requests');
    await migrateTable('notifications');
    await migrateTable('push_subscriptions');
    await migrateTable('promo_codes');
    await migrateTable('promo_code_redemptions');

    console.log('\n✅ Migration completed successfully!');
    console.log('🎉 All data has been transferred from Digital Ocean to Replit database');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await doPool.end();
    await replitPool.end();
  }
}

migrate().catch(console.error);
