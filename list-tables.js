
import 'dotenv/config';
import { pool } from './server/db.js';

async function listTables() {
  if (!pool) {
    console.log('No pool connection');
    process.exit(1);
  }
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in DB:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    process.exit(0);
  }
}

listTables();
