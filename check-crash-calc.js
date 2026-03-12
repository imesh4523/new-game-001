import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized: false }});

// Check actual columns in users table
const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
console.log('Users columns:', cols.rows.map(r => r.column_name).join(', '));

// Every crash bet - no join
const r = await pool.query(`
  SELECT b.id, b.user_id, b.amount, b.status, b.actual_payout, b.game_id, b.created_at
  FROM bets b
  WHERE b.bet_type = 'crash'
  ORDER BY b.created_at ASC
`);

console.log('\n=== CRASH BETS — RAW (1 coin = currency unit) ===\n');

let totalWagered = 0, totalPayout = 0, wins = 0, losses = 0;

for (const row of r.rows) {
  const amount = parseFloat(row.amount);
  const payout = parseFloat(row.actual_payout || '0');
  const isWin = row.status === 'cashed_out';
  totalWagered += amount;
  if (isWin) { totalPayout += payout; wins++; } else { losses++; }
  const netUser = isWin ? (payout - amount) : -amount;
  const netHouse = -netUser;
  console.log(`[${row.status.padEnd(12)}] user:${String(row.user_id).slice(0,8)} | Bet:${amount.toFixed(2).padStart(7)} | Payout:${payout.toFixed(2).padStart(8)} | UserNet:${(netUser>=0?'+':'')+netUser.toFixed(2)} | HouseNet:${(netHouse>=0?'+':'')+netHouse.toFixed(2)}`);
}

const houseProfit = totalWagered - totalPayout;

console.log('\n' + '─'.repeat(90));
console.log(`Bets: ${r.rows.length} | Wins: ${wins} | Losses: ${losses}`);
console.log(`Total Wagered:  ${totalWagered.toFixed(2)} coins  (${ (totalWagered/100).toFixed(4) } USD if 1$ = 100 coins)`);
console.log(`Total Payout:   ${totalPayout.toFixed(2)} coins  (${ (totalPayout/100).toFixed(4) } USD)`);
console.log(`House Profit:   ${houseProfit.toFixed(2)} coins  (${ (houseProfit/100).toFixed(4) } USD)`);
console.log(`Profit Rate:    ${totalWagered > 0 ? ((houseProfit/totalWagered)*100).toFixed(2) : 0}%`);

console.log('\n=== DASHBOARD VALIDATION ===');
console.log('Dashboard shows: Wagered=9.00 | Payout=10.14 | Profit=-1.14');
console.log(`Script found:    Wagered=${totalWagered.toFixed(2)} | Payout=${totalPayout.toFixed(2)} | Profit=${houseProfit.toFixed(2)}`);

const wOK = Math.abs(totalWagered - 9.0) < 0.05;
const pOK = Math.abs(totalPayout - 10.14) < 0.05;
const prOK = Math.abs(houseProfit - (-1.14)) < 0.05;
console.log(`\nWagered match:  ${wOK ? '✅ CORRECT' : '❌ MISMATCH'}`);
console.log(`Payout match:   ${pOK ? '✅ CORRECT' : '❌ MISMATCH'}`);
console.log(`Profit match:   ${prOK ? '✅ CORRECT' : '❌ MISMATCH'}`);

if (!wOK || !pOK || !prOK) {
  console.log('\n⚠️  Calculation mismatch found! Dashboard may be incorrect.');
}

await pool.end();
