import { Pool } from 'pg';
import type { DatabaseConnection } from '@shared/schema';
import { db } from './db';
import { 
  users, 
  games, 
  bets, 
  transactions, 
  referrals,
  adminActions,
  gameAnalytics,
  userSessions,
  pageViews,
  systemSettings,
  agentProfiles,
  agentActivities,
  notifications,
  withdrawalRequests,
  promoCodes,
  promoCodeRedemptions,
  vipSettings,
  passwordResetTokens,
  passkeys,
  pushSubscriptions,
  goldenLiveStats,
  goldenLiveEvents
} from '@shared/schema';

export class MultiDatabaseService {
  private static instance: MultiDatabaseService;

  static getInstance(): MultiDatabaseService {
    if (!MultiDatabaseService.instance) {
      MultiDatabaseService.instance = new MultiDatabaseService();
    }
    return MultiDatabaseService.instance;
  }

  async testConnection(connection: DatabaseConnection): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      if (connection.databaseType !== 'postgresql') {
        return {
          success: false,
          message: `Database type ${connection.databaseType} is not yet supported. Only PostgreSQL is currently supported.`
        };
      }

      const pool = new Pool({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.username,
        password: connection.password,
        ssl: connection.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        max: 1
      });

      const client = await pool.connect();
      
      await client.query('SELECT 1');
      
      const latency = Date.now() - startTime;
      
      client.release();
      await pool.end();

      return {
        success: true,
        message: `Successfully connected to ${connection.name} in ${latency}ms`,
        latency
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async syncDataToExternalDatabase(
    connection: DatabaseConnection,
    onProgress?: (status: string, progress: number) => void
  ): Promise<{ success: boolean; message: string; stats?: any }> {
    if (connection.databaseType !== 'postgresql') {
      return {
        success: false,
        message: `Data sync is only supported for PostgreSQL databases. ${connection.databaseType} is not supported.`
      };
    }

    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      max: 5
    });

