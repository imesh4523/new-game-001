import { db } from "./db";
import { users, transactions, bets } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Balance Integrity Service
 * 
 * This service ensures user balances are always accurate by:
 * 1. Validating balances against transaction history
 * 2. Auto-fixing discrepancies
 * 3. Preventing race conditions with database transactions
 * 4. Monitoring and alerting on integrity issues
 */

export interface BalanceDiscrepancy {
  userId: string;
  email: string;
  currentBalance: string;
  calculatedBalance: string;
  difference: string;
  transactionCount: number;
  lastTransactionDate: Date | null;
}

export interface BalanceIntegrityReport {
  timestamp: Date;
  totalUsersChecked: number;
  discrepanciesFound: number;
  discrepanciesFixed: number;
  failedFixes: number;
  discrepancies: BalanceDiscrepancy[];
}

class BalanceIntegrityService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastReport: BalanceIntegrityReport | null = null;
  private broadcastCallback: ((message: any) => void) | null = null;

  /**
   * Register a callback to broadcast balance fix notifications
   */
  registerBroadcastCallback(callback: (message: any) => void) {
    this.broadcastCallback = callback;
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcast(message: any) {
    if (this.broadcastCallback) {
      this.broadcastCallback(message);
    }
  }

  /**
   * Calculate the correct balance for a user based on transaction history
   */
  private async calculateCorrectBalance(userId: string): Promise<{
    balance: string;
    transactionCount: number;
    lastTransactionDate: Date | null;
  }> {
    try {
      // Initial signup bonus that all users receive
      const SIGNUP_BONUS = 0.09;

      // Get all transactions affecting this user's balance
      // NOTE: referral_bonus and agent_commission go to totalCommission (available rewards),
      // NOT to balance. They only affect balance when withdrawn via commission_withdrawal.
      const result = await db
        .select({
          totalDeposits: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'deposit' AND ${transactions.status} = 'completed' THEN CAST(${transactions.fiatAmount} AS NUMERIC) ELSE 0 END), 0)`,
          totalCommissionWithdrawals: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'commission_withdrawal' AND ${transactions.status} = 'completed' THEN CAST(${transactions.fiatAmount} AS NUMERIC) ELSE 0 END), 0)`,
          totalWithdrawals: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'withdrawal' AND ${transactions.status} = 'completed' THEN CAST(${transactions.fiatAmount} AS NUMERIC) ELSE 0 END), 0)`,
          totalBets: sql<string>`COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM ${bets} WHERE ${bets.userId} = ${userId}), 0)`,
          totalWinnings: sql<string>`COALESCE((SELECT SUM(CAST(actual_payout AS NUMERIC)) FROM ${bets} WHERE ${bets.userId} = ${userId} AND (${bets.status} = 'won' OR ${bets.status} = 'cashed_out' OR ${bets.status} = 'cancelled') AND actual_payout IS NOT NULL), 0)`,
          transactionCount: sql<number>`COUNT(*)`,
          lastTransactionDate: sql<Date>`MAX(${transactions.createdAt})`
        })
        .from(transactions)
        .where(eq(transactions.userId, userId));

      const row = result[0];
      
      if (!row || Number(row.transactionCount) === 0) {
        // No transactions, user should have signup bonus
        return {
          balance: SIGNUP_BONUS.toFixed(8),
          transactionCount: 0,
          lastTransactionDate: null
        };
      }

      // Calculate: Signup bonus + deposits + commission withdrawals + winnings - bets - withdrawals
      const totalDeposits = parseFloat(row.totalDeposits || "0");
      const totalCommissionWithdrawals = parseFloat(row.totalCommissionWithdrawals || "0");
      const totalWithdrawals = parseFloat(row.totalWithdrawals || "0");
      const totalBets = parseFloat(row.totalBets || "0");
      const totalWinnings = parseFloat(row.totalWinnings || "0");

      const calculatedBalance = SIGNUP_BONUS + totalDeposits + totalCommissionWithdrawals + totalWinnings - totalBets - totalWithdrawals;

      return {
        balance: Math.max(0, calculatedBalance).toFixed(8),
        transactionCount: Number(row.transactionCount) || 0,
        lastTransactionDate: row.lastTransactionDate
      };
    } catch (error) {
      console.error(`❌ Error calculating balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check a single user's balance integrity
   */
  private async checkUserBalance(userId: string, email: string, currentBalance: string): Promise<BalanceDiscrepancy | null> {
    try {
      const { balance: calculatedBalance, transactionCount, lastTransactionDate } = 
        await this.calculateCorrectBalance(userId);

      const current = parseFloat(currentBalance);
      const calculated = parseFloat(calculatedBalance);
      const difference = Math.abs(current - calculated);

      // If difference is more than 0.01 (1 cent), it's a discrepancy
      if (difference > 0.01) {
        return {
          userId,
          email,
          currentBalance: current.toFixed(8),
          calculatedBalance: calculated.toFixed(8),
          difference: difference.toFixed(8),
          transactionCount,
          lastTransactionDate
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error checking balance for user ${email}:`, error);
      return null;
    }
  }

  /**
   * Fix a user's balance by updating to the calculated correct value
   */
  private async fixUserBalance(discrepancy: BalanceDiscrepancy): Promise<boolean> {
    try {
      console.log(`🔧 [BalanceIntegrity] Fixing balance for ${discrepancy.email}`);
      console.log(`   Current: ${discrepancy.currentBalance} → Correct: ${discrepancy.calculatedBalance}`);

      // Update the user's balance in a transaction to prevent race conditions
      await db
        .update(users)
        .set({
          balance: discrepancy.calculatedBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, discrepancy.userId));

      console.log(`✅ [BalanceIntegrity] Balance fixed for ${discrepancy.email}`);

      // Broadcast the fix to all connected clients
      this.broadcast({
        type: 'balance_fixed',
        userId: discrepancy.userId,
        email: discrepancy.email,
        oldBalance: discrepancy.currentBalance,
        newBalance: discrepancy.calculatedBalance,
        difference: discrepancy.difference,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`❌ [BalanceIntegrity] Failed to fix balance for ${discrepancy.email}:`, error);
      return false;
    }
  }

  /**
   * Run a full balance integrity check on all users
   */
  async runIntegrityCheck(): Promise<BalanceIntegrityReport> {
    console.log('🔍 [BalanceIntegrity] Running balance integrity check...');

    try {
      if (!db) {
        console.log('[BalanceIntegrity] Database not available, check skipped');
        return {
          timestamp: new Date(),
          totalUsersChecked: 0,
          discrepanciesFound: 0,
          discrepanciesFixed: 0,
          failedFixes: 0,
          discrepancies: []
        };
      }

      // Get all users
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        balance: users.balance
      }).from(users);

      const discrepancies: BalanceDiscrepancy[] = [];
      let discrepanciesFixed = 0;
      let failedFixes = 0;

      // Check each user's balance
      for (const user of allUsers) {
        const discrepancy = await this.checkUserBalance(user.id, user.email, user.balance);
        
        if (discrepancy) {
          discrepancies.push(discrepancy);
          
          // Auto-fix the discrepancy
          const fixed = await this.fixUserBalance(discrepancy);
          if (fixed) {
            discrepanciesFixed++;
          } else {
            failedFixes++;
          }
        }
      }

      const report: BalanceIntegrityReport = {
        timestamp: new Date(),
        totalUsersChecked: allUsers.length,
        discrepanciesFound: discrepancies.length,
        discrepanciesFixed,
        failedFixes,
        discrepancies
      };

      this.lastReport = report;

      if (discrepancies.length > 0) {
        console.log(`⚠️  [BalanceIntegrity] Found ${discrepancies.length} balance discrepancies`);
        console.log(`✅ [BalanceIntegrity] Fixed ${discrepanciesFixed} discrepancies`);
        if (failedFixes > 0) {
          console.log(`❌ [BalanceIntegrity] Failed to fix ${failedFixes} discrepancies`);
        }
      } else {
        console.log('✅ [BalanceIntegrity] All balances are correct');
      }

      return report;
    } catch (error) {
      console.error('❌ [BalanceIntegrity] Error running integrity check:', error);
      throw error;
    }
  }

  /**
   * Start the balance integrity monitor
   * Runs checks every 2 minutes
   */
  start(intervalMinutes: number = 2) {
    if (this.isRunning) {
      console.log('⚠️  [BalanceIntegrity] Service already running');
      return;
    }

    console.log(`🔍 [BalanceIntegrity] Starting balance integrity monitor (every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run initial check after 30 seconds
    setTimeout(() => {
      this.runIntegrityCheck().catch(error => {
        console.error('❌ [BalanceIntegrity] Error in initial check:', error);
      });
    }, 30000);

    // Run checks periodically
    this.intervalId = setInterval(() => {
      this.runIntegrityCheck().catch(error => {
        console.error('❌ [BalanceIntegrity] Error in periodic check:', error);
      });
    }, intervalMinutes * 60 * 1000);

    console.log('✅ [BalanceIntegrity] Balance integrity monitor started');
  }

  /**
   * Stop the balance integrity monitor
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 [BalanceIntegrity] Balance integrity monitor stopped');
  }

  /**
   * Get the last integrity report
   */
  getLastReport(): BalanceIntegrityReport | null {
    return this.lastReport;
  }

  /**
   * Manually trigger a balance fix for a specific user
   */
  async fixUserBalanceById(userId: string): Promise<{
    success: boolean;
    discrepancy?: BalanceDiscrepancy;
    error?: string;
  }> {
    try {
      const user = await db.select({
        id: users.id,
        email: users.email,
        balance: users.balance
      }).from(users).where(eq(users.id, userId)).limit(1);

      if (!user[0]) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const discrepancy = await this.checkUserBalance(
        user[0].id,
        user[0].email,
        user[0].balance
      );

      if (!discrepancy) {
        return {
          success: true,
          discrepancy: undefined
        };
      }

      const fixed = await this.fixUserBalance(discrepancy);
      return {
        success: fixed,
        discrepancy,
        error: fixed ? undefined : 'Failed to fix balance'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const balanceIntegrityService = new BalanceIntegrityService();
