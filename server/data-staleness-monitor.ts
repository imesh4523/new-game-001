import { storage } from './storage';
import type { WebSocket } from 'ws';

interface StalenessCheck {
  type: 'balance' | 'deposit' | 'withdrawal' | 'transaction' | 'bet' | 'game_result';
  userId?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  fixed: boolean;
}

interface MonitoringStats {
  totalChecks: number;
  staleDataDetected: number;
  autoFixesApplied: number;
  lastCheck: Date | null;
  recentIssues: StalenessCheck[];
}

class DataStalenessMonitor {
  private broadcastCallback: ((message: any) => void) | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private stats: MonitoringStats = {
    totalChecks: 0,
    staleDataDetected: 0,
    autoFixesApplied: 0,
    lastCheck: null,
    recentIssues: []
  };
  
  // Track last known states
  private lastKnownBalances = new Map<string, string>();
  private lastKnownDeposits = new Map<string, Date>();
  private lastKnownWithdrawals = new Map<string, Date>();
  
  private readonly CHECK_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RECENT_ISSUES = 50;

  registerBroadcastCallback(callback: (message: any) => void) {
    this.broadcastCallback = callback;
    console.log('✅ Data staleness monitor broadcast callback registered');
  }

  start() {
    if (this.monitorInterval) {
      console.log('⚠️  Data staleness monitor already running');
      return;
    }

    console.log(`🔍 Starting data staleness monitor (every ${this.CHECK_INTERVAL}ms)`);
    
    // Run initial check
    this.runStalenessCheck();
    
    // Schedule periodic checks
    this.monitorInterval = setInterval(() => {
      this.runStalenessCheck();
    }, this.CHECK_INTERVAL);

    console.log('✅ Data staleness monitor started');
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('🛑 Data staleness monitor stopped');
    }
  }

  private async runStalenessCheck() {
    try {
      this.stats.totalChecks++;
      this.stats.lastCheck = new Date();

      // Check for balance inconsistencies
      await this.checkBalances();
      
      // Check for pending deposits
      await this.checkPendingDeposits();
      
      // Check for pending withdrawals
      await this.checkPendingWithdrawals();
      
      // Check for unprocessed transactions
      await this.checkUnprocessedTransactions();
      
      // Broadcast monitoring status
      this.broadcastMonitoringStatus();
      
    } catch (error) {
      console.error('❌ Error in staleness check:', error);
    }
  }

  private async checkBalances() {
    try {
      // Get all users with recent activity (deposits, withdrawals, bets in last 5 minutes)
      const recentUsers = await storage.getUsersWithRecentActivity(5);
      
      for (const user of recentUsers) {
        const lastKnown = this.lastKnownBalances.get(user.id);
        
        if (lastKnown !== undefined && lastKnown !== user.balance) {
          // Balance changed - this is normal, broadcast update
          this.recordChange({
            type: 'balance',
            userId: user.id,
            oldValue: lastKnown,
            newValue: user.balance,
            timestamp: new Date(),
            fixed: true
          });
          
          // Broadcast balance update to specific user
          this.broadcast({
            type: 'balance_update',
            userId: user.id,
            balance: user.balance,
            previousBalance: lastKnown,
            timestamp: new Date().toISOString()
          });
        }
        
        // Update last known balance
        this.lastKnownBalances.set(user.id, user.balance);
      }
    } catch (error) {
      console.error('❌ Error checking balances:', error);
    }
  }

  private async checkPendingDeposits() {
    try {
      // Get deposits from last 10 minutes that might need user notification
      const recentDeposits = await storage.getRecentDeposits(10);
      
      for (const deposit of recentDeposits) {
        const lastCheck = this.lastKnownDeposits.get(deposit.id);
        
        if (!lastCheck) {
          // New deposit detected - broadcast to user
          this.recordChange({
            type: 'deposit',
            userId: deposit.userId,
            oldValue: null,
            newValue: deposit.fiatAmount || deposit.cryptoAmount,
            timestamp: new Date(),
            fixed: true
          });
          
          this.broadcast({
            type: 'deposit_update',
            userId: deposit.userId,
            depositId: deposit.id,
            fiatAmount: deposit.fiatAmount,
            cryptoAmount: deposit.cryptoAmount,
            status: deposit.status,
            timestamp: new Date().toISOString()
          });
          
          this.lastKnownDeposits.set(deposit.id, new Date());
        }
      }
    } catch (error) {
      console.error('❌ Error checking deposits:', error);
    }
  }

  private async checkPendingWithdrawals() {
    try {
      // Get withdrawals from last 10 minutes
      const recentWithdrawals = await storage.getRecentWithdrawals(10);
      
      for (const withdrawal of recentWithdrawals) {
        const lastCheck = this.lastKnownWithdrawals.get(withdrawal.id);
        
        if (!lastCheck) {
          // New withdrawal detected - broadcast to user
          this.recordChange({
            type: 'withdrawal',
            userId: withdrawal.userId,
            oldValue: null,
            newValue: withdrawal.fiatAmount || withdrawal.cryptoAmount,
            timestamp: new Date(),
            fixed: true
          });
          
          this.broadcast({
            type: 'withdrawal_update',
            userId: withdrawal.userId,
            withdrawalId: withdrawal.id,
            fiatAmount: withdrawal.fiatAmount,
            cryptoAmount: withdrawal.cryptoAmount,
            status: withdrawal.status,
            timestamp: new Date().toISOString()
          });
          
          this.lastKnownWithdrawals.set(withdrawal.id, new Date());
        }
      }
    } catch (error) {
      console.error('❌ Error checking withdrawals:', error);
    }
  }

  private async checkUnprocessedTransactions() {
    try {
      // Get recent transactions from last 5 minutes
      const recentTransactions = await storage.getRecentTransactions(5);
      
      if (recentTransactions.length > 0) {
        // Broadcast transaction update
        this.broadcast({
          type: 'transactions_update',
          count: recentTransactions.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error checking transactions:', error);
    }
  }

  private recordChange(check: StalenessCheck) {
    this.stats.staleDataDetected++;
    if (check.fixed) {
      this.stats.autoFixesApplied++;
    }
    
    this.stats.recentIssues.unshift(check);
    
    // Keep only recent issues
    if (this.stats.recentIssues.length > this.MAX_RECENT_ISSUES) {
      this.stats.recentIssues = this.stats.recentIssues.slice(0, this.MAX_RECENT_ISSUES);
    }
  }

  private broadcast(message: any) {
    if (this.broadcastCallback) {
      this.broadcastCallback(message);
    }
  }

  private broadcastMonitoringStatus() {
    // Broadcast monitoring stats every check
    this.broadcast({
      type: 'staleness_monitor_status',
      stats: {
        totalChecks: this.stats.totalChecks,
        staleDataDetected: this.stats.staleDataDetected,
        autoFixesApplied: this.stats.autoFixesApplied,
        lastCheck: this.stats.lastCheck,
        isHealthy: true
      },
      timestamp: new Date().toISOString()
    });
  }

  getStats(): MonitoringStats {
    return {
      ...this.stats,
      recentIssues: [...this.stats.recentIssues]
    };
  }

  resetStats() {
    this.stats = {
      totalChecks: 0,
      staleDataDetected: 0,
      autoFixesApplied: 0,
      lastCheck: null,
      recentIssues: []
    };
    this.lastKnownBalances.clear();
    this.lastKnownDeposits.clear();
    this.lastKnownWithdrawals.clear();
  }
}

export const dataStalenessMonitor = new DataStalenessMonitor();
