import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, bigint, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for better type safety
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "agent"]);
export const vipLevelEnum = pgEnum("vip_level", ["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]);
export const gameTypeEnum = pgEnum("game_type", ["color", "crash"]);
export const gameStatusEnum = pgEnum("game_status", ["active", "completed", "cancelled"]);
export const betTypeEnum = pgEnum("bet_type", ["color", "number", "size", "crash"]);
export const betStatusEnum = pgEnum("bet_status", ["pending", "won", "lost", "cashed_out", "cancelled"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "referral_bonus", "agent_commission", "commission_withdrawal"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "cancelled"]);
export const withdrawalRequestStatusEnum = pgEnum("withdrawal_request_status", ["pending", "approved", "rejected", "processing", "completed"]);
export const paymentMethodEnum = pgEnum("payment_method", ["crypto", "bank_transfer", "agent", "internal"]);
export const referralStatusEnum = pgEnum("referral_status", ["active", "inactive"]);
export const databaseTypeEnum = pgEnum("database_type", ["postgresql", "mysql", "mongodb"]);
export const databaseStatusEnum = pgEnum("database_status", ["active", "inactive", "testing"]);
export const supportChatStatusEnum = pgEnum("support_chat_status", ["open", "active", "closed"]);
export const supportChatAuthorEnum = pgEnum("support_chat_author", ["user", "support", "system"]);
export const depositRequestStatusEnum = pgEnum("deposit_request_status", ["pending", "approved", "rejected", "completed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publicId: varchar("public_id").unique(), // Random numeric ID like 02826262818 for user display
  email: text("email").notNull().unique(), // Made email required
  passwordHash: text("password_hash").notNull(), // Hashed password for security
  withdrawalPasswordHash: text("withdrawal_password_hash"), // Withdrawal password for security
  profilePhoto: text("profile_photo"), // Base64 encoded profile photo or file path
  balance: decimal("balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Support crypto precision
  frozenBalance: decimal("frozen_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Frozen deposit amount that cannot be withdrawn
  accumulatedFee: decimal("accumulated_fee", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Accumulated betting fees (only deduct whole coins)
  role: userRoleEnum("role").notNull().default("user"),
  vipLevel: vipLevelEnum("vip_level").notNull().default("lv1"), // VIP level based on team size
  isActive: boolean("is_active").notNull().default(true),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"), // FK to users
  referralLevel: integer("referral_level").notNull().default(1), // Level in referral tree (1=direct, 2=second level, etc.)
  totalDeposits: decimal("total_deposits", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  totalWithdrawals: decimal("total_withdrawals", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  totalWinnings: decimal("total_winnings", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  totalLosses: decimal("total_losses", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  totalCommission: decimal("total_commission", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Commission earned from betting and referrals
  lifetimeCommissionEarned: decimal("lifetime_commission_earned", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Lifetime total commission earned (never decreases)
  totalBetsAmount: decimal("total_bets_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total amount wagered
  dailyWagerAmount: decimal("daily_wager_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Today's wager amount
  lastWagerResetDate: timestamp("last_wager_reset_date").default(sql`CURRENT_TIMESTAMP`), // Track daily reset
  remainingRequiredBetAmount: decimal("remaining_required_bet_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Remaining bet amount required from deposits (60% per deposit)
  teamSize: integer("team_size").notNull().default(0), // Qualified referrals with $10+ deposit (for VIP level)
  totalTeamMembers: integer("total_team_members").notNull().default(0), // All referrals (including those without deposits)
  registrationIp: text("registration_ip"), // Store IP address when user registers
  registrationCountry: text("registration_country"), // Store country code when user registers (from Cloudflare)
  lastLoginIp: text("last_login_ip"), // Store last login IP
  lastLoginDeviceModel: text("last_login_device_model"), // Last device model used
  lastLoginDeviceType: text("last_login_device_type"), // Last device type (Mobile, Desktop, Tablet)
  lastLoginDeviceOs: text("last_login_device_os"), // Last device operating system
  lastLoginBrowser: text("last_login_browser"), // Last browser used
  telegramId: text("telegram_id").unique(), // Telegram user ID for Telegram login
  telegramLinkToken: text("telegram_link_token").unique(), // Short-lived token for linking Telegram account
  telegramLinkExpiresAt: timestamp("telegram_link_expires_at"), // Expiry time for link token
  telegramUsername: text("telegram_username"), // Telegram username
  telegramFirstName: text("telegram_first_name"), // Telegram first name
  telegramPhotoUrl: text("telegram_photo_url"), // Telegram profile photo URL
  maxBetLimit: decimal("max_bet_limit", { precision: 18, scale: 8 }).notNull().default("999999.00000000"), // VIP level adjustable bet limit
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false), // 2FA status
  twoFactorSecret: text("two_factor_secret"), // TOTP secret for 2FA
  isBanned: boolean("is_banned").notNull().default(false), // Whether user is banned
  bannedUntil: timestamp("banned_until"), // Temporary ban expiry (null = permanent ban if isBanned is true)
  banReason: text("ban_reason"), // Reason for the ban
  enableAnimations: boolean("enable_animations").notNull().default(true), // User preference for 3D animations and effects
  wingoMode: boolean("wingo_mode").notNull().default(false), // Focus mode - shows only Win Go game interface
  lastWithdrawalRequestAt: timestamp("last_withdrawal_request_at"), // Track last withdrawal request time for cooldown period
  binanceId: text("binance_id"), // Agent's Binance Pay ID for receiving deposits
  minDepositAmount: decimal("min_deposit_amount", { precision: 18, scale: 2 }).default("10.00"), // Minimum deposit amount for agents
  maxDepositAmount: decimal("max_deposit_amount", { precision: 18, scale: 2 }).default("10000.00"), // Maximum deposit amount for agents
  isAcceptingDeposits: boolean("is_accepting_deposits").notNull().default(true), // Toggle for agents to accept/reject deposits
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Device logins table - tracks all login attempts and device fingerprints
export const deviceLogins = pgTable("device_logins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  deviceFingerprint: text("device_fingerprint").notNull(), // Unique device ID from browser fingerprinting
  deviceModel: text("device_model").notNull(), // e.g., "iPhone 14 Pro Max", "Samsung Galaxy S24 Ultra"
  deviceType: text("device_type").notNull(), // "Mobile", "Desktop", "Tablet"
  operatingSystem: text("operating_system").notNull(), // e.g., "iOS 17.2", "Android 14"
  browserName: text("browser_name").notNull(), // e.g., "Chrome", "Safari"
  browserVersion: text("browser_version").notNull(),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  pixelRatio: decimal("pixel_ratio", { precision: 3, scale: 2 }),
  timezone: text("timezone"),
  language: text("language"),
  ipAddress: text("ip_address"),
  country: text("country"),
  loginAt: timestamp("login_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("device_logins_user_id_idx").on(table.userId),
  deviceFingerprintIdx: index("device_logins_fingerprint_idx").on(table.deviceFingerprint),
}));

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull().unique(),
  gameType: gameTypeEnum("game_type").notNull().default("color"), // 'color' or 'crash'
  roundDuration: integer("round_duration").notNull(), // in minutes
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: gameStatusEnum("status").notNull().default("active"),
  result: integer("result"), // winning number 0-9
  resultColor: text("result_color"), // 'green', 'red', 'violet'
  resultSize: text("result_size"), // 'big', 'small'
  // Crash game specific fields
  crashPoint: decimal("crash_point", { precision: 10, scale: 2 }), // The multiplier when crash happens (e.g., 2.34)
  currentMultiplier: decimal("current_multiplier", { precision: 10, scale: 2 }).default("1.00"), // Current multiplier for active crash games
  crashedAt: timestamp("crashed_at"), // When the crash happened
  isManuallyControlled: boolean("is_manually_controlled").notNull().default(false),
  manualResult: integer("manual_result"), // admin set result (0-9)
  totalBetsAmount: decimal("total_bets_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  totalPayouts: decimal("total_payouts", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  houseProfit: decimal("house_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusIdx: index("games_status_idx").on(table.status),
}));

export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  gameId: varchar("game_id").notNull(), // FK to games
  betType: betTypeEnum("bet_type").notNull(),
  betValue: text("bet_value").notNull(), // 'green', 'red', 'violet', '0-9', 'big', 'small', 'crash'
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  potential: decimal("potential", { precision: 18, scale: 8 }).notNull(),
  actualPayout: decimal("actual_payout", { precision: 18, scale: 8 }), // Actual payout after fees (null for lost/pending bets)
  status: betStatusEnum("status").notNull().default("pending"),
  // Crash game specific fields
  cashOutMultiplier: decimal("cash_out_multiplier", { precision: 10, scale: 2 }), // Multiplier when player cashed out
  autoCashOut: decimal("auto_cash_out", { precision: 10, scale: 2 }), // Auto cash out at this multiplier
  cashedOutAt: timestamp("cashed_out_at"), // When the bet was cashed out
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at"), // When the bet status was last updated (settled)
}, (table) => ({
  userIdIdx: index("bets_user_id_idx").on(table.userId),
  gameIdIdx: index("bets_game_id_idx").on(table.gameId),
  statusIdx: index("bets_status_idx").on(table.status),
}));

// Referral system table with proper constraints
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(), // FK to users
  referredId: varchar("referred_id").notNull().unique(), // FK to users, unique to prevent multiple referrers
  referralLevel: integer("referral_level").notNull().default(1), // Level in referrer's team (1=direct, 2=indirect, etc.)
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0600"), // 6% default
  totalCommission: decimal("total_commission", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  hasDeposited: boolean("has_deposited").notNull().default(false), // Track if referred user made deposit
  status: referralStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  referrerIdIdx: index("referrals_referrer_id_idx").on(table.referrerId),
}));

// Payment transactions table with crypto precision support
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  agentId: varchar("agent_id"), // FK to users with role='agent' - for agent-processed transactions
  type: transactionTypeEnum("type").notNull(),
  // Separate amounts for different currencies
  fiatAmount: decimal("fiat_amount", { precision: 18, scale: 2 }), // For USD, EUR, etc.
  cryptoAmount: decimal("crypto_amount", { precision: 36, scale: 18 }), // For crypto with full precision
  fiatCurrency: text("fiat_currency").default("USD"), // USD, EUR, etc.
  cryptoCurrency: text("crypto_currency"), // BTC, ETH, USDT, etc.
  status: transactionStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  externalId: text("external_id"), // NOWPayments payment ID
  paymentAddress: text("payment_address"), // Crypto address
  txHash: text("tx_hash"), // Blockchain transaction hash
  fee: decimal("fee", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  externalIdIdx: index("transactions_external_id_idx").on(table.externalId),
  statusIdx: index("transactions_status_idx").on(table.status),
}));

// Agent deposit requests table
export const depositRequests = pgTable("deposit_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users - who requested deposit
  agentId: varchar("agent_id").notNull(), // FK to users - agent who will process
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: depositRequestStatusEnum("status").notNull().default("pending"),
  transactionId: varchar("transaction_id"), // FK to transactions when approved
  paymentProof: text("payment_proof"), // User uploaded payment screenshot/proof (base64 or URL)
  userNote: text("user_note"), // Note from user about the payment
  agentNote: text("agent_note"), // Agent's note when processing
  processedAt: timestamp("processed_at"), // When agent approved/rejected
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("deposit_requests_user_id_idx").on(table.userId),
  agentIdIdx: index("deposit_requests_agent_id_idx").on(table.agentId),
  statusIdx: index("deposit_requests_status_idx").on(table.status),
}));

// Admin actions audit log
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(), // FK to users
  action: text("action").notNull(), // 'manual_game_result', 'user_edit', 'balance_adjustment'
  targetId: varchar("target_id"), // ID of affected entity (user, game, etc.)
  details: jsonb("details").notNull(), // Structured JSON data for action details
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  adminIdIdx: index("admin_actions_admin_id_idx").on(table.adminId),
}));

// Game analytics table
export const gameAnalytics = pgTable("game_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().unique(), // FK to games, one analytics per game
  totalPlayers: integer("total_players").notNull().default(0),
  totalBets: integer("total_bets").notNull().default(0),
  totalVolume: decimal("total_volume", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  houseEdge: decimal("house_edge", { precision: 5, scale: 4 }).notNull().default("0.0500"),
  actualProfit: decimal("actual_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  expectedProfit: decimal("expected_profit", { precision: 18, scale: 8 }).notNull().default("0.00000000"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 4 }).notNull().default("0.0000"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// IP tracking and user analytics table
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  browserName: text("browser_name"), // Parsed browser name
  browserVersion: text("browser_version"), // Parsed browser version
  deviceType: text("device_type"), // mobile, desktop, tablet
  deviceModel: text("device_model"), // Parsed device model (e.g., "iPhone 15 Pro", "Samsung Galaxy S24")
  operatingSystem: text("operating_system"), // Parsed OS name
  loginTime: timestamp("login_time").notNull().default(sql`CURRENT_TIMESTAMP`),
  logoutTime: timestamp("logout_time"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
}));

// Support chat sessions table for live chat with Telegram integration
export const supportChatSessions = pgTable("support_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // FK to users (null for anonymous chat)
  sessionToken: text("session_token").notNull().unique(), // Unique token to access session
  userDisplayName: text("user_display_name").notNull(), // Name entered by user
  telegramChatId: text("telegram_chat_id"), // Telegram chat/group ID where messages are forwarded
  status: supportChatStatusEnum("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  closedAt: timestamp("closed_at"),
}, (table) => ({
  sessionTokenIdx: index("support_chat_sessions_token_idx").on(table.sessionToken),
  statusIdx: index("support_chat_sessions_status_idx").on(table.status),
}));

// Support chat messages table
export const supportChatMessages = pgTable("support_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // FK to support_chat_sessions
  author: supportChatAuthorEnum("author").notNull(), // user, support, or system
  authorTelegramId: text("author_telegram_id"), // Telegram user ID of support agent
  body: text("body").notNull(), // Message content
  metadata: jsonb("metadata"), // Additional data like attachments, replied_to, etc.
  deliveredAt: timestamp("delivered_at"), // When message was delivered to client
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sessionIdIdx: index("support_chat_messages_session_id_idx").on(table.sessionId),
  createdAtIdx: index("support_chat_messages_created_at_idx").on(table.createdAt),
}));

