import pkg from 'pg';
const { Client } = pkg;

// Replit database (Primary)
const replitClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Digital Ocean database (Backup)
const doClient = new Client({
  host: process.env.BACKUP_DB_HOST || 'your-db-host.com',
  port: parseInt(process.env.BACKUP_DB_PORT || '25060'),
  database: process.env.BACKUP_DB_NAME || 'dbname',
  user: process.env.BACKUP_DB_USER || 'username',
  password: process.env.BACKUP_DB_PASSWORD || 'password',
  ssl: { rejectUnauthorized: false }
});

async function dropAllTables() {
  console.log('🗑️  Dropping all tables in Digital Ocean backup...');
  
  const result = await doClient.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
  `);
  
  for (const row of result.rows) {
    await doClient.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    console.log(`   Dropped: ${row.tablename}`);
  }
  console.log('✅ All tables dropped\n');
}

async function copySchema() {
  console.log('📋 Copying schema from Primary to Backup...');
  
  // Get CREATE TABLE statements from Replit
  const schemaTables = ['users', 'games', 'bets', 'transactions', 'referrals', 
    'admin_actions', 'game_analytics', 'user_sessions', 'page_views', 
    'password_reset_tokens', 'system_settings', 'database_connections',
    'agent_profiles', 'agent_activities', 'passkeys', 'golden_live_stats',
    'golden_live_events', 'vip_settings', 'notifications', 'push_subscriptions',
    'withdrawal_requests', 'promo_codes', 'promo_code_redemptions'];
  
  for (const table of schemaTables) {
    try {
      // Get column definitions from Replit
      const columns = await replitClient.query(`
        SELECT column_name, data_type, character_maximum_length, 
               column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      if (columns.rows.length === 0) continue;
      
      // Build CREATE TABLE statement
      const colDefs = columns.rows.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE IF NOT EXISTS "${table}" (${colDefs})`;
      await doClient.query(createSQL);
      console.log(`   ✅ Created: ${table}`);
      
    } catch (error) {
      console.log(`   ⏭️  Skipped: ${table} (${error.message})`);
    }
  }
  
  console.log('✅ Schema copied\n');
}

async function copyData() {
  console.log('📦 Copying all data from Primary to Backup...\n');
  
  const tables = await replitClient.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  
  for (const { tablename } of tables.rows) {
    try {
      // Get data from Replit
      const data = await replitClient.query(`SELECT * FROM "${tablename}"`);
      
      if (data.rows.length === 0) {
        console.log(`   ⏭️  ${tablename}: No data`);
        continue;
      }
      
      // Insert data to Digital Ocean in batches
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);
        const columns = Object.keys(batch[0]);
        
        const placeholders = batch.map((_, rowIndex) => 
          `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const values = batch.flatMap(row => columns.map(col => row[col]));
        
        const insertSQL = `
          INSERT INTO "${tablename}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES ${placeholders}
          ON CONFLICT DO NOTHING
        `;
        
        await doClient.query(insertSQL, values);
        inserted += batch.length;
      }
      
      console.log(`   ✅ ${tablename}: ${inserted} rows copied`);
      
    } catch (error) {
      console.log(`   ❌ ${tablename}: ${error.message}`);
    }
  }
  
  console.log('\n✅ All data copied');
}

async function fullSync() {
  try {
    console.log('🚀 Starting full backup sync...\n');
    
    await replitClient.connect();
    await doClient.connect();
    console.log('🔌 Connected to both databases\n');
    
    await dropAllTables();
    await copySchema();
    await copyData();
    
    console.log('\n🎉 Full backup sync completed!');
    console.log('✨ Real-time sync will keep them synchronized from now on');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
  } finally {
    await replitClient.end();
    await doClient.end();
  }
}

fullSync();