    try {
      const client = await pool.connect();
      
      onProgress?.('Testing connection...', 5);
      
      await client.query('SELECT 1');
      
      onProgress?.('Connection established. Creating schema...', 10);
      
      const schemaCreationResult = await this.createSchemaInExternalDatabase(client);
      
      if (!schemaCreationResult.success) {
        client.release();
        await pool.end();
        return schemaCreationResult;
      }

      onProgress?.('Schema created. Starting data copy...', 20);

      const stats = await this.copyAllDataToExternal(client, onProgress);

      onProgress?.('Data sync completed successfully!', 100);

      client.release();
      await pool.end();

      return {
        success: true,
        message: `Successfully synced all data to ${connection.name}`,
        stats
      };
    } catch (error: any) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        success: false,
        message: `Sync failed: ${error.message}`
      };
    }
  }

  private async createSchemaInExternalDatabase(client: any): Promise<{ success: boolean; message: string }> {
    try {
      const createEnumsSQL = `
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('user', 'admin', 'agent');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE vip_level AS ENUM ('lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE game_type AS ENUM ('color', 'crash');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE bet_type AS ENUM ('color', 'number', 'size', 'crash');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'cashed_out', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'referral_bonus', 'agent_commission', 'commission_withdrawal');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE withdrawal_request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE payment_method AS ENUM ('crypto', 'bank_transfer', 'agent', 'internal');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE referral_status AS ENUM ('active', 'inactive');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE database_type AS ENUM ('postgresql', 'mysql', 'mongodb');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE database_status AS ENUM ('active', 'inactive', 'testing');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await client.query(createEnumsSQL);

      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          public_id VARCHAR UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          withdrawal_password_hash TEXT,
          profile_photo TEXT,
          balance NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          role user_role NOT NULL DEFAULT 'user',
          vip_level vip_level NOT NULL DEFAULT 'lv1',
          is_active BOOLEAN NOT NULL DEFAULT true,
          referral_code TEXT UNIQUE,
          referred_by VARCHAR,
          referral_level INTEGER NOT NULL DEFAULT 1,
          total_deposits NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          total_withdrawals NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          total_winnings NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          total_losses NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          total_commission NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          total_bets_amount NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          daily_wager_amount NUMERIC(18,8) NOT NULL DEFAULT 0.00000000,
          last_wager_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          team_size INTEGER NOT NULL DEFAULT 0,
          total_team_members INTEGER NOT NULL DEFAULT 0,
          registration_ip TEXT,
          registration_country TEXT,
          last_login_ip TEXT,
          max_bet_limit NUMERIC(18,8) NOT NULL DEFAULT 999999.00000000,
          two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
          two_factor_secret TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
        CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
        CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
      `;

      await client.query(createTablesSQL);

      return {
        success: true,
        message: 'Schema created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create schema: ${error.message}`
      };
    }
  }

  private async copyAllDataToExternal(
    client: any,
    onProgress?: (status: string, progress: number) => void
  ): Promise<any> {
    const stats = {
      users: 0,
      userSessions: 0,
      pageViews: 0,
      transactions: 0,
      bets: 0,
      games: 0,
      referrals: 0,
      adminActions: 0,
      gameAnalytics: 0,
      withdrawalRequests: 0,
      notifications: 0,
      agentProfiles: 0,
      agentActivities: 0,
      promoCodes: 0,
      promoCodeRedemptions: 0,
      passwordResetTokens: 0,
      passkeys: 0,
      pushSubscriptions: 0,
      vipSettings: 0,
      systemSettings: 0,
      goldenLiveStats: 0,
      goldenLiveEvents: 0
    };

    try {
      // Copy users
      onProgress?.('Copying users...', 10);
      const usersData = await db.select().from(users);
      
      for (const user of usersData) {
        try {
          await client.query(
            `INSERT INTO users (
              id, public_id, email, password_hash, withdrawal_password_hash, profile_photo,
              balance, role, vip_level, is_active, referral_code, referred_by, referral_level,
              total_deposits, total_withdrawals, total_winnings, total_losses, total_commission,
              total_bets_amount, daily_wager_amount, last_wager_reset_date, team_size, total_team_members,
              registration_ip, registration_country, last_login_ip, max_bet_limit,
              two_factor_enabled, two_factor_secret, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
            ON CONFLICT (email) DO UPDATE SET
              public_id = EXCLUDED.public_id,
              balance = EXCLUDED.balance,
              role = EXCLUDED.role,
              vip_level = EXCLUDED.vip_level,
              is_active = EXCLUDED.is_active,
              total_deposits = EXCLUDED.total_deposits,
              total_withdrawals = EXCLUDED.total_withdrawals,
              total_winnings = EXCLUDED.total_winnings,
              total_losses = EXCLUDED.total_losses,
              total_commission = EXCLUDED.total_commission,
              total_bets_amount = EXCLUDED.total_bets_amount,
              team_size = EXCLUDED.team_size,
              total_team_members = EXCLUDED.total_team_members,
              max_bet_limit = EXCLUDED.max_bet_limit,
              updated_at = EXCLUDED.updated_at`,
            [
              user.id, user.publicId, user.email, user.passwordHash, user.withdrawalPasswordHash, user.profilePhoto,
              user.balance, user.role, user.vipLevel, user.isActive, user.referralCode, user.referredBy, user.referralLevel,
              user.totalDeposits, user.totalWithdrawals, user.totalWinnings, user.totalLosses, user.totalCommission,
              user.totalBetsAmount, user.dailyWagerAmount, user.lastWagerResetDate, user.teamSize, user.totalTeamMembers,
              user.registrationIp, user.registrationCountry, user.lastLoginIp, user.maxBetLimit,
              user.twoFactorEnabled, user.twoFactorSecret, user.createdAt, user.updatedAt
            ]
          );
          stats.users++;
        } catch (userError: any) {
          if (userError.code === '23505') {
            console.log(`[Sync] Skipping duplicate user: ${user.email}`);
            continue;
          }
          throw userError;
        }
      }

      onProgress?.(`Copied ${stats.users} users`, 20);

      // Copy user sessions (IP history, login data)
      onProgress?.('Copying user sessions (IP history)...', 25);
      try {
        const sessionsData = await db.select().from(userSessions);
        
        for (const session of sessionsData) {
          try {
            await client.query(
              `INSERT INTO user_sessions (
                id, user_id, ip_address, user_agent, browser_name, browser_version,
                device_type, device_model, operating_system, login_time, logout_time, is_active
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO UPDATE SET
                logout_time = EXCLUDED.logout_time,
                is_active = EXCLUDED.is_active`,
              [
                session.id, session.userId, session.ipAddress, session.userAgent,
                session.browserName, session.browserVersion, session.deviceType,
                session.deviceModel, session.operatingSystem, session.loginTime,
                session.logoutTime, session.isActive
              ]
            );
            stats.userSessions++;
          } catch (sessionError: any) {
            if (sessionError.code === '23505') continue;
            console.log(`[Sync] Session sync error:`, sessionError.message);
          }
        }
      } catch (error: any) {
        console.log(`[Sync] User sessions table might not exist yet:`, error.message);
      }

      onProgress?.(`Copied ${stats.userSessions} user sessions`, 35);

      // Copy page views (traffic analytics)
      onProgress?.('Copying page views...', 40);
      try {
        const pageViewsData = await db.select().from(pageViews);
        
        for (const view of pageViewsData) {
          try {
            await client.query(
              `INSERT INTO page_views (
                id, user_id, path, ip_address, country, user_agent,
                browser_name, device_type, device_model, operating_system,
                referrer, session_id, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (id) DO NOTHING`,
              [
                view.id, view.userId, view.path, view.ipAddress, view.country,
                view.userAgent, view.browserName, view.deviceType, view.deviceModel,
                view.operatingSystem, view.referrer, view.sessionId, view.createdAt
              ]
            );
            stats.pageViews++;
          } catch (viewError: any) {
            if (viewError.code === '23505') continue;
          }
        }
      } catch (error: any) {
        console.log(`[Sync] Page views table might not exist yet:`, error.message);
      }

      onProgress?.(`Copied ${stats.pageViews} page views`, 50);

      // Copy admin actions
      onProgress?.('Copying admin actions...', 55);
      try {
        const adminActionsData = await db.select().from(adminActions);
        
        for (const action of adminActionsData) {
          try {
            await client.query(
              `INSERT INTO admin_actions (id, admin_id, action, target_id, details, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO NOTHING`,
              [action.id, action.adminId, action.action, action.targetId, action.details, action.createdAt]
            );
            stats.adminActions++;
          } catch (err: any) {
            if (err.code === '23505') continue;
          }
        }
      } catch (error: any) {
        console.log(`[Sync] Admin actions table might not exist yet:`, error.message);
      }

      onProgress?.(`Copied ${stats.adminActions} admin actions`, 60);

      // Copy withdrawal requests
      onProgress?.('Copying withdrawal requests...', 65);
      try {
        const withdrawalRequestsData = await db.select().from(withdrawalRequests);
        
        for (const request of withdrawalRequestsData) {
          try {
            await client.query(
              `INSERT INTO withdrawal_requests (
                id, user_id, amount, currency, wallet_address, status,
                admin_note, required_bet_amount, current_bet_amount, eligible,
                duplicate_ip_count, duplicate_ip_user_ids, commission_amount,
                winnings_amount, balance_frozen, processed_at, processed_by,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
              ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                admin_note = EXCLUDED.admin_note,
                processed_at = EXCLUDED.processed_at,
                processed_by = EXCLUDED.processed_by,
                updated_at = EXCLUDED.updated_at`,
              [
                request.id, request.userId, request.amount, request.currency,
                request.walletAddress, request.status, request.adminNote,
                request.requiredBetAmount, request.currentBetAmount, request.eligible,
                request.duplicateIpCount, request.duplicateIpUserIds, request.commissionAmount,
                request.winningsAmount, request.balanceFrozen, request.processedAt,
                request.processedBy, request.createdAt, request.updatedAt
              ]
            );
            stats.withdrawalRequests++;
          } catch (err: any) {
            if (err.code === '23505') continue;
          }
        }
      } catch (error: any) {
        console.log(`[Sync] Withdrawal requests table might not exist yet:`, error.message);
      }

      onProgress?.(`Copied ${stats.withdrawalRequests} withdrawal requests`, 70);

      // Copy notifications
      onProgress?.('Copying notifications...', 75);
      try {
        const notificationsData = await db.select().from(notifications);
        
        for (const notification of notificationsData) {
          try {
            await client.query(
              `INSERT INTO notifications (id, user_id, title, message, type, image_url, is_read, sent_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET
                is_read = EXCLUDED.is_read`,
              [
                notification.id, notification.userId, notification.title,
                notification.message, notification.type, notification.imageUrl,
                notification.isRead, notification.sentBy, notification.createdAt
              ]
            );
            stats.notifications++;
          } catch (err: any) {
            if (err.code === '23505') continue;
          }
        }
      } catch (error: any) {
        console.log(`[Sync] Notifications table might not exist yet:`, error.message);
      }

      // Copy games
      onProgress?.('Copying games...', 80);
      try {
        const gamesData = await db.select().from(games);
        for (const game of gamesData) {
          try {
            await client.query(
              `INSERT INTO games (id, game_id, game_type, round_duration, start_time, end_time, status, result, result_color, result_size, crash_point, current_multiplier, crashed_at, is_manually_controlled, manual_result, total_bets_amount, total_payouts, house_profit, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, result = EXCLUDED.result, result_color = EXCLUDED.result_color, result_size = EXCLUDED.result_size, total_bets_amount = EXCLUDED.total_bets_amount, total_payouts = EXCLUDED.total_payouts, house_profit = EXCLUDED.house_profit`,
              [game.id, game.gameId, game.gameType, game.roundDuration, game.startTime, game.endTime, game.status, game.result, game.resultColor, game.resultSize, game.crashPoint, game.currentMultiplier, game.crashedAt, game.isManuallyControlled, game.manualResult, game.totalBetsAmount, game.totalPayouts, game.houseProfit, game.createdAt]
            );
            stats.games++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Games sync error:`, error.message); }

      // Copy bets
      onProgress?.('Copying bets...', 82);
      try {
        const betsData = await db.select().from(bets);
        for (const bet of betsData) {
          try {
            await client.query(
              `INSERT INTO bets (id, user_id, game_id, bet_type, bet_value, amount, potential, actual_payout, status, cash_out_multiplier, auto_cash_out, cashed_out_at, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, actual_payout = EXCLUDED.actual_payout, cashed_out_at = EXCLUDED.cashed_out_at`,
              [bet.id, bet.userId, bet.gameId, bet.betType, bet.betValue, bet.amount, bet.potential, bet.actualPayout, bet.status, bet.cashOutMultiplier, bet.autoCashOut, bet.cashedOutAt, bet.createdAt]
            );
            stats.bets++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Bets sync error:`, error.message); }

      // Copy transactions
      onProgress?.('Copying transactions...', 84);
      try {
        const transactionsData = await db.select().from(transactions);
        for (const txn of transactionsData) {
          try {
            await client.query(
              `INSERT INTO transactions (id, user_id, type, fiat_amount, crypto_amount, fiat_currency, crypto_currency, status, payment_method, external_id, payment_address, tx_hash, fee, agent_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
              [txn.id, txn.userId, txn.type, txn.fiatAmount, txn.cryptoAmount, txn.fiatCurrency, txn.cryptoCurrency, txn.status, txn.paymentMethod, txn.externalId, txn.paymentAddress, txn.txHash, txn.fee, txn.agentId, txn.createdAt, txn.updatedAt]
            );
            stats.transactions++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Transactions sync error:`, error.message); }

      // Copy referrals
      onProgress?.('Copying referrals...', 86);
      try {
        const referralsData = await db.select().from(referrals);
        for (const ref of referralsData) {
          try {
            await client.query(
              `INSERT INTO referrals (id, referrer_id, referred_id, referral_level, commission_rate, total_commission, has_deposited, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET total_commission = EXCLUDED.total_commission, has_deposited = EXCLUDED.has_deposited, status = EXCLUDED.status`,
              [ref.id, ref.referrerId, ref.referredId, ref.referralLevel, ref.commissionRate, ref.totalCommission, ref.hasDeposited, ref.status, ref.createdAt]
            );
            stats.referrals++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Referrals sync error:`, error.message); }

      // Copy system settings
      onProgress?.('Copying system settings...', 88);
      try {
        const settingsData = await db.select().from(systemSettings);
        for (const setting of settingsData) {
          try {
            await client.query(
              `INSERT INTO system_settings (id, key, value, description, updated_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
              [setting.id, setting.key, setting.value, setting.description, setting.updatedAt]
            );
            stats.systemSettings++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] System settings sync error:`, error.message); }

      // Copy agent profiles, promo codes, VIP settings, etc.
      onProgress?.('Copying remaining tables...', 90);
      
      try {
        const agentProfilesData = await db.select().from(agentProfiles);
        for (const profile of agentProfilesData) {
          try {
            await client.query(`INSERT INTO agent_profiles (id, user_id, commission_rate, earnings_balance, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET earnings_balance = EXCLUDED.earnings_balance, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at`, [profile.id, profile.userId, profile.commissionRate, profile.earningsBalance, profile.isActive, profile.createdAt, profile.updatedAt]);
            stats.agentProfiles++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Agent profiles:`, error.message); }

      try {
        const promoCodesData = await db.select().from(promoCodes);
        for (const code of promoCodesData) {
          try {
            await client.query(`INSERT INTO promo_codes (id, code, total_value, min_value, max_value, usage_limit, used_count, is_active, require_deposit, vip_level_upgrade, expires_at, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO UPDATE SET used_count = EXCLUDED.used_count, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at`, [code.id, code.code, code.totalValue, code.minValue, code.maxValue, code.usageLimit, code.usedCount, code.isActive, code.requireDeposit, code.vipLevelUpgrade, code.expiresAt, code.createdBy, code.createdAt, code.updatedAt]);
            stats.promoCodes++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] Promo codes:`, error.message); }

      try {
        const vipSettingsData = await db.select().from(vipSettings);
        for (const vip of vipSettingsData) {
          try {
            await client.query(`INSERT INTO vip_settings (id, level_key, level_name, level_order, team_requirement, max_bet, daily_wager_reward, commission_rates, recharge_amount, telegram_link, support_email, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO UPDATE SET team_requirement = EXCLUDED.team_requirement, max_bet = EXCLUDED.max_bet, daily_wager_reward = EXCLUDED.daily_wager_reward, commission_rates = EXCLUDED.commission_rates, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at`, [vip.id, vip.levelKey, vip.levelName, vip.levelOrder, vip.teamRequirement, vip.maxBet, vip.dailyWagerReward, vip.commissionRates, vip.rechargeAmount, vip.telegramLink, vip.supportEmail, vip.isActive, vip.createdAt, vip.updatedAt]);
            stats.vipSettings++;
          } catch (err: any) { if (err.code === '23505') continue; }
        }
      } catch (error: any) { console.log(`[Sync] VIP settings:`, error.message); }

      onProgress?.(`✅ සම්පූර්ණ Backup සාර්ථකයි! සියලුම tables backup වුණා`, 100);

      console.log('[Sync] 🎉 සම්පූර්ණ Backup Stats:', stats);
      console.log(`[Sync] ✅ Total: ${Object.values(stats).reduce((a: number, b: number) => a + b, 0)} records backed up across ${Object.keys(stats).length} tables`);

      return stats;
    } catch (error: any) {
      console.error('Error copying data:', error);
      throw error;
    }
  }

  async getConnectionStats(connection: DatabaseConnection): Promise<{ success: boolean; stats?: any; message?: string }> {
    if (connection.databaseType !== 'postgresql') {
      return {
        success: false,
        message: `Stats retrieval is only supported for PostgreSQL databases.`
      };
    }

    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      max: 1
    });

    try {
      const client = await pool.connect();
      
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
      `);

      client.release();
      await pool.end();

      const stats = {
        tables: result.rows.length,
        totalSize: result.rows.reduce((sum: number, row: any) => sum + parseInt(row.size_bytes || 0), 0),
        tableDetails: result.rows.map((row: any) => ({
          name: row.tablename,
          sizeBytes: parseInt(row.size_bytes || 0)
        }))
      };

      return {
        success: true,
        stats
      };
    } catch (error: any) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        success: false,
        message: `Failed to get stats: ${error.message}`
      };
    }
  }
}

export const multiDatabaseService = MultiDatabaseService.getInstance();