// Quick replies table for admin chat shortcuts
export const quickReplies = pgTable("quick_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortcut: text("shortcut").notNull().unique(), // Short identifier like "hello", "thanks"
  message: text("message").notNull(), // The full reply text
  createdBy: varchar("created_by").notNull(), // FK to users (admin)
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  shortcutIdx: index("quick_replies_shortcut_idx").on(table.shortcut),
}));

// Page views tracking table for traffic analytics
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // FK to users (null for anonymous visitors)
  path: text("path").notNull(), // Page path (e.g., "/", "/game", "/profile")
  ipAddress: text("ip_address").notNull(),
  country: text("country"), // Country code from Cloudflare (e.g., "US", "LK", "IN")
  userAgent: text("user_agent"),
  browserName: text("browser_name"),
  deviceType: text("device_type"), // mobile, desktop, tablet
  deviceModel: text("device_model"), // Parsed device model (e.g., "iPhone 15 Pro", "Samsung Galaxy S24")
  operatingSystem: text("operating_system"),
  referrer: text("referrer"), // Where the visitor came from
  sessionId: text("session_id"), // Track unique sessions
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("page_views_user_id_idx").on(table.userId),
  pathIdx: index("page_views_path_idx").on(table.path),
  createdAtIdx: index("page_views_created_at_idx").on(table.createdAt),
}));

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Telegram login sessions table - persistent storage for Telegram authentication
export const telegramLoginSessions = pgTable("telegram_login_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Unique login token (e.g., login_abc123...)
  userId: varchar("user_id"), // FK to users - set when login is completed
  expiresAt: timestamp("expires_at").notNull(), // Session expiry time
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tokenIdx: index("telegram_login_sessions_token_idx").on(table.token),
  expiresAtIdx: index("telegram_login_sessions_expires_at_idx").on(table.expiresAt),
}));

