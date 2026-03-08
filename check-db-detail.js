const { Pool } = require('pg');

console.log('=== Checking Database Configuration ===\n');

// Check individual env vars
const dbUrl = process.env.DATABASE_URL;
const pgHost = process.env.PGHOST;
const pgUser = process.env.PGUSER;
const pgDb = process.env.PGDATABASE;
const pgPort = process.env.PGPORT;
const pgPass = process.env.PGPASSWORD;

console.log('DATABASE_URL:', dbUrl ? `${dbUrl.substring(0, 60)}...` : 'EMPTY');
console.log('PGHOST:', pgHost || 'EMPTY');
console.log('PGUSER:', pgUser || 'EMPTY');
console.log('PGDATABASE:', pgDb || 'EMPTY');
console.log('PGPORT:', pgPort || 'EMPTY');
console.log('PGPASSWORD:', pgPass ? '***SET***' : 'EMPTY');

if (dbUrl && dbUrl.length > 20) {
  console.log('\n✅ DATABASE_URL is set, attempting connection...');
  
  const pool = new Pool({ connectionString: dbUrl });
  
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Connection failed:', err.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('Server time:', res.rows[0].now);
    }
    pool.end();
  });
} else {
  console.log('\n❌ DATABASE_URL is not properly set (empty or too short)');
  console.log('Length:', dbUrl?.length || 0);
}
