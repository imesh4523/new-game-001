import { db } from '../server/db';
import { users, transactions, depositRequests, agentActivities } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function checkTransactionClearImpact() {
  try {
    console.log('\n🔍 Check Transaction Clear Impact Analysis\n');
    console.log('═'.repeat(80));
    
    // Get user email
    const email = await question('\n📧 Enter user email to analyze: ');
    
    if (!email || email.trim() === '') {
      console.log('❌ Email is required!');
      rl.close();
      return;
    }
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim()))
      .limit(1);
    
    if (!user) {
      console.log(`\n❌ User not found with email: ${email}`);
      rl.close();
      return;
    }
    
    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n' + '═'.repeat(80));
    
    // Get all transactions for this user
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id));
    
    console.log(`\n📊 TRANSACTION RECORDS TO BE DELETED:`);
    console.log(`   Total Transactions: ${userTransactions.length}`);
    
    if (userTransactions.length === 0) {
      console.log('\n⚠️  No transactions found. Nothing will be affected.');
      rl.close();
      return;
    }
    
    // Break down by type
    const deposits = userTransactions.filter(t => t.type === 'deposit');
    const withdrawals = userTransactions.filter(t => t.type === 'withdrawal');
    const bonuses = userTransactions.filter(t => t.type === 'referral_bonus');
    const commissions = userTransactions.filter(t => t.type === 'agent_commission');
    const commissionWithdrawals = userTransactions.filter(t => t.type === 'commission_withdrawal');
    
    console.log(`\n   Breakdown:`);
    console.log(`   ├─ ${deposits.length} deposits`);
    console.log(`   ├─ ${withdrawals.length} withdrawals`);
    console.log(`   ├─ ${bonuses.length} referral bonuses`);
    console.log(`   ├─ ${commissions.length} agent commissions`);
    console.log(`   └─ ${commissionWithdrawals.length} commission withdrawals`);
    
    // Calculate totals from transactions
    const calculatedDepositTotal = deposits
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const calculatedWithdrawalTotal = withdrawals
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n💰 USER RECORD FIELDS (These will become INACCURATE after clearing):`);
    console.log(`\n   Current Values in User Record:`);
    console.log(`   ├─ Total Deposits: $${parseFloat(user.totalDeposits)}`);
    console.log(`   ├─ Total Withdrawals: $${parseFloat(user.totalWithdrawals)}`);
    console.log(`   ├─ Current Balance: $${parseFloat(user.balance)}`);
    console.log(`   ├─ VIP Level: ${user.vipLevel}`);
    console.log(`   └─ Team Size: ${user.teamSize}`);
    
    console.log(`\n   Calculated from Transactions (to be deleted):`);
    console.log(`   ├─ Deposit Total: $${calculatedDepositTotal.toFixed(2)}`);
    console.log(`   └─ Withdrawal Total: $${calculatedWithdrawalTotal.toFixed(2)}`);
    
    // Check if values match
    const depositMatch = Math.abs(parseFloat(user.totalDeposits) - calculatedDepositTotal) < 0.01;
    const withdrawalMatch = Math.abs(parseFloat(user.totalWithdrawals) - calculatedWithdrawalTotal) < 0.01;
    
    console.log(`\n   Data Integrity:`);
    console.log(`   ├─ Deposits Match: ${depositMatch ? '✅' : '❌ MISMATCH!'}`);
    console.log(`   └─ Withdrawals Match: ${withdrawalMatch ? '✅' : '❌ MISMATCH!'}`);
    
    // Check deposit requests that reference transactions
    const relatedDepositRequests = await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.userId, user.id));
    
    const depositRequestsWithTransactions = relatedDepositRequests.filter(dr => dr.transactionId);
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n🔗 RELATED RECORDS (These will have broken references):`);
    console.log(`\n   Deposit Requests:`);
    console.log(`   ├─ Total: ${relatedDepositRequests.length}`);
    console.log(`   ├─ With Transaction Links: ${depositRequestsWithTransactions.length}`);
    console.log(`   └─ Impact: ${depositRequestsWithTransactions.length > 0 ? '⚠️  Transaction links will become NULL' : '✅ No impact'}`);
    
    // Check agent activities that reference transactions
    const relatedAgentActivities = await db
      .select()
      .from(agentActivities)
      .where(eq(agentActivities.targetUserId, user.id));
    
    const agentActivitiesWithTransactions = relatedAgentActivities.filter(aa => aa.transactionId);
    
    console.log(`\n   Agent Activities:`);
    console.log(`   ├─ Total: ${relatedAgentActivities.length}`);
    console.log(`   ├─ With Transaction Links: ${agentActivitiesWithTransactions.length}`);
    console.log(`   └─ Impact: ${agentActivitiesWithTransactions.length > 0 ? '⚠️  Transaction links will become invalid' : '✅ No impact'}`);
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n⚠️  SUMMARY OF IMPACT:`);
    console.log(`\n   What will be DELETED:`);
    console.log(`   ├─ ${userTransactions.length} transaction records`);
    console.log(`   └─ Complete transaction history`);
    
    console.log(`\n   What will become INACCURATE:`);
    console.log(`   ├─ User's totalDeposits field (will still show: $${parseFloat(user.totalDeposits)})`);
    console.log(`   ├─ User's totalWithdrawals field (will still show: $${parseFloat(user.totalWithdrawals)})`);
    console.log(`   └─ No way to verify transaction history`);
    
    console.log(`\n   What will NOT change:`);
    console.log(`   ├─ Current Balance: $${parseFloat(user.balance)} (stays same)`);
    console.log(`   ├─ VIP Level: ${user.vipLevel} (stays same)`);
    console.log(`   ├─ Frozen Balance: $${parseFloat(user.frozenBalance)} (stays same)`);
    console.log(`   └─ Team Size: ${user.teamSize} (stays same)`);
    
    console.log(`\n   Broken References:`);
    console.log(`   ├─ ${depositRequestsWithTransactions.length} deposit request transaction links`);
    console.log(`   └─ ${agentActivitiesWithTransactions.length} agent activity transaction links`);
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n💡 RECOMMENDATION:`);
    
    if (depositMatch && withdrawalMatch) {
      console.log(`   ✅ Transaction data is consistent with user record.`);
      console.log(`   ⚠️  However, clearing will make future auditing impossible.`);
    } else {
      console.log(`   ⚠️  Data MISMATCH detected! Review before clearing.`);
    }
    
    console.log(`\n   If you proceed with clearing:`);
    console.log(`   1. Transaction history will be permanently lost`);
    console.log(`   2. User totals (deposits/withdrawals) will be outdated`);
    console.log(`   3. ${depositRequestsWithTransactions.length + agentActivitiesWithTransactions.length} records will have broken links`);
    console.log(`   4. Balance, VIP level, and other fields remain unchanged`);
    
    console.log('\n' + '═'.repeat(80));
    
    const proceed = await question('\n❓ Do you want to proceed with CLEARING transactions? (yes/no): ');
    
    if (proceed.toLowerCase() === 'yes') {
      console.log('\n⚠️  To clear transactions, run:');
      console.log(`   npx tsx scripts/clear-user-transaction-history.ts`);
      console.log('\n   Or implement additional cleanup logic as needed.');
    } else {
      console.log('\n✅ Analysis complete. No changes made.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

checkTransactionClearImpact();