// System settings table for admin-configurable settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Setting name (e.g., 'nowpayments_api_key')
  value: text("value").notNull(), // Setting value (encrypted for sensitive data)
  description: text("description"), // Optional description
  isEncrypted: boolean("is_encrypted").notNull().default(false), // Whether the value is encrypted
  lastUpdatedBy: varchar("last_updated_by").notNull(), // Admin user ID who last updated
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Global freeze sessions table - tracks when entire system's frozen balances are temporarily unfrozen
export const globalFreezeSessions = pgTable("global_freeze_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("active"), // 'active' or 'completed'
  activatedAt: timestamp("activated_at").notNull().default(sql`CURRENT_TIMESTAMP`), // When unfreeze was activated
  deactivatedAt: timestamp("deactivated_at"), // When it was deactivated (null if still active)
  initiatedBy: varchar("initiated_by").notNull(), // Admin user ID who initiated this unfreeze
  totalUsersAffected: integer("total_users_affected").notNull().default(0), // Count of users whose balances were unfrozen
  totalAmountUnfrozen: decimal("total_amount_unfrozen", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total frozen amount that was temporarily released
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusIdx: index("global_freeze_sessions_status_idx").on(table.status),
}));

// Global freeze snapshots table - stores original frozen balance for each user during a global unfreeze session
export const globalFreezeSnapshots = pgTable("global_freeze_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // FK to globalFreezeSessions
  userId: varchar("user_id").notNull(), // FK to users
  originalFrozenBalance: decimal("original_frozen_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // User's frozen balance before unfreeze
  restored: boolean("restored").notNull().default(false), // Whether this snapshot has been restored
  restoredAt: timestamp("restored_at"), // When the balance was restored
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sessionUserIdx: index("global_freeze_snapshots_session_user_idx").on(table.sessionId, table.userId),
  userIdIdx: index("global_freeze_snapshots_user_id_idx").on(table.userId),
}));

// Whitelisted IPs table for high-risk IP management
export const whitelistedIps = pgTable("whitelisted_ips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(), // The whitelisted IP address
  accountCountAtWhitelist: integer("account_count_at_whitelist").notNull().default(0), // Number of accounts when whitelisted
  currentAccountCount: integer("current_account_count").notNull().default(0), // Current number of accounts using this IP
  whitelistedBy: varchar("whitelisted_by").notNull(), // Admin user ID who whitelisted this IP
  whitelistedReason: text("whitelisted_reason"), // Optional reason for whitelisting
  isActive: boolean("is_active").notNull().default(true), // Whether whitelist is still active
  exceededThreshold: boolean("exceeded_threshold").notNull().default(false), // Flag when account count exceeds threshold
  thresholdExceededAt: timestamp("threshold_exceeded_at"), // When threshold was first exceeded
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  ipAddressIdx: index("whitelisted_ips_ip_address_idx").on(table.ipAddress),
  isActiveIdx: index("whitelisted_ips_is_active_idx").on(table.isActive),
}));

// Telegram auto-join channels/groups configuration
export const telegramAutoJoinChannels = pgTable("telegram_auto_join_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: text("chat_id").notNull().unique(), // Telegram channel/group chat ID
  channelName: text("channel_name").notNull(), // Display name for admin reference
  inviteLink: text("invite_link").notNull(), // Static invite link or bot-generated link
  isEnabled: boolean("is_enabled").notNull().default(true), // Whether this channel is active for auto-join
  autoApproveJoinRequests: boolean("auto_approve_join_requests").notNull().default(false), // Auto-approve join requests
  priority: integer("priority").notNull().default(1), // Display order (1 = highest priority)
  lastLinkRefreshAt: timestamp("last_link_refresh_at"), // When the invite link was last refreshed
  createdBy: varchar("created_by").notNull(), // Admin who created this
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  priorityIdx: index("telegram_auto_join_priority_idx").on(table.priority),
}));

// Database connections table for multi-database management
export const databaseConnections = pgTable("database_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // User-friendly name (e.g., 'Digital Ocean Backup', 'AWS Production')
  databaseType: databaseTypeEnum("database_type").notNull(), // postgresql, mysql, mongodb
  host: text("host").notNull(), // Database host (e.g., 'db.example.com')
  port: integer("port").notNull(), // Database port (e.g., 5432, 3306)
  database: text("database").notNull(), // Database name
  username: text("username").notNull(), // Database username
  password: text("password").notNull(), // Database password (encrypted)
  ssl: boolean("ssl").notNull().default(true), // Use SSL connection
  status: databaseStatusEnum("status").notNull().default("inactive"), // active, inactive, testing
  isActive: boolean("is_active").notNull().default(false), // Currently active database
  isPrimary: boolean("is_primary").notNull().default(false), // Primary database for the application
  lastSyncAt: timestamp("last_sync_at"), // Last time data was synced to this database
  lastTestAt: timestamp("last_test_at"), // Last time connection was tested
  connectionStatus: text("connection_status"), // Result of last connection test
  createdBy: varchar("created_by").notNull(), // Admin user ID who created this connection
  updatedBy: varchar("updated_by"), // Admin user ID who last updated
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// N1Panel reaction orders table
export const n1PanelReactionOrders = pgTable("n1panel_reaction_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramMessageId: bigint("telegram_message_id", { mode: "number" }).notNull(), // Telegram message ID that triggered the order
  telegramChannelId: text("telegram_channel_id").notNull(), // Channel/chat ID where message was posted
  messageLink: text("message_link").notNull(), // Full message link for N1Panel API
  serviceId: integer("service_id").notNull(), // N1Panel service ID (e.g., 3232)
  quantity: integer("quantity").notNull(), // Number of reactions ordered
  n1PanelOrderId: integer("n1panel_order_id"), // Order ID returned by N1Panel API
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  charge: decimal("charge", { precision: 18, scale: 8 }), // Amount charged by N1Panel
  startCount: text("start_count"), // Initial count from N1Panel status
  remains: text("remains"), // Remaining count from N1Panel status
  errorMessage: text("error_message"), // Error message if order failed
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  messageIdIdx: index("n1panel_orders_message_id_idx").on(table.telegramMessageId),
  statusIdx: index("n1panel_orders_status_idx").on(table.status),
  createdAtIdx: index("n1panel_orders_created_at_idx").on(table.createdAt),
}));

// Withdrawal requests table
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  walletAddress: text("wallet_address").notNull(),
  status: withdrawalRequestStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"), // Admin can add notes
  requiredBetAmount: decimal("required_bet_amount", { precision: 18, scale: 8 }).notNull(), // 60% of deposits
  currentBetAmount: decimal("current_bet_amount", { precision: 18, scale: 8 }).notNull(), // User's current betting
  eligible: boolean("eligible").notNull().default(false), // Auto-calculated eligibility
  duplicateIpCount: integer("duplicate_ip_count").notNull().default(0), // Number of accounts from same registration IP
  duplicateIpUserIds: text("duplicate_ip_user_ids").array(), // User IDs with same registration IP
  commissionAmount: decimal("commission_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Amount from referral/commission earnings
  winningsAmount: decimal("winnings_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Amount from bet winnings
  balanceFrozen: boolean("balance_frozen").notNull().default(false), // Track if balance was deducted when request was created
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by"), // Admin user ID
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("withdrawal_requests_user_id_idx").on(table.userId),
  statusIdx: index("withdrawal_requests_status_idx").on(table.status),
}));

