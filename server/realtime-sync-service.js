"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeSyncService = void 0;
var pg_1 = require("pg");
var db_1 = require("./db");
var schema_1 = require("@shared/schema");
var drizzle_orm_1 = require("drizzle-orm");
/**
 * Real-time Sync Service
 * Automatically syncs data changes to backup databases
 */
var RealtimeSyncService = /** @class */ (function () {
    function RealtimeSyncService() {
        this.enabledConnections = new Map();
        this.syncQueue = [];
        this.isSyncing = false;
    }
    /**
     * Enable real-time sync for a database connection
     */
    RealtimeSyncService.prototype.enableForConnection = function (connectionId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, connection, pool, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!db_1.db) {
                            console.log('[RealtimeSync] Database not available, sync disabled');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.databaseConnections)
                                .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, connectionId))
                                .limit(1)];
                    case 1:
                        result = _a.sent();
                        connection = result[0];
                        if (!connection) {
                            console.error("[RealtimeSync] Connection ".concat(connectionId, " not found"));
                            return [2 /*return*/];
                        }
                        pool = new pg_1.Pool({
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
                        console.log("[RealtimeSync] \u2705 Enabled for ".concat(connection.name, " (").concat(connectionId, ")"));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("[RealtimeSync] Failed to enable for ".concat(connectionId, ":"), error_1.message);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Disable real-time sync for a database connection
     */
    RealtimeSyncService.prototype.disableForConnection = function (connectionId) {
        return __awaiter(this, void 0, void 0, function () {
            var pool;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pool = this.enabledConnections.get(connectionId);
                        if (!pool) return [3 /*break*/, 2];
                        return [4 /*yield*/, pool.end()];
                    case 1:
                        _a.sent();
                        this.enabledConnections.delete(connectionId);
                        console.log("[RealtimeSync] \u274C Disabled for ".concat(connectionId));
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync user data to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncUser = function (userId, userData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'user_update',
                    data: { userId: userId, userData: userData },
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync transaction data to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncTransaction = function (transactionData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'transaction_insert',
                    data: transactionData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync game data to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncGame = function (gameData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'game_update',
                    data: gameData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync bet data to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncBet = function (betData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'bet_insert',
                    data: betData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync referral data to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncReferral = function (referralData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'referral_insert',
                    data: referralData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync admin action to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncAdminAction = function (actionData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'admin_action_insert',
                    data: actionData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync withdrawal request to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncWithdrawalRequest = function (requestData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'withdrawal_request_update',
                    data: requestData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync system setting to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncSystemSetting = function (settingData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'system_setting_update',
                    data: settingData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync VIP setting to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncVipSetting = function (vipData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'vip_setting_update',
                    data: vipData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync notification to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncNotification = function (notificationData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'notification_insert',
                    data: notificationData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Sync promo code to all enabled backup databases
     */
    RealtimeSyncService.prototype.syncPromoCode = function (promoData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.enabledConnections.size === 0)
                    return [2 /*return*/];
                this.syncQueue.push({
                    operation: 'promo_code_update',
                    data: promoData,
                });
                if (!this.isSyncing) {
                    this.processQueue();
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Process the sync queue
     */
    RealtimeSyncService.prototype.processQueue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var item, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isSyncing || this.syncQueue.length === 0)
                            return [2 /*return*/];
                        this.isSyncing = true;
                        _a.label = 1;
                    case 1:
                        if (!(this.syncQueue.length > 0)) return [3 /*break*/, 6];
                        item = this.syncQueue.shift();
                        if (!item)
                            return [3 /*break*/, 1];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.executeSyncOperation(item)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error("[RealtimeSync] Error syncing ".concat(item.operation, ":"), error_2.message);
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 1];
                    case 6:
                        this.isSyncing = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Execute a sync operation on all enabled connections
     */
    RealtimeSyncService.prototype.executeSyncOperation = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, _loop_1, this_1, _i, _a, _b, connectionId, pool;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        promises = [];
                        _loop_1 = function (connectionId, pool) {
                            promises.push(this_1.syncToDatabase(pool, item.operation, item.data).catch(function (error) {
                                console.error("[RealtimeSync] Failed to sync to ".concat(connectionId, ":"), error.message);
                            }));
                        };
                        this_1 = this;
                        for (_i = 0, _a = Array.from(this.enabledConnections.entries()); _i < _a.length; _i++) {
                            _b = _a[_i], connectionId = _b[0], pool = _b[1];
                            _loop_1(connectionId, pool);
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sync data to a specific database
     */
    RealtimeSyncService.prototype.syncToDatabase = function (pool, operation, data) {
        return __awaiter(this, void 0, void 0, function () {
            var client, _a, userId, userData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, pool.connect()];
                    case 1:
                        client = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 27, 28]);
                        _a = operation;
                        switch (_a) {
                            case 'user_update': return [3 /*break*/, 3];
                            case 'transaction_insert': return [3 /*break*/, 5];
                            case 'game_update': return [3 /*break*/, 7];
                            case 'bet_insert': return [3 /*break*/, 9];
                            case 'referral_insert': return [3 /*break*/, 11];
                            case 'admin_action_insert': return [3 /*break*/, 13];
                            case 'withdrawal_request_update': return [3 /*break*/, 15];
                            case 'system_setting_update': return [3 /*break*/, 17];
                            case 'vip_setting_update': return [3 /*break*/, 19];
                            case 'notification_insert': return [3 /*break*/, 21];
                            case 'promo_code_update': return [3 /*break*/, 23];
                        }
                        return [3 /*break*/, 25];
                    case 3:
                        userId = data.userId, userData = data.userData;
                        return [4 /*yield*/, client.query("INSERT INTO users (\n              id, public_id, email, password_hash, withdrawal_password_hash, profile_photo,\n              balance, role, vip_level, is_active, referral_code, referred_by, referral_level,\n              total_deposits, total_withdrawals, total_winnings, total_losses, total_commission,\n              total_bets_amount, daily_wager_amount, last_wager_reset_date, team_size, total_team_members,\n              registration_ip, registration_country, last_login_ip, max_bet_limit,\n              two_factor_enabled, two_factor_secret, created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)\n            ON CONFLICT (id) DO UPDATE SET\n              balance = EXCLUDED.balance,\n              vip_level = EXCLUDED.vip_level,\n              total_deposits = EXCLUDED.total_deposits,\n              total_withdrawals = EXCLUDED.total_withdrawals,\n              total_winnings = EXCLUDED.total_winnings,\n              total_losses = EXCLUDED.total_losses,\n              total_commission = EXCLUDED.total_commission,\n              total_bets_amount = EXCLUDED.total_bets_amount,\n              team_size = EXCLUDED.team_size,\n              updated_at = EXCLUDED.updated_at", [
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
                            ])];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 5: 
                    // Sync transaction to backup database
                    return [4 /*yield*/, client.query("INSERT INTO transactions (\n              id, user_id, agent_id, type, fiat_amount, crypto_amount,\n              fiat_currency, crypto_currency, status, payment_method, external_id,\n              payment_address, tx_hash, fee, created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)\n            ON CONFLICT (id) DO NOTHING", [
                            data.id, data.userId, data.agentId, data.type, data.fiatAmount, data.cryptoAmount,
                            data.fiatCurrency, data.cryptoCurrency, data.status, data.paymentMethod,
                            data.externalId, data.paymentAddress, data.txHash, data.fee,
                            data.createdAt, data.updatedAt
                        ])];
                    case 6:
                        // Sync transaction to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 7: 
                    // Sync game data to backup database
                    return [4 /*yield*/, client.query("INSERT INTO games (\n              id, game_id, game_type, round_duration, start_time, end_time, status,\n              result, result_color, result_size, crash_point, current_multiplier, crashed_at,\n              is_manually_controlled, manual_result, total_bets_amount, total_payouts, house_profit,\n              created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)\n            ON CONFLICT (id) DO UPDATE SET\n              status = EXCLUDED.status,\n              result = EXCLUDED.result,\n              result_color = EXCLUDED.result_color,\n              result_size = EXCLUDED.result_size,\n              crash_point = EXCLUDED.crash_point,\n              current_multiplier = EXCLUDED.current_multiplier,\n              crashed_at = EXCLUDED.crashed_at,\n              is_manually_controlled = EXCLUDED.is_manually_controlled,\n              manual_result = EXCLUDED.manual_result,\n              total_bets_amount = EXCLUDED.total_bets_amount,\n              total_payouts = EXCLUDED.total_payouts,\n              house_profit = EXCLUDED.house_profit", [
                            data.id, data.gameId, data.gameType, data.roundDuration, data.startTime, data.endTime,
                            data.status, data.result, data.resultColor, data.resultSize, data.crashPoint,
                            data.currentMultiplier, data.crashedAt, data.isManuallyControlled, data.manualResult,
                            data.totalBetsAmount, data.totalPayouts, data.houseProfit, data.createdAt
                        ])];
                    case 8:
                        // Sync game data to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 9: 
                    // Sync bet data to backup database
                    return [4 /*yield*/, client.query("INSERT INTO bets (\n              id, user_id, game_id, bet_type, bet_value, amount, potential,\n              actual_payout, status, cash_out_multiplier, auto_cash_out, cashed_out_at,\n              created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n            ON CONFLICT (id) DO UPDATE SET\n              actual_payout = EXCLUDED.actual_payout,\n              status = EXCLUDED.status,\n              cash_out_multiplier = EXCLUDED.cash_out_multiplier,\n              cashed_out_at = EXCLUDED.cashed_out_at", [
                            data.id, data.userId, data.gameId, data.betType, data.betValue, data.amount,
                            data.potential, data.actualPayout, data.status, data.cashOutMultiplier,
                            data.autoCashOut, data.cashedOutAt, data.createdAt
                        ])];
                    case 10:
                        // Sync bet data to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 11: 
                    // Sync referral data to backup database
                    return [4 /*yield*/, client.query("INSERT INTO referrals (\n              id, referrer_id, referred_id, referral_level, commission_rate,\n              total_commission, has_deposited, status, created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n            ON CONFLICT (id) DO UPDATE SET\n              total_commission = EXCLUDED.total_commission,\n              has_deposited = EXCLUDED.has_deposited,\n              status = EXCLUDED.status", [
                            data.id, data.referrerId, data.referredId, data.referralLevel,
                            data.commissionRate, data.totalCommission, data.hasDeposited,
                            data.status, data.createdAt
                        ])];
                    case 12:
                        // Sync referral data to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 13: 
                    // Sync admin action to backup database
                    return [4 /*yield*/, client.query("INSERT INTO admin_actions (\n              id, admin_id, action, target_id, details, created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6)\n            ON CONFLICT (id) DO NOTHING", [
                            data.id, data.adminId, data.action, data.targetId,
                            data.details, data.createdAt
                        ])];
                    case 14:
                        // Sync admin action to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 15: 
                    // Sync withdrawal request to backup database
                    return [4 /*yield*/, client.query("INSERT INTO withdrawal_requests (\n              id, user_id, amount, currency, wallet_address, status, admin_note,\n              required_bet_amount, current_bet_amount, eligible, duplicate_ip_count,\n              duplicate_ip_user_ids, commission_amount, winnings_amount, balance_frozen,\n              processed_at, processed_by, created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)\n            ON CONFLICT (id) DO UPDATE SET\n              status = EXCLUDED.status,\n              admin_note = EXCLUDED.admin_note,\n              eligible = EXCLUDED.eligible,\n              processed_at = EXCLUDED.processed_at,\n              processed_by = EXCLUDED.processed_by,\n              updated_at = EXCLUDED.updated_at", [
                            data.id, data.userId, data.amount, data.currency, data.walletAddress,
                            data.status, data.adminNote, data.requiredBetAmount, data.currentBetAmount,
                            data.eligible, data.duplicateIpCount, data.duplicateIpUserIds,
                            data.commissionAmount, data.winningsAmount, data.balanceFrozen,
                            data.processedAt, data.processedBy, data.createdAt, data.updatedAt
                        ])];
                    case 16:
                        // Sync withdrawal request to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 17: 
                    // Sync system setting to backup database
                    return [4 /*yield*/, client.query("INSERT INTO system_settings (\n              id, key, value, description, is_encrypted, last_updated_by,\n              created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n            ON CONFLICT (key) DO UPDATE SET\n              value = EXCLUDED.value,\n              description = EXCLUDED.description,\n              is_encrypted = EXCLUDED.is_encrypted,\n              last_updated_by = EXCLUDED.last_updated_by,\n              updated_at = EXCLUDED.updated_at", [
                            data.id, data.key, data.value, data.description, data.isEncrypted,
                            data.lastUpdatedBy, data.createdAt, data.updatedAt
                        ])];
                    case 18:
                        // Sync system setting to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 19: 
                    // Sync VIP setting to backup database
                    return [4 /*yield*/, client.query("INSERT INTO vip_settings (\n              id, level_key, level_name, level_order, team_requirement, max_bet,\n              daily_wager_reward, commission_rates, recharge_amount, telegram_link,\n              icon_url, benefits, color, is_active, created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)\n            ON CONFLICT (level_key) DO UPDATE SET\n              level_name = EXCLUDED.level_name,\n              level_order = EXCLUDED.level_order,\n              team_requirement = EXCLUDED.team_requirement,\n              max_bet = EXCLUDED.max_bet,\n              daily_wager_reward = EXCLUDED.daily_wager_reward,\n              commission_rates = EXCLUDED.commission_rates,\n              recharge_amount = EXCLUDED.recharge_amount,\n              telegram_link = EXCLUDED.telegram_link,\n              icon_url = EXCLUDED.icon_url,\n              benefits = EXCLUDED.benefits,\n              color = EXCLUDED.color,\n              is_active = EXCLUDED.is_active,\n              updated_at = EXCLUDED.updated_at", [
                            data.id, data.levelKey, data.levelName, data.levelOrder, data.teamRequirement,
                            data.maxBet, data.dailyWagerReward, data.commissionRates, data.rechargeAmount,
                            data.telegramLink, data.iconUrl, data.benefits, data.color, data.isActive,
                            data.createdAt, data.updatedAt
                        ])];
                    case 20:
                        // Sync VIP setting to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 21: 
                    // Sync notification to backup database
                    return [4 /*yield*/, client.query("INSERT INTO notifications (\n              id, user_id, title, message, type, image_url, is_read, sent_by, created_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n            ON CONFLICT (id) DO UPDATE SET\n              is_read = EXCLUDED.is_read", [
                            data.id, data.userId, data.title, data.message, data.type,
                            data.imageUrl, data.isRead, data.sentBy, data.createdAt
                        ])];
                    case 22:
                        // Sync notification to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 23: 
                    // Sync promo code to backup database
                    return [4 /*yield*/, client.query("INSERT INTO promo_codes (\n              id, code, total_value, min_value, max_value, usage_limit, used_count,\n              is_active, require_deposit, vip_level_upgrade, expires_at, created_by,\n              created_at, updated_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)\n            ON CONFLICT (code) DO UPDATE SET\n              used_count = EXCLUDED.used_count,\n              is_active = EXCLUDED.is_active,\n              updated_at = EXCLUDED.updated_at", [
                            data.id, data.code, data.totalValue, data.minValue, data.maxValue,
                            data.usageLimit, data.usedCount, data.isActive, data.requireDeposit,
                            data.vipLevelUpgrade, data.expiresAt, data.createdBy, data.createdAt,
                            data.updatedAt
                        ])];
                    case 24:
                        // Sync promo code to backup database
                        _b.sent();
                        return [3 /*break*/, 26];
                    case 25:
                        console.warn("[RealtimeSync] Unknown operation: ".concat(operation));
                        _b.label = 26;
                    case 26: return [3 /*break*/, 28];
                    case 27:
                        client.release();
                        return [7 /*endfinally*/];
                    case 28: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all enabled connection IDs
     */
    RealtimeSyncService.prototype.getEnabledConnections = function () {
        return Array.from(this.enabledConnections.keys());
    };
    /**
     * Check if real-time sync is enabled
     */
    RealtimeSyncService.prototype.isEnabled = function () {
        return this.enabledConnections.size > 0;
    };
    return RealtimeSyncService;
}());
// Singleton instance
exports.realtimeSyncService = new RealtimeSyncService();
