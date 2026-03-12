import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized: false }});
await pool.query('ALTER TABLE crash_settings ADD COLUMN IF NOT EXISTS min_bet_amount DECIMAL(18,2) NOT NULL DEFAULT 50.00');
await pool.query('ALTER TABLE crash_settings ADD COLUMN IF NOT EXISTS max_bet_amount DECIMAL(18,2) NOT NULL DEFAULT 10000.00');
const r = await pool.query('SELECT house_edge, min_bet_amount, max_bet_amount FROM crash_settings LIMIT 1');
console.log('✅ DB columns added:', JSON.stringify(r.rows[0]));
await pool.end();
