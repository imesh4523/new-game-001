/**
 * Bet Validation Service
 * 
 * Automatically detects and fixes incorrectly settled bets
 * Runs periodically to ensure all bets are settled correctly
 */

import { storage } from "./storage";

class BetValidationService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private broadcastBalanceUpdate?: (userId: string, oldBalance: string, newBalance: string, changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet') => void;

  setBroadcastCallback(callback: (userId: string, oldBalance: string, newBalance: string, changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet') => void) {
    this.broadcastBalanceUpdate = callback;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Bet validation service is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Starting automatic bet validation service (runs every 5 minutes)');

    // Run every 5 minutes
    this.intervalId = setInterval(async () => {
      await this.validateRecentBets();
    }, 300000); // 5 minutes

    // Run immediately on startup
    setTimeout(() => {
      this.validateRecentBets();
    }, 10000); // Wait 10 seconds after startup
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('⏹️  Bet validation service stopped');
    }
  }

  private async validateRecentBets() {
    try {
      console.log('🔍 [BetValidation] Checking recently settled bets for errors...');

      // Get recent game history (last 50 games)
      const recentGames = await storage.getGameHistory(50);
      const completedGames = recentGames.filter(game => 
        game.status === 'completed' && 
        game.result !== null && 
        game.result !== undefined &&
        game.resultColor
      );

      let fixedCount = 0;
      let validatedCount = 0;

      if (completedGames.length === 0) {
        console.log('✓ [BetValidation] No completed games found for standard validation');
      } else {
        // Check each game's bets
      for (const game of completedGames) {
        // ✅ CRITICAL FIX: Calculate correct color and size from the numeric result
        // Don't trust stored resultColor/resultSize as they might be incorrect!
        const correctColor = this.getNumberColor(game.result!);
        const correctSize = this.getNumberSize(game.result!);

        // Detect if stored game result attributes are wrong
        if (game.resultColor !== correctColor || game.resultSize !== correctSize) {
          console.error(`❌ [BetValidation] CRITICAL: Game ${game.gameId} has incorrect result attributes!`);
          console.error(`   Result number: ${game.result}`);
          console.error(`   Stored color: ${game.resultColor}, Correct: ${correctColor}`);
          console.error(`   Stored size: ${game.resultSize}, Correct: ${correctSize}`);
          console.log(`🔧 [BetValidation] Auto-fixing game result attributes...`);
          
          // Fix the game record
          await storage.updateGameResult(game.gameId, game.result!, correctColor, correctSize);
          console.log(`✅ [BetValidation] Game ${game.gameId} result attributes fixed`);
        }

        const bets = await storage.getBetsByGame(game.gameId);
        const settledBets = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');

        for (const bet of settledBets) {
          validatedCount++;
          
          // ✅ Determine if bet should have won using COMPUTED values (not stored values)
          let shouldWin = false;
          switch (bet.betType) {
            case "color":
              shouldWin = bet.betValue === correctColor;
              break;
            case "number":
              shouldWin = parseInt(bet.betValue) === game.result;
              break;
            case "size":
              shouldWin = bet.betValue === correctSize;
              break;
            case "crash":
              // For crash games, the result stored in the game record is the crash point
              // A bet should win if it was cashed out before or at the crash point
              if (bet.status === 'cashed_out' || bet.status === 'won') {
                const cashOutMultiplier = parseFloat(bet.cashOutMultiplier || "0");
                const gameCrashPoint = parseFloat(game.crashPoint || "0");
                shouldWin = cashOutMultiplier > 0 && cashOutMultiplier <= gameCrashPoint;
              } else {
                // If it wasn't cashed out, it's a loss
                shouldWin = false;
              }
              break;
          }

          // Check if bet status matches what it should be
          const isCurrentlyWon = bet.status === 'won';
          
          if (shouldWin !== isCurrentlyWon) {
            // BUG DETECTED! Bet was settled incorrectly
            console.error(`❌ [BetValidation] CRITICAL BUG DETECTED!`);
            console.error(`   Bet ID: ${bet.id}`);
            console.error(`   Game ID: ${game.gameId}`);
            console.error(`   Bet Type: ${bet.betType}`);
            console.error(`   Bet Value: ${bet.betValue}`);
            console.error(`   Current Status: ${bet.status}`);
            console.error(`   Should Be: ${shouldWin ? 'won' : 'lost'}`);
            console.error(`   Game Result: ${game.result} (${game.resultColor}, ${game.resultSize})`);

            // Fix the bet
            await this.fixIncorrectBet(bet, shouldWin, game);
            fixedCount++;
          }
        }
      }
      
      // ✅ NEW: Find and refund any "stuck" pending bets from completed games
      const stuckBets = await storage.getStuckPendingBets(5); // Pending for > 5 minutes
      let refundedCount = 0;
      
      for (const bet of stuckBets) {
        // Double check the game is actually completed or doesn't exist anymore
        const game = await storage.getGameByGameId(bet.gameId);
        if (!game || game.status === 'completed' || game.status === 'cancelled') {
          console.error(`❌ [BetValidation] FOUND STUCK PENDING BET!`);
          console.error(`   Bet ID: ${bet.id}`);
          console.error(`   Game ID: ${bet.gameId}`);
          console.error(`   Amount wagered: ${bet.amount}`);
          console.log(`🔧 [BetValidation] Auto-refunding stuck bet to user ${bet.userId}...`);
          
          await this.refundStuckBet(bet);
          refundedCount++;
        }
      }

      if (validatedCount > 0) {
        console.log(`✅ [BetValidation] Validated ${validatedCount} settled bets`);
      }
      if (fixedCount > 0 || refundedCount > 0) {
        console.log(`🔧 [BetValidation] Fixed ${fixedCount} incorrectly settled bet(s) and refunded ${refundedCount} stuck bet(s)`);
      }
      }
    } catch (error) {
      console.error('❌ [BetValidation] Error in bet validation service:', error);
    }
  }

  private async refundStuckBet(bet: any) {
    try {
      const user = await storage.getUser(bet.userId);
      if (!user) {
        console.error(`❌ [BetValidation] User ${bet.userId} not found for refund`);
        return;
      }

      const oldBalance = user.balance;
      const betAmount = parseFloat(bet.amount);
      
      // Mark bet as cancelled/refunded
      await storage.updateBetStatus(bet.id, "cancelled", bet.amount);

      // Add payout back to user balance
      const newBalance = (parseFloat(oldBalance) + betAmount).toFixed(8);
      await storage.updateUserBalance(bet.userId, newBalance);

      console.log(`✅ [BetValidation] Refunded stuck bet ${bet.id}: added ${betAmount.toFixed(2)} to balance`);

      if (this.broadcastBalanceUpdate) {
        this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win'); // treat refund as positive balance change
      }
    } catch (error) {
      console.error(`❌ [BetValidation] Error refunding stuck bet ${bet.id}:`, error);
    }
  }

  private async fixIncorrectBet(bet: any, shouldWin: boolean, game: any) {
    try {
      const user = await storage.getUser(bet.userId);
      if (!user) {
        console.error(`❌ [BetValidation] User ${bet.userId} not found`);
        return;
      }

      const oldBalance = user.balance;
      const betAmount = parseFloat(bet.amount);
      const potential = parseFloat(bet.potential);

      if (shouldWin) {
        // Bet should have won but was marked as lost
        // Need to: change status to won, calculate payout, add to balance
        
        // Calculate fee (default 3%)
        const feeSetting = await storage.getSystemSetting('betting_fee_percentage');
        let feePercentage = feeSetting?.value ? parseFloat(feeSetting.value) : 3;
        if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
          feePercentage = 3;
        }

        const winnings = potential - betAmount;
        const feeAmount = winnings * (feePercentage / 100);
        const actualPayout = betAmount + (winnings - feeAmount);

        // Update bet status to won
        await storage.updateBetStatus(bet.id, "won", actualPayout.toFixed(8));

        // Add payout to user balance
        const newBalance = (parseFloat(oldBalance) + actualPayout).toFixed(8);
        await storage.updateUserBalance(bet.userId, newBalance);

        console.log(`✅ [BetValidation] Fixed bet ${bet.id}: lost → won (payout: ${actualPayout.toFixed(2)})`);

        if (this.broadcastBalanceUpdate) {
          this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win');
        }
      } else {
        // Bet should have lost but was marked as won
        // Need to: change status to lost, remove payout from balance
        
        const actualPayout = parseFloat(bet.actualPayout || bet.potential);
        
        // Update bet status to lost
        await storage.updateBetStatus(bet.id, "lost");

        // Deduct the incorrect payout from user balance
        const newBalance = (parseFloat(oldBalance) - actualPayout).toFixed(8);
        await storage.updateUserBalance(bet.userId, newBalance);

        console.log(`✅ [BetValidation] Fixed bet ${bet.id}: won → lost (deducted: ${actualPayout.toFixed(2)})`);

        if (this.broadcastBalanceUpdate) {
          this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'loss');
        }
      }
    } catch (error) {
      console.error(`❌ [BetValidation] Error fixing bet ${bet.id}:`, error);
    }
  }

  private getNumberColor(num: number): string {
    if (num === 5) return "violet";
    if ([1, 3, 7, 9].includes(num)) return "green";
    if (num === 0) return "violet";
    return "red";
  }

  private getNumberSize(num: number): string {
    return num >= 5 ? "big" : "small";
  }
}

export const betValidationService = new BetValidationService();
