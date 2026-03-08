/**
 * Period ID Synchronization Service
 * 
 * Automatically tracks and synchronizes game period IDs across all components
 * Ensures consistency of period IDs in admin dashboard and game systems
 */

import { storage } from "./storage";

interface PeriodInfo {
  duration: number;
  periodId: string;
  gameId: string;
  startTime: Date;
  endTime: Date;
  timeRemaining: number;
  status: 'active' | 'completed' | 'cancelled';
}

interface PeriodSyncStatus {
  lastSync: Date;
  activePeriods: PeriodInfo[];
  syncErrors: string[];
  isHealthy: boolean;
}

class PeriodSyncService {
  private static instance: PeriodSyncService;
  private activePeriods: Map<number, PeriodInfo> = new Map();
  private syncErrors: string[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private broadcastCallback: ((data: any) => void) | null = null;

  static getInstance(): PeriodSyncService {
    if (!PeriodSyncService.instance) {
      PeriodSyncService.instance = new PeriodSyncService();
    }
    return PeriodSyncService.instance;
  }

  /**
   * Set the WebSocket broadcast callback
   */
  setBroadcastCallback(callback: (data: any) => void) {
    this.broadcastCallback = callback;
    console.log('✅ Period sync service broadcast callback registered');
  }

  /**
   * Register a new active period
   */
  registerPeriod(duration: number, gameId: string, startTime: Date, endTime: Date, status: 'active' | 'completed' | 'cancelled' = 'active') {
    const periodInfo: PeriodInfo = {
      duration,
      periodId: gameId, // Period ID is the same as gameId
      gameId,
      startTime,
      endTime,
      timeRemaining: Math.max(0, Math.floor((endTime.getTime() - new Date().getTime()) / 1000)),
      status
    };

    this.activePeriods.set(duration, periodInfo);
    console.log(`📍 Period registered: ${duration}min - ${gameId}`);

    // Broadcast period update
    this.broadcastPeriodUpdate();
  }

  /**
   * Update period status
   */
  updatePeriodStatus(duration: number, status: 'active' | 'completed' | 'cancelled') {
    const period = this.activePeriods.get(duration);
    if (period) {
      period.status = status;
      period.timeRemaining = Math.max(0, Math.floor((period.endTime.getTime() - new Date().getTime()) / 1000));
      this.activePeriods.set(duration, period);
      console.log(`🔄 Period ${period.periodId} status updated: ${status}`);
      this.broadcastPeriodUpdate();
    }
  }

  /**
   * Remove a period when it's completed
   */
  removePeriod(duration: number) {
    const period = this.activePeriods.get(duration);
    if (period) {
      console.log(`🗑️  Period removed: ${duration}min - ${period.periodId}`);
      this.activePeriods.delete(duration);
      this.broadcastPeriodUpdate();
    }
  }

  /**
   * Get current period for a specific duration
   */
  getCurrentPeriod(duration: number): PeriodInfo | null {
    return this.activePeriods.get(duration) || null;
  }

  /**
   * Get all active periods
   */
  getAllActivePeriods(): PeriodInfo[] {
    return Array.from(this.activePeriods.values());
  }

  /**
   * Verify period ID consistency across database and active games
   */
  async verifyPeriodConsistency(duration: number): Promise<{ isConsistent: boolean; message: string }> {
    const activePeriod = this.activePeriods.get(duration);
    
    if (!activePeriod) {
      return {
        isConsistent: false,
        message: `No active period found for ${duration}min duration`
      };
    }

    try {
      // Get game from database
      const game = await storage.getGameById(activePeriod.gameId);
      
      if (!game) {
        this.addSyncError(`Database missing game ${activePeriod.gameId} for ${duration}min period`);
        return {
          isConsistent: false,
          message: `Game ${activePeriod.gameId} not found in database`
        };
      }

      // Verify period ID matches
      if (game.gameId !== activePeriod.periodId) {
        this.addSyncError(`Period ID mismatch for ${duration}min: Active=${activePeriod.periodId}, DB=${game.gameId}`);
        return {
          isConsistent: false,
          message: `Period ID mismatch: Expected ${activePeriod.periodId}, got ${game.gameId}`
        };
      }

      // Verify status - but only sync "completed" status if timer has actually ended
      if (game.status !== activePeriod.status) {
        // If database says "completed" but timer hasn't ended yet, DON'T sync
        if (game.status === 'completed') {
          const now = new Date();
          const endTime = new Date(game.endTime);
          
          if (endTime > now) {
            // Timer hasn't ended yet, don't mark as completed
            const remainingSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
            console.warn(`⚠️ Game ${game.gameId} marked completed in DB but timer hasn't ended (${remainingSeconds}s remaining) - ignoring early completion`);
            return {
              isConsistent: true,
              message: `Ignoring early completion for ${duration}min period (${remainingSeconds}s remaining)`
            };
          }
        }
        
        this.addSyncError(`Status mismatch for ${duration}min: Active=${activePeriod.status}, DB=${game.status}`);
        // Auto-fix: Update active period status to match database
        this.updatePeriodStatus(duration, game.status as any);
        return {
          isConsistent: true,
          message: `Status auto-fixed for ${duration}min period`
        };
      }

      console.log(`✅ Period ${activePeriod.periodId} verified: Consistent`);
      return {
        isConsistent: true,
        message: `Period ${activePeriod.periodId} is consistent`
      };
    } catch (error) {
      const errorMsg = `Error verifying period consistency: ${error}`;
      this.addSyncError(errorMsg);
      return {
        isConsistent: false,
        message: errorMsg
      };
    }
  }

  /**
   * Auto-fix any period inconsistencies
   */
  async autoFixPeriods(): Promise<{ fixed: number; errors: string[] }> {
    console.log('🔧 Auto-fixing period inconsistencies...');
    const errors: string[] = [];
    let fixed = 0;

    for (const [duration, period] of Array.from(this.activePeriods.entries())) {
      try {
        const verification = await this.verifyPeriodConsistency(duration);
        
        if (!verification.isConsistent) {
          // Try to reload from database
          const game = await storage.getGameById(period.gameId);
          
          if (game) {
            // Update active period with database data
            this.registerPeriod(
              game.roundDuration,
              game.gameId,
              new Date(game.startTime),
              new Date(game.endTime),
              game.status as any
            );
            fixed++;
            console.log(`✅ Auto-fixed period ${duration}min`);
          } else {
            errors.push(`Cannot fix ${duration}min period: Game not found in database`);
          }
        }
      } catch (error) {
        errors.push(`Failed to fix ${duration}min period: ${error}`);
      }
    }

    console.log(`🔧 Auto-fix complete: ${fixed} periods fixed, ${errors.length} errors`);
    this.broadcastPeriodUpdate();
    
    return { fixed, errors };
  }

  /**
   * Start automatic period monitoring and sync
   */
  startAutoSync(intervalMs: number = 5000) {
    if (this.syncInterval) {
      console.log('⚠️  Period sync already running');
      return;
    }

    console.log(`🚀 Starting automatic period sync (every ${intervalMs}ms)`);
    
    this.syncInterval = setInterval(async () => {
      // Update time remaining for all active periods
      for (const [duration, period] of Array.from(this.activePeriods.entries())) {
        period.timeRemaining = Math.max(0, Math.floor((period.endTime.getTime() - new Date().getTime()) / 1000));
        this.activePeriods.set(duration, period);
      }

      // Broadcast updated period data
      this.broadcastPeriodUpdate();

      // Verify consistency every 30 seconds
      if (Date.now() % 30000 < intervalMs) {
        for (const duration of Array.from(this.activePeriods.keys())) {
          await this.verifyPeriodConsistency(duration);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Period sync stopped');
    }
  }

  /**
   * Broadcast period update via WebSocket
   */
  private broadcastPeriodUpdate() {
    if (this.broadcastCallback) {
      const syncStatus = this.getSyncStatus();
      this.broadcastCallback({
        type: 'periodSync',
        status: syncStatus
      });
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): PeriodSyncStatus {
    return {
      lastSync: new Date(),
      activePeriods: Array.from(this.activePeriods.values()),
      syncErrors: this.syncErrors.slice(-10), // Keep last 10 errors
      isHealthy: this.syncErrors.length === 0 || this.syncErrors[this.syncErrors.length - 1] !== this.syncErrors[this.syncErrors.length - 2]
    };
  }

  /**
   * Add sync error
   */
  private addSyncError(error: string) {
    console.error(`❌ Period sync error: ${error}`);
    this.syncErrors.push(`${new Date().toISOString()}: ${error}`);
    // Keep only last 50 errors
    if (this.syncErrors.length > 50) {
      this.syncErrors = this.syncErrors.slice(-50);
    }
  }

  /**
   * Clear all sync errors
   */
  clearErrors() {
    this.syncErrors = [];
    console.log('🧹 Sync errors cleared');
  }

  /**
   * Get period info for display
   */
  getPeriodDisplayInfo(duration: number): string | null {
    const period = this.activePeriods.get(duration);
    if (!period) return null;

    const minutes = Math.floor(period.timeRemaining / 60);
    const seconds = period.timeRemaining % 60;
    
    return `Period ${period.periodId} | ${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
  }
}

export const periodSyncService = PeriodSyncService.getInstance();