// Agent profiles table - extends users with role='agent'
export const agentProfiles = pgTable("agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(), // FK to users with role='agent'
  displayName: text("display_name"), // Custom display name for agent (shown to users instead of email)
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0500"), // 5% default commission
  earningsBalance: decimal("earnings_balance", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Agent's commission earnings
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Agent activities audit table
export const agentActivities = pgTable("agent_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(), // FK to users with role='agent'
  action: text("action").notNull(), // 'deposit', 'withdrawal', 'commission_award'
  targetUserId: varchar("target_user_id"), // FK to users - who was affected by the action
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // Transaction amount
  commissionAmount: decimal("commission_amount", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Commission earned
  transactionId: varchar("transaction_id"), // FK to transactions
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  agentIdIdx: index("agent_activities_agent_id_idx").on(table.agentId),
}));

// Passkeys table for WebAuthn credentials (for withdrawal security)
export const passkeys = pgTable("passkeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  credentialId: text("credential_id").notNull().unique(), // Base64URL encoded credential ID from WebAuthn
  publicKey: text("public_key").notNull(), // Base64URL encoded public key from WebAuthn
  counter: bigint("counter", { mode: "number" }).notNull().default(0), // Signature counter for replay attack prevention
  deviceName: text("device_name").notNull(), // User-friendly name for the device (e.g., "iPhone", "Touch ID", "YubiKey")
  rpId: text("rp_id").notNull(), // Domain where passkey was registered (e.g., "threexbet.com")
  origin: text("origin").notNull(), // Full origin URL where passkey was registered (e.g., "https://threexbet.com")
  isActive: boolean("is_active").notNull().default(true), // Allow users to disable specific passkeys
  isDomainMismatch: boolean("is_domain_mismatch").notNull().default(false), // Flag for passkeys registered on a different domain
  lastUsedAt: timestamp("last_used_at"), // Track when the passkey was last used
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Notifications table for admin-to-user messaging
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // FK to users - null means notification to all users
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, success, warning, error
  imageUrl: text("image_url"), // Optional image for rich notifications
  isRead: boolean("is_read").notNull().default(false),
  sentBy: varchar("sent_by").notNull(), // FK to admin user
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
}));

// Push subscriptions table for PWA push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(), // Client public key for encryption
  authKey: text("auth_key").notNull(), // Authentication secret
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("push_subscriptions_user_id_idx").on(table.userId),
  endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint),
}));

// Promo codes table for promotional giveaways
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // The actual promo code
  totalValue: decimal("total_value", { precision: 18, scale: 8 }).notNull(), // Total value of the code (e.g., 100 coins)
  minValue: decimal("min_value", { precision: 18, scale: 8 }).notNull(), // Minimum random value users can get
  maxValue: decimal("max_value", { precision: 18, scale: 8 }).notNull(), // Maximum random value users can get
  usageLimit: integer("usage_limit"), // null = unlimited, otherwise max number of redemptions
  usedCount: integer("used_count").notNull().default(0), // Number of times redeemed
  isActive: boolean("is_active").notNull().default(true), // Whether code can be redeemed
  requireDeposit: boolean("require_deposit").notNull().default(false), // Only users who deposited can redeem
  vipLevelUpgrade: vipLevelEnum("vip_level_upgrade"), // VIP level to upgrade user to (null = no upgrade)
  expiresAt: timestamp("expires_at"), // null = never expires
  createdBy: varchar("created_by").notNull(), // FK to admin user
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  codeIdx: index("promo_codes_code_idx").on(table.code),
  isActiveIdx: index("promo_codes_is_active_idx").on(table.isActive),
}));

// Promo code redemptions tracking
export const promoCodeRedemptions = pgTable("promo_code_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").notNull(), // FK to promoCodes
  userId: varchar("user_id").notNull(), // FK to users
  code: text("code").notNull(), // Store code for reference
  amountAwarded: decimal("amount_awarded", { precision: 18, scale: 8 }).notNull(), // Actual amount user received (random between min-max)
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  promoCodeIdIdx: index("promo_code_redemptions_promo_code_id_idx").on(table.promoCodeId),
  userIdIdx: index("promo_code_redemptions_user_id_idx").on(table.userId),
  // Unique constraint to prevent same user from redeeming same code multiple times
  userCodeIdx: index("promo_code_redemptions_user_code_idx").on(table.userId, table.code),
}));

// VIP Level Telegram Links table for level-based telegram group/channel links
export const vipLevelTelegramLinks = pgTable("vip_level_telegram_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vipLevel: vipLevelEnum("vip_level").notNull().unique(), // VIP level (lv1, lv2, vip, vip1, etc.)
  telegramLink: text("telegram_link").notNull(), // Telegram group or channel link
  description: text("description"), // Optional description for the link
  isActive: boolean("is_active").notNull().default(true), // Whether the link is active
  updatedBy: varchar("updated_by").notNull(), // FK to admin user who last updated
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  vipLevelIdx: index("vip_level_telegram_links_vip_level_idx").on(table.vipLevel),
}));

// Schema definitions for form validation with proper constraints
export const insertUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  withdrawalPassword: z.string().min(6, "Withdrawal password must be at least 6 characters"),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  referralCode: z.string().optional(), // Support referral signup
  telegramId: z.string().optional(), // Telegram user ID for Telegram login
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changeWithdrawalPasswordSchema = z.object({
  currentWithdrawalPassword: z.string().min(1, "Current withdrawal password is required"),
  newWithdrawalPassword: z.string().min(6, "New withdrawal password must be at least 6 characters"),
  confirmWithdrawalPassword: z.string(),
}).refine((data) => data.newWithdrawalPassword === data.confirmWithdrawalPassword, {
  message: "Withdrawal passwords don't match",
  path: ["confirmWithdrawalPassword"],
});

export const verifyWithdrawalPasswordSchema = z.object({
  withdrawalPassword: z.string().min(1, "Withdrawal password is required"),
});

export const setup2FASchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const verify2FASchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  token: z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
  secret: z.string().min(1, "Secret is required"),
});

export const validate2FASchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  token: z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
});

// Telegram Login validation schema
export const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

// Passkey/WebAuthn validation schemas
export const startPasskeyRegistrationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  deviceName: z.string().min(1, "Device name is required").max(50, "Device name too long"),
});

export const passkeyDeviceNameSchema = z.object({
  deviceName: z.string().min(1, "Device name is required").max(50, "Device name too long"),
});

export const finishPasskeyRegistrationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  credentialId: z.string().min(1, "Credential ID is required"),
  publicKey: z.string().min(1, "Public key is required"),
  deviceName: z.string().min(1, "Device name is required").max(50, "Device name too long"),
  counter: z.number().min(0, "Counter must be non-negative"),
});

export const startPasskeyAuthenticationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  purpose: z.enum(["withdrawal", "settings"], { message: "Invalid authentication purpose" }),
});

export const finishPasskeyAuthenticationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  credentialId: z.string().min(1, "Credential ID is required"),
  signature: z.string().min(1, "Signature is required"),
  authenticatorData: z.string().min(1, "Authenticator data is required"),
  clientDataJSON: z.string().min(1, "Client data JSON is required"),
  counter: z.number().min(0, "Counter must be non-negative"),
});

export const updatePasskeySchema = z.object({
  passkeyId: z.string().min(1, "Passkey ID is required"),
  deviceName: z.string().min(1, "Device name is required").max(50, "Device name too long").optional(),
  isActive: z.boolean().optional(),
});

export const insertPasskeySchema = createInsertSchema(passkeys).omit({
  id: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const sendNotificationSchema = z.object({
  userId: z.string().optional(), // Optional - if not provided, sends to all users
  title: z.string().max(100, "Title too long").optional().or(z.literal("")), // Optional - can send message only
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  type: z.enum(["info", "success", "warning", "error"], {
    message: "Invalid notification type"
  }).default("info"),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});

// Push subscription schemas
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const subscribeToPushSchema = z.object({
  endpoint: z.string().min(1, "Endpoint is required"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh key is required"),
    auth: z.string().min(1, "auth key is required"),
  }),
});

export const unsubscribeFromPushSchema = z.object({
  endpoint: z.string().min(1, "Endpoint is required"),
});

// Promo code schemas
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  usedCount: true,
  createdAt: true,
  updatedAt: true,
});

export const createPromoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code must be at most 20 characters").toUpperCase(),
  totalValue: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0;
  }, {
    message: "Total value must be a valid number"
  }),
  minValue: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0;
  }, {
    message: "Minimum value must be a valid number"
  }),
  maxValue: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0;
  }, {
    message: "Maximum value must be a valid number"
  }),
  usageLimit: z.number().int().optional(),
  requireDeposit: z.boolean().default(false),
  vipLevelUpgrade: z.enum(["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]).optional(),
  expiresAt: z.string().optional(), // ISO date string
}).refine((data) => {
  const min = parseFloat(data.minValue);
  const max = parseFloat(data.maxValue);
  return min <= max;
}, {
  message: "Minimum value cannot be greater than maximum value",
  path: ["minValue"],
}).refine((data) => {
  const max = parseFloat(data.maxValue);
  const total = parseFloat(data.totalValue);
  return max <= total;
}, {
  message: "Maximum value cannot be greater than total value",
  path: ["maxValue"],
});

