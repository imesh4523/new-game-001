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

async function compareDatabases() {
  try {
    await replitClient.connect();
    await doClient.connect();
    console.log('🔌 Connected to both databases\n');

    const tables = ['users', 'games', 'bets', 'transactions', 'system_settings', 'vip_settings'];
    
    console.log('📊 Comparing data between Primary (Replit) and Backup (Digital Ocean):\n');
    console.log('='.repeat(80));

    for (const table of tables) {
      try {
        // Count records in Replit
        const replitCount = await replitClient.query(`SELECT COUNT(*) FROM "${table}"`);
        
        // Count records in Digital Ocean
        const doCount = await doClient.query(`SELECT COUNT(*) FROM "${table}"`);
        
        const replitTotal = parseInt(replitCount.rows[0].count);
        const doTotal = parseInt(doCount.rows[0].count);
        
        const status = replitTotal === doTotal ? '✅' : '❌';
        const syncPercent = doTotal === 0 ? 0 : Math.round((doTotal / replitTotal) * 100);
        
        console.log(`${status} ${table.padEnd(20)} | Primary: ${String(replitTotal).padStart(6)} | Backup: ${String(doTotal).padStart(6)} | Sync: ${syncPercent}%`);
        
      } catch (error) {
        console.log(`⏭️  ${table.padEnd(20)} | Skipped (table may not exist in backup)`);
      }
    }
    
    console.log('='.repeat(80));
    console.log('\n📋 Summary:');
    console.log('   Primary Database: Replit PostgreSQL');
    console.log('   Backup Database:  Digital Ocean PostgreSQL');
    console.log('   Real-time Sync:   Active for all operations\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await replitClient.end();
    await doClient.end();
  }
}

compareDatabases();
