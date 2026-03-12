import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized: false }});

// All games profit
const r1 = await pool.query(`
  SELECT 
    bet_type,
    COUNT(*) as total_bets,
    COALESCE(SUM(amount::numeric), 0) as total_wagered,
    COALESCE(SUM(CASE WHEN status IN ('cashed_out','won') THEN COALESCE(actual_payout::numeric, 0) ELSE 0 END), 0) as total_payout
  FROM bets
  GROUP BY bet_type
  ORDER BY total_wagered DESC
`);
console.log('=== ALL GAME PROFITS ===');
for (const row of r1.rows) {
  const wagered = parseFloat(row.total_wagered);
  const payout = parseFloat(row.total_payout);
  const houseProfit = wagered - payout;
  console.log(`[${row.bet_type}] Bets:${row.total_bets} | Wagered:${wagered.toFixed(2)} | Payout:${payout.toFixed(2)} | HouseProfit:${houseProfit.toFixed(2)}`);
}

// Per user crash P&L
const r2 = await pool.query(`
  SELECT 
    u.username,
    u.public_id,
    COUNT(*) as rounds,
    SUM(b.amount::numeric) as wagered,
    COALESCE(SUM(CASE WHEN b.status='cashed_out' THEN b.actual_payout::numeric ELSE 0 END), 0) as won_payout,
    SUM(b.amount::numeric) - COALESCE(SUM(CASE WHEN b.status='cashed_out' THEN b.actual_payout::numeric ELSE 0 END), 0) as house_profit_from_user
  FROM bets b
  JOIN users u ON b.user_id = u.id
  WHERE b.bet_type = 'crash'
  GROUP BY u.id, u.username, u.public_id
  ORDER BY wagered DESC
`);
console.log('\n=== PER-USER CRASH ===');
for (const row of r2.rows) {
  const net = parseFloat(row.house_profit_from_user);
  console.log(`${row.username} | Rounds:${row.rounds} | Wagered:${parseFloat(row.wagered).toFixed(2)} | HouseEarned:${net.toFixed(2)}`);
}

await pool.end();
