import { db } from '../server/db';
import { 
  users, 
  bets, 
  transactions, 
  games, 
  gameAnalytics,
  withdrawalRequests,
  referrals,
  supportChatSessions,
  supportChatMessages,
  pageViews,
  userSessions,
  deviceLogins,
  adminActions
} from '../shared/schema';
import { sql } from 'drizzle-orm';

async function cleanDatabaseForProduction() {
  console.log('🧹 Starting database cleanup for production deployment...\n');

  try {
    console.log('📊 Step 1: Resetting all user statistics to 0...');
    const userResetResult = await db.update(users).set({
      balance: '0.00000000',
      accumulatedFee: '0.00000000',
      totalDeposits: '0.00000000',
      totalWithdrawals: '0.00000000',
      totalWinnings: '0.00000000',
      totalLosses: '0.00000000',
      totalCommission: '0.00000000',
      lifetimeCommissionEarned: '0.00000000',
      totalBetsAmount: '0.00000000',
      dailyWagerAmount: '0.00000000',
      remainingRequiredBetAmount: '0.00000000',
      teamSize: 0,
      totalTeamMembers: 0
    });
    console.log('✅ User statistics reset complete\n');

    console.log('📊 Step 2: Clearing all bets...');
    await db.delete(bets);
    console.log('✅ All bets cleared\n');

    console.log('📊 Step 3: Clearing all transactions...');
    await db.delete(transactions);
    console.log('✅ All transactions cleared\n');

    console.log('📊 Step 4: Clearing all withdrawal requests...');
    await db.delete(withdrawalRequests);
    console.log('✅ All withdrawal requests cleared\n');

    console.log('📊 Step 5: Clearing all games and game analytics...');
    await db.delete(gameAnalytics);
    await db.delete(games);
    console.log('✅ All games cleared\n');

    console.log('📊 Step 6: Resetting referral statistics...');
    await db.update(referrals).set({
      totalCommission: '0.00000000',
      hasDeposited: false
    });
    console.log('✅ Referral statistics reset\n');

    console.log('📊 Step 7: Clearing support chat history...');
    await db.delete(supportChatMessages);
    await db.delete(supportChatSessions);
    console.log('✅ Support chat history cleared\n');

    console.log('📊 Step 8: Clearing analytics data...');
    await db.delete(pageViews);
    await db.delete(userSessions);
    await db.delete(deviceLogins);
    console.log('✅ Analytics data cleared\n');

    console.log('📊 Step 9: Clearing admin action logs...');
    await db.delete(adminActions);
    console.log('✅ Admin action logs cleared\n');

    console.log('\n✨ DATABASE CLEANUP SUMMARY ✨');
    console.log('═══════════════════════════════');
    console.log('✅ All user balances reset to 0');
    console.log('✅ All user statistics reset to 0');
    console.log('✅ All bets cleared');
    console.log('✅ All transactions cleared');
    console.log('✅ All withdrawal requests cleared');
    console.log('✅ All games cleared');
    console.log('✅ All referral statistics reset');
    console.log('✅ All support chat history cleared');
    console.log('✅ All analytics data cleared');
    console.log('✅ All admin action logs cleared');
    console.log('═══════════════════════════════');
    console.log('\n🎉 Database is now clean and ready for production deployment!');
    console.log('\n⚠️  NOTE: User accounts, admin accounts, and system settings are preserved.');
    console.log('⚠️  Only transaction history and statistics have been reset.\n');

    // Get user count
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log(`📊 Total users in database: ${userCount[0].count}`);
    console.log('💡 All users can continue to login with their existing credentials.\n');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

cleanDatabaseForProduction()
  .then(() => {
    console.log('✅ Cleanup script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
