"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.storage = exports.MemStorage = exports.DatabaseStorage = void 0;
exports.initializeStorage = initializeStorage;
var schema_1 = require("@shared/schema");
var vip_service_1 = require("./vip-service");
var crypto_1 = require("crypto");
var bcrypt = require("bcrypt");
var otplib_1 = require("otplib");
var db_1 = require("./db");
var drizzle_orm_1 = require("drizzle-orm");
var realtime_sync_service_1 = require("./realtime-sync-service");
// In-memory storage for pending 2FA setups (use Redis in production)
var pending2FASetups = new Map();
// Builder functions for schema-compliant default objects
function buildUserInsert(overrides) {
    var _a, _b, _c, _d, _e;
    return __assign({ email: overrides.email || "", passwordHash: overrides.passwordHash || "", referralLevel: (_a = overrides.referralLevel) !== null && _a !== void 0 ? _a : 1, totalBetsAmount: (_b = overrides.totalBetsAmount) !== null && _b !== void 0 ? _b : "0.00000000", dailyWagerAmount: (_c = overrides.dailyWagerAmount) !== null && _c !== void 0 ? _c : "0.00000000", lastWagerResetDate: (_d = overrides.lastWagerResetDate) !== null && _d !== void 0 ? _d : new Date(), teamSize: (_e = overrides.teamSize) !== null && _e !== void 0 ? _e : 0 }, overrides);
}
function buildReferralInsert(overrides) {
    var _a, _b;
    return __assign({ referrerId: overrides.referrerId || "", referredId: overrides.referredId || "", referralLevel: (_a = overrides.referralLevel) !== null && _a !== void 0 ? _a : 1, hasDeposited: (_b = overrides.hasDeposited) !== null && _b !== void 0 ? _b : false }, overrides);
}
var DatabaseStorage = /** @class */ (function () {
    function DatabaseStorage() {
        var _this = this;
        this.cleanupInterval = null;
        // Reference to javascript_database integration
        // Initialize default data asynchronously and handle errors
        this.initializeDefaultData().catch(function (error) {
            console.error('Error initializing default data:', error);
        });
        // Start periodic cleanup of expired Telegram login sessions (every 10 minutes)
        this.cleanupInterval = setInterval(function () {
            _this.purgeExpiredTelegramSessions().catch(function (error) {
                console.error('Failed to purge expired Telegram sessions:', error);
            });
        }, 10 * 60 * 1000);
        // Run initial cleanup
        this.purgeExpiredTelegramSessions().catch(console.error);
    }
    DatabaseStorage.prototype.purgeExpiredTelegramSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                                .where((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " < NOW()"], ["", " < NOW()"])), schema_1.telegramLoginSessions.expiresAt))];
                    case 1:
                        result = _a.sent();
                        if (result.rowCount && result.rowCount > 0) {
                            console.log("\uD83E\uDDF9 Cleaned up ".concat(result.rowCount, " expired Telegram login session(s)"));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error purging expired Telegram sessions:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.initializeDefaultData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var existingAdmin, passwordHash, referralCode, adminUser, demoEmails, _i, demoEmails_1, email, existingUser, passwordHash, referralCode, publicId, publicId, defaultSettings, _a, defaultSettings_1, setting, existingSetting, existingCrashSettings, existingAdvancedCrashSettings, vipLevels, _b, vipLevels_1, level, existingVipSetting, defaultTelegramLinks, _c, defaultTelegramLinks_1, linkData, existingLink, error_2;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 34, , 35]);
                        if (!(process.env.NODE_ENV === 'development')) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.getUserByEmail('pursuer.ail-4d@icloud.com')];
                    case 1:
                        existingAdmin = _d.sent();
                        if (!!existingAdmin) return [3 /*break*/, 4];
                        return [4 /*yield*/, bcrypt.hash('admin1234', 10)];
                    case 2:
                        passwordHash = _d.sent();
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.users)
                                .values({
                                email: 'pursuer.ail-4d@icloud.com',
                                publicId: '10000000000',
                                passwordHash: passwordHash,
                                balance: "10000.00000000",
                                role: "admin",
                                vipLevel: "vip5",
                                isActive: true,
                                referralCode: referralCode,
                                totalDeposits: "10000.00000000",
                                totalWithdrawals: "0.00000000",
                                totalWinnings: "0.00000000",
                                totalLosses: "0.00000000",
                                maxBetLimit: "10000.00000000",
                                lastWithdrawalRequestAt: null,
                                minDepositAmount: null,
                                maxDepositAmount: null,
                                isAcceptingDeposits: false
                            })
                                .returning()];
                    case 3:
                        adminUser = (_d.sent())[0];
                        console.log('⚠️  DEVELOPMENT ONLY: Admin user created with username: admin, password: admin1234');
                        console.log('⚠️  SECURITY WARNING: This should NEVER run in production!');
                        _d.label = 4;
                    case 4:
                        demoEmails = ['player1@demo.com', 'player2@demo.com', 'player3@demo.com'];
                        _i = 0, demoEmails_1 = demoEmails;
                        _d.label = 5;
                    case 5:
                        if (!(_i < demoEmails_1.length)) return [3 /*break*/, 12];
                        email = demoEmails_1[_i];
                        return [4 /*yield*/, this.getUserByEmail(email)];
                    case 6:
                        existingUser = _d.sent();
                        if (!!existingUser) return [3 /*break*/, 9];
                        return [4 /*yield*/, bcrypt.hash('demo123', 10)];
                    case 7:
                        passwordHash = _d.sent();
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.users)
                                .values({
                                email: email,
                                publicId: publicId,
                                passwordHash: passwordHash,
                                balance: "100000.00000000",
                                role: "user",
                                vipLevel: "vip",
                                isActive: true,
                                referralCode: referralCode,
                                totalDeposits: "500.00000000",
                                totalWithdrawals: "0.00000000",
                                totalWinnings: "200.00000000",
                                totalLosses: "100.00000000",
                                maxBetLimit: "500.00000000",
                                lastWithdrawalRequestAt: null,
                                minDepositAmount: null,
                                maxDepositAmount: null,
                                isAcceptingDeposits: false
                            })];
                    case 8:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 9:
                        if (!!existingUser.publicId) return [3 /*break*/, 11];
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({ publicId: publicId, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, existingUser.id))];
                    case 10:
                        _d.sent();
                        _d.label = 11;
                    case 11:
                        _i++;
                        return [3 /*break*/, 5];
                    case 12:
                        defaultSettings = [
                            {
                                key: 'withdrawals_enabled',
                                value: 'true',
                                description: 'Controls whether users can access withdrawal functionality',
                                isEncrypted: false
                            },
                            {
                                key: 'minimum_withdrawal_vip_level',
                                value: 'lv1',
                                description: 'Minimum VIP level required for withdrawals (lv1, lv2, vip, vip1-vip7)',
                                isEncrypted: false
                            },
                            {
                                key: 'house_profit_percentage',
                                value: '20',
                                description: 'Percentage of total bets that should result in house profit',
                                isEncrypted: false
                            },
                            {
                                key: 'betting_fee_percentage',
                                value: '3',
                                description: 'Fee percentage deducted from winnings on every bet',
                                isEncrypted: false
                            },
                            {
                                key: 'coin_flip_win_probability',
                                value: '50',
                                description: 'Player win probability for coin flip game (percentage)',
                                isEncrypted: false
                            },
                            {
                                key: 'telegram_signals_enabled',
                                value: 'true',
                                description: 'Enable/Disable automatic Telegram signals for game periods',
                                isEncrypted: false
                            },
                            {
                                key: 'telegram_bot_token',
                                value: '',
                                description: 'Telegram Bot Token from @BotFather',
                                isEncrypted: true
                            },
                            {
                                key: 'telegram_chat_id',
                                value: '',
                                description: 'Your Telegram Chat ID for withdrawal notifications',
                                isEncrypted: false
                            },
                            {
                                key: 'telegram_signal_chat_id',
                                value: '',
                                description: 'Telegram Channel/Group Chat ID for game signals',
                                isEncrypted: true
                            },
                            {
                                key: 'telegram_bot_username',
                                value: '',
                                description: 'Telegram Bot Username (without @) for Login Widget. Get from @BotFather after creating bot.',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_lv1',
                                value: '999999',
                                description: 'Maximum bet limit for Level 1 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_lv2',
                                value: '999999',
                                description: 'Maximum bet limit for Level 2 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip',
                                value: '999999',
                                description: 'Maximum bet limit for VIP (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip1',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 1 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip2',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 2 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip3',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 3 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip4',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 4 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip5',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 5 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip6',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 6 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'vip_bet_limit_vip7',
                                value: '999999',
                                description: 'Maximum bet limit for VIP 7 (coins per bet)',
                                isEncrypted: false
                            },
                            {
                                key: 'blocked_countries',
                                value: '[]',
                                description: 'JSON array of country codes to block (e.g., ["CN", "RU", "KP"]). Leave empty [] to block none.',
                                isEncrypted: false
                            },
                            {
                                key: 'allowed_countries',
                                value: '[]',
                                description: 'JSON array of allowed country codes for whitelist mode (e.g., ["US", "GB", "LK"]). Leave empty [] to allow all.',
                                isEncrypted: false
                            },
                            {
                                key: 'country_blocking_mode',
                                value: 'blacklist',
                                description: 'Country blocking mode: "blacklist" (block specific countries) or "whitelist" (only allow specific countries)',
                                isEncrypted: false
                            },
                            {
                                key: 'betting_requirement_percentage',
                                value: '60',
                                description: 'Percentage of total deposits that users must bet before they can withdraw (e.g., 60 means users must bet 60% of deposits)',
                                isEncrypted: false
                            },
                            {
                                key: 'betting_requirement_notification_interval',
                                value: '24',
                                description: 'Hours between betting requirement reminder notifications (e.g., 24 means show reminder every 24 hours)',
                                isEncrypted: false
                            },
                            {
                                key: 'christmas_mode_enabled',
                                value: 'false',
                                description: 'Enable/Disable Christmas theme with snow animation',
                                isEncrypted: false
                            },
                            {
                                key: 'valentine_mode_enabled',
                                value: 'false',
                                description: 'Enable/Disable Valentine theme with falling hearts animation',
                                isEncrypted: false
                            },
                            {
                                key: 'app_version',
                                value: 'v2.0.1',
                                description: 'PWA app version number displayed to users (e.g., v2.0.1)',
                                isEncrypted: false
                            }
                        ];
                        _a = 0, defaultSettings_1 = defaultSettings;
                        _d.label = 13;
                    case 13:
                        if (!(_a < defaultSettings_1.length)) return [3 /*break*/, 17];
                        setting = defaultSettings_1[_a];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.systemSettings).where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, setting.key)).limit(1)];
                    case 14:
                        existingSetting = _d.sent();
                        if (!(existingSetting.length === 0)) return [3 /*break*/, 16];
                        return [4 /*yield*/, db_1.db.insert(schema_1.systemSettings).values({
                                key: setting.key,
                                value: setting.value,
                                description: setting.description,
                                isEncrypted: setting.isEncrypted,
                                lastUpdatedBy: 'system'
                            })];
                    case 15:
                        _d.sent();
                        console.log("\u2705 Default system setting created: ".concat(setting.key, " = ").concat(setting.value));
                        _d.label = 16;
                    case 16:
                        _a++;
                        return [3 /*break*/, 13];
                    case 17: return [4 /*yield*/, db_1.db.select().from(schema_1.crashSettings).limit(1)];
                    case 18:
                        existingCrashSettings = (_d.sent())[0];
                        if (!!existingCrashSettings) return [3 /*break*/, 20];
                        return [4 /*yield*/, db_1.db.insert(schema_1.crashSettings).values({
                                houseEdge: "20.00",
                                maxMultiplier: "50.00",
                                minCrashMultiplier: "1.01",
                                crashEnabled: true,
                                updatedBy: 'system',
                            })];
                    case 19:
                        _d.sent();
                        console.log('✅ Default crash settings initialized');
                        _d.label = 20;
                    case 20: return [4 /*yield*/, db_1.db.select().from(schema_1.advancedCrashSettings).limit(1)];
                    case 21:
                        existingAdvancedCrashSettings = (_d.sent())[0];
                        if (!!existingAdvancedCrashSettings) return [3 /*break*/, 23];
                        return [4 /*yield*/, db_1.db.insert(schema_1.advancedCrashSettings).values({
                                deepThinkingEnabled: false,
                                noBetBaitMinMultiplier: "7.00",
                                noBetBaitMaxMultiplier: "20.00",
                                whaleTargetMinMultiplier: "1.01",
                                whaleTargetMaxMultiplier: "1.04",
                                standardLossMaxThreshold: "2.00",
                                playerWinProbability: "40.00",
                                updatedBy: 'system',
                            })];
                    case 22:
                        _d.sent();
                        console.log('✅ Default advanced crash settings initialized');
                        _d.label = 23;
                    case 23:
                        vipLevels = [
                            {
                                key: 'lv1', order: 1, displayName: 'Level 1', teamRequirement: 0, depositRequirement: 0,
                                maxBetLimit: 100, dailyWagerReward: 0.000,
                                commissionRates: [0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.007, 0.005, 0.003]
                            },
                            {
                                key: 'lv2', order: 2, displayName: 'Level 2', teamRequirement: 1, depositRequirement: 30,
                                maxBetLimit: 500, dailyWagerReward: 0.0005,
                                commissionRates: [0.065, 0.055, 0.045, 0.035, 0.025, 0.015, 0.01, 0.007, 0.005]
                            },
                            {
                                key: 'vip', order: 3, displayName: 'VIP', teamRequirement: 7, depositRequirement: 300,
                                maxBetLimit: 1000, dailyWagerReward: 0.001,
                                commissionRates: [0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.005]
                            },
                            {
                                key: 'vip1', order: 4, displayName: 'VIP 1', teamRequirement: 10, depositRequirement: 600,
                                maxBetLimit: 2000, dailyWagerReward: 0.002,
                                commissionRates: [0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01]
                            },
                            {
                                key: 'vip2', order: 5, displayName: 'VIP 2', teamRequirement: 20, depositRequirement: 1000,
                                maxBetLimit: 5000, dailyWagerReward: 0.003,
                                commissionRates: [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02]
                            },
                            {
                                key: 'vip3', order: 6, displayName: 'VIP 3', teamRequirement: 30, depositRequirement: 2000,
                                maxBetLimit: 10000, dailyWagerReward: 0.004,
                                commissionRates: [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03]
                            },
                            {
                                key: 'vip4', order: 7, displayName: 'VIP 4', teamRequirement: 40, depositRequirement: 5000,
                                maxBetLimit: 20000, dailyWagerReward: 0.005,
                                commissionRates: [0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04]
                            },
                            {
                                key: 'vip5', order: 8, displayName: 'VIP 5', teamRequirement: 50, depositRequirement: 10000,
                                maxBetLimit: 50000, dailyWagerReward: 0.006,
                                commissionRates: [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05]
                            },
                            {
                                key: 'vip6', order: 9, displayName: 'VIP 6', teamRequirement: 60, depositRequirement: 20000,
                                maxBetLimit: 100000, dailyWagerReward: 0.007,
                                commissionRates: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06]
                            },
                            {
                                key: 'vip7', order: 10, displayName: 'VIP 7', teamRequirement: 70, depositRequirement: 50000,
                                maxBetLimit: 200000, dailyWagerReward: 0.008,
                                commissionRates: [0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07]
                            },
                        ];
                        _b = 0, vipLevels_1 = vipLevels;
                        _d.label = 24;
                    case 24:
                        if (!(_b < vipLevels_1.length)) return [3 /*break*/, 28];
                        level = vipLevels_1[_b];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.vipSettings).where((0, drizzle_orm_1.eq)(schema_1.vipSettings.levelKey, level.key)).limit(1)];
                    case 25:
                        existingVipSetting = _d.sent();
                        if (!(existingVipSetting.length === 0)) return [3 /*break*/, 27];
                        return [4 /*yield*/, db_1.db.insert(schema_1.vipSettings).values({
                                levelKey: level.key,
                                levelName: level.displayName,
                                levelOrder: level.order,
                                teamRequirement: level.teamRequirement,
                                maxBet: level.maxBetLimit.toString() + '.00000000',
                                dailyWagerReward: level.dailyWagerReward.toFixed(6),
                                commissionRates: JSON.stringify(level.commissionRates),
                                rechargeAmount: level.depositRequirement.toString() + '.00000000',
                                isActive: true
                            })];
                    case 26:
                        _d.sent();
                        console.log("\u2705 VIP setting initialized: ".concat(level.key, " - ").concat(level.displayName));
                        _d.label = 27;
                    case 27:
                        _b++;
                        return [3 /*break*/, 24];
                    case 28:
                        defaultTelegramLinks = [
                            { vipLevel: 'lv1', description: 'Level 1 Telegram Group' },
                            { vipLevel: 'lv2', description: 'Level 2 Telegram Group' },
                            { vipLevel: 'vip', description: 'VIP Telegram Channel' },
                            { vipLevel: 'vip1', description: 'VIP 1 Elite Circle' },
                            { vipLevel: 'vip2', description: 'VIP 2 Premium Club' },
                            { vipLevel: 'vip3', description: 'VIP 3 Diamond Members' },
                            { vipLevel: 'vip4', description: 'VIP 4 Platinum Circle' },
                            { vipLevel: 'vip5', description: 'VIP 5 Master Traders' },
                            { vipLevel: 'vip6', description: 'VIP 6 Elite Masters' },
                            { vipLevel: 'vip7', description: 'VIP 7 Grand Masters' },
                        ];
                        _c = 0, defaultTelegramLinks_1 = defaultTelegramLinks;
                        _d.label = 29;
                    case 29:
                        if (!(_c < defaultTelegramLinks_1.length)) return [3 /*break*/, 33];
                        linkData = defaultTelegramLinks_1[_c];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.vipLevelTelegramLinks).where((0, drizzle_orm_1.eq)(schema_1.vipLevelTelegramLinks.vipLevel, linkData.vipLevel)).limit(1)];
                    case 30:
                        existingLink = _d.sent();
                        if (!(existingLink.length === 0)) return [3 /*break*/, 32];
                        return [4 /*yield*/, db_1.db.insert(schema_1.vipLevelTelegramLinks).values({
                                vipLevel: linkData.vipLevel,
                                telegramLink: '',
                                description: linkData.description,
                                isActive: true,
                                updatedBy: 'system'
                            })];
                    case 31:
                        _d.sent();
                        _d.label = 32;
                    case 32:
                        _c++;
                        return [3 /*break*/, 29];
                    case 33:
                        console.log('✅ Default VIP Telegram links initialized');
                        return [3 /*break*/, 35];
                    case 34:
                        error_2 = _d.sent();
                        console.error('Error initializing default data:', error_2);
                        return [3 /*break*/, 35];
                    case 35: return [2 /*return*/];
                }
            });
        });
    };
    // User authentication methods
    DatabaseStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id))];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!email)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email))];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByTelegramId = function (telegramId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!telegramId)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.telegramId, telegramId))];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.createTelegramLinkToken = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, expiryMinutes) {
            var token, expiresAt;
            if (expiryMinutes === void 0) { expiryMinutes = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token = Math.random().toString(36).substring(2, 10).toUpperCase();
                        expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                        return [4 /*yield*/, db_1.db.update(schema_1.users)
                                .set({
                                telegramLinkToken: token,
                                telegramLinkExpiresAt: expiresAt
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { token: token, expiresAt: expiresAt }];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByLinkToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!token)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, db_1.db.select().from(schema_1.users)
                                .where((0, drizzle_orm_1.eq)(schema_1.users.telegramLinkToken, token))];
                    case 1:
                        user = (_a.sent())[0];
                        if (!user)
                            return [2 /*return*/, undefined];
                        if (user.telegramLinkExpiresAt && new Date(user.telegramLinkExpiresAt) < new Date()) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.linkTelegramAccount = function (userId, telegramData) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.users)
                            .set({
                            telegramId: telegramData.id.toString(),
                            telegramUsername: telegramData.username || null,
                            telegramFirstName: telegramData.first_name || null,
                            telegramPhotoUrl: telegramData.photo_url || null,
                            telegramLinkToken: null,
                            telegramLinkExpiresAt: null
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        updatedUser = (_a.sent())[0];
                        return [2 /*return*/, updatedUser || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.clearTelegramLinkToken = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.users)
                            .set({
                            telegramLinkToken: null,
                            telegramLinkExpiresAt: null
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        updatedUser = (_a.sent())[0];
                        return [2 /*return*/, updatedUser || undefined];
                }
            });
        });
    };
    // Telegram login session methods - database-backed with safeguards
    DatabaseStorage.prototype.createTelegramLoginSession = function (token_1) {
        return __awaiter(this, arguments, void 0, function (token, expiryMinutes) {
            var expiresAt;
            if (expiryMinutes === void 0) { expiryMinutes = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                        // Delete any existing session with this token (handles retries/duplicates)
                        return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 1:
                        // Delete any existing session with this token (handles retries/duplicates)
                        _a.sent();
                        // Insert new session
                        return [4 /*yield*/, db_1.db.insert(schema_1.telegramLoginSessions).values({
                                token: token,
                                expiresAt: expiresAt,
                                userId: null
                            })];
                    case 2:
                        // Insert new session
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramLoginSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramLoginSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))
                            .limit(1)];
                    case 1:
                        session = (_a.sent())[0];
                        if (!session) {
                            return [2 /*return*/, undefined];
                        }
                        if (!(session.expiresAt < new Date())) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/, {
                            userId: session.userId || undefined,
                            expiresAt: session.expiresAt
                        }];
                }
            });
        });
    };
    DatabaseStorage.prototype.completeTelegramLogin = function (token, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTelegramLoginSession(token)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            throw new Error('Login session expired or not found');
                        }
                        // Update session with userId
                        return [4 /*yield*/, db_1.db.update(schema_1.telegramLoginSessions)
                                .set({ userId: userId })
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 2:
                        // Update session with userId
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteTelegramLoginSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Telegram auto-join channels methods
    DatabaseStorage.prototype.createTelegramAutoJoinChannel = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.telegramAutoJoinChannels)
                            .values(channel)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramAutoJoinChannels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.priority), (0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getEnabledTelegramAutoJoinChannels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.isEnabled, true))
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.priority), (0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramAutoJoinChannel = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var channel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))
                            .limit(1)];
                    case 1:
                        channel = (_a.sent())[0];
                        return [2 /*return*/, channel];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTelegramAutoJoinChannel = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.telegramAutoJoinChannels)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteTelegramAutoJoinChannel = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    DatabaseStorage.prototype.createUser = function (insertUser, registrationIp, registrationCountry) {
        return __awaiter(this, void 0, void 0, function () {
            var passwordHash, withdrawalPasswordHash, _a, referralCode, publicId, referrerId, referrer, user, referrerUser, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, bcrypt.hash(insertUser.password, 10)];
                    case 1:
                        passwordHash = _b.sent();
                        if (!insertUser.withdrawalPassword) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.hash(insertUser.withdrawalPassword, 10)];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = null;
                        _b.label = 4;
                    case 4:
                        withdrawalPasswordHash = _a;
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        referrerId = null;
                        if (!insertUser.referralCode) return [3 /*break*/, 6];
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.users)
                                .where((0, drizzle_orm_1.eq)(schema_1.users.referralCode, insertUser.referralCode))
                                .limit(1)];
                    case 5:
                        referrer = _b.sent();
                        if (referrer.length > 0) {
                            referrerId = referrer[0].id;
                        }
                        _b.label = 6;
                    case 6: return [4 /*yield*/, db_1.db
                            .insert(schema_1.users)
                            .values({
                            email: insertUser.email,
                            publicId: publicId,
                            passwordHash: passwordHash,
                            withdrawalPasswordHash: withdrawalPasswordHash,
                            referralCode: referralCode,
                            referredBy: referrerId,
                            balance: "0.09000000",
                            role: "user",
                            vipLevel: "lv1",
                            isActive: true,
                            registrationIp: registrationIp || null,
                            registrationCountry: registrationCountry || null,
                            lastLoginIp: registrationIp || null,
                            maxBetLimit: "10.00000000",
                            totalDeposits: "0.00000000",
                            totalWithdrawals: "0.00000000",
                            totalWinnings: "0.00000000",
                            totalLosses: "0.00000000",
                            lastWithdrawalRequestAt: null
                        })
                            .returning()];
                    case 7:
                        user = (_b.sent())[0];
                        if (!referrerId) return [3 /*break*/, 14];
                        _b.label = 8;
                    case 8:
                        _b.trys.push([8, 13, , 14]);
                        // Create referral record
                        return [4 /*yield*/, this.createReferral({
                                referrerId: referrerId,
                                referredId: user.id,
                                commissionRate: "0.0500", // 5% default
                                status: "active"
                            })];
                    case 9:
                        // Create referral record
                        _b.sent();
                        return [4 /*yield*/, this.getUser(referrerId)];
                    case 10:
                        referrerUser = _b.sent();
                        if (!referrerUser) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.updateUser(referrerId, {
                                totalTeamMembers: (referrerUser.totalTeamMembers || 0) + 1
                            })];
                    case 11:
                        _b.sent();
                        _b.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        error_3 = _b.sent();
                        console.error('Error processing referral:', error_3);
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/, user];
                }
            });
        });
    };
    DatabaseStorage.prototype.validateUser = function (credentials) {
        return __awaiter(this, void 0, void 0, function () {
            var user, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getUserByEmail(credentials.email)];
                    case 1:
                        user = _b.sent();
                        _a = user;
                        if (!_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.compare(credentials.password, user.passwordHash)];
                    case 2:
                        _a = (_b.sent());
                        _b.label = 3;
                    case 3:
                        if (_a) {
                            return [2 /*return*/, user];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.validateWithdrawalPassword = function (userId, withdrawalPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var user, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _b.sent();
                        _a = user && user.withdrawalPasswordHash;
                        if (!_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.compare(withdrawalPassword, user.withdrawalPasswordHash)];
                    case 2:
                        _a = (_b.sent());
                        _b.label = 3;
                    case 3:
                        if (_a) {
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                }
            });
        });
    };
    DatabaseStorage.prototype.updatePassword = function (email, newPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var passwordHash, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bcrypt.hash(newPassword, 10)];
                    case 1:
                        passwordHash = _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({ passwordHash: passwordHash, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
                                .returning()];
                    case 2:
                        user = (_a.sent())[0];
                        return [2 /*return*/, !!user];
                }
            });
        });
    };
    // Password reset token methods
    DatabaseStorage.prototype.createPasswordResetToken = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var token, expiresAt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token = (0, crypto_1.randomUUID)();
                        expiresAt = new Date(Date.now() + 60 * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.passwordResetTokens)
                                .values({
                                email: email,
                                token: token,
                                expiresAt: expiresAt,
                                used: false
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, token];
                }
            });
        });
    };
    DatabaseStorage.prototype.validatePasswordResetToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenRecord;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.passwordResetTokens)
                            .where((0, drizzle_orm_1.eq)(schema_1.passwordResetTokens.token, token))];
                    case 1:
                        tokenRecord = (_a.sent())[0];
                        if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < new Date()) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, tokenRecord.email];
                }
            });
        });
    };
    DatabaseStorage.prototype.markPasswordResetTokenUsed = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.passwordResetTokens)
                            .set({ used: true })
                            .where((0, drizzle_orm_1.eq)(schema_1.passwordResetTokens.token, token))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateUser = function (userId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.users)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        if (!(user && realtime_sync_service_1.realtimeSyncService.isEnabled())) return [3 /*break*/, 3];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncUser(userId, user).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync user update:', err.message);
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateUserBalance = function (userId, newBalance) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.users)
                            .set({ balance: newBalance, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        if (!(user && realtime_sync_service_1.realtimeSyncService.isEnabled())) return [3 /*break*/, 3];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncUser(userId, user).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync balance update:', err.message);
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.atomicDeductBalance = function (userId, amount, options) {
        return __awaiter(this, void 0, void 0, function () {
            var deductAmount, preciseAmount, totalBetsIncrement, dailyWagerIncrement, user, existingUser, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        deductAmount = parseFloat(amount);
                        // Validation
                        if (isNaN(deductAmount) || deductAmount <= 0) {
                            return [2 /*return*/, { success: false, error: 'Invalid amount' }];
                        }
                        preciseAmount = deductAmount.toFixed(8);
                        totalBetsIncrement = (options === null || options === void 0 ? void 0 : options.incrementTotalBets) ? preciseAmount : '0';
                        dailyWagerIncrement = (options === null || options === void 0 ? void 0 : options.incrementDailyWager) ? preciseAmount : '0';
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CAST(balance AS NUMERIC) - ", ""], ["CAST(balance AS NUMERIC) - ", ""])), preciseAmount),
                                totalBetsAmount: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["COALESCE(CAST(total_bets_amount AS NUMERIC), 0) + ", ""], ["COALESCE(CAST(total_bets_amount AS NUMERIC), 0) + ", ""])), totalBetsIncrement),
                                dailyWagerAmount: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["COALESCE(CAST(daily_wager_amount AS NUMERIC), 0) + ", ""], ["COALESCE(CAST(daily_wager_amount AS NUMERIC), 0) + ", ""])), dailyWagerIncrement),
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["", " = ", " AND CAST(", " AS NUMERIC) >= ", ""], ["", " = ", " AND CAST(", " AS NUMERIC) >= ", ""])), schema_1.users.id, userId, schema_1.users.balance, preciseAmount))
                                .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        if (!!user) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getUser(userId)];
                    case 2:
                        existingUser = _a.sent();
                        if (!existingUser) {
                            return [2 /*return*/, { success: false, error: 'User not found' }];
                        }
                        return [2 /*return*/, { success: false, error: 'Insufficient balance' }];
                    case 3:
                        if (!realtime_sync_service_1.realtimeSyncService.isEnabled()) return [3 /*break*/, 5];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncUser(userId, user).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync atomic balance deduction:', err.message);
                            })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, { success: true, user: user }];
                    case 6:
                        error_4 = _a.sent();
                        console.error('Atomic balance deduction error:', error_4);
                        return [2 /*return*/, { success: false, error: 'Database error' }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.atomicIncrementBalance = function (userId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var incrementAmount, preciseAmount, currentUser, user, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        console.log("\u2795 [AtomicIncrement] Input amount (raw): \"".concat(amount, "\" (type: ").concat(typeof amount, ")"));
                        incrementAmount = parseFloat(amount);
                        console.log("\u2795 [AtomicIncrement] Parsed to float: ".concat(incrementAmount));
                        // Validation
                        if (isNaN(incrementAmount) || incrementAmount <= 0) {
                            console.log("\u274C [AtomicIncrement] Validation failed: isNaN=".concat(isNaN(incrementAmount), ", amount=").concat(incrementAmount));
                            return [2 /*return*/, { success: false, error: 'Invalid amount' }];
                        }
                        preciseAmount = incrementAmount.toFixed(8);
                        console.log("\u2795 [AtomicIncrement] Precise amount (8 decimals): \"".concat(preciseAmount, "\""));
                        return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        currentUser = _a.sent();
                        console.log("\u2795 [AtomicIncrement] Current balance BEFORE: ".concat(currentUser === null || currentUser === void 0 ? void 0 : currentUser.balance));
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: (0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["balance + CAST(", " AS numeric)"], ["balance + CAST(", " AS numeric)"])), preciseAmount),
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                                .returning()];
                    case 2:
                        user = (_a.sent())[0];
                        console.log("\u2795 [AtomicIncrement] New balance AFTER: ".concat(user === null || user === void 0 ? void 0 : user.balance));
                        console.log("\u2795 [AtomicIncrement] Expected: ".concat(parseFloat((currentUser === null || currentUser === void 0 ? void 0 : currentUser.balance) || '0') + incrementAmount));
                        if (!user) {
                            return [2 /*return*/, { success: false, error: 'User not found' }];
                        }
                        if (!realtime_sync_service_1.realtimeSyncService.isEnabled()) return [3 /*break*/, 4];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncUser(userId, user).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync atomic balance increment:', err.message);
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, { success: true, user: user }];
                    case 5:
                        error_5 = _a.sent();
                        console.error('Atomic balance increment error:', error_5);
                        return [2 /*return*/, { success: false, error: 'Database error' }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.generateReferralCode = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var referralCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        return [4 /*yield*/, this.updateUser(userId, { referralCode: referralCode })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, referralCode];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUsersByRegistrationIp = function (ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!ipAddress)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.users)
                                .where((0, drizzle_orm_1.eq)(schema_1.users.registrationIp, ipAddress))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Admin methods
    DatabaseStorage.prototype.getAllUsers = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, totalResult, total, userList;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 10000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.users)];
                    case 1:
                        totalResult = (_a.sent())[0];
                        total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0;
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.users)
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
                                .limit(limit)
                                .offset(offset)];
                    case 2:
                        userList = _a.sent();
                        return [2 /*return*/, { users: userList, total: total }];
                }
            });
        });
    };
    DatabaseStorage.prototype.toggleUserStatus = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.updateUser(userId, { isActive: !user.isActive })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.banUser = function (userId, reason, bannedUntil) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.updateUser(userId, {
                                isBanned: true,
                                bannedUntil: bannedUntil || null,
                                banReason: reason,
                                isActive: false
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.unbanUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.updateUser(userId, {
                                isBanned: false,
                                bannedUntil: null,
                                banReason: null,
                                isActive: true
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error deleting user:', error_6);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.adjustUserBalance = function (userId, amount, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, currentBalance, adjustment, newBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        currentBalance = parseFloat(user.balance);
                        adjustment = parseFloat(amount);
                        newBalance = (currentBalance + adjustment).toFixed(8);
                        // Log the admin action
                        return [4 /*yield*/, this.logAdminAction({
                                adminId: adminId,
                                action: 'balance_adjustment',
                                targetId: userId,
                                details: {
                                    previousBalance: user.balance,
                                    adjustment: amount,
                                    newBalance: newBalance
                                }
                            })];
                    case 2:
                        // Log the admin action
                        _a.sent();
                        return [4 /*yield*/, this.updateUser(userId, { balance: newBalance })];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Game methods
    DatabaseStorage.prototype.createGame = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var newGame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.games)
                            .values(game)
                            .returning()];
                    case 1:
                        newGame = (_a.sent())[0];
                        return [2 /*return*/, newGame];
                }
            });
        });
    };
    DatabaseStorage.prototype.getActiveGame = function (roundDuration) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.games)
                            .where((0, drizzle_orm_1.eq)(schema_1.games.status, "active"))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.games.createdAt))
                            .limit(1)];
                    case 1:
                        game = (_a.sent())[0];
                        return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateGameResult = function (gameId, result, resultColor, resultSize) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83D\uDD0D Updating game result for gameId: ".concat(gameId, ", result: ").concat(result));
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.games)
                                .set({
                                result: result,
                                resultColor: resultColor,
                                resultSize: resultSize,
                                status: "completed"
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.games.gameId, gameId))
                                .returning()];
                    case 1:
                        game = (_a.sent())[0];
                        if (!game) return [3 /*break*/, 4];
                        console.log("\u2705 Game ".concat(gameId, " database updated successfully - status: ").concat(game.status, ", result: ").concat(game.result));
                        if (!realtime_sync_service_1.realtimeSyncService.isEnabled()) return [3 /*break*/, 3];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncGame(game).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync game result:', err.message);
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        console.error("\u274C Failed to update game ".concat(gameId, " - No matching row found in database!"));
                        _a.label = 5;
                    case 5: return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.setManualGameResult = function (gameId, result, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.games)
                            .set({
                            manualResult: result,
                            isManuallyControlled: true
                            // ✅ Don't set: result, resultColor, resultSize, status
                            // ✅ Let endGame() handle those when timer ends
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.games.gameId, gameId))
                            .returning()];
                    case 1:
                        game = (_a.sent())[0];
                        if (!game) return [3 /*break*/, 3];
                        console.log("\uD83C\uDFAF Manual result ".concat(result, " scheduled for game ").concat(gameId, " - will apply when timer ends"));
                        return [4 /*yield*/, this.logAdminAction({
                                adminId: adminId,
                                action: 'manual_game_result_scheduled',
                                targetId: gameId,
                                details: { scheduledResult: result }
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getGameHistory = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.games)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.status, "completed"), (0, drizzle_orm_1.not)((0, drizzle_orm_1.like)(schema_1.games.gameId, 'crash_%'))))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.games.createdAt))
                            .limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getGameById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var isUUID, game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isUUID = id.includes('-');
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.games)
                                .where(isUUID ? (0, drizzle_orm_1.eq)(schema_1.games.id, id) : (0, drizzle_orm_1.eq)(schema_1.games.gameId, id))];
                    case 1:
                        game = (_a.sent())[0];
                        return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getGameByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.games)
                            .where((0, drizzle_orm_1.eq)(schema_1.games.gameId, gameId))];
                    case 1:
                        game = (_a.sent())[0];
                        return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateGameStats = function (gameId, stats) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.games)
                            .set(stats)
                            .where((0, drizzle_orm_1.eq)(schema_1.games.gameId, gameId))
                            .returning()];
                    case 1:
                        game = (_a.sent())[0];
                        return [2 /*return*/, game || undefined];
                }
            });
        });
    };
    // Bet methods
    DatabaseStorage.prototype.createBet = function (bet, maxBetLimit) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var result, existingTotal, newTotal, newBet;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (!(maxBetLimit !== undefined)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, tx
                                                .select({ total: (0, drizzle_orm_1.sum)(schema_1.bets.amount) })
                                                .from(schema_1.bets)
                                                .where((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["", " = ", " AND ", " = ", ""], ["", " = ", " AND ", " = ", ""])), schema_1.bets.userId, bet.userId, schema_1.bets.gameId, bet.gameId))];
                                    case 1:
                                        result = _b.sent();
                                        existingTotal = ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.total) ? parseFloat(result[0].total) : 0;
                                        newTotal = existingTotal + parseFloat(bet.amount);
                                        if (newTotal > maxBetLimit) {
                                            throw new Error("Your reached maximum bet limit for this period");
                                        }
                                        _b.label = 2;
                                    case 2: return [4 /*yield*/, tx
                                            .insert(schema_1.bets)
                                            .values(__assign(__assign({}, bet), { status: "pending" }))
                                            .returning()];
                                    case 3:
                                        newBet = (_b.sent())[0];
                                        if (!(newBet && realtime_sync_service_1.realtimeSyncService.isEnabled())) return [3 /*break*/, 5];
                                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncBet(newBet).catch(function (err) {
                                                return console.error('[RealtimeSync] Failed to sync bet:', err.message);
                                            })];
                                    case 4:
                                        _b.sent();
                                        _b.label = 5;
                                    case 5: return [2 /*return*/, newBet];
                                }
                            });
                        }); })];
                    case 1: 
                    // User validation is done in the route handler, so we can skip it here for performance
                    // Use transaction for atomic limit check and bet insertion
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.createBetAndUpdateBalance = function (bet, newBalance, maxBetLimit, newAccumulatedFee) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var result, existingTotal, newTotal, newBet, currentUser, currentRemaining, betAmount, newRemaining, currentTotalBets, newTotalBets, updateData, updatedUser;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (!(maxBetLimit !== undefined)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, tx
                                                .select({ total: (0, drizzle_orm_1.sum)(schema_1.bets.amount) })
                                                .from(schema_1.bets)
                                                .where((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["", " = ", " AND ", " = ", ""], ["", " = ", " AND ", " = ", ""])), schema_1.bets.userId, bet.userId, schema_1.bets.gameId, bet.gameId))];
                                    case 1:
                                        result = _b.sent();
                                        existingTotal = ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.total) ? parseFloat(result[0].total) : 0;
                                        newTotal = existingTotal + parseFloat(bet.amount);
                                        if (newTotal > maxBetLimit) {
                                            throw new Error("Your reached maximum bet limit for this period");
                                        }
                                        _b.label = 2;
                                    case 2: return [4 /*yield*/, tx
                                            .insert(schema_1.bets)
                                            .values(__assign(__assign({}, bet), { status: "pending" }))
                                            .returning()];
                                    case 3:
                                        newBet = (_b.sent())[0];
                                        return [4 /*yield*/, tx
                                                .select()
                                                .from(schema_1.users)
                                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, bet.userId))];
                                    case 4:
                                        currentUser = (_b.sent())[0];
                                        currentRemaining = parseFloat(currentUser.remainingRequiredBetAmount || '0');
                                        betAmount = parseFloat(bet.amount);
                                        newRemaining = Math.max(0, currentRemaining - betAmount).toFixed(8);
                                        currentTotalBets = parseFloat(currentUser.totalBetsAmount || '0');
                                        newTotalBets = (currentTotalBets + betAmount).toFixed(8);
                                        updateData = {
                                            balance: newBalance,
                                            remainingRequiredBetAmount: newRemaining,
                                            totalBetsAmount: newTotalBets,
                                            updatedAt: new Date()
                                        };
                                        // Only update accumulatedFee if provided
                                        if (newAccumulatedFee !== undefined) {
                                            updateData.accumulatedFee = newAccumulatedFee;
                                        }
                                        return [4 /*yield*/, tx
                                                .update(schema_1.users)
                                                .set(updateData)
                                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, bet.userId))
                                                .returning()];
                                    case 5:
                                        updatedUser = (_b.sent())[0];
                                        if (!realtime_sync_service_1.realtimeSyncService.isEnabled()) return [3 /*break*/, 7];
                                        return [4 /*yield*/, Promise.all([
                                                realtime_sync_service_1.realtimeSyncService.syncBet(newBet).catch(function (err) {
                                                    return console.error('[RealtimeSync] Failed to sync bet:', err.message);
                                                }),
                                                realtime_sync_service_1.realtimeSyncService.syncUser(bet.userId, updatedUser).catch(function (err) {
                                                    return console.error('[RealtimeSync] Failed to sync user balance:', err.message);
                                                })
                                            ]).catch(function () { })];
                                    case 6:
                                        _b.sent(); // Ignore sync errors in transaction
                                        _b.label = 7;
                                    case 7: return [2 /*return*/, newBet];
                                }
                            });
                        }); })];
                    case 1: 
                    // Combined transaction: limit check + bet creation + balance update in ONE database round trip
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getBetsByGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.gameId, gameId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserTotalBetAmountForGame = function (userId, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({ total: (0, drizzle_orm_1.sum)(schema_1.bets.amount) })
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["", " = ", " AND ", " = ", ""], ["", " = ", " AND ", " = ", ""])), schema_1.bets.userId, userId, schema_1.bets.gameId, gameId))];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.total) ? parseFloat(result[0].total) : 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateBetStatus = function (betId, status, actualPayout) {
        return __awaiter(this, void 0, void 0, function () {
            var existingBet, updateData, bet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.id, betId))
                            .limit(1)];
                    case 1:
                        existingBet = _a.sent();
                        if (existingBet.length > 0 && existingBet[0].status !== 'pending') {
                            console.log("\u26A0\uFE0F  Bet ".concat(betId, " already settled as ").concat(existingBet[0].status, ", skipping update to ").concat(status));
                            return [2 /*return*/, existingBet[0]];
                        }
                        updateData = {
                            status: status,
                            updatedAt: new Date()
                        };
                        if (actualPayout !== undefined) {
                            updateData.actualPayout = actualPayout;
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.bets)
                                .set(updateData)
                                .where((0, drizzle_orm_1.eq)(schema_1.bets.id, betId))
                                .returning()];
                    case 2:
                        bet = (_a.sent())[0];
                        return [2 /*return*/, bet || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getActiveBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({
                            id: schema_1.bets.id,
                            userId: schema_1.bets.userId,
                            gameId: schema_1.bets.gameId,
                            periodId: schema_1.games.gameId,
                            betType: schema_1.bets.betType,
                            betValue: schema_1.bets.betValue,
                            amount: schema_1.bets.amount,
                            potential: schema_1.bets.potential,
                            actualPayout: schema_1.bets.actualPayout,
                            status: schema_1.bets.status,
                            cashOutMultiplier: schema_1.bets.cashOutMultiplier,
                            autoCashOut: schema_1.bets.autoCashOut,
                            cashedOutAt: schema_1.bets.cashedOutAt,
                            createdAt: schema_1.bets.createdAt,
                        })
                            .from(schema_1.bets)
                            .leftJoin(schema_1.games, (0, drizzle_orm_1.eq)(schema_1.bets.gameId, schema_1.games.id))
                            .where((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["", " = ", " AND ", " = 'pending'"], ["", " = ", " AND ", " = 'pending'"])), schema_1.bets.userId, userId, schema_1.bets.status))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllPendingBets = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.status, 'pending'))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getStuckPendingBets = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var timestampMs, thresholdDate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        timestampMs = Date.now() - (minutesAgo * 60 * 1000);
                        thresholdDate = new Date(timestampMs);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.bets)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bets.status, 'pending'), (0, drizzle_orm_1.lt)(schema_1.bets.createdAt, thresholdDate)))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Referral methods
    DatabaseStorage.prototype.createReferral = function (referral) {
        return __awaiter(this, void 0, void 0, function () {
            var newReferral;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.referrals)
                            .values(referral)
                            .returning()];
                    case 1:
                        newReferral = (_a.sent())[0];
                        return [2 /*return*/, newReferral];
                }
            });
        });
    };
    DatabaseStorage.prototype.getReferralsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.referrals)
                            .where((0, drizzle_orm_1.eq)(schema_1.referrals.referrerId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.referrals.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateReferralCommission = function (referralId, commission) {
        return __awaiter(this, void 0, void 0, function () {
            var referral;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.referrals)
                            .set({ totalCommission: commission })
                            .where((0, drizzle_orm_1.eq)(schema_1.referrals.id, referralId))
                            .returning()];
                    case 1:
                        referral = (_a.sent())[0];
                        return [2 /*return*/, referral || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateReferralHasDeposited = function (referralId, hasDeposited) {
        return __awaiter(this, void 0, void 0, function () {
            var referral;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.referrals)
                            .set({ hasDeposited: hasDeposited })
                            .where((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["", " = ", " AND ", " = false"], ["", " = ", " AND ", " = false"])), schema_1.referrals.id, referralId, schema_1.referrals.hasDeposited))
                            .returning()];
                    case 1:
                        referral = (_a.sent())[0];
                        return [2 /*return*/, referral || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getReferralStats = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({
                            totalReferrals: (0, drizzle_orm_1.count)(),
                            totalCommission: (0, drizzle_orm_1.sum)(schema_1.referrals.totalCommission)
                        })
                            .from(schema_1.referrals)
                            .where((0, drizzle_orm_1.eq)(schema_1.referrals.referrerId, userId))];
                    case 1:
                        stats = (_a.sent())[0];
                        return [2 /*return*/, {
                                totalReferrals: (stats === null || stats === void 0 ? void 0 : stats.totalReferrals) || 0,
                                totalCommission: (stats === null || stats === void 0 ? void 0 : stats.totalCommission) || "0.00000000"
                            }];
                }
            });
        });
    };
    // Transaction methods
    DatabaseStorage.prototype.createTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var newTransaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.transactions)
                            .values(__assign(__assign({}, transaction), { agentId: transaction.agentId || null }))
                            .returning()];
                    case 1:
                        newTransaction = (_a.sent())[0];
                        if (!(newTransaction && realtime_sync_service_1.realtimeSyncService.isEnabled())) return [3 /*break*/, 3];
                        return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncTransaction(newTransaction).catch(function (err) {
                                return console.error('[RealtimeSync] Failed to sync transaction:', err.message);
                            })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, newTransaction];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTransactionsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.transactions)
                            .where((0, drizzle_orm_1.eq)(schema_1.transactions.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.transactions.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTransactionByExternalId = function (externalId) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.transactions)
                            .where((0, drizzle_orm_1.eq)(schema_1.transactions.externalId, externalId))
                            .limit(1)];
                    case 1:
                        transaction = (_a.sent())[0];
                        return [2 /*return*/, transaction || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTransactionById = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.transactions)
                            .where((0, drizzle_orm_1.eq)(schema_1.transactions.id, transactionId))
                            .limit(1)];
                    case 1:
                        transaction = (_a.sent())[0];
                        return [2 /*return*/, transaction || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTransactionStatus = function (transactionId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction, depositAmount, referral, referrer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.transactions)
                            .set({ status: status, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.transactions.id, transactionId))
                            .returning()];
                    case 1:
                        transaction = (_a.sent())[0];
                        if (!(transaction && status === "completed" && transaction.type === "deposit")) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.updateUserVipLevel(transaction.userId)];
                    case 2:
                        _a.sent();
                        depositAmount = parseFloat(transaction.fiatAmount || "0");
                        if (!(depositAmount >= 10)) return [3 /*break*/, 8];
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.referrals)
                                .where((0, drizzle_orm_1.eq)(schema_1.referrals.referredId, transaction.userId))
                                .limit(1)];
                    case 3:
                        referral = (_a.sent())[0];
                        if (!(referral && !referral.hasDeposited)) return [3 /*break*/, 8];
                        // Update referral hasDeposited flag
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.referrals)
                                .set({ hasDeposited: true })
                                .where((0, drizzle_orm_1.eq)(schema_1.referrals.id, referral.id))];
                    case 4:
                        // Update referral hasDeposited flag
                        _a.sent();
                        return [4 /*yield*/, this.getUser(referral.referrerId)];
                    case 5:
                        referrer = _a.sent();
                        if (!referrer) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.updateUser(referral.referrerId, {
                                teamSize: (referrer.teamSize || 0) + 1
                            })];
                    case 6:
                        _a.sent();
                        // Update referrer's VIP level based on new teamSize
                        return [4 /*yield*/, this.updateUserVipLevel(referral.referrerId)];
                    case 7:
                        // Update referrer's VIP level based on new teamSize
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/, transaction || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTransactionStatusConditional = function (transactionId, newStatus, currentStatus) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.transactions)
                            .set({ status: newStatus, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["", " = ", " AND ", " = ", ""], ["", " = ", " AND ", " = ", ""])), schema_1.transactions.id, transactionId, schema_1.transactions.status, currentStatus))
                            .returning()];
                    case 1:
                        transaction = (_a.sent())[0];
                        return [2 /*return*/, transaction || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPendingTransactions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.transactions)
                            .where((0, drizzle_orm_1.eq)(schema_1.transactions.status, "pending"))
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.transactions.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Deposit request methods
    DatabaseStorage.prototype.createDepositRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var newRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.depositRequests)
                            .values(request)
                            .returning()];
                    case 1:
                        newRequest = (_a.sent())[0];
                        return [2 /*return*/, newRequest];
                }
            });
        });
    };
    DatabaseStorage.prototype.getDepositRequestById = function (requestId) {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.depositRequests)
                            .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.id, requestId))
                            .limit(1)];
                    case 1:
                        request = (_a.sent())[0];
                        return [2 /*return*/, request || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getDepositRequestsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.depositRequests)
                            .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.depositRequests.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getDepositRequestsByAgent = function (agentId, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!status) return [3 /*break*/, 2];
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.depositRequests)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.depositRequests.agentId, agentId), (0, drizzle_orm_1.eq)(schema_1.depositRequests.status, status)))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.depositRequests.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.depositRequests)
                            .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.agentId, agentId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.depositRequests.createdAt))];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateDepositRequestStatus = function (requestId, status, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.depositRequests)
                            .set(__assign({ status: status, processedAt: new Date(), updatedAt: new Date() }, updates))
                            .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.id, requestId))
                            .returning()];
                    case 1:
                        request = (_a.sent())[0];
                        return [2 /*return*/, request || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.atomicApproveDepositRequest = function (requestId, agentId, agentNote) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db.transaction(function (trx) { return __awaiter(_this, void 0, void 0, function () {
                                var request, user, agent, agentProfile, amount, agentBalance, commissionRate, commission, newUserBalance, newTotalDeposits, newFrozenBalance, updatedUser, newAgentBalance, newEarningsBalance, transactionId, transaction, agentTransactionId, updatedRequest, createdActivity, activityError_1, referrerData, userReferral, updatedReferral, referrer, bonusSetting, referralReward, rewardAmount, bonusTransactionId, newCommission, newLifetime, referralCommission, oldTeamSize, newTeamSize, oldVipLevel, allVipLevels, referrerTotalDeposits, newVipLevel, referralError_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, trx
                                                .select()
                                                .from(schema_1.depositRequests)
                                                .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.id, requestId))
                                                .limit(1)];
                                        case 1:
                                            request = (_a.sent())[0];
                                            if (!request) {
                                                return [2 /*return*/, { success: false, error: 'Deposit request not found' }];
                                            }
                                            if (request.agentId !== agentId) {
                                                return [2 /*return*/, { success: false, error: 'Not your deposit request' }];
                                            }
                                            if (request.status !== 'pending') {
                                                return [2 /*return*/, { success: false, error: 'Request already processed' }];
                                            }
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.users)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, request.userId))
                                                    .limit(1)];
                                        case 2:
                                            user = (_a.sent())[0];
                                            if (!user) {
                                                return [2 /*return*/, { success: false, error: 'User not found' }];
                                            }
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.users)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))
                                                    .limit(1)];
                                        case 3:
                                            agent = (_a.sent())[0];
                                            if (!agent) {
                                                return [2 /*return*/, { success: false, error: 'Agent not found' }];
                                            }
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.agentProfiles)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))
                                                    .limit(1)];
                                        case 4:
                                            agentProfile = (_a.sent())[0];
                                            if (!agentProfile) {
                                                return [2 /*return*/, { success: false, error: 'Agent profile not found' }];
                                            }
                                            amount = parseFloat(request.amount);
                                            // Check if agent is depositing to themselves
                                            if (request.userId === agentId) {
                                                console.error('❌ Agent cannot approve their own deposit request');
                                                return [2 /*return*/, { success: false, error: 'Agent cannot approve their own deposit request. Please request deposit from a different agent.' }];
                                            }
                                            agentBalance = parseFloat(agent.balance);
                                            if (agentBalance < amount) {
                                                console.error("\u274C Insufficient agent balance. Required: $".concat(amount.toFixed(2), ", Available: $").concat(agentBalance.toFixed(2)));
                                                return [2 /*return*/, {
                                                        success: false,
                                                        error: "Insufficient balance. You need $".concat(amount.toFixed(2), " but only have $").concat(agentBalance.toFixed(2), ". Please deposit more funds to your agent account.")
                                                    }];
                                            }
                                            commissionRate = parseFloat(agentProfile.commissionRate);
                                            if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
                                                console.error("\u274C Invalid commission rate: ".concat(agentProfile.commissionRate));
                                                return [2 /*return*/, {
                                                        success: false,
                                                        error: 'Invalid agent commission rate. Please contact support.'
                                                    }];
                                            }
                                            commission = amount * commissionRate;
                                            newUserBalance = (parseFloat(user.balance) + amount).toFixed(8);
                                            newTotalDeposits = (parseFloat(user.totalDeposits) + amount).toFixed(8);
                                            newFrozenBalance = (parseFloat(user.frozenBalance || '0') + amount).toFixed(8);
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.users)
                                                    .set({
                                                    balance: newUserBalance,
                                                    totalDeposits: newTotalDeposits,
                                                    frozenBalance: newFrozenBalance,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, request.userId))
                                                    .returning()];
                                        case 5:
                                            updatedUser = (_a.sent())[0];
                                            newAgentBalance = (parseFloat(agent.balance) - amount).toFixed(8);
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.users)
                                                    .set({
                                                    balance: newAgentBalance,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))];
                                        case 6:
                                            _a.sent();
                                            newEarningsBalance = (parseFloat(agentProfile.earningsBalance) + commission).toFixed(8);
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.agentProfiles)
                                                    .set({
                                                    earningsBalance: newEarningsBalance,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))];
                                        case 7:
                                            _a.sent();
                                            transactionId = (0, crypto_1.randomUUID)();
                                            return [4 /*yield*/, trx
                                                    .insert(schema_1.transactions)
                                                    .values({
                                                    id: transactionId,
                                                    userId: request.userId,
                                                    agentId: agentId,
                                                    type: 'deposit',
                                                    fiatAmount: amount.toFixed(2),
                                                    fiatCurrency: 'USD',
                                                    status: 'completed',
                                                    paymentMethod: 'agent',
                                                    cryptoAmount: null,
                                                    cryptoCurrency: null,
                                                    externalId: null,
                                                    paymentAddress: null,
                                                    txHash: null,
                                                    fee: "0.00000000",
                                                    createdAt: new Date(),
                                                    updatedAt: new Date()
                                                })
                                                    .returning()];
                                        case 8:
                                            transaction = (_a.sent())[0];
                                            agentTransactionId = (0, crypto_1.randomUUID)();
                                            return [4 /*yield*/, trx
                                                    .insert(schema_1.transactions)
                                                    .values({
                                                    id: agentTransactionId,
                                                    userId: agentId,
                                                    agentId: null,
                                                    type: 'withdrawal',
                                                    fiatAmount: amount.toFixed(2),
                                                    fiatCurrency: 'USD',
                                                    status: 'completed',
                                                    paymentMethod: 'internal',
                                                    cryptoAmount: null,
                                                    cryptoCurrency: null,
                                                    externalId: request.userId,
                                                    paymentAddress: null,
                                                    txHash: null,
                                                    fee: "0.00000000",
                                                    createdAt: new Date(),
                                                    updatedAt: new Date()
                                                })];
                                        case 9:
                                            _a.sent();
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.depositRequests)
                                                    .set({
                                                    status: 'approved',
                                                    processedAt: new Date(),
                                                    updatedAt: new Date(),
                                                    agentNote: agentNote || null,
                                                    transactionId: transaction.id
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.depositRequests.id, requestId))
                                                    .returning()];
                                        case 10:
                                            updatedRequest = (_a.sent())[0];
                                            // Record agent activity with proper commission
                                            console.log('🔍 [AgentActivity] Creating activity for deposit approval:', {
                                                agentId: agentId,
                                                targetUserId: request.userId,
                                                amount: amount.toFixed(8),
                                                commission: commission.toFixed(8),
                                                transactionId: transaction.id
                                            });
                                            _a.label = 11;
                                        case 11:
                                            _a.trys.push([11, 13, , 14]);
                                            return [4 /*yield*/, trx
                                                    .insert(schema_1.agentActivities)
                                                    .values({
                                                    agentId: agentId,
                                                    action: 'deposit_approval',
                                                    targetUserId: request.userId,
                                                    amount: amount.toFixed(8),
                                                    commissionAmount: commission.toFixed(8),
                                                    transactionId: transaction.id,
                                                    createdAt: new Date()
                                                })
                                                    .returning()];
                                        case 12:
                                            createdActivity = (_a.sent())[0];
                                            console.log('✅ [AgentActivity] Activity created successfully:', {
                                                activityId: createdActivity.id,
                                                action: createdActivity.action,
                                                commission: commission.toFixed(8)
                                            });
                                            return [3 /*break*/, 14];
                                        case 13:
                                            activityError_1 = _a.sent();
                                            console.error('❌ [AgentActivity] Failed to create activity:', activityError_1);
                                            throw activityError_1; // Re-throw to rollback transaction
                                        case 14:
                                            if (!(updatedUser.referredBy && amount >= 10)) return [3 /*break*/, 31];
                                            _a.label = 15;
                                        case 15:
                                            _a.trys.push([15, 30, , 31]);
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.referrals)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.referrals.referrerId, updatedUser.referredBy), (0, drizzle_orm_1.eq)(schema_1.referrals.referredId, updatedUser.id)))
                                                    .limit(1)];
                                        case 16:
                                            userReferral = (_a.sent())[0];
                                            if (!(userReferral && !userReferral.hasDeposited)) return [3 /*break*/, 29];
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.referrals)
                                                    .set({
                                                    hasDeposited: true
                                                })
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.referrals.id, userReferral.id), (0, drizzle_orm_1.eq)(schema_1.referrals.hasDeposited, false) // Ensure it's still false (prevents race condition)
                                                ))
                                                    .returning()];
                                        case 17:
                                            updatedReferral = (_a.sent())[0];
                                            if (!updatedReferral) return [3 /*break*/, 28];
                                            console.log("\u2705 [AgentDeposit] First qualifying deposit ($".concat(amount, ") for referred user ").concat(updatedUser.id));
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.users)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, updatedUser.referredBy))
                                                    .limit(1)];
                                        case 18:
                                            referrer = (_a.sent())[0];
                                            if (!referrer) return [3 /*break*/, 27];
                                            return [4 /*yield*/, trx
                                                    .select()
                                                    .from(schema_1.systemSettings)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, 'referral_bonus_amount'))
                                                    .limit(1)];
                                        case 19:
                                            bonusSetting = (_a.sent())[0];
                                            referralReward = (bonusSetting === null || bonusSetting === void 0 ? void 0 : bonusSetting.value) || "2.99000000";
                                            rewardAmount = parseFloat(referralReward);
                                            bonusTransactionId = (0, crypto_1.randomUUID)();
                                            return [4 /*yield*/, trx
                                                    .insert(schema_1.transactions)
                                                    .values({
                                                    id: bonusTransactionId,
                                                    userId: referrer.id,
                                                    type: 'referral_bonus',
                                                    fiatAmount: rewardAmount.toFixed(2),
                                                    fiatCurrency: 'USD',
                                                    status: 'completed',
                                                    paymentMethod: 'internal',
                                                    fee: '0.00000000',
                                                    createdAt: new Date(),
                                                    updatedAt: new Date()
                                                })];
                                        case 20:
                                            _a.sent();
                                            newCommission = (parseFloat(referrer.totalCommission || '0') + rewardAmount).toFixed(8);
                                            newLifetime = (parseFloat(referrer.lifetimeCommissionEarned || '0') + rewardAmount).toFixed(8);
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.users)
                                                    .set({
                                                    totalCommission: newCommission,
                                                    lifetimeCommissionEarned: newLifetime,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, referrer.id))];
                                        case 21:
                                            _a.sent();
                                            referralCommission = (parseFloat(updatedReferral.totalCommission || '0') + rewardAmount).toFixed(8);
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.referrals)
                                                    .set({
                                                    totalCommission: referralCommission
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.referrals.id, updatedReferral.id))];
                                        case 22:
                                            _a.sent();
                                            console.log("\u2705 [AgentDeposit] Referral bonus awarded: $".concat(referralReward, " to referrer ").concat(referrer.id));
                                            oldTeamSize = referrer.teamSize || 0;
                                            newTeamSize = oldTeamSize + 1;
                                            oldVipLevel = referrer.vipLevel;
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.users)
                                                    .set({
                                                    teamSize: newTeamSize,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, referrer.id))];
                                        case 23:
                                            _a.sent();
                                            return [4 /*yield*/, vip_service_1.VipService.getVipLevelsFromStorage(this)];
                                        case 24:
                                            allVipLevels = _a.sent();
                                            referrerTotalDeposits = parseFloat(referrer.totalDeposits || '0');
                                            newVipLevel = vip_service_1.VipService.calculateVipLevelStatic(newTeamSize, allVipLevels, referrerTotalDeposits);
                                            if (!(newVipLevel !== oldVipLevel)) return [3 /*break*/, 26];
                                            return [4 /*yield*/, trx
                                                    .update(schema_1.users)
                                                    .set({
                                                    vipLevel: newVipLevel,
                                                    updatedAt: new Date()
                                                })
                                                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, referrer.id))];
                                        case 25:
                                            _a.sent();
                                            console.log("\u2705 [AgentDeposit] VIP level upgraded: ".concat(referrer.email, " from ").concat(oldVipLevel, " to ").concat(newVipLevel));
                                            _a.label = 26;
                                        case 26:
                                            // Store referrer data for email notifications (sent outside transaction)
                                            referrerData = {
                                                referrer: referrer,
                                                oldTeamSize: oldTeamSize,
                                                newTeamSize: newTeamSize,
                                                oldVipLevel: oldVipLevel,
                                                newVipLevel: newVipLevel
                                            };
                                            _a.label = 27;
                                        case 27: return [3 /*break*/, 29];
                                        case 28:
                                            console.log("\u26A0\uFE0F [AgentDeposit] Referral already marked as deposited, skipping duplicate award");
                                            _a.label = 29;
                                        case 29: return [3 /*break*/, 31];
                                        case 30:
                                            referralError_1 = _a.sent();
                                            console.error("\u274C [AgentDeposit] Error processing referral for user ".concat(updatedUser.id, ":"), referralError_1);
                                            return [3 /*break*/, 31];
                                        case 31:
                                            if (!realtime_sync_service_1.realtimeSyncService.isEnabled()) return [3 /*break*/, 34];
                                            return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncUser(request.userId, updatedUser).catch(function (err) {
                                                    return console.error('[RealtimeSync] Failed to sync user in deposit approval:', err.message);
                                                })];
                                        case 32:
                                            _a.sent();
                                            return [4 /*yield*/, realtime_sync_service_1.realtimeSyncService.syncTransaction(transaction).catch(function (err) {
                                                    return console.error('[RealtimeSync] Failed to sync transaction in deposit approval:', err.message);
                                                })];
                                        case 33:
                                            _a.sent();
                                            _a.label = 34;
                                        case 34: return [2 /*return*/, {
                                                success: true,
                                                request: updatedRequest,
                                                transaction: transaction,
                                                user: updatedUser,
                                                referrerData: referrerData // Return referrer data for email notifications
                                            }];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Atomic deposit approval error:', error_7);
                        return [2 /*return*/, { success: false, error: error_7.message || 'Failed to approve deposit request' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Coin flip game methods
    DatabaseStorage.prototype.createCoinFlipGame = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var newGame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.coinFlipGames)
                            .values(game)
                            .returning()];
                    case 1:
                        newGame = (_a.sent())[0];
                        return [2 /*return*/, newGame];
                }
            });
        });
    };
    DatabaseStorage.prototype.getCoinFlipGamesByUser = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.coinFlipGames)
                            .where((0, drizzle_orm_1.eq)(schema_1.coinFlipGames.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.coinFlipGames.createdAt))
                            .limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Data staleness monitoring methods
    DatabaseStorage.prototype.getUsersWithRecentActivity = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime, userIdsWithActivity, userIds, activeUsers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .selectDistinct({ userId: schema_1.transactions.userId })
                                .from(schema_1.transactions)
                                .where((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["", " >= ", ""], ["", " >= ", ""])), schema_1.transactions.createdAt, cutoffTime))];
                    case 1:
                        userIdsWithActivity = _a.sent();
                        if (userIdsWithActivity.length === 0) {
                            return [2 /*return*/, []];
                        }
                        userIds = userIdsWithActivity.map(function (u) { return u.userId; });
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.users)
                                .where((0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["", " IN (", ")"], ["", " IN (", ")"])), schema_1.users.id, drizzle_orm_1.sql.join(userIds.map(function (id) { return (0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["", ""], ["", ""])), id); }), (0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject([", "], [", "]))))))];
                    case 2:
                        activeUsers = _a.sent();
                        return [2 /*return*/, activeUsers];
                }
            });
        });
    };
    DatabaseStorage.prototype.getRecentDeposits = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.transactions)
                                .where((0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["", " = 'deposit' AND ", " >= ", ""], ["", " = 'deposit' AND ", " >= ", ""])), schema_1.transactions.type, schema_1.transactions.createdAt, cutoffTime))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.transactions.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getRecentWithdrawals = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.transactions)
                                .where((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["", " = 'withdrawal' AND ", " >= ", ""], ["", " = 'withdrawal' AND ", " >= ", ""])), schema_1.transactions.type, schema_1.transactions.createdAt, cutoffTime))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.transactions.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getRecentTransactions = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.transactions)
                                .where((0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["", " >= ", ""], ["", " >= ", ""])), schema_1.transactions.createdAt, cutoffTime))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.transactions.createdAt))
                                .limit(100)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Crash Settings methods
    DatabaseStorage.prototype.getCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.crashSettings).limit(1)];
                    case 1:
                        settings = (_a.sent())[0];
                        return [2 /*return*/, settings || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateCrashSettings = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, id, newSettings;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.crashSettings).limit(1)];
                    case 1:
                        existing = (_f.sent())[0];
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.crashSettings)
                                .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                                .where((0, drizzle_orm_1.eq)(schema_1.crashSettings.id, existing.id))
                                .returning()];
                    case 2:
                        updated = (_f.sent())[0];
                        return [2 /*return*/, updated];
                    case 3:
                        id = (0, crypto_1.randomUUID)();
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.crashSettings)
                                .values({
                                id: id,
                                houseEdge: (_a = updates.houseEdge) !== null && _a !== void 0 ? _a : "20.00",
                                maxMultiplier: (_b = updates.maxMultiplier) !== null && _b !== void 0 ? _b : "50.00",
                                minCrashMultiplier: (_c = updates.minCrashMultiplier) !== null && _c !== void 0 ? _c : "1.01",
                                crashEnabled: (_d = updates.crashEnabled) !== null && _d !== void 0 ? _d : true,
                                updatedBy: (_e = updates.updatedBy) !== null && _e !== void 0 ? _e : 'system',
                                createdAt: new Date(),
                                updatedAt: new Date()
                            })
                                .returning()];
                    case 4:
                        newSettings = (_f.sent())[0];
                        return [2 /*return*/, newSettings];
                }
            });
        });
    };
    // Admin action methods
    DatabaseStorage.prototype.logAdminAction = function (action) {
        return __awaiter(this, void 0, void 0, function () {
            var newAction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.adminActions)
                            .values(action)
                            .returning()];
                    case 1:
                        newAction = (_a.sent())[0];
                        return [2 /*return*/, newAction];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAdminActions = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, totalResult, total, actionList;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.adminActions)];
                    case 1:
                        totalResult = (_a.sent())[0];
                        total = (totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0;
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.adminActions)
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.adminActions.createdAt))
                                .limit(limit)
                                .offset(offset)];
                    case 2:
                        actionList = _a.sent();
                        return [2 /*return*/, { actions: actionList, total: total }];
                }
            });
        });
    };
    // Analytics methods
    DatabaseStorage.prototype.createGameAnalytics = function (analytics) {
        return __awaiter(this, void 0, void 0, function () {
            var newAnalytics;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.gameAnalytics)
                            .values(analytics)
                            .returning()];
                    case 1:
                        newAnalytics = (_a.sent())[0];
                        return [2 /*return*/, newAnalytics];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateGameAnalytics = function (gameId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var analytics;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.gameAnalytics)
                            .set(updates)
                            .where((0, drizzle_orm_1.eq)(schema_1.gameAnalytics.gameId, gameId))
                            .returning()];
                    case 1:
                        analytics = (_a.sent())[0];
                        return [2 /*return*/, analytics || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAnalyticsByGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var analytics;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.gameAnalytics)
                            .where((0, drizzle_orm_1.eq)(schema_1.gameAnalytics.gameId, gameId))];
                    case 1:
                        analytics = (_a.sent())[0];
                        return [2 /*return*/, analytics || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getOverallAnalytics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var gameStats, betStats, totalGames, totalBets, totalVolume, totalProfit, averageBetSize;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({
                            totalGames: (0, drizzle_orm_1.count)(),
                            totalProfit: (0, drizzle_orm_1.sum)(schema_1.games.houseProfit)
                        })
                            .from(schema_1.games)];
                    case 1:
                        gameStats = (_a.sent())[0];
                        return [4 /*yield*/, db_1.db
                                .select({
                                totalBets: (0, drizzle_orm_1.count)(),
                                totalVolume: (0, drizzle_orm_1.sum)(schema_1.bets.amount)
                            })
                                .from(schema_1.bets)];
                    case 2:
                        betStats = (_a.sent())[0];
                        totalGames = (gameStats === null || gameStats === void 0 ? void 0 : gameStats.totalGames) || 0;
                        totalBets = (betStats === null || betStats === void 0 ? void 0 : betStats.totalBets) || 0;
                        totalVolume = (betStats === null || betStats === void 0 ? void 0 : betStats.totalVolume) || "0.00000000";
                        totalProfit = (gameStats === null || gameStats === void 0 ? void 0 : gameStats.totalProfit) || "0.00000000";
                        averageBetSize = totalBets > 0
                            ? (parseFloat(totalVolume) / totalBets).toFixed(8)
                            : "0.00000000";
                        return [2 /*return*/, {
                                totalGames: totalGames,
                                totalBets: totalBets,
                                totalVolume: totalVolume,
                                totalProfit: totalProfit,
                                averageBetSize: averageBetSize
                            }];
                }
            });
        });
    };
    // User session methods
    DatabaseStorage.prototype.createUserSession = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var newSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.userSessions)
                            .values(session)
                            .returning()];
                    case 1:
                        newSession = (_a.sent())[0];
                        return [2 /*return*/, newSession];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.userSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.userSessions.loginTime))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateSessionStatus = function (sessionId, isActive) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.userSessions)
                            .set({
                            isActive: isActive,
                            logoutTime: isActive ? null : new Date()
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.id, sessionId))
                            .returning()];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session || undefined];
                }
            });
        });
    };
    // Device login tracking methods
    DatabaseStorage.prototype.createDeviceLogin = function (deviceLogin) {
        return __awaiter(this, void 0, void 0, function () {
            var newDeviceLogin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.deviceLogins)
                            .values(deviceLogin)
                            .returning()];
                    case 1:
                        newDeviceLogin = (_a.sent())[0];
                        return [2 /*return*/, newDeviceLogin];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserDeviceLogins = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.deviceLogins)
                            .where((0, drizzle_orm_1.eq)(schema_1.deviceLogins.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.deviceLogins.loginAt))
                            .limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.clearUserSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.userSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.userId, userId))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.clearDeviceLogins = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.deviceLogins)
                            .where((0, drizzle_orm_1.eq)(schema_1.deviceLogins.userId, userId))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    // Page view tracking methods
    DatabaseStorage.prototype.createPageView = function (pageView) {
        return __awaiter(this, void 0, void 0, function () {
            var newPageView;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.pageViews)
                            .values(pageView)
                            .returning()];
                    case 1:
                        newPageView = (_a.sent())[0];
                        return [2 /*return*/, newPageView];
                }
            });
        });
    };
    DatabaseStorage.prototype.getDailyVisitors = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate, startOfDay, endOfDay, result;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        targetDate = date || new Date();
                        startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                        endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, db_1.db
                                .select({
                                totalPageViews: (0, drizzle_orm_1.count)(),
                                uniqueVisitors: (0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["COUNT(DISTINCT ", ")"], ["COUNT(DISTINCT ", ")"])), schema_1.pageViews.ipAddress),
                            })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startOfDay, schema_1.pageViews.createdAt, endOfDay))];
                    case 1:
                        result = _c.sent();
                        return [2 /*return*/, {
                                uniqueVisitors: Number(((_a = result[0]) === null || _a === void 0 ? void 0 : _a.uniqueVisitors) || 0),
                                totalPageViews: Number(((_b = result[0]) === null || _b === void 0 ? void 0 : _b.totalPageViews) || 0),
                            }];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTrafficStats = function (startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var totalPageViews, uniqueVisitors, topPages, deviceBreakdown, countryBreakdown, dailyStats;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({ count: (0, drizzle_orm_1.count)() })
                            .from(schema_1.pageViews)
                            .where((0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))];
                    case 1:
                        totalPageViews = _c.sent();
                        return [4 /*yield*/, db_1.db
                                .select({ count: (0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["COUNT(DISTINCT ", ")"], ["COUNT(DISTINCT ", ")"])), schema_1.pageViews.ipAddress) })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))];
                    case 2:
                        uniqueVisitors = _c.sent();
                        return [4 /*yield*/, db_1.db
                                .select({
                                path: schema_1.pageViews.path,
                                views: (0, drizzle_orm_1.count)(),
                            })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))
                                .groupBy(schema_1.pageViews.path)
                                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.count)()))
                                .limit(10)];
                    case 3:
                        topPages = _c.sent();
                        return [4 /*yield*/, db_1.db
                                .select({
                                deviceType: schema_1.pageViews.deviceType,
                                count: (0, drizzle_orm_1.count)(),
                            })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))
                                .groupBy(schema_1.pageViews.deviceType)];
                    case 4:
                        deviceBreakdown = _c.sent();
                        return [4 /*yield*/, db_1.db
                                .select({
                                country: schema_1.pageViews.country,
                                count: (0, drizzle_orm_1.count)(),
                            })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))
                                .groupBy(schema_1.pageViews.country)
                                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.count)()))
                                .limit(20)];
                    case 5:
                        countryBreakdown = _c.sent();
                        return [4 /*yield*/, db_1.db
                                .select({
                                date: (0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["DATE(", ")"], ["DATE(", ")"])), schema_1.pageViews.createdAt),
                                pageViews: (0, drizzle_orm_1.count)(),
                                uniqueVisitors: (0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["COUNT(DISTINCT ", ")"], ["COUNT(DISTINCT ", ")"])), schema_1.pageViews.ipAddress),
                            })
                                .from(schema_1.pageViews)
                                .where((0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["", " >= ", " AND ", " < ", ""], ["", " >= ", " AND ", " < ", ""])), schema_1.pageViews.createdAt, startDate, schema_1.pageViews.createdAt, endDate))
                                .groupBy((0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["DATE(", ")"], ["DATE(", ")"])), schema_1.pageViews.createdAt))
                                .orderBy((0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["DATE(", ")"], ["DATE(", ")"])), schema_1.pageViews.createdAt))];
                    case 6:
                        dailyStats = _c.sent();
                        return [2 /*return*/, {
                                totalPageViews: Number(((_a = totalPageViews[0]) === null || _a === void 0 ? void 0 : _a.count) || 0),
                                uniqueVisitors: Number(((_b = uniqueVisitors[0]) === null || _b === void 0 ? void 0 : _b.count) || 0),
                                topPages: topPages.map(function (p) { return ({ path: p.path, views: Number(p.views) }); }),
                                deviceBreakdown: deviceBreakdown.map(function (d) { return ({
                                    deviceType: d.deviceType || 'Unknown',
                                    count: Number(d.count)
                                }); }),
                                countryBreakdown: countryBreakdown.map(function (c) { return ({
                                    country: c.country || 'Unknown',
                                    count: Number(c.count)
                                }); }),
                                dailyStats: dailyStats.map(function (s) { return ({
                                    date: s.date,
                                    pageViews: Number(s.pageViews),
                                    uniqueVisitors: Number(s.uniqueVisitors),
                                }); }),
                            }];
                }
            });
        });
    };
    // 2FA methods
    DatabaseStorage.prototype.startPending2FASetup = function (userId, secret) {
        return __awaiter(this, void 0, void 0, function () {
            var expiresAt;
            return __generator(this, function (_a) {
                // Clear any existing pending setup for this user
                this.clearPending2FASetup(userId);
                expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                pending2FASetups.set(userId, { secret: secret, expiresAt: expiresAt });
                return [2 /*return*/, true];
            });
        });
    };
    DatabaseStorage.prototype.getPending2FASecret = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var pending;
            return __generator(this, function (_a) {
                pending = pending2FASetups.get(userId);
                if (!pending || pending.expiresAt < new Date()) {
                    pending2FASetups.delete(userId);
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, pending.secret];
            });
        });
    };
    DatabaseStorage.prototype.completePending2FASetup = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var secret, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPending2FASecret(userId)];
                    case 1:
                        secret = _a.sent();
                        if (!secret) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                twoFactorSecret: secret,
                                twoFactorEnabled: true,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                                .returning()];
                    case 2:
                        user = (_a.sent())[0];
                        // Clear pending setup
                        this.clearPending2FASetup(userId);
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.clearPending2FASetup = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                pending2FASetups.delete(userId);
                return [2 /*return*/];
            });
        });
    };
    DatabaseStorage.prototype.enable2FA = function (userId, secret) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.users)
                            .set({
                            twoFactorSecret: secret,
                            twoFactorEnabled: true,
                            updatedAt: new Date()
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.disable2FA = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.users)
                            .set({
                            twoFactorEnabled: false,
                            twoFactorSecret: null,
                            updatedAt: new Date()
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                            .returning()];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.validate2FAToken = function (userId, token) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
                            return [2 /*return*/, false];
                        }
                        try {
                            return [2 /*return*/, otplib_1.authenticator.verify({
                                    token: token,
                                    secret: user.twoFactorSecret
                                })];
                        }
                        catch (error) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // Passkey methods
    DatabaseStorage.prototype.createPasskey = function (passkey) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.passkeys)
                            .values({
                            userId: passkey.userId,
                            credentialId: passkey.credentialId,
                            publicKey: passkey.publicKey,
                            counter: (_a = passkey.counter) !== null && _a !== void 0 ? _a : 0,
                            deviceName: passkey.deviceName,
                            rpId: passkey.rpId,
                            origin: passkey.origin,
                            isActive: (_b = passkey.isActive) !== null && _b !== void 0 ? _b : true,
                            isDomainMismatch: (_c = passkey.isDomainMismatch) !== null && _c !== void 0 ? _c : false
                        })
                            .returning()];
                    case 1:
                        created = (_d.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserPasskeys = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.passkeys)
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.passkeys.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllActivePasskeys = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.passkeys)
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.isActive, true))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPasskeyByCredentialId = function (credentialId) {
        return __awaiter(this, void 0, void 0, function () {
            var passkey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.passkeys)
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.credentialId, credentialId))
                            .limit(1)];
                    case 1:
                        passkey = (_a.sent())[0];
                        return [2 /*return*/, passkey || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updatePasskey = function (passkeyId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.passkeys)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.id, passkeyId))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.deletePasskey = function (passkeyId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.passkeys)
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.id, passkeyId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.updatePasskeyCounter = function (credentialId, counter) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.passkeys)
                            .set({
                            counter: counter,
                            lastUsedAt: new Date(),
                            updatedAt: new Date()
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.passkeys.credentialId, credentialId))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated || undefined];
                }
            });
        });
    };
    // System settings methods
    DatabaseStorage.prototype.getSystemSetting = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var setting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.systemSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, key))
                            .limit(1)];
                    case 1:
                        setting = (_a.sent())[0];
                        return [2 /*return*/, setting || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllSystemSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.systemSettings)
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.systemSettings.key))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.upsertSystemSetting = function (setting, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSystemSetting(setting.key)];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.systemSettings)
                                .set({
                                value: setting.value,
                                description: setting.description,
                                isEncrypted: setting.isEncrypted || false,
                                lastUpdatedBy: adminId,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, setting.key))
                                .returning()];
                    case 2:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                    case 3: return [4 /*yield*/, db_1.db
                            .insert(schema_1.systemSettings)
                            .values({
                            key: setting.key,
                            value: setting.value,
                            description: setting.description,
                            isEncrypted: setting.isEncrypted || false,
                            lastUpdatedBy: adminId
                        })
                            .returning()];
                    case 4:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteSystemSetting = function (key, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        // Log admin action before deletion
                        return [4 /*yield*/, this.logAdminAction({
                                adminId: adminId,
                                action: 'delete_system_setting',
                                targetId: key,
                                details: { settingKey: key }
                            })];
                    case 1:
                        // Log admin action before deletion
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .delete(schema_1.systemSettings)
                                .where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, key))
                                .returning()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                    case 3:
                        error_8 = _a.sent();
                        console.error('Error deleting system setting:', error_8);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // VIP level methods
    DatabaseStorage.prototype.updateUserVipLevel = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, teamSize, totalDeposits, vipLevels, newVipLevel, newMaxBetLimit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        teamSize = user.teamSize || 0;
                        totalDeposits = parseFloat(user.totalDeposits) || 0;
                        return [4 /*yield*/, vip_service_1.VipService.getVipLevelsFromStorage(this)];
                    case 2:
                        vipLevels = _a.sent();
                        newVipLevel = vip_service_1.VipService.calculateVipLevelStatic(teamSize, vipLevels, totalDeposits);
                        newMaxBetLimit = parseFloat(vip_service_1.VipService.getMaxBetLimitStatic(newVipLevel, vipLevels).toString()).toFixed(8);
                        if (!(user.vipLevel !== newVipLevel || user.maxBetLimit !== newMaxBetLimit)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.updateUser(userId, {
                                vipLevel: newVipLevel,
                                maxBetLimit: newMaxBetLimit
                            })];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4: return [2 /*return*/, user];
                }
            });
        });
    };
    // Agent management methods
    DatabaseStorage.prototype.createAgent = function (email_1, password_1) {
        return __awaiter(this, arguments, void 0, function (email, password, commissionRate) {
            var existingUser, passwordHash, referralCode, publicId, user, agentProfile, error_9;
            if (commissionRate === void 0) { commissionRate = "0.0500"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.getUserByEmail(email)];
                    case 1:
                        existingUser = _a.sent();
                        if (existingUser) {
                            throw new Error("Email already registered");
                        }
                        return [4 /*yield*/, bcrypt.hash(password, 10)];
                    case 2:
                        passwordHash = _a.sent();
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.users)
                                .values({
                                email: email,
                                publicId: publicId,
                                passwordHash: passwordHash,
                                referralCode: referralCode,
                                role: "agent",
                                balance: "0.00000000",
                                vipLevel: "lv1",
                                isActive: true,
                                maxBetLimit: "10.00000000",
                                totalDeposits: "0.00000000",
                                totalWithdrawals: "0.00000000",
                                totalWinnings: "0.00000000",
                                totalLosses: "0.00000000",
                                lastWithdrawalRequestAt: null
                            })
                                .returning()];
                    case 3:
                        user = (_a.sent())[0];
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.agentProfiles)
                                .values({
                                userId: user.id,
                                commissionRate: commissionRate,
                                earningsBalance: "0.00000000",
                                isActive: true
                            })
                                .returning()];
                    case 4:
                        agentProfile = (_a.sent())[0];
                        return [2 /*return*/, { user: user, agentProfile: agentProfile }];
                    case 5:
                        error_9 = _a.sent();
                        // Only log non-duplicate errors
                        if (error_9 instanceof Error && !error_9.message.includes('already registered')) {
                            console.error('Error creating agent:', error_9);
                        }
                        throw error_9;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAgentProfile = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.agentProfiles)
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, userId))
                                .limit(1)];
                    case 1:
                        agentProfile = (_a.sent())[0];
                        return [2 /*return*/, agentProfile || undefined];
                    case 2:
                        error_10 = _a.sent();
                        console.error('Error getting agent profile:', error_10);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllAgents = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, agentResults, count_1, agents, error_11;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, db_1.db
                                .select({
                                user: schema_1.users,
                                agentProfile: schema_1.agentProfiles
                            })
                                .from(schema_1.users)
                                .innerJoin(schema_1.agentProfiles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.agentProfiles.userId))
                                .where((0, drizzle_orm_1.eq)(schema_1.users.role, "agent"))
                                .limit(limit)
                                .offset(offset)];
                    case 1:
                        agentResults = _a.sent();
                        return [4 /*yield*/, db_1.db
                                .select({ count: (0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["cast(count(*) as integer)"], ["cast(count(*) as integer)"]))) })
                                .from(schema_1.users)
                                .innerJoin(schema_1.agentProfiles, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.agentProfiles.userId))
                                .where((0, drizzle_orm_1.eq)(schema_1.users.role, "agent"))];
                    case 2:
                        count_1 = (_a.sent())[0].count;
                        agents = agentResults.map(function (result) { return (__assign(__assign({}, result.user), { agentProfile: result.agentProfile })); });
                        return [2 /*return*/, { agents: agents, total: count_1 }];
                    case 3:
                        error_11 = _a.sent();
                        console.error('Error getting all agents:', error_11);
                        return [2 /*return*/, { agents: [], total: 0 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateAgentCommission = function (agentId, commissionRate) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedProfile, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                commissionRate: commissionRate,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))
                                .returning()];
                    case 1:
                        updatedProfile = (_a.sent())[0];
                        return [2 /*return*/, updatedProfile || undefined];
                    case 2:
                        error_12 = _a.sent();
                        console.error('Error updating agent commission:', error_12);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.toggleAgentStatus = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var currentProfile, updatedProfile, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        currentProfile = _a.sent();
                        if (!currentProfile) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                isActive: !currentProfile.isActive,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))
                                .returning()];
                    case 2:
                        updatedProfile = (_a.sent())[0];
                        // Also update user status if needed
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                isActive: !currentProfile.isActive,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))];
                    case 3:
                        // Also update user status if needed
                        _a.sent();
                        return [2 /*return*/, updatedProfile || undefined];
                    case 4:
                        error_13 = _a.sent();
                        console.error('Error toggling agent status:', error_13);
                        return [2 /*return*/, undefined];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.promoteUserToAgent = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, commissionRate) {
            var user, updatedUser, agentProfile, error_14;
            if (commissionRate === void 0) { commissionRate = "0.0500"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error("User not found");
                        }
                        // Check if user is already an agent
                        if (user.role === 'agent') {
                            throw new Error("User is already an agent");
                        }
                        // Check if user role is 'user' (can't promote admins)
                        if (user.role !== 'user') {
                            throw new Error("Only regular users can be promoted to agents");
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                role: "agent",
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                                .returning()];
                    case 2:
                        updatedUser = (_a.sent())[0];
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.agentProfiles)
                                .values({
                                userId: userId,
                                commissionRate: commissionRate,
                                earningsBalance: "0.00000000",
                                isActive: true
                            })
                                .returning()];
                    case 3:
                        agentProfile = (_a.sent())[0];
                        return [2 /*return*/, { user: updatedUser, agentProfile: agentProfile }];
                    case 4:
                        error_14 = _a.sent();
                        console.error('Error promoting user to agent:', error_14);
                        throw error_14;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByPublicIdOrEmail = function (identifier) {
        return __awaiter(this, void 0, void 0, function () {
            var isEmail, user, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        isEmail = identifier.includes('@');
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.users)
                                .where(isEmail
                                ? (0, drizzle_orm_1.eq)(schema_1.users.email, identifier)
                                : (0, drizzle_orm_1.eq)(schema_1.users.publicId, identifier))
                                .limit(1)];
                    case 1:
                        user = (_a.sent())[0];
                        return [2 /*return*/, user || undefined];
                    case 2:
                        error_15 = _a.sent();
                        console.error('Error getting user by identifier:', error_15);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.processAgentDeposit = function (agentId, userIdentifier, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var targetUser_1, agentProfile, agentUser, depositAmount, formattedAmount, commissionAmount, transaction, newBalance, newTotalDeposits, newFrozenBalance, newEarnings, newAgentBalance, activity, referrals_1, userReferral, updatedReferral, referrer, referralBonusSetting, referralReward, newCommission, newLifetime, referralCommission, newTeamSize, error_16, error_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 24, , 25]);
                        return [4 /*yield*/, this.getUserByPublicIdOrEmail(userIdentifier)];
                    case 1:
                        targetUser_1 = _a.sent();
                        if (!targetUser_1) {
                            throw new Error("User not found");
                        }
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 2:
                        agentProfile = _a.sent();
                        if (!agentProfile || !agentProfile.isActive) {
                            throw new Error("Agent not found or inactive");
                        }
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 3:
                        agentUser = _a.sent();
                        if (!agentUser) {
                            throw new Error("Agent user not found");
                        }
                        depositAmount = parseFloat(amount);
                        if (depositAmount <= 0 || !isFinite(depositAmount) || isNaN(depositAmount)) {
                            throw new Error("Invalid deposit amount");
                        }
                        formattedAmount = depositAmount.toFixed(8);
                        // Check if agent has sufficient balance
                        if (parseFloat(agentUser.balance) < depositAmount) {
                            throw new Error("Insufficient agent balance for this deposit");
                        }
                        commissionAmount = (depositAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.transactions)
                                .values({
                                userId: targetUser_1.id,
                                agentId: agentId,
                                type: "deposit",
                                fiatAmount: formattedAmount,
                                fiatCurrency: "USD",
                                status: "completed",
                                paymentMethod: "agent",
                                fee: "0.00000000"
                            })
                                .returning()];
                    case 4:
                        transaction = (_a.sent())[0];
                        newBalance = (parseFloat(targetUser_1.balance) + depositAmount).toFixed(8);
                        newTotalDeposits = (parseFloat(targetUser_1.totalDeposits) + depositAmount).toFixed(8);
                        newFrozenBalance = (parseFloat(targetUser_1.frozenBalance || '0') + depositAmount).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: newBalance,
                                totalDeposits: newTotalDeposits,
                                frozenBalance: newFrozenBalance,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, targetUser_1.id))];
                    case 5:
                        _a.sent();
                        newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                earningsBalance: newEarnings,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))];
                    case 6:
                        _a.sent();
                        newAgentBalance = (parseFloat(agentUser.balance) - depositAmount).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: newAgentBalance,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))];
                    case 7:
                        _a.sent();
                        // Create a transaction record for the agent showing this payout
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.transactions)
                                .values({
                                userId: agentId,
                                type: "withdrawal",
                                fiatAmount: formattedAmount,
                                fiatCurrency: "USD",
                                status: "completed",
                                paymentMethod: "agent",
                                fee: "0.00000000"
                            })];
                    case 8:
                        // Create a transaction record for the agent showing this payout
                        _a.sent();
                        return [4 /*yield*/, this.createAgentActivity({
                                agentId: agentId,
                                action: "deposit",
                                targetUserId: targetUser_1.id,
                                amount: formattedAmount,
                                commissionAmount: commissionAmount,
                                transactionId: transaction.id
                            })];
                    case 9:
                        activity = _a.sent();
                        // Update user VIP level
                        return [4 /*yield*/, this.updateUserVipLevel(targetUser_1.id)];
                    case 10:
                        // Update user VIP level
                        _a.sent();
                        if (!(targetUser_1.referredBy && depositAmount >= 10)) return [3 /*break*/, 23];
                        _a.label = 11;
                    case 11:
                        _a.trys.push([11, 22, , 23]);
                        return [4 /*yield*/, this.getReferralsByUser(targetUser_1.referredBy)];
                    case 12:
                        referrals_1 = _a.sent();
                        userReferral = referrals_1.find(function (r) { return r.referredId === targetUser_1.id; });
                        if (!(userReferral && !userReferral.hasDeposited)) return [3 /*break*/, 21];
                        return [4 /*yield*/, this.updateReferralHasDeposited(userReferral.id, true)];
                    case 13:
                        updatedReferral = _a.sent();
                        if (!updatedReferral) return [3 /*break*/, 21];
                        return [4 /*yield*/, this.getUser(targetUser_1.referredBy)];
                    case 14:
                        referrer = _a.sent();
                        if (!referrer) return [3 /*break*/, 21];
                        return [4 /*yield*/, this.getSystemSetting('referral_bonus_amount')];
                    case 15:
                        referralBonusSetting = _a.sent();
                        referralReward = (referralBonusSetting === null || referralBonusSetting === void 0 ? void 0 : referralBonusSetting.value) || "2.99000000";
                        // Award to referrer only (the person who referred)
                        return [4 /*yield*/, this.createTransaction({
                                userId: referrer.id,
                                type: "referral_bonus",
                                fiatAmount: referralReward,
                                fiatCurrency: "USD",
                                status: "completed",
                                paymentMethod: "internal",
                                fee: "0.00000000"
                            })];
                    case 16:
                        // Award to referrer only (the person who referred)
                        _a.sent();
                        newCommission = (parseFloat(referrer.totalCommission || '0') + parseFloat(referralReward)).toFixed(8);
                        newLifetime = (parseFloat(referrer.lifetimeCommissionEarned || '0') + parseFloat(referralReward)).toFixed(8);
                        return [4 /*yield*/, this.updateUser(referrer.id, {
                                totalCommission: newCommission,
                                lifetimeCommissionEarned: newLifetime
                            })];
                    case 17:
                        _a.sent();
                        referralCommission = (parseFloat(updatedReferral.totalCommission || '0') + parseFloat(referralReward)).toFixed(8);
                        return [4 /*yield*/, this.updateReferralCommission(updatedReferral.id, referralCommission)];
                    case 18:
                        _a.sent();
                        newTeamSize = (referrer.teamSize || 0) + 1;
                        return [4 /*yield*/, this.updateUser(referrer.id, {
                                teamSize: newTeamSize
                            })];
                    case 19:
                        _a.sent();
                        // Check if VIP level should be upgraded
                        return [4 /*yield*/, this.updateUserVipLevel(referrer.id)];
                    case 20:
                        // Check if VIP level should be upgraded
                        _a.sent();
                        console.log("\u2705 Agent deposit: Referral bonus awarded: ".concat(referralReward, " to referrer ").concat(referrer.id, " available rewards only"));
                        _a.label = 21;
                    case 21: return [3 /*break*/, 23];
                    case 22:
                        error_16 = _a.sent();
                        console.error("Agent deposit: Error processing referral bonus for user ".concat(targetUser_1.id, ":"), error_16);
                        return [3 /*break*/, 23];
                    case 23: return [2 /*return*/, { transaction: transaction, activity: activity }];
                    case 24:
                        error_17 = _a.sent();
                        console.error('Error processing agent deposit:', error_17);
                        throw error_17;
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.processAgentWithdrawal = function (agentId, userIdentifier, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var targetUser, agentUser, agentProfile, withdrawalAmount, formattedAmount, commissionAmount, transaction, newBalance, newTotalWithdrawals, newAgentBalance, newEarnings, activity, error_18;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        return [4 /*yield*/, this.getUserByPublicIdOrEmail(userIdentifier)];
                    case 1:
                        targetUser = _a.sent();
                        if (!targetUser) {
                            throw new Error("User not found");
                        }
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 2:
                        agentUser = _a.sent();
                        if (!agentUser) {
                            throw new Error("Agent user not found");
                        }
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 3:
                        agentProfile = _a.sent();
                        if (!agentProfile || !agentProfile.isActive) {
                            throw new Error("Agent not found or inactive");
                        }
                        withdrawalAmount = parseFloat(amount);
                        if (withdrawalAmount <= 0 || !isFinite(withdrawalAmount) || isNaN(withdrawalAmount)) {
                            throw new Error("Invalid withdrawal amount");
                        }
                        formattedAmount = withdrawalAmount.toFixed(8);
                        // Check if user has sufficient balance
                        if (parseFloat(targetUser.balance) < withdrawalAmount) {
                            throw new Error("Insufficient user balance");
                        }
                        // Check if agent has sufficient balance to pay out
                        if (parseFloat(agentUser.balance) < withdrawalAmount) {
                            throw new Error("Insufficient agent balance to process withdrawal");
                        }
                        commissionAmount = (withdrawalAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.transactions)
                                .values({
                                userId: targetUser.id,
                                agentId: agentId,
                                type: "withdrawal",
                                fiatAmount: formattedAmount,
                                fiatCurrency: "USD",
                                status: "completed",
                                paymentMethod: "agent",
                                fee: "0.00000000"
                            })
                                .returning()];
                    case 4:
                        transaction = (_a.sent())[0];
                        // Create transaction for agent (showing deduction)
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.transactions)
                                .values({
                                userId: agentId,
                                agentId: agentId,
                                type: "withdrawal",
                                fiatAmount: "-".concat(formattedAmount),
                                fiatCurrency: "USD",
                                status: "completed",
                                paymentMethod: "agent",
                                fee: "0.00000000"
                            })
                                .returning()];
                    case 5:
                        // Create transaction for agent (showing deduction)
                        _a.sent();
                        newBalance = (parseFloat(targetUser.balance) - withdrawalAmount).toFixed(8);
                        newTotalWithdrawals = (parseFloat(targetUser.totalWithdrawals) + withdrawalAmount).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: newBalance,
                                totalWithdrawals: newTotalWithdrawals,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, targetUser.id))];
                    case 6:
                        _a.sent();
                        newAgentBalance = (parseFloat(agentUser.balance) - withdrawalAmount).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: newAgentBalance,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))];
                    case 7:
                        _a.sent();
                        newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                earningsBalance: newEarnings,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.createAgentActivity({
                                agentId: agentId,
                                action: "withdrawal",
                                targetUserId: targetUser.id,
                                amount: formattedAmount,
                                commissionAmount: commissionAmount,
                                transactionId: transaction.id
                            })];
                    case 9:
                        activity = _a.sent();
                        return [2 /*return*/, { transaction: transaction, activity: activity }];
                    case 10:
                        error_18 = _a.sent();
                        console.error('Error processing agent withdrawal:', error_18);
                        throw error_18;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.createAgentActivity = function (activity) {
        return __awaiter(this, void 0, void 0, function () {
            var createdActivity, error_19;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.agentActivities)
                                .values(activity)
                                .returning()];
                    case 1:
                        createdActivity = (_a.sent())[0];
                        return [2 /*return*/, createdActivity];
                    case 2:
                        error_19 = _a.sent();
                        console.error('Error creating agent activity:', error_19);
                        throw error_19;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAgentActivities = function (agentId_1) {
        return __awaiter(this, arguments, void 0, function (agentId, page, limit) {
            var offset, activitiesResult, count_2, error_20;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, db_1.db
                                .select({
                                id: schema_1.agentActivities.id,
                                agentId: schema_1.agentActivities.agentId,
                                action: schema_1.agentActivities.action,
                                targetUserId: schema_1.agentActivities.targetUserId,
                                amount: schema_1.agentActivities.amount,
                                commissionAmount: schema_1.agentActivities.commissionAmount,
                                transactionId: schema_1.agentActivities.transactionId,
                                createdAt: schema_1.agentActivities.createdAt,
                                targetUserPublicId: schema_1.users.publicId,
                            })
                                .from(schema_1.agentActivities)
                                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.agentActivities.targetUserId, schema_1.users.id))
                                .where((0, drizzle_orm_1.eq)(schema_1.agentActivities.agentId, agentId))
                                .orderBy((0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["", " DESC"], ["", " DESC"])), schema_1.agentActivities.createdAt))
                                .limit(limit)
                                .offset(offset)];
                    case 1:
                        activitiesResult = _a.sent();
                        return [4 /*yield*/, db_1.db
                                .select({ count: (0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["cast(count(*) as integer)"], ["cast(count(*) as integer)"]))) })
                                .from(schema_1.agentActivities)
                                .where((0, drizzle_orm_1.eq)(schema_1.agentActivities.agentId, agentId))];
                    case 2:
                        count_2 = (_a.sent())[0].count;
                        return [2 /*return*/, { activities: activitiesResult, total: count_2 }];
                    case 3:
                        error_20 = _a.sent();
                        console.error('Error getting agent activities:', error_20);
                        return [2 /*return*/, { activities: [], total: 0 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAgentEarnings = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, agentTransactions, totalDeposits, error_21;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        agentProfile = _a.sent();
                        if (!agentProfile) {
                            throw new Error("Agent profile not found");
                        }
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.transactions)
                                .where((0, drizzle_orm_1.eq)(schema_1.transactions.agentId, agentId))];
                    case 2:
                        agentTransactions = _a.sent();
                        totalDeposits = agentTransactions
                            .filter(function (t) { return t.type === 'deposit' && t.status === 'completed'; })
                            .reduce(function (sum, t) { return sum + parseFloat(t.fiatAmount || '0'); }, 0)
                            .toFixed(8);
                        return [2 /*return*/, {
                                totalEarnings: agentProfile.earningsBalance,
                                commissionRate: agentProfile.commissionRate,
                                totalDeposits: totalDeposits
                            }];
                    case 3:
                        error_21 = _a.sent();
                        console.error('Error getting agent earnings:', error_21);
                        throw error_21;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateAgentBalance = function (agentId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedProfile, error_22;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                earningsBalance: amount,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))
                                .returning()];
                    case 1:
                        updatedProfile = (_a.sent())[0];
                        return [2 /*return*/, updatedProfile || undefined];
                    case 2:
                        error_22 = _a.sent();
                        console.error('Error updating agent balance:', error_22);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.adjustAgentBalance = function (agentId, amount, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, agent, currentEarningsBalance, currentUserBalance, adjustment, newEarningsBalance, newUserBalance, updatedProfile, error_23;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        agentProfile = _a.sent();
                        if (!agentProfile)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 2:
                        agent = _a.sent();
                        if (!agent)
                            return [2 /*return*/, undefined];
                        currentEarningsBalance = parseFloat(agentProfile.earningsBalance);
                        currentUserBalance = parseFloat(agent.balance);
                        adjustment = parseFloat(amount);
                        newEarningsBalance = (currentEarningsBalance + adjustment).toFixed(8);
                        newUserBalance = (currentUserBalance + adjustment).toFixed(8);
                        // Log the admin action
                        return [4 /*yield*/, this.logAdminAction({
                                adminId: adminId,
                                action: 'agent_balance_adjustment',
                                targetId: agentId,
                                details: {
                                    previousBalance: agentProfile.earningsBalance,
                                    adjustment: amount,
                                    newBalance: newEarningsBalance
                                }
                            })];
                    case 3:
                        // Log the admin action
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.agentProfiles)
                                .set({
                                earningsBalance: newEarningsBalance,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.agentProfiles.userId, agentId))
                                .returning()];
                    case 4:
                        updatedProfile = (_a.sent())[0];
                        // Update user wallet balance so it shows in agent dashboard
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.users)
                                .set({
                                balance: newUserBalance,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.users.id, agentId))];
                    case 5:
                        // Update user wallet balance so it shows in agent dashboard
                        _a.sent();
                        return [2 /*return*/, updatedProfile || undefined];
                    case 6:
                        error_23 = _a.sent();
                        console.error('Error adjusting agent balance:', error_23);
                        return [2 /*return*/, undefined];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.clearDemoData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ne, error_24;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 20, , 21]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("drizzle-orm"); })];
                    case 1:
                        ne = (_a.sent()).ne;
                        // Delete all non-admin user related data (in order to respect foreign keys)
                        return [4 /*yield*/, db_1.db.delete(schema_1.goldenLiveEvents)];
                    case 2:
                        // Delete all non-admin user related data (in order to respect foreign keys)
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.goldenLiveStats)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.promoCodeRedemptions)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.pushSubscriptions)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.notifications)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.passkeys)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.agentActivities)];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.agentProfiles)];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.withdrawalRequests)];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.passwordResetTokens)];
                    case 11:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.pageViews)];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.userSessions)];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.gameAnalytics)];
                    case 14:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.bets)];
                    case 15:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.referrals)];
                    case 16:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.transactions)];
                    case 17:
                        _a.sent();
                        return [4 /*yield*/, db_1.db.delete(schema_1.games)];
                    case 18:
                        _a.sent();
                        // Only delete non-admin users
                        return [4 /*yield*/, db_1.db.delete(schema_1.users).where(ne(schema_1.users.role, 'admin'))];
                    case 19:
                        // Only delete non-admin users
                        _a.sent();
                        console.log('✅ Demo data cleared successfully (admin users preserved)');
                        return [3 /*break*/, 21];
                    case 20:
                        error_24 = _a.sent();
                        console.error('Error clearing demo data:', error_24);
                        throw error_24;
                    case 21: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserCountsByCountry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({
                            countryCode: schema_1.users.registrationCountry,
                            count: (0, drizzle_orm_1.count)()
                        })
                            .from(schema_1.users)
                            .where((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["", " IS NOT NULL AND ", " != ''"], ["", " IS NOT NULL AND ", " != ''"])), schema_1.users.registrationCountry, schema_1.users.registrationCountry))
                            .groupBy(schema_1.users.registrationCountry)
                            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.count)()))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.map(function (row) { return ({
                                countryCode: row.countryCode || 'Unknown',
                                count: Number(row.count)
                            }); })];
                }
            });
        });
    };
    // VIP settings methods
    DatabaseStorage.prototype.getAllVipSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.vipSettings)
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.vipSettings.levelOrder))];
                    case 1:
                        settings = _a.sent();
                        return [2 /*return*/, settings];
                }
            });
        });
    };
    DatabaseStorage.prototype.getVipSettingById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var setting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.vipSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipSettings.id, id))];
                    case 1:
                        setting = (_a.sent())[0];
                        return [2 /*return*/, setting || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getVipSettingByLevelKey = function (levelKey) {
        return __awaiter(this, void 0, void 0, function () {
            var setting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.vipSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipSettings.levelKey, levelKey))];
                    case 1:
                        setting = (_a.sent())[0];
                        return [2 /*return*/, setting || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.createVipSetting = function (setting) {
        return __awaiter(this, void 0, void 0, function () {
            var newSetting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.vipSettings)
                            .values(setting)
                            .returning()];
                    case 1:
                        newSetting = (_a.sent())[0];
                        return [2 /*return*/, newSetting];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateVipSetting = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updatedSetting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.vipSettings)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.vipSettings.id, id))
                            .returning()];
                    case 1:
                        updatedSetting = (_a.sent())[0];
                        return [2 /*return*/, updatedSetting || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteVipSetting = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.vipSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipSettings.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.createNotification = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var newNotification;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.notifications).values(notification).returning()];
                    case 1:
                        newNotification = (_a.sent())[0];
                        return [2 /*return*/, newNotification];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserNotifications = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.notifications)
                            .where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
                            .limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUnreadNotifications = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.notifications)
                            .where((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["", " = ", " AND ", " = false"], ["", " = ", " AND ", " = false"])), schema_1.notifications.userId, userId, schema_1.notifications.isRead))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.markNotificationRead = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.notifications)
                            .set({ isRead: true })
                            .where((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.markAllNotificationsRead = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.notifications)
                            .set({ isRead: true })
                            .where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteNotification = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.notifications)
                            .where((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    // Push subscription methods
    DatabaseStorage.prototype.createPushSubscription = function (subscription) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, newSubscription, error_25;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, db_1.db.select()
                                .from(schema_1.pushSubscriptions)
                                .where((0, drizzle_orm_1.eq)(schema_1.pushSubscriptions.endpoint, subscription.endpoint))
                                .limit(1)];
                    case 1:
                        existing = _a.sent();
                        if (!(existing.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db.update(schema_1.pushSubscriptions)
                                .set({
                                userId: subscription.userId,
                                p256dhKey: subscription.p256dhKey,
                                authKey: subscription.authKey,
                                userAgent: subscription.userAgent,
                                isActive: true,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.pushSubscriptions.endpoint, subscription.endpoint))
                                .returning()];
                    case 2:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                    case 3: return [4 /*yield*/, db_1.db.insert(schema_1.pushSubscriptions).values(subscription).returning()];
                    case 4:
                        newSubscription = (_a.sent())[0];
                        return [2 /*return*/, newSubscription];
                    case 5:
                        error_25 = _a.sent();
                        console.error('Error creating push subscription:', error_25);
                        throw error_25;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserPushSubscriptions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.pushSubscriptions)
                            .where((0, drizzle_orm_1.sql)(templateObject_38 || (templateObject_38 = __makeTemplateObject(["", " = ", " AND ", " = true"], ["", " = ", " AND ", " = true"])), schema_1.pushSubscriptions.userId, userId, schema_1.pushSubscriptions.isActive))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllActivePushSubscriptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.pushSubscriptions)
                            .where((0, drizzle_orm_1.eq)(schema_1.pushSubscriptions.isActive, true))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.deletePushSubscription = function (endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.pushSubscriptions)
                            .set({ isActive: false, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.pushSubscriptions.endpoint, endpoint))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DatabaseStorage.prototype.deletePushSubscriptionsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.pushSubscriptions)
                            .set({ isActive: false, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.pushSubscriptions.userId, userId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    // Withdrawal request methods
    DatabaseStorage.prototype.createWithdrawalRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var withdrawalRequest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.withdrawalRequests)
                            .values(request)
                            .returning()];
                    case 1:
                        withdrawalRequest = (_a.sent())[0];
                        return [2 /*return*/, withdrawalRequest];
                }
            });
        });
    };
    DatabaseStorage.prototype.getWithdrawalRequestsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.withdrawalRequests)
                            .where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.withdrawalRequests.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllWithdrawalRequests = function () {
        return __awaiter(this, arguments, void 0, function (page, limit, status) {
            var offset, query, requests, countQuery, total;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        query = db_1.db
                            .select()
                            .from(schema_1.withdrawalRequests);
                        if (status && status !== 'all') {
                            query = query.where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.status, status));
                        }
                        return [4 /*yield*/, query
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.withdrawalRequests.createdAt))
                                .limit(limit)
                                .offset(offset)];
                    case 1:
                        requests = _a.sent();
                        countQuery = db_1.db
                            .select({ count: (0, drizzle_orm_1.count)() })
                            .from(schema_1.withdrawalRequests);
                        if (status && status !== 'all') {
                            countQuery = countQuery.where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.status, status));
                        }
                        return [4 /*yield*/, countQuery];
                    case 2:
                        total = (_a.sent())[0].count;
                        return [2 /*return*/, { requests: requests, total: Number(total) }];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateWithdrawalRequestStatus = function (requestId, status, processedBy, adminNote) {
        return __awaiter(this, void 0, void 0, function () {
            var updates, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updates = {
                            status: status,
                            updatedAt: new Date(),
                        };
                        if (processedBy) {
                            updates.processedBy = processedBy;
                            updates.processedAt = new Date();
                        }
                        if (adminNote !== undefined) {
                            updates.adminNote = adminNote;
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.withdrawalRequests)
                                .set(updates)
                                .where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.id, requestId))
                                .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.getWithdrawalRequestById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.withdrawalRequests)
                            .where((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.id, id))
                            .limit(1)];
                    case 1:
                        request = (_a.sent())[0];
                        return [2 /*return*/, request];
                }
            });
        });
    };
    DatabaseStorage.prototype.getCompletedWithdrawalCount = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select({ count: (0, drizzle_orm_1.sql)(templateObject_39 || (templateObject_39 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) })
                            .from(schema_1.withdrawalRequests)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.userId, userId), (0, drizzle_orm_1.eq)(schema_1.withdrawalRequests.status, 'completed')))];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) || 0];
                }
            });
        });
    };
    // Crash game specific bet methods
    DatabaseStorage.prototype.updateBetForCashout = function (betId, cashOutMultiplier, cashedOutAt) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.bets)
                            .set({
                            cashOutMultiplier: cashOutMultiplier,
                            cashedOutAt: cashedOutAt,
                            status: 'cashed_out',
                            updatedAt: cashedOutAt
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.id, betId))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateBetIfPending = function (betId, newStatus, additionalUpdates) {
        return __awaiter(this, void 0, void 0, function () {
            var bet;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bets)
                            .where((0, drizzle_orm_1.eq)(schema_1.bets.id, betId))
                            .limit(1)];
                    case 1:
                        bet = (_a.sent())[0];
                        if (!bet || bet.status !== 'pending')
                            return [2 /*return*/, false];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.bets)
                                .set(__assign({ status: newStatus, updatedAt: new Date() }, additionalUpdates))
                                .where((0, drizzle_orm_1.eq)(schema_1.bets.id, betId))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserActiveCrashBet = function (userId, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBet, error_26;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.bets)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.bets.gameId, gameId), (0, drizzle_orm_1.eq)(schema_1.bets.betType, 'crash'), (0, drizzle_orm_1.eq)(schema_1.bets.status, 'pending')))
                                .limit(1)];
                    case 1:
                        userBet = (_a.sent())[0];
                        return [2 /*return*/, userBet];
                    case 2:
                        error_26 = _a.sent();
                        console.error('Error fetching user active crash bet:', error_26);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.cleanupUserBetHistory = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, idsToDelete, error_27;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, db_1.db.select({ id: schema_1.bets.id })
                                .from(schema_1.bets)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.bets.betType, 'crash')))
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.bets.createdAt))];
                    case 1:
                        userBets = _a.sent();
                        if (!(userBets.length > 100)) return [3 /*break*/, 3];
                        idsToDelete = userBets.slice(100).map(function (b) { return b.id; });
                        return [4 /*yield*/, db_1.db.delete(schema_1.bets)
                                .where((0, drizzle_orm_1.inArray)(schema_1.bets.id, idsToDelete))];
                    case 2:
                        _a.sent();
                        console.log("\uD83E\uDDF9 [CLEANUP] Removed ".concat(idsToDelete.length, " old crash bets for user ").concat(userId));
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_27 = _a.sent();
                        console.error("\u274C [CLEANUP] Error cleaning up bet history for user ".concat(userId, ":"), error_27);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Golden Live methods
    DatabaseStorage.prototype.getGoldenLiveStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stats, newStats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.goldenLiveStats)
                            .limit(1)];
                    case 1:
                        stats = (_a.sent())[0];
                        if (!!stats) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.goldenLiveStats)
                                .values({
                                totalPlayers: 18000,
                                activePlayers: 1243,
                                lastHourlyIncrease: new Date()
                            })
                                .returning()];
                    case 2:
                        newStats = (_a.sent())[0];
                        return [2 /*return*/, newStats];
                    case 3: return [2 /*return*/, stats];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateGoldenLiveStats = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.goldenLiveStats)
                                .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                                .where((0, drizzle_orm_1.eq)(schema_1.goldenLiveStats.id, currentStats.id))
                                .returning()];
                    case 2:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.createGoldenLiveEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var newEvent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.goldenLiveEvents)
                            .values(event)
                            .returning()];
                    case 1:
                        newEvent = (_a.sent())[0];
                        return [2 /*return*/, newEvent];
                }
            });
        });
    };
    DatabaseStorage.prototype.getGoldenLiveEvents = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var events;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.goldenLiveEvents)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.goldenLiveEvents.createdAt))
                            .limit(limit)];
                    case 1:
                        events = _a.sent();
                        return [2 /*return*/, events];
                }
            });
        });
    };
    DatabaseStorage.prototype.incrementTotalPlayersBy28 = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats, newTotalPlayers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats)
                            return [2 /*return*/, undefined];
                        newTotalPlayers = currentStats.totalPlayers + 280;
                        // Create event for audit trail
                        return [4 /*yield*/, this.createGoldenLiveEvent({
                                eventType: 'hourly_increase',
                                previousValue: currentStats.totalPlayers,
                                newValue: newTotalPlayers,
                                incrementAmount: 280,
                                description: 'Automatic hourly increase of total players by 280'
                            })];
                    case 2:
                        // Create event for audit trail
                        _a.sent();
                        return [4 /*yield*/, this.updateGoldenLiveStats({
                                totalPlayers: newTotalPlayers,
                                lastHourlyIncrease: new Date()
                            })];
                    case 3: 
                    // Update the stats
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateActivePlayersCount = function (count) {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats)
                            return [2 /*return*/, undefined];
                        // Create event for audit trail
                        return [4 /*yield*/, this.createGoldenLiveEvent({
                                eventType: 'active_player_update',
                                previousValue: currentStats.activePlayers,
                                newValue: count,
                                incrementAmount: count - currentStats.activePlayers,
                                description: "Active players count updated from ".concat(currentStats.activePlayers, " to ").concat(count)
                            })];
                    case 2:
                        // Create event for audit trail
                        _a.sent();
                        return [4 /*yield*/, this.updateGoldenLiveStats({
                                activePlayers: count
                            })];
                    case 3: 
                    // Update the stats
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Promo code methods
    DatabaseStorage.prototype.createPromoCode = function (promoCode) {
        return __awaiter(this, void 0, void 0, function () {
            var newPromoCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.promoCodes)
                            .values({
                            code: promoCode.code.toUpperCase(),
                            totalValue: promoCode.totalValue,
                            minValue: promoCode.minValue,
                            maxValue: promoCode.maxValue,
                            usageLimit: promoCode.usageLimit || null,
                            usedCount: 0,
                            isActive: promoCode.isActive !== undefined ? promoCode.isActive : true,
                            requireDeposit: promoCode.requireDeposit || false,
                            vipLevelUpgrade: promoCode.vipLevelUpgrade || null,
                            expiresAt: promoCode.expiresAt || null,
                            createdBy: promoCode.createdBy,
                        })
                            .returning()];
                    case 1:
                        newPromoCode = (_a.sent())[0];
                        return [2 /*return*/, newPromoCode];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPromoCodeByCode = function (code) {
        return __awaiter(this, void 0, void 0, function () {
            var upperCode, promoCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        upperCode = code.toUpperCase();
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.promoCodes)
                                .where((0, drizzle_orm_1.eq)(schema_1.promoCodes.code, upperCode))
                                .limit(1)];
                    case 1:
                        promoCode = (_a.sent())[0];
                        return [2 /*return*/, promoCode || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllPromoCodes = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, _a, codes, totalResult;
            var _b;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, Promise.all([
                                db_1.db.select()
                                    .from(schema_1.promoCodes)
                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.promoCodes.createdAt))
                                    .limit(limit)
                                    .offset(offset),
                                db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.promoCodes)
                            ])];
                    case 1:
                        _a = _c.sent(), codes = _a[0], totalResult = _a[1];
                        return [2 /*return*/, {
                                codes: codes,
                                total: ((_b = totalResult[0]) === null || _b === void 0 ? void 0 : _b.count) || 0
                            }];
                }
            });
        });
    };
    DatabaseStorage.prototype.validatePromoCode = function (code, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var promoCode, existingRedemption, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPromoCodeByCode(code)];
                    case 1:
                        promoCode = _a.sent();
                        if (!promoCode) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code not found' }];
                        }
                        if (!promoCode.isActive) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code is no longer active' }];
                        }
                        if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code has expired' }];
                        }
                        if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code usage limit reached' }];
                        }
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.promoCodeRedemptions)
                                .where((0, drizzle_orm_1.sql)(templateObject_40 || (templateObject_40 = __makeTemplateObject(["", " = ", " AND ", " = ", ""], ["", " = ", " AND ", " = ", ""])), schema_1.promoCodeRedemptions.userId, userId, schema_1.promoCodeRedemptions.code, promoCode.code))
                                .limit(1)];
                    case 2:
                        existingRedemption = (_a.sent())[0];
                        if (existingRedemption) {
                            return [2 /*return*/, { valid: false, reason: 'You have already redeemed this promo code' }];
                        }
                        if (!promoCode.requireDeposit) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.getUser(userId)];
                    case 3:
                        user = _a.sent();
                        if (!user || parseFloat(user.totalDeposits) === 0) {
                            return [2 /*return*/, { valid: false, reason: 'You must make a deposit before redeeming this code' }];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, { valid: true, promoCode: promoCode }];
                }
            });
        });
    };
    DatabaseStorage.prototype.redeemPromoCode = function (code, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var validation, promoCode, minCoins, maxCoins, randomCoins, randomAmount, amountAwarded, user, vipLevelUpgraded, newVipLevel, newBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.validatePromoCode(code, userId)];
                    case 1:
                        validation = _a.sent();
                        if (!validation.valid) {
                            return [2 /*return*/, { success: false, reason: validation.reason }];
                        }
                        promoCode = validation.promoCode;
                        minCoins = Math.round(parseFloat(promoCode.minValue) * 100);
                        maxCoins = Math.round(parseFloat(promoCode.maxValue) * 100);
                        randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
                        randomAmount = randomCoins / 100;
                        amountAwarded = randomAmount.toFixed(8);
                        // Create redemption record
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.promoCodeRedemptions)
                                .values({
                                promoCodeId: promoCode.id,
                                userId: userId,
                                code: promoCode.code,
                                amountAwarded: amountAwarded,
                            })];
                    case 2:
                        // Create redemption record
                        _a.sent();
                        // Update promo code used count
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.promoCodes)
                                .set({
                                usedCount: (0, drizzle_orm_1.sql)(templateObject_41 || (templateObject_41 = __makeTemplateObject(["", " + 1"], ["", " + 1"])), schema_1.promoCodes.usedCount),
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, promoCode.id))];
                    case 3:
                        // Update promo code used count
                        _a.sent();
                        return [4 /*yield*/, this.getUser(userId)];
                    case 4:
                        user = _a.sent();
                        vipLevelUpgraded = false;
                        if (!user) return [3 /*break*/, 7];
                        newBalance = (parseFloat(user.balance) + parseFloat(amountAwarded)).toFixed(8);
                        return [4 /*yield*/, this.updateUserBalance(userId, newBalance)];
                    case 5:
                        _a.sent();
                        if (!promoCode.vipLevelUpgrade) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.updateUser(userId, { vipLevel: promoCode.vipLevelUpgrade })];
                    case 6:
                        _a.sent();
                        vipLevelUpgraded = true;
                        newVipLevel = promoCode.vipLevelUpgrade;
                        _a.label = 7;
                    case 7: return [2 /*return*/, { success: true, amountAwarded: amountAwarded, vipLevelUpgraded: vipLevelUpgraded, newVipLevel: newVipLevel }];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserPromoCodeRedemptions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var redemptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.promoCodeRedemptions)
                            .where((0, drizzle_orm_1.eq)(schema_1.promoCodeRedemptions.userId, userId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.promoCodeRedemptions.createdAt))];
                    case 1:
                        redemptions = _a.sent();
                        return [2 /*return*/, redemptions];
                }
            });
        });
    };
    DatabaseStorage.prototype.updatePromoCodeStatus = function (promoCodeId, isActive) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.promoCodes)
                            .set({
                            isActive: isActive,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, promoCodeId))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.deletePromoCode = function (promoCodeId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.promoCodes)
                            .where((0, drizzle_orm_1.eq)(schema_1.promoCodes.id, promoCodeId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    // VIP Level Telegram Links methods
    DatabaseStorage.prototype.getAllVipLevelTelegramLinks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var links;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.vipLevelTelegramLinks)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipLevelTelegramLinks.isActive, true))
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.vipLevelTelegramLinks.vipLevel))];
                    case 1:
                        links = _a.sent();
                        return [2 /*return*/, links];
                }
            });
        });
    };
    DatabaseStorage.prototype.getVipLevelTelegramLink = function (vipLevel) {
        return __awaiter(this, void 0, void 0, function () {
            var link;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.vipLevelTelegramLinks)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipLevelTelegramLinks.vipLevel, vipLevel))
                            .limit(1)];
                    case 1:
                        link = (_a.sent())[0];
                        return [2 /*return*/, link || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.upsertVipLevelTelegramLink = function (link) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, newLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVipLevelTelegramLink(link.vipLevel)];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.vipLevelTelegramLinks)
                                .set({
                                telegramLink: link.telegramLink,
                                description: link.description,
                                isActive: link.isActive,
                                updatedBy: link.updatedBy,
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.vipLevelTelegramLinks.id, existing.id))
                                .returning()];
                    case 2:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                    case 3: return [4 /*yield*/, db_1.db
                            .insert(schema_1.vipLevelTelegramLinks)
                            .values({
                            vipLevel: link.vipLevel,
                            telegramLink: link.telegramLink,
                            description: link.description,
                            isActive: link.isActive !== undefined ? link.isActive : true,
                            updatedBy: link.updatedBy,
                        })
                            .returning()];
                    case 4:
                        newLink = (_a.sent())[0];
                        return [2 /*return*/, newLink];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteVipLevelTelegramLink = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.vipLevelTelegramLinks)
                            .where((0, drizzle_orm_1.eq)(schema_1.vipLevelTelegramLinks.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    // Database connection methods
    DatabaseStorage.prototype.createDatabaseConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var newConnection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.databaseConnections)
                            .values(connection)
                            .returning()];
                    case 1:
                        newConnection = (_a.sent())[0];
                        return [2 /*return*/, newConnection];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllDatabaseConnections = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, _a, connections, totalResult;
            var _b;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, Promise.all([
                                db_1.db.select().from(schema_1.databaseConnections).limit(limit).offset(offset).orderBy((0, drizzle_orm_1.desc)(schema_1.databaseConnections.createdAt)),
                                db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.databaseConnections)
                            ])];
                    case 1:
                        _a = _c.sent(), connections = _a[0], totalResult = _a[1];
                        return [2 /*return*/, {
                                connections: connections,
                                total: ((_b = totalResult[0]) === null || _b === void 0 ? void 0 : _b.count) || 0
                            }];
                }
            });
        });
    };
    DatabaseStorage.prototype.getDatabaseConnectionById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .limit(1)];
                    case 1:
                        connection = (_a.sent())[0];
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateDatabaseConnection = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.databaseConnections)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.getActiveDatabaseConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.isActive, true))
                            .limit(1)];
                    case 1:
                        connection = (_a.sent())[0];
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    DatabaseStorage.prototype.setActiveDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var activated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // First, deactivate all connections
                    return [4 /*yield*/, db_1.db
                            .update(schema_1.databaseConnections)
                            .set({ isActive: false, status: 'inactive', updatedAt: new Date() })];
                    case 1:
                        // First, deactivate all connections
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isActive: true, status: 'active', updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                                .returning()];
                    case 2:
                        activated = (_a.sent())[0];
                        return [2 /*return*/, activated];
                }
            });
        });
    };
    DatabaseStorage.prototype.setPrimaryDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, primary;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDatabaseConnectionById(id)];
                    case 1:
                        connection = _a.sent();
                        if (!connection) {
                            throw new Error('Database connection not found');
                        }
                        if (!connection.isActive) {
                            throw new Error('Cannot set inactive database as primary. Please activate it first.');
                        }
                        // First, remove primary flag from all connections
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isPrimary: false, updatedAt: new Date() })];
                    case 2:
                        // First, remove primary flag from all connections
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isPrimary: true, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                                .returning()];
                    case 3:
                        primary = (_a.sent())[0];
                        return [2 /*return*/, primary];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPredictedResults = function (adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var results_1, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(adminId === 'any')) return [3 /*break*/, 2];
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.predictedResults)
                                .orderBy((0, drizzle_orm_1.desc)(schema_1.predictedResults.createdAt))];
                    case 1:
                        results_1 = _a.sent();
                        return [2 /*return*/, results_1];
                    case 2: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.predictedResults)
                            .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.adminId, adminId))];
                    case 3:
                        results = _a.sent();
                        return [2 /*return*/, results];
                }
            });
        });
    };
    DatabaseStorage.prototype.savePredictedResult = function (prediction) {
        return __awaiter(this, void 0, void 0, function () {
            var adminId, periodId, result, existing, updated, created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        adminId = prediction.adminId, periodId = prediction.periodId, result = prediction.result;
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.predictedResults)
                                .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.adminId, adminId))
                                .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.periodId, periodId))];
                    case 1:
                        existing = _a.sent();
                        if (!(existing.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.predictedResults)
                                .set({ result: result, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.id, existing[0].id))
                                .returning()];
                    case 2:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                    case 3: return [4 /*yield*/, db_1.db
                            .insert(schema_1.predictedResults)
                            .values(prediction)
                            .returning()];
                    case 4:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.deletePredictedResult = function (id, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.predictedResults)
                            .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.id, id))
                            .where((0, drizzle_orm_1.eq)(schema_1.predictedResults.adminId, adminId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    // Support chat session methods
    DatabaseStorage.prototype.createSupportChatSession = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.supportChatSessions)
                            .values(payload)
                            .returning()];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    DatabaseStorage.prototype.getSupportChatSessionByToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.supportChatSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatSessions.sessionToken, token))];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    DatabaseStorage.prototype.getSupportChatSession = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.supportChatSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatSessions.id, id))];
                    case 1:
                        session = (_a.sent())[0];
                        return [2 /*return*/, session];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateSupportChatSession = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.supportChatSessions)
                            .set(__assign(__assign({}, updates), { lastMessageAt: updates.lastMessageAt || new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatSessions.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.listOpenSupportSessions = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.supportChatSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatSessions.status, 'open'))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.supportChatSessions.createdAt))
                            .limit(limit || 50)];
                    case 1:
                        sessions = _a.sent();
                        return [2 /*return*/, sessions];
                }
            });
        });
    };
    DatabaseStorage.prototype.createSupportChatMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.supportChatMessages)
                            .values(message)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.supportChatSessions)
                                .set({ lastMessageAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.supportChatSessions.id, message.sessionId))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.getSupportChatMessages = function (sessionId, after) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = db_1.db
                            .select()
                            .from(schema_1.supportChatMessages)
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatMessages.sessionId, sessionId))
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.supportChatMessages.createdAt));
                        if (after) {
                            query = query.where((0, drizzle_orm_1.sql)(templateObject_42 || (templateObject_42 = __makeTemplateObject(["", " > ", ""], ["", " > ", ""])), schema_1.supportChatMessages.createdAt, after));
                        }
                        return [4 /*yield*/, query];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.markMessagesDelivered = function (sessionId, deliveredAt) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.supportChatMessages)
                            .set({ deliveredAt: deliveredAt || new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatMessages.sessionId, sessionId))
                            .where((0, drizzle_orm_1.sql)(templateObject_43 || (templateObject_43 = __makeTemplateObject(["", " IS NULL"], ["", " IS NULL"])), schema_1.supportChatMessages.deliveredAt))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteSupportChatMessages = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.supportChatMessages)
                            .where((0, drizzle_orm_1.eq)(schema_1.supportChatMessages.sessionId, sessionId))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        console.log("\uD83D\uDDD1\uFE0F Deleted ".concat(result.length, " message(s) for session ").concat(sessionId));
                        return [2 /*return*/, result.length];
                }
            });
        });
    };
    DatabaseStorage.prototype.createQuickReply = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var quickReply;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.quickReplies)
                            .values(payload)
                            .returning()];
                    case 1:
                        quickReply = (_a.sent())[0];
                        return [2 /*return*/, quickReply];
                }
            });
        });
    };
    DatabaseStorage.prototype.getQuickReplies = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.quickReplies)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.quickReplies.updatedAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getQuickReplyById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var quickReply;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.quickReplies)
                            .where((0, drizzle_orm_1.eq)(schema_1.quickReplies.id, id))];
                    case 1:
                        quickReply = (_a.sent())[0];
                        return [2 /*return*/, quickReply];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateQuickReply = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.quickReplies)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.quickReplies.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteQuickReply = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.quickReplies)
                            .where((0, drizzle_orm_1.eq)(schema_1.quickReplies.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    // Telegram Reactions (N1Panel) methods
    DatabaseStorage.prototype.getTelegramReactionSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiKeyFromEnv, apiUrlFromEnv, settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        apiKeyFromEnv = process.env.N1PANEL_API_KEY;
                        apiUrlFromEnv = process.env.N1PANEL_API_URL || "https://n1panel.com/api/v2";
                        if (apiKeyFromEnv) {
                            // Return settings from environment variables
                            return [2 /*return*/, {
                                    id: 'env-settings',
                                    apiKey: apiKeyFromEnv,
                                    apiUrl: apiUrlFromEnv,
                                    balance: null,
                                    isActive: true,
                                    lastBalanceCheck: null,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }];
                        }
                        return [4 /*yield*/, db_1.db
                                .select()
                                .from(schema_1.telegramReactionSettings)
                                .limit(1)];
                    case 1:
                        settings = (_a.sent())[0];
                        return [2 /*return*/, settings];
                }
            });
        });
    };
    DatabaseStorage.prototype.createOrUpdateTelegramReactionSettings = function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, created;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getTelegramReactionSettings()];
                    case 1:
                        existing = _b.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.telegramReactionSettings)
                                .set(__assign(__assign({}, settings), { updatedAt: new Date() }))
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramReactionSettings.id, existing.id))
                                .returning()];
                    case 2:
                        updated = (_b.sent())[0];
                        return [2 /*return*/, updated];
                    case 3: return [4 /*yield*/, db_1.db
                            .insert(schema_1.telegramReactionSettings)
                            .values({
                            apiKey: settings.apiKey,
                            apiUrl: settings.apiUrl || "https://n1panel.com/api/v2",
                            isActive: (_a = settings.isActive) !== null && _a !== void 0 ? _a : true,
                        })
                            .returning()];
                    case 4:
                        created = (_b.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllTelegramGroups = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramGroups)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.telegramGroups.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramGroupById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramGroups)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramGroups.id, id))];
                    case 1:
                        group = (_a.sent())[0];
                        return [2 /*return*/, group];
                }
            });
        });
    };
    DatabaseStorage.prototype.createTelegramGroup = function (group) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.telegramGroups)
                            .values(group)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTelegramGroup = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.telegramGroups)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramGroups.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteTelegramGroup = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.telegramGroups)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramGroups.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    // Telegram signals implementation
    DatabaseStorage.prototype.createTelegramSignal = function (signal) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.telegramSignals)
                            .values(signal)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramSignalById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var signal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.id, id))];
                    case 1:
                        signal = (_a.sent())[0];
                        return [2 /*return*/, signal];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramSignalByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var signal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.gameId, gameId))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.telegramSignals.createdAt))
                            .limit(1)];
                    case 1:
                        signal = (_a.sent())[0];
                        return [2 /*return*/, signal];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramSignalByMessageId = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var signal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.messageId, messageId))];
                    case 1:
                        signal = (_a.sent())[0];
                        return [2 /*return*/, signal];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllTelegramSignals = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.telegramSignals.createdAt))
                            .limit(limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPendingTelegramSignals = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.status, 'sent'))
                            .orderBy(schema_1.telegramSignals.createdAt)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTelegramSignal = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = __assign(__assign({}, updates), { updatedAt: new Date() });
                        if (updates.sentAt) {
                            updateData.sentAt = new Date(updates.sentAt);
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.telegramSignals)
                                .set(updateData)
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.id, id))
                                .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteTelegramSignal = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.getLatestTelegramSignalsByDuration = function (duration_1) {
        return __awaiter(this, arguments, void 0, function (duration, limit) {
            var signals;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramSignals)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramSignals.duration, duration))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.telegramSignals.createdAt))
                            .limit(limit)];
                    case 1:
                        signals = _a.sent();
                        return [2 /*return*/, signals.reverse()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllTelegramReactionOrders = function (groupId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = db_1.db
                            .select()
                            .from(schema_1.telegramReactionOrders)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.telegramReactionOrders.createdAt));
                        if (groupId) {
                            query.where((0, drizzle_orm_1.eq)(schema_1.telegramReactionOrders.groupId, groupId));
                        }
                        if (limit) {
                            query.limit(limit);
                        }
                        return [4 /*yield*/, query];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramReactionOrderById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var order;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.telegramReactionOrders)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramReactionOrders.id, id))];
                    case 1:
                        order = (_a.sent())[0];
                        return [2 /*return*/, order];
                }
            });
        });
    };
    DatabaseStorage.prototype.createTelegramReactionOrder = function (order) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.telegramReactionOrders)
                            .values(order)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTelegramReactionOrder = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.telegramReactionOrders)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramReactionOrders.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    DatabaseStorage.prototype.createN1PanelOrder = function (order) {
        return __awaiter(this, void 0, void 0, function () {
            var existingOrder;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.n1PanelReactionOrders)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.n1PanelReactionOrders.telegramMessageId, order.telegramMessageId), (0, drizzle_orm_1.eq)(schema_1.n1PanelReactionOrders.telegramChannelId, order.telegramChannelId)))];
                    case 1:
                        existingOrder = (_a.sent())[0];
                        if (existingOrder) {
                            console.log("\u26A0\uFE0F  Order already exists for message ".concat(order.telegramMessageId, " in channel ").concat(order.telegramChannelId, ", skipping duplicate"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, db_1.db.insert(schema_1.n1PanelReactionOrders).values(order)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateN1PanelOrderStatus = function (orderId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.n1PanelReactionOrders)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.n1PanelReactionOrders.n1PanelOrderId, orderId))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getPendingN1PanelOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var orders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.n1PanelReactionOrders)
                            .where((0, drizzle_orm_1.sql)(templateObject_44 || (templateObject_44 = __makeTemplateObject(["", " IN ('pending', 'processing')"], ["", " IN ('pending', 'processing')"])), schema_1.n1PanelReactionOrders.status))
                            .orderBy(schema_1.n1PanelReactionOrders.createdAt)];
                    case 1:
                        orders = _a.sent();
                        return [2 /*return*/, orders];
                }
            });
        });
    };
    DatabaseStorage.prototype.getAllN1PanelOrders = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var orders;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.n1PanelReactionOrders)
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.n1PanelReactionOrders.createdAt))
                            .limit(limit)];
                    case 1:
                        orders = _a.sent();
                        return [2 /*return*/, orders];
                }
            });
        });
    };
    // Betting tasks implementations
    DatabaseStorage.prototype.getAllBettingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.bettingTasks).orderBy((0, drizzle_orm_1.desc)(schema_1.bettingTasks.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getActiveBettingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.bettingTasks)
                            .where((0, drizzle_orm_1.eq)(schema_1.bettingTasks.isActive, true))
                            .orderBy(schema_1.bettingTasks.durationMinutes)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getBettingTaskById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var tasks;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.bettingTasks).where((0, drizzle_orm_1.eq)(schema_1.bettingTasks.id, id))];
                    case 1:
                        tasks = _a.sent();
                        return [2 /*return*/, tasks[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.createBettingTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.bettingTasks).values(task).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateBettingTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.bettingTasks)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.bettingTasks.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteBettingTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.bettingTasks).where((0, drizzle_orm_1.eq)(schema_1.bettingTasks.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount !== null && result.rowCount > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserTaskProgress = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var progress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.userBettingTaskProgress)
                            .leftJoin(schema_1.bettingTasks, (0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.taskId, schema_1.bettingTasks.id))
                            .where((0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.userId, userId))];
                    case 1:
                        progress = _a.sent();
                        return [2 /*return*/, progress.map(function (p) { return (__assign(__assign({}, p.user_betting_task_progress), { task: p.betting_tasks })); })];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserTaskProgressByTask = function (userId, taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var progress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.userBettingTaskProgress)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.taskId, taskId)))];
                    case 1:
                        progress = _a.sent();
                        return [2 /*return*/, progress[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateUserTaskProgress = function (userId, taskId, betAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, newAccumulated, result, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserTaskProgressByTask(userId, taskId)];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        newAccumulated = (parseFloat(existing.betAccumulated) + parseFloat(betAmount)).toFixed(2);
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.userBettingTaskProgress)
                                .set({
                                betAccumulated: newAccumulated,
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.taskId, taskId)))
                                .returning()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                    case 3: return [4 /*yield*/, db_1.db
                            .insert(schema_1.userBettingTaskProgress)
                            .values({
                            userId: userId,
                            taskId: taskId,
                            betAccumulated: parseFloat(betAmount).toFixed(2),
                            isCompleted: false
                        })
                            .returning()];
                    case 4:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.claimTaskReward = function (userId, taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, progress, coinRewardAmount, result, error_28;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getBettingTaskById(taskId)];
                    case 1:
                        task = _b.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "Task not found" }];
                        }
                        console.log("[ClaimReward] Task retrieved:", {
                            taskId: task.id,
                            name: task.name,
                            coinReward: task.coinReward,
                            coinRewardType: typeof task.coinReward
                        });
                        return [4 /*yield*/, this.getUserTaskProgressByTask(userId, taskId)];
                    case 2:
                        progress = _b.sent();
                        if (!progress) {
                            return [2 /*return*/, { success: false, error: "No progress found for this task" }];
                        }
                        if (progress.isCompleted) {
                            return [2 /*return*/, { success: false, error: "Task already claimed" }];
                        }
                        if (parseFloat(progress.betAccumulated) < parseFloat(task.betRequirement)) {
                            return [2 /*return*/, { success: false, error: "Bet requirement not met" }];
                        }
                        coinRewardAmount = String(task.coinReward);
                        console.log("[ClaimReward] Awarding coins:", {
                            userId: userId,
                            originalCoinReward: task.coinReward,
                            coinRewardAmount: coinRewardAmount,
                            coinRewardAmountType: typeof coinRewardAmount
                        });
                        return [4 /*yield*/, this.atomicIncrementBalance(userId, coinRewardAmount)];
                    case 3:
                        result = _b.sent();
                        if (!result.success) {
                            console.error("[ClaimReward] Balance increment failed:", result.error);
                            return [2 /*return*/, { success: false, error: "Failed to award coins" }];
                        }
                        console.log("[ClaimReward] Balance incremented successfully, new balance:", (_a = result.user) === null || _a === void 0 ? void 0 : _a.balance);
                        // Create a transaction record so BalanceIntegrity service can track this
                        return [4 /*yield*/, db_1.db.insert(schema_1.transactions).values({
                                userId: userId,
                                type: "commission_withdrawal",
                                cryptoCurrency: "USDT",
                                cryptoAmount: coinRewardAmount,
                                fiatAmount: coinRewardAmount,
                                paymentMethod: "internal",
                                status: "completed",
                                txHash: "betting-task-".concat(task.id, "-").concat(Date.now())
                            })];
                    case 4:
                        // Create a transaction record so BalanceIntegrity service can track this
                        _b.sent();
                        // Mark as completed
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.userBettingTaskProgress)
                                .set({
                                isCompleted: true,
                                claimedAt: new Date(),
                                updatedAt: new Date()
                            })
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userBettingTaskProgress.taskId, taskId)))];
                    case 5:
                        // Mark as completed
                        _b.sent();
                        console.log("[ClaimReward] Task marked as completed, returning reward:", coinRewardAmount);
                        return [2 /*return*/, { success: true, reward: coinRewardAmount }];
                    case 6:
                        error_28 = _b.sent();
                        console.error('Error claiming task reward:', error_28);
                        return [2 /*return*/, { success: false, error: "Internal error" }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Whitelisted IP methods
    DatabaseStorage.prototype.getAllWhitelistedIps = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.whitelistedIps).orderBy((0, drizzle_orm_1.desc)(schema_1.whitelistedIps.createdAt))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    DatabaseStorage.prototype.getWhitelistedIpByAddress = function (ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.whitelistedIps).where((0, drizzle_orm_1.eq)(schema_1.whitelistedIps.ipAddress, ipAddress))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.addWhitelistedIp = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.whitelistedIps).values(data).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateWhitelistedIp = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.whitelistedIps)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.whitelistedIps.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteWhitelistedIp = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.whitelistedIps).where((0, drizzle_orm_1.eq)(schema_1.whitelistedIps.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount !== null && result.rowCount > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateWhitelistedIpAccountCount = function (ipAddress, newCount) {
        return __awaiter(this, void 0, void 0, function () {
            var whitelistedIp, updates;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getWhitelistedIpByAddress(ipAddress)];
                    case 1:
                        whitelistedIp = _a.sent();
                        if (!whitelistedIp)
                            return [2 /*return*/];
                        updates = {
                            currentAccountCount: newCount,
                            updatedAt: new Date()
                        };
                        // Check if threshold is exceeded (more than accountCountAtWhitelist)
                        if (newCount > whitelistedIp.accountCountAtWhitelist && !whitelistedIp.exceededThreshold) {
                            updates.exceededThreshold = true;
                            updates.thresholdExceededAt = new Date();
                        }
                        return [4 /*yield*/, db_1.db.update(schema_1.whitelistedIps)
                                .set(updates)
                                .where((0, drizzle_orm_1.eq)(schema_1.whitelistedIps.ipAddress, ipAddress))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Telegram Scheduled Posts methods
    DatabaseStorage.prototype.createTelegramScheduledPost = function (post) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.telegramScheduledPosts).values(__assign(__assign({}, post), { scheduleTime: post.scheduleTime || null, periodId: post.periodId || null })).returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramScheduledPosts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.telegramScheduledPosts).orderBy((0, drizzle_orm_1.desc)(schema_1.telegramScheduledPosts.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.getTelegramScheduledPostById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.telegramScheduledPosts).where((0, drizzle_orm_1.eq)(schema_1.telegramScheduledPosts.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateTelegramScheduledPost = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.telegramScheduledPosts)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramScheduledPosts.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.deleteTelegramScheduledPost = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.telegramScheduledPosts).where((0, drizzle_orm_1.eq)(schema_1.telegramScheduledPosts.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount !== null && result.rowCount > 0];
                }
            });
        });
    };
    DatabaseStorage.prototype.getActiveTelegramScheduledPosts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.telegramScheduledPosts)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramScheduledPosts.status, 'active'))
                            .orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql)(templateObject_45 || (templateObject_45 = __makeTemplateObject(["COALESCE(", ", '')"], ["COALESCE(", ", '')"])), schema_1.telegramScheduledPosts.scheduleTime)))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateScheduledPostSentStatus = function (id, sentAt, repeatDaily) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = {
                            lastSentAt: sentAt,
                            sentCount: (0, drizzle_orm_1.sql)(templateObject_46 || (templateObject_46 = __makeTemplateObject(["", " + 1"], ["", " + 1"])), schema_1.telegramScheduledPosts.sentCount),
                            updatedAt: new Date()
                        };
                        if (!repeatDaily) {
                            updateData.status = 'completed';
                        }
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.telegramScheduledPosts)
                                .set(updateData)
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramScheduledPosts.id, id))
                                .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    // Advanced Personalized Crash Settings
    DatabaseStorage.prototype.getAdvancedCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.advancedCrashSettings).limit(1)];
                    case 1:
                        settings = (_a.sent())[0];
                        return [2 /*return*/, settings || undefined];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateAdvancedCrashSettings = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, id, newSettings;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.advancedCrashSettings).limit(1)];
                    case 1:
                        existing = (_j.sent())[0];
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.advancedCrashSettings)
                                .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                                .where((0, drizzle_orm_1.eq)(schema_1.advancedCrashSettings.id, existing.id))
                                .returning()];
                    case 2:
                        updated = (_j.sent())[0];
                        return [2 /*return*/, updated];
                    case 3:
                        id = (0, crypto_1.randomUUID)();
                        return [4 /*yield*/, db_1.db
                                .insert(schema_1.advancedCrashSettings)
                                .values({
                                id: id,
                                deepThinkingEnabled: (_a = updates.deepThinkingEnabled) !== null && _a !== void 0 ? _a : true,
                                whaleTargetMinMultiplier: (_b = updates.whaleTargetMinMultiplier) !== null && _b !== void 0 ? _b : "1.01",
                                whaleTargetMaxMultiplier: (_c = updates.whaleTargetMaxMultiplier) !== null && _c !== void 0 ? _c : "1.04",
                                noBetBaitMinMultiplier: (_d = updates.noBetBaitMinMultiplier) !== null && _d !== void 0 ? _d : "7.00",
                                noBetBaitMaxMultiplier: (_e = updates.noBetBaitMaxMultiplier) !== null && _e !== void 0 ? _e : "20.00",
                                standardLossMaxThreshold: (_f = updates.standardLossMaxThreshold) !== null && _f !== void 0 ? _f : "2.00",
                                playerWinProbability: (_g = updates.playerWinProbability) !== null && _g !== void 0 ? _g : "40.00",
                                updatedBy: (_h = updates.updatedBy) !== null && _h !== void 0 ? _h : 'system',
                                createdAt: new Date(),
                                updatedAt: new Date()
                            })
                                .returning()];
                    case 4:
                        newSettings = (_j.sent())[0];
                        return [2 /*return*/, newSettings];
                }
            });
        });
    };
    return DatabaseStorage;
}());
exports.DatabaseStorage = DatabaseStorage;
// Simple in-memory storage implementation
var MemStorage = /** @class */ (function () {
    function MemStorage() {
        var _this = this;
        this.users = new Map();
        this.games = new Map();
        this.bets = new Map();
        this.transactions = new Map();
        this.referrals = new Map();
        this.adminActions = new Map();
        this.gameAnalytics = new Map();
        this.userSessions = new Map();
        this.deviceLogins = new Map();
        this.systemSettings = new Map();
        this.telegramAutoJoinChannels = new Map();
        this.agentProfiles = new Map();
        this.agentActivities = new Map();
        this.passkeys = new Map();
        this.goldenLiveStats = new Map();
        this.goldenLiveEvents = new Map();
        this.pageViews = new Map();
        this.vipSettings = new Map();
        this.notifications = new Map();
        this.pushSubscriptions = new Map();
        this.promoCodes = new Map();
        this.bettingTasks = new Map();
        this.userBettingTaskProgress = new Map();
        this.promoCodeRedemptions = new Map();
        this.predictedResults = new Map();
        this.supportChatSessions = new Map();
        this.supportChatMessages = new Map();
        this.quickReplies = new Map();
        this.telegramLoginSessions = new Map();
        this.depositRequests = new Map();
        this.crashSettings = new Map();
        this.advancedCrashSettings = new Map();
        this.telegramScheduledPostsMap = new Map();
        this.nextUserId = 1;
        this.nextGameId = 1;
        this.nextBetId = 1;
        this.nextTransactionId = 1;
        this.nextReferralId = 1;
        this.nextAdminActionId = 1;
        this.nextAnalyticsId = 1;
        this.nextSessionId = 1;
        this.nextDeviceLoginId = 1;
        this.nextAgentProfileId = 1;
        this.nextAgentActivityId = 1;
        this.nextPasskeyId = 1;
        this.nextGoldenLiveStatsId = 1;
        this.nextGoldenLiveEventId = 1;
        this.nextPageViewId = 1;
        this.nextVipSettingId = 1;
        this.nextNotificationId = 1;
        this.nextPromoCodeId = 1;
        this.nextPromoCodeRedemptionId = 1;
        this.nextPredictedResultId = 1;
        this.nextDepositRequestId = 1;
        this.hourlyTimer = null;
        // Coin flip game methods
        this.coinFlipGames = new Map();
        this.nextCoinFlipGameId = 1;
        // Withdrawal request methods
        this.withdrawalRequests = new Map();
        // VIP Level Telegram Links methods
        this.vipLevelTelegramLinks = new Map();
        this.nextVipTelegramLinkId = 1;
        this.initializeSystemSettings();
        this.initializeGoldenLive();
        this.initializeVipSettings();
        this.initializationPromise = this.initializeDefaultData().then(function () {
            _this.initializeTrafficData();
            _this.initializeCrashSettings();
            _this.initializeAdvancedCrashSettings();
        });
    }
    MemStorage.prototype.ensureInitialized = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initializationPromise];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.initializeSystemSettings = function () {
        var defaultSettings = [
            {
                id: 'setting-1',
                key: 'withdrawals_enabled',
                value: 'true',
                description: 'Controls whether users can access withdrawal functionality',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-2',
                key: 'house_profit_percentage',
                value: '20',
                description: 'Percentage of total bets that should result in house profit',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-3',
                key: 'referral_bonus_amount',
                value: '2.99000000',
                description: 'Amount of bonus (in USD) awarded to both referrer and referee on first deposit (2.99 USD = 299 coins)',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-4',
                key: 'betting_fee_percentage',
                value: '3',
                description: 'Fee percentage deducted from winnings on every bet',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-5',
                key: 'telegram_signals_enabled',
                value: 'true',
                description: 'Enable/Disable automatic Telegram signals for game periods',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-6',
                key: 'telegram_bot_token',
                value: '',
                description: 'Telegram Bot Token from @BotFather',
                isEncrypted: true,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-7',
                key: 'telegram_chat_id',
                value: '',
                description: 'Your Telegram Chat ID for withdrawal notifications',
                isEncrypted: false,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'setting-8',
                key: 'telegram_signal_chat_id',
                value: '',
                description: 'Telegram Channel/Group Chat ID for game signals',
                isEncrypted: true,
                lastUpdatedBy: 'system',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        for (var _i = 0, defaultSettings_2 = defaultSettings; _i < defaultSettings_2.length; _i++) {
            var setting = defaultSettings_2[_i];
            this.systemSettings.set(setting.id, setting);
        }
        console.log('✅ Default system settings initialized');
    };
    MemStorage.prototype.initializeDefaultData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var adminPasswordHash, adminPublicId, adminUser, demoCountries, demoIPs, i, playerPasswordHash, playerPublicId, playerUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bcrypt.hash('admin1234', 10)];
                    case 1:
                        adminPasswordHash = _a.sent();
                        adminPublicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        adminUser = {
                            id: 'admin-1',
                            publicId: adminPublicId,
                            email: 'pursuer.ail-4d@icloud.com',
                            passwordHash: adminPasswordHash,
                            withdrawalPasswordHash: null,
                            profilePhoto: null,
                            balance: "10000.00000000",
                            frozenBalance: "0.00000000",
                            accumulatedFee: "0.00000000",
                            role: "admin",
                            vipLevel: "vip5",
                            isActive: true,
                            referralCode: "ADMIN123",
                            referredBy: null,
                            referralLevel: 1,
                            totalDeposits: "10000.00000000",
                            totalWithdrawals: "0.00000000",
                            totalWinnings: "0.00000000",
                            totalLosses: "0.00000000",
                            totalCommission: "0.00000000",
                            lifetimeCommissionEarned: "0.00000000",
                            totalBetsAmount: "0.00000000",
                            dailyWagerAmount: "0.00000000",
                            lastWagerResetDate: new Date(),
                            remainingRequiredBetAmount: "0.00000000",
                            teamSize: 0,
                            totalTeamMembers: 0,
                            maxBetLimit: "10000.00000000",
                            twoFactorEnabled: false,
                            twoFactorSecret: null,
                            isBanned: false,
                            bannedUntil: null,
                            banReason: null,
                            registrationIp: '192.168.1.100',
                            registrationCountry: 'LK',
                            lastLoginIp: '192.168.1.100',
                            lastLoginDeviceModel: null,
                            lastLoginDeviceType: null,
                            lastLoginDeviceOs: null,
                            lastLoginBrowser: null,
                            telegramId: null,
                            telegramLinkToken: null,
                            telegramLinkExpiresAt: null,
                            telegramUsername: null,
                            telegramFirstName: null,
                            telegramPhotoUrl: null,
                            enableAnimations: true,
                            wingoMode: false,
                            lastWithdrawalRequestAt: null,
                            binanceId: null,
                            minDepositAmount: null,
                            maxDepositAmount: null,
                            isAcceptingDeposits: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.users.set(adminUser.id, adminUser);
                        console.log('✅ Default users initialized');
                        // Initialize VIP Telegram links
                        this.initializeVipTelegramLinks(adminUser.id);
                        demoCountries = ['IN', 'US', 'GB', 'AU', 'CA'];
                        demoIPs = ['192.168.1.10', '192.168.1.20', '192.168.1.30', '192.168.1.40', '192.168.1.50'];
                        i = 1;
                        _a.label = 2;
                    case 2:
                        if (!(i <= 5)) return [3 /*break*/, 5];
                        return [4 /*yield*/, bcrypt.hash('demo123', 10)];
                    case 3:
                        playerPasswordHash = _a.sent();
                        playerPublicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        playerUser = {
                            id: "player-".concat(i),
                            publicId: playerPublicId,
                            email: "player".concat(i, "@demo.com"),
                            passwordHash: playerPasswordHash,
                            withdrawalPasswordHash: null,
                            profilePhoto: null,
                            balance: "1000.00000000",
                            frozenBalance: "0.00000000",
                            accumulatedFee: "0.00000000",
                            role: "user",
                            vipLevel: "vip",
                            isActive: true,
                            referralCode: "DEMO".concat(i, "23"),
                            referredBy: null,
                            referralLevel: 1,
                            totalDeposits: "500.00000000",
                            totalWithdrawals: "0.00000000",
                            totalWinnings: "200.00000000",
                            totalLosses: "100.00000000",
                            totalCommission: "0.00000000",
                            lifetimeCommissionEarned: "0.00000000",
                            totalBetsAmount: "0.00000000",
                            dailyWagerAmount: "0.00000000",
                            lastWagerResetDate: new Date(),
                            remainingRequiredBetAmount: "0.00000000",
                            teamSize: 0,
                            totalTeamMembers: 0,
                            maxBetLimit: "500.00000000",
                            twoFactorEnabled: false,
                            twoFactorSecret: null,
                            isBanned: false,
                            bannedUntil: null,
                            banReason: null,
                            registrationIp: demoIPs[i - 1],
                            registrationCountry: demoCountries[i - 1],
                            lastLoginIp: demoIPs[i - 1],
                            lastLoginDeviceModel: null,
                            lastLoginDeviceType: null,
                            lastLoginDeviceOs: null,
                            lastLoginBrowser: null,
                            telegramId: null,
                            telegramLinkToken: null,
                            telegramLinkExpiresAt: null,
                            telegramUsername: null,
                            telegramFirstName: null,
                            telegramPhotoUrl: null,
                            enableAnimations: true,
                            wingoMode: false,
                            lastWithdrawalRequestAt: null,
                            binanceId: null,
                            minDepositAmount: "10.00",
                            maxDepositAmount: "10000.00",
                            isAcceptingDeposits: true,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.users.set(playerUser.id, playerUser);
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.initializeTrafficData = function () {
        var now = new Date();
        var devices = ['Desktop', 'Mobile', 'Tablet'];
        var countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Sri Lanka'];
        var browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
        var paths = ['/', '/games', '/deposit', '/withdraw', '/profile', '/history', '/referral'];
        // Generate page views for the last 7 days
        for (var dayOffset = 0; dayOffset < 7; dayOffset++) {
            var date = new Date(now);
            date.setDate(date.getDate() - dayOffset);
            // Generate 50-150 page views per day
            var pageViewsPerDay = Math.floor(Math.random() * 100) + 50;
            for (var i = 0; i < pageViewsPerDay; i++) {
                var id = "pageview-".concat(this.nextPageViewId++);
                var randomDevice = devices[Math.floor(Math.random() * devices.length)];
                var randomCountry = countries[Math.floor(Math.random() * countries.length)];
                var randomBrowser = browsers[Math.floor(Math.random() * browsers.length)];
                var randomPath = paths[Math.floor(Math.random() * paths.length)];
                // Randomize the time within the day
                var randomHour = Math.floor(Math.random() * 24);
                var randomMinute = Math.floor(Math.random() * 60);
                var pageViewDate = new Date(date);
                pageViewDate.setHours(randomHour, randomMinute, 0, 0);
                // Generate a random IP address
                var randomIP = "".concat(Math.floor(Math.random() * 255), ".").concat(Math.floor(Math.random() * 255), ".").concat(Math.floor(Math.random() * 255), ".").concat(Math.floor(Math.random() * 255));
                var pageView = {
                    id: id,
                    userId: null,
                    path: randomPath,
                    ipAddress: randomIP,
                    country: randomCountry,
                    userAgent: "Mozilla/5.0 (".concat(randomDevice, ")"),
                    browserName: randomBrowser,
                    deviceType: randomDevice,
                    deviceModel: null,
                    operatingSystem: randomDevice === 'Mobile' ? 'iOS' : 'Windows',
                    referrer: null,
                    sessionId: null,
                    createdAt: pageViewDate,
                };
                this.pageViews.set(id, pageView);
            }
        }
        console.log("\u2705 Demo traffic data initialized (".concat(this.pageViews.size, " page views)"));
    };
    MemStorage.prototype.initializeVipTelegramLinks = function (adminId) {
        var defaultTelegramLinks = [
            { vipLevel: 'lv1', telegramLink: 'https://t.me/+example_lv1', description: 'Level 1 Community Chat' },
            { vipLevel: 'lv2', telegramLink: 'https://t.me/+example_lv2', description: 'Level 2 VIP Chat' },
            { vipLevel: 'vip', telegramLink: 'https://t.me/+example_vip', description: 'VIP Exclusive Signals' },
            { vipLevel: 'vip1', telegramLink: 'https://t.me/+example_vip1', description: 'VIP 1 Premium Group' },
            { vipLevel: 'vip2', telegramLink: 'https://t.me/+example_vip2', description: 'VIP 2 Elite Signals' },
            { vipLevel: 'vip3', telegramLink: 'https://t.me/+example_vip3', description: 'VIP 3 Diamond Club' },
            { vipLevel: 'vip4', telegramLink: 'https://t.me/+example_vip4', description: 'VIP 4 Platinum Circle' },
            { vipLevel: 'vip5', telegramLink: 'https://t.me/+example_vip5', description: 'VIP 5 Master Traders' },
            { vipLevel: 'vip6', telegramLink: 'https://t.me/+example_vip6', description: 'VIP 6 Elite Masters' },
            { vipLevel: 'vip7', telegramLink: 'https://t.me/+example_vip7', description: 'VIP 7 Grand Masters' },
        ];
        for (var _i = 0, defaultTelegramLinks_2 = defaultTelegramLinks; _i < defaultTelegramLinks_2.length; _i++) {
            var linkData = defaultTelegramLinks_2[_i];
            var id = "vip-tg-link-".concat(this.nextVipTelegramLinkId++);
            var link = {
                id: id,
                vipLevel: linkData.vipLevel,
                telegramLink: linkData.telegramLink,
                description: linkData.description,
                isActive: true,
                updatedBy: adminId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.vipLevelTelegramLinks.set(id, link);
        }
        console.log('✅ Default VIP Telegram links initialized');
    };
    MemStorage.prototype.initializeVipSettings = function () {
        var vipLevels = [
            {
                key: 'lv1', order: 1, displayName: 'Level 1', teamRequirement: 0, depositRequirement: 0,
                maxBetLimit: 100, dailyWagerReward: 0.000,
                commissionRates: [0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.007, 0.005, 0.003]
            },
            {
                key: 'lv2', order: 2, displayName: 'Level 2', teamRequirement: 1, depositRequirement: 30,
                maxBetLimit: 500, dailyWagerReward: 0.0005,
                commissionRates: [0.065, 0.055, 0.045, 0.035, 0.025, 0.015, 0.01, 0.007, 0.005]
            },
            {
                key: 'vip', order: 3, displayName: 'VIP', teamRequirement: 7, depositRequirement: 300,
                maxBetLimit: 1000, dailyWagerReward: 0.001,
                commissionRates: [0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.005]
            },
            {
                key: 'vip1', order: 4, displayName: 'VIP 1', teamRequirement: 10, depositRequirement: 600,
                maxBetLimit: 2000, dailyWagerReward: 0.002,
                commissionRates: [0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01]
            },
            {
                key: 'vip2', order: 5, displayName: 'VIP 2', teamRequirement: 20, depositRequirement: 1000,
                maxBetLimit: 5000, dailyWagerReward: 0.003,
                commissionRates: [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02]
            },
            {
                key: 'vip3', order: 6, displayName: 'VIP 3', teamRequirement: 30, depositRequirement: 2000,
                maxBetLimit: 10000, dailyWagerReward: 0.004,
                commissionRates: [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03]
            },
            {
                key: 'vip4', order: 7, displayName: 'VIP 4', teamRequirement: 40, depositRequirement: 5000,
                maxBetLimit: 20000, dailyWagerReward: 0.005,
                commissionRates: [0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04]
            },
            {
                key: 'vip5', order: 8, displayName: 'VIP 5', teamRequirement: 50, depositRequirement: 10000,
                maxBetLimit: 50000, dailyWagerReward: 0.006,
                commissionRates: [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05]
            },
            {
                key: 'vip6', order: 9, displayName: 'VIP 6', teamRequirement: 60, depositRequirement: 20000,
                maxBetLimit: 100000, dailyWagerReward: 0.007,
                commissionRates: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06]
            },
            {
                key: 'vip7', order: 10, displayName: 'VIP 7', teamRequirement: 70, depositRequirement: 50000,
                maxBetLimit: 200000, dailyWagerReward: 0.008,
                commissionRates: [0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07]
            },
        ];
        for (var _i = 0, vipLevels_2 = vipLevels; _i < vipLevels_2.length; _i++) {
            var level = vipLevels_2[_i];
            var id = "vip-setting-".concat(this.nextVipSettingId++);
            var vipSetting = {
                id: id,
                levelKey: level.key,
                levelName: level.displayName,
                levelOrder: level.order,
                teamRequirement: level.teamRequirement,
                maxBet: level.maxBetLimit.toString() + '.00000000',
                dailyWagerReward: level.dailyWagerReward.toFixed(6),
                commissionRates: JSON.stringify(level.commissionRates),
                rechargeAmount: level.depositRequirement.toString() + '.00000000',
                telegramLink: null,
                supportEmail: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.vipSettings.set(id, vipSetting);
        }
        console.log('✅ Default VIP settings initialized');
    };
    // User methods
    MemStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.users.get(id)];
            });
        });
    };
    MemStorage.prototype.getUserByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.users.values()).find(function (user) { return user.email === email; })];
            });
        });
    };
    MemStorage.prototype.getUserByTelegramId = function (telegramId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.users.values()).find(function (user) { return user.telegramId === telegramId; })];
            });
        });
    };
    MemStorage.prototype.createTelegramLinkToken = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, expiryMinutes) {
            var token, expiresAt, user;
            if (expiryMinutes === void 0) { expiryMinutes = 5; }
            return __generator(this, function (_a) {
                token = Math.random().toString(36).substring(2, 10).toUpperCase();
                expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                user = this.users.get(userId);
                if (user) {
                    user.telegramLinkToken = token;
                    user.telegramLinkExpiresAt = expiresAt;
                    this.users.set(userId, user);
                }
                return [2 /*return*/, { token: token, expiresAt: expiresAt }];
            });
        });
    };
    MemStorage.prototype.getUserByLinkToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                if (!token)
                    return [2 /*return*/, undefined];
                user = Array.from(this.users.values()).find(function (u) { return u.telegramLinkToken === token; });
                if (!user)
                    return [2 /*return*/, undefined];
                if (user.telegramLinkExpiresAt && new Date(user.telegramLinkExpiresAt) < new Date()) {
                    return [2 /*return*/, undefined];
                }
                return [2 /*return*/, user];
            });
        });
    };
    MemStorage.prototype.linkTelegramAccount = function (userId, telegramData) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                user.telegramId = telegramData.id.toString();
                user.telegramUsername = telegramData.username || null;
                user.telegramFirstName = telegramData.first_name || null;
                user.telegramPhotoUrl = telegramData.photo_url || null;
                user.telegramLinkToken = null;
                user.telegramLinkExpiresAt = null;
                this.users.set(userId, user);
                return [2 /*return*/, user];
            });
        });
    };
    // Crash settings
    MemStorage.prototype.initializeCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                if (this.crashSettings.size === 0) {
                    id = (0, crypto_1.randomUUID)();
                    this.crashSettings.set(id, {
                        id: id,
                        houseEdge: "20.00",
                        maxMultiplier: "50.00",
                        minCrashMultiplier: "1.01",
                        minBetAmount: "50.00",
                        maxBetAmount: "10000.00",
                        crashEnabled: true,
                        updatedBy: 'system',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.initializeAdvancedCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_a) {
                if (this.advancedCrashSettings.size === 0) {
                    id = (0, crypto_1.randomUUID)();
                    this.advancedCrashSettings.set(id, {
                        id: id,
                        deepThinkingEnabled: false,
                        noBetBaitMinMultiplier: "7.00",
                        noBetBaitMaxMultiplier: "20.00",
                        whaleTargetMinMultiplier: "1.01",
                        whaleTargetMaxMultiplier: "1.04",
                        standardLossMaxThreshold: "2.00",
                        playerWinProbability: "40.00",
                        updatedBy: 'system',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.clearTelegramLinkToken = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                user.telegramLinkToken = null;
                user.telegramLinkExpiresAt = null;
                this.users.set(userId, user);
                return [2 /*return*/, user];
            });
        });
    };
    // Telegram login session methods - now using database for persistence
    MemStorage.prototype.createTelegramLoginSession = function (token_1) {
        return __awaiter(this, arguments, void 0, function (token, expiryMinutes) {
            var expiresAt;
            if (expiryMinutes === void 0) { expiryMinutes = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
                        return [4 /*yield*/, db_1.db.insert(schema_1.telegramLoginSessions).values({
                                token: token,
                                expiresAt: expiresAt,
                                userId: null
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.getTelegramLoginSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramLoginSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))
                            .limit(1)];
                    case 1:
                        session = (_a.sent())[0];
                        if (!session) {
                            return [2 /*return*/, undefined];
                        }
                        if (!(session.expiresAt < new Date())) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                                .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/, {
                            userId: session.userId || undefined,
                            expiresAt: session.expiresAt
                        }];
                }
            });
        });
    };
    MemStorage.prototype.completeTelegramLogin = function (token, userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.telegramLoginSessions)
                            .set({ userId: userId })
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.deleteTelegramLoginSession = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.telegramLoginSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramLoginSessions.token, token))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Telegram auto-join channels methods
    MemStorage.prototype.createTelegramAutoJoinChannel = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.insert(schema_1.telegramAutoJoinChannels)
                            .values(channel)
                            .returning()];
                    case 1:
                        created = (_a.sent())[0];
                        return [2 /*return*/, created];
                }
            });
        });
    };
    MemStorage.prototype.getTelegramAutoJoinChannels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.priority), (0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemStorage.prototype.getEnabledTelegramAutoJoinChannels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.isEnabled, true))
                            .orderBy((0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.priority), (0, drizzle_orm_1.asc)(schema_1.telegramAutoJoinChannels.createdAt))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemStorage.prototype.getTelegramAutoJoinChannel = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var channel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))
                            .limit(1)];
                    case 1:
                        channel = (_a.sent())[0];
                        return [2 /*return*/, channel];
                }
            });
        });
    };
    MemStorage.prototype.updateTelegramAutoJoinChannel = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.update(schema_1.telegramAutoJoinChannels)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    MemStorage.prototype.deleteTelegramAutoJoinChannel = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.delete(schema_1.telegramAutoJoinChannels)
                            .where((0, drizzle_orm_1.eq)(schema_1.telegramAutoJoinChannels.id, id))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    MemStorage.prototype.createUser = function (insertUser, registrationIp, registrationCountry) {
        return __awaiter(this, void 0, void 0, function () {
            var id, passwordHash, referralCode, publicId, referrerId, referrer, user, _a, referralId, referral, referrerUser;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        id = "user-".concat(this.nextUserId++);
                        return [4 /*yield*/, bcrypt.hash(insertUser.password, 10)];
                    case 1:
                        passwordHash = _c.sent();
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        referrerId = null;
                        if (insertUser.referralCode) {
                            referrer = Array.from(this.users.values()).find(function (user) { return user.referralCode === insertUser.referralCode; });
                            if (referrer) {
                                referrerId = referrer.id;
                            }
                        }
                        _b = {
                            id: id,
                            publicId: publicId,
                            email: insertUser.email,
                            passwordHash: passwordHash
                        };
                        if (!insertUser.withdrawalPassword) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.hash(insertUser.withdrawalPassword, 10)];
                    case 2:
                        _a = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = null;
                        _c.label = 4;
                    case 4:
                        user = (_b.withdrawalPasswordHash = _a,
                            _b.profilePhoto = null,
                            _b.referralCode = referralCode,
                            _b.referredBy = referrerId,
                            _b.referralLevel = 1,
                            _b.balance = "0.09000000",
                            _b.frozenBalance = "0.00000000",
                            _b.accumulatedFee = "0.00000000",
                            _b.role = "user",
                            _b.vipLevel = "lv1",
                            _b.isActive = true,
                            _b.registrationIp = registrationIp || null,
                            _b.registrationCountry = registrationCountry || null,
                            _b.lastLoginIp = registrationIp || null,
                            _b.lastLoginDeviceModel = null,
                            _b.lastLoginDeviceType = null,
                            _b.lastLoginDeviceOs = null,
                            _b.lastLoginBrowser = null,
                            _b.telegramId = insertUser.telegramId || null,
                            _b.telegramLinkToken = null,
                            _b.telegramLinkExpiresAt = null,
                            _b.telegramUsername = null,
                            _b.telegramFirstName = null,
                            _b.telegramPhotoUrl = null,
                            _b.maxBetLimit = "10.00000000",
                            _b.totalDeposits = "0.00000000",
                            _b.totalWithdrawals = "0.00000000",
                            _b.totalWinnings = "0.00000000",
                            _b.totalLosses = "0.00000000",
                            _b.totalCommission = "0.00000000",
                            _b.lifetimeCommissionEarned = "0.00000000",
                            _b.totalBetsAmount = "0.00000000",
                            _b.dailyWagerAmount = "0.00000000",
                            _b.lastWagerResetDate = new Date(),
                            _b.remainingRequiredBetAmount = "0.00000000",
                            _b.teamSize = 0,
                            _b.totalTeamMembers = 0,
                            _b.twoFactorEnabled = false,
                            _b.twoFactorSecret = null,
                            _b.isBanned = false,
                            _b.bannedUntil = null,
                            _b.banReason = null,
                            _b.enableAnimations = true,
                            _b.wingoMode = false,
                            _b.lastWithdrawalRequestAt = null,
                            _b.binanceId = null,
                            _b.minDepositAmount = "10.00",
                            _b.maxDepositAmount = "10000.00",
                            _b.isAcceptingDeposits = true,
                            _b.createdAt = new Date(),
                            _b.updatedAt = new Date(),
                            _b);
                        this.users.set(id, user);
                        // If user was referred, create referral record and award bonus coins to both parties
                        if (referrerId) {
                            try {
                                referralId = "referral-".concat(this.nextReferralId++);
                                referral = {
                                    id: referralId,
                                    referrerId: referrerId,
                                    referredId: user.id,
                                    referralLevel: 1,
                                    commissionRate: "0.0600", // 6% default for Level 1
                                    totalCommission: "0.00000000",
                                    hasDeposited: false,
                                    status: "active",
                                    createdAt: new Date()
                                };
                                this.referrals.set(referralId, referral);
                                referrerUser = this.users.get(referrerId);
                                if (referrerUser) {
                                    this.users.set(referrerId, __assign(__assign({}, referrerUser), { totalTeamMembers: (referrerUser.totalTeamMembers || 0) + 1, updatedAt: new Date() }));
                                }
                                // Bonus will be awarded to referrer only when new user makes first deposit >= $10
                            }
                            catch (error) {
                                console.error('Error processing referral bonus:', error);
                                // Continue with user creation even if referral bonus fails
                            }
                        }
                        return [2 /*return*/, user];
                }
            });
        });
    };
    MemStorage.prototype.validateUser = function (credentials) {
        return __awaiter(this, void 0, void 0, function () {
            var user, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getUserByEmail(credentials.email)];
                    case 1:
                        user = _b.sent();
                        _a = user;
                        if (!_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.compare(credentials.password, user.passwordHash)];
                    case 2:
                        _a = (_b.sent());
                        _b.label = 3;
                    case 3:
                        if (_a) {
                            return [2 /*return*/, user];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    MemStorage.prototype.updateUser = function (userId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var user, updatedUser;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                updatedUser = __assign(__assign(__assign({}, user), updates), { updatedAt: new Date() });
                this.users.set(userId, updatedUser);
                return [2 /*return*/, updatedUser];
            });
        });
    };
    MemStorage.prototype.updateUserBalance = function (userId, newBalance) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.updateUser(userId, { balance: newBalance })];
            });
        });
    };
    MemStorage.prototype.atomicDeductBalance = function (userId, amount, options) {
        return __awaiter(this, void 0, void 0, function () {
            var deductAmount, user, currentBalance, newBalance, currentTotalBets, newTotalBets, currentDailyWager, newDailyWager, updatedUser;
            return __generator(this, function (_a) {
                try {
                    deductAmount = parseFloat(amount);
                    // Validation
                    if (isNaN(deductAmount) || deductAmount <= 0) {
                        return [2 /*return*/, { success: false, error: 'Invalid amount' }];
                    }
                    user = this.users.get(userId);
                    if (!user) {
                        return [2 /*return*/, { success: false, error: 'User not found' }];
                    }
                    currentBalance = parseFloat(user.balance);
                    if (currentBalance < deductAmount) {
                        return [2 /*return*/, { success: false, error: 'Insufficient balance' }];
                    }
                    newBalance = (currentBalance - deductAmount).toFixed(8);
                    currentTotalBets = parseFloat(user.totalBetsAmount || '0');
                    newTotalBets = (options === null || options === void 0 ? void 0 : options.incrementTotalBets)
                        ? (currentTotalBets + deductAmount).toFixed(8)
                        : user.totalBetsAmount;
                    currentDailyWager = parseFloat(user.dailyWagerAmount || '0');
                    newDailyWager = (options === null || options === void 0 ? void 0 : options.incrementDailyWager)
                        ? (currentDailyWager + deductAmount).toFixed(8)
                        : user.dailyWagerAmount;
                    updatedUser = __assign(__assign({}, user), { balance: newBalance, totalBetsAmount: newTotalBets, dailyWagerAmount: newDailyWager, updatedAt: new Date() });
                    this.users.set(userId, updatedUser);
                    return [2 /*return*/, { success: true, user: updatedUser }];
                }
                catch (error) {
                    console.error('Atomic balance deduction error:', error);
                    return [2 /*return*/, { success: false, error: 'Internal error' }];
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.atomicIncrementBalance = function (userId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var incrementAmount, user, currentBalance, newBalance, updatedUser;
            return __generator(this, function (_a) {
                try {
                    incrementAmount = parseFloat(amount);
                    // Validation
                    if (isNaN(incrementAmount) || incrementAmount <= 0) {
                        return [2 /*return*/, { success: false, error: 'Invalid amount' }];
                    }
                    user = this.users.get(userId);
                    if (!user) {
                        return [2 /*return*/, { success: false, error: 'User not found' }];
                    }
                    currentBalance = parseFloat(user.balance);
                    newBalance = (currentBalance + incrementAmount).toFixed(8);
                    updatedUser = __assign(__assign({}, user), { balance: newBalance, updatedAt: new Date() });
                    this.users.set(userId, updatedUser);
                    return [2 /*return*/, { success: true, user: updatedUser }];
                }
                catch (error) {
                    console.error('Atomic balance increment error:', error);
                    return [2 /*return*/, { success: false, error: 'Internal error' }];
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.generateReferralCode = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var referralCode;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        return [4 /*yield*/, this.updateUser(userId, { referralCode: referralCode })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, referralCode];
                }
            });
        });
    };
    MemStorage.prototype.getUsersByRegistrationIp = function (ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!ipAddress)
                    return [2 /*return*/, []];
                return [2 /*return*/, Array.from(this.users.values()).filter(function (user) { return user.registrationIp === ipAddress; })];
            });
        });
    };
    // Placeholder implementations for all other methods
    MemStorage.prototype.getAllUsers = function (page, limit) {
        return __awaiter(this, void 0, void 0, function () {
            var userList;
            return __generator(this, function (_a) {
                userList = Array.from(this.users.values());
                return [2 /*return*/, { users: userList, total: userList.length }];
            });
        });
    };
    MemStorage.prototype.toggleUserStatus = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                return [2 /*return*/, this.updateUser(userId, { isActive: !user.isActive })];
            });
        });
    };
    MemStorage.prototype.banUser = function (userId, reason, bannedUntil) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                return [2 /*return*/, this.updateUser(userId, {
                        isBanned: true,
                        bannedUntil: bannedUntil || null,
                        banReason: reason,
                        isActive: false
                    })];
            });
        });
    };
    MemStorage.prototype.unbanUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                return [2 /*return*/, this.updateUser(userId, {
                        isBanned: false,
                        bannedUntil: null,
                        banReason: null,
                        isActive: true
                    })];
            });
        });
    };
    MemStorage.prototype.deleteUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.users.has(userId))
                    return [2 /*return*/, false];
                this.users.delete(userId);
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.adjustUserBalance = function (userId, amount, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, currentBalance, adjustment, newBalance;
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user)
                    return [2 /*return*/, undefined];
                currentBalance = parseFloat(user.balance);
                adjustment = parseFloat(amount);
                newBalance = (currentBalance + adjustment).toFixed(8);
                return [2 /*return*/, this.updateUser(userId, { balance: newBalance })];
            });
        });
    };
    MemStorage.prototype.createGame = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newGame;
            return __generator(this, function (_a) {
                id = game.gameId;
                newGame = {
                    id: id,
                    gameId: game.gameId,
                    gameType: game.gameType || "color",
                    roundDuration: game.roundDuration,
                    startTime: game.startTime,
                    endTime: game.endTime,
                    status: game.status || "active",
                    result: null,
                    resultColor: null,
                    resultSize: null,
                    // Crash game specific fields
                    crashPoint: game.crashPoint || null,
                    currentMultiplier: game.currentMultiplier || "1.00",
                    crashedAt: game.crashedAt || null,
                    manualResult: null,
                    isManuallyControlled: game.isManuallyControlled || false,
                    totalBetsAmount: "0.00000000",
                    totalPayouts: "0.00000000",
                    houseProfit: "0.00000000",
                    createdAt: new Date()
                };
                // Store games by gameId (not id) for easier lookup
                this.games.set(game.gameId, newGame);
                return [2 /*return*/, newGame];
            });
        });
    };
    MemStorage.prototype.getActiveGame = function (roundDuration) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.games.values()).find(function (game) { return game.status === "active"; })];
            });
        });
    };
    MemStorage.prototype.updateGameResult = function (gameId, result, resultColor, resultSize) {
        return __awaiter(this, void 0, void 0, function () {
            var game, updatedGame;
            return __generator(this, function (_a) {
                game = this.games.get(gameId);
                if (!game)
                    return [2 /*return*/, undefined];
                updatedGame = __assign(__assign({}, game), { result: result, resultColor: resultColor, resultSize: resultSize, status: "completed", updatedAt: new Date() });
                this.games.set(gameId, updatedGame);
                return [2 /*return*/, updatedGame];
            });
        });
    };
    // Simplified implementations for remaining methods
    MemStorage.prototype.setManualGameResult = function (gameId, result, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var game, updatedGame;
            return __generator(this, function (_a) {
                game = Array.from(this.games.values()).find(function (g) { return g.gameId === gameId; });
                if (!game)
                    return [2 /*return*/, undefined];
                updatedGame = __assign(__assign({}, game), { manualResult: result, isManuallyControlled: true, updatedAt: new Date() });
                this.games.set(game.id, updatedGame);
                console.log("\uD83C\uDFAF Manual result ".concat(result, " scheduled for game ").concat(gameId, " (MemStorage)"));
                return [2 /*return*/, updatedGame];
            });
        });
    };
    MemStorage.prototype.getGameHistory = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.games.values())
                        .filter(function (game) {
                        return game.status === "completed" &&
                            game.result !== null &&
                            game.result !== undefined &&
                            game.result >= 1 &&
                            game.result <= 9;
                    })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })
                        .slice(0, limit || 50)];
            });
        });
    };
    MemStorage.prototype.getGameById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.games.get(id)];
            });
        });
    };
    MemStorage.prototype.getGameByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Search through all games to find one with matching gameId
                return [2 /*return*/, Array.from(this.games.values()).find(function (game) { return game.gameId === gameId; })];
            });
        });
    };
    MemStorage.prototype.updateGameStats = function (gameId, stats) {
        return __awaiter(this, void 0, void 0, function () {
            var game, updatedGame;
            return __generator(this, function (_a) {
                game = this.games.get(gameId);
                if (!game)
                    return [2 /*return*/, undefined];
                updatedGame = __assign(__assign(__assign({}, game), stats), { updatedAt: new Date() });
                this.games.set(gameId, updatedGame);
                return [2 /*return*/, updatedGame];
            });
        });
    };
    // Bet methods (simplified)
    MemStorage.prototype.createBet = function (bet, maxBetLimit) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, existingTotal, newTotal, id, newBet;
            return __generator(this, function (_a) {
                // If maxBetLimit is provided, check total bets for this period
                if (maxBetLimit !== undefined) {
                    userBets = Array.from(this.bets.values()).filter(function (b) { return b.userId === bet.userId && b.gameId === bet.gameId; });
                    existingTotal = userBets.reduce(function (sum, b) { return sum + parseFloat(b.amount); }, 0);
                    newTotal = existingTotal + parseFloat(bet.amount);
                    if (newTotal > maxBetLimit) {
                        throw new Error("Your reached maximum bet limit for this period");
                    }
                }
                id = "bet-".concat(this.nextBetId++);
                newBet = {
                    id: id,
                    userId: bet.userId,
                    gameId: bet.gameId,
                    amount: bet.amount,
                    potential: bet.potential,
                    actualPayout: null,
                    betType: bet.betType,
                    betValue: bet.betValue,
                    status: "pending",
                    // Crash game specific fields
                    cashOutMultiplier: bet.cashOutMultiplier || null,
                    autoCashOut: bet.autoCashOut || null,
                    cashedOutAt: bet.cashedOutAt || null,
                    createdAt: new Date(),
                    updatedAt: null
                };
                this.bets.set(id, newBet);
                return [2 /*return*/, newBet];
            });
        });
    };
    MemStorage.prototype.createBetAndUpdateBalance = function (bet, newBalance, maxBetLimit, newAccumulatedFee) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, existingTotal, newTotal, id, newBet, user, currentRemaining, betAmount, newRemaining, updateData;
            return __generator(this, function (_a) {
                // Atomic operation: check limit + create bet + update balance
                if (maxBetLimit !== undefined) {
                    userBets = Array.from(this.bets.values()).filter(function (b) { return b.userId === bet.userId && b.gameId === bet.gameId; });
                    existingTotal = userBets.reduce(function (sum, b) { return sum + parseFloat(b.amount); }, 0);
                    newTotal = existingTotal + parseFloat(bet.amount);
                    if (newTotal > maxBetLimit) {
                        throw new Error("Your reached maximum bet limit for this period");
                    }
                }
                id = "bet-".concat(this.nextBetId++);
                newBet = {
                    id: id,
                    userId: bet.userId,
                    gameId: bet.gameId,
                    amount: bet.amount,
                    potential: bet.potential,
                    actualPayout: null,
                    betType: bet.betType,
                    betValue: bet.betValue,
                    status: "pending",
                    cashOutMultiplier: bet.cashOutMultiplier || null,
                    autoCashOut: bet.autoCashOut || null,
                    cashedOutAt: bet.cashedOutAt || null,
                    createdAt: new Date(),
                    updatedAt: null
                };
                this.bets.set(id, newBet);
                user = this.users.get(bet.userId);
                if (user) {
                    currentRemaining = parseFloat(user.remainingRequiredBetAmount || '0');
                    betAmount = parseFloat(bet.amount);
                    newRemaining = Math.max(0, currentRemaining - betAmount).toFixed(8);
                    updateData = __assign(__assign({}, user), { balance: newBalance, remainingRequiredBetAmount: newRemaining, updatedAt: new Date() });
                    // Only update accumulatedFee if provided
                    if (newAccumulatedFee !== undefined) {
                        updateData.accumulatedFee = newAccumulatedFee;
                    }
                    this.users.set(bet.userId, updateData);
                }
                return [2 /*return*/, newBet];
            });
        });
    };
    MemStorage.prototype.getBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bets.values()).filter(function (bet) { return bet.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.getBetsByGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bets.values()).filter(function (bet) { return bet.gameId === gameId; })];
            });
        });
    };
    MemStorage.prototype.getUserTotalBetAmountForGame = function (userId, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, total;
            return __generator(this, function (_a) {
                userBets = Array.from(this.bets.values()).filter(function (bet) { return bet.userId === userId && bet.gameId === gameId; });
                total = userBets.reduce(function (sum, bet) { return sum + parseFloat(bet.amount); }, 0);
                return [2 /*return*/, total];
            });
        });
    };
    MemStorage.prototype.updateBetStatus = function (betId, status, actualPayout) {
        return __awaiter(this, void 0, void 0, function () {
            var bet, updatedBet;
            return __generator(this, function (_a) {
                bet = this.bets.get(betId);
                if (!bet)
                    return [2 /*return*/, undefined];
                updatedBet = __assign(__assign({}, bet), { status: status, updatedAt: new Date() });
                if (actualPayout !== undefined) {
                    updatedBet.actualPayout = actualPayout;
                }
                this.bets.set(betId, updatedBet);
                return [2 /*return*/, updatedBet];
            });
        });
    };
    MemStorage.prototype.getActiveBetsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var activeBets;
            var _this = this;
            return __generator(this, function (_a) {
                activeBets = Array.from(this.bets.values()).filter(function (bet) { return bet.userId === userId && bet.status === 'pending'; });
                return [2 /*return*/, activeBets.map(function (bet) {
                        var game = _this.games.get(bet.gameId);
                        return __assign(__assign({}, bet), { periodId: (game === null || game === void 0 ? void 0 : game.gameId) || null });
                    })];
            });
        });
    };
    MemStorage.prototype.getAllPendingBets = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bets.values())
                        .filter(function (bet) { return bet.status === 'pending'; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.getStuckPendingBets = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var timestampMs;
            return __generator(this, function (_a) {
                timestampMs = Date.now() - (minutesAgo * 60 * 1000);
                return [2 /*return*/, Array.from(this.bets.values())
                        .filter(function (bet) { return bet.status === 'pending' && bet.createdAt.getTime() < timestampMs; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })];
            });
        });
    };
    // Crash game specific bet methods
    MemStorage.prototype.updateBetForCashout = function (betId, cashOutMultiplier, cashedOutAt) {
        return __awaiter(this, void 0, void 0, function () {
            var bet, updatedBet;
            return __generator(this, function (_a) {
                bet = this.bets.get(betId);
                if (!bet)
                    return [2 /*return*/, undefined];
                updatedBet = __assign(__assign({}, bet), { status: "cashed_out", cashOutMultiplier: cashOutMultiplier, cashedOutAt: cashedOutAt, updatedAt: cashedOutAt });
                this.bets.set(betId, updatedBet);
                return [2 /*return*/, updatedBet];
            });
        });
    };
    MemStorage.prototype.updateBetIfPending = function (betId, newStatus, additionalUpdates) {
        return __awaiter(this, void 0, void 0, function () {
            var bet, updatedBet;
            return __generator(this, function (_a) {
                bet = this.bets.get(betId);
                if (!bet || bet.status !== 'pending')
                    return [2 /*return*/, false];
                updatedBet = __assign(__assign(__assign({}, bet), { status: newStatus, updatedAt: new Date() }), additionalUpdates);
                this.bets.set(betId, updatedBet);
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.getUserActiveCrashBet = function (userId, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets;
            return __generator(this, function (_a) {
                userBets = Array.from(this.bets.values()).filter(function (bet) {
                    return bet.userId === userId &&
                        bet.gameId === gameId &&
                        bet.betType === 'crash' &&
                        bet.status === 'pending';
                });
                return [2 /*return*/, userBets[0]]; // Return first active crash bet for this user/game
            });
        });
    };
    MemStorage.prototype.cleanupUserBetHistory = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userBets, toDelete;
            var _this = this;
            return __generator(this, function (_a) {
                userBets = Array.from(this.bets.values())
                    .filter(function (bet) { return bet.userId === userId && bet.betType === 'crash'; })
                    .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                if (userBets.length > 100) {
                    toDelete = userBets.slice(100);
                    toDelete.forEach(function (bet) { return _this.bets.delete(bet.id); });
                    console.log("\uD83E\uDDF9 [MEM-CLEANUP] Removed ".concat(toDelete.length, " old crash bets for user ").concat(userId));
                }
                return [2 /*return*/];
            });
        });
    };
    // Stub implementations for remaining methods
    MemStorage.prototype.createReferral = function (referral) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newReferral;
            return __generator(this, function (_a) {
                id = "ref-".concat(this.nextReferralId++);
                newReferral = {
                    id: id,
                    referrerId: referral.referrerId,
                    referredId: referral.referredId,
                    referralLevel: referral.referralLevel || 1,
                    commissionRate: referral.commissionRate || "0.0600",
                    totalCommission: "0.00000000",
                    hasDeposited: referral.hasDeposited || false,
                    status: referral.status || "active",
                    createdAt: new Date()
                };
                this.referrals.set(id, newReferral);
                return [2 /*return*/, newReferral];
            });
        });
    };
    MemStorage.prototype.getReferralsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.referrals.values()).filter(function (ref) { return ref.referrerId === userId; })];
            });
        });
    };
    MemStorage.prototype.updateReferralCommission = function (referralId, commission) {
        return __awaiter(this, void 0, void 0, function () {
            var referral, updated;
            return __generator(this, function (_a) {
                referral = this.referrals.get(referralId);
                if (!referral)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, referral), { totalCommission: commission });
                this.referrals.set(referralId, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.updateReferralHasDeposited = function (referralId, hasDeposited) {
        return __awaiter(this, void 0, void 0, function () {
            var referral, updated;
            return __generator(this, function (_a) {
                referral = this.referrals.get(referralId);
                if (!referral)
                    return [2 /*return*/, undefined];
                // Atomic check: only update if currently false (prevents race conditions)
                if (referral.hasDeposited === true) {
                    return [2 /*return*/, undefined]; // Already deposited, don't update
                }
                updated = __assign(__assign({}, referral), { hasDeposited: hasDeposited });
                this.referrals.set(referralId, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.getReferralStats = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userReferrals, totalReferrals, totalCommission;
            return __generator(this, function (_a) {
                userReferrals = Array.from(this.referrals.values()).filter(function (ref) { return ref.referrerId === userId; });
                totalReferrals = userReferrals.length;
                totalCommission = userReferrals.reduce(function (sum, ref) {
                    return (parseFloat(sum) + parseFloat(ref.totalCommission || "0")).toFixed(8);
                }, "0.00000000");
                return [2 /*return*/, { totalReferrals: totalReferrals, totalCommission: totalCommission }];
            });
        });
    };
    MemStorage.prototype.createTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newTransaction;
            return __generator(this, function (_a) {
                id = "txn-".concat(this.nextTransactionId++);
                newTransaction = {
                    id: id,
                    userId: transaction.userId,
                    agentId: transaction.agentId || null,
                    type: transaction.type,
                    fiatAmount: transaction.fiatAmount || null,
                    cryptoAmount: transaction.cryptoAmount || null,
                    fiatCurrency: transaction.fiatCurrency || "USD",
                    cryptoCurrency: transaction.cryptoCurrency || null,
                    status: transaction.status || "pending",
                    paymentMethod: transaction.paymentMethod,
                    externalId: transaction.externalId || null,
                    paymentAddress: transaction.paymentAddress || null,
                    txHash: transaction.txHash || null,
                    fee: transaction.fee || "0.00000000",
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.transactions.set(id, newTransaction);
                return [2 /*return*/, newTransaction];
            });
        });
    };
    MemStorage.prototype.getTransactionsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.transactions.values()).filter(function (tx) { return tx.userId === userId; }).sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })];
            });
        });
    };
    MemStorage.prototype.getTransactionByExternalId = function (externalId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.transactions.values()).find(function (tx) { return tx.externalId === externalId; })];
            });
        });
    };
    MemStorage.prototype.getTransactionById = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.transactions.get(transactionId)];
            });
        });
    };
    MemStorage.prototype.updateTransactionStatus = function (transactionId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction, updatedTransaction, depositAmount, referral, updatedReferral, referrer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        transaction = this.transactions.get(transactionId);
                        if (!transaction)
                            return [2 /*return*/, undefined];
                        updatedTransaction = __assign(__assign({}, transaction), { status: status, updatedAt: new Date() });
                        this.transactions.set(transactionId, updatedTransaction);
                        if (!(status === "completed" && transaction.type === "deposit")) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.updateUserVipLevel(transaction.userId)];
                    case 1:
                        _a.sent();
                        depositAmount = parseFloat(transaction.fiatAmount || "0");
                        if (!(depositAmount >= 10)) return [3 /*break*/, 5];
                        referral = Array.from(this.referrals.values()).find(function (ref) { return ref.referredId === transaction.userId; });
                        if (!(referral && !referral.hasDeposited)) return [3 /*break*/, 5];
                        updatedReferral = __assign(__assign({}, referral), { hasDeposited: true });
                        this.referrals.set(referral.id, updatedReferral);
                        return [4 /*yield*/, this.getUser(referral.referrerId)];
                    case 2:
                        referrer = _a.sent();
                        if (!referrer) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.updateUser(referral.referrerId, {
                                teamSize: (referrer.teamSize || 0) + 1
                            })];
                    case 3:
                        _a.sent();
                        // Update referrer's VIP level based on new teamSize
                        return [4 /*yield*/, this.updateUserVipLevel(referral.referrerId)];
                    case 4:
                        // Update referrer's VIP level based on new teamSize
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, updatedTransaction];
                }
            });
        });
    };
    MemStorage.prototype.updateTransactionStatusConditional = function (transactionId, newStatus, currentStatus) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction, updatedTransaction;
            return __generator(this, function (_a) {
                transaction = this.transactions.get(transactionId);
                if (!transaction || transaction.status !== currentStatus)
                    return [2 /*return*/, undefined];
                updatedTransaction = __assign(__assign({}, transaction), { status: newStatus, updatedAt: new Date() });
                this.transactions.set(transactionId, updatedTransaction);
                return [2 /*return*/, updatedTransaction];
            });
        });
    };
    MemStorage.prototype.getPendingTransactions = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, []];
        }); });
    };
    MemStorage.prototype.createCoinFlipGame = function (game) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newGame;
            var _a;
            return __generator(this, function (_b) {
                id = "coinflip-".concat(this.nextCoinFlipGameId++);
                newGame = __assign(__assign({ id: id }, game), { winAmount: (_a = game.winAmount) !== null && _a !== void 0 ? _a : null, createdAt: new Date() });
                this.coinFlipGames.set(id, newGame);
                return [2 /*return*/, newGame];
            });
        });
    };
    MemStorage.prototype.getCoinFlipGamesByUser = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.coinFlipGames.values())
                        .filter(function (game) { return game.userId === userId; })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })
                        .slice(0, limit)];
            });
        });
    };
    MemStorage.prototype.getUsersWithRecentActivity = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime, userIdsWithActivity, _i, _a, tx;
            var _this = this;
            return __generator(this, function (_b) {
                cutoffTime = Date.now() - minutesAgo * 60 * 1000;
                userIdsWithActivity = new Set();
                for (_i = 0, _a = Array.from(this.transactions.values()); _i < _a.length; _i++) {
                    tx = _a[_i];
                    if (tx.createdAt.getTime() >= cutoffTime) {
                        userIdsWithActivity.add(tx.userId);
                    }
                }
                return [2 /*return*/, Array.from(userIdsWithActivity)
                        .map(function (id) { return _this.users.get(id); })
                        .filter(function (u) { return u !== undefined; })];
            });
        });
    };
    MemStorage.prototype.getRecentDeposits = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                cutoffTime = Date.now() - minutesAgo * 60 * 1000;
                return [2 /*return*/, Array.from(this.transactions.values())
                        .filter(function (tx) { return tx.type === 'deposit' && tx.createdAt.getTime() >= cutoffTime; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.getRecentWithdrawals = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                cutoffTime = Date.now() - minutesAgo * 60 * 1000;
                return [2 /*return*/, Array.from(this.transactions.values())
                        .filter(function (tx) { return tx.type === 'withdrawal' && tx.createdAt.getTime() >= cutoffTime; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.getRecentTransactions = function (minutesAgo) {
        return __awaiter(this, void 0, void 0, function () {
            var cutoffTime;
            return __generator(this, function (_a) {
                cutoffTime = Date.now() - minutesAgo * 60 * 1000;
                return [2 /*return*/, Array.from(this.transactions.values())
                        .filter(function (tx) { return tx.createdAt.getTime() >= cutoffTime; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })
                        .slice(0, 100)];
            });
        });
    };
    MemStorage.prototype.logAdminAction = function (action) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newAction;
            return __generator(this, function (_a) {
                id = "admin-".concat(this.nextAdminActionId++);
                newAction = {
                    id: id,
                    adminId: action.adminId,
                    action: action.action,
                    targetId: action.targetId || null,
                    details: action.details,
                    createdAt: new Date()
                };
                this.adminActions.set(id, newAction);
                return [2 /*return*/, newAction];
            });
        });
    };
    MemStorage.prototype.getAdminActions = function (page, limit) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, { actions: [], total: 0 }];
        }); });
    };
    MemStorage.prototype.createGameAnalytics = function (analytics) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newAnalytics;
            return __generator(this, function (_a) {
                id = "analytics-".concat(this.nextAnalyticsId++);
                newAnalytics = {
                    id: id,
                    gameId: analytics.gameId,
                    totalPlayers: analytics.totalPlayers || 0,
                    totalBets: analytics.totalBets || 0,
                    totalVolume: analytics.totalVolume || "0.00000000",
                    houseEdge: analytics.houseEdge || "0.0500",
                    actualProfit: analytics.actualProfit || "0.00000000",
                    expectedProfit: analytics.expectedProfit || "0.00000000",
                    profitMargin: analytics.profitMargin || "0.0000",
                    createdAt: new Date()
                };
                this.gameAnalytics.set(id, newAnalytics);
                return [2 /*return*/, newAnalytics];
            });
        });
    };
    MemStorage.prototype.updateGameAnalytics = function (gameId, updates) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); });
    };
    MemStorage.prototype.getAnalyticsByGame = function (gameId) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); });
    };
    MemStorage.prototype.getOverallAnalytics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var completedGames, totalGames, totalVolume, totalProfit, _i, completedGames_1, game, totalBets, averageBetSize;
            return __generator(this, function (_a) {
                completedGames = Array.from(this.games.values()).filter(function (g) { return g.status === 'completed'; });
                totalGames = completedGames.length;
                totalVolume = 0;
                totalProfit = 0;
                // Calculate totals from completed games
                for (_i = 0, completedGames_1 = completedGames; _i < completedGames_1.length; _i++) {
                    game = completedGames_1[_i];
                    if (game.totalBetsAmount) {
                        totalVolume += parseFloat(game.totalBetsAmount);
                    }
                    if (game.houseProfit) {
                        totalProfit += parseFloat(game.houseProfit);
                    }
                }
                totalBets = this.bets.size;
                averageBetSize = totalBets > 0
                    ? (totalVolume / totalBets).toFixed(8)
                    : "0.00000000";
                return [2 /*return*/, {
                        totalGames: totalGames,
                        totalBets: totalBets,
                        totalVolume: totalVolume.toFixed(8),
                        totalProfit: totalProfit.toFixed(8),
                        averageBetSize: averageBetSize
                    }];
            });
        });
    };
    MemStorage.prototype.createUserSession = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newSession;
            return __generator(this, function (_a) {
                id = "session-".concat(this.nextSessionId++);
                newSession = {
                    id: id,
                    userId: session.userId,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent || null,
                    browserName: session.browserName || null,
                    browserVersion: session.browserVersion || null,
                    deviceType: session.deviceType || null,
                    deviceModel: session.deviceModel || null,
                    operatingSystem: session.operatingSystem || null,
                    loginTime: new Date(),
                    logoutTime: session.logoutTime || null,
                    isActive: session.isActive !== undefined ? session.isActive : true
                };
                this.userSessions.set(id, newSession);
                return [2 /*return*/, newSession];
            });
        });
    };
    MemStorage.prototype.getUserSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.userSessions.values()).filter(function (session) { return session.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.updateSessionStatus = function (sessionId, isActive) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); });
    };
    // Device login tracking methods (simple implementation for MemStorage)
    MemStorage.prototype.createDeviceLogin = function (deviceLogin) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newDeviceLogin;
            return __generator(this, function (_a) {
                id = "device-login-".concat(this.nextDeviceLoginId++);
                newDeviceLogin = {
                    id: id,
                    userId: deviceLogin.userId,
                    deviceFingerprint: deviceLogin.deviceFingerprint,
                    deviceModel: deviceLogin.deviceModel,
                    deviceType: deviceLogin.deviceType,
                    operatingSystem: deviceLogin.operatingSystem,
                    browserName: deviceLogin.browserName,
                    browserVersion: deviceLogin.browserVersion,
                    screenWidth: deviceLogin.screenWidth || null,
                    screenHeight: deviceLogin.screenHeight || null,
                    pixelRatio: deviceLogin.pixelRatio || null,
                    timezone: deviceLogin.timezone || null,
                    language: deviceLogin.language || null,
                    ipAddress: deviceLogin.ipAddress || null,
                    country: deviceLogin.country || null,
                    loginAt: new Date(),
                };
                this.deviceLogins.set(id, newDeviceLogin);
                return [2 /*return*/, newDeviceLogin];
            });
        });
    };
    MemStorage.prototype.getUserDeviceLogins = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.deviceLogins.values())
                        .filter(function (login) { return login.userId === userId; })
                        .sort(function (a, b) { return b.loginAt.getTime() - a.loginAt.getTime(); })
                        .slice(0, limit)];
            });
        });
    };
    MemStorage.prototype.clearUserSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var keysToDelete;
            var _this = this;
            return __generator(this, function (_a) {
                keysToDelete = [];
                Array.from(this.userSessions.entries()).forEach(function (_a) {
                    var key = _a[0], session = _a[1];
                    if (session.userId === userId) {
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(function (key) { return _this.userSessions.delete(key); });
                return [2 /*return*/, keysToDelete.length];
            });
        });
    };
    MemStorage.prototype.clearDeviceLogins = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var keysToDelete;
            var _this = this;
            return __generator(this, function (_a) {
                keysToDelete = [];
                Array.from(this.deviceLogins.entries()).forEach(function (_a) {
                    var key = _a[0], login = _a[1];
                    if (login.userId === userId) {
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(function (key) { return _this.deviceLogins.delete(key); });
                return [2 /*return*/, keysToDelete.length];
            });
        });
    };
    // Page view tracking methods (simple implementation for MemStorage)
    MemStorage.prototype.createPageView = function (pageView) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newPageView;
            return __generator(this, function (_a) {
                id = "pageview-".concat(this.nextPageViewId++);
                newPageView = {
                    id: id,
                    userId: pageView.userId || null,
                    path: pageView.path,
                    ipAddress: pageView.ipAddress,
                    country: pageView.country || null,
                    userAgent: pageView.userAgent || null,
                    browserName: pageView.browserName || null,
                    deviceType: pageView.deviceType || null,
                    deviceModel: pageView.deviceModel || null,
                    operatingSystem: pageView.operatingSystem || null,
                    referrer: pageView.referrer || null,
                    sessionId: pageView.sessionId || null,
                    createdAt: new Date(),
                };
                this.pageViews.set(id, newPageView);
                return [2 /*return*/, newPageView];
            });
        });
    };
    MemStorage.prototype.getDailyVisitors = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var targetDate, startOfDay, endOfDay, uniqueIPs, totalPageViews, _i, _a, pageView;
            return __generator(this, function (_b) {
                targetDate = date || new Date();
                startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
                uniqueIPs = new Set();
                totalPageViews = 0;
                for (_i = 0, _a = Array.from(this.pageViews.values()); _i < _a.length; _i++) {
                    pageView = _a[_i];
                    if (pageView.createdAt >= startOfDay && pageView.createdAt < endOfDay) {
                        totalPageViews++;
                        uniqueIPs.add(pageView.ipAddress);
                    }
                }
                return [2 /*return*/, {
                        uniqueVisitors: uniqueIPs.size,
                        totalPageViews: totalPageViews,
                    }];
            });
        });
    };
    MemStorage.prototype.getTrafficStats = function (startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var uniqueIPs, pathCounts, deviceCounts, countryCounts, dailyData, _i, _a, pageView, device, country, dateStr, dayData, topPages, deviceBreakdown, countryBreakdown, dailyStats;
            return __generator(this, function (_b) {
                uniqueIPs = new Set();
                pathCounts = new Map();
                deviceCounts = new Map();
                countryCounts = new Map();
                dailyData = new Map();
                for (_i = 0, _a = Array.from(this.pageViews.values()); _i < _a.length; _i++) {
                    pageView = _a[_i];
                    if (pageView.createdAt >= startDate && pageView.createdAt < endDate) {
                        // Total page views and unique visitors
                        uniqueIPs.add(pageView.ipAddress);
                        // Top pages
                        pathCounts.set(pageView.path, (pathCounts.get(pageView.path) || 0) + 1);
                        device = pageView.deviceType || 'Unknown';
                        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
                        country = pageView.country || 'Unknown';
                        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
                        dateStr = pageView.createdAt.toISOString().split('T')[0];
                        if (!dailyData.has(dateStr)) {
                            dailyData.set(dateStr, { ips: new Set(), count: 0 });
                        }
                        dayData = dailyData.get(dateStr);
                        dayData.ips.add(pageView.ipAddress);
                        dayData.count++;
                    }
                }
                topPages = Array.from(pathCounts.entries())
                    .map(function (_a) {
                    var path = _a[0], views = _a[1];
                    return ({ path: path, views: views });
                })
                    .sort(function (a, b) { return b.views - a.views; })
                    .slice(0, 10);
                deviceBreakdown = Array.from(deviceCounts.entries())
                    .map(function (_a) {
                    var deviceType = _a[0], count = _a[1];
                    return ({ deviceType: deviceType, count: count });
                })
                    .sort(function (a, b) { return b.count - a.count; });
                countryBreakdown = Array.from(countryCounts.entries())
                    .map(function (_a) {
                    var country = _a[0], count = _a[1];
                    return ({ country: country, count: count });
                })
                    .sort(function (a, b) { return b.count - a.count; })
                    .slice(0, 20);
                dailyStats = Array.from(dailyData.entries())
                    .map(function (_a) {
                    var date = _a[0], data = _a[1];
                    return ({
                        date: date,
                        pageViews: data.count,
                        uniqueVisitors: data.ips.size,
                    });
                })
                    .sort(function (a, b) { return a.date.localeCompare(b.date); });
                return [2 /*return*/, {
                        totalPageViews: Array.from(this.pageViews.values()).filter(function (pv) { return pv.createdAt >= startDate && pv.createdAt < endDate; }).length,
                        uniqueVisitors: uniqueIPs.size,
                        topPages: topPages,
                        deviceBreakdown: deviceBreakdown,
                        countryBreakdown: countryBreakdown,
                        dailyStats: dailyStats,
                    }];
            });
        });
    };
    // Password reset methods (simple implementation for MemStorage)
    MemStorage.prototype.createPasswordResetToken = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                token = (0, crypto_1.randomUUID)();
                // In production, this would be stored with expiration
                return [2 /*return*/, token];
            });
        });
    };
    MemStorage.prototype.validatePasswordResetToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Simple implementation - in production this would check expiration
                return [2 /*return*/, "demo@example.com"]; // Placeholder email
            });
        });
    };
    MemStorage.prototype.updatePassword = function (email, newPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var user, passwordHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, false];
                        return [4 /*yield*/, bcrypt.hash(newPassword, 10)];
                    case 2:
                        passwordHash = _a.sent();
                        return [4 /*yield*/, this.updateUser(user.id, { passwordHash: passwordHash })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    MemStorage.prototype.markPasswordResetTokenUsed = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    // 2FA methods (using the same pending2FASetups Map)
    MemStorage.prototype.startPending2FASetup = function (userId, secret) {
        return __awaiter(this, void 0, void 0, function () {
            var expiresAt;
            return __generator(this, function (_a) {
                expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                pending2FASetups.set(userId, { secret: secret, expiresAt: expiresAt });
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.getPending2FASecret = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var pending;
            return __generator(this, function (_a) {
                pending = pending2FASetups.get(userId);
                if (!pending || pending.expiresAt < new Date()) {
                    pending2FASetups.delete(userId);
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, pending.secret];
            });
        });
    };
    MemStorage.prototype.completePending2FASetup = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var secret, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPending2FASecret(userId)];
                    case 1:
                        secret = _a.sent();
                        if (!secret)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.updateUser(userId, {
                                twoFactorSecret: secret,
                                twoFactorEnabled: true
                            })];
                    case 2:
                        result = _a.sent();
                        pending2FASetups.delete(userId);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    MemStorage.prototype.clearPending2FASetup = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                pending2FASetups.delete(userId);
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.enable2FA = function (userId, secret) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.updateUser(userId, { twoFactorSecret: secret, twoFactorEnabled: true })];
            });
        });
    };
    MemStorage.prototype.disable2FA = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null })];
            });
        });
    };
    MemStorage.prototype.validate2FAToken = function (userId, token) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
                            return [2 /*return*/, false];
                        }
                        try {
                            return [2 /*return*/, otplib_1.authenticator.verify({ token: token, secret: user.twoFactorSecret })];
                        }
                        catch (error) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // Passkey methods
    MemStorage.prototype.createPasskey = function (passkey) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newPasskey;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                id = "passkey-".concat(this.nextPasskeyId++);
                newPasskey = {
                    id: id,
                    userId: passkey.userId,
                    credentialId: passkey.credentialId,
                    publicKey: passkey.publicKey,
                    counter: (_a = passkey.counter) !== null && _a !== void 0 ? _a : 0,
                    deviceName: passkey.deviceName,
                    rpId: passkey.rpId,
                    origin: passkey.origin,
                    isActive: (_b = passkey.isActive) !== null && _b !== void 0 ? _b : true,
                    isDomainMismatch: (_c = passkey.isDomainMismatch) !== null && _c !== void 0 ? _c : false,
                    lastUsedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.passkeys.set(id, newPasskey);
                return [2 /*return*/, newPasskey];
            });
        });
    };
    MemStorage.prototype.getUserPasskeys = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.passkeys.values()).filter(function (passkey) { return passkey.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.getAllActivePasskeys = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.passkeys.values()).filter(function (passkey) { return passkey.isActive; })];
            });
        });
    };
    MemStorage.prototype.getPasskeyByCredentialId = function (credentialId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.passkeys.values()).find(function (passkey) { return passkey.credentialId === credentialId; })];
            });
        });
    };
    MemStorage.prototype.updatePasskey = function (passkeyId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var passkey, updatedPasskey;
            return __generator(this, function (_a) {
                passkey = this.passkeys.get(passkeyId);
                if (!passkey)
                    return [2 /*return*/, undefined];
                updatedPasskey = __assign(__assign(__assign({}, passkey), updates), { updatedAt: new Date() });
                this.passkeys.set(passkeyId, updatedPasskey);
                return [2 /*return*/, updatedPasskey];
            });
        });
    };
    MemStorage.prototype.deletePasskey = function (passkeyId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.passkeys.delete(passkeyId)];
            });
        });
    };
    MemStorage.prototype.updatePasskeyCounter = function (credentialId, counter) {
        return __awaiter(this, void 0, void 0, function () {
            var passkey, updatedPasskey;
            return __generator(this, function (_a) {
                passkey = Array.from(this.passkeys.values()).find(function (p) { return p.credentialId === credentialId; });
                if (!passkey)
                    return [2 /*return*/, undefined];
                updatedPasskey = __assign(__assign({}, passkey), { counter: counter, lastUsedAt: new Date(), updatedAt: new Date() });
                this.passkeys.set(passkey.id, updatedPasskey);
                return [2 /*return*/, updatedPasskey];
            });
        });
    };
    // System settings methods - proper implementation for MemStorage
    MemStorage.prototype.getSystemSetting = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Search through the systemSettings Map to find the setting by key
                return [2 /*return*/, Array.from(this.systemSettings.values()).find(function (setting) { return setting.key === key; })];
            });
        });
    };
    MemStorage.prototype.getAllSystemSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Return all system settings from the Map
                return [2 /*return*/, Array.from(this.systemSettings.values())];
            });
        });
    };
    MemStorage.prototype.upsertSystemSetting = function (setting, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingSetting, updatedSetting, newSetting;
            var _a, _b;
            return __generator(this, function (_c) {
                existingSetting = Array.from(this.systemSettings.values()).find(function (s) { return s.key === setting.key; });
                if (existingSetting) {
                    updatedSetting = __assign(__assign({}, existingSetting), { value: setting.value, description: (_a = setting.description) !== null && _a !== void 0 ? _a : existingSetting.description, isEncrypted: (_b = setting.isEncrypted) !== null && _b !== void 0 ? _b : existingSetting.isEncrypted, lastUpdatedBy: adminId, updatedAt: new Date() });
                    this.systemSettings.set(existingSetting.id, updatedSetting);
                    return [2 /*return*/, updatedSetting];
                }
                else {
                    newSetting = {
                        id: "setting-".concat(Date.now()),
                        key: setting.key,
                        value: setting.value,
                        description: setting.description || null,
                        isEncrypted: setting.isEncrypted || false,
                        lastUpdatedBy: adminId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    this.systemSettings.set(newSetting.id, newSetting);
                    return [2 /*return*/, newSetting];
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.deleteSystemSetting = function (key, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var existingSetting;
            return __generator(this, function (_a) {
                existingSetting = Array.from(this.systemSettings.values()).find(function (s) { return s.key === key; });
                if (existingSetting) {
                    this.systemSettings.delete(existingSetting.id);
                    return [2 /*return*/, true];
                }
                return [2 /*return*/, false];
            });
        });
    };
    // VIP level methods
    MemStorage.prototype.updateUserVipLevel = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, teamSize, totalDeposits, vipLevels, newVipLevel, newMaxBetLimit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            return [2 /*return*/, undefined];
                        teamSize = user.teamSize || 0;
                        totalDeposits = parseFloat(user.totalDeposits) || 0;
                        return [4 /*yield*/, vip_service_1.VipService.getVipLevelsFromStorage(this)];
                    case 2:
                        vipLevels = _a.sent();
                        newVipLevel = vip_service_1.VipService.calculateVipLevelStatic(teamSize, vipLevels, totalDeposits);
                        newMaxBetLimit = parseFloat(vip_service_1.VipService.getMaxBetLimitStatic(newVipLevel, vipLevels).toString()).toFixed(8);
                        if (!(user.vipLevel !== newVipLevel || user.maxBetLimit !== newMaxBetLimit)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.updateUser(userId, {
                                vipLevel: newVipLevel,
                                maxBetLimit: newMaxBetLimit
                            })];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4: return [2 /*return*/, user];
                }
            });
        });
    };
    // Agent management methods - stub implementations
    MemStorage.prototype.createAgent = function (email_1, password_1) {
        return __awaiter(this, arguments, void 0, function (email, password, commissionRate) {
            var existingUser, passwordHash, referralCode, publicId, user, agentProfile;
            if (commissionRate === void 0) { commissionRate = "0.0500"; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserByEmail(email)];
                    case 1:
                        existingUser = _a.sent();
                        if (existingUser) {
                            throw new Error("Email already registered");
                        }
                        return [4 /*yield*/, bcrypt.hash(password, 10)];
                    case 2:
                        passwordHash = _a.sent();
                        referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
                        user = {
                            id: (0, crypto_1.randomUUID)(),
                            email: email,
                            publicId: publicId,
                            passwordHash: passwordHash,
                            referralCode: referralCode,
                            role: "agent",
                            balance: "200.00000000",
                            frozenBalance: "0.00000000",
                            accumulatedFee: "0.00000000",
                            vipLevel: "lv1",
                            isActive: true,
                            maxBetLimit: "10.00000000",
                            totalDeposits: "0.00000000",
                            totalWithdrawals: "0.00000000",
                            totalWinnings: "0.00000000",
                            totalLosses: "0.00000000",
                            totalCommission: "0.00000000",
                            lifetimeCommissionEarned: "0.00000000",
                            totalBetsAmount: "0.00000000",
                            dailyWagerAmount: "0.00000000",
                            lastWagerResetDate: new Date(),
                            remainingRequiredBetAmount: "0.00000000",
                            teamSize: 0,
                            totalTeamMembers: 0,
                            referralLevel: 1,
                            withdrawalPasswordHash: null,
                            profilePhoto: null,
                            twoFactorEnabled: false,
                            twoFactorSecret: null,
                            isBanned: false,
                            bannedUntil: null,
                            banReason: null,
                            referredBy: null,
                            registrationIp: null,
                            registrationCountry: null,
                            lastLoginIp: null,
                            lastLoginDeviceModel: null,
                            lastLoginDeviceType: null,
                            lastLoginDeviceOs: null,
                            lastLoginBrowser: null,
                            telegramId: null,
                            telegramLinkToken: null,
                            telegramLinkExpiresAt: null,
                            telegramUsername: null,
                            telegramFirstName: null,
                            telegramPhotoUrl: null,
                            enableAnimations: true,
                            wingoMode: false,
                            lastWithdrawalRequestAt: null,
                            binanceId: null,
                            minDepositAmount: "10.00",
                            maxDepositAmount: "10000.00",
                            isAcceptingDeposits: true,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.users.set(user.id, user);
                        agentProfile = {
                            id: (0, crypto_1.randomUUID)(),
                            userId: user.id,
                            displayName: null,
                            commissionRate: commissionRate,
                            earningsBalance: "0.00000000",
                            isActive: true,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        return [2 /*return*/, { user: user, agentProfile: agentProfile }];
                }
            });
        });
    };
    MemStorage.prototype.getAgentProfile = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.agentProfiles.values()).find(function (profile) { return profile.userId === userId; })];
            });
        });
    };
    MemStorage.prototype.getAllAgents = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var agentUsers, agents, startIndex, paginatedAgents;
            var _this = this;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                agentUsers = Array.from(this.users.values()).filter(function (user) { return user.role === "agent"; });
                agents = agentUsers.map(function (user) {
                    var agentProfile = Array.from(_this.agentProfiles.values()).find(function (profile) { return profile.userId === user.id; });
                    return agentProfile ? __assign(__assign({}, user), { agentProfile: agentProfile }) : null;
                }).filter(function (agent) { return agent !== null; });
                startIndex = (page - 1) * limit;
                paginatedAgents = agents.slice(startIndex, startIndex + limit);
                return [2 /*return*/, {
                        agents: paginatedAgents,
                        total: agents.length
                    }];
            });
        });
    };
    MemStorage.prototype.updateAgentCommission = function (agentId, commissionRate) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        agentProfile = _a.sent();
                        if (!agentProfile) {
                            return [2 /*return*/, undefined];
                        }
                        agentProfile.commissionRate = commissionRate;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        return [2 /*return*/, agentProfile];
                }
            });
        });
    };
    MemStorage.prototype.toggleAgentStatus = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        agentProfile = _a.sent();
                        if (!agentProfile) {
                            return [2 /*return*/, undefined];
                        }
                        // Toggle the agent profile status
                        agentProfile.isActive = !agentProfile.isActive;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        user = this.users.get(agentId);
                        if (user) {
                            user.isActive = agentProfile.isActive;
                            user.updatedAt = new Date();
                            this.users.set(agentId, user);
                        }
                        return [2 /*return*/, agentProfile];
                }
            });
        });
    };
    MemStorage.prototype.promoteUserToAgent = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, commissionRate) {
            var user, agentProfile;
            if (commissionRate === void 0) { commissionRate = "0.0500"; }
            return __generator(this, function (_a) {
                user = this.users.get(userId);
                if (!user) {
                    throw new Error("User not found");
                }
                if (user.role === 'agent') {
                    throw new Error("User is already an agent");
                }
                if (user.role !== 'user') {
                    throw new Error("Only regular users can be promoted to agents");
                }
                user.role = 'agent';
                user.updatedAt = new Date();
                this.users.set(userId, user);
                agentProfile = {
                    id: (0, crypto_1.randomUUID)(),
                    userId: userId,
                    displayName: null,
                    commissionRate: commissionRate,
                    earningsBalance: "0.00000000",
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.agentProfiles.set(agentProfile.id, agentProfile);
                return [2 /*return*/, { user: user, agentProfile: agentProfile }];
            });
        });
    };
    MemStorage.prototype.getUserByPublicIdOrEmail = function (identifier) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.users.values()).find(function (user) {
                        return user.publicId === identifier || user.email === identifier;
                    })];
            });
        });
    };
    MemStorage.prototype.processAgentDeposit = function (agentId, userIdentifier, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var targetUser, agentUser, agentProfile, depositAmount, formattedAmount, commissionAmount, transaction, commissionTransaction, oldAgentBalance, newAgentBalance, newUserBalance, newTotalDeposits, newFrozenBalance, newCommissionBalance, newEarnings, activity, error_29;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getUserByPublicIdOrEmail(userIdentifier)];
                    case 1:
                        targetUser = _a.sent();
                        if (!targetUser) {
                            throw new Error("User not found");
                        }
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 2:
                        agentUser = _a.sent();
                        if (!agentUser) {
                            throw new Error("Agent user not found");
                        }
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 3:
                        agentProfile = _a.sent();
                        if (!agentProfile || !agentProfile.isActive) {
                            throw new Error("Agent not found or inactive");
                        }
                        depositAmount = parseFloat(amount);
                        if (depositAmount <= 0 || !isFinite(depositAmount) || isNaN(depositAmount)) {
                            throw new Error("Invalid deposit amount");
                        }
                        formattedAmount = depositAmount.toFixed(8);
                        // Check if agent has sufficient balance
                        console.log("\uD83D\uDD0D Agent Balance Debug:", {
                            agentId: agentUser.id,
                            agentEmail: agentUser.email,
                            agentBalance: agentUser.balance,
                            depositAmount: depositAmount,
                            balanceAsNumber: parseFloat(agentUser.balance),
                            hasEnoughBalance: parseFloat(agentUser.balance) >= depositAmount
                        });
                        if (parseFloat(agentUser.balance) < depositAmount) {
                            throw new Error("Insufficient agent balance");
                        }
                        commissionAmount = (depositAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);
                        transaction = {
                            id: (0, crypto_1.randomUUID)(),
                            userId: targetUser.id,
                            agentId: agentId,
                            type: "deposit",
                            fiatAmount: formattedAmount,
                            fiatCurrency: "USD",
                            cryptoAmount: "0.00000000",
                            cryptoCurrency: null,
                            externalId: null,
                            paymentAddress: null,
                            txHash: null,
                            status: "completed",
                            paymentMethod: "agent",
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(transaction.id, transaction);
                        commissionTransaction = {
                            id: (0, crypto_1.randomUUID)(),
                            userId: agentId,
                            agentId: agentId,
                            type: "agent_commission",
                            fiatAmount: commissionAmount,
                            fiatCurrency: "USD",
                            cryptoAmount: "0.00000000",
                            cryptoCurrency: null,
                            externalId: null,
                            paymentAddress: null,
                            txHash: null,
                            status: "completed",
                            paymentMethod: "agent",
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(commissionTransaction.id, commissionTransaction);
                        oldAgentBalance = agentUser.balance;
                        newAgentBalance = (parseFloat(agentUser.balance) - depositAmount).toFixed(8);
                        agentUser.balance = newAgentBalance;
                        agentUser.updatedAt = new Date();
                        this.users.set(agentUser.id, agentUser);
                        console.log("\u2705 Agent Balance Updated:", {
                            agentId: agentUser.id,
                            agentEmail: agentUser.email,
                            oldBalance: oldAgentBalance,
                            newBalance: newAgentBalance,
                            depositAmount: depositAmount,
                            difference: (parseFloat(oldAgentBalance) - parseFloat(newAgentBalance)).toFixed(8)
                        });
                        newUserBalance = (parseFloat(targetUser.balance) + depositAmount).toFixed(8);
                        newTotalDeposits = (parseFloat(targetUser.totalDeposits) + depositAmount).toFixed(8);
                        newFrozenBalance = (parseFloat(targetUser.frozenBalance || '0') + depositAmount).toFixed(8);
                        targetUser.balance = newUserBalance;
                        targetUser.totalDeposits = newTotalDeposits;
                        targetUser.frozenBalance = newFrozenBalance;
                        targetUser.updatedAt = new Date();
                        this.users.set(targetUser.id, targetUser);
                        // Check and update VIP level based on new deposit amount
                        return [4 /*yield*/, this.updateUserVipLevel(targetUser.id)];
                    case 4:
                        // Check and update VIP level based on new deposit amount
                        _a.sent();
                        newCommissionBalance = (parseFloat(agentUser.totalCommission) + parseFloat(commissionAmount)).toFixed(8);
                        agentUser.totalCommission = newCommissionBalance;
                        this.users.set(agentUser.id, agentUser);
                        newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
                        agentProfile.earningsBalance = newEarnings;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        return [4 /*yield*/, this.createAgentActivity({
                                agentId: agentId,
                                action: "deposit",
                                targetUserId: targetUser.id,
                                amount: formattedAmount,
                                commissionAmount: commissionAmount,
                                transactionId: transaction.id
                            })];
                    case 5:
                        activity = _a.sent();
                        return [2 /*return*/, { transaction: transaction, activity: activity }];
                    case 6:
                        error_29 = _a.sent();
                        console.error('Error processing agent deposit:', error_29);
                        throw error_29;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.processAgentWithdrawal = function (agentId, userIdentifier, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var targetUser, agentUser, agentProfile, withdrawalAmount, formattedAmount, commissionAmount, transaction, agentWithdrawalTransaction, newUserBalance, newTotalWithdrawals, newAgentBalance, newCommissionBalance, newEarnings, activity, error_30;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.getUserByPublicIdOrEmail(userIdentifier)];
                    case 1:
                        targetUser = _a.sent();
                        if (!targetUser) {
                            throw new Error("User not found");
                        }
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 2:
                        agentUser = _a.sent();
                        if (!agentUser) {
                            throw new Error("Agent user not found");
                        }
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 3:
                        agentProfile = _a.sent();
                        if (!agentProfile || !agentProfile.isActive) {
                            throw new Error("Agent not found or inactive");
                        }
                        withdrawalAmount = parseFloat(amount);
                        if (withdrawalAmount <= 0 || !isFinite(withdrawalAmount) || isNaN(withdrawalAmount)) {
                            throw new Error("Invalid withdrawal amount");
                        }
                        formattedAmount = withdrawalAmount.toFixed(8);
                        // Check if user has sufficient balance
                        if (parseFloat(targetUser.balance) < withdrawalAmount) {
                            throw new Error("Insufficient user balance");
                        }
                        // Check if agent has sufficient balance to pay out
                        if (parseFloat(agentUser.balance) < withdrawalAmount) {
                            throw new Error("Insufficient agent balance to process withdrawal");
                        }
                        commissionAmount = (withdrawalAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);
                        transaction = {
                            id: (0, crypto_1.randomUUID)(),
                            userId: targetUser.id,
                            agentId: agentId,
                            type: "withdrawal",
                            fiatAmount: formattedAmount,
                            fiatCurrency: "USD",
                            cryptoAmount: "0.00000000",
                            cryptoCurrency: null,
                            externalId: null,
                            paymentAddress: null,
                            txHash: null,
                            status: "completed",
                            paymentMethod: "agent",
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(transaction.id, transaction);
                        agentWithdrawalTransaction = {
                            id: (0, crypto_1.randomUUID)(),
                            userId: agentId,
                            agentId: agentId,
                            type: "withdrawal",
                            fiatAmount: "-".concat(formattedAmount),
                            fiatCurrency: "USD",
                            cryptoAmount: "0.00000000",
                            cryptoCurrency: null,
                            externalId: null,
                            paymentAddress: null,
                            txHash: null,
                            status: "completed",
                            paymentMethod: "agent",
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(agentWithdrawalTransaction.id, agentWithdrawalTransaction);
                        newUserBalance = (parseFloat(targetUser.balance) - withdrawalAmount).toFixed(8);
                        newTotalWithdrawals = (parseFloat(targetUser.totalWithdrawals) + withdrawalAmount).toFixed(8);
                        targetUser.balance = newUserBalance;
                        targetUser.totalWithdrawals = newTotalWithdrawals;
                        targetUser.updatedAt = new Date();
                        this.users.set(targetUser.id, targetUser);
                        newAgentBalance = (parseFloat(agentUser.balance) - withdrawalAmount).toFixed(8);
                        agentUser.balance = newAgentBalance;
                        agentUser.updatedAt = new Date();
                        this.users.set(agentUser.id, agentUser);
                        newCommissionBalance = (parseFloat(agentUser.totalCommission) + parseFloat(commissionAmount)).toFixed(8);
                        agentUser.totalCommission = newCommissionBalance;
                        this.users.set(agentUser.id, agentUser);
                        newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
                        agentProfile.earningsBalance = newEarnings;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        return [4 /*yield*/, this.createAgentActivity({
                                agentId: agentId,
                                action: "withdrawal",
                                targetUserId: targetUser.id,
                                amount: formattedAmount,
                                commissionAmount: commissionAmount,
                                transactionId: transaction.id
                            })];
                    case 4:
                        activity = _a.sent();
                        return [2 /*return*/, { transaction: transaction, activity: activity }];
                    case 5:
                        error_30 = _a.sent();
                        console.error('Error processing agent withdrawal:', error_30);
                        throw error_30;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.createAgentActivity = function (activity) {
        return __awaiter(this, void 0, void 0, function () {
            var agentActivity;
            return __generator(this, function (_a) {
                try {
                    agentActivity = {
                        id: (0, crypto_1.randomUUID)(),
                        agentId: activity.agentId,
                        action: activity.action,
                        amount: activity.amount,
                        commissionAmount: activity.commissionAmount || "0.00000000",
                        targetUserId: activity.targetUserId || null,
                        transactionId: activity.transactionId || null,
                        createdAt: new Date()
                    };
                    this.agentActivities.set(agentActivity.id, agentActivity);
                    return [2 /*return*/, agentActivity];
                }
                catch (error) {
                    console.error('Error creating agent activity:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.getAgentActivities = function (agentId_1) {
        return __awaiter(this, arguments, void 0, function (agentId, page, limit) {
            var allActivities, startIndex, paginatedActivities;
            var _this = this;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                try {
                    allActivities = Array.from(this.agentActivities.values())
                        .filter(function (activity) { return activity.agentId === agentId; })
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                    startIndex = (page - 1) * limit;
                    paginatedActivities = allActivities.slice(startIndex, startIndex + limit).map(function (activity) {
                        // Fetch the target user's public ID if targetUserId exists
                        var targetUserPublicId = null;
                        if (activity.targetUserId) {
                            var targetUser = _this.users.get(activity.targetUserId);
                            if (targetUser) {
                                targetUserPublicId = targetUser.publicId;
                            }
                        }
                        return __assign(__assign({}, activity), { targetUserPublicId: targetUserPublicId });
                    });
                    return [2 /*return*/, {
                            activities: paginatedActivities,
                            total: allActivities.length
                        }];
                }
                catch (error) {
                    console.error('Error getting agent activities:', error);
                    return [2 /*return*/, { activities: [], total: 0 }];
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.getAgentEarnings = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, agentTransactions, totalDeposits;
            return __generator(this, function (_a) {
                agentProfile = Array.from(this.agentProfiles.values()).find(function (profile) { return profile.userId === agentId; });
                if (!agentProfile) {
                    return [2 /*return*/, { totalEarnings: "0.00000000", commissionRate: "0.0000", totalDeposits: "0.00000000" }];
                }
                agentTransactions = Array.from(this.transactions.values())
                    .filter(function (t) { return t.agentId === agentId && t.type === 'deposit' && t.status === 'completed'; });
                totalDeposits = agentTransactions
                    .reduce(function (sum, t) { return sum + parseFloat(t.fiatAmount || '0'); }, 0)
                    .toFixed(8);
                return [2 /*return*/, {
                        totalEarnings: agentProfile.earningsBalance,
                        commissionRate: agentProfile.commissionRate,
                        totalDeposits: totalDeposits
                    }];
            });
        });
    };
    MemStorage.prototype.updateAgentBalance = function (agentId, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile;
            return __generator(this, function (_a) {
                agentProfile = Array.from(this.agentProfiles.values()).find(function (profile) { return profile.userId === agentId; });
                if (!agentProfile)
                    return [2 /*return*/, undefined];
                agentProfile.earningsBalance = amount;
                agentProfile.updatedAt = new Date();
                this.agentProfiles.set(agentProfile.id, agentProfile);
                return [2 /*return*/, agentProfile];
            });
        });
    };
    MemStorage.prototype.adjustAgentBalance = function (agentId, amount, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var agentProfile, agent, currentEarningsBalance, currentUserBalance, adjustment, newEarningsBalance, newUserBalance, adminAction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        agentProfile = Array.from(this.agentProfiles.values()).find(function (profile) { return profile.userId === agentId; });
                        if (!agentProfile)
                            return [2 /*return*/, undefined];
                        return [4 /*yield*/, this.getUser(agentId)];
                    case 1:
                        agent = _a.sent();
                        if (!agent)
                            return [2 /*return*/, undefined];
                        currentEarningsBalance = parseFloat(agentProfile.earningsBalance);
                        currentUserBalance = parseFloat(agent.balance);
                        adjustment = parseFloat(amount);
                        newEarningsBalance = (currentEarningsBalance + adjustment).toFixed(8);
                        newUserBalance = (currentUserBalance + adjustment).toFixed(8);
                        // Update agent profile earnings balance
                        agentProfile.earningsBalance = newEarningsBalance;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        // Update user wallet balance so it shows in agent dashboard
                        agent.balance = newUserBalance;
                        agent.updatedAt = new Date();
                        this.users.set(agent.id, agent);
                        adminAction = {
                            id: "admin-action-".concat(this.nextAdminActionId++),
                            adminId: adminId,
                            action: 'agent_balance_adjustment',
                            targetId: agentId,
                            details: {
                                previousBalance: currentEarningsBalance.toFixed(8),
                                adjustment: amount,
                                newBalance: newEarningsBalance
                            },
                            createdAt: new Date()
                        };
                        this.adminActions.set(adminAction.id, adminAction);
                        return [2 /*return*/, agentProfile];
                }
            });
        });
    };
    MemStorage.prototype.clearDemoData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var adminUsers;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    adminUsers = Array.from(this.users.values()).filter(function (user) { return user.role === 'admin'; });
                    this.users.clear();
                    adminUsers.forEach(function (user) { return _this.users.set(user.id, user); });
                    // Clear all other data
                    this.games.clear();
                    this.bets.clear();
                    this.transactions.clear();
                    this.referrals.clear();
                    this.gameAnalytics.clear();
                    this.userSessions.clear();
                    this.pageViews.clear();
                    this.agentProfiles.clear();
                    this.agentActivities.clear();
                    this.passkeys.clear();
                    this.goldenLiveStats.clear();
                    this.goldenLiveEvents.clear();
                    this.notifications.clear();
                    this.withdrawalRequests.clear();
                    // Reinitialize demo data
                    this.initializeGoldenLive();
                    this.initializeTrafficData();
                    console.log('✅ Demo data cleared successfully in MemStorage (admin users preserved)');
                }
                catch (error) {
                    console.error('Error clearing demo data in MemStorage:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    // Golden Live methods
    MemStorage.prototype.initializeGoldenLive = function () {
        // Initialize Golden Live stats with default values
        var goldenLiveStats = {
            id: "golden-live-stats-".concat(this.nextGoldenLiveStatsId++),
            totalPlayers: 18000, // Start with 18,000 players
            activePlayers: 1243, // Start with 1,243 active players  
            lastHourlyIncrease: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.goldenLiveStats.set(goldenLiveStats.id, goldenLiveStats);
        // Start the hourly timer for automatic player increase
        this.startHourlyPlayerIncrease();
    };
    MemStorage.prototype.startHourlyPlayerIncrease = function () {
        var _this = this;
        // Clear any existing timer
        if (this.hourlyTimer) {
            clearInterval(this.hourlyTimer);
        }
        // Set up timer to increase total players by 280 every hour
        this.hourlyTimer = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.incrementTotalPlayersBy28()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds
    };
    MemStorage.prototype.getGoldenLiveStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stats;
            return __generator(this, function (_a) {
                stats = Array.from(this.goldenLiveStats.values())[0];
                return [2 /*return*/, stats || undefined];
            });
        });
    };
    MemStorage.prototype.updateGoldenLiveStats = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats, updatedStats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats) {
                            return [2 /*return*/, undefined];
                        }
                        updatedStats = __assign(__assign(__assign({}, currentStats), updates), { updatedAt: new Date() });
                        this.goldenLiveStats.set(currentStats.id, updatedStats);
                        return [2 /*return*/, updatedStats];
                }
            });
        });
    };
    MemStorage.prototype.createGoldenLiveEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var goldenLiveEvent;
            return __generator(this, function (_a) {
                goldenLiveEvent = {
                    id: "golden-live-event-".concat(this.nextGoldenLiveEventId++),
                    eventType: event.eventType,
                    previousValue: event.previousValue,
                    newValue: event.newValue,
                    incrementAmount: event.incrementAmount || 0,
                    description: event.description || null,
                    createdAt: new Date()
                };
                this.goldenLiveEvents.set(goldenLiveEvent.id, goldenLiveEvent);
                return [2 /*return*/, goldenLiveEvent];
            });
        });
    };
    MemStorage.prototype.getGoldenLiveEvents = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var events;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                events = Array.from(this.goldenLiveEvents.values());
                events.sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                return [2 /*return*/, events.slice(0, limit)];
            });
        });
    };
    MemStorage.prototype.incrementTotalPlayersBy28 = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats, newTotalPlayers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats) {
                            return [2 /*return*/, undefined];
                        }
                        newTotalPlayers = currentStats.totalPlayers + 280;
                        // Create event for audit trail
                        return [4 /*yield*/, this.createGoldenLiveEvent({
                                eventType: 'hourly_increase',
                                previousValue: currentStats.totalPlayers,
                                newValue: newTotalPlayers,
                                incrementAmount: 280,
                                description: 'Automatic hourly increase of total players by 280'
                            })];
                    case 2:
                        // Create event for audit trail
                        _a.sent();
                        return [4 /*yield*/, this.updateGoldenLiveStats({
                                totalPlayers: newTotalPlayers,
                                lastHourlyIncrease: new Date()
                            })];
                    case 3: 
                    // Update the stats
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemStorage.prototype.updateActivePlayersCount = function (count) {
        return __awaiter(this, void 0, void 0, function () {
            var currentStats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGoldenLiveStats()];
                    case 1:
                        currentStats = _a.sent();
                        if (!currentStats) {
                            return [2 /*return*/, undefined];
                        }
                        // Create event for audit trail
                        return [4 /*yield*/, this.createGoldenLiveEvent({
                                eventType: 'active_player_update',
                                previousValue: currentStats.activePlayers,
                                newValue: count,
                                incrementAmount: count - currentStats.activePlayers,
                                description: "Active players count updated from ".concat(currentStats.activePlayers, " to ").concat(count)
                            })];
                    case 2:
                        // Create event for audit trail
                        _a.sent();
                        return [4 /*yield*/, this.updateGoldenLiveStats({
                                activePlayers: count
                            })];
                    case 3: 
                    // Update the stats
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemStorage.prototype.getUserCountsByCountry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var countryCounts, _i, _a, user, country, result;
            return __generator(this, function (_b) {
                countryCounts = new Map();
                for (_i = 0, _a = Array.from(this.users.values()); _i < _a.length; _i++) {
                    user = _a[_i];
                    if (user.registrationCountry && user.registrationCountry.trim() !== '') {
                        country = user.registrationCountry;
                        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
                    }
                }
                result = Array.from(countryCounts.entries())
                    .map(function (_a) {
                    var countryCode = _a[0], count = _a[1];
                    return ({ countryCode: countryCode, count: count });
                })
                    .sort(function (a, b) { return b.count - a.count; });
                return [2 /*return*/, result];
            });
        });
    };
    // VIP settings methods
    MemStorage.prototype.getAllVipSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                settings = Array.from(this.vipSettings.values());
                settings.sort(function (a, b) { return a.levelOrder - b.levelOrder; });
                return [2 /*return*/, settings];
            });
        });
    };
    MemStorage.prototype.getVipSettingById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.vipSettings.get(id)];
            });
        });
    };
    MemStorage.prototype.getVipSettingByLevelKey = function (levelKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.vipSettings.values()).find(function (s) { return s.levelKey === levelKey; })];
            });
        });
    };
    MemStorage.prototype.createVipSetting = function (setting) {
        return __awaiter(this, void 0, void 0, function () {
            var newSetting;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                newSetting = {
                    id: "vip-setting-".concat(this.nextVipSettingId++),
                    levelKey: setting.levelKey,
                    levelName: setting.levelName,
                    levelOrder: setting.levelOrder,
                    teamRequirement: (_a = setting.teamRequirement) !== null && _a !== void 0 ? _a : 0,
                    maxBet: (_b = setting.maxBet) !== null && _b !== void 0 ? _b : '100000000.00000000',
                    dailyWagerReward: (_c = setting.dailyWagerReward) !== null && _c !== void 0 ? _c : '0.00000000',
                    commissionRates: (_d = setting.commissionRates) !== null && _d !== void 0 ? _d : '[]',
                    rechargeAmount: (_e = setting.rechargeAmount) !== null && _e !== void 0 ? _e : '1000.00000000',
                    telegramLink: (_f = setting.telegramLink) !== null && _f !== void 0 ? _f : null,
                    supportEmail: (_g = setting.supportEmail) !== null && _g !== void 0 ? _g : null,
                    isActive: (_h = setting.isActive) !== null && _h !== void 0 ? _h : true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.vipSettings.set(newSetting.id, newSetting);
                return [2 /*return*/, newSetting];
            });
        });
    };
    MemStorage.prototype.updateVipSetting = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var setting, updatedSetting;
            return __generator(this, function (_a) {
                setting = this.vipSettings.get(id);
                if (!setting)
                    return [2 /*return*/, undefined];
                updatedSetting = __assign(__assign(__assign({}, setting), updates), { updatedAt: new Date() });
                this.vipSettings.set(id, updatedSetting);
                return [2 /*return*/, updatedSetting];
            });
        });
    };
    MemStorage.prototype.deleteVipSetting = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.vipSettings.delete(id)];
            });
        });
    };
    MemStorage.prototype.createNotification = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var newNotification;
            return __generator(this, function (_a) {
                newNotification = {
                    id: "notification-".concat(this.nextNotificationId++),
                    userId: notification.userId || null,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type || "info",
                    imageUrl: notification.imageUrl || null,
                    isRead: false,
                    sentBy: notification.sentBy,
                    createdAt: new Date()
                };
                this.notifications.set(newNotification.id, newNotification);
                return [2 /*return*/, newNotification];
            });
        });
    };
    MemStorage.prototype.getUserNotifications = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            var userNotifications;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                userNotifications = Array.from(this.notifications.values())
                    .filter(function (n) { return n.userId === userId || n.userId === null; })
                    .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })
                    .slice(0, limit);
                return [2 /*return*/, userNotifications];
            });
        });
    };
    MemStorage.prototype.getUnreadNotifications = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var unreadNotifications;
            return __generator(this, function (_a) {
                unreadNotifications = Array.from(this.notifications.values())
                    .filter(function (n) { return (n.userId === userId || n.userId === null) && !n.isRead; })
                    .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                return [2 /*return*/, unreadNotifications];
            });
        });
    };
    MemStorage.prototype.markNotificationRead = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            var notification, updated;
            return __generator(this, function (_a) {
                notification = this.notifications.get(notificationId);
                if (!notification)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, notification), { isRead: true });
                this.notifications.set(notificationId, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.markAllNotificationsRead = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, id, notification;
            return __generator(this, function (_c) {
                for (_i = 0, _a = Array.from(this.notifications.entries()); _i < _a.length; _i++) {
                    _b = _a[_i], id = _b[0], notification = _b[1];
                    if (notification.userId === userId || notification.userId === null) {
                        this.notifications.set(id, __assign(__assign({}, notification), { isRead: true }));
                    }
                }
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.deleteNotification = function (notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.notifications.delete(notificationId)];
            });
        });
    };
    // Push subscription methods
    MemStorage.prototype.createPushSubscription = function (subscription) {
        return __awaiter(this, void 0, void 0, function () {
            var newSubscription;
            return __generator(this, function (_a) {
                newSubscription = {
                    id: "push-".concat(Date.now(), "-").concat(Math.random()),
                    userId: subscription.userId,
                    endpoint: subscription.endpoint,
                    p256dhKey: subscription.p256dhKey,
                    authKey: subscription.authKey,
                    userAgent: subscription.userAgent || null,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.pushSubscriptions.set(newSubscription.endpoint, newSubscription);
                return [2 /*return*/, newSubscription];
            });
        });
    };
    MemStorage.prototype.getUserPushSubscriptions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.pushSubscriptions.values())
                        .filter(function (sub) { return sub.userId === userId && sub.isActive; })];
            });
        });
    };
    MemStorage.prototype.getAllActivePushSubscriptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.pushSubscriptions.values())
                        .filter(function (sub) { return sub.isActive; })];
            });
        });
    };
    MemStorage.prototype.deletePushSubscription = function (endpoint) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription;
            return __generator(this, function (_a) {
                subscription = this.pushSubscriptions.get(endpoint);
                if (subscription) {
                    this.pushSubscriptions.set(endpoint, __assign(__assign({}, subscription), { isActive: false, updatedAt: new Date() }));
                }
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.deletePushSubscriptionsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, endpoint, subscription;
            return __generator(this, function (_c) {
                for (_i = 0, _a = Array.from(this.pushSubscriptions.entries()); _i < _a.length; _i++) {
                    _b = _a[_i], endpoint = _b[0], subscription = _b[1];
                    if (subscription.userId === userId) {
                        this.pushSubscriptions.set(endpoint, __assign(__assign({}, subscription), { isActive: false, updatedAt: new Date() }));
                    }
                }
                return [2 /*return*/, true];
            });
        });
    };
    MemStorage.prototype.createWithdrawalRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var id, withdrawalRequest;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                id = (0, crypto_1.randomUUID)();
                withdrawalRequest = __assign(__assign({ id: id }, request), { currency: request.currency || "USD", commissionAmount: request.commissionAmount || "0.00000000", winningsAmount: request.winningsAmount || "0.00000000", eligible: (_a = request.eligible) !== null && _a !== void 0 ? _a : false, duplicateIpCount: (_b = request.duplicateIpCount) !== null && _b !== void 0 ? _b : 0, duplicateIpUserIds: (_c = request.duplicateIpUserIds) !== null && _c !== void 0 ? _c : null, balanceFrozen: (_d = request.balanceFrozen) !== null && _d !== void 0 ? _d : false, adminNote: request.adminNote || null, status: 'pending', processedAt: null, processedBy: null, createdAt: new Date(), updatedAt: new Date() });
                this.withdrawalRequests.set(id, withdrawalRequest);
                return [2 /*return*/, withdrawalRequest];
            });
        });
    };
    MemStorage.prototype.getWithdrawalRequestsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.withdrawalRequests.values())
                        .filter(function (req) { return req.userId === userId; })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })];
            });
        });
    };
    MemStorage.prototype.getAllWithdrawalRequests = function () {
        return __awaiter(this, arguments, void 0, function (page, limit, status) {
            var all, offset, requests;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                all = Array.from(this.withdrawalRequests.values());
                if (status && status !== 'all') {
                    all = all.filter(function (req) { return req.status === status; });
                }
                all.sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
                offset = (page - 1) * limit;
                requests = all.slice(offset, offset + limit);
                return [2 /*return*/, { requests: requests, total: all.length }];
            });
        });
    };
    MemStorage.prototype.updateWithdrawalRequestStatus = function (requestId, status, processedBy, adminNote) {
        return __awaiter(this, void 0, void 0, function () {
            var request, updated;
            return __generator(this, function (_a) {
                request = this.withdrawalRequests.get(requestId);
                if (!request)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, request), { status: status, updatedAt: new Date(), processedBy: processedBy || request.processedBy, processedAt: processedBy ? new Date() : request.processedAt, adminNote: adminNote !== undefined ? adminNote : request.adminNote });
                this.withdrawalRequests.set(requestId, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.getWithdrawalRequestById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.withdrawalRequests.get(id)];
            });
        });
    };
    MemStorage.prototype.getCompletedWithdrawalCount = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userRequests;
            return __generator(this, function (_a) {
                userRequests = Array.from(this.withdrawalRequests.values()).filter(function (r) { return r.userId === userId && r.status === 'completed'; });
                return [2 /*return*/, userRequests.length];
            });
        });
    };
    // Promo code methods
    MemStorage.prototype.createPromoCode = function (promoCode) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newPromoCode;
            return __generator(this, function (_a) {
                id = "promo-code-".concat(this.nextPromoCodeId++);
                newPromoCode = {
                    id: id,
                    code: promoCode.code.toUpperCase(),
                    totalValue: promoCode.totalValue,
                    minValue: promoCode.minValue,
                    maxValue: promoCode.maxValue,
                    usageLimit: promoCode.usageLimit || null,
                    usedCount: 0,
                    isActive: promoCode.isActive !== undefined ? promoCode.isActive : true,
                    requireDeposit: promoCode.requireDeposit || false,
                    vipLevelUpgrade: promoCode.vipLevelUpgrade || null,
                    expiresAt: promoCode.expiresAt || null,
                    createdBy: promoCode.createdBy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                this.promoCodes.set(id, newPromoCode);
                return [2 /*return*/, newPromoCode];
            });
        });
    };
    MemStorage.prototype.getPromoCodeByCode = function (code) {
        return __awaiter(this, void 0, void 0, function () {
            var upperCode;
            return __generator(this, function (_a) {
                upperCode = code.toUpperCase();
                return [2 /*return*/, Array.from(this.promoCodes.values()).find(function (pc) { return pc.code === upperCode; })];
            });
        });
    };
    MemStorage.prototype.getAllPromoCodes = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var all, offset, codes;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                all = Array.from(this.promoCodes.values())
                    .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
                offset = (page - 1) * limit;
                codes = all.slice(offset, offset + limit);
                return [2 /*return*/, { codes: codes, total: all.length }];
            });
        });
    };
    MemStorage.prototype.validatePromoCode = function (code, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var promoCode, existingRedemption, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPromoCodeByCode(code)];
                    case 1:
                        promoCode = _a.sent();
                        if (!promoCode) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code not found' }];
                        }
                        if (!promoCode.isActive) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code is no longer active' }];
                        }
                        if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code has expired' }];
                        }
                        if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
                            return [2 /*return*/, { valid: false, reason: 'Promo code usage limit reached' }];
                        }
                        existingRedemption = Array.from(this.promoCodeRedemptions.values())
                            .find(function (r) { return r.userId === userId && r.code === promoCode.code; });
                        if (existingRedemption) {
                            return [2 /*return*/, { valid: false, reason: 'You have already redeemed this promo code' }];
                        }
                        if (!promoCode.requireDeposit) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getUser(userId)];
                    case 2:
                        user = _a.sent();
                        if (!user || parseFloat(user.totalDeposits) === 0) {
                            return [2 /*return*/, { valid: false, reason: 'You must make a deposit before redeeming this code' }];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, { valid: true, promoCode: promoCode }];
                }
            });
        });
    };
    MemStorage.prototype.redeemPromoCode = function (code, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var validation, promoCode, minCoins, maxCoins, randomCoins, randomAmount, amountAwarded, redemptionId, redemption, updatedPromoCode, user, vipLevelUpgraded, newVipLevel, newBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.validatePromoCode(code, userId)];
                    case 1:
                        validation = _a.sent();
                        if (!validation.valid) {
                            return [2 /*return*/, { success: false, reason: validation.reason }];
                        }
                        promoCode = validation.promoCode;
                        minCoins = Math.round(parseFloat(promoCode.minValue) * 100);
                        maxCoins = Math.round(parseFloat(promoCode.maxValue) * 100);
                        randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
                        randomAmount = randomCoins / 100;
                        amountAwarded = randomAmount.toFixed(8);
                        redemptionId = "promo-redemption-".concat(this.nextPromoCodeRedemptionId++);
                        redemption = {
                            id: redemptionId,
                            promoCodeId: promoCode.id,
                            userId: userId,
                            code: promoCode.code,
                            amountAwarded: amountAwarded,
                            createdAt: new Date(),
                        };
                        this.promoCodeRedemptions.set(redemptionId, redemption);
                        updatedPromoCode = __assign(__assign({}, promoCode), { usedCount: promoCode.usedCount + 1, updatedAt: new Date() });
                        this.promoCodes.set(promoCode.id, updatedPromoCode);
                        return [4 /*yield*/, this.getUser(userId)];
                    case 2:
                        user = _a.sent();
                        vipLevelUpgraded = false;
                        if (!user) return [3 /*break*/, 5];
                        newBalance = (parseFloat(user.balance) + parseFloat(amountAwarded)).toFixed(8);
                        return [4 /*yield*/, this.updateUserBalance(userId, newBalance)];
                    case 3:
                        _a.sent();
                        if (!promoCode.vipLevelUpgrade) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.updateUser(userId, { vipLevel: promoCode.vipLevelUpgrade })];
                    case 4:
                        _a.sent();
                        vipLevelUpgraded = true;
                        newVipLevel = promoCode.vipLevelUpgrade;
                        _a.label = 5;
                    case 5: return [2 /*return*/, { success: true, amountAwarded: amountAwarded, vipLevelUpgraded: vipLevelUpgraded, newVipLevel: newVipLevel }];
                }
            });
        });
    };
    MemStorage.prototype.getUserPromoCodeRedemptions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.promoCodeRedemptions.values())
                        .filter(function (r) { return r.userId === userId; })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })];
            });
        });
    };
    MemStorage.prototype.updatePromoCodeStatus = function (promoCodeId, isActive) {
        return __awaiter(this, void 0, void 0, function () {
            var promoCode, updated;
            return __generator(this, function (_a) {
                promoCode = this.promoCodes.get(promoCodeId);
                if (!promoCode)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, promoCode), { isActive: isActive, updatedAt: new Date() });
                this.promoCodes.set(promoCodeId, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deletePromoCode = function (promoCodeId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.promoCodes.delete(promoCodeId)];
            });
        });
    };
    MemStorage.prototype.getAllVipLevelTelegramLinks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.vipLevelTelegramLinks.values())
                        .filter(function (link) { return link.isActive; })
                        .sort(function (a, b) { return a.vipLevel.localeCompare(b.vipLevel); })];
            });
        });
    };
    MemStorage.prototype.getVipLevelTelegramLink = function (vipLevel) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.vipLevelTelegramLinks.values())
                        .find(function (link) { return link.vipLevel === vipLevel; })];
            });
        });
    };
    MemStorage.prototype.upsertVipLevelTelegramLink = function (link) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated, id, newLink;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getVipLevelTelegramLink(link.vipLevel)];
                    case 1:
                        existing = _b.sent();
                        if (existing) {
                            updated = __assign(__assign({}, existing), { telegramLink: link.telegramLink, description: (_a = link.description) !== null && _a !== void 0 ? _a : null, isActive: link.isActive !== undefined ? link.isActive : existing.isActive, updatedBy: link.updatedBy, updatedAt: new Date() });
                            this.vipLevelTelegramLinks.set(existing.id, updated);
                            return [2 /*return*/, updated];
                        }
                        else {
                            id = "vip-tg-link-".concat(this.nextVipTelegramLinkId++);
                            newLink = {
                                id: id,
                                vipLevel: link.vipLevel,
                                telegramLink: link.telegramLink,
                                description: link.description || null,
                                isActive: link.isActive !== undefined ? link.isActive : true,
                                updatedBy: link.updatedBy,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            };
                            this.vipLevelTelegramLinks.set(id, newLink);
                            return [2 /*return*/, newLink];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.deleteVipLevelTelegramLink = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.vipLevelTelegramLinks.delete(id)];
            });
        });
    };
    // Database connection methods
    MemStorage.prototype.createDatabaseConnection = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var newConnection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .insert(schema_1.databaseConnections)
                            .values(connection)
                            .returning()];
                    case 1:
                        newConnection = (_a.sent())[0];
                        return [2 /*return*/, newConnection];
                }
            });
        });
    };
    MemStorage.prototype.getAllDatabaseConnections = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, _a, connections, totalResult;
            var _b;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        return [4 /*yield*/, Promise.all([
                                db_1.db.select().from(schema_1.databaseConnections).limit(limit).offset(offset).orderBy((0, drizzle_orm_1.desc)(schema_1.databaseConnections.createdAt)),
                                db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.databaseConnections)
                            ])];
                    case 1:
                        _a = _c.sent(), connections = _a[0], totalResult = _a[1];
                        return [2 /*return*/, {
                                connections: connections,
                                total: ((_b = totalResult[0]) === null || _b === void 0 ? void 0 : _b.count) || 0
                            }];
                }
            });
        });
    };
    MemStorage.prototype.getDatabaseConnectionById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .limit(1)];
                    case 1:
                        connection = (_a.sent())[0];
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    MemStorage.prototype.updateDatabaseConnection = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .update(schema_1.databaseConnections)
                            .set(__assign(__assign({}, updates), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .returning()];
                    case 1:
                        updated = (_a.sent())[0];
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    MemStorage.prototype.deleteDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .delete(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                            .returning()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length > 0];
                }
            });
        });
    };
    MemStorage.prototype.getActiveDatabaseConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.databaseConnections)
                            .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.isActive, true))
                            .limit(1)];
                    case 1:
                        connection = (_a.sent())[0];
                        return [2 /*return*/, connection];
                }
            });
        });
    };
    MemStorage.prototype.setActiveDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var activated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // First, deactivate all connections
                    return [4 /*yield*/, db_1.db
                            .update(schema_1.databaseConnections)
                            .set({ isActive: false, status: 'inactive', updatedAt: new Date() })];
                    case 1:
                        // First, deactivate all connections
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isActive: true, status: 'active', updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                                .returning()];
                    case 2:
                        activated = (_a.sent())[0];
                        return [2 /*return*/, activated];
                }
            });
        });
    };
    MemStorage.prototype.setPrimaryDatabaseConnection = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, primary;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDatabaseConnectionById(id)];
                    case 1:
                        connection = _a.sent();
                        if (!connection) {
                            throw new Error('Database connection not found');
                        }
                        if (!connection.isActive) {
                            throw new Error('Cannot set inactive database as primary. Please activate it first.');
                        }
                        // First, remove primary flag from all connections
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isPrimary: false, updatedAt: new Date() })];
                    case 2:
                        // First, remove primary flag from all connections
                        _a.sent();
                        return [4 /*yield*/, db_1.db
                                .update(schema_1.databaseConnections)
                                .set({ isPrimary: true, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_1.databaseConnections.id, id))
                                .returning()];
                    case 3:
                        primary = (_a.sent())[0];
                        return [2 /*return*/, primary];
                }
            });
        });
    };
    MemStorage.prototype.getPredictedResults = function (adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var results_2, results;
            return __generator(this, function (_a) {
                // If adminId is 'any', get all predictions from all admins
                if (adminId === 'any') {
                    results_2 = Array.from(this.predictedResults.values())
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
                    return [2 /*return*/, results_2];
                }
                results = Array.from(this.predictedResults.values())
                    .filter(function (p) { return p.adminId === adminId; });
                return [2 /*return*/, results];
            });
        });
    };
    MemStorage.prototype.savePredictedResult = function (prediction) {
        return __awaiter(this, void 0, void 0, function () {
            var adminId, periodId, result, existing, updated, newPrediction;
            return __generator(this, function (_a) {
                adminId = prediction.adminId, periodId = prediction.periodId, result = prediction.result;
                existing = Array.from(this.predictedResults.values())
                    .find(function (p) { return p.adminId === adminId && p.periodId === periodId; });
                if (existing) {
                    updated = __assign(__assign({}, existing), { result: result, updatedAt: new Date() });
                    this.predictedResults.set(existing.id, updated);
                    return [2 /*return*/, updated];
                }
                else {
                    newPrediction = {
                        id: "predicted-result-".concat(this.nextPredictedResultId++),
                        adminId: adminId,
                        periodId: periodId,
                        result: result,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    this.predictedResults.set(newPrediction.id, newPrediction);
                    return [2 /*return*/, newPrediction];
                }
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.deletePredictedResult = function (id, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var prediction;
            return __generator(this, function (_a) {
                prediction = this.predictedResults.get(id);
                if (prediction && prediction.adminId === adminId) {
                    this.predictedResults.delete(id);
                    return [2 /*return*/, true];
                }
                return [2 /*return*/, false];
            });
        });
    };
    // Support chat session methods
    MemStorage.prototype.createSupportChatSession = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                session = {
                    id: (0, crypto_1.randomUUID)(),
                    userId: payload.userId || null,
                    sessionToken: payload.sessionToken,
                    userDisplayName: payload.userDisplayName,
                    telegramChatId: payload.telegramChatId || null,
                    status: payload.status || 'open',
                    lastMessageAt: null,
                    createdAt: new Date(),
                    closedAt: null
                };
                this.supportChatSessions.set(session.id, session);
                return [2 /*return*/, session];
            });
        });
    };
    MemStorage.prototype.getSupportChatSessionByToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.supportChatSessions.values())
                        .find(function (s) { return s.sessionToken === token; })];
            });
        });
    };
    MemStorage.prototype.getSupportChatSession = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.supportChatSessions.get(id)];
            });
        });
    };
    MemStorage.prototype.updateSupportChatSession = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var session, updated;
            return __generator(this, function (_a) {
                session = this.supportChatSessions.get(id);
                if (!session)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign(__assign({}, session), updates), { lastMessageAt: updates.lastMessageAt || new Date() });
                this.supportChatSessions.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.listOpenSupportSessions = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                sessions = Array.from(this.supportChatSessions.values())
                    .filter(function (s) { return s.status === 'open'; })
                    .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); });
                return [2 /*return*/, sessions.slice(0, limit || 50)];
            });
        });
    };
    MemStorage.prototype.createSupportChatMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var created, session;
            return __generator(this, function (_a) {
                created = {
                    id: (0, crypto_1.randomUUID)(),
                    sessionId: message.sessionId,
                    author: message.author,
                    authorTelegramId: message.authorTelegramId || null,
                    body: message.body,
                    metadata: message.metadata || null,
                    deliveredAt: null,
                    createdAt: new Date()
                };
                this.supportChatMessages.set(created.id, created);
                session = this.supportChatSessions.get(message.sessionId);
                if (session) {
                    session.lastMessageAt = new Date();
                    this.supportChatSessions.set(session.id, session);
                }
                return [2 /*return*/, created];
            });
        });
    };
    MemStorage.prototype.getSupportChatMessages = function (sessionId, after) {
        return __awaiter(this, void 0, void 0, function () {
            var messages;
            return __generator(this, function (_a) {
                messages = Array.from(this.supportChatMessages.values())
                    .filter(function (m) { return m.sessionId === sessionId; });
                if (after) {
                    messages = messages.filter(function (m) { return m.createdAt > after; });
                }
                return [2 /*return*/, messages.sort(function (a, b) { return a.createdAt.getTime() - b.createdAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.markMessagesDelivered = function (sessionId, deliveredAt) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, timestamp;
            var _this = this;
            return __generator(this, function (_a) {
                messages = Array.from(this.supportChatMessages.values())
                    .filter(function (m) { return m.sessionId === sessionId && !m.deliveredAt; });
                timestamp = deliveredAt || new Date();
                messages.forEach(function (m) {
                    m.deliveredAt = timestamp;
                    _this.supportChatMessages.set(m.id, m);
                });
                return [2 /*return*/, messages.length];
            });
        });
    };
    MemStorage.prototype.deleteSupportChatMessages = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var messages;
            var _this = this;
            return __generator(this, function (_a) {
                messages = Array.from(this.supportChatMessages.values())
                    .filter(function (m) { return m.sessionId === sessionId; });
                messages.forEach(function (m) {
                    _this.supportChatMessages.delete(m.id);
                });
                console.log("\uD83D\uDDD1\uFE0F Deleted ".concat(messages.length, " message(s) for session ").concat(sessionId));
                return [2 /*return*/, messages.length];
            });
        });
    };
    MemStorage.prototype.createQuickReply = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var quickReply;
            return __generator(this, function (_a) {
                quickReply = {
                    id: (0, crypto_1.randomUUID)(),
                    shortcut: payload.shortcut,
                    message: payload.message,
                    createdBy: payload.createdBy,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.quickReplies.set(quickReply.id, quickReply);
                return [2 /*return*/, quickReply];
            });
        });
    };
    MemStorage.prototype.getQuickReplies = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.quickReplies.values())
                        .sort(function (a, b) { return b.updatedAt.getTime() - a.updatedAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.getQuickReplyById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.quickReplies.get(id)];
            });
        });
    };
    MemStorage.prototype.updateQuickReply = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var quickReply, updated;
            return __generator(this, function (_a) {
                quickReply = this.quickReplies.get(id);
                if (!quickReply)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign(__assign({}, quickReply), updates), { updatedAt: new Date() });
                this.quickReplies.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deleteQuickReply = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.quickReplies.delete(id)];
            });
        });
    };
    // Telegram Reactions (N1Panel) stub methods
    MemStorage.prototype.getTelegramReactionSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.createOrUpdateTelegramReactionSettings = function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Telegram Reactions not supported in MemStorage");
            });
        });
    };
    MemStorage.prototype.getAllTelegramGroups = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getTelegramGroupById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.createTelegramGroup = function (group) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Telegram Reactions not supported in MemStorage");
            });
        });
    };
    MemStorage.prototype.updateTelegramGroup = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.deleteTelegramGroup = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, false];
            });
        });
    };
    // Telegram signals stub methods
    MemStorage.prototype.createTelegramSignal = function (signal) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Telegram Signals not supported in MemStorage");
            });
        });
    };
    MemStorage.prototype.getTelegramSignalById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.getTelegramSignalByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.getTelegramSignalByMessageId = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.getAllTelegramSignals = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getPendingTelegramSignals = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.updateTelegramSignal = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.deleteTelegramSignal = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, false];
            });
        });
    };
    MemStorage.prototype.getLatestTelegramSignalsByDuration = function (duration_1) {
        return __awaiter(this, arguments, void 0, function (duration, limit) {
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getAllTelegramReactionOrders = function (groupId, limit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getTelegramReactionOrderById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.createTelegramReactionOrder = function (order) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Telegram Reactions not supported in MemStorage");
            });
        });
    };
    MemStorage.prototype.updateTelegramReactionOrder = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.createN1PanelOrder = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('⚠️  N1Panel orders not supported in MemStorage');
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.updateN1PanelOrderStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('⚠️  N1Panel orders not supported in MemStorage');
                return [2 /*return*/];
            });
        });
    };
    MemStorage.prototype.getPendingN1PanelOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getAllN1PanelOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    // Betting tasks implementations
    MemStorage.prototype.getAllBettingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bettingTasks.values()).sort(function (a, b) {
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })];
            });
        });
    };
    MemStorage.prototype.getActiveBettingTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.bettingTasks.values())
                        .filter(function (task) { return task.isActive; })
                        .sort(function (a, b) { return a.durationMinutes - b.durationMinutes; })];
            });
        });
    };
    MemStorage.prototype.getBettingTaskById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.bettingTasks.get(id)];
            });
        });
    };
    MemStorage.prototype.createBettingTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var id, newTask;
            var _a, _b;
            return __generator(this, function (_c) {
                id = (0, crypto_1.randomUUID)();
                newTask = {
                    id: id,
                    name: task.name,
                    isActive: (_a = task.isActive) !== null && _a !== void 0 ? _a : true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    description: (_b = task.description) !== null && _b !== void 0 ? _b : null,
                    betRequirement: task.betRequirement,
                    durationMinutes: task.durationMinutes,
                    coinReward: task.coinReward
                };
                this.bettingTasks.set(id, newTask);
                return [2 /*return*/, newTask];
            });
        });
    };
    MemStorage.prototype.updateBettingTask = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var task, updated;
            return __generator(this, function (_a) {
                task = this.bettingTasks.get(id);
                if (!task)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign(__assign({}, task), updates), { updatedAt: new Date() });
                this.bettingTasks.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deleteBettingTask = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.bettingTasks.delete(id)];
            });
        });
    };
    MemStorage.prototype.getUserTaskProgress = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var progress;
            var _this = this;
            return __generator(this, function (_a) {
                progress = Array.from(this.userBettingTaskProgress.values())
                    .filter(function (p) { return p.userId === userId; });
                return [2 /*return*/, progress.map(function (p) {
                        var task = _this.bettingTasks.get(p.taskId);
                        return __assign(__assign({}, p), { task: task });
                    }).filter(function (p) { return p.task; })];
            });
        });
    };
    MemStorage.prototype.getUserTaskProgressByTask = function (userId, taskId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.userBettingTaskProgress.values())
                        .find(function (p) { return p.userId === userId && p.taskId === taskId; })];
            });
        });
    };
    MemStorage.prototype.updateUserTaskProgress = function (userId, taskId, betAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, newAccumulated, updated, id, progress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUserTaskProgressByTask(userId, taskId)];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            newAccumulated = (parseFloat(existing.betAccumulated) + parseFloat(betAmount)).toFixed(2);
                            updated = __assign(__assign({}, existing), { betAccumulated: newAccumulated, updatedAt: new Date() });
                            this.userBettingTaskProgress.set(existing.id, updated);
                            return [2 /*return*/, updated];
                        }
                        else {
                            id = (0, crypto_1.randomUUID)();
                            progress = {
                                id: id,
                                userId: userId,
                                taskId: taskId,
                                betAccumulated: parseFloat(betAmount).toFixed(2),
                                isCompleted: false,
                                claimedAt: null,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            this.userBettingTaskProgress.set(id, progress);
                            return [2 /*return*/, progress];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    MemStorage.prototype.claimTaskReward = function (userId, taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var task, progress, user, coinRewardAmount, result, updated, error_31;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getBettingTaskById(taskId)];
                    case 1:
                        task = _b.sent();
                        if (!task) {
                            return [2 /*return*/, { success: false, error: "Task not found" }];
                        }
                        return [4 /*yield*/, this.getUserTaskProgressByTask(userId, taskId)];
                    case 2:
                        progress = _b.sent();
                        if (!progress) {
                            return [2 /*return*/, { success: false, error: "No progress found for this task" }];
                        }
                        if (progress.isCompleted) {
                            return [2 /*return*/, { success: false, error: "Task already claimed" }];
                        }
                        if (parseFloat(progress.betAccumulated) < parseFloat(task.betRequirement)) {
                            return [2 /*return*/, { success: false, error: "Bet requirement not met" }];
                        }
                        return [4 /*yield*/, this.getUser(userId)];
                    case 3:
                        user = _b.sent();
                        console.log("\uD83C\uDF81 [ClaimReward] User ".concat(userId, " claiming task ").concat(task.name));
                        console.log("\uD83D\uDCB0 [ClaimReward] Current balance: ".concat(user === null || user === void 0 ? void 0 : user.balance));
                        console.log("\uD83C\uDF81 [ClaimReward] Task coinReward (raw): ".concat(task.coinReward));
                        console.log("\uD83C\uDF81 [ClaimReward] Task coinReward (type): ".concat(typeof task.coinReward));
                        coinRewardAmount = String(task.coinReward);
                        console.log("\uD83C\uDF81 [ClaimReward] coinRewardAmount to add: ".concat(coinRewardAmount, " (type: ").concat(typeof coinRewardAmount, ")"));
                        return [4 /*yield*/, this.atomicIncrementBalance(userId, coinRewardAmount)];
                    case 4:
                        result = _b.sent();
                        if (!result.success) {
                            return [2 /*return*/, { success: false, error: "Failed to award coins" }];
                        }
                        console.log("\u2705 [ClaimReward] New balance after claim: ".concat((_a = result.user) === null || _a === void 0 ? void 0 : _a.balance));
                        // Create a transaction record so BalanceIntegrity service can track this
                        return [4 /*yield*/, this.createTransaction({
                                userId: userId,
                                type: "commission_withdrawal",
                                cryptoCurrency: "USDT",
                                cryptoAmount: coinRewardAmount,
                                fiatAmount: coinRewardAmount,
                                paymentMethod: "internal",
                                status: "completed",
                                txHash: "betting-task-".concat(task.id, "-").concat(Date.now())
                            })];
                    case 5:
                        // Create a transaction record so BalanceIntegrity service can track this
                        _b.sent();
                        updated = __assign(__assign({}, progress), { isCompleted: true, claimedAt: new Date(), updatedAt: new Date() });
                        this.userBettingTaskProgress.set(progress.id, updated);
                        return [2 /*return*/, { success: true, reward: coinRewardAmount }];
                    case 6:
                        error_31 = _b.sent();
                        console.error('Error claiming task reward:', error_31);
                        return [2 /*return*/, { success: false, error: "Internal error" }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Deposit request methods
    MemStorage.prototype.createDepositRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var id, depositRequest;
            return __generator(this, function (_a) {
                id = "deposit-request-".concat(this.nextDepositRequestId++);
                depositRequest = {
                    id: id,
                    userId: request.userId,
                    agentId: request.agentId,
                    amount: request.amount,
                    currency: request.currency || "USD",
                    status: request.status || "pending",
                    transactionId: request.transactionId || null,
                    paymentProof: request.paymentProof || null,
                    userNote: request.userNote || null,
                    agentNote: request.agentNote || null,
                    processedAt: request.processedAt || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.depositRequests.set(id, depositRequest);
                return [2 /*return*/, depositRequest];
            });
        });
    };
    MemStorage.prototype.getDepositRequestById = function (requestId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.depositRequests.get(requestId)];
            });
        });
    };
    MemStorage.prototype.getDepositRequestsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.depositRequests.values())
                        .filter(function (request) { return request.userId === userId; })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })];
            });
        });
    };
    MemStorage.prototype.getDepositRequestsByAgent = function (agentId, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.depositRequests.values())
                        .filter(function (request) {
                        if (request.agentId !== agentId)
                            return false;
                        if (status && request.status !== status)
                            return false;
                        return true;
                    })
                        .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })];
            });
        });
    };
    MemStorage.prototype.updateDepositRequestStatus = function (requestId, status, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            return __generator(this, function (_a) {
                request = this.depositRequests.get(requestId);
                if (!request) {
                    return [2 /*return*/, undefined];
                }
                request.status = status;
                request.updatedAt = new Date();
                if (updates) {
                    if (updates.agentNote !== undefined)
                        request.agentNote = updates.agentNote;
                    if (updates.transactionId !== undefined)
                        request.transactionId = updates.transactionId;
                    if (updates.processedAt !== undefined)
                        request.processedAt = updates.processedAt;
                }
                if (status === "approved" || status === "rejected") {
                    request.processedAt = new Date();
                }
                this.depositRequests.set(requestId, request);
                return [2 /*return*/, request];
            });
        });
    };
    MemStorage.prototype.atomicApproveDepositRequest = function (requestId, agentId, agentNote) {
        return __awaiter(this, void 0, void 0, function () {
            var request, user, agent, agentProfile, amount, agentBalance, commissionRate, commission, newUserBalance, newTotalDeposits, newFrozenBalance, newAgentBalance, newEarningsBalance, transactionId, transaction, agentTransactionId, agentTransaction, activityId, activity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = this.depositRequests.get(requestId);
                        if (!request) {
                            return [2 /*return*/, { success: false, error: 'Deposit request not found' }];
                        }
                        if (request.agentId !== agentId) {
                            return [2 /*return*/, { success: false, error: 'Not your deposit request' }];
                        }
                        if (request.status !== 'pending') {
                            return [2 /*return*/, { success: false, error: 'Request already processed' }];
                        }
                        user = this.users.get(request.userId);
                        if (!user) {
                            return [2 /*return*/, { success: false, error: 'User not found' }];
                        }
                        agent = this.users.get(agentId);
                        if (!agent) {
                            return [2 /*return*/, { success: false, error: 'Agent not found' }];
                        }
                        return [4 /*yield*/, this.getAgentProfile(agentId)];
                    case 1:
                        agentProfile = _a.sent();
                        if (!agentProfile) {
                            return [2 /*return*/, { success: false, error: 'Agent profile not found' }];
                        }
                        amount = parseFloat(request.amount);
                        // Check if agent is depositing to themselves
                        if (request.userId === agentId) {
                            console.error('❌ Agent cannot approve their own deposit request');
                            return [2 /*return*/, { success: false, error: 'Agent cannot approve their own deposit request. Please request deposit from a different agent.' }];
                        }
                        agentBalance = parseFloat(agent.balance);
                        if (agentBalance < amount) {
                            console.error("\u274C Insufficient agent balance. Required: $".concat(amount.toFixed(2), ", Available: $").concat(agentBalance.toFixed(2)));
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Insufficient balance. You need $".concat(amount.toFixed(2), " but only have $").concat(agentBalance.toFixed(2), ". Please deposit more funds to your agent account.")
                                }];
                        }
                        commissionRate = parseFloat(agentProfile.commissionRate);
                        if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
                            console.error("\u274C Invalid commission rate: ".concat(agentProfile.commissionRate));
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Invalid agent commission rate. Please contact support.'
                                }];
                        }
                        commission = amount * commissionRate;
                        newUserBalance = (parseFloat(user.balance) + amount).toFixed(8);
                        newTotalDeposits = (parseFloat(user.totalDeposits) + amount).toFixed(8);
                        newFrozenBalance = (parseFloat(user.frozenBalance || '0') + amount).toFixed(8);
                        user.balance = newUserBalance;
                        user.totalDeposits = newTotalDeposits;
                        user.frozenBalance = newFrozenBalance;
                        user.updatedAt = new Date();
                        this.users.set(user.id, user);
                        newAgentBalance = (parseFloat(agent.balance) - amount).toFixed(8);
                        agent.balance = newAgentBalance;
                        agent.updatedAt = new Date();
                        this.users.set(agent.id, agent);
                        newEarningsBalance = (parseFloat(agentProfile.earningsBalance) + commission).toFixed(8);
                        agentProfile.earningsBalance = newEarningsBalance;
                        agentProfile.updatedAt = new Date();
                        this.agentProfiles.set(agentProfile.id, agentProfile);
                        transactionId = "transaction-".concat(this.nextTransactionId++);
                        transaction = {
                            id: transactionId,
                            userId: request.userId,
                            agentId: agentId,
                            type: 'deposit',
                            fiatAmount: amount.toFixed(2),
                            fiatCurrency: 'USD',
                            status: 'completed',
                            paymentMethod: 'agent',
                            cryptoAmount: null,
                            cryptoCurrency: null,
                            externalId: null,
                            paymentAddress: null,
                            txHash: null,
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(transactionId, transaction);
                        agentTransactionId = "transaction-".concat(this.nextTransactionId++);
                        agentTransaction = {
                            id: agentTransactionId,
                            userId: agentId,
                            agentId: null,
                            type: 'withdrawal',
                            fiatAmount: amount.toFixed(2),
                            fiatCurrency: 'USD',
                            status: 'completed',
                            paymentMethod: 'internal',
                            cryptoAmount: null,
                            cryptoCurrency: null,
                            externalId: request.userId,
                            paymentAddress: null,
                            txHash: null,
                            fee: "0.00000000",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        this.transactions.set(agentTransactionId, agentTransaction);
                        request.status = 'approved';
                        request.processedAt = new Date();
                        request.updatedAt = new Date();
                        request.agentNote = agentNote || null;
                        request.transactionId = transaction.id;
                        this.depositRequests.set(requestId, request);
                        activityId = "activity-".concat(this.nextAgentActivityId++);
                        activity = {
                            id: activityId,
                            agentId: agentId,
                            action: 'deposit_approval',
                            targetUserId: request.userId,
                            amount: amount.toFixed(8),
                            commissionAmount: commission.toFixed(8),
                            transactionId: transaction.id,
                            createdAt: new Date()
                        };
                        this.agentActivities.set(activityId, activity);
                        return [2 /*return*/, {
                                success: true,
                                request: request,
                                transaction: transaction,
                                user: user
                            }];
                }
            });
        });
    };
    // Whitelisted IP stub methods
    MemStorage.prototype.getAllWhitelistedIps = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    MemStorage.prototype.getWhitelistedIpByAddress = function (ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.addWhitelistedIp = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var id, whitelistedIp;
            return __generator(this, function (_a) {
                id = (0, crypto_1.randomUUID)();
                whitelistedIp = {
                    id: id,
                    ipAddress: data.ipAddress,
                    accountCountAtWhitelist: data.accountCountAtWhitelist || 0,
                    currentAccountCount: data.accountCountAtWhitelist || 0,
                    whitelistedBy: data.whitelistedBy,
                    whitelistedReason: data.whitelistedReason || null,
                    isActive: true,
                    exceededThreshold: false,
                    thresholdExceededAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return [2 /*return*/, whitelistedIp];
            });
        });
    };
    MemStorage.prototype.updateWhitelistedIp = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.deleteWhitelistedIp = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, false];
            });
        });
    };
    MemStorage.prototype.updateWhitelistedIpAccountCount = function (ipAddress, newCount) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    // Telegram Scheduled Posts stub methods
    MemStorage.prototype.createTelegramScheduledPost = function (post) {
        return __awaiter(this, void 0, void 0, function () {
            var id, scheduledPost;
            var _a;
            return __generator(this, function (_b) {
                id = (0, crypto_1.randomUUID)();
                scheduledPost = {
                    id: id,
                    channelId: post.channelId,
                    title: post.title,
                    messageText: post.messageText,
                    photoPath: post.photoPath || null,
                    photoUrl: post.photoUrl || null,
                    buttons: post.buttons || null,
                    scheduleTime: post.scheduleTime || null,
                    timezone: post.timezone || "Asia/Colombo",
                    repeatDaily: (_a = post.repeatDaily) !== null && _a !== void 0 ? _a : true,
                    daysOfWeek: post.daysOfWeek || "0,1,2,3,4,5,6",
                    periodId: post.periodId || null,
                    status: post.status || "active",
                    lastSentAt: null,
                    nextRunAt: null,
                    sentCount: 0,
                    createdBy: post.createdBy,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                this.telegramScheduledPostsMap.set(id, scheduledPost);
                return [2 /*return*/, scheduledPost];
            });
        });
    };
    MemStorage.prototype.getTelegramScheduledPosts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.telegramScheduledPostsMap.values())
                        .sort(function (a, b) { return b.createdAt.getTime() - a.createdAt.getTime(); })];
            });
        });
    };
    MemStorage.prototype.getTelegramScheduledPostById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.telegramScheduledPostsMap.get(id)];
            });
        });
    };
    MemStorage.prototype.updateTelegramScheduledPost = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            return __generator(this, function (_a) {
                existing = this.telegramScheduledPostsMap.get(id);
                if (!existing)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign(__assign({}, existing), updates), { updatedAt: new Date() });
                this.telegramScheduledPostsMap.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    MemStorage.prototype.deleteTelegramScheduledPost = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.telegramScheduledPostsMap.delete(id)];
            });
        });
    };
    MemStorage.prototype.getActiveTelegramScheduledPosts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Array.from(this.telegramScheduledPostsMap.values())
                        .filter(function (p) { return p.status === 'active'; })
                        .sort(function (a, b) {
                        var timeA = a.scheduleTime || '';
                        var timeB = b.scheduleTime || '';
                        return timeA.localeCompare(timeB);
                    })];
            });
        });
    };
    MemStorage.prototype.updateScheduledPostSentStatus = function (id, sentAt, repeatDaily) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            return __generator(this, function (_a) {
                existing = this.telegramScheduledPostsMap.get(id);
                if (!existing)
                    return [2 /*return*/, undefined];
                updated = __assign(__assign({}, existing), { lastSentAt: sentAt, sentCount: existing.sentCount + 1, updatedAt: new Date(), status: repeatDaily ? existing.status : 'completed' });
                this.telegramScheduledPostsMap.set(id, updated);
                return [2 /*return*/, updated];
            });
        });
    };
    // Crash Settings methods
    MemStorage.prototype.getCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                settings = Array.from(this.crashSettings.values());
                if (settings.length > 0)
                    return [2 /*return*/, settings[0]];
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.updateCrashSettings = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCrashSettings()];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            return [2 /*return*/, undefined];
                        updated = __assign(__assign(__assign({}, existing), updates), { minCrashMultiplier: updates.minMultiplier || updates.minCrashMultiplier || existing.minCrashMultiplier, updatedAt: new Date() });
                        this.crashSettings.set(existing.id, updated);
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    // Advanced Personalized Crash Settings
    MemStorage.prototype.getAdvancedCrashSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settings;
            return __generator(this, function (_a) {
                settings = Array.from(this.advancedCrashSettings.values());
                if (settings.length > 0)
                    return [2 /*return*/, settings[0]];
                return [2 /*return*/, undefined];
            });
        });
    };
    MemStorage.prototype.updateAdvancedCrashSettings = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAdvancedCrashSettings()];
                    case 1:
                        existing = _a.sent();
                        if (!existing)
                            return [2 /*return*/, undefined];
                        updated = __assign(__assign(__assign({}, existing), updates), { updatedAt: new Date() });
                        this.advancedCrashSettings.set(existing.id, updated);
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    return MemStorage;
}());
exports.MemStorage = MemStorage;
// Initialize storage with database
var StorageContainer = /** @class */ (function () {
    function StorageContainer() {
    }
    StorageContainer.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var databaseUrl, memStorage, error_32, memStorage;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        databaseUrl = ((_a = process.env.DO_DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.DATABASE_URL) === null || _b === void 0 ? void 0 : _b.trim());
                        if (!!databaseUrl) return [3 /*break*/, 2];
                        console.log('DATABASE_URL or DO_DATABASE_URL not found or empty, switching to in-memory mode');
                        memStorage = new MemStorage();
                        return [4 /*yield*/, memStorage.ensureInitialized()];
                    case 1:
                        _c.sent();
                        this.instance = memStorage;
                        return [2 /*return*/];
                    case 2:
                        _c.trys.push([2, 3, , 5]);
                        console.log('Initializing DatabaseStorage...');
                        this.instance = new DatabaseStorage();
                        console.log('✅ DatabaseStorage initialized successfully');
                        return [3 /*break*/, 5];
                    case 3:
                        error_32 = _c.sent();
                        console.error('❌ Database connection failed, falling back to MemStorage:', error_32);
                        memStorage = new MemStorage();
                        return [4 /*yield*/, memStorage.ensureInitialized()];
                    case 4:
                        _c.sent();
                        this.instance = memStorage;
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    StorageContainer.prototype.get = function () {
        return this.instance;
    };
    return StorageContainer;
}());
var storageContainer = new StorageContainer();
// Create a proxy that always delegates to the current storage instance
var storage = new Proxy({}, {
    get: function (_, prop) {
        return storageContainer.get()[prop];
    }
});
exports.storage = storage;
function initializeStorage() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, storageContainer.initialize()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37, templateObject_38, templateObject_39, templateObject_40, templateObject_41, templateObject_42, templateObject_43, templateObject_44, templateObject_45, templateObject_46;
