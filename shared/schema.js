"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.insertUserSchema = exports.vipLevelTelegramLinks = exports.promoCodeRedemptions = exports.promoCodes = exports.pushSubscriptions = exports.notifications = exports.passkeys = exports.agentActivities = exports.agentProfiles = exports.withdrawalRequests = exports.n1PanelReactionOrders = exports.databaseConnections = exports.telegramAutoJoinChannels = exports.whitelistedIps = exports.globalFreezeSnapshots = exports.globalFreezeSessions = exports.systemSettings = exports.telegramLoginSessions = exports.passwordResetTokens = exports.pageViews = exports.quickReplies = exports.supportChatMessages = exports.supportChatSessions = exports.userSessions = exports.gameAnalytics = exports.adminActions = exports.depositRequests = exports.transactions = exports.referrals = exports.bets = exports.games = exports.deviceLogins = exports.users = exports.depositRequestStatusEnum = exports.supportChatAuthorEnum = exports.supportChatStatusEnum = exports.databaseStatusEnum = exports.databaseTypeEnum = exports.referralStatusEnum = exports.paymentMethodEnum = exports.withdrawalRequestStatusEnum = exports.transactionStatusEnum = exports.transactionTypeEnum = exports.betStatusEnum = exports.betTypeEnum = exports.gameStatusEnum = exports.gameTypeEnum = exports.vipLevelEnum = exports.userRoleEnum = void 0;
exports.updateTelegramAutoJoinChannelSchema = exports.insertTelegramAutoJoinChannelSchema = exports.updateWhitelistedIpSchema = exports.insertWhitelistedIpSchema = exports.insertSystemSettingSchema = exports.insertWithdrawalRequestSchema = exports.insertTelegramLoginSessionSchema = exports.insertPageViewSchema = exports.updateQuickReplySchema = exports.insertQuickReplySchema = exports.insertSupportChatMessageSchema = exports.insertSupportChatSessionSchema = exports.insertUserSessionSchema = exports.insertGameAnalyticsSchema = exports.insertAdminActionSchema = exports.insertReferralSchema = exports.insertDepositRequestSchema = exports.insertTransactionSchema = exports.insertCrashBetSchema = exports.insertCrashGameSchema = exports.insertBetSchema = exports.insertGameSchema = exports.upsertVipLevelTelegramLinkSchema = exports.insertVipLevelTelegramLinkSchema = exports.insertPromoCodeRedemptionSchema = exports.redeemPromoCodeSchema = exports.createPromoCodeSchema = exports.insertPromoCodeSchema = exports.unsubscribeFromPushSchema = exports.subscribeToPushSchema = exports.insertPushSubscriptionSchema = exports.markNotificationReadSchema = exports.sendNotificationSchema = exports.insertNotificationSchema = exports.insertPasskeySchema = exports.updatePasskeySchema = exports.finishPasskeyAuthenticationSchema = exports.startPasskeyAuthenticationSchema = exports.finishPasskeyRegistrationSchema = exports.passkeyDeviceNameSchema = exports.startPasskeyRegistrationSchema = exports.telegramAuthSchema = exports.validate2FASchema = exports.verify2FASchema = exports.setup2FASchema = exports.verifyWithdrawalPasswordSchema = exports.changeWithdrawalPasswordSchema = exports.changePasswordSchema = exports.resetPasswordConfirmSchema = exports.resetPasswordSchema = void 0;
exports.insertTelegramGroupSchema = exports.updateTelegramReactionSettingSchema = exports.insertTelegramReactionSettingSchema = exports.createTelegramScheduledPostSchema = exports.updateTelegramScheduledPostSchema = exports.insertTelegramScheduledPostSchema = exports.telegramScheduledPosts = exports.telegramScheduledPostStatusEnum = exports.updateTelegramSignalSchema = exports.insertTelegramSignalSchema = exports.insertUserBettingTaskProgressSchema = exports.updateBettingTaskSchema = exports.insertBettingTaskSchema = exports.insertCoinFlipGameSchema = exports.insertAdvancedCrashSettingSchema = exports.advancedCrashSettings = exports.insertCrashSettingSchema = exports.crashSettings = exports.insertPredictedResultSchema = exports.insertGoldenLiveEventSchema = exports.insertGoldenLiveStatsSchema = exports.updateVipSettingSchema = exports.insertVipSettingSchema = exports.telegramReactionOrders = exports.telegramGroups = exports.telegramReactionSettings = exports.telegramReactionOrderStatusEnum = exports.telegramSignals = exports.telegramSignalStatusEnum = exports.userBettingTaskProgress = exports.bettingTasks = exports.coinFlipGames = exports.predictedResults = exports.goldenLiveEvents = exports.goldenLiveStats = exports.vipSettings = exports.agentSelfDepositSchema = exports.updateCommissionSchema = exports.agentWithdrawalSchema = exports.agentDepositSchema = exports.createAgentSchema = exports.adminWithdrawalResponseSchema = exports.adminDepositResponseSchema = exports.processWithdrawalRequestSchema = exports.createWithdrawalRequestSchema = exports.updateSystemSettingSchema = exports.insertDeviceLoginSchema = exports.insertAgentActivitySchema = exports.insertAgentProfileSchema = exports.insertDatabaseConnectionSchema = void 0;
exports.VIP_LEVELS = exports.predictedResultsRelations = exports.passkeysRelations = exports.agentActivitiesRelations = exports.agentProfilesRelations = exports.systemSettingsRelations = exports.withdrawalRequestsRelations = exports.passwordResetTokensRelations = exports.userSessionsRelations = exports.gameAnalyticsRelations = exports.adminActionsRelations = exports.referralsRelations = exports.transactionsRelations = exports.betsRelations = exports.gamesRelations = exports.usersRelations = exports.insertTelegramReactionOrderSchema = exports.updateTelegramGroupSchema = void 0;
exports.calculateVipLevel = calculateVipLevel;
exports.getMaxBetLimit = getMaxBetLimit;
exports.getVipDisplayName = getVipDisplayName;
exports.getCommissionRate = getCommissionRate;
exports.getDailyWagerReward = getDailyWagerReward;
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_zod_1 = require("drizzle-zod");
var zod_1 = require("zod");
// Enums for better type safety
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["user", "admin", "agent"]);
exports.vipLevelEnum = (0, pg_core_1.pgEnum)("vip_level", ["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]);
exports.gameTypeEnum = (0, pg_core_1.pgEnum)("game_type", ["color", "crash"]);
exports.gameStatusEnum = (0, pg_core_1.pgEnum)("game_status", ["active", "completed", "cancelled"]);
exports.betTypeEnum = (0, pg_core_1.pgEnum)("bet_type", ["color", "number", "size", "crash"]);
exports.betStatusEnum = (0, pg_core_1.pgEnum)("bet_status", ["pending", "won", "lost", "cashed_out", "cancelled"]);
exports.transactionTypeEnum = (0, pg_core_1.pgEnum)("transaction_type", ["deposit", "withdrawal", "referral_bonus", "agent_commission", "commission_withdrawal"]);
exports.transactionStatusEnum = (0, pg_core_1.pgEnum)("transaction_status", ["pending", "completed", "failed", "cancelled"]);
exports.withdrawalRequestStatusEnum = (0, pg_core_1.pgEnum)("withdrawal_request_status", ["pending", "approved", "rejected", "processing", "completed"]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)("payment_method", ["crypto", "bank_transfer", "agent", "internal"]);
exports.referralStatusEnum = (0, pg_core_1.pgEnum)("referral_status", ["active", "inactive"]);
exports.databaseTypeEnum = (0, pg_core_1.pgEnum)("database_type", ["postgresql", "mysql", "mongodb"]);
exports.databaseStatusEnum = (0, pg_core_1.pgEnum)("database_status", ["active", "inactive", "testing"]);
exports.supportChatStatusEnum = (0, pg_core_1.pgEnum)("support_chat_status", ["open", "active", "closed"]);
exports.supportChatAuthorEnum = (0, pg_core_1.pgEnum)("support_chat_author", ["user", "support", "system"]);
exports.depositRequestStatusEnum = (0, pg_core_1.pgEnum)("deposit_request_status", ["pending", "approved", "rejected", "completed"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    publicId: (0, pg_core_1.varchar)("public_id").unique(), // Random numeric ID like 02826262818 for user display
    email: (0, pg_core_1.text)("email").notNull().unique(), // Made email required
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(), // Hashed password for security
    withdrawalPasswordHash: (0, pg_core_1.text)("withdrawal_password_hash"), // Withdrawal password for security
    profilePhoto: (0, pg_core_1.text)("profile_photo"), // Base64 encoded profile photo or file path
    balance: (0, pg_core_1.decimal)("balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Support crypto precision
    frozenBalance: (0, pg_core_1.decimal)("frozen_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Frozen deposit amount that cannot be withdrawn
    accumulatedFee: (0, pg_core_1.decimal)("accumulated_fee", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Accumulated betting fees (only deduct whole coins)
    role: (0, exports.userRoleEnum)("role").notNull().default("user"),
    vipLevel: (0, exports.vipLevelEnum)("vip_level").notNull().default("lv1"), // VIP level based on team size
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    referralCode: (0, pg_core_1.text)("referral_code").unique(),
    referredBy: (0, pg_core_1.varchar)("referred_by"), // FK to users
    referralLevel: (0, pg_core_1.integer)("referral_level").notNull().default(1), // Level in referral tree (1=direct, 2=second level, etc.)
    totalDeposits: (0, pg_core_1.decimal)("total_deposits", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    totalWithdrawals: (0, pg_core_1.decimal)("total_withdrawals", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    totalWinnings: (0, pg_core_1.decimal)("total_winnings", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    totalLosses: (0, pg_core_1.decimal)("total_losses", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    totalCommission: (0, pg_core_1.decimal)("total_commission", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Commission earned from betting and referrals
    lifetimeCommissionEarned: (0, pg_core_1.decimal)("lifetime_commission_earned", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Lifetime total commission earned (never decreases)
    totalBetsAmount: (0, pg_core_1.decimal)("total_bets_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total amount wagered
    dailyWagerAmount: (0, pg_core_1.decimal)("daily_wager_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Today's wager amount
    lastWagerResetDate: (0, pg_core_1.timestamp)("last_wager_reset_date").default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))), // Track daily reset
    remainingRequiredBetAmount: (0, pg_core_1.decimal)("remaining_required_bet_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Remaining bet amount required from deposits (60% per deposit)
    teamSize: (0, pg_core_1.integer)("team_size").notNull().default(0), // Qualified referrals with $10+ deposit (for VIP level)
    totalTeamMembers: (0, pg_core_1.integer)("total_team_members").notNull().default(0), // All referrals (including those without deposits)
    registrationIp: (0, pg_core_1.text)("registration_ip"), // Store IP address when user registers
    registrationCountry: (0, pg_core_1.text)("registration_country"), // Store country code when user registers (from Cloudflare)
    lastLoginIp: (0, pg_core_1.text)("last_login_ip"), // Store last login IP
    lastLoginDeviceModel: (0, pg_core_1.text)("last_login_device_model"), // Last device model used
    lastLoginDeviceType: (0, pg_core_1.text)("last_login_device_type"), // Last device type (Mobile, Desktop, Tablet)
    lastLoginDeviceOs: (0, pg_core_1.text)("last_login_device_os"), // Last device operating system
    lastLoginBrowser: (0, pg_core_1.text)("last_login_browser"), // Last browser used
    telegramId: (0, pg_core_1.text)("telegram_id").unique(), // Telegram user ID for Telegram login
    telegramLinkToken: (0, pg_core_1.text)("telegram_link_token").unique(), // Short-lived token for linking Telegram account
    telegramLinkExpiresAt: (0, pg_core_1.timestamp)("telegram_link_expires_at"), // Expiry time for link token
    telegramUsername: (0, pg_core_1.text)("telegram_username"), // Telegram username
    telegramFirstName: (0, pg_core_1.text)("telegram_first_name"), // Telegram first name
    telegramPhotoUrl: (0, pg_core_1.text)("telegram_photo_url"), // Telegram profile photo URL
    maxBetLimit: (0, pg_core_1.decimal)("max_bet_limit", { precision: 18, scale: 8 }).notNull().default("999999.00000000"), // VIP level adjustable bet limit
    twoFactorEnabled: (0, pg_core_1.boolean)("two_factor_enabled").notNull().default(false), // 2FA status
    twoFactorSecret: (0, pg_core_1.text)("two_factor_secret"), // TOTP secret for 2FA
    isBanned: (0, pg_core_1.boolean)("is_banned").notNull().default(false), // Whether user is banned
    bannedUntil: (0, pg_core_1.timestamp)("banned_until"), // Temporary ban expiry (null = permanent ban if isBanned is true)
    banReason: (0, pg_core_1.text)("ban_reason"), // Reason for the ban
    enableAnimations: (0, pg_core_1.boolean)("enable_animations").notNull().default(true), // User preference for 3D animations and effects
    wingoMode: (0, pg_core_1.boolean)("wingo_mode").notNull().default(false), // Focus mode - shows only Win Go game interface
    lastWithdrawalRequestAt: (0, pg_core_1.timestamp)("last_withdrawal_request_at"), // Track last withdrawal request time for cooldown period
    binanceId: (0, pg_core_1.text)("binance_id"), // Agent's Binance Pay ID for receiving deposits
    minDepositAmount: (0, pg_core_1.decimal)("min_deposit_amount", { precision: 18, scale: 2 }).default("10.00"), // Minimum deposit amount for agents
    maxDepositAmount: (0, pg_core_1.decimal)("max_deposit_amount", { precision: 18, scale: 2 }).default("10000.00"), // Maximum deposit amount for agents
    isAcceptingDeposits: (0, pg_core_1.boolean)("is_accepting_deposits").notNull().default(true), // Toggle for agents to accept/reject deposits
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Device logins table - tracks all login attempts and device fingerprints
exports.deviceLogins = (0, pg_core_1.pgTable)("device_logins", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    deviceFingerprint: (0, pg_core_1.text)("device_fingerprint").notNull(), // Unique device ID from browser fingerprinting
    deviceModel: (0, pg_core_1.text)("device_model").notNull(), // e.g., "iPhone 14 Pro Max", "Samsung Galaxy S24 Ultra"
    deviceType: (0, pg_core_1.text)("device_type").notNull(), // "Mobile", "Desktop", "Tablet"
    operatingSystem: (0, pg_core_1.text)("operating_system").notNull(), // e.g., "iOS 17.2", "Android 14"
    browserName: (0, pg_core_1.text)("browser_name").notNull(), // e.g., "Chrome", "Safari"
    browserVersion: (0, pg_core_1.text)("browser_version").notNull(),
    screenWidth: (0, pg_core_1.integer)("screen_width"),
    screenHeight: (0, pg_core_1.integer)("screen_height"),
    pixelRatio: (0, pg_core_1.decimal)("pixel_ratio", { precision: 3, scale: 2 }),
    timezone: (0, pg_core_1.text)("timezone"),
    language: (0, pg_core_1.text)("language"),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    country: (0, pg_core_1.text)("country"),
    loginAt: (0, pg_core_1.timestamp)("login_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("device_logins_user_id_idx").on(table.userId),
    deviceFingerprintIdx: (0, pg_core_1.index)("device_logins_fingerprint_idx").on(table.deviceFingerprint),
}); });
exports.games = (0, pg_core_1.pgTable)("games", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    gameId: (0, pg_core_1.text)("game_id").notNull().unique(),
    gameType: (0, exports.gameTypeEnum)("game_type").notNull().default("color"), // 'color' or 'crash'
    roundDuration: (0, pg_core_1.integer)("round_duration").notNull(), // in minutes
    startTime: (0, pg_core_1.timestamp)("start_time").notNull(),
    endTime: (0, pg_core_1.timestamp)("end_time").notNull(),
    status: (0, exports.gameStatusEnum)("status").notNull().default("active"),
    result: (0, pg_core_1.integer)("result"), // winning number 0-9
    resultColor: (0, pg_core_1.text)("result_color"), // 'green', 'red', 'violet'
    resultSize: (0, pg_core_1.text)("result_size"), // 'big', 'small'
    // Crash game specific fields
    crashPoint: (0, pg_core_1.decimal)("crash_point", { precision: 10, scale: 2 }), // The multiplier when crash happens (e.g., 2.34)
    currentMultiplier: (0, pg_core_1.decimal)("current_multiplier", { precision: 10, scale: 2 }).default("1.00"), // Current multiplier for active crash games
    crashedAt: (0, pg_core_1.timestamp)("crashed_at"), // When the crash happened
    isManuallyControlled: (0, pg_core_1.boolean)("is_manually_controlled").notNull().default(false),
    manualResult: (0, pg_core_1.integer)("manual_result"), // admin set result (0-9)
    totalBetsAmount: (0, pg_core_1.decimal)("total_bets_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    totalPayouts: (0, pg_core_1.decimal)("total_payouts", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    houseProfit: (0, pg_core_1.decimal)("house_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    statusIdx: (0, pg_core_1.index)("games_status_idx").on(table.status),
}); });
exports.bets = (0, pg_core_1.pgTable)("bets", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    gameId: (0, pg_core_1.varchar)("game_id").notNull(), // FK to games
    betType: (0, exports.betTypeEnum)("bet_type").notNull(),
    betValue: (0, pg_core_1.text)("bet_value").notNull(), // 'green', 'red', 'violet', '0-9', 'big', 'small', 'crash'
    amount: (0, pg_core_1.decimal)("amount", { precision: 18, scale: 8 }).notNull(),
    potential: (0, pg_core_1.decimal)("potential", { precision: 18, scale: 8 }).notNull(),
    actualPayout: (0, pg_core_1.decimal)("actual_payout", { precision: 18, scale: 8 }), // Actual payout after fees (null for lost/pending bets)
    status: (0, exports.betStatusEnum)("status").notNull().default("pending"),
    // Crash game specific fields
    cashOutMultiplier: (0, pg_core_1.decimal)("cash_out_multiplier", { precision: 10, scale: 2 }), // Multiplier when player cashed out
    autoCashOut: (0, pg_core_1.decimal)("auto_cash_out", { precision: 10, scale: 2 }), // Auto cash out at this multiplier
    cashedOutAt: (0, pg_core_1.timestamp)("cashed_out_at"), // When the bet was cashed out
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"), // When the bet status was last updated (settled)
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("bets_user_id_idx").on(table.userId),
    gameIdIdx: (0, pg_core_1.index)("bets_game_id_idx").on(table.gameId),
    statusIdx: (0, pg_core_1.index)("bets_status_idx").on(table.status),
}); });
// Referral system table with proper constraints
exports.referrals = (0, pg_core_1.pgTable)("referrals", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    referrerId: (0, pg_core_1.varchar)("referrer_id").notNull(), // FK to users
    referredId: (0, pg_core_1.varchar)("referred_id").notNull().unique(), // FK to users, unique to prevent multiple referrers
    referralLevel: (0, pg_core_1.integer)("referral_level").notNull().default(1), // Level in referrer's team (1=direct, 2=indirect, etc.)
    commissionRate: (0, pg_core_1.decimal)("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0600"), // 6% default
    totalCommission: (0, pg_core_1.decimal)("total_commission", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    hasDeposited: (0, pg_core_1.boolean)("has_deposited").notNull().default(false), // Track if referred user made deposit
    status: (0, exports.referralStatusEnum)("status").notNull().default("active"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    referrerIdIdx: (0, pg_core_1.index)("referrals_referrer_id_idx").on(table.referrerId),
}); });
// Payment transactions table with crypto precision support
exports.transactions = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    agentId: (0, pg_core_1.varchar)("agent_id"), // FK to users with role='agent' - for agent-processed transactions
    type: (0, exports.transactionTypeEnum)("type").notNull(),
    // Separate amounts for different currencies
    fiatAmount: (0, pg_core_1.decimal)("fiat_amount", { precision: 18, scale: 2 }), // For USD, EUR, etc.
    cryptoAmount: (0, pg_core_1.decimal)("crypto_amount", { precision: 36, scale: 18 }), // For crypto with full precision
    fiatCurrency: (0, pg_core_1.text)("fiat_currency").default("USD"), // USD, EUR, etc.
    cryptoCurrency: (0, pg_core_1.text)("crypto_currency"), // BTC, ETH, USDT, etc.
    status: (0, exports.transactionStatusEnum)("status").notNull().default("pending"),
    paymentMethod: (0, exports.paymentMethodEnum)("payment_method").notNull(),
    externalId: (0, pg_core_1.text)("external_id"), // NOWPayments payment ID
    paymentAddress: (0, pg_core_1.text)("payment_address"), // Crypto address
    txHash: (0, pg_core_1.text)("tx_hash"), // Blockchain transaction hash
    fee: (0, pg_core_1.decimal)("fee", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("transactions_user_id_idx").on(table.userId),
    externalIdIdx: (0, pg_core_1.index)("transactions_external_id_idx").on(table.externalId),
    statusIdx: (0, pg_core_1.index)("transactions_status_idx").on(table.status),
}); });
// Agent deposit requests table
exports.depositRequests = (0, pg_core_1.pgTable)("deposit_requests", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users - who requested deposit
    agentId: (0, pg_core_1.varchar)("agent_id").notNull(), // FK to users - agent who will process
    amount: (0, pg_core_1.decimal)("amount", { precision: 18, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    status: (0, exports.depositRequestStatusEnum)("status").notNull().default("pending"),
    transactionId: (0, pg_core_1.varchar)("transaction_id"), // FK to transactions when approved
    paymentProof: (0, pg_core_1.text)("payment_proof"), // User uploaded payment screenshot/proof (base64 or URL)
    userNote: (0, pg_core_1.text)("user_note"), // Note from user about the payment
    agentNote: (0, pg_core_1.text)("agent_note"), // Agent's note when processing
    processedAt: (0, pg_core_1.timestamp)("processed_at"), // When agent approved/rejected
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("deposit_requests_user_id_idx").on(table.userId),
    agentIdIdx: (0, pg_core_1.index)("deposit_requests_agent_id_idx").on(table.agentId),
    statusIdx: (0, pg_core_1.index)("deposit_requests_status_idx").on(table.status),
}); });
// Admin actions audit log
exports.adminActions = (0, pg_core_1.pgTable)("admin_actions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    adminId: (0, pg_core_1.varchar)("admin_id").notNull(), // FK to users
    action: (0, pg_core_1.text)("action").notNull(), // 'manual_game_result', 'user_edit', 'balance_adjustment'
    targetId: (0, pg_core_1.varchar)("target_id"), // ID of affected entity (user, game, etc.)
    details: (0, pg_core_1.jsonb)("details").notNull(), // Structured JSON data for action details
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    adminIdIdx: (0, pg_core_1.index)("admin_actions_admin_id_idx").on(table.adminId),
}); });
// Game analytics table
exports.gameAnalytics = (0, pg_core_1.pgTable)("game_analytics", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    gameId: (0, pg_core_1.varchar)("game_id").notNull().unique(), // FK to games, one analytics per game
    totalPlayers: (0, pg_core_1.integer)("total_players").notNull().default(0),
    totalBets: (0, pg_core_1.integer)("total_bets").notNull().default(0),
    totalVolume: (0, pg_core_1.decimal)("total_volume", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    houseEdge: (0, pg_core_1.decimal)("house_edge", { precision: 5, scale: 4 }).notNull().default("0.0500"),
    actualProfit: (0, pg_core_1.decimal)("actual_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    expectedProfit: (0, pg_core_1.decimal)("expected_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
    profitMargin: (0, pg_core_1.decimal)("profit_margin", { precision: 5, scale: 4 }).notNull().default("0.0000"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// IP tracking and user analytics table
exports.userSessions = (0, pg_core_1.pgTable)("user_sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    ipAddress: (0, pg_core_1.text)("ip_address").notNull(),
    userAgent: (0, pg_core_1.text)("user_agent"),
    browserName: (0, pg_core_1.text)("browser_name"), // Parsed browser name
    browserVersion: (0, pg_core_1.text)("browser_version"), // Parsed browser version
    deviceType: (0, pg_core_1.text)("device_type"), // mobile, desktop, tablet
    deviceModel: (0, pg_core_1.text)("device_model"), // Parsed device model (e.g., "iPhone 15 Pro", "Samsung Galaxy S24")
    operatingSystem: (0, pg_core_1.text)("operating_system"), // Parsed OS name
    loginTime: (0, pg_core_1.timestamp)("login_time").notNull().default((0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    logoutTime: (0, pg_core_1.timestamp)("logout_time"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("user_sessions_user_id_idx").on(table.userId),
}); });
// Support chat sessions table for live chat with Telegram integration
exports.supportChatSessions = (0, pg_core_1.pgTable)("support_chat_sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id"), // FK to users (null for anonymous chat)
    sessionToken: (0, pg_core_1.text)("session_token").notNull().unique(), // Unique token to access session
    userDisplayName: (0, pg_core_1.text)("user_display_name").notNull(), // Name entered by user
    telegramChatId: (0, pg_core_1.text)("telegram_chat_id"), // Telegram chat/group ID where messages are forwarded
    status: (0, exports.supportChatStatusEnum)("status").notNull().default("open"),
    lastMessageAt: (0, pg_core_1.timestamp)("last_message_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    closedAt: (0, pg_core_1.timestamp)("closed_at"),
}, function (table) { return ({
    sessionTokenIdx: (0, pg_core_1.index)("support_chat_sessions_token_idx").on(table.sessionToken),
    statusIdx: (0, pg_core_1.index)("support_chat_sessions_status_idx").on(table.status),
}); });
// Support chat messages table
exports.supportChatMessages = (0, pg_core_1.pgTable)("support_chat_messages", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    sessionId: (0, pg_core_1.varchar)("session_id").notNull(), // FK to support_chat_sessions
    author: (0, exports.supportChatAuthorEnum)("author").notNull(), // user, support, or system
    authorTelegramId: (0, pg_core_1.text)("author_telegram_id"), // Telegram user ID of support agent
    body: (0, pg_core_1.text)("body").notNull(), // Message content
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional data like attachments, replied_to, etc.
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"), // When message was delivered to client
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    sessionIdIdx: (0, pg_core_1.index)("support_chat_messages_session_id_idx").on(table.sessionId),
    createdAtIdx: (0, pg_core_1.index)("support_chat_messages_created_at_idx").on(table.createdAt),
}); });
// Quick replies table for admin chat shortcuts
exports.quickReplies = (0, pg_core_1.pgTable)("quick_replies", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    shortcut: (0, pg_core_1.text)("shortcut").notNull().unique(), // Short identifier like "hello", "thanks"
    message: (0, pg_core_1.text)("message").notNull(), // The full reply text
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(), // FK to users (admin)
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    shortcutIdx: (0, pg_core_1.index)("quick_replies_shortcut_idx").on(table.shortcut),
}); });
// Page views tracking table for traffic analytics
exports.pageViews = (0, pg_core_1.pgTable)("page_views", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id"), // FK to users (null for anonymous visitors)
    path: (0, pg_core_1.text)("path").notNull(), // Page path (e.g., "/", "/game", "/profile")
    ipAddress: (0, pg_core_1.text)("ip_address").notNull(),
    country: (0, pg_core_1.text)("country"), // Country code from Cloudflare (e.g., "US", "LK", "IN")
    userAgent: (0, pg_core_1.text)("user_agent"),
    browserName: (0, pg_core_1.text)("browser_name"),
    deviceType: (0, pg_core_1.text)("device_type"), // mobile, desktop, tablet
    deviceModel: (0, pg_core_1.text)("device_model"), // Parsed device model (e.g., "iPhone 15 Pro", "Samsung Galaxy S24")
    operatingSystem: (0, pg_core_1.text)("operating_system"),
    referrer: (0, pg_core_1.text)("referrer"), // Where the visitor came from
    sessionId: (0, pg_core_1.text)("session_id"), // Track unique sessions
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("page_views_user_id_idx").on(table.userId),
    pathIdx: (0, pg_core_1.index)("page_views_path_idx").on(table.path),
    createdAtIdx: (0, pg_core_1.index)("page_views_created_at_idx").on(table.createdAt),
}); });
// Password reset tokens table
exports.passwordResetTokens = (0, pg_core_1.pgTable)("password_reset_tokens", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    email: (0, pg_core_1.text)("email").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    used: (0, pg_core_1.boolean)("used").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Telegram login sessions table - persistent storage for Telegram authentication
exports.telegramLoginSessions = (0, pg_core_1.pgTable)("telegram_login_sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    token: (0, pg_core_1.text)("token").notNull().unique(), // Unique login token (e.g., login_abc123...)
    userId: (0, pg_core_1.varchar)("user_id"), // FK to users - set when login is completed
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(), // Session expiry time
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    tokenIdx: (0, pg_core_1.index)("telegram_login_sessions_token_idx").on(table.token),
    expiresAtIdx: (0, pg_core_1.index)("telegram_login_sessions_expires_at_idx").on(table.expiresAt),
}); });
// System settings table for admin-configurable settings
exports.systemSettings = (0, pg_core_1.pgTable)("system_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_38 || (templateObject_38 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    key: (0, pg_core_1.text)("key").notNull().unique(), // Setting name (e.g., 'nowpayments_api_key')
    value: (0, pg_core_1.text)("value").notNull(), // Setting value (encrypted for sensitive data)
    description: (0, pg_core_1.text)("description"), // Optional description
    isEncrypted: (0, pg_core_1.boolean)("is_encrypted").notNull().default(false), // Whether the value is encrypted
    lastUpdatedBy: (0, pg_core_1.varchar)("last_updated_by").notNull(), // Admin user ID who last updated
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_39 || (templateObject_39 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_40 || (templateObject_40 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Global freeze sessions table - tracks when entire system's frozen balances are temporarily unfrozen
exports.globalFreezeSessions = (0, pg_core_1.pgTable)("global_freeze_sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_41 || (templateObject_41 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    status: (0, pg_core_1.text)("status").notNull().default("active"), // 'active' or 'completed'
    activatedAt: (0, pg_core_1.timestamp)("activated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_42 || (templateObject_42 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))), // When unfreeze was activated
    deactivatedAt: (0, pg_core_1.timestamp)("deactivated_at"), // When it was deactivated (null if still active)
    initiatedBy: (0, pg_core_1.varchar)("initiated_by").notNull(), // Admin user ID who initiated this unfreeze
    totalUsersAffected: (0, pg_core_1.integer)("total_users_affected").notNull().default(0), // Count of users whose balances were unfrozen
    totalAmountUnfrozen: (0, pg_core_1.decimal)("total_amount_unfrozen", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total frozen amount that was temporarily released
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_43 || (templateObject_43 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    statusIdx: (0, pg_core_1.index)("global_freeze_sessions_status_idx").on(table.status),
}); });
// Global freeze snapshots table - stores original frozen balance for each user during a global unfreeze session
exports.globalFreezeSnapshots = (0, pg_core_1.pgTable)("global_freeze_snapshots", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_44 || (templateObject_44 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    sessionId: (0, pg_core_1.varchar)("session_id").notNull(), // FK to globalFreezeSessions
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    originalFrozenBalance: (0, pg_core_1.decimal)("original_frozen_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // User's frozen balance before unfreeze
    restored: (0, pg_core_1.boolean)("restored").notNull().default(false), // Whether this snapshot has been restored
    restoredAt: (0, pg_core_1.timestamp)("restored_at"), // When the balance was restored
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_45 || (templateObject_45 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    sessionUserIdx: (0, pg_core_1.index)("global_freeze_snapshots_session_user_idx").on(table.sessionId, table.userId),
    userIdIdx: (0, pg_core_1.index)("global_freeze_snapshots_user_id_idx").on(table.userId),
}); });
// Whitelisted IPs table for high-risk IP management
exports.whitelistedIps = (0, pg_core_1.pgTable)("whitelisted_ips", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_46 || (templateObject_46 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    ipAddress: (0, pg_core_1.text)("ip_address").notNull().unique(), // The whitelisted IP address
    accountCountAtWhitelist: (0, pg_core_1.integer)("account_count_at_whitelist").notNull().default(0), // Number of accounts when whitelisted
    currentAccountCount: (0, pg_core_1.integer)("current_account_count").notNull().default(0), // Current number of accounts using this IP
    whitelistedBy: (0, pg_core_1.varchar)("whitelisted_by").notNull(), // Admin user ID who whitelisted this IP
    whitelistedReason: (0, pg_core_1.text)("whitelisted_reason"), // Optional reason for whitelisting
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true), // Whether whitelist is still active
    exceededThreshold: (0, pg_core_1.boolean)("exceeded_threshold").notNull().default(false), // Flag when account count exceeds threshold
    thresholdExceededAt: (0, pg_core_1.timestamp)("threshold_exceeded_at"), // When threshold was first exceeded
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_47 || (templateObject_47 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_48 || (templateObject_48 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    ipAddressIdx: (0, pg_core_1.index)("whitelisted_ips_ip_address_idx").on(table.ipAddress),
    isActiveIdx: (0, pg_core_1.index)("whitelisted_ips_is_active_idx").on(table.isActive),
}); });
// Telegram auto-join channels/groups configuration
exports.telegramAutoJoinChannels = (0, pg_core_1.pgTable)("telegram_auto_join_channels", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_49 || (templateObject_49 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    chatId: (0, pg_core_1.text)("chat_id").notNull().unique(), // Telegram channel/group chat ID
    channelName: (0, pg_core_1.text)("channel_name").notNull(), // Display name for admin reference
    inviteLink: (0, pg_core_1.text)("invite_link").notNull(), // Static invite link or bot-generated link
    isEnabled: (0, pg_core_1.boolean)("is_enabled").notNull().default(true), // Whether this channel is active for auto-join
    autoApproveJoinRequests: (0, pg_core_1.boolean)("auto_approve_join_requests").notNull().default(false), // Auto-approve join requests
    priority: (0, pg_core_1.integer)("priority").notNull().default(1), // Display order (1 = highest priority)
    lastLinkRefreshAt: (0, pg_core_1.timestamp)("last_link_refresh_at"), // When the invite link was last refreshed
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(), // Admin who created this
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_50 || (templateObject_50 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_51 || (templateObject_51 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    priorityIdx: (0, pg_core_1.index)("telegram_auto_join_priority_idx").on(table.priority),
}); });
// Database connections table for multi-database management
exports.databaseConnections = (0, pg_core_1.pgTable)("database_connections", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_52 || (templateObject_52 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    name: (0, pg_core_1.text)("name").notNull(), // User-friendly name (e.g., 'Digital Ocean Backup', 'AWS Production')
    databaseType: (0, exports.databaseTypeEnum)("database_type").notNull(), // postgresql, mysql, mongodb
    host: (0, pg_core_1.text)("host").notNull(), // Database host (e.g., 'db.example.com')
    port: (0, pg_core_1.integer)("port").notNull(), // Database port (e.g., 5432, 3306)
    database: (0, pg_core_1.text)("database").notNull(), // Database name
    username: (0, pg_core_1.text)("username").notNull(), // Database username
    password: (0, pg_core_1.text)("password").notNull(), // Database password (encrypted)
    ssl: (0, pg_core_1.boolean)("ssl").notNull().default(true), // Use SSL connection
    status: (0, exports.databaseStatusEnum)("status").notNull().default("inactive"), // active, inactive, testing
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(false), // Currently active database
    isPrimary: (0, pg_core_1.boolean)("is_primary").notNull().default(false), // Primary database for the application
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at"), // Last time data was synced to this database
    lastTestAt: (0, pg_core_1.timestamp)("last_test_at"), // Last time connection was tested
    connectionStatus: (0, pg_core_1.text)("connection_status"), // Result of last connection test
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(), // Admin user ID who created this connection
    updatedBy: (0, pg_core_1.varchar)("updated_by"), // Admin user ID who last updated
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_53 || (templateObject_53 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_54 || (templateObject_54 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// N1Panel reaction orders table
exports.n1PanelReactionOrders = (0, pg_core_1.pgTable)("n1panel_reaction_orders", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_55 || (templateObject_55 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    telegramMessageId: (0, pg_core_1.bigint)("telegram_message_id", { mode: "number" }).notNull(), // Telegram message ID that triggered the order
    telegramChannelId: (0, pg_core_1.text)("telegram_channel_id").notNull(), // Channel/chat ID where message was posted
    messageLink: (0, pg_core_1.text)("message_link").notNull(), // Full message link for N1Panel API
    serviceId: (0, pg_core_1.integer)("service_id").notNull(), // N1Panel service ID (e.g., 3232)
    quantity: (0, pg_core_1.integer)("quantity").notNull(), // Number of reactions ordered
    n1PanelOrderId: (0, pg_core_1.integer)("n1panel_order_id"), // Order ID returned by N1Panel API
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // pending, processing, completed, failed
    charge: (0, pg_core_1.decimal)("charge", { precision: 18, scale: 8 }), // Amount charged by N1Panel
    startCount: (0, pg_core_1.text)("start_count"), // Initial count from N1Panel status
    remains: (0, pg_core_1.text)("remains"), // Remaining count from N1Panel status
    errorMessage: (0, pg_core_1.text)("error_message"), // Error message if order failed
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_56 || (templateObject_56 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_57 || (templateObject_57 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    messageIdIdx: (0, pg_core_1.index)("n1panel_orders_message_id_idx").on(table.telegramMessageId),
    statusIdx: (0, pg_core_1.index)("n1panel_orders_status_idx").on(table.status),
    createdAtIdx: (0, pg_core_1.index)("n1panel_orders_created_at_idx").on(table.createdAt),
}); });
// Withdrawal requests table
exports.withdrawalRequests = (0, pg_core_1.pgTable)("withdrawal_requests", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_58 || (templateObject_58 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    amount: (0, pg_core_1.decimal)("amount", { precision: 18, scale: 8 }).notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    walletAddress: (0, pg_core_1.text)("wallet_address").notNull(),
    status: (0, exports.withdrawalRequestStatusEnum)("status").notNull().default("pending"),
    adminNote: (0, pg_core_1.text)("admin_note"), // Admin can add notes
    requiredBetAmount: (0, pg_core_1.decimal)("required_bet_amount", { precision: 18, scale: 8 }).notNull(), // 60% of deposits
    currentBetAmount: (0, pg_core_1.decimal)("current_bet_amount", { precision: 18, scale: 8 }).notNull(), // User's current betting
    eligible: (0, pg_core_1.boolean)("eligible").notNull().default(false), // Auto-calculated eligibility
    duplicateIpCount: (0, pg_core_1.integer)("duplicate_ip_count").notNull().default(0), // Number of accounts from same registration IP
    duplicateIpUserIds: (0, pg_core_1.text)("duplicate_ip_user_ids").array(), // User IDs with same registration IP
    commissionAmount: (0, pg_core_1.decimal)("commission_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Amount from referral/commission earnings
    winningsAmount: (0, pg_core_1.decimal)("winnings_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Amount from bet winnings
    balanceFrozen: (0, pg_core_1.boolean)("balance_frozen").notNull().default(false), // Track if balance was deducted when request was created
    processedAt: (0, pg_core_1.timestamp)("processed_at"),
    processedBy: (0, pg_core_1.varchar)("processed_by"), // Admin user ID
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_59 || (templateObject_59 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_60 || (templateObject_60 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("withdrawal_requests_user_id_idx").on(table.userId),
    statusIdx: (0, pg_core_1.index)("withdrawal_requests_status_idx").on(table.status),
}); });
// Agent profiles table - extends users with role='agent'
exports.agentProfiles = (0, pg_core_1.pgTable)("agent_profiles", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_61 || (templateObject_61 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull().unique(), // FK to users with role='agent'
    displayName: (0, pg_core_1.text)("display_name"), // Custom display name for agent (shown to users instead of email)
    commissionRate: (0, pg_core_1.decimal)("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0500"), // 5% default commission
    earningsBalance: (0, pg_core_1.decimal)("earnings_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Agent's commission earnings
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_62 || (templateObject_62 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_63 || (templateObject_63 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Agent activities audit table
exports.agentActivities = (0, pg_core_1.pgTable)("agent_activities", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_64 || (templateObject_64 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    agentId: (0, pg_core_1.varchar)("agent_id").notNull(), // FK to users with role='agent'
    action: (0, pg_core_1.text)("action").notNull(), // 'deposit', 'withdrawal', 'commission_award'
    targetUserId: (0, pg_core_1.varchar)("target_user_id"), // FK to users - who was affected by the action
    amount: (0, pg_core_1.decimal)("amount", { precision: 18, scale: 8 }).notNull(), // Transaction amount
    commissionAmount: (0, pg_core_1.decimal)("commission_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Commission earned
    transactionId: (0, pg_core_1.varchar)("transaction_id"), // FK to transactions
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_65 || (templateObject_65 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    agentIdIdx: (0, pg_core_1.index)("agent_activities_agent_id_idx").on(table.agentId),
}); });
// Passkeys table for WebAuthn credentials (for withdrawal security)
exports.passkeys = (0, pg_core_1.pgTable)("passkeys", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_66 || (templateObject_66 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    credentialId: (0, pg_core_1.text)("credential_id").notNull().unique(), // Base64URL encoded credential ID from WebAuthn
    publicKey: (0, pg_core_1.text)("public_key").notNull(), // Base64URL encoded public key from WebAuthn
    counter: (0, pg_core_1.bigint)("counter", { mode: "number" }).notNull().default(0), // Signature counter for replay attack prevention
    deviceName: (0, pg_core_1.text)("device_name").notNull(), // User-friendly name for the device (e.g., "iPhone", "Touch ID", "YubiKey")
    rpId: (0, pg_core_1.text)("rp_id").notNull(), // Domain where passkey was registered (e.g., "threexbet.com")
    origin: (0, pg_core_1.text)("origin").notNull(), // Full origin URL where passkey was registered (e.g., "https://threexbet.com")
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true), // Allow users to disable specific passkeys
    isDomainMismatch: (0, pg_core_1.boolean)("is_domain_mismatch").notNull().default(false), // Flag for passkeys registered on a different domain
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at"), // Track when the passkey was last used
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_67 || (templateObject_67 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_68 || (templateObject_68 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Notifications table for admin-to-user messaging
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_69 || (templateObject_69 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id"), // FK to users - null means notification to all users
    title: (0, pg_core_1.text)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    type: (0, pg_core_1.text)("type").notNull().default("info"), // info, success, warning, error
    imageUrl: (0, pg_core_1.text)("image_url"), // Optional image for rich notifications
    isRead: (0, pg_core_1.boolean)("is_read").notNull().default(false),
    sentBy: (0, pg_core_1.varchar)("sent_by").notNull(), // FK to admin user
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_70 || (templateObject_70 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("notifications_user_id_idx").on(table.userId),
    isReadIdx: (0, pg_core_1.index)("notifications_is_read_idx").on(table.isRead),
}); });
// Push subscriptions table for PWA push notifications
exports.pushSubscriptions = (0, pg_core_1.pgTable)("push_subscriptions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_71 || (templateObject_71 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    endpoint: (0, pg_core_1.text)("endpoint").notNull().unique(),
    p256dhKey: (0, pg_core_1.text)("p256dh_key").notNull(), // Client public key for encryption
    authKey: (0, pg_core_1.text)("auth_key").notNull(), // Authentication secret
    userAgent: (0, pg_core_1.text)("user_agent"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_72 || (templateObject_72 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_73 || (templateObject_73 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("push_subscriptions_user_id_idx").on(table.userId),
    endpointIdx: (0, pg_core_1.index)("push_subscriptions_endpoint_idx").on(table.endpoint),
}); });
// Promo codes table for promotional giveaways
exports.promoCodes = (0, pg_core_1.pgTable)("promo_codes", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_74 || (templateObject_74 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    code: (0, pg_core_1.text)("code").notNull().unique(), // The actual promo code
    totalValue: (0, pg_core_1.decimal)("total_value", { precision: 18, scale: 8 }).notNull(), // Total value of the code (e.g., 100 coins)
    minValue: (0, pg_core_1.decimal)("min_value", { precision: 18, scale: 8 }).notNull(), // Minimum random value users can get
    maxValue: (0, pg_core_1.decimal)("max_value", { precision: 18, scale: 8 }).notNull(), // Maximum random value users can get
    usageLimit: (0, pg_core_1.integer)("usage_limit"), // null = unlimited, otherwise max number of redemptions
    usedCount: (0, pg_core_1.integer)("used_count").notNull().default(0), // Number of times redeemed
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true), // Whether code can be redeemed
    requireDeposit: (0, pg_core_1.boolean)("require_deposit").notNull().default(false), // Only users who deposited can redeem
    vipLevelUpgrade: (0, exports.vipLevelEnum)("vip_level_upgrade"), // VIP level to upgrade user to (null = no upgrade)
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // null = never expires
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(), // FK to admin user
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_75 || (templateObject_75 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_76 || (templateObject_76 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    codeIdx: (0, pg_core_1.index)("promo_codes_code_idx").on(table.code),
    isActiveIdx: (0, pg_core_1.index)("promo_codes_is_active_idx").on(table.isActive),
}); });
// Promo code redemptions tracking
exports.promoCodeRedemptions = (0, pg_core_1.pgTable)("promo_code_redemptions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_77 || (templateObject_77 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    promoCodeId: (0, pg_core_1.varchar)("promo_code_id").notNull(), // FK to promoCodes
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    code: (0, pg_core_1.text)("code").notNull(), // Store code for reference
    amountAwarded: (0, pg_core_1.decimal)("amount_awarded", { precision: 18, scale: 8 }).notNull(), // Actual amount user received (random between min-max)
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_78 || (templateObject_78 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    promoCodeIdIdx: (0, pg_core_1.index)("promo_code_redemptions_promo_code_id_idx").on(table.promoCodeId),
    userIdIdx: (0, pg_core_1.index)("promo_code_redemptions_user_id_idx").on(table.userId),
    // Unique constraint to prevent same user from redeeming same code multiple times
    userCodeIdx: (0, pg_core_1.index)("promo_code_redemptions_user_code_idx").on(table.userId, table.code),
}); });
// VIP Level Telegram Links table for level-based telegram group/channel links
exports.vipLevelTelegramLinks = (0, pg_core_1.pgTable)("vip_level_telegram_links", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_79 || (templateObject_79 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    vipLevel: (0, exports.vipLevelEnum)("vip_level").notNull().unique(), // VIP level (lv1, lv2, vip, vip1, etc.)
    telegramLink: (0, pg_core_1.text)("telegram_link").notNull(), // Telegram group or channel link
    description: (0, pg_core_1.text)("description"), // Optional description for the link
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true), // Whether the link is active
    updatedBy: (0, pg_core_1.varchar)("updated_by").notNull(), // FK to admin user who last updated
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_80 || (templateObject_80 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_81 || (templateObject_81 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    vipLevelIdx: (0, pg_core_1.index)("vip_level_telegram_links_vip_level_idx").on(table.vipLevel),
}); });
// Schema definitions for form validation with proper constraints
exports.insertUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: zod_1.z.string(),
    withdrawalPassword: zod_1.z.string().min(6, "Withdrawal password must be at least 6 characters"),
    acceptedTerms: zod_1.z.boolean().refine(function (val) { return val === true; }, {
        message: "You must accept the terms and conditions"
    }),
    referralCode: zod_1.z.string().optional(), // Support referral signup
    telegramId: zod_1.z.string().optional(), // Telegram user ID for Telegram login
}).refine(function (data) { return data.password === data.confirmPassword; }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
});
exports.resetPasswordConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Reset token is required"),
    newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: zod_1.z.string(),
}).refine(function (data) { return data.newPassword === data.confirmPassword; }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: zod_1.z.string(),
}).refine(function (data) { return data.newPassword === data.confirmPassword; }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
exports.changeWithdrawalPasswordSchema = zod_1.z.object({
    currentWithdrawalPassword: zod_1.z.string().min(1, "Current withdrawal password is required"),
    newWithdrawalPassword: zod_1.z.string().min(6, "New withdrawal password must be at least 6 characters"),
    confirmWithdrawalPassword: zod_1.z.string(),
}).refine(function (data) { return data.newWithdrawalPassword === data.confirmWithdrawalPassword; }, {
    message: "Withdrawal passwords don't match",
    path: ["confirmWithdrawalPassword"],
});
exports.verifyWithdrawalPasswordSchema = zod_1.z.object({
    withdrawalPassword: zod_1.z.string().min(1, "Withdrawal password is required"),
});
exports.setup2FASchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
});
exports.verify2FASchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    token: zod_1.z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
    secret: zod_1.z.string().min(1, "Secret is required"),
});
exports.validate2FASchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    token: zod_1.z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
});
// Telegram Login validation schema
exports.telegramAuthSchema = zod_1.z.object({
    id: zod_1.z.number(),
    first_name: zod_1.z.string(),
    last_name: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    photo_url: zod_1.z.string().optional(),
    auth_date: zod_1.z.number(),
    hash: zod_1.z.string(),
});
// Passkey/WebAuthn validation schemas
exports.startPasskeyRegistrationSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    deviceName: zod_1.z.string().min(1, "Device name is required").max(50, "Device name too long"),
});
exports.passkeyDeviceNameSchema = zod_1.z.object({
    deviceName: zod_1.z.string().min(1, "Device name is required").max(50, "Device name too long"),
});
exports.finishPasskeyRegistrationSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    credentialId: zod_1.z.string().min(1, "Credential ID is required"),
    publicKey: zod_1.z.string().min(1, "Public key is required"),
    deviceName: zod_1.z.string().min(1, "Device name is required").max(50, "Device name too long"),
    counter: zod_1.z.number().min(0, "Counter must be non-negative"),
});
exports.startPasskeyAuthenticationSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    purpose: zod_1.z.enum(["withdrawal", "settings"], { message: "Invalid authentication purpose" }),
});
exports.finishPasskeyAuthenticationSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
    credentialId: zod_1.z.string().min(1, "Credential ID is required"),
    signature: zod_1.z.string().min(1, "Signature is required"),
    authenticatorData: zod_1.z.string().min(1, "Authenticator data is required"),
    clientDataJSON: zod_1.z.string().min(1, "Client data JSON is required"),
    counter: zod_1.z.number().min(0, "Counter must be non-negative"),
});
exports.updatePasskeySchema = zod_1.z.object({
    passkeyId: zod_1.z.string().min(1, "Passkey ID is required"),
    deviceName: zod_1.z.string().min(1, "Device name is required").max(50, "Device name too long").optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.insertPasskeySchema = (0, drizzle_zod_1.createInsertSchema)(exports.passkeys, {
    id: zod_1.z.string().optional(),
    lastUsedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.insertNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notifications, {
    id: zod_1.z.string().optional(),
    isRead: zod_1.z.boolean().optional(),
    createdAt: zod_1.z.date().optional(),
});
exports.sendNotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(), // Optional - if not provided, sends to all users
    title: zod_1.z.string().max(100, "Title too long").optional().or(zod_1.z.literal("")), // Optional - can send message only
    message: zod_1.z.string().min(1, "Message is required").max(500, "Message too long"),
    type: zod_1.z.enum(["info", "success", "warning", "error"], {
        message: "Invalid notification type"
    }).default("info"),
    imageUrl: zod_1.z.string().url("Invalid image URL").optional().or(zod_1.z.literal("")),
});
exports.markNotificationReadSchema = zod_1.z.object({
    notificationId: zod_1.z.string().min(1, "Notification ID is required"),
});
// Push subscription schemas
exports.insertPushSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pushSubscriptions, {
    id: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.subscribeToPushSchema = zod_1.z.object({
    endpoint: zod_1.z.string().min(1, "Endpoint is required"),
    keys: zod_1.z.object({
        p256dh: zod_1.z.string().min(1, "p256dh key is required"),
        auth: zod_1.z.string().min(1, "auth key is required"),
    }),
});
exports.unsubscribeFromPushSchema = zod_1.z.object({
    endpoint: zod_1.z.string().min(1, "Endpoint is required"),
});
// Promo code schemas
exports.insertPromoCodeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.promoCodes, {
    id: zod_1.z.string().optional(),
    usedCount: zod_1.z.number().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.createPromoCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(3, "Code must be at least 3 characters").max(20, "Code must be at most 20 characters").toUpperCase(),
    totalValue: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 0;
    }, {
        message: "Total value must be a valid number"
    }),
    minValue: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 0;
    }, {
        message: "Minimum value must be a valid number"
    }),
    maxValue: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 0;
    }, {
        message: "Maximum value must be a valid number"
    }),
    usageLimit: zod_1.z.number().int().optional(),
    requireDeposit: zod_1.z.boolean().default(false),
    vipLevelUpgrade: zod_1.z.enum(["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]).optional(),
    expiresAt: zod_1.z.string().optional(), // ISO date string
}).refine(function (data) {
    var min = parseFloat(data.minValue);
    var max = parseFloat(data.maxValue);
    return min <= max;
}, {
    message: "Minimum value cannot be greater than maximum value",
    path: ["minValue"],
}).refine(function (data) {
    var max = parseFloat(data.maxValue);
    var total = parseFloat(data.totalValue);
    return max <= total;
}, {
    message: "Maximum value cannot be greater than total value",
    path: ["maxValue"],
});
exports.redeemPromoCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "Promo code is required"),
});
exports.insertPromoCodeRedemptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.promoCodeRedemptions);
exports.insertVipLevelTelegramLinkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.vipLevelTelegramLinks);
exports.upsertVipLevelTelegramLinkSchema = zod_1.z.object({
    vipLevel: zod_1.z.enum(["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]),
    telegramLink: zod_1.z.string().url("Invalid Telegram link").min(1, "Telegram link is required"),
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.insertGameSchema = (0, drizzle_zod_1.createInsertSchema)(exports.games);
exports.insertBetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bets, {
    potential: zod_1.z.string().optional(),
});
// Crash game specific schemas
exports.insertCrashGameSchema = (0, drizzle_zod_1.createInsertSchema)(exports.games, {
    id: zod_1.z.string().optional(),
    result: zod_1.z.number().optional(),
    resultColor: zod_1.z.string().optional(),
    resultSize: zod_1.z.string().optional(),
    currentMultiplier: zod_1.z.string().optional(),
    crashedAt: zod_1.z.date().optional(),
    totalBetsAmount: zod_1.z.string().optional(),
    totalPayouts: zod_1.z.string().optional(),
    houseProfit: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().optional(),
}).extend({
    gameType: zod_1.z.literal("crash"),
    crashPoint: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 1.00 && num <= 100.00;
    }, {
        message: "Crash point must be between 1.00 and 100.00"
    }),
});
exports.insertCrashBetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bets, {
    id: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().optional(),
    status: zod_1.z.string().optional(),
    potential: zod_1.z.string().optional(),
    cashOutMultiplier: zod_1.z.string().optional(),
    cashedOutAt: zod_1.z.date().optional(),
}).extend({
    betType: zod_1.z.literal("crash"),
    betValue: zod_1.z.literal("crash"),
    autoCashOut: zod_1.z.string().optional().refine(function (val) {
        if (!val)
            return true;
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 1.01 && num <= 1000.00;
    }, {
        message: "Auto cash out must be between 1.01 and 1000.00"
    }),
});
exports.insertTransactionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.transactions);
exports.insertDepositRequestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.depositRequests);
exports.insertReferralSchema = (0, drizzle_zod_1.createInsertSchema)(exports.referrals);
exports.insertAdminActionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.adminActions);
exports.insertGameAnalyticsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gameAnalytics);
exports.insertUserSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userSessions);
exports.insertSupportChatSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.supportChatSessions);
exports.insertSupportChatMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.supportChatMessages);
exports.insertQuickReplySchema = (0, drizzle_zod_1.createInsertSchema)(exports.quickReplies).extend({
    shortcut: zod_1.z.string().min(1, "Shortcut is required").max(50, "Shortcut too long"),
    message: zod_1.z.string().min(1, "Message is required").max(1000, "Message too long"),
});
exports.updateQuickReplySchema = zod_1.z.object({
    shortcut: zod_1.z.string().min(1, "Shortcut is required").max(50, "Shortcut too long").optional(),
    message: zod_1.z.string().min(1, "Message is required").max(1000, "Message too long").optional(),
}).refine(function (data) { return data.shortcut || data.message; }, {
    message: "At least one field (shortcut or message) must be provided",
});
exports.insertPageViewSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pageViews);
exports.insertTelegramLoginSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramLoginSessions);
exports.insertWithdrawalRequestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.withdrawalRequests);
exports.insertSystemSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.systemSettings);
exports.insertWhitelistedIpSchema = (0, drizzle_zod_1.createInsertSchema)(exports.whitelistedIps);
exports.updateWhitelistedIpSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Whitelisted IP ID is required"),
    isActive: zod_1.z.boolean().optional(),
    whitelistedReason: zod_1.z.string().optional(),
});
exports.insertTelegramAutoJoinChannelSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramAutoJoinChannels).extend({
    chatId: zod_1.z.string().min(1, "Chat ID is required"),
    channelName: zod_1.z.string().min(1, "Channel name is required").max(200, "Channel name too long"),
    inviteLink: zod_1.z.string().url("Invalid invite link format"),
    priority: zod_1.z.number().int().min(1).max(100).optional(),
});
exports.updateTelegramAutoJoinChannelSchema = zod_1.z.object({
    channelName: zod_1.z.string().min(1, "Channel name is required").max(200, "Channel name too long").optional(),
    inviteLink: zod_1.z.string().url("Invalid invite link format").optional(),
    isEnabled: zod_1.z.boolean().optional(),
    autoApproveJoinRequests: zod_1.z.boolean().optional(),
    priority: zod_1.z.number().int().min(1).max(100).optional(),
}).refine(function (data) { return Object.keys(data).length > 0; }, {
    message: "At least one field must be provided",
});
exports.insertDatabaseConnectionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.databaseConnections);
exports.insertAgentProfileSchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentProfiles);
exports.insertAgentActivitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.agentActivities);
exports.insertDeviceLoginSchema = (0, drizzle_zod_1.createInsertSchema)(exports.deviceLogins);
exports.updateSystemSettingSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, "Setting key is required"),
    value: zod_1.z.string().min(1, "Setting value is required"),
    description: zod_1.z.string().optional(),
    isEncrypted: zod_1.z.boolean().optional(),
});
exports.createWithdrawalRequestSchema = zod_1.z.object({
    amount: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 1200 && Number.isInteger(num);
    }, {
        message: "Amount must be at least 1200 coins and a whole number"
    }),
    currency: zod_1.z.string().min(1, "Currency is required"),
    address: zod_1.z.string().min(1, "Wallet address is required"),
    withdrawalPassword: zod_1.z.string().min(1, "Withdrawal password is required"),
});
exports.processWithdrawalRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(["approve", "reject"]),
    adminNote: zod_1.z.string().optional(),
});
// Admin API response types
exports.adminDepositResponseSchema = zod_1.z.object({
    deposits: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        userId: zod_1.z.string(),
        agentId: zod_1.z.string().optional(),
        type: zod_1.z.literal("deposit"),
        fiatAmount: zod_1.z.string().optional(),
        cryptoAmount: zod_1.z.string().optional(),
        fiatCurrency: zod_1.z.string().optional(),
        cryptoCurrency: zod_1.z.string().optional(),
        status: zod_1.z.enum(["pending", "completed", "failed", "cancelled"]),
        paymentMethod: zod_1.z.string(),
        externalId: zod_1.z.string().optional(),
        paymentAddress: zod_1.z.string().optional(),
        txHash: zod_1.z.string().optional(),
        fee: zod_1.z.string(),
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
        userEmail: zod_1.z.string().optional(),
        userPublicId: zod_1.z.string().optional(),
    })),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    totalPages: zod_1.z.number(),
});
exports.adminWithdrawalResponseSchema = zod_1.z.object({
    withdrawals: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        userId: zod_1.z.string(),
        agentId: zod_1.z.string().optional(),
        type: zod_1.z.literal("withdrawal"),
        fiatAmount: zod_1.z.string().optional(),
        cryptoAmount: zod_1.z.string().optional(),
        fiatCurrency: zod_1.z.string().optional(),
        cryptoCurrency: zod_1.z.string().optional(),
        status: zod_1.z.enum(["pending", "completed", "failed", "cancelled"]),
        paymentMethod: zod_1.z.string(),
        externalId: zod_1.z.string().optional(),
        paymentAddress: zod_1.z.string().optional(),
        txHash: zod_1.z.string().optional(),
        fee: zod_1.z.string(),
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
        userEmail: zod_1.z.string().optional(),
        userPublicId: zod_1.z.string().optional(),
        userTotalDeposits: zod_1.z.string().optional(),
        userTotalBets: zod_1.z.string().optional(),
        userBetPercentage: zod_1.z.number().optional(),
    })),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    totalPages: zod_1.z.number(),
});
// Agent-specific schemas
exports.createAgentSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    commissionRate: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1;
    }, {
        message: "Commission rate must be between 0 and 1"
    }).optional(),
});
exports.agentDepositSchema = zod_1.z.object({
    userIdentifier: zod_1.z.string().min(1, "User identifier (public ID or email) is required"),
    amount: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 11;
    }, {
        message: "Minimum deposit amount is 11 USD"
    }),
});
exports.agentWithdrawalSchema = zod_1.z.object({
    userIdentifier: zod_1.z.string().min(1, "User identifier (public ID or email) is required"),
    amount: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 12;
    }, {
        message: "Amount must be at least 12 USD (1200 coins)"
    }),
});
exports.updateCommissionSchema = zod_1.z.object({
    agentId: zod_1.z.string().min(1, "Agent ID is required"),
    commissionRate: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1;
    }, {
        message: "Commission rate must be between 0 and 1"
    }),
});
exports.agentSelfDepositSchema = zod_1.z.object({
    amount: zod_1.z.string().refine(function (val) {
        var num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num >= 15;
    }, {
        message: "Amount must be a valid number with minimum 15 USD"
    }),
    currency: zod_1.z.enum(["TRX", "USDTTRC20", "USDTMATIC"])
});
// VIP settings table for admin-configurable VIP levels
exports.vipSettings = (0, pg_core_1.pgTable)("vip_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_82 || (templateObject_82 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    levelKey: (0, pg_core_1.text)("level_key").notNull().unique(), // 'lv1', 'vip1', etc.
    levelName: (0, pg_core_1.text)("level_name").notNull().unique(), // "Level 1", "VIP 1", etc.
    levelOrder: (0, pg_core_1.integer)("level_order").notNull().unique(), // 0, 1, 2, etc. for ordering
    teamRequirement: (0, pg_core_1.integer)("team_requirement").notNull().default(0), // Number of team members required
    maxBet: (0, pg_core_1.decimal)("max_bet", { precision: 18, scale: 8 }).notNull().default("100000000.00000000"),
    dailyWagerReward: (0, pg_core_1.decimal)("daily_wager_reward", { precision: 10, scale: 6 }).notNull().default("0.000000"), // Daily wager reward percentage
    commissionRates: (0, pg_core_1.text)("commission_rates").notNull().default("[]"), // JSON array of commission rates
    rechargeAmount: (0, pg_core_1.decimal)("recharge_amount", { precision: 18, scale: 8 }).notNull().default("1000.00000000"), // USDT amount (for reference)
    telegramLink: (0, pg_core_1.text)("telegram_link"), // Telegram channel/group link for this VIP level
    supportEmail: (0, pg_core_1.text)("support_email"), // Support email for this VIP level
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_83 || (templateObject_83 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_84 || (templateObject_84 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Golden Live player tracking tables
exports.goldenLiveStats = (0, pg_core_1.pgTable)("golden_live_stats", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_85 || (templateObject_85 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    totalPlayers: (0, pg_core_1.integer)("total_players").notNull().default(0),
    activePlayers: (0, pg_core_1.integer)("active_players").notNull().default(0),
    lastHourlyIncrease: (0, pg_core_1.timestamp)("last_hourly_increase").notNull().default((0, drizzle_orm_1.sql)(templateObject_86 || (templateObject_86 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_87 || (templateObject_87 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_88 || (templateObject_88 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Golden Live events tracking for audit trail
exports.goldenLiveEvents = (0, pg_core_1.pgTable)("golden_live_events", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_89 || (templateObject_89 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // 'hourly_increase', 'manual_adjustment', 'active_player_update'
    previousValue: (0, pg_core_1.integer)("previous_value").notNull(),
    newValue: (0, pg_core_1.integer)("new_value").notNull(),
    incrementAmount: (0, pg_core_1.integer)("increment_amount").notNull().default(0),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_90 || (templateObject_90 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Predicted results for admin period control
exports.predictedResults = (0, pg_core_1.pgTable)("predicted_results", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_91 || (templateObject_91 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    adminId: (0, pg_core_1.varchar)("admin_id").notNull(), // FK to users (admin who created prediction)
    periodId: (0, pg_core_1.text)("period_id").notNull(), // Period ID (e.g., 20251106010574)
    result: (0, pg_core_1.integer)("result").notNull(), // Predicted result (0-9)
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_92 || (templateObject_92 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_93 || (templateObject_93 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    adminIdIdx: (0, pg_core_1.index)("predicted_results_admin_id_idx").on(table.adminId),
    periodIdIdx: (0, pg_core_1.index)("predicted_results_period_id_idx").on(table.periodId),
}); });
// Coin flip games table
exports.coinFlipGames = (0, pg_core_1.pgTable)("coin_flip_games", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_94 || (templateObject_94 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(), // FK to users
    selectedSide: (0, pg_core_1.text)("selected_side").notNull(), // 'head' or 'tail'
    result: (0, pg_core_1.text)("result").notNull(), // 'head' or 'tail'
    betAmount: (0, pg_core_1.decimal)("bet_amount", { precision: 18, scale: 8 }).notNull(),
    won: (0, pg_core_1.boolean)("won").notNull(),
    winAmount: (0, pg_core_1.decimal)("win_amount", { precision: 18, scale: 8 }), // null if lost
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_95 || (templateObject_95 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userIdIdx: (0, pg_core_1.index)("coin_flip_games_user_id_idx").on(table.userId),
    createdAtIdx: (0, pg_core_1.index)("coin_flip_games_created_at_idx").on(table.createdAt),
}); });
// Betting tasks table - daily tasks for users to earn coins
exports.bettingTasks = (0, pg_core_1.pgTable)("betting_tasks", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_96 || (templateObject_96 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    betRequirement: (0, pg_core_1.decimal)("bet_requirement", { precision: 18, scale: 2 }).notNull(), // $100 bet required
    durationMinutes: (0, pg_core_1.integer)("duration_minutes").notNull(), // 1, 3, 5, or 10 minutes
    coinReward: (0, pg_core_1.decimal)("coin_reward", { precision: 18, scale: 2 }).notNull(), // coins to award
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_97 || (templateObject_97 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_98 || (templateObject_98 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Track user progress on betting tasks
exports.userBettingTaskProgress = (0, pg_core_1.pgTable)("user_betting_task_progress", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_99 || (templateObject_99 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.varchar)("user_id").notNull(),
    taskId: (0, pg_core_1.varchar)("task_id").notNull(),
    betAccumulated: (0, pg_core_1.decimal)("bet_accumulated", { precision: 18, scale: 2 }).notNull().default("0.00"),
    isCompleted: (0, pg_core_1.boolean)("is_completed").notNull().default(false),
    claimedAt: (0, pg_core_1.timestamp)("claimed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_100 || (templateObject_100 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_101 || (templateObject_101 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    userTaskIdx: (0, pg_core_1.index)("user_betting_task_progress_user_task_idx").on(table.userId, table.taskId),
}); });
// Telegram Signals Tables - for live updating betting signals
exports.telegramSignalStatusEnum = (0, pg_core_1.pgEnum)("telegram_signal_status", ["pending", "sent", "updated", "completed", "failed"]);
// Telegram signals tracking table - tracks signals with live updates
exports.telegramSignals = (0, pg_core_1.pgTable)("telegram_signals", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_102 || (templateObject_102 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    gameId: (0, pg_core_1.text)("game_id").notNull(), // Period/game ID (e.g., 20251125030205)
    duration: (0, pg_core_1.integer)("duration").notNull(), // 1, 3, 5, or 10 minutes
    colour: (0, pg_core_1.text)("colour").notNull(), // green, red, or violet
    messageId: (0, pg_core_1.integer)("message_id"), // Telegram message ID for editing
    chatId: (0, pg_core_1.text)("chat_id").notNull(), // Telegram chat/channel ID where signal was sent
    status: (0, exports.telegramSignalStatusEnum)("status").notNull().default("pending"),
    result: (0, pg_core_1.text)("result"), // 'WIN' or 'LOSS' when updated
    autoRed: (0, pg_core_1.boolean)("auto_red").default(false), // True if auto-generated RED result (no bets placed)
    autoRedNumber: (0, pg_core_1.integer)("auto_red_number"), // Random number (0-9) for auto-generated RED result
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_103 || (templateObject_103 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    gameIdIdx: (0, pg_core_1.index)("telegram_signals_game_id_idx").on(table.gameId),
    statusIdx: (0, pg_core_1.index)("telegram_signals_status_idx").on(table.status),
    messageIdIdx: (0, pg_core_1.index)("telegram_signals_message_id_idx").on(table.messageId),
}); });
// Telegram Reactions Tables (N1Panel Integration)
exports.telegramReactionOrderStatusEnum = (0, pg_core_1.pgEnum)("telegram_reaction_order_status", ["pending", "processing", "completed", "partial", "cancelled", "failed"]);
// N1Panel API configuration and settings
exports.telegramReactionSettings = (0, pg_core_1.pgTable)("telegram_reaction_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_104 || (templateObject_104 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    apiKey: (0, pg_core_1.text)("api_key").notNull(), // N1Panel API key
    apiUrl: (0, pg_core_1.text)("api_url").notNull().default("https://n1panel.com/api/v2"), // N1Panel API URL
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    balance: (0, pg_core_1.decimal)("balance", { precision: 18, scale: 2 }), // Account balance from N1Panel
    lastBalanceCheck: (0, pg_core_1.timestamp)("last_balance_check"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_105 || (templateObject_105 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_106 || (templateObject_106 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// Telegram groups/channels to monitor for auto-reactions
exports.telegramGroups = (0, pg_core_1.pgTable)("telegram_groups", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_107 || (templateObject_107 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    name: (0, pg_core_1.text)("name").notNull(), // Group/channel name for display
    telegramId: (0, pg_core_1.text)("telegram_id").notNull().unique(), // Telegram group/channel ID
    telegramLink: (0, pg_core_1.text)("telegram_link"), // Invite link or public link
    serviceId: (0, pg_core_1.integer)("service_id").notNull(), // N1Panel service ID for reactions
    serviceName: (0, pg_core_1.text)("service_name"), // Service name from N1Panel
    autoReactEnabled: (0, pg_core_1.boolean)("auto_react_enabled").notNull().default(false), // Enable/disable auto-reactions
    reactionCount: (0, pg_core_1.integer)("reaction_count").notNull().default(100), // Number of reactions per post
    reactionEmojis: (0, pg_core_1.text)("reaction_emojis").array(), // Array of emojis to use
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_108 || (templateObject_108 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_109 || (templateObject_109 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    telegramIdIdx: (0, pg_core_1.index)("telegram_groups_telegram_id_idx").on(table.telegramId),
}); });
// Track all reaction orders placed through N1Panel
exports.telegramReactionOrders = (0, pg_core_1.pgTable)("telegram_reaction_orders", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_110 || (templateObject_110 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    groupId: (0, pg_core_1.varchar)("group_id").notNull(), // FK to telegramGroups
    orderId: (0, pg_core_1.text)("order_id").notNull().unique(), // N1Panel order ID
    serviceId: (0, pg_core_1.integer)("service_id").notNull(), // N1Panel service ID
    postLink: (0, pg_core_1.text)("post_link").notNull(), // Telegram post link
    quantity: (0, pg_core_1.integer)("quantity").notNull(), // Number of reactions ordered
    charge: (0, pg_core_1.decimal)("charge", { precision: 18, scale: 2 }).notNull(), // Cost of the order
    status: (0, exports.telegramReactionOrderStatusEnum)("status").notNull().default("pending"),
    startCount: (0, pg_core_1.integer)("start_count"), // Initial reaction count
    remains: (0, pg_core_1.integer)("remains"), // Remaining reactions to deliver
    currency: (0, pg_core_1.text)("currency").default("USD"), // Currency from N1Panel
    orderResponse: (0, pg_core_1.jsonb)("order_response"), // Full response from N1Panel API
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_111 || (templateObject_111 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_112 || (templateObject_112 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    groupIdIdx: (0, pg_core_1.index)("telegram_reaction_orders_group_id_idx").on(table.groupId),
    statusIdx: (0, pg_core_1.index)("telegram_reaction_orders_status_idx").on(table.status),
    createdAtIdx: (0, pg_core_1.index)("telegram_reaction_orders_created_at_idx").on(table.createdAt),
}); });
// VIP settings insert schemas
exports.insertVipSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.vipSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.updateVipSettingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "VIP setting ID is required"),
    levelKey: zod_1.z.string().optional(),
    levelName: zod_1.z.string().optional(),
    levelOrder: zod_1.z.number().optional(),
    teamRequirement: zod_1.z.number().optional(),
    maxBet: zod_1.z.string().optional(),
    dailyWagerReward: zod_1.z.string().optional(),
    commissionRates: zod_1.z.string().optional(), // JSON string of array
    rechargeAmount: zod_1.z.string().optional(),
    telegramLink: zod_1.z.string().optional(),
    supportEmail: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// Golden Live insert schemas
exports.insertGoldenLiveStatsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldenLiveStats).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertGoldenLiveEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.goldenLiveEvents).omit({
    id: true,
    createdAt: true,
});
// Predicted results insert schemas
exports.insertPredictedResultSchema = (0, drizzle_zod_1.createInsertSchema)(exports.predictedResults).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Crash Game Settings Table
exports.crashSettings = (0, pg_core_1.pgTable)("crash_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_113 || (templateObject_113 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    houseEdge: (0, pg_core_1.decimal)("house_edge", { precision: 5, scale: 2 }).notNull().default("20.00"), // Percentage e.g. 20.00%
    maxMultiplier: (0, pg_core_1.decimal)("max_multiplier", { precision: 10, scale: 2 }).notNull().default("50.00"), // Max crash multiplier e.g. 50.00x
    minCrashMultiplier: (0, pg_core_1.decimal)("min_crash_multiplier", { precision: 5, scale: 2 }).notNull().default("1.01"),
    minBetAmount: (0, pg_core_1.decimal)("min_bet_amount", { precision: 18, scale: 2 }).notNull().default("50.00"), // Min bet in coins
    maxBetAmount: (0, pg_core_1.decimal)("max_bet_amount", { precision: 18, scale: 2 }).notNull().default("10000.00"), // Max bet in coins
    crashEnabled: (0, pg_core_1.boolean)("crash_enabled").notNull().default(true),
    updatedBy: (0, pg_core_1.varchar)("updated_by").notNull(), // FK to users
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_114 || (templateObject_114 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_115 || (templateObject_115 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.insertCrashSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crashSettings, {
    id: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
// Advanced Personalized Crash Settings Table
exports.advancedCrashSettings = (0, pg_core_1.pgTable)("advanced_crash_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_116 || (templateObject_116 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    deepThinkingEnabled: (0, pg_core_1.boolean)("deep_thinking_enabled").notNull().default(false),
    noBetBaitMinMultiplier: (0, pg_core_1.decimal)("no_bet_bait_min_multiplier", { precision: 10, scale: 2 }).notNull().default("7.00"),
    noBetBaitMaxMultiplier: (0, pg_core_1.decimal)("no_bet_bait_max_multiplier", { precision: 10, scale: 2 }).notNull().default("20.00"),
    whaleTargetMinMultiplier: (0, pg_core_1.decimal)("whale_target_min_multiplier", { precision: 5, scale: 2 }).notNull().default("1.01"),
    whaleTargetMaxMultiplier: (0, pg_core_1.decimal)("whale_target_max_multiplier", { precision: 5, scale: 2 }).notNull().default("1.04"),
    standardLossMaxThreshold: (0, pg_core_1.decimal)("standard_loss_max_threshold", { precision: 5, scale: 2 }).notNull().default("2.00"),
    playerWinProbability: (0, pg_core_1.decimal)("player_win_probability", { precision: 5, scale: 2 }).notNull().default("40.00"), // Probability of getting a good multiplier
    updatedBy: (0, pg_core_1.varchar)("updated_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_117 || (templateObject_117 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_118 || (templateObject_118 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
exports.insertAdvancedCrashSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.advancedCrashSettings, {
    id: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
// Coin flip games insert schemas
exports.insertCoinFlipGameSchema = (0, drizzle_zod_1.createInsertSchema)(exports.coinFlipGames).omit({
    id: true,
    createdAt: true,
});
// Betting tasks insert schemas
exports.insertBettingTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bettingTasks).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.updateBettingTaskSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Task ID is required"),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    betRequirement: zod_1.z.string().optional(),
    durationMinutes: zod_1.z.number().optional(),
    coinReward: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.insertUserBettingTaskProgressSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userBettingTaskProgress).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Telegram Signals insert schemas
exports.insertTelegramSignalSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramSignals).omit({
    id: true,
    messageId: true,
    status: true,
    result: true,
    sentAt: true,
    updatedAt: true,
    createdAt: true,
});
exports.updateTelegramSignalSchema = zod_1.z.object({
    messageId: zod_1.z.number().optional(),
    status: zod_1.z.enum(["pending", "sent", "updated", "completed", "failed"]).optional(),
    result: zod_1.z.string().optional(),
    autoRed: zod_1.z.boolean().optional(),
    autoRedNumber: zod_1.z.number().optional(),
    sentAt: zod_1.z.string().optional(),
});
// Telegram Scheduled Posts table - for auto-posting to Telegram channels
exports.telegramScheduledPostStatusEnum = (0, pg_core_1.pgEnum)("telegram_scheduled_post_status", ["active", "paused", "completed"]);
exports.telegramScheduledPosts = (0, pg_core_1.pgTable)("telegram_scheduled_posts", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql)(templateObject_119 || (templateObject_119 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    channelId: (0, pg_core_1.text)("channel_id").notNull(), // Telegram channel ID to post to
    title: (0, pg_core_1.text)("title").notNull(), // Post title for admin reference
    messageText: (0, pg_core_1.text)("message_text").notNull(), // Message text/caption to send
    photoPath: (0, pg_core_1.text)("photo_path"), // Path to photo file (stored in uploads)
    photoUrl: (0, pg_core_1.text)("photo_url"), // External photo URL if not using local file
    buttons: (0, pg_core_1.text)("buttons"), // JSON array of inline keyboard buttons: [{text: "Button", url: "https://..."}]
    scheduleTime: (0, pg_core_1.text)("schedule_time"), // Time in HH:MM:SS format (24hr) - optional if using period-based
    timezone: (0, pg_core_1.text)("timezone").notNull().default("Asia/Colombo"), // Timezone for scheduling
    repeatDaily: (0, pg_core_1.boolean)("repeat_daily").notNull().default(true), // Whether to repeat daily
    daysOfWeek: (0, pg_core_1.text)("days_of_week").default("0,1,2,3,4,5,6"), // Comma-separated days (0=Sunday, 6=Saturday)
    periodId: (0, pg_core_1.text)("period_id"), // Period ID to trigger on (e.g., game ID) - optional if using schedule time
    status: (0, exports.telegramScheduledPostStatusEnum)("status").notNull().default("active"),
    lastSentAt: (0, pg_core_1.timestamp)("last_sent_at"), // When was this post last sent
    nextRunAt: (0, pg_core_1.timestamp)("next_run_at"), // When will this post next run
    sentCount: (0, pg_core_1.integer)("sent_count").notNull().default(0), // Total times this post was sent
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(), // Admin who created
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_120 || (templateObject_120 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().default((0, drizzle_orm_1.sql)(templateObject_121 || (templateObject_121 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
}, function (table) { return ({
    channelIdIdx: (0, pg_core_1.index)("telegram_scheduled_posts_channel_id_idx").on(table.channelId),
    statusIdx: (0, pg_core_1.index)("telegram_scheduled_posts_status_idx").on(table.status),
    nextRunAtIdx: (0, pg_core_1.index)("telegram_scheduled_posts_next_run_at_idx").on(table.nextRunAt),
    periodIdIdx: (0, pg_core_1.index)("telegram_scheduled_posts_period_id_idx").on(table.periodId),
}); });
// Telegram Scheduled Posts insert/update schemas
exports.insertTelegramScheduledPostSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramScheduledPosts).omit({
    id: true,
    lastSentAt: true,
    nextRunAt: true,
    sentCount: true,
    createdAt: true,
    updatedAt: true,
});
exports.updateTelegramScheduledPostSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Post ID is required"),
    channelId: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    messageText: zod_1.z.string().optional(),
    photoPath: zod_1.z.string().optional().nullable(),
    photoUrl: zod_1.z.string().optional().nullable(),
    buttons: zod_1.z.string().optional().nullable(),
    scheduleTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().nullable(),
    timezone: zod_1.z.string().optional(),
    repeatDaily: zod_1.z.boolean().optional(),
    daysOfWeek: zod_1.z.string().optional(),
    periodId: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(["active", "paused", "completed"]).optional(),
});
exports.createTelegramScheduledPostSchema = zod_1.z.object({
    channelId: zod_1.z.string().min(1, "Channel ID is required"),
    title: zod_1.z.string().min(1, "Title is required").max(200, "Title too long"),
    messageText: zod_1.z.string().min(1, "Message text is required").max(4096, "Message too long"),
    photoPath: zod_1.z.string().optional().nullable(),
    photoUrl: zod_1.z.preprocess(function (val) { return val === "" ? null : val; }, zod_1.z.string().url("Invalid photo URL").optional().nullable()),
    buttons: zod_1.z.string().optional().nullable(),
    scheduleTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().nullable(),
    timezone: zod_1.z.string().default("Asia/Colombo"),
    repeatDaily: zod_1.z.boolean().default(true),
    daysOfWeek: zod_1.z.string().default("0,1,2,3,4,5,6"),
    periodId: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(["active", "paused", "completed"]).default("active"),
}).refine(function (data) { return data.scheduleTime || data.periodId; }, {
    message: "Either scheduleTime or periodId must be provided",
    path: ["scheduleTime"],
});
// Telegram Reactions insert schemas
exports.insertTelegramReactionSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramReactionSettings);
exports.updateTelegramReactionSettingSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().min(1, "API key is required"),
    apiUrl: zod_1.z.string().url().default("https://n1panel.com/api/v2"),
    isActive: zod_1.z.boolean().optional(),
});
exports.insertTelegramGroupSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramGroups);
exports.updateTelegramGroupSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Group ID is required"),
    name: zod_1.z.string().optional(),
    telegramId: zod_1.z.string().optional(),
    telegramLink: zod_1.z.string().optional(),
    serviceId: zod_1.z.number().optional(),
    serviceName: zod_1.z.string().optional(),
    autoReactEnabled: zod_1.z.boolean().optional(),
    reactionCount: zod_1.z.number().optional(),
    reactionEmojis: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.insertTelegramReactionOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.telegramReactionOrders);
// Relations
var drizzle_orm_2 = require("drizzle-orm");
exports.usersRelations = (0, drizzle_orm_2.relations)(exports.users, function (_a) {
    var many = _a.many, one = _a.one;
    return ({
        bets: many(exports.bets),
        transactions: many(exports.transactions),
        agentTransactions: many(exports.transactions, { relationName: "agentTransactions" }),
        referralsMade: many(exports.referrals, { relationName: "referrer" }),
        referralReceived: one(exports.referrals, { relationName: "referred", fields: [exports.users.id], references: [exports.referrals.referredId] }),
        adminActions: many(exports.adminActions),
        sessions: many(exports.userSessions),
        withdrawalRequests: many(exports.withdrawalRequests),
        agentProfile: one(exports.agentProfiles),
        agentActivities: many(exports.agentActivities),
        referrer: one(exports.users, { fields: [exports.users.referredBy], references: [exports.users.id] }),
    });
});
exports.gamesRelations = (0, drizzle_orm_2.relations)(exports.games, function (_a) {
    var many = _a.many, one = _a.one;
    return ({
        bets: many(exports.bets),
        analytics: one(exports.gameAnalytics),
    });
});
exports.betsRelations = (0, drizzle_orm_2.relations)(exports.bets, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.bets.userId], references: [exports.users.id] }),
        game: one(exports.games, { fields: [exports.bets.gameId], references: [exports.games.id] }),
    });
});
exports.transactionsRelations = (0, drizzle_orm_2.relations)(exports.transactions, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.transactions.userId], references: [exports.users.id] }),
        agent: one(exports.users, { relationName: "agentTransactions", fields: [exports.transactions.agentId], references: [exports.users.id] }),
    });
});
exports.referralsRelations = (0, drizzle_orm_2.relations)(exports.referrals, function (_a) {
    var one = _a.one;
    return ({
        referrer: one(exports.users, { relationName: "referrer", fields: [exports.referrals.referrerId], references: [exports.users.id] }),
        referred: one(exports.users, { relationName: "referred", fields: [exports.referrals.referredId], references: [exports.users.id] }),
    });
});
exports.adminActionsRelations = (0, drizzle_orm_2.relations)(exports.adminActions, function (_a) {
    var one = _a.one;
    return ({
        admin: one(exports.users, { fields: [exports.adminActions.adminId], references: [exports.users.id] }),
    });
});
exports.gameAnalyticsRelations = (0, drizzle_orm_2.relations)(exports.gameAnalytics, function (_a) {
    var one = _a.one;
    return ({
        game: one(exports.games, { fields: [exports.gameAnalytics.gameId], references: [exports.games.id] }),
    });
});
exports.userSessionsRelations = (0, drizzle_orm_2.relations)(exports.userSessions, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.userSessions.userId], references: [exports.users.id] }),
    });
});
exports.passwordResetTokensRelations = (0, drizzle_orm_2.relations)(exports.passwordResetTokens, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.passwordResetTokens.email], references: [exports.users.email] }),
    });
});
exports.withdrawalRequestsRelations = (0, drizzle_orm_2.relations)(exports.withdrawalRequests, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.withdrawalRequests.userId], references: [exports.users.id] }),
        processedByAdmin: one(exports.users, { fields: [exports.withdrawalRequests.processedBy], references: [exports.users.id] }),
    });
});
exports.systemSettingsRelations = (0, drizzle_orm_2.relations)(exports.systemSettings, function (_a) {
    var one = _a.one;
    return ({
        lastUpdatedByAdmin: one(exports.users, { fields: [exports.systemSettings.lastUpdatedBy], references: [exports.users.id] }),
    });
});
exports.agentProfilesRelations = (0, drizzle_orm_2.relations)(exports.agentProfiles, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, { fields: [exports.agentProfiles.userId], references: [exports.users.id] }),
        activities: many(exports.agentActivities),
    });
});
exports.agentActivitiesRelations = (0, drizzle_orm_2.relations)(exports.agentActivities, function (_a) {
    var one = _a.one;
    return ({
        agent: one(exports.users, { fields: [exports.agentActivities.agentId], references: [exports.users.id] }),
        targetUser: one(exports.users, { fields: [exports.agentActivities.targetUserId], references: [exports.users.id] }),
        transaction: one(exports.transactions, { fields: [exports.agentActivities.transactionId], references: [exports.transactions.id] }),
    });
});
exports.passkeysRelations = (0, drizzle_orm_2.relations)(exports.passkeys, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.passkeys.userId], references: [exports.users.id] }),
    });
});
exports.predictedResultsRelations = (0, drizzle_orm_2.relations)(exports.predictedResults, function (_a) {
    var one = _a.one;
    return ({
        admin: one(exports.users, { fields: [exports.predictedResults.adminId], references: [exports.users.id] }),
    });
});
// VIP Level Utilities
exports.VIP_LEVELS = {
    lv1: {
        teamRequirement: 0,
        depositRequirement: 0,
        maxBetLimit: 999999,
        displayName: "Level 1",
        dailyWagerReward: 0.000, // 0.0%
        commissionRates: [0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.007, 0.005, 0.003] // Lv1-Lv9
    },
    lv2: {
        teamRequirement: 1,
        depositRequirement: 30,
        maxBetLimit: 999999,
        displayName: "Level 2",
        dailyWagerReward: 0.0005, // 0.05%
        commissionRates: [0.065, 0.055, 0.045, 0.035, 0.025, 0.015, 0.01, 0.007, 0.005] // Lv1-Lv9
    },
    vip: {
        teamRequirement: 7,
        depositRequirement: 300,
        maxBetLimit: 999999,
        displayName: "VIP",
        dailyWagerReward: 0.001, // 0.1%
        commissionRates: [0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.005] // Lv1-Lv8
    },
    vip1: {
        teamRequirement: 10,
        depositRequirement: 600,
        maxBetLimit: 999999,
        displayName: "VIP 1",
        dailyWagerReward: 0.002, // 0.2%
        commissionRates: [0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01] // Lv1-Lv8
    },
    vip2: {
        teamRequirement: 20,
        depositRequirement: 1000,
        maxBetLimit: 999999,
        displayName: "VIP 2",
        dailyWagerReward: 0.003, // 0.3%
        commissionRates: [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02] // Lv1-Lv8
    },
    vip3: {
        teamRequirement: 30,
        depositRequirement: 2000,
        maxBetLimit: 999999,
        displayName: "VIP 3",
        dailyWagerReward: 0.004, // 0.4%
        commissionRates: [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03] // Lv1-Lv8
    },
    vip4: {
        teamRequirement: 40,
        depositRequirement: 5000,
        maxBetLimit: 999999,
        displayName: "VIP 4",
        dailyWagerReward: 0.005, // 0.5%
        commissionRates: [0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04] // Lv1-Lv8
    },
    vip5: {
        teamRequirement: 50,
        depositRequirement: 10000,
        maxBetLimit: 999999,
        displayName: "VIP 5",
        dailyWagerReward: 0.006, // 0.6%
        commissionRates: [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05] // Lv1-Lv8
    },
    vip6: {
        teamRequirement: 60,
        depositRequirement: 20000,
        maxBetLimit: 999999,
        displayName: "VIP 6",
        dailyWagerReward: 0.007, // 0.7%
        commissionRates: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06] // Lv1-Lv8
    },
    vip7: {
        teamRequirement: 70,
        depositRequirement: 50000,
        maxBetLimit: 999999,
        displayName: "VIP 7",
        dailyWagerReward: 0.008, // 0.8%
        commissionRates: [0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07] // Lv1-Lv8
    },
};
function calculateVipLevel(teamSize, totalDeposits) {
    if (totalDeposits === void 0) { totalDeposits = 0; }
    // Sort levels by team requirement in descending order
    var levels = [
        ['vip7', exports.VIP_LEVELS.vip7],
        ['vip6', exports.VIP_LEVELS.vip6],
        ['vip5', exports.VIP_LEVELS.vip5],
        ['vip4', exports.VIP_LEVELS.vip4],
        ['vip3', exports.VIP_LEVELS.vip3],
        ['vip2', exports.VIP_LEVELS.vip2],
        ['vip1', exports.VIP_LEVELS.vip1],
        ['vip', exports.VIP_LEVELS.vip],
        ['lv2', exports.VIP_LEVELS.lv2],
        ['lv1', exports.VIP_LEVELS.lv1],
    ];
    for (var _i = 0, levels_1 = levels; _i < levels_1.length; _i++) {
        var _a = levels_1[_i], key = _a[0], config = _a[1];
        // User qualifies if they meet EITHER team requirement OR deposit requirement
        var meetsTeamRequirement = teamSize >= config.teamRequirement;
        var meetsDepositRequirement = totalDeposits >= config.depositRequirement;
        if (meetsTeamRequirement || meetsDepositRequirement) {
            return key;
        }
    }
    return "lv1";
}
function getMaxBetLimit(vipLevel) {
    return exports.VIP_LEVELS[vipLevel].maxBetLimit;
}
function getVipDisplayName(vipLevel) {
    return exports.VIP_LEVELS[vipLevel].displayName;
}
function getCommissionRate(vipLevel, teamLevel) {
    var rates = exports.VIP_LEVELS[vipLevel].commissionRates;
    var index = teamLevel - 1; // teamLevel 1 = index 0
    return rates[index] || 0;
}
function getDailyWagerReward(vipLevel) {
    return exports.VIP_LEVELS[vipLevel].dailyWagerReward;
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37, templateObject_38, templateObject_39, templateObject_40, templateObject_41, templateObject_42, templateObject_43, templateObject_44, templateObject_45, templateObject_46, templateObject_47, templateObject_48, templateObject_49, templateObject_50, templateObject_51, templateObject_52, templateObject_53, templateObject_54, templateObject_55, templateObject_56, templateObject_57, templateObject_58, templateObject_59, templateObject_60, templateObject_61, templateObject_62, templateObject_63, templateObject_64, templateObject_65, templateObject_66, templateObject_67, templateObject_68, templateObject_69, templateObject_70, templateObject_71, templateObject_72, templateObject_73, templateObject_74, templateObject_75, templateObject_76, templateObject_77, templateObject_78, templateObject_79, templateObject_80, templateObject_81, templateObject_82, templateObject_83, templateObject_84, templateObject_85, templateObject_86, templateObject_87, templateObject_88, templateObject_89, templateObject_90, templateObject_91, templateObject_92, templateObject_93, templateObject_94, templateObject_95, templateObject_96, templateObject_97, templateObject_98, templateObject_99, templateObject_100, templateObject_101, templateObject_102, templateObject_103, templateObject_104, templateObject_105, templateObject_106, templateObject_107, templateObject_108, templateObject_109, templateObject_110, templateObject_111, templateObject_112, templateObject_113, templateObject_114, templateObject_115, templateObject_116, templateObject_117, templateObject_118, templateObject_119, templateObject_120, templateObject_121;