export const redeemPromoCodeSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
});

export const insertPromoCodeRedemptionSchema = createInsertSchema(promoCodeRedemptions).omit({
  id: true,
  createdAt: true,
});

export const insertVipLevelTelegramLinkSchema = createInsertSchema(vipLevelTelegramLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertVipLevelTelegramLinkSchema = z.object({
  vipLevel: z.enum(["lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"]),
  telegramLink: z.string().url("Invalid Telegram link").min(1, "Telegram link is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  result: true,
  resultColor: true,
  resultSize: true,
  totalBetsAmount: true,
  totalPayouts: true,
  houseProfit: true,
  createdAt: true,
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  status: true,
  potential: true,
  actualPayout: true,
});

// Crash game specific schemas
export const insertCrashGameSchema = createInsertSchema(games).omit({
  id: true,
  result: true,
  resultColor: true,
  resultSize: true,
  currentMultiplier: true,
  crashedAt: true,
  totalBetsAmount: true,
  totalPayouts: true,
  houseProfit: true,
  createdAt: true,
}).extend({
  gameType: z.literal("crash"),
  crashPoint: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 1.00 && num <= 100.00;
  }, {
    message: "Crash point must be between 1.00 and 100.00"
  }),
});

export const insertCrashBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  status: true,
  potential: true,
  cashOutMultiplier: true,
  cashedOutAt: true,
}).extend({
  betType: z.literal("crash"),
  betValue: z.literal("crash"),
  autoCashOut: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 1.01 && num <= 1000.00;
  }, {
    message: "Auto cash out must be between 1.01 and 1000.00"
  }),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepositRequestSchema = createInsertSchema(depositRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  totalCommission: true,
  createdAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export const insertGameAnalyticsSchema = createInsertSchema(gameAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  loginTime: true,
});

export const insertSupportChatSessionSchema = createInsertSchema(supportChatSessions).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
  closedAt: true,
});

export const insertSupportChatMessageSchema = createInsertSchema(supportChatMessages).omit({
  id: true,
  deliveredAt: true,
  createdAt: true,
});

export const insertQuickReplySchema = createInsertSchema(quickReplies).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shortcut: z.string().min(1, "Shortcut is required").max(50, "Shortcut too long"),
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
});

export const updateQuickReplySchema = z.object({
  shortcut: z.string().min(1, "Shortcut is required").max(50, "Shortcut too long").optional(),
  message: z.string().min(1, "Message is required").max(1000, "Message too long").optional(),
}).refine((data) => data.shortcut || data.message, {
  message: "At least one field (shortcut or message) must be provided",
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export const insertTelegramLoginSessionSchema = createInsertSchema(telegramLoginSessions).omit({
  id: true,
  createdAt: true,
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  status: true,
  processedAt: true,
  processedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhitelistedIpSchema = createInsertSchema(whitelistedIps).omit({
  id: true,
  currentAccountCount: true,
  exceededThreshold: true,
  thresholdExceededAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWhitelistedIpSchema = z.object({
  id: z.string().min(1, "Whitelisted IP ID is required"),
  isActive: z.boolean().optional(),
  whitelistedReason: z.string().optional(),
});

export const insertTelegramAutoJoinChannelSchema = createInsertSchema(telegramAutoJoinChannels).omit({
  id: true,
  lastLinkRefreshAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  chatId: z.string().min(1, "Chat ID is required"),
  channelName: z.string().min(1, "Channel name is required").max(200, "Channel name too long"),
  inviteLink: z.string().url("Invalid invite link format"),
  priority: z.number().int().min(1).max(100).optional(),
});

export const updateTelegramAutoJoinChannelSchema = z.object({
  channelName: z.string().min(1, "Channel name is required").max(200, "Channel name too long").optional(),
  inviteLink: z.string().url("Invalid invite link format").optional(),
  isEnabled: z.boolean().optional(),
  autoApproveJoinRequests: z.boolean().optional(),
  priority: z.number().int().min(1).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const insertDatabaseConnectionSchema = createInsertSchema(databaseConnections).omit({
  id: true,
  lastSyncAt: true,
  lastTestAt: true,
  connectionStatus: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentProfileSchema = createInsertSchema(agentProfiles).omit({
  id: true,
  earningsBalance: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentActivitySchema = createInsertSchema(agentActivities).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceLoginSchema = createInsertSchema(deviceLogins).omit({
  id: true,
  loginAt: true,
});

export const updateSystemSettingSchema = z.object({
  key: z.string().min(1, "Setting key is required"),
  value: z.string().min(1, "Setting value is required"),
  description: z.string().optional(),
  isEncrypted: z.boolean().optional(),
});

export const createWithdrawalRequestSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 1200 && Number.isInteger(num);
  }, {
    message: "Amount must be at least 1200 coins and a whole number"
  }),
  currency: z.string().min(1, "Currency is required"),
  address: z.string().min(1, "Wallet address is required"),
  withdrawalPassword: z.string().min(1, "Withdrawal password is required"),
});

export const processWithdrawalRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().optional(),
});

// Admin API response types
export const adminDepositResponseSchema = z.object({
  deposits: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    agentId: z.string().optional(),
    type: z.literal("deposit"),
    fiatAmount: z.string().optional(),
    cryptoAmount: z.string().optional(),
    fiatCurrency: z.string().optional(),
    cryptoCurrency: z.string().optional(),
    status: z.enum(["pending", "completed", "failed", "cancelled"]),
    paymentMethod: z.string(),
    externalId: z.string().optional(),
    paymentAddress: z.string().optional(),
    txHash: z.string().optional(),
    fee: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    userEmail: z.string().optional(),
    userPublicId: z.string().optional(),
  })),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const adminWithdrawalResponseSchema = z.object({
  withdrawals: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    agentId: z.string().optional(),
    type: z.literal("withdrawal"),
    fiatAmount: z.string().optional(),
    cryptoAmount: z.string().optional(),
    fiatCurrency: z.string().optional(),
    cryptoCurrency: z.string().optional(),
    status: z.enum(["pending", "completed", "failed", "cancelled"]),
    paymentMethod: z.string(),
    externalId: z.string().optional(),
    paymentAddress: z.string().optional(),
    txHash: z.string().optional(),
    fee: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    userEmail: z.string().optional(),
    userPublicId: z.string().optional(),
    userTotalDeposits: z.string().optional(),
    userTotalBets: z.string().optional(),
    userBetPercentage: z.number().optional(),
  })),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export type AdminDepositResponse = z.infer<typeof adminDepositResponseSchema>;
export type AdminWithdrawalResponse = z.infer<typeof adminWithdrawalResponseSchema>;

// Agent-specific schemas
export const createAgentSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  commissionRate: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1;
  }, {
    message: "Commission rate must be between 0 and 1"
  }).optional(),
});

export const agentDepositSchema = z.object({
  userIdentifier: z.string().min(1, "User identifier (public ID or email) is required"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 11;
  }, {
    message: "Minimum deposit amount is 11 USD"
  }),
});

export const agentWithdrawalSchema = z.object({
  userIdentifier: z.string().min(1, "User identifier (public ID or email) is required"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 12;
  }, {
    message: "Amount must be at least 12 USD (1200 coins)"
  }),
});

export const updateCommissionSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  commissionRate: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1;
  }, {
    message: "Commission rate must be between 0 and 1"
  }),
});

export const agentSelfDepositSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 15;
  }, {
    message: "Amount must be a valid number with minimum 15 USD"
  }),
  currency: z.enum(["TRX", "USDTTRC20", "USDTMATIC"])
});

