/**
 * Game Auto-Recovery Service
 * 
 * Automatically detects when games become inactive and starts new periods
 * to ensure continuous game availability for all durations
 */

import { storage } from "./storage";

interface GameMonitoringConfig {
  duration: number; // in minutes
  maxInactiveTime: number; // in seconds
  lastGameEndTime?: Date;
  lastCheckTime?: Date;
}

interface RecoveryStats {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  lastRecoveryTime: Date | null;
  recoveryHistory: Array<{
    duration: number;
    timestamp: Date;
    success: boolean;
    reason: string;
  }>;
}

class GameAutoRecoveryService {
  private static instance: GameAutoRecoveryService;
  private monitoringConfigs: Map<number, GameMonitoringConfig> = new Map();
  private recoveryInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: RecoveryStats = {
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    lastRecoveryTime: null,
    recoveryHistory: []
  };
  
  // Callback to start a new game (will be set by routes.ts)
  private startGameCallback: ((duration: number) => Promise<any>) | null = null;
  
  // Callback to get active games (will be set by routes.ts)
  private getActiveGamesCallback: (() => Map<number, any>) | null = null;

  static getInstance(): GameAutoRecoveryService {
    if (!GameAutoRecoveryService.instance) {
      GameAutoRecoveryService.instance = new GameAutoRecoveryService();
    }
    return GameAutoRecoveryService.instance;
  }

  /**
   * Initialize monitoring for standard game durations
   */
  initialize() {
    // Monitor standard game durations: 1, 3, 5, 10 minutes
    const gameDurations = [1, 3, 5, 10];
    
    gameDurations.forEach(duration => {
      this.monitoringConfigs.set(duration, {
        duration,
        maxInactiveTime: 60 // 60 seconds (1 minute) after game should end
      });
    });
    
    console.log('🔧 [GameRecovery] Initialized monitoring for game durations:', gameDurations);
  }

  /**
   * Set the callback function to start a new game
   */
  setStartGameCallback(callback: (duration: number) => Promise<any>) {
    this.startGameCallback = callback;
    console.log('✅ [GameRecovery] Start game callback registered');
  }

  /**
   * Set the callback function to get active games
   */
  setGetActiveGamesCallback(callback: () => Map<number, any>) {
    this.getActiveGamesCallback = callback;
    console.log('✅ [GameRecovery] Get active games callback registered');
  }

  /**
   * Configure inactive time threshold for a specific duration
   */
  configureInactiveTime(duration: number, maxInactiveSeconds: number) {
    const config = this.monitoringConfigs.get(duration);
    if (config) {
      config.maxInactiveTime = maxInactiveSeconds;
      console.log(`⚙️  [GameRecovery] Updated ${duration}min game max inactive time to ${maxInactiveSeconds}s`);
    }
  }

