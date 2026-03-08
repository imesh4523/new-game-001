import { storage } from "./storage";

class CoinFlipBalanceValidator {
  private validationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private validationIntervalMs: number = 7000; // 7 seconds
  private lastValidationTime: Date | null = null;
  
  constructor() {
    console.log('🎯 CoinFlip Balance Validator initialized');
  }

  start(): void {
    if (this.isRunning) {
      console.log('⚠️  CoinFlip Balance Validator is already running');
      return;
    }

    this.isRunning = true;
    console.log(`✅ Starting CoinFlip Balance Validator (checking every ${this.validationIntervalMs / 1000} seconds)`);

    this.validationInterval = setInterval(async () => {
      await this.validateAndFixBalances();
    }, this.validationIntervalMs);

    // Run initial validation immediately
    this.validateAndFixBalances();
  }

  stop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 CoinFlip Balance Validator stopped');
  }

  private async validateAndFixBalances(): Promise<void> {
    try {
      this.lastValidationTime = new Date();
      
      // Get users who have played coinflip recently (last 2 minutes)
      const recentlyActivePlayers = await storage.getUsersWithRecentActivity(2);
      
      if (recentlyActivePlayers.length === 0) {
        return; // No recent activity, skip validation
      }

      let fixedCount = 0;
      let corrections: Array<{ userId: string; oldBalance: string; newBalance: string }> = [];
      
      for (const user of recentlyActivePlayers) {
        // Get fresh user data from database (refetch to ensure latest)
        const freshUser = await storage.getUser(user.id);
        if (!freshUser) continue;

        const currentBalance = parseFloat(freshUser.balance);
        
        // Fix obviously wrong balances
        if (currentBalance < 0) {
          // Negative balance is always wrong - set to minimum balance
          const minBalance = "0.00000000";
          await storage.updateUser(user.id, { balance: minBalance });
          corrections.push({
            userId: user.id,
            oldBalance: freshUser.balance,
            newBalance: minBalance
          });
          console.log(`✅ Fixed negative balance for user ${user.id}: ${freshUser.balance} → ${minBalance}`);
          fixedCount++;
        } else if (currentBalance > 1000000) {
          // Suspiciously high balance (over $1M) - likely an error
          console.log(`⚠️  Suspicious high balance detected for user ${user.id}: $${currentBalance.toFixed(2)}`);
          // Log for admin review but don't auto-fix to avoid interfering with legitimate high balances
        }
        
        // Validate recent coin flip transactions for balance consistency
        const recentGames = await storage.getCoinFlipGamesByUser(user.id, 5);
        if (recentGames.length > 0) {
          let hasInconsistency = false;
          
          for (const game of recentGames) {
            const betAmount = parseFloat(game.betAmount);
            const winAmount = game.winAmount ? parseFloat(game.winAmount) : 0;
            
            // Validation rules for coin flip logic:
            // - If won: winAmount should be 2x betAmount (total payout = stake + profit)
            // - If lost: winAmount should be null or 0
            const expectedWinAmount = betAmount * 2;
            
            if (game.won && Math.abs(winAmount - expectedWinAmount) > 0.001) {
              console.log(`⚠️  Inconsistent coin flip win for user ${user.id}: bet=${betAmount}, winAmount=${winAmount}, expected=${expectedWinAmount}`);
              hasInconsistency = true;
            } else if (!game.won && winAmount !== 0 && winAmount !== null) {
              console.log(`⚠️  Inconsistent coin flip loss for user ${user.id}: lost but winAmount=${winAmount}, expected=0`);
              hasInconsistency = true;
            }
          }
          
          if (hasInconsistency) {
            console.log(`📊 User ${user.id} has coin flip transaction inconsistencies - flagged for review`);
          }
        }
      }

      if (fixedCount > 0) {
        console.log(`🔧 CoinFlip Balance Validator: Fixed ${fixedCount} balance discrepanc${fixedCount === 1 ? 'y' : 'ies'}`);
        
        // Broadcast corrections to connected clients
        this.broadcastCorrections(corrections);
      }
    } catch (error) {
      console.error('❌ Error in CoinFlip Balance Validator:', error);
    }
  }

  private broadcastCorrections(corrections: Array<{ userId: string; oldBalance: string; newBalance: string }>): void {
    // This will be called by the routes.ts to set the broadcast function
    // For now, just log - the integration point will be added
    if (corrections.length > 0) {
      console.log(`📢 Broadcasting ${corrections.length} balance corrections`);
    }
  }

  setBroadcastCallback(callback: (userId: string, oldBalance: string, newBalance: string, changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet') => void): void {
    // Store callback for broadcasting balance corrections
    this.broadcastCorrections = (corrections) => {
      for (const correction of corrections) {
        callback(correction.userId, correction.oldBalance, correction.newBalance, 'bet');
      }
    };
  }

  getStatus(): { isRunning: boolean; lastValidationTime: Date | null; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      lastValidationTime: this.lastValidationTime,
      intervalMs: this.validationIntervalMs,
    };
  }
}

export const coinFlipBalanceValidator = new CoinFlipBalanceValidator();