// VIP settings table for admin-configurable VIP levels
export const vipSettings = pgTable("vip_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  levelKey: text("level_key").notNull().unique(), // 'lv1', 'vip1', etc.
  levelName: text("level_name").notNull().unique(), // "Level 1", "VIP 1", etc.
  levelOrder: integer("level_order").notNull().unique(), // 0, 1, 2, etc. for ordering
  teamRequirement: integer("team_requirement").notNull().default(0), // Number of team members required
  maxBet: decimal("max_bet", { precision: 18, scale: 8 }).notNull().default("100000000.00000000"),
  dailyWagerReward: decimal("daily_wager_reward", { precision: 10, scale: 6 }).notNull().default("0.000000"), // Daily wager reward percentage
  commissionRates: text("commission_rates").notNull().default("[]"), // JSON array of commission rates
  rechargeAmount: decimal("recharge_amount", { precision: 18, scale: 8 }).notNull().default("1000.00000000"), // USDT amount (for reference)
  telegramLink: text("telegram_link"), // Telegram channel/group link for this VIP level
  supportEmail: text("support_email"), // Support email for this VIP level
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Golden Live player tracking tables
export const goldenLiveStats = pgTable("golden_live_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalPlayers: integer("total_players").notNull().default(0),
  activePlayers: integer("active_players").notNull().default(0),
  lastHourlyIncrease: timestamp("last_hourly_increase").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Golden Live events tracking for audit trail
export const goldenLiveEvents = pgTable("golden_live_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // 'hourly_increase', 'manual_adjustment', 'active_player_update'
  previousValue: integer("previous_value").notNull(),
  newValue: integer("new_value").notNull(),
  incrementAmount: integer("increment_amount").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Predicted results for admin period control
export const predictedResults = pgTable("predicted_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(), // FK to users (admin who created prediction)
  periodId: text("period_id").notNull(), // Period ID (e.g., 20251106010574)
  result: integer("result").notNull(), // Predicted result (0-9)
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  adminIdIdx: index("predicted_results_admin_id_idx").on(table.adminId),
  periodIdIdx: index("predicted_results_period_id_idx").on(table.periodId),
}));

// Coin flip games table
export const coinFlipGames = pgTable("coin_flip_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // FK to users
  selectedSide: text("selected_side").notNull(), // 'head' or 'tail'
  result: text("result").notNull(), // 'head' or 'tail'
  betAmount: decimal("bet_amount", { precision: 18, scale: 8 }).notNull(),
  won: boolean("won").notNull(),
  winAmount: decimal("win_amount", { precision: 18, scale: 8 }), // null if lost
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("coin_flip_games_user_id_idx").on(table.userId),
  createdAtIdx: index("coin_flip_games_created_at_idx").on(table.createdAt),
}));

// Betting tasks table - daily tasks for users to earn coins
export const bettingTasks = pgTable("betting_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  betRequirement: decimal("bet_requirement", { precision: 18, scale: 2 }).notNull(), // $100 bet required
  durationMinutes: integer("duration_minutes").notNull(), // 1, 3, 5, or 10 minutes
  coinReward: decimal("coin_reward", { precision: 18, scale: 2 }).notNull(), // coins to award
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Track user progress on betting tasks
export const userBettingTaskProgress = pgTable("user_betting_task_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  taskId: varchar("task_id").notNull(),
  betAccumulated: decimal("bet_accumulated", { precision: 18, scale: 2 }).notNull().default("0.00"),
  isCompleted: boolean("is_completed").notNull().default(false),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userTaskIdx: index("user_betting_task_progress_user_task_idx").on(table.userId, table.taskId),
}));

// Telegram Signals Tables - for live updating betting signals
export const telegramSignalStatusEnum = pgEnum("telegram_signal_status", ["pending", "sent", "updated", "completed", "failed"]);

// Telegram signals tracking table - tracks signals with live updates
export const telegramSignals = pgTable("telegram_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull(), // Period/game ID (e.g., 20251125030205)
  duration: integer("duration").notNull(), // 1, 3, 5, or 10 minutes
  colour: text("colour").notNull(), // green, red, or violet
  messageId: integer("message_id"), // Telegram message ID for editing
  chatId: text("chat_id").notNull(), // Telegram chat/channel ID where signal was sent
  status: telegramSignalStatusEnum("status").notNull().default("pending"),
  result: text("result"), // 'WIN' or 'LOSS' when updated
  autoRed: boolean("auto_red").default(false), // True if auto-generated RED result (no bets placed)
  autoRedNumber: integer("auto_red_number"), // Random number (0-9) for auto-generated RED result
  sentAt: timestamp("sent_at"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  gameIdIdx: index("telegram_signals_game_id_idx").on(table.gameId),
  statusIdx: index("telegram_signals_status_idx").on(table.status),
  messageIdIdx: index("telegram_signals_message_id_idx").on(table.messageId),
}));

// Telegram Reactions Tables (N1Panel Integration)
export const telegramReactionOrderStatusEnum = pgEnum("telegram_reaction_order_status", ["pending", "processing", "completed", "partial", "cancelled", "failed"]);

// N1Panel API configuration and settings
export const telegramReactionSettings = pgTable("telegram_reaction_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key").notNull(), // N1Panel API key
  apiUrl: text("api_url").notNull().default("https://n1panel.com/api/v2"), // N1Panel API URL
  isActive: boolean("is_active").notNull().default(true),
  balance: decimal("balance", { precision: 18, scale: 2 }), // Account balance from N1Panel
  lastBalanceCheck: timestamp("last_balance_check"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Telegram groups/channels to monitor for auto-reactions
export const telegramGroups = pgTable("telegram_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Group/channel name for display
  telegramId: text("telegram_id").notNull().unique(), // Telegram group/channel ID
  telegramLink: text("telegram_link"), // Invite link or public link
  serviceId: integer("service_id").notNull(), // N1Panel service ID for reactions
  serviceName: text("service_name"), // Service name from N1Panel
  autoReactEnabled: boolean("auto_react_enabled").notNull().default(false), // Enable/disable auto-reactions
  reactionCount: integer("reaction_count").notNull().default(100), // Number of reactions per post
  reactionEmojis: text("reaction_emojis").array(), // Array of emojis to use
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  telegramIdIdx: index("telegram_groups_telegram_id_idx").on(table.telegramId),
}));

// Track all reaction orders placed through N1Panel
export const telegramReactionOrders = pgTable("telegram_reaction_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(), // FK to telegramGroups
  orderId: text("order_id").notNull().unique(), // N1Panel order ID
  serviceId: integer("service_id").notNull(), // N1Panel service ID
  postLink: text("post_link").notNull(), // Telegram post link
  quantity: integer("quantity").notNull(), // Number of reactions ordered
  charge: decimal("charge", { precision: 18, scale: 2 }).notNull(), // Cost of the order
  status: telegramReactionOrderStatusEnum("status").notNull().default("pending"),
  startCount: integer("start_count"), // Initial reaction count
  remains: integer("remains"), // Remaining reactions to deliver
  currency: text("currency").default("USD"), // Currency from N1Panel
  orderResponse: jsonb("order_response"), // Full response from N1Panel API
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  groupIdIdx: index("telegram_reaction_orders_group_id_idx").on(table.groupId),
  statusIdx: index("telegram_reaction_orders_status_idx").on(table.status),
  createdAtIdx: index("telegram_reaction_orders_created_at_idx").on(table.createdAt),
}));

