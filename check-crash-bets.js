import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

try {
  const r1 = await pool.query("SELECT COUNT(*) FROM bets WHERE bet_type='crash'");
  const r2 = await pool.query("SELECT COUNT(*) FROM bets WHERE bet_type='crash' AND status='cashed_out'");
  const r3 = await pool.query("SELECT COUNT(*) FROM bets WHERE bet_type='crash' AND status='lost'");
  const r4 = await pool.query("SELECT COUNT(*) FROM bets WHERE bet_type='crash' AND status='pending'");
  const r5 = await pool.query("SELECT DISTINCT status FROM bets WHERE bet_type='crash'");
  
  console.log('=== CRASH BETTING STATS ===');
  console.log('Total crash bets:', r1.rows[0].count);
  console.log('Cashed out (wins):', r2.rows[0].count);
  console.log('Lost:', r3.rows[0].count);
  console.log('Pending:', r4.rows[0].count);
  console.log('All crash statuses:', r5.rows.map(r => r.status));

  // Check if crash settings exist
  const r6 = await pool.query("SELECT * FROM crash_settings LIMIT 1");
  const r7 = await pool.query("SELECT * FROM advanced_crash_settings LIMIT 1");
  console.log('\n=== CRASH SETTINGS ===');
  console.log('crash_settings:', r6.rows[0] ? 'EXISTS' : 'EMPTY');
  console.log('advanced_crash_settings:', r7.rows[0] ? 'EXISTS' : 'EMPTY');
  if (r6.rows[0]) console.log('  house_edge:', r6.rows[0].house_edge);
  if (r7.rows[0]) console.log('  deep_thinking_enabled:', r7.rows[0].deep_thinking_enabled);
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
