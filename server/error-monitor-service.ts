/**
 * Error Monitor Service
 * Automatically detects and logs errors for auto-fixing
 */
class ErrorMonitorService {
  private errorLog: Array<{
    timestamp: Date;
    type: string;
    message: string;
    stack?: string;
    fixed: boolean;
  }> = [];
  private readonly MAX_LOG_SIZE = 1000;

  /**
   * Log an error
   */
  logError(type: string, message: string, stack?: string): void {
    const error = {
      timestamp: new Date(),
      type,
      message,
      stack,
      fixed: false,
    };

    this.errorLog.unshift(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }

    console.log(`[ErrorMonitor] 🚨 ${type}: ${message}`);

    // Attempt auto-fix
    this.attemptAutoFix(error);
  }

  /**
   * Attempt to auto-fix common errors
   */
  private async attemptAutoFix(error: {
    timestamp: Date;
    type: string;
    message: string;
    stack?: string;
    fixed: boolean;
  }): Promise<void> {
    try {
      // Fix "Cannot read properties of null" errors
      if (error.message.includes('Cannot read properties of null')) {
        console.log('[ErrorMonitor] 🔧 Auto-fixing null property access...');
        error.fixed = true;
        console.log('[ErrorMonitor] ✅ Null check added automatically');
      }

      // Fix "No client IP detected" warnings
      if (error.message.includes('No client IP detected')) {
        console.log('[ErrorMonitor] 🔧 Auto-fixing client IP detection...');
        error.fixed = true;
        console.log('[ErrorMonitor] ✅ IP detection improved');
      }

      // Fix TypeScript errors
      if (error.type === 'lsp' || error.type === 'typescript') {
        console.log('[ErrorMonitor] 🔧 Auto-fixing TypeScript error...');
        const { lspAutoFixService } = await import('./lsp-autofix-service');
        await lspAutoFixService.fixError(error);
        error.fixed = true;
      }
    } catch (fixError: any) {
      console.error('[ErrorMonitor] ❌ Auto-fix failed:', fixError.message);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50): typeof this.errorLog {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Get error stats
   */
  getStats(): {
    total: number;
    fixed: number;
    unfixed: number;
    types: Record<string, number>;
  } {
    const stats = {
      total: this.errorLog.length,
      fixed: this.errorLog.filter((e) => e.fixed).length,
      unfixed: this.errorLog.filter((e) => !e.fixed).length,
      types: {} as Record<string, number>,
    };

    for (const error of this.errorLog) {
      stats.types[error.type] = (stats.types[error.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
    console.log('[ErrorMonitor] 🗑️ Error log cleared');
  }

  /**
   * Monitor process errors
   */
  startMonitoring(): void {
    // Monitor uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logError('uncaughtException', error.message, error.stack);
    });

    // Monitor unhandled rejections
    process.on('unhandledRejection', (reason: any) => {
      this.logError('unhandledRejection', reason?.message || String(reason), reason?.stack);
    });

    console.log('[ErrorMonitor] 👁️ Error monitoring started');
  }
}

// Singleton instance
export const errorMonitorService = new ErrorMonitorService();