// VIP settings insert schemas
export const insertVipSettingSchema = createInsertSchema(vipSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateVipSettingSchema = z.object({
  id: z.string().min(1, "VIP setting ID is required"),
  levelKey: z.string().optional(),
  levelName: z.string().optional(),
  levelOrder: z.number().optional(),
  teamRequirement: z.number().optional(),
  maxBet: z.string().optional(),
  dailyWagerReward: z.string().optional(),
  commissionRates: z.string().optional(), // JSON string of array
  rechargeAmount: z.string().optional(),
  telegramLink: z.string().optional(),
  supportEmail: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Golden Live insert schemas
export const insertGoldenLiveStatsSchema = createInsertSchema(goldenLiveStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoldenLiveEventSchema = createInsertSchema(goldenLiveEvents).omit({
  id: true,
  createdAt: true,
});

// Predicted results insert schemas
export const insertPredictedResultSchema = createInsertSchema(predictedResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPredictedResult = z.infer<typeof insertPredictedResultSchema>;
export type PredictedResult = typeof predictedResults.$inferSelect;

// Coin flip games insert schemas
export const insertCoinFlipGameSchema = createInsertSchema(coinFlipGames).omit({
  id: true,
  createdAt: true,
});

export type InsertCoinFlipGame = z.infer<typeof insertCoinFlipGameSchema>;
export type CoinFlipGame = typeof coinFlipGames.$inferSelect;

// Betting tasks insert schemas
export const insertBettingTaskSchema = createInsertSchema(bettingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBettingTaskSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  betRequirement: z.string().optional(),
  durationMinutes: z.number().optional(),
  coinReward: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const insertUserBettingTaskProgressSchema = createInsertSchema(userBettingTaskProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBettingTask = z.infer<typeof insertBettingTaskSchema>;
export type UpdateBettingTask = z.infer<typeof updateBettingTaskSchema>;
export type BettingTask = typeof bettingTasks.$inferSelect;
export type InsertUserBettingTaskProgress = z.infer<typeof insertUserBettingTaskProgressSchema>;
export type UserBettingTaskProgress = typeof userBettingTaskProgress.$inferSelect;

// Telegram Signals insert schemas
export const insertTelegramSignalSchema = createInsertSchema(telegramSignals).omit({
  id: true,
  messageId: true,
  status: true,
  result: true,
  sentAt: true,
  updatedAt: true,
  createdAt: true,
});

export const updateTelegramSignalSchema = z.object({
  messageId: z.number().optional(),
  status: z.enum(["pending", "sent", "updated", "completed", "failed"]).optional(),
  result: z.string().optional(),
  autoRed: z.boolean().optional(),
  autoRedNumber: z.number().optional(),
  sentAt: z.string().optional(),
});

export type InsertTelegramSignal = z.infer<typeof insertTelegramSignalSchema>;
export type UpdateTelegramSignal = z.infer<typeof updateTelegramSignalSchema>;
export type TelegramSignal = typeof telegramSignals.$inferSelect;

// Telegram Scheduled Posts table - for auto-posting to Telegram channels
export const telegramScheduledPostStatusEnum = pgEnum("telegram_scheduled_post_status", ["active", "paused", "completed"]);

export const telegramScheduledPosts = pgTable("telegram_scheduled_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: text("channel_id").notNull(), // Telegram channel ID to post to
  title: text("title").notNull(), // Post title for admin reference
  messageText: text("message_text").notNull(), // Message text/caption to send
  photoPath: text("photo_path"), // Path to photo file (stored in uploads)
  photoUrl: text("photo_url"), // External photo URL if not using local file
  buttons: text("buttons"), // JSON array of inline keyboard buttons: [{text: "Button", url: "https://..."}]
  scheduleTime: text("schedule_time"), // Time in HH:MM:SS format (24hr) - optional if using period-based
  timezone: text("timezone").notNull().default("Asia/Colombo"), // Timezone for scheduling
  repeatDaily: boolean("repeat_daily").notNull().default(true), // Whether to repeat daily
  daysOfWeek: text("days_of_week").default("0,1,2,3,4,5,6"), // Comma-separated days (0=Sunday, 6=Saturday)
  periodId: text("period_id"), // Period ID to trigger on (e.g., game ID) - optional if using schedule time
  status: telegramScheduledPostStatusEnum("status").notNull().default("active"),
  lastSentAt: timestamp("last_sent_at"), // When was this post last sent
  nextRunAt: timestamp("next_run_at"), // When will this post next run
  sentCount: integer("sent_count").notNull().default(0), // Total times this post was sent
  createdBy: varchar("created_by").notNull(), // Admin who created
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  channelIdIdx: index("telegram_scheduled_posts_channel_id_idx").on(table.channelId),
  statusIdx: index("telegram_scheduled_posts_status_idx").on(table.status),
  nextRunAtIdx: index("telegram_scheduled_posts_next_run_at_idx").on(table.nextRunAt),
  periodIdIdx: index("telegram_scheduled_posts_period_id_idx").on(table.periodId),
}));

// Telegram Scheduled Posts insert/update schemas
export const insertTelegramScheduledPostSchema = createInsertSchema(telegramScheduledPosts).omit({
  id: true,
  lastSentAt: true,
  nextRunAt: true,
  sentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTelegramScheduledPostSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
  channelId: z.string().optional(),
  title: z.string().optional(),
  messageText: z.string().optional(),
  photoPath: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  buttons: z.string().optional().nullable(),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().nullable(),
  timezone: z.string().optional(),
  repeatDaily: z.boolean().optional(),
  daysOfWeek: z.string().optional(),
  periodId: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "completed"]).optional(),
});

export const createTelegramScheduledPostSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  messageText: z.string().min(1, "Message text is required").max(4096, "Message too long"),
  photoPath: z.string().optional().nullable(),
  photoUrl: z.preprocess((val) => val === "" ? null : val, z.string().url("Invalid photo URL").optional().nullable()),
  buttons: z.string().optional().nullable(),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().nullable(),
  timezone: z.string().default("Asia/Colombo"),
  repeatDaily: z.boolean().default(true),
  daysOfWeek: z.string().default("0,1,2,3,4,5,6"),
  periodId: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "completed"]).default("active"),
}).refine(
  (data) => data.scheduleTime || data.periodId,
  {
    message: "Either scheduleTime or periodId must be provided",
    path: ["scheduleTime"],
  }
);

export type InsertTelegramScheduledPost = z.infer<typeof insertTelegramScheduledPostSchema>;
export type UpdateTelegramScheduledPost = z.infer<typeof updateTelegramScheduledPostSchema>;
export type CreateTelegramScheduledPost = z.infer<typeof createTelegramScheduledPostSchema>;
export type TelegramScheduledPost = typeof telegramScheduledPosts.$inferSelect;