  /**
   * Start automatic recovery monitoring
   */
  start(checkIntervalMs: number = 10000) {
    if (this.isRunning) {
      console.log('⚠️  [GameRecovery] Auto-recovery already running');
      return;
    }

    if (!this.startGameCallback || !this.getActiveGamesCallback) {
      console.error('❌ [GameRecovery] Cannot start: callbacks not registered');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 [GameRecovery] Starting auto-recovery service (checking every ${checkIntervalMs}ms)`);
    
    // Run initial check immediately
    this.runRecoveryCheck();
    
    // Then run periodic checks
    this.recoveryInterval = setInterval(() => {
      this.runRecoveryCheck();
    }, checkIntervalMs);
  }

  /**
   * Stop automatic recovery monitoring
   */
  stop() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 [GameRecovery] Auto-recovery service stopped');
  }

  /**
   * Run recovery check for all monitored game durations
   */
  private async runRecoveryCheck() {
    if (!this.getActiveGamesCallback || !this.startGameCallback) {
      return;
    }

    const now = new Date();
    const activeGames = this.getActiveGamesCallback();
    
    for (const [duration, config] of Array.from(this.monitoringConfigs.entries())) {
      try {
        config.lastCheckTime = now;
        
        // Check if there's an active game for this duration
        const activeGameInfo = activeGames.get(duration);
        
        if (!activeGameInfo) {
          // No active game in memory, check database
          await this.checkDatabaseForInactiveGame(duration, config);
        } else {
          // There's an active game, verify it's actually running
          await this.verifyActiveGame(duration, activeGameInfo, config);
        }
        
      } catch (error) {
        console.error(`❌ [GameRecovery] Error checking ${duration}min game:`, error);
      }
    }
  }

  /**
   * Check database for inactive games
   */
  private async checkDatabaseForInactiveGame(duration: number, config: GameMonitoringConfig) {
    try {
      // Get recent games for this duration from database (limit to last 100 games)
      const allGames = await storage.getGameHistory(100);
      const durationGames = allGames
        .filter((g: any) => g.roundDuration === duration)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (durationGames.length === 0) {
        // No games exist for this duration, start one
        console.log(`🆕 [GameRecovery] No games found for ${duration}min, starting new game`);
        await this.recoverGame(duration, 'No games exist in database');
        return;
      }

      const latestGame = durationGames[0];
      const gameEndTime = new Date(latestGame.endTime);
      const now = new Date();
      
      // Check if the latest game has ended and enough time has passed
      if (latestGame.status === 'completed' || latestGame.status === 'cancelled') {
        const timeSinceEnd = (now.getTime() - gameEndTime.getTime()) / 1000; // in seconds
        
        // If more than maxInactiveTime has passed since game ended, start new one
        if (timeSinceEnd > config.maxInactiveTime) {
          console.log(`⚠️  [GameRecovery] ${duration}min game inactive for ${Math.floor(timeSinceEnd)}s (limit: ${config.maxInactiveTime}s)`);
          await this.recoverGame(duration, `Game inactive for ${Math.floor(timeSinceEnd)}s`);
        }
      } else if (latestGame.status === 'active') {
        // Game is marked as active in DB but not in memory - this is a problem
        if (gameEndTime < now) {
          // Game should have ended but didn't
          const timeSinceEnd = (now.getTime() - gameEndTime.getTime()) / 1000;
          console.log(`⚠️  [GameRecovery] ${duration}min game stuck as 'active' ${Math.floor(timeSinceEnd)}s after end time`);
          await this.recoverGame(duration, `Game stuck as active after end time`);
        }
      }
      
    } catch (error) {
      console.error(`❌ [GameRecovery] Error checking database for ${duration}min game:`, error);
    }
  }

  /**
   * Verify that an active game is actually running correctly
   */
  private async verifyActiveGame(duration: number, activeGameInfo: any, config: GameMonitoringConfig) {
    try {
      const game = activeGameInfo.game;
      const gameEndTime = new Date(game.endTime);
      const now = new Date();
      
      // If game end time has passed and it's still marked as active, something is wrong
      if (gameEndTime < now) {
        const timeSinceEnd = (now.getTime() - gameEndTime.getTime()) / 1000;
        
        if (timeSinceEnd > config.maxInactiveTime) {
          console.log(`⚠️  [GameRecovery] ${duration}min game (${game.gameId}) should have ended ${Math.floor(timeSinceEnd)}s ago but is still active`);
          await this.recoverGame(duration, `Game end time passed but game still active`);
        }
      }
      
    } catch (error) {
      console.error(`❌ [GameRecovery] Error verifying active game for ${duration}min:`, error);
    }
  }

  /**
   * Recover a game by starting a new one
   */
  private async recoverGame(duration: number, reason: string) {
    if (!this.startGameCallback) {
      console.error('❌ [GameRecovery] Cannot recover: start game callback not set');
      return;
    }

    this.stats.totalRecoveries++;
    
    try {
      console.log(`🔧 [GameRecovery] Recovering ${duration}min game - Reason: ${reason}`);
      
      // Start a new game
      await this.startGameCallback(duration);
      
      this.stats.successfulRecoveries++;
      this.stats.lastRecoveryTime = new Date();
      
      this.addRecoveryHistory(duration, true, reason);
      
      console.log(`✅ [GameRecovery] Successfully recovered ${duration}min game`);
      
    } catch (error) {
      this.stats.failedRecoveries++;
      this.addRecoveryHistory(duration, false, `${reason} - Error: ${error}`);
      
      console.error(`❌ [GameRecovery] Failed to recover ${duration}min game:`, error);
    }
  }

  /**
   * Add recovery event to history
   */
  private addRecoveryHistory(duration: number, success: boolean, reason: string) {
    this.stats.recoveryHistory.push({
      duration,
      timestamp: new Date(),
      success,
      reason
    });
    
    // Keep only last 50 recovery events
    if (this.stats.recoveryHistory.length > 50) {
      this.stats.recoveryHistory = this.stats.recoveryHistory.slice(-50);
    }
  }

  /**
   * Get recovery statistics
   */
  getStats(): RecoveryStats & { isRunning: boolean; monitoredDurations: number[] } {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      monitoredDurations: Array.from(this.monitoringConfigs.keys())
    };
  }

  /**
   * Manual recovery trigger for a specific duration
   */
  async manualRecover(duration: number): Promise<{ success: boolean; message: string }> {
    if (!this.monitoringConfigs.has(duration)) {
      return {
        success: false,
        message: `Duration ${duration}min is not being monitored`
      };
    }

    try {
      await this.recoverGame(duration, 'Manual recovery triggered');
      return {
        success: true,
        message: `Successfully started new ${duration}min game`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to recover ${duration}min game: ${error}`
      };
    }
  }

  /**
   * Get monitoring status for all durations
   */
  getMonitoringStatus() {
    const status: any[] = [];
    
    for (const [duration, config] of Array.from(this.monitoringConfigs.entries())) {
      status.push({
        duration,
        maxInactiveTime: config.maxInactiveTime,
        lastCheckTime: config.lastCheckTime,
        lastGameEndTime: config.lastGameEndTime
      });
    }
    
    return status;
  }

  /**
   * Clear recovery history
   */
  clearHistory() {
    this.stats.recoveryHistory = [];
    console.log('🧹 [GameRecovery] Recovery history cleared');
  }
}

export const gameAutoRecoveryService = GameAutoRecoveryService.getInstance();
