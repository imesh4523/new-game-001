import { errorMonitorService } from './error-monitor-service';
import { lspAutoFixService } from './lsp-autofix-service';

/**
 * Self-Healing Service
 * Combines all auto-fix services into one intelligent system
 */
class SelfHealingService {
  private isRunning = false;
  private healingInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  private stats = {
    totalHeals: 0,
    successfulHeals: 0,
    failedHeals: 0,
    lastHealTime: null as Date | null,
  };

  /**
   * Start the self-healing system
   */
  start(): void {
    if (this.isRunning) {
      console.log('[SelfHealing] ⚠️ Already running');
      return;
    }

    this.isRunning = true;
    console.log('[SelfHealing] 🚀 Self-healing system started');
    console.log('[SelfHealing] 🔧 Auto-fixing LSP errors and runtime issues');

    // Start error monitoring
    errorMonitorService.startMonitoring();

    // Run periodic health checks
    this.healingInterval = setInterval(() => {
      this.runHealthCheck();
    }, this.CHECK_INTERVAL);

    // Run initial health check
    this.runHealthCheck();
  }

  /**
   * Stop the self-healing system
   */
  stop(): void {
    if (this.healingInterval) {
      clearInterval(this.healingInterval);
      this.healingInterval = null;
    }
    this.isRunning = false;
    console.log('[SelfHealing] 🛑 Self-healing system stopped');
  }

  /**
   * Run a complete health check and auto-fix
   */
  private async runHealthCheck(): Promise<void> {
    try {
      console.log('[SelfHealing] 🏥 Running health check...');

      // Check for LSP errors
      const lspResult = await lspAutoFixService.runFullCheck().catch(() => ({
        errors: 0,
        fixed: 0,
        remaining: 0,
      }));

      if (lspResult.errors > 0) {
        console.log(
          `[SelfHealing] 📊 LSP Status: ${lspResult.errors} errors found, ${lspResult.fixed} auto-fixed, ${lspResult.remaining} remaining`
        );
        this.stats.totalHeals += lspResult.fixed;
        this.stats.successfulHeals += lspResult.fixed;
        this.stats.failedHeals += lspResult.remaining;
      }

      // Check error monitor stats
      const errorStats = errorMonitorService.getStats();
      if (errorStats.unfixed > 0) {
        console.log(
          `[SelfHealing] 📊 Error Monitor: ${errorStats.unfixed} unfixed errors detected`
        );
      }

      this.stats.lastHealTime = new Date();
      console.log('[SelfHealing] ✅ Health check complete');
    } catch (error: any) {
      console.error('[SelfHealing] ❌ Health check failed:', error.message);
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      errorMonitor: errorMonitorService.getStats(),
      lspAutoFix: lspAutoFixService.getStats(),
    };
  }

  /**
   * Force a healing cycle
   */
  async forceHeal(): Promise<void> {
    console.log('[SelfHealing] 🔧 Forcing healing cycle...');
    await this.runHealthCheck();
  }

  /**
   * Get stats
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }
}

// Singleton instance
export const selfHealingService = new SelfHealingService();