// Telegram Reactions insert schemas
export const insertTelegramReactionSettingSchema = createInsertSchema(telegramReactionSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTelegramReactionSettingSchema = z.object({
  id: z.string().optional(),
  apiKey: z.string().min(1, "API key is required"),
  apiUrl: z.string().url().default("https://n1panel.com/api/v2"),
  isActive: z.boolean().optional(),
});

export const insertTelegramGroupSchema = createInsertSchema(telegramGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTelegramGroupSchema = z.object({
  id: z.string().min(1, "Group ID is required"),
  name: z.string().optional(),
  telegramId: z.string().optional(),
  telegramLink: z.string().optional(),
  serviceId: z.number().optional(),
  serviceName: z.string().optional(),
  autoReactEnabled: z.boolean().optional(),
  reactionCount: z.number().optional(),
  reactionEmojis: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const insertTelegramReactionOrderSchema = createInsertSchema(telegramReactionOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTelegramReactionSetting = z.infer<typeof insertTelegramReactionSettingSchema>;
export type UpdateTelegramReactionSetting = z.infer<typeof updateTelegramReactionSettingSchema>;
export type TelegramReactionSetting = typeof telegramReactionSettings.$inferSelect;
export type InsertTelegramGroup = z.infer<typeof insertTelegramGroupSchema>;
export type UpdateTelegramGroup = z.infer<typeof updateTelegramGroupSchema>;
export type TelegramGroup = typeof telegramGroups.$inferSelect;
export type InsertTelegramReactionOrder = z.infer<typeof insertTelegramReactionOrderSchema>;
export type TelegramReactionOrder = typeof telegramReactionOrders.$inferSelect;

// Relations
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many, one }) => ({
  bets: many(bets),
  transactions: many(transactions),
  agentTransactions: many(transactions, { relationName: "agentTransactions" }),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralReceived: one(referrals, { relationName: "referred", fields: [users.id], references: [referrals.referredId] }),
  adminActions: many(adminActions),
  sessions: many(userSessions),
  withdrawalRequests: many(withdrawalRequests),
  agentProfile: one(agentProfiles),
  agentActivities: many(agentActivities),
  referrer: one(users, { fields: [users.referredBy], references: [users.id] }),
}));

export const gamesRelations = relations(games, ({ many, one }) => ({
  bets: many(bets),
  analytics: one(gameAnalytics),
}));

export const betsRelations = relations(bets, ({ one }) => ({
  user: one(users, { fields: [bets.userId], references: [users.id] }),
  game: one(games, { fields: [bets.gameId], references: [games.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  agent: one(users, { relationName: "agentTransactions", fields: [transactions.agentId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { relationName: "referrer", fields: [referrals.referrerId], references: [users.id] }),
  referred: one(users, { relationName: "referred", fields: [referrals.referredId], references: [users.id] }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  admin: one(users, { fields: [adminActions.adminId], references: [users.id] }),
}));

export const gameAnalyticsRelations = relations(gameAnalytics, ({ one }) => ({
  game: one(games, { fields: [gameAnalytics.gameId], references: [games.id] }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.email], references: [users.email] }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, { fields: [withdrawalRequests.userId], references: [users.id] }),
  processedByAdmin: one(users, { fields: [withdrawalRequests.processedBy], references: [users.id] }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  lastUpdatedByAdmin: one(users, { fields: [systemSettings.lastUpdatedBy], references: [users.id] }),
}));

export const agentProfilesRelations = relations(agentProfiles, ({ one, many }) => ({
  user: one(users, { fields: [agentProfiles.userId], references: [users.id] }),
  activities: many(agentActivities),
}));

export const agentActivitiesRelations = relations(agentActivities, ({ one }) => ({
  agent: one(users, { fields: [agentActivities.agentId], references: [users.id] }),
  targetUser: one(users, { fields: [agentActivities.targetUserId], references: [users.id] }),
  transaction: one(transactions, { fields: [agentActivities.transactionId], references: [transactions.id] }),
}));

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, { fields: [passkeys.userId], references: [users.id] }),
}));

export const predictedResultsRelations = relations(predictedResults, ({ one }) => ({
  admin: one(users, { fields: [predictedResults.adminId], references: [users.id] }),
}));

// VIP Level Utilities
export const VIP_LEVELS = {
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
} as const;

export function calculateVipLevel(teamSize: number, totalDeposits: number = 0): keyof typeof VIP_LEVELS {
  // Sort levels by team requirement in descending order
  const levels: [keyof typeof VIP_LEVELS, typeof VIP_LEVELS[keyof typeof VIP_LEVELS]][] = [
    ['vip7', VIP_LEVELS.vip7],
    ['vip6', VIP_LEVELS.vip6],
    ['vip5', VIP_LEVELS.vip5],
    ['vip4', VIP_LEVELS.vip4],
    ['vip3', VIP_LEVELS.vip3],
    ['vip2', VIP_LEVELS.vip2],
    ['vip1', VIP_LEVELS.vip1],
    ['vip', VIP_LEVELS.vip],
    ['lv2', VIP_LEVELS.lv2],
    ['lv1', VIP_LEVELS.lv1],
  ];

  for (const [key, config] of levels) {
    // User qualifies if they meet EITHER team requirement OR deposit requirement
    const meetsTeamRequirement = teamSize >= config.teamRequirement;
    const meetsDepositRequirement = totalDeposits >= config.depositRequirement;
    
    if (meetsTeamRequirement || meetsDepositRequirement) {
      return key;
    }
  }

  return "lv1";
}

export function getMaxBetLimit(vipLevel: keyof typeof VIP_LEVELS): number {
  return VIP_LEVELS[vipLevel].maxBetLimit;
}

export function getVipDisplayName(vipLevel: keyof typeof VIP_LEVELS): string {
  return VIP_LEVELS[vipLevel].displayName;
}

export function getCommissionRate(vipLevel: keyof typeof VIP_LEVELS, teamLevel: number): number {
  const rates = VIP_LEVELS[vipLevel].commissionRates;
  const index = teamLevel - 1; // teamLevel 1 = index 0
  return rates[index] || 0;
}

export function getDailyWagerReward(vipLevel: keyof typeof VIP_LEVELS): number {
  return VIP_LEVELS[vipLevel].dailyWagerReward;
}

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type AdminAction = typeof adminActions.$inferSelect;
export type InsertGameAnalytics = z.infer<typeof insertGameAnalyticsSchema>;
export type GameAnalytics = typeof gameAnalytics.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertSupportChatSession = z.infer<typeof insertSupportChatSessionSchema>;
export type SupportChatSession = typeof supportChatSessions.$inferSelect;
export type InsertSupportChatMessage = z.infer<typeof insertSupportChatMessageSchema>;
export type SupportChatMessage = typeof supportChatMessages.$inferSelect;
export type InsertQuickReply = z.infer<typeof insertQuickReplySchema>;
export type UpdateQuickReply = z.infer<typeof updateQuickReplySchema>;
export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertTelegramLoginSession = z.infer<typeof insertTelegramLoginSessionSchema>;
export type TelegramLoginSession = typeof telegramLoginSessions.$inferSelect;
export type Setup2FA = z.infer<typeof setup2FASchema>;
export type Verify2FA = z.infer<typeof verify2FASchema>;
export type Validate2FA = z.infer<typeof validate2FASchema>;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type CreateWithdrawalRequest = z.infer<typeof createWithdrawalRequestSchema>;
export type ProcessWithdrawalRequest = z.infer<typeof processWithdrawalRequestSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type UpdateSystemSetting = z.infer<typeof updateSystemSettingSchema>;
export type InsertWhitelistedIp = z.infer<typeof insertWhitelistedIpSchema>;
export type UpdateWhitelistedIp = z.infer<typeof updateWhitelistedIpSchema>;
export type WhitelistedIp = typeof whitelistedIps.$inferSelect;
export type InsertTelegramAutoJoinChannel = z.infer<typeof insertTelegramAutoJoinChannelSchema>;
export type UpdateTelegramAutoJoinChannel = z.infer<typeof updateTelegramAutoJoinChannelSchema>;
export type TelegramAutoJoinChannel = typeof telegramAutoJoinChannels.$inferSelect;
export type InsertDatabaseConnection = z.infer<typeof insertDatabaseConnectionSchema>;
export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;
export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentActivity = z.infer<typeof insertAgentActivitySchema>;
export type AgentActivity = typeof agentActivities.$inferSelect;
export type InsertDeviceLogin = z.infer<typeof insertDeviceLoginSchema>;
export type DeviceLogin = typeof deviceLogins.$inferSelect;
export type CreateAgent = z.infer<typeof createAgentSchema>;
export type AgentDeposit = z.infer<typeof agentDepositSchema>;
export type AgentWithdrawal = z.infer<typeof agentWithdrawalSchema>;
export type UpdateCommission = z.infer<typeof updateCommissionSchema>;
export type StartPasskeyRegistration = z.infer<typeof startPasskeyRegistrationSchema>;
export type FinishPasskeyRegistration = z.infer<typeof finishPasskeyRegistrationSchema>;
export type StartPasskeyAuthentication = z.infer<typeof startPasskeyAuthenticationSchema>;
export type FinishPasskeyAuthentication = z.infer<typeof finishPasskeyAuthenticationSchema>;
export type UpdatePasskey = z.infer<typeof updatePasskeySchema>;
export type InsertPasskey = z.infer<typeof insertPasskeySchema>;
export type Passkey = typeof passkeys.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SendNotification = z.infer<typeof sendNotificationSchema>;
export type MarkNotificationRead = z.infer<typeof markNotificationReadSchema>;
export type Notification = typeof notifications.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type InsertVipSetting = z.infer<typeof insertVipSettingSchema>;
export type UpdateVipSetting = z.infer<typeof updateVipSettingSchema>;
export type VipSetting = typeof vipSettings.$inferSelect;
export type InsertGoldenLiveStats = z.infer<typeof insertGoldenLiveStatsSchema>;
export type GoldenLiveStats = typeof goldenLiveStats.$inferSelect;
export type InsertGoldenLiveEvent = z.infer<typeof insertGoldenLiveEventSchema>;
export type GoldenLiveEvent = typeof goldenLiveEvents.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type CreatePromoCode = z.infer<typeof createPromoCodeSchema>;
export type RedeemPromoCode = z.infer<typeof redeemPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCodeRedemption = z.infer<typeof insertPromoCodeRedemptionSchema>;
export type PromoCodeRedemption = typeof promoCodeRedemptions.$inferSelect;
export type InsertVipLevelTelegramLink = z.infer<typeof insertVipLevelTelegramLinkSchema>;
export type UpsertVipLevelTelegramLink = z.infer<typeof upsertVipLevelTelegramLinkSchema>;
export type VipLevelTelegramLink = typeof vipLevelTelegramLinks.$inferSelect;