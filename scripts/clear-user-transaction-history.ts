import { db } from '../server/db';
import { users, transactions, adminActions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function clearUserTransactionHistory() {
  try {
    console.log('\n🔒 Clear User Transaction History\n');
    console.log('═'.repeat(80));
    
    // Get user email
    const email = await question('\n📧 Enter user email: ');
    
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
    console.log(`   Current Balance: ${user.balance}`);
    
    // Count transactions before deletion
    const transactionsBefore = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id));
    
    console.log(`\n📊 Found:`);
    console.log(`   ${transactionsBefore.length} transaction records`);
    
    if (transactionsBefore.length === 0) {
      console.log('\n⚠️  No transactions found for this user.');
      rl.close();
      return;
    }
    
    // Show transaction summary
    const deposits = transactionsBefore.filter(t => t.type === 'deposit');
    const withdrawals = transactionsBefore.filter(t => t.type === 'withdrawal');
    
    console.log(`\n📈 Transaction breakdown:`);
    console.log(`   ${deposits.length} deposits`);
    console.log(`   ${withdrawals.length} withdrawals`);
    
    // Confirm
    const confirm = await question('\n⚠️  Are you sure you want to clear ALL transaction history for this user? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n🔄 Clearing transaction history...');
    
    // Delete all transactions for this user
    await db
      .delete(transactions)
      .where(eq(transactions.userId, user.id));
    
    // Log admin action (use system user ID if available)
    await db.insert(adminActions).values({
      adminId: 'system',
      action: 'clear_transaction_history',
      targetId: user.id,
      details: {
        userEmail: user.email,
        transactionsCleared: transactionsBefore.length,
        depositsCleared: deposits.length,
        withdrawalsCleared: withdrawals.length,
        clearedVia: 'console_script'
      }
    });
    
    console.log('\n✅ Transaction history cleared successfully!');
    console.log(`\n📝 Summary:`);
    console.log(`   ✓ Cleared ${transactionsBefore.length} total transactions`);
    console.log(`   ✓ Cleared ${deposits.length} deposits`);
    console.log(`   ✓ Cleared ${withdrawals.length} withdrawals`);
    console.log(`   ✓ Admin action logged`);
    console.log(`\n⚠️  Note: User's current balance was NOT modified (${user.balance})`);
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

clearUserTransactionHistory();
