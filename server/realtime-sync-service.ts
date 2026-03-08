import { Pool } from 'pg';
import type { DatabaseConnection } from '@shared/schema';
import { db } from './db';
import { databaseConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Real-time Sync Service
 * Automatically syncs data changes to backup databases
 */
class RealtimeSyncService {
  private enabledConnections: Map<string, Pool> = new Map();
  private syncQueue: Array<{ operation: string; data: any }> = [];
  private isSyncing = false;

  /**
   * Enable real-time sync for a database connection
   */
  async enableForConnection(connectionId: string): Promise<void> {
    try {
      if (!db) {
        console.log('[RealtimeSync] Database not available, sync disabled');
        return;
      }

      const result = await db
        .select()
        .from(databaseConnections)
        .where(eq(databaseConnections.id, connectionId))
        .limit(1);

      const connection = result[0];
      
      if (!connection) {
        console.error(`[RealtimeSync] Connection ${connectionId} not found`);
        return;
      }

      // Create connection pool
      const pool = new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
      });

      this.enabledConnections.set(connectionId, pool);
      console.log(`[RealtimeSync] ✅ Enabled for ${connection.name} (${connectionId})`);
    } catch (error: any) {
      console.error(`[RealtimeSync] Failed to enable for ${connectionId}:`, error.message);
    }
  }

  /**
   * Disable real-time sync for a database connection
   */
  async disableForConnection(connectionId: string): Promise<void> {
    const pool = this.enabledConnections.get(connectionId);
    if (pool) {
      await pool.end();
      this.enabledConnections.delete(connectionId);
      console.log(`[RealtimeSync] ❌ Disabled for ${connectionId}`);
    }
  }

  /**
   * Sync user data to all enabled backup databases
   */
  async syncUser(userId: string, userData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'user_update',
      data: { userId, userData },
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync transaction data to all enabled backup databases
   */
  async syncTransaction(transactionData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'transaction_insert',
      data: transactionData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync game data to all enabled backup databases
   */
  async syncGame(gameData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'game_update',
      data: gameData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync bet data to all enabled backup databases
   */
  async syncBet(betData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'bet_insert',
      data: betData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync referral data to all enabled backup databases
   */
  async syncReferral(referralData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'referral_insert',
      data: referralData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync admin action to all enabled backup databases
   */
  async syncAdminAction(actionData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'admin_action_insert',
      data: actionData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync withdrawal request to all enabled backup databases
   */
  async syncWithdrawalRequest(requestData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'withdrawal_request_update',
      data: requestData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync system setting to all enabled backup databases
   */
  async syncSystemSetting(settingData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'system_setting_update',
      data: settingData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync VIP setting to all enabled backup databases
   */
  async syncVipSetting(vipData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'vip_setting_update',
      data: vipData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync notification to all enabled backup databases
   */
  async syncNotification(notificationData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'notification_insert',
      data: notificationData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Sync promo code to all enabled backup databases
   */
  async syncPromoCode(promoData: any): Promise<void> {
    if (this.enabledConnections.size === 0) return;

    this.syncQueue.push({
      operation: 'promo_code_update',
      data: promoData,
    });

    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift();
      if (!item) continue;

      try {
        await this.executeSyncOperation(item);
      } catch (error: any) {
        console.error(`[RealtimeSync] Error syncing ${item.operation}:`, error.message);
      }
    }

    this.isSyncing = false;
  }

  /**
   * Execute a sync operation on all enabled connections
   */
  private async executeSyncOperation(item: { operation: string; data: any }): Promise<void> {
    const promises: Promise<any>[] = [];

    for (const [connectionId, pool] of Array.from(this.enabledConnections.entries())) {
      promises.push(
        this.syncToDatabase(pool, item.operation, item.data).catch((error) => {
          console.error(`[RealtimeSync] Failed to sync to ${connectionId}:`, error.message);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Sync data to a specific database
   */
  private async syncToDatabase(pool: Pool, operation: string, data: any): Promise<void> {
    const client = await pool.connect();

    try {
      switch (operation) {
        case 'user_update': {
          const { userId, userData } = data;
          await client.query(
            `INSERT INTO users (
              id, public_id, email, password_hash, withdrawal_password_hash, profile_photo,
              balance, role, vip_level, is_active, referral_code, referred_by, referral_level,
              total_deposits, total_withdrawals, total_winnings, total_losses, total_commission,
              total_bets_amount, daily_wager_amount, last_wager_reset_date, team_size, total_team_members,
              registration_ip, registration_country, last_login_ip, max_bet_limit,
              two_factor_enabled, two_factor_secret, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
            ON CONFLICT (id) DO UPDATE SET
              balance = EXCLUDED.balance,
              vip_level = EXCLUDED.vip_level,
              total_deposits = EXCLUDED.total_deposits,
              total_withdrawals = EXCLUDED.total_withdrawals,
              total_winnings = EXCLUDED.total_winnings,
              total_losses = EXCLUDED.total_losses,
              total_commission = EXCLUDED.total_commission,
              total_bets_amount = EXCLUDED.total_bets_amount,
              team_size = EXCLUDED.team_size,
              updated_at = EXCLUDED.updated_at`,
            [
              userData.id, userData.publicId, userData.email, userData.passwordHash,
              userData.withdrawalPasswordHash, userData.profilePhoto, userData.balance,
              userData.role, userData.vipLevel, userData.isActive, userData.referralCode,
              userData.referredBy, userData.referralLevel, userData.totalDeposits,
              userData.totalWithdrawals, userData.totalWinnings, userData.totalLosses,
              userData.totalCommission, userData.totalBetsAmount, userData.dailyWagerAmount,
              userData.lastWagerResetDate, userData.teamSize, userData.totalTeamMembers,
              userData.registrationIp, userData.registrationCountry, userData.lastLoginIp,
              userData.maxBetLimit, userData.twoFactorEnabled, userData.twoFactorSecret,
              userData.createdAt, userData.updatedAt
            ]
          );
          break;
        }

        case 'transaction_insert': {
          // Sync transaction to backup database
          await client.query(
            `INSERT INTO transactions (
              id, user_id, agent_id, type, fiat_amount, crypto_amount,
              fiat_currency, crypto_currency, status, payment_method, external_id,
              payment_address, tx_hash, fee, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING`,
            [
              data.id, data.userId, data.agentId, data.type, data.fiatAmount, data.cryptoAmount,
              data.fiatCurrency, data.cryptoCurrency, data.status, data.paymentMethod,
              data.externalId, data.paymentAddress, data.txHash, data.fee,
              data.createdAt, data.updatedAt
            ]
          );
          break;
        }

        case 'game_update': {
          // Sync game data to backup database
          await client.query(
            `INSERT INTO games (
              id, game_id, game_type, round_duration, start_time, end_time, status,
              result, result_color, result_size, crash_point, current_multiplier, crashed_at,
              is_manually_controlled, manual_result, total_bets_amount, total_payouts, house_profit,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              result = EXCLUDED.result,
              result_color = EXCLUDED.result_color,
              result_size = EXCLUDED.result_size,
              crash_point = EXCLUDED.crash_point,
              current_multiplier = EXCLUDED.current_multiplier,
              crashed_at = EXCLUDED.crashed_at,
              is_manually_controlled = EXCLUDED.is_manually_controlled,
              manual_result = EXCLUDED.manual_result,
              total_bets_amount = EXCLUDED.total_bets_amount,
              total_payouts = EXCLUDED.total_payouts,
              house_profit = EXCLUDED.house_profit`,
            [
              data.id, data.gameId, data.gameType, data.roundDuration, data.startTime, data.endTime,
              data.status, data.result, data.resultColor, data.resultSize, data.crashPoint,
              data.currentMultiplier, data.crashedAt, data.isManuallyControlled, data.manualResult,
              data.totalBetsAmount, data.totalPayouts, data.houseProfit, data.createdAt
            ]
          );
          break;
        }

        case 'bet_insert': {
          // Sync bet data to backup database
          await client.query(
            `INSERT INTO bets (
              id, user_id, game_id, bet_type, bet_value, amount, potential,
              actual_payout, status, cash_out_multiplier, auto_cash_out, cashed_out_at,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              actual_payout = EXCLUDED.actual_payout,
              status = EXCLUDED.status,
              cash_out_multiplier = EXCLUDED.cash_out_multiplier,
              cashed_out_at = EXCLUDED.cashed_out_at`,
            [
              data.id, data.userId, data.gameId, data.betType, data.betValue, data.amount,
              data.potential, data.actualPayout, data.status, data.cashOutMultiplier,
              data.autoCashOut, data.cashedOutAt, data.createdAt
            ]
          );
          break;
        }

        case 'referral_insert': {
          // Sync referral data to backup database
          await client.query(
            `INSERT INTO referrals (
              id, referrer_id, referred_id, referral_level, commission_rate,
              total_commission, has_deposited, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              total_commission = EXCLUDED.total_commission,
              has_deposited = EXCLUDED.has_deposited,
              status = EXCLUDED.status`,
            [
              data.id, data.referrerId, data.referredId, data.referralLevel,
              data.commissionRate, data.totalCommission, data.hasDeposited,
              data.status, data.createdAt
            ]
          );
          break;
        }

        case 'admin_action_insert': {
          // Sync admin action to backup database
          await client.query(
            `INSERT INTO admin_actions (
              id, admin_id, action, target_id, details, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING`,
            [
              data.id, data.adminId, data.action, data.targetId,
              data.details, data.createdAt
            ]
          );
          break;
        }

        case 'withdrawal_request_update': {
          // Sync withdrawal request to backup database
          await client.query(
            `INSERT INTO withdrawal_requests (
              id, user_id, amount, currency, wallet_address, status, admin_note,
              required_bet_amount, current_bet_amount, eligible, duplicate_ip_count,
              duplicate_ip_user_ids, commission_amount, winnings_amount, balance_frozen,
              processed_at, processed_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              admin_note = EXCLUDED.admin_note,
              eligible = EXCLUDED.eligible,
              processed_at = EXCLUDED.processed_at,
              processed_by = EXCLUDED.processed_by,
              updated_at = EXCLUDED.updated_at`,
            [
              data.id, data.userId, data.amount, data.currency, data.walletAddress,
              data.status, data.adminNote, data.requiredBetAmount, data.currentBetAmount,
              data.eligible, data.duplicateIpCount, data.duplicateIpUserIds,
              data.commissionAmount, data.winningsAmount, data.balanceFrozen,
              data.processedAt, data.processedBy, data.createdAt, data.updatedAt
            ]
          );
          break;
        }

        case 'system_setting_update': {
          // Sync system setting to backup database
          await client.query(
            `INSERT INTO system_settings (
              id, key, value, description, is_encrypted, last_updated_by,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (key) DO UPDATE SET
              value = EXCLUDED.value,
              description = EXCLUDED.description,
              is_encrypted = EXCLUDED.is_encrypted,
              last_updated_by = EXCLUDED.last_updated_by,
              updated_at = EXCLUDED.updated_at`,
            [
              data.id, data.key, data.value, data.description, data.isEncrypted,
              data.lastUpdatedBy, data.createdAt, data.updatedAt
            ]
          );
          break;
        }

        case 'vip_setting_update': {
          // Sync VIP setting to backup database
          await client.query(
            `INSERT INTO vip_settings (
              id, level_key, level_name, level_order, team_requirement, max_bet,
              daily_wager_reward, commission_rates, recharge_amount, telegram_link,
              icon_url, benefits, color, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (level_key) DO UPDATE SET
              level_name = EXCLUDED.level_name,
              level_order = EXCLUDED.level_order,
              team_requirement = EXCLUDED.team_requirement,
              max_bet = EXCLUDED.max_bet,
              daily_wager_reward = EXCLUDED.daily_wager_reward,
              commission_rates = EXCLUDED.commission_rates,
              recharge_amount = EXCLUDED.recharge_amount,
              telegram_link = EXCLUDED.telegram_link,
              icon_url = EXCLUDED.icon_url,
              benefits = EXCLUDED.benefits,
              color = EXCLUDED.color,
              is_active = EXCLUDED.is_active,
              updated_at = EXCLUDED.updated_at`,
            [
              data.id, data.levelKey, data.levelName, data.levelOrder, data.teamRequirement,
              data.maxBet, data.dailyWagerReward, data.commissionRates, data.rechargeAmount,
              data.telegramLink, data.iconUrl, data.benefits, data.color, data.isActive,
              data.createdAt, data.updatedAt
            ]
          );
          break;
        }

        case 'notification_insert': {
          // Sync notification to backup database
          await client.query(
            `INSERT INTO notifications (
              id, user_id, title, message, type, image_url, is_read, sent_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              is_read = EXCLUDED.is_read`,
            [
              data.id, data.userId, data.title, data.message, data.type,
              data.imageUrl, data.isRead, data.sentBy, data.createdAt
            ]
          );
          break;
        }

        case 'promo_code_update': {
          // Sync promo code to backup database
          await client.query(
            `INSERT INTO promo_codes (
              id, code, total_value, min_value, max_value, usage_limit, used_count,
              is_active, require_deposit, vip_level_upgrade, expires_at, created_by,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (code) DO UPDATE SET
              used_count = EXCLUDED.used_count,
              is_active = EXCLUDED.is_active,
              updated_at = EXCLUDED.updated_at`,
            [
              data.id, data.code, data.totalValue, data.minValue, data.maxValue,
              data.usageLimit, data.usedCount, data.isActive, data.requireDeposit,
              data.vipLevelUpgrade, data.expiresAt, data.createdBy, data.createdAt,
              data.updatedAt
            ]
          );
          break;
        }

        // Add more cases for other operations as needed
        default:
          console.warn(`[RealtimeSync] Unknown operation: ${operation}`);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Get all enabled connection IDs
   */
  getEnabledConnections(): string[] {
    return Array.from(this.enabledConnections.keys());
  }

  /**
   * Check if real-time sync is enabled
   */
  isEnabled(): boolean {
    return this.enabledConnections.size > 0;
  }
}

// Singleton instance
export const realtimeSyncService = new RealtimeSyncService();
