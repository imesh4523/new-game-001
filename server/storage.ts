import { 
  type User, 
  type InsertUser, 
  type LoginUser,
  type Game, 
  type InsertGame, 
  type Bet, 
  type InsertBet,
  type Transaction,
  type InsertTransaction,
  type Referral,
  type InsertReferral,
  type AdminAction,
  type InsertAdminAction,
  type GameAnalytics,
  type InsertGameAnalytics,
  type UserSession,
  type InsertUserSession,
  type DeviceLogin,
  type InsertDeviceLogin,
  type PageView,
  type InsertPageView,
  type SystemSetting,
  type InsertSystemSetting,
  type UpdateSystemSetting,
  type TelegramAutoJoinChannel,
  type InsertTelegramAutoJoinChannel,
  type UpdateTelegramAutoJoinChannel,
  type DatabaseConnection,
  type InsertDatabaseConnection,
  type AgentProfile,
  type InsertAgentProfile,
  type AgentActivity,
  type InsertAgentActivity,
  type Passkey,
  type InsertPasskey,
  type GoldenLiveStats,
  type InsertGoldenLiveStats,
  type GoldenLiveEvent,
  type InsertGoldenLiveEvent,
  type VipSetting,
  type InsertVipSetting,
  type UpdateVipSetting,
  type Notification,
  type InsertNotification,
  type PushSubscription,
  type InsertPushSubscription,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
  type PromoCode,
  type InsertPromoCode,
  type PromoCodeRedemption,
  type InsertPromoCodeRedemption,
  type VipLevelTelegramLink,
  type InsertVipLevelTelegramLink,
  type PredictedResult,
  type InsertPredictedResult,
  type CoinFlipGame,
  type InsertCoinFlipGame,
  type SupportChatSession,
  type InsertSupportChatSession,
  type SupportChatMessage,
  type InsertSupportChatMessage,
  type QuickReply,
  type InsertQuickReply,
  type TelegramLoginSession,
  type InsertTelegramLoginSession,
  type TelegramReactionSetting,
  type InsertTelegramReactionSetting,
  type UpdateTelegramReactionSetting,
  type TelegramGroup,
  type InsertTelegramGroup,
  type UpdateTelegramGroup,
  type TelegramSignal,
  type InsertTelegramSignal,
  type UpdateTelegramSignal,
  type TelegramReactionOrder,
  type InsertTelegramReactionOrder,
  type BettingTask,
  type InsertBettingTask,
  type UpdateBettingTask,
  type UserBettingTaskProgress,
  type InsertUserBettingTaskProgress,
  type DepositRequest,
  type InsertDepositRequest,
  type WhitelistedIp,
  type InsertWhitelistedIp,
  type UpdateWhitelistedIp,
  type TelegramScheduledPost,
  type InsertTelegramScheduledPost,
  users,
  games,
  bets,
  transactions,
  depositRequests,
  referrals,
  adminActions,
  gameAnalytics,
  userSessions,
  supportChatSessions,
  supportChatMessages,
  quickReplies,
  deviceLogins,
  pageViews,
  passwordResetTokens,
  telegramLoginSessions,
  systemSettings,
  telegramAutoJoinChannels,
  databaseConnections,
  agentProfiles,
  agentActivities,
  passkeys,
  goldenLiveStats,
  goldenLiveEvents,
  vipSettings,
  notifications,
  pushSubscriptions,
  coinFlipGames,
  withdrawalRequests,
  promoCodes,
  promoCodeRedemptions,
  vipLevelTelegramLinks,
  predictedResults,
  telegramReactionSettings,
  telegramGroups,
  telegramSignals,
  telegramReactionOrders,
  n1PanelReactionOrders,
  bettingTasks,
  userBettingTaskProgress,
  whitelistedIps,
  telegramScheduledPosts,
  crashSettings,
  type CrashSetting,
  type InsertCrashSetting,
  advancedCrashSettings,
  type AdvancedCrashSetting,
  type InsertAdvancedCrashSetting
} from "@shared/schema";
import { VipService } from "./vip-service";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import { db } from "./db";
import { eq, desc, asc, count, sum, sql, and, not, like, inArray, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NeonHttpQueryResultHKT } from 'drizzle-orm/neon-http';
import { realtimeSyncService } from "./realtime-sync-service";

// In-memory storage for pending 2FA setups (use Redis in production)
const pending2FASetups = new Map<string, { secret: string, expiresAt: Date }>();

// Builder functions for schema-compliant default objects
function buildUserInsert(overrides: Partial<typeof users.$inferInsert>): typeof users.$inferInsert {
  return {
    email: overrides.email || "",
    passwordHash: overrides.passwordHash || "",
    referralLevel: overrides.referralLevel ?? 1,
    totalBetsAmount: overrides.totalBetsAmount ?? "0.00000000",
    dailyWagerAmount: overrides.dailyWagerAmount ?? "0.00000000",
    lastWagerResetDate: overrides.lastWagerResetDate ?? new Date(),
    teamSize: overrides.teamSize ?? 0,
    ...overrides,
  };
}

function buildReferralInsert(overrides: Partial<typeof referrals.$inferInsert>): typeof referrals.$inferInsert {
  return {
    referrerId: overrides.referrerId || "",
    referredId: overrides.referredId || "",
    referralLevel: overrides.referralLevel ?? 1,
    hasDeposited: overrides.hasDeposited ?? false,
    ...overrides,
  };
}

export interface IStorage {
  // User authentication methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser, registrationIp?: string, registrationCountry?: string): Promise<User>;
  validateUser(credentials: LoginUser): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserBalance(userId: string, newBalance: string): Promise<User | undefined>;
  atomicDeductBalance(userId: string, amount: string, options?: { incrementTotalBets?: boolean; incrementDailyWager?: boolean }): Promise<{ success: boolean; user?: User; error?: string }>;
  atomicIncrementBalance(userId: string, amount: string): Promise<{ success: boolean; user?: User; error?: string }>;
  generateReferralCode(userId: string): Promise<string>;
  getUsersByRegistrationIp(ipAddress: string): Promise<User[]>;
  
  // Telegram link token methods
  createTelegramLinkToken(userId: string, expiryMinutes?: number): Promise<{ token: string; expiresAt: Date }>;
  getUserByLinkToken(token: string): Promise<User | undefined>;
  linkTelegramAccount(userId: string, telegramData: { id: string; username?: string; first_name?: string; photo_url?: string }): Promise<User | undefined>;
  clearTelegramLinkToken(userId: string): Promise<User | undefined>;
  
  // Telegram login session methods
  createTelegramLoginSession(token: string, expiryMinutes?: number): Promise<void>;
  getTelegramLoginSession(token: string): Promise<{ userId?: string; expiresAt: Date } | undefined>;
  completeTelegramLogin(token: string, userId: string): Promise<void>;
  deleteTelegramLoginSession(token: string): Promise<void>;
  
  // Telegram auto-join channels methods
  createTelegramAutoJoinChannel(channel: InsertTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel>;
  getTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]>;
  getEnabledTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]>;
  getTelegramAutoJoinChannel(id: string): Promise<TelegramAutoJoinChannel | undefined>;
  updateTelegramAutoJoinChannel(id: string, updates: UpdateTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel | undefined>;
  deleteTelegramAutoJoinChannel(id: string): Promise<boolean>;
  
  // User session methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: string): Promise<UserSession[]>;
  updateSessionStatus(sessionId: string, isActive: boolean): Promise<UserSession | undefined>;
  
  // Device login tracking methods
  createDeviceLogin(deviceLogin: InsertDeviceLogin): Promise<DeviceLogin>;
  getUserDeviceLogins(userId: string, limit?: number): Promise<DeviceLogin[]>;
  clearUserSessions(userId: string): Promise<number>;
  clearDeviceLogins(userId: string): Promise<number>;
  
  // Page view tracking methods
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getDailyVisitors(date?: Date): Promise<{ uniqueVisitors: number; totalPageViews: number }>;
  getTrafficStats(startDate: Date, endDate: Date): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    topPages: Array<{ path: string; views: number }>;
    deviceBreakdown: Array<{ deviceType: string; count: number }>;
    countryBreakdown: Array<{ country: string; count: number }>;
    dailyStats: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
  }>;
  
  // 2FA methods
  startPending2FASetup(userId: string, secret: string): Promise<boolean>;
  getPending2FASecret(userId: string): Promise<string | null>;
  completePending2FASetup(userId: string): Promise<User | undefined>;
  clearPending2FASetup(userId: string): Promise<void>;
  enable2FA(userId: string, secret: string): Promise<User | undefined>;
  disable2FA(userId: string): Promise<User | undefined>;
  validate2FAToken(userId: string, token: string): Promise<boolean>;
  
  // Passkey methods
  createPasskey(passkey: InsertPasskey): Promise<Passkey>;
  getUserPasskeys(userId: string): Promise<Passkey[]>;
  getAllActivePasskeys(): Promise<Passkey[]>;
  getPasskeyByCredentialId(credentialId: string): Promise<Passkey | undefined>;
  updatePasskey(passkeyId: string, updates: Partial<Passkey>): Promise<Passkey | undefined>;
  deletePasskey(passkeyId: string): Promise<boolean>;
  updatePasskeyCounter(credentialId: string, counter: number): Promise<Passkey | undefined>;
  
  // Password reset methods
  createPasswordResetToken(email: string): Promise<string>;
  validatePasswordResetToken(token: string): Promise<string | null>;
  updatePassword(email: string, newPassword: string): Promise<boolean>;
  markPasswordResetTokenUsed(token: string): Promise<void>;

  // Admin methods
  getAllUsers(page?: number, limit?: number): Promise<{ users: User[]; total: number }>;
  toggleUserStatus(userId: string): Promise<User | undefined>;
  adjustUserBalance(userId: string, amount: string, adminId: string): Promise<User | undefined>;
  adjustAgentBalance(agentId: string, amount: string, adminId: string): Promise<AgentProfile | undefined>;
  banUser(userId: string, reason: string, bannedUntil?: Date): Promise<User | undefined>;
  unbanUser(userId: string): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  clearDemoData(): Promise<void>;

  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getActiveGame(roundDuration: number): Promise<Game | undefined>;
  updateGameResult(gameId: string, result: number, resultColor: string, resultSize: string): Promise<Game | undefined>;
  setManualGameResult(gameId: string, result: number, adminId: string): Promise<Game | undefined>;
  getGameHistory(limit?: number): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  getGameByGameId(gameId: string): Promise<Game | undefined>;
  updateGameStats(gameId: string, stats: Partial<Game>): Promise<Game | undefined>;

  // Bet methods
  createBet(bet: InsertBet & { potential: string }, maxBetLimit?: number): Promise<Bet>;
  createBetAndUpdateBalance(bet: InsertBet & { potential: string }, newBalance: string, maxBetLimit?: number, newAccumulatedFee?: string): Promise<Bet>;
  getBetsByUser(userId: string): Promise<Bet[]>;
  getBetsByGame(gameId: string): Promise<Bet[]>;
  getUserTotalBetAmountForGame(userId: string, gameId: string): Promise<number>;
  updateBetStatus(betId: string, status: "pending" | "won" | "lost" | "cashed_out" | "cancelled", actualPayout?: string): Promise<Bet | undefined>;
  getActiveBetsByUser(userId: string): Promise<Bet[]>;
  getAllPendingBets(): Promise<Bet[]>;
  
  // Crash game specific bet methods
  updateBetForCashout(betId: string, cashOutMultiplier: string, cashedOutAt: Date): Promise<Bet | undefined>;
  updateBetIfPending(betId: string, newStatus: "won" | "lost" | "cashed_out", additionalUpdates?: Partial<Bet>): Promise<boolean>;
  getUserActiveCrashBet(userId: string, gameId: string): Promise<Bet | undefined>;
  cleanupUserBetHistory(userId: string): Promise<void>;

  // Referral methods
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  updateReferralCommission(referralId: string, commission: string): Promise<Referral | undefined>;
  updateReferralHasDeposited(referralId: string, hasDeposited: boolean): Promise<Referral | undefined>;
  getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: string }>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionById(transactionId: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  getTransactionByExternalId(externalId: string): Promise<Transaction | undefined>;
  updateTransactionStatus(transactionId: string, status: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined>;
  updateTransactionStatusConditional(transactionId: string, newStatus: "pending" | "completed" | "failed" | "cancelled", currentStatus: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined>;
  getPendingTransactions(): Promise<Transaction[]>;
  
  // Deposit request methods
  createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest>;
  getDepositRequestById(requestId: string): Promise<DepositRequest | undefined>;
  getDepositRequestsByUser(userId: string): Promise<DepositRequest[]>;
  getDepositRequestsByAgent(agentId: string, status?: "pending" | "approved" | "rejected" | "completed"): Promise<DepositRequest[]>;
  updateDepositRequestStatus(requestId: string, status: "pending" | "approved" | "rejected" | "completed", updates?: Partial<DepositRequest>): Promise<DepositRequest | undefined>;
  atomicApproveDepositRequest(requestId: string, agentId: string, agentNote?: string): Promise<{ success: boolean; request?: DepositRequest; transaction?: Transaction; user?: User; referrerData?: { referrer?: User; oldTeamSize?: number; newTeamSize?: number; oldVipLevel?: string; newVipLevel?: string }; error?: string }>;
  
  // Coin flip game methods
  createCoinFlipGame(game: InsertCoinFlipGame): Promise<CoinFlipGame>;
  getCoinFlipGamesByUser(userId: string, limit?: number): Promise<CoinFlipGame[]>;
  
  // Data staleness monitoring methods
  getUsersWithRecentActivity(minutesAgo: number): Promise<User[]>;
  getRecentDeposits(minutesAgo: number): Promise<Transaction[]>;
  getRecentWithdrawals(minutesAgo: number): Promise<Transaction[]>;
  getRecentTransactions(minutesAgo: number): Promise<Transaction[]>;

  // Admin action methods
  logAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(page?: number, limit?: number): Promise<{ actions: AdminAction[]; total: number }>;

  // Analytics methods
  createGameAnalytics(analytics: InsertGameAnalytics): Promise<GameAnalytics>;
  updateGameAnalytics(gameId: string, updates: Partial<GameAnalytics>): Promise<GameAnalytics | undefined>;
  getAnalyticsByGame(gameId: string): Promise<GameAnalytics | undefined>;
  getOverallAnalytics(): Promise<{
    totalGames: number;
    totalBets: number;
    totalVolume: string;
    totalProfit: string;
    averageBetSize: string;
  }>;

  // System settings methods
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  upsertSystemSetting(setting: UpdateSystemSetting, adminId: string): Promise<SystemSetting>;
  deleteSystemSetting(key: string, adminId: string): Promise<boolean>;

  // VIP level methods
  updateUserVipLevel(userId: string): Promise<User | undefined>;

  // Agent management methods
  createAgent(email: string, password: string, commissionRate?: string): Promise<{ user: User; agentProfile: AgentProfile }>;
  getAgentProfile(userId: string): Promise<AgentProfile | undefined>;
  getAllAgents(page?: number, limit?: number): Promise<{ agents: Array<User & { agentProfile: AgentProfile }>; total: number }>;
  updateAgentCommission(agentId: string, commissionRate: string): Promise<AgentProfile | undefined>;
  toggleAgentStatus(agentId: string): Promise<AgentProfile | undefined>;
  promoteUserToAgent(userId: string, commissionRate?: string): Promise<{ user: User; agentProfile: AgentProfile }>;
  
  // Agent operations
  getUserByPublicIdOrEmail(identifier: string): Promise<User | undefined>;
  processAgentDeposit(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }>;
  processAgentWithdrawal(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }>;
  
  // Agent activity tracking
  createAgentActivity(activity: InsertAgentActivity): Promise<AgentActivity>;
  getAgentActivities(agentId: string, page?: number, limit?: number): Promise<{ activities: any[]; total: number }>;
  getAgentEarnings(agentId: string): Promise<{ totalEarnings: string; commissionRate: string; totalDeposits: string }>;
  updateAgentBalance(agentId: string, amount: string): Promise<AgentProfile | undefined>;

  // Golden Live methods
  getGoldenLiveStats(): Promise<GoldenLiveStats | undefined>;
  updateGoldenLiveStats(stats: Partial<GoldenLiveStats>): Promise<GoldenLiveStats | undefined>;
  createGoldenLiveEvent(event: InsertGoldenLiveEvent): Promise<GoldenLiveEvent>;
  getGoldenLiveEvents(limit?: number): Promise<GoldenLiveEvent[]>;
  incrementTotalPlayersBy28(): Promise<GoldenLiveStats | undefined>;
  updateActivePlayersCount(count: number): Promise<GoldenLiveStats | undefined>;

  // User geography methods
  getUserCountsByCountry(): Promise<Array<{ countryCode: string; count: number }>>;

  // VIP settings methods
  getAllVipSettings(): Promise<VipSetting[]>;
  getVipSettingById(id: string): Promise<VipSetting | undefined>;
  getVipSettingByLevelKey(levelKey: string): Promise<VipSetting | undefined>;
  createVipSetting(setting: InsertVipSetting): Promise<VipSetting>;
  updateVipSetting(id: string, updates: Partial<VipSetting>): Promise<VipSetting | undefined>;
  deleteVipSetting(id: string): Promise<boolean>;

  // Crash Settings methods
  getCrashSettings(): Promise<CrashSetting | undefined>;
  updateCrashSettings(updates: any): Promise<CrashSetting | undefined>;
  getAdvancedCrashSettings(): Promise<AdvancedCrashSetting | undefined>;
  updateAdvancedCrashSettings(updates: any): Promise<AdvancedCrashSetting | undefined>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(notificationId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
  
  // Push subscription methods
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  getAllActivePushSubscriptions(): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<boolean>;
  deletePushSubscriptionsByUser(userId: string): Promise<boolean>;

  // Withdrawal request methods
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getWithdrawalRequestsByUser(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(page?: number, limit?: number, status?: string): Promise<{ requests: WithdrawalRequest[]; total: number }>;
  updateWithdrawalRequestStatus(requestId: string, status: string, processedBy?: string, adminNote?: string): Promise<WithdrawalRequest | undefined>;
  getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | undefined>;
  getCompletedWithdrawalCount(userId: string): Promise<number>;

  // Promo code methods
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(page?: number, limit?: number): Promise<{ codes: PromoCode[]; total: number }>;
  validatePromoCode(code: string, userId: string): Promise<{ valid: boolean; reason?: string; promoCode?: PromoCode }>;
  redeemPromoCode(code: string, userId: string): Promise<{ success: boolean; amountAwarded?: string; vipLevelUpgraded?: boolean; newVipLevel?: string; reason?: string }>;
  getUserPromoCodeRedemptions(userId: string): Promise<PromoCodeRedemption[]>;
  updatePromoCodeStatus(promoCodeId: string, isActive: boolean): Promise<PromoCode | undefined>;
  deletePromoCode(promoCodeId: string): Promise<boolean>;

  // VIP Level Telegram Links methods
  getAllVipLevelTelegramLinks(): Promise<VipLevelTelegramLink[]>;
  getVipLevelTelegramLink(vipLevel: string): Promise<VipLevelTelegramLink | undefined>;
  upsertVipLevelTelegramLink(link: InsertVipLevelTelegramLink): Promise<VipLevelTelegramLink>;
  deleteVipLevelTelegramLink(id: string): Promise<boolean>;

  // Database connection methods
  createDatabaseConnection(connection: InsertDatabaseConnection): Promise<DatabaseConnection>;
  getAllDatabaseConnections(page?: number, limit?: number): Promise<{ connections: DatabaseConnection[]; total: number }>;
  getDatabaseConnectionById(id: string): Promise<DatabaseConnection | undefined>;
  updateDatabaseConnection(id: string, updates: Partial<DatabaseConnection>): Promise<DatabaseConnection | undefined>;
  deleteDatabaseConnection(id: string): Promise<boolean>;
  getActiveDatabaseConnection(): Promise<DatabaseConnection | undefined>;
  setActiveDatabaseConnection(id: string): Promise<DatabaseConnection | undefined>;
  setPrimaryDatabaseConnection(id: string): Promise<DatabaseConnection | undefined>;

  // Predicted results methods
  getPredictedResults(adminId: string): Promise<PredictedResult[]>;
  savePredictedResult(prediction: InsertPredictedResult): Promise<PredictedResult>;
  deletePredictedResult(id: string, adminId: string): Promise<boolean>;
  
  // Support chat session methods
  createSupportChatSession(payload: InsertSupportChatSession): Promise<SupportChatSession>;
  getSupportChatSessionByToken(token: string): Promise<SupportChatSession | undefined>;
  getSupportChatSession(id: string): Promise<SupportChatSession | undefined>;
  updateSupportChatSession(id: string, updates: Partial<SupportChatSession>): Promise<SupportChatSession | undefined>;
  listOpenSupportSessions(limit?: number): Promise<SupportChatSession[]>;
  
  // Support chat message methods
  createSupportChatMessage(message: InsertSupportChatMessage): Promise<SupportChatMessage>;
  getSupportChatMessages(sessionId: string, after?: Date): Promise<SupportChatMessage[]>;
  markMessagesDelivered(sessionId: string, deliveredAt?: Date): Promise<number>;
  deleteSupportChatMessages(sessionId: string): Promise<number>;
  
  // Quick reply methods
  createQuickReply(payload: { shortcut: string; message: string; createdBy: string }): Promise<QuickReply>;
  getQuickReplies(): Promise<QuickReply[]>;
  getQuickReplyById(id: string): Promise<QuickReply | undefined>;
  updateQuickReply(id: string, updates: { shortcut?: string; message?: string }): Promise<QuickReply | undefined>;
  deleteQuickReply(id: string): Promise<boolean>;

  // Telegram Reactions (N1Panel) methods
  getTelegramReactionSettings(): Promise<TelegramReactionSetting | undefined>;
  createOrUpdateTelegramReactionSettings(settings: UpdateTelegramReactionSetting): Promise<TelegramReactionSetting>;
  
  getAllTelegramGroups(): Promise<TelegramGroup[]>;
  getTelegramGroupById(id: string): Promise<TelegramGroup | undefined>;
  createTelegramGroup(group: InsertTelegramGroup): Promise<TelegramGroup>;
  updateTelegramGroup(id: string, updates: UpdateTelegramGroup): Promise<TelegramGroup | undefined>;
  deleteTelegramGroup(id: string): Promise<boolean>;
  
  // Telegram signals methods
  createTelegramSignal(signal: InsertTelegramSignal): Promise<TelegramSignal>;
  getTelegramSignalById(id: string): Promise<TelegramSignal | undefined>;
  getTelegramSignalByGameId(gameId: string): Promise<TelegramSignal | undefined>;
  getTelegramSignalByMessageId(messageId: number): Promise<TelegramSignal | undefined>;
  getAllTelegramSignals(limit?: number): Promise<TelegramSignal[]>;
  getPendingTelegramSignals(): Promise<TelegramSignal[]>;
  updateTelegramSignal(id: string, updates: UpdateTelegramSignal): Promise<TelegramSignal | undefined>;
  deleteTelegramSignal(id: string): Promise<boolean>;
  getLatestTelegramSignalsByDuration(duration: number, limit?: number): Promise<TelegramSignal[]>;
  
  getAllTelegramReactionOrders(groupId?: string, limit?: number): Promise<TelegramReactionOrder[]>;
  getTelegramReactionOrderById(id: string): Promise<TelegramReactionOrder | undefined>;
  createTelegramReactionOrder(order: InsertTelegramReactionOrder): Promise<TelegramReactionOrder>;
  updateTelegramReactionOrder(id: string, updates: Partial<TelegramReactionOrder>): Promise<TelegramReactionOrder | undefined>;
  
  // N1Panel auto-reaction order tracking
  createN1PanelOrder(order: {
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    n1PanelOrderId: number | null;
    status: string;
    errorMessage: string | null;
  }): Promise<void>;
  updateN1PanelOrderStatus(orderId: number, updates: {
    status?: string;
    charge?: string;
    startCount?: string;
    remains?: string;
  }): Promise<void>;
  getPendingN1PanelOrders(): Promise<Array<{
    id: string;
    n1PanelOrderId: number | null;
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    status: string;
  }>>;
  getAllN1PanelOrders(limit?: number): Promise<Array<{
    id: string;
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    n1PanelOrderId: number | null;
    status: string;
    charge: string | null;
    startCount: string | null;
    remains: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>>;

  // Betting tasks methods
  getAllBettingTasks(): Promise<BettingTask[]>;
  getActiveBettingTasks(): Promise<BettingTask[]>;
  getBettingTaskById(id: string): Promise<BettingTask | undefined>;
  createBettingTask(task: InsertBettingTask): Promise<BettingTask>;
  updateBettingTask(id: string, updates: UpdateBettingTask): Promise<BettingTask | undefined>;
  deleteBettingTask(id: string): Promise<boolean>;
  
  // User betting task progress methods
  getUserTaskProgress(userId: string): Promise<Array<UserBettingTaskProgress & { task: BettingTask }>>;
  getUserTaskProgressByTask(userId: string, taskId: string): Promise<UserBettingTaskProgress | undefined>;
  updateUserTaskProgress(userId: string, taskId: string, betAmount: string): Promise<UserBettingTaskProgress>;
  claimTaskReward(userId: string, taskId: string): Promise<{ success: boolean; reward?: string; error?: string }>;

  // Whitelisted IP methods
  getAllWhitelistedIps(): Promise<WhitelistedIp[]>;
  getWhitelistedIpByAddress(ipAddress: string): Promise<WhitelistedIp | undefined>;
  addWhitelistedIp(data: InsertWhitelistedIp): Promise<WhitelistedIp>;
  updateWhitelistedIp(id: string, updates: Partial<UpdateWhitelistedIp>): Promise<WhitelistedIp | undefined>;
  deleteWhitelistedIp(id: string): Promise<boolean>;
  updateWhitelistedIpAccountCount(ipAddress: string, newCount: number): Promise<void>;

  // Telegram Scheduled Posts methods
  createTelegramScheduledPost(post: InsertTelegramScheduledPost): Promise<TelegramScheduledPost>;
  getTelegramScheduledPosts(): Promise<TelegramScheduledPost[]>;
  getTelegramScheduledPostById(id: string): Promise<TelegramScheduledPost | undefined>;
  updateTelegramScheduledPost(id: string, updates: Partial<TelegramScheduledPost>): Promise<TelegramScheduledPost | undefined>;
  deleteTelegramScheduledPost(id: string): Promise<boolean>;
  getActiveTelegramScheduledPosts(): Promise<TelegramScheduledPost[]>;
  updateScheduledPostSentStatus(id: string, sentAt: Date, repeatDaily: boolean): Promise<TelegramScheduledPost | undefined>;
}

export class DatabaseStorage implements IStorage {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Reference to javascript_database integration
    // Initialize default data asynchronously and handle errors
    this.initializeDefaultData().catch(error => {
      console.error('Error initializing default data:', error);
    });
    
    // Start periodic cleanup of expired Telegram login sessions (every 10 minutes)
    this.cleanupInterval = setInterval(() => {
      this.purgeExpiredTelegramSessions().catch(error => {
        console.error('Failed to purge expired Telegram sessions:', error);
      });
    }, 10 * 60 * 1000);
    
    // Run initial cleanup
    this.purgeExpiredTelegramSessions().catch(console.error);
  }

  private async purgeExpiredTelegramSessions(): Promise<void> {
    try {
      const result = await db.delete(telegramLoginSessions)
        .where(sql`${telegramLoginSessions.expiresAt} < NOW()`);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired Telegram login session(s)`);
      }
    } catch (error) {
      console.error('Error purging expired Telegram sessions:', error);
      throw error;
    }
  }

  private async initializeDefaultData() {
    // DEVELOPMENT ONLY: Create a temporary admin user for development
    // THIS SHOULD NEVER RUN IN PRODUCTION
    try {
      if (process.env.NODE_ENV === 'development') {
        const existingAdmin = await this.getUserByEmail('pursuer.ail-4d@icloud.com');
        if (!existingAdmin) {
          const passwordHash = await bcrypt.hash('admin1234', 10);
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          
          // Insert admin user directly with database - DEVELOPMENT ONLY
          const [adminUser] = await db
            .insert(users)
            .values({
              email: 'pursuer.ail-4d@icloud.com',
              publicId: '10000000000',
              passwordHash,
              balance: "10000.00000000",
              role: "admin",
              vipLevel: "vip5",
              isActive: true,
              referralCode,
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
            .returning();

          console.log('⚠️  DEVELOPMENT ONLY: Admin user created with username: admin, password: admin1234');
          console.log('⚠️  SECURITY WARNING: This should NEVER run in production!');
        }
      }

      // Create some demo users for testing
      const demoEmails = ['player1@demo.com', 'player2@demo.com', 'player3@demo.com'];
      for (const email of demoEmails) {
        const existingUser = await this.getUserByEmail(email);
        if (!existingUser) {
          const passwordHash = await bcrypt.hash('demo123', 10);
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          // Generate unique publicId (random 11-digit number like 02826262818)
          const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
          
          await db
            .insert(users)
            .values({
              email,
              publicId,
              passwordHash,
              balance: "100000.00000000",
              role: "user",
              vipLevel: "vip",
              isActive: true,
              referralCode,
              totalDeposits: "500.00000000",
              totalWithdrawals: "0.00000000",
              totalWinnings: "200.00000000",
              totalLosses: "100.00000000",
              maxBetLimit: "500.00000000",
              lastWithdrawalRequestAt: null,
              minDepositAmount: null,
              maxDepositAmount: null,
              isAcceptingDeposits: false
            });
        } else if (!existingUser.publicId) {
          // Update existing demo users that don't have publicId
          const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
          await db
            .update(users)
            .set({ publicId, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
        }
      }
      // Initialize default system settings
      const defaultSettings = [
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

      for (const setting of defaultSettings) {
        const existingSetting = await db.select().from(systemSettings).where(eq(systemSettings.key, setting.key)).limit(1);
        if (existingSetting.length === 0) {
          await db.insert(systemSettings).values({
            key: setting.key,
            value: setting.value,
            description: setting.description,
            isEncrypted: setting.isEncrypted,
            lastUpdatedBy: 'system'
          });
          console.log(`✅ Default system setting created: ${setting.key} = ${setting.value}`);
        }
      }

      // Initialize default crash settings
      const [existingCrashSettings] = await db.select().from(crashSettings).limit(1);
      if (!existingCrashSettings) {
        await db.insert(crashSettings).values({
          houseEdge: "20.00",
          maxMultiplier: "50.00",
          minCrashMultiplier: "1.01",
          crashEnabled: true,
          updatedBy: 'system',
        } as any);
        console.log('✅ Default crash settings initialized');
      }

      // Initialize default advanced crash settings
      const [existingAdvancedCrashSettings] = await db.select().from(advancedCrashSettings).limit(1);
      if (!existingAdvancedCrashSettings) {
        await db.insert(advancedCrashSettings).values({
          deepThinkingEnabled: false,
          noBetBaitMinMultiplier: "7.00",
          noBetBaitMaxMultiplier: "20.00",
          whaleTargetMinMultiplier: "1.01",
          whaleTargetMaxMultiplier: "1.04",
          standardLossMaxThreshold: "2.00",
          playerWinProbability: "40.00",
          updatedBy: 'system',
        } as any);
        console.log('✅ Default advanced crash settings initialized');
      }      // Initialize VIP settings
      const vipLevels = [
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

      for (const level of vipLevels) {
        const existingVipSetting = await db.select().from(vipSettings).where(eq(vipSettings.levelKey, level.key)).limit(1);
        if (existingVipSetting.length === 0) {
          await db.insert(vipSettings).values({
            levelKey: level.key,
            levelName: level.displayName,
            levelOrder: level.order,
            teamRequirement: level.teamRequirement,
            maxBet: level.maxBetLimit.toString() + '.00000000',
            dailyWagerReward: level.dailyWagerReward.toFixed(6),
            commissionRates: JSON.stringify(level.commissionRates),
            rechargeAmount: level.depositRequirement.toString() + '.00000000',
            isActive: true
          });
          console.log(`✅ VIP setting initialized: ${level.key} - ${level.displayName}`);
        }
      }

      // Initialize VIP Telegram links
      const defaultTelegramLinks = [
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

      for (const linkData of defaultTelegramLinks) {
        const existingLink = await db.select().from(vipLevelTelegramLinks).where(eq(vipLevelTelegramLinks.vipLevel, linkData.vipLevel as any)).limit(1);
        if (existingLink.length === 0) {
          await db.insert(vipLevelTelegramLinks).values({
            vipLevel: linkData.vipLevel as any,
            telegramLink: '',
            description: linkData.description,
            isActive: true,
            updatedBy: 'system'
          });
        }
      }
      console.log('✅ Default VIP Telegram links initialized');


      
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  // User authentication methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    if (!telegramId) return undefined;
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createTelegramLinkToken(userId: string, expiryMinutes: number = 5): Promise<{ token: string; expiresAt: Date }> {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    await db.update(users)
      .set({ 
        telegramLinkToken: token, 
        telegramLinkExpiresAt: expiresAt 
      })
      .where(eq(users.id, userId));
    
    return { token, expiresAt };
  }

  async getUserByLinkToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    const [user] = await db.select().from(users)
      .where(eq(users.telegramLinkToken, token));
    
    if (!user) return undefined;
    
    if (user.telegramLinkExpiresAt && new Date(user.telegramLinkExpiresAt) < new Date()) {
      return undefined;
    }
    
    return user;
  }

  async linkTelegramAccount(userId: string, telegramData: { id: string; username?: string; first_name?: string; photo_url?: string }): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        telegramId: telegramData.id.toString(),
        telegramUsername: telegramData.username || null,
        telegramFirstName: telegramData.first_name || null,
        telegramPhotoUrl: telegramData.photo_url || null,
        telegramLinkToken: null,
        telegramLinkExpiresAt: null
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async clearTelegramLinkToken(userId: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ 
        telegramLinkToken: null, 
        telegramLinkExpiresAt: null 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  // Telegram login session methods - database-backed with safeguards
  async createTelegramLoginSession(token: string, expiryMinutes: number = 5): Promise<void> {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Delete any existing session with this token (handles retries/duplicates)
    await db.delete(telegramLoginSessions)
      .where(eq(telegramLoginSessions.token, token));
    
    // Insert new session
    await db.insert(telegramLoginSessions).values({
      token,
      expiresAt,
      userId: null
    });
  }

  async getTelegramLoginSession(token: string): Promise<{ userId?: string; expiresAt: Date } | undefined> {
    const [session] = await db.select()
      .from(telegramLoginSessions)
      .where(eq(telegramLoginSessions.token, token))
      .limit(1);
    
    if (!session) {
      return undefined;
    }
    
    // Check if expired and clean up if so
    if (session.expiresAt < new Date()) {
      await db.delete(telegramLoginSessions)
        .where(eq(telegramLoginSessions.token, token));
      return undefined;
    }
    
    return {
      userId: session.userId || undefined,
      expiresAt: session.expiresAt
    };
  }

  async completeTelegramLogin(token: string, userId: string): Promise<void> {
    // Verify session exists and is still valid before completing
    const session = await this.getTelegramLoginSession(token);
    if (!session) {
      throw new Error('Login session expired or not found');
    }
    
    // Update session with userId
    await db.update(telegramLoginSessions)
      .set({ userId })
      .where(eq(telegramLoginSessions.token, token));
  }

  async deleteTelegramLoginSession(token: string): Promise<void> {
    await db.delete(telegramLoginSessions)
      .where(eq(telegramLoginSessions.token, token));
  }
  
  // Telegram auto-join channels methods
  async createTelegramAutoJoinChannel(channel: InsertTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel> {
    const [created] = await db.insert(telegramAutoJoinChannels)
      .values(channel)
      .returning();
    return created;
  }
  
  async getTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]> {
    return await db.select()
      .from(telegramAutoJoinChannels)
      .orderBy(asc(telegramAutoJoinChannels.priority), asc(telegramAutoJoinChannels.createdAt));
  }
  
  async getEnabledTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]> {
    return await db.select()
      .from(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.isEnabled, true))
      .orderBy(asc(telegramAutoJoinChannels.priority), asc(telegramAutoJoinChannels.createdAt));
  }
  
  async getTelegramAutoJoinChannel(id: string): Promise<TelegramAutoJoinChannel | undefined> {
    const [channel] = await db.select()
      .from(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.id, id))
      .limit(1);
    return channel;
  }
  
  async updateTelegramAutoJoinChannel(id: string, updates: UpdateTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel | undefined> {
    const [updated] = await db.update(telegramAutoJoinChannels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telegramAutoJoinChannels.id, id))
      .returning();
    return updated;
  }
  
  async deleteTelegramAutoJoinChannel(id: string): Promise<boolean> {
    const result = await db.delete(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createUser(insertUser: InsertUser, registrationIp?: string, registrationCountry?: string): Promise<User> {
    const passwordHash = await bcrypt.hash(insertUser.password, 10);
    const withdrawalPasswordHash = insertUser.withdrawalPassword 
      ? await bcrypt.hash(insertUser.withdrawalPassword, 10)
      : null;
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Generate unique publicId (random 11-digit number like 02826262818)
    const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    
    // Check if referral code was provided to link with referrer
    let referrerId: string | null = null;
    if (insertUser.referralCode) {
      const referrer = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, insertUser.referralCode))
        .limit(1);
      
      if (referrer.length > 0) {
        referrerId = referrer[0].id;
      }
    }
    
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email,
        publicId,
        passwordHash,
        withdrawalPasswordHash,
        referralCode,
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
      .returning();
    
    // If user was referred, create referral record (but don't award bonus yet)
    // Bonus will be awarded when user makes their first deposit
    if (referrerId) {
      try {
        // Create referral record
        await this.createReferral({
          referrerId: referrerId,
          referredId: user.id,
          commissionRate: "0.0500", // 5% default
          status: "active"
        });
        
        // Increment referrer's total team members count
        const referrerUser = await this.getUser(referrerId);
        if (referrerUser) {
          await this.updateUser(referrerId, {
            totalTeamMembers: (referrerUser.totalTeamMembers || 0) + 1
          });
        }
        
      } catch (error) {
        console.error('Error processing referral:', error);
        // Continue with user creation even if referral fails
      }
    }
    
    return user;
  }

  async validateUser(credentials: LoginUser): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (user && await bcrypt.compare(credentials.password, user.passwordHash)) {
      return user;
    }
    return undefined;
  }

  async validateWithdrawalPassword(userId: string, withdrawalPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (user && user.withdrawalPasswordHash && await bcrypt.compare(withdrawalPassword, user.withdrawalPasswordHash)) {
      return true;
    }
    return false;
  }

  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    
    return !!user;
  }

  // Password reset token methods
  async createPasswordResetToken(email: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    await db
      .insert(passwordResetTokens)
      .values({
        email,
        token,
        expiresAt,
        used: false
      });
    
    return token;
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    
    if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < new Date()) {
      return null;
    }
    
    return tokenRecord.email;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (user && realtimeSyncService.isEnabled()) {
      await realtimeSyncService.syncUser(userId, user).catch(err => 
        console.error('[RealtimeSync] Failed to sync user update:', err.message)
      );
    }
    
    return user || undefined;
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (user && realtimeSyncService.isEnabled()) {
      await realtimeSyncService.syncUser(userId, user).catch(err => 
        console.error('[RealtimeSync] Failed to sync balance update:', err.message)
      );
    }
    
    return user || undefined;
  }

  async atomicDeductBalance(
    userId: string, 
    amount: string, 
    options?: { incrementTotalBets?: boolean; incrementDailyWager?: boolean }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const deductAmount = parseFloat(amount);
      
      // Validation
      if (isNaN(deductAmount) || deductAmount <= 0) {
        return { success: false, error: 'Invalid amount' };
      }
      
      // Ensure 8-decimal precision
      const preciseAmount = deductAmount.toFixed(8);
      
      // Build the SQL UPDATE statement with atomic balance check
      const totalBetsIncrement = options?.incrementTotalBets ? preciseAmount : '0';
      const dailyWagerIncrement = options?.incrementDailyWager ? preciseAmount : '0';
      
      const [user] = await db
        .update(users)
        .set({
          balance: sql`CAST(balance AS NUMERIC) - ${preciseAmount}`,
          totalBetsAmount: sql`COALESCE(CAST(total_bets_amount AS NUMERIC), 0) + ${totalBetsIncrement}`,
          dailyWagerAmount: sql`COALESCE(CAST(daily_wager_amount AS NUMERIC), 0) + ${dailyWagerIncrement}`,
          updatedAt: new Date()
        })
        .where(sql`${users.id} = ${userId} AND CAST(${users.balance} AS NUMERIC) >= ${preciseAmount}`)
        .returning();
      
      if (!user) {
        // Either user doesn't exist or insufficient balance
        const existingUser = await this.getUser(userId);
        if (!existingUser) {
          return { success: false, error: 'User not found' };
        }
        return { success: false, error: 'Insufficient balance' };
      }
      
      if (realtimeSyncService.isEnabled()) {
        await realtimeSyncService.syncUser(userId, user).catch(err => 
          console.error('[RealtimeSync] Failed to sync atomic balance deduction:', err.message)
        );
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('Atomic balance deduction error:', error);
      return { success: false, error: 'Database error' };
    }
  }

  async atomicIncrementBalance(
    userId: string, 
    amount: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log(`➕ [AtomicIncrement] Input amount (raw): "${amount}" (type: ${typeof amount})`);
      
      const incrementAmount = parseFloat(amount);
      console.log(`➕ [AtomicIncrement] Parsed to float: ${incrementAmount}`);
      
      // Validation
      if (isNaN(incrementAmount) || incrementAmount <= 0) {
        console.log(`❌ [AtomicIncrement] Validation failed: isNaN=${isNaN(incrementAmount)}, amount=${incrementAmount}`);
        return { success: false, error: 'Invalid amount' };
      }
      
      // Ensure 8-decimal precision
      const preciseAmount = incrementAmount.toFixed(8);
      console.log(`➕ [AtomicIncrement] Precise amount (8 decimals): "${preciseAmount}"`);
      
      // Get current balance before update
      const currentUser = await this.getUser(userId);
      console.log(`➕ [AtomicIncrement] Current balance BEFORE: ${currentUser?.balance}`);
      
      // Atomically increment balance - use CAST AS syntax for proper SQL
      const [user] = await db
        .update(users)
        .set({
          balance: sql`balance + CAST(${preciseAmount} AS numeric)`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log(`➕ [AtomicIncrement] New balance AFTER: ${user?.balance}`);
      console.log(`➕ [AtomicIncrement] Expected: ${parseFloat(currentUser?.balance || '0') + incrementAmount}`);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      if (realtimeSyncService.isEnabled()) {
        await realtimeSyncService.syncUser(userId, user).catch(err => 
          console.error('[RealtimeSync] Failed to sync atomic balance increment:', err.message)
        );
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('Atomic balance increment error:', error);
      return { success: false, error: 'Database error' };
    }
  }

  async generateReferralCode(userId: string): Promise<string> {
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.updateUser(userId, { referralCode });
    return referralCode;
  }

  async getUsersByRegistrationIp(ipAddress: string): Promise<User[]> {
    if (!ipAddress) return [];
    
    return await db
      .select()
      .from(users)
      .where(eq(users.registrationIp, ipAddress));
  }

  // Admin methods
  async getAllUsers(page: number = 1, limit: number = 10000): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [totalResult] = await db.select({ count: count() }).from(users);
    const total = totalResult?.count || 0;
    
    const userList = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { users: userList, total };
  }

  async toggleUserStatus(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    return await this.updateUser(userId, { isActive: !user.isActive });
  }

  async banUser(userId: string, reason: string, bannedUntil?: Date): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    return await this.updateUser(userId, {
      isBanned: true,
      bannedUntil: bannedUntil || null,
      banReason: reason,
      isActive: false
    });
  }

  async unbanUser(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    return await this.updateUser(userId, {
      isBanned: false,
      bannedUntil: null,
      banReason: null,
      isActive: true
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async adjustUserBalance(userId: string, amount: string, adminId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const currentBalance = parseFloat(user.balance);
    const adjustment = parseFloat(amount);
    const newBalance = (currentBalance + adjustment).toFixed(8);
    
    // Log the admin action
    await this.logAdminAction({
      adminId,
      action: 'balance_adjustment',
      targetId: userId,
      details: { 
        previousBalance: user.balance, 
        adjustment: amount, 
        newBalance 
      }
    });
    
    return await this.updateUser(userId, { balance: newBalance });
  }

  // Game methods
  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db
      .insert(games)
      .values(game)
      .returning();
    
    return newGame;
  }

  async getActiveGame(roundDuration: number): Promise<Game | undefined> {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.status, "active"))
      .orderBy(desc(games.createdAt))
      .limit(1);
    
    return game || undefined;
  }

  async updateGameResult(gameId: string, result: number, resultColor: string, resultSize: string): Promise<Game | undefined> {
    console.log(`🔍 Updating game result for gameId: ${gameId}, result: ${result}`);
    
    const [game] = await db
      .update(games)
      .set({ 
        result, 
        resultColor, 
        resultSize, 
        status: "completed" 
      })
      .where(eq(games.gameId, gameId))
      .returning();
    
    if (game) {
      console.log(`✅ Game ${gameId} database updated successfully - status: ${game.status}, result: ${game.result}`);
      
      if (realtimeSyncService.isEnabled()) {
        await realtimeSyncService.syncGame(game).catch(err => 
          console.error('[RealtimeSync] Failed to sync game result:', err.message)
        );
      }
    } else {
      console.error(`❌ Failed to update game ${gameId} - No matching row found in database!`);
    }
    
    return game || undefined;
  }

  async setManualGameResult(gameId: string, result: number, adminId: string): Promise<Game | undefined> {
    // ONLY schedule the manual result - don't complete the game
    // The endGame() function will apply this when the timer naturally expires
    const [game] = await db
      .update(games)
      .set({ 
        manualResult: result,
        isManuallyControlled: true
        // ✅ Don't set: result, resultColor, resultSize, status
        // ✅ Let endGame() handle those when timer ends
      })
      .where(eq(games.gameId, gameId))
      .returning();
    
    if (game) {
      console.log(`🎯 Manual result ${result} scheduled for game ${gameId} - will apply when timer ends`);
      await this.logAdminAction({
        adminId,
        action: 'manual_game_result_scheduled',
        targetId: gameId,
        details: { scheduledResult: result }
      });
    }
    
    return game || undefined;
  }

  async getGameHistory(limit: number = 50): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.status, "completed"),
          not(like(games.gameId, 'crash_%'))
        )
      )
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }

  async getGameById(id: string): Promise<Game | undefined> {
    // Check if the id is a UUID (database id) or a game number (gameId)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const isUUID = id.includes('-');
    
    const [game] = await db
      .select()
      .from(games)
      .where(isUUID ? eq(games.id, id) : eq(games.gameId, id));
    
    return game || undefined;
  }

  async getGameByGameId(gameId: string): Promise<Game | undefined> {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.gameId, gameId));
    
    return game || undefined;
  }

  async updateGameStats(gameId: string, stats: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set(stats)
      .where(eq(games.gameId, gameId))
      .returning();
    
    return game || undefined;
  }

  // Bet methods
  async createBet(bet: InsertBet & { potential: string }, maxBetLimit?: number): Promise<Bet> {
    // User validation is done in the route handler, so we can skip it here for performance
    
    // Use transaction for atomic limit check and bet insertion
    return await db.transaction(async (tx: any) => {
      // If maxBetLimit is provided, check total bets for this period atomically
      if (maxBetLimit !== undefined) {
        // Use SQL aggregation for better performance (no user lock needed - transaction isolation is sufficient)
        const result = await tx
          .select({ total: sum(bets.amount) })
          .from(bets)
          .where(sql`${bets.userId} = ${bet.userId} AND ${bets.gameId} = ${bet.gameId}`);
        
        const existingTotal = result[0]?.total ? parseFloat(result[0].total as string) : 0;
        const newTotal = existingTotal + parseFloat(bet.amount);
        
        if (newTotal > maxBetLimit) {
          throw new Error(`Your reached maximum bet limit for this period`);
        }
      }
      
      const [newBet] = await tx
        .insert(bets)
        .values({
          ...bet,
          status: "pending"
        })
        .returning();
      
      if (newBet && realtimeSyncService.isEnabled()) {
        await realtimeSyncService.syncBet(newBet).catch(err => 
          console.error('[RealtimeSync] Failed to sync bet:', err.message)
        );
      }
      
      return newBet;
    });
  }

  async createBetAndUpdateBalance(bet: InsertBet & { potential: string }, newBalance: string, maxBetLimit?: number, newAccumulatedFee?: string): Promise<Bet> {
    // Combined transaction: limit check + bet creation + balance update in ONE database round trip
    return await db.transaction(async (tx: any) => {
      // If maxBetLimit is provided, check total bets for this period
      if (maxBetLimit !== undefined) {
        const result = await tx
          .select({ total: sum(bets.amount) })
          .from(bets)
          .where(sql`${bets.userId} = ${bet.userId} AND ${bets.gameId} = ${bet.gameId}`);
        
        const existingTotal = result[0]?.total ? parseFloat(result[0].total as string) : 0;
        const newTotal = existingTotal + parseFloat(bet.amount);
        
        if (newTotal > maxBetLimit) {
          throw new Error(`Your reached maximum bet limit for this period`);
        }
      }
      
      // Create bet
      const [newBet] = await tx
        .insert(bets)
        .values({
          ...bet,
          status: "pending"
        })
        .returning();
      
      // Get current user to calculate new remainingRequiredBetAmount and total_bets_amount
      const [currentUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, bet.userId));
      
      // Decrease remainingRequiredBetAmount by bet amount (clamped to 0)
      const currentRemaining = parseFloat(currentUser.remainingRequiredBetAmount || '0');
      const betAmount = parseFloat(bet.amount);
      const newRemaining = Math.max(0, currentRemaining - betAmount).toFixed(8);
      
      // Increase total_bets_amount by bet amount for withdrawal requirement tracking
      const currentTotalBets = parseFloat(currentUser.totalBetsAmount || '0');
      const newTotalBets = (currentTotalBets + betAmount).toFixed(8);
      
      // Update balance, remainingRequiredBetAmount, total_bets_amount, and accumulated fee in same transaction
      const updateData: any = { 
        balance: newBalance,
        remainingRequiredBetAmount: newRemaining,
        totalBetsAmount: newTotalBets,
        updatedAt: new Date()
      };
      
      // Only update accumulatedFee if provided
      if (newAccumulatedFee !== undefined) {
        updateData.accumulatedFee = newAccumulatedFee;
      }
      
      const [updatedUser] = await tx
        .update(users)
        .set(updateData)
        .where(eq(users.id, bet.userId))
        .returning();
      
      if (realtimeSyncService.isEnabled()) {
        await Promise.all([
          realtimeSyncService.syncBet(newBet).catch(err => 
            console.error('[RealtimeSync] Failed to sync bet:', err.message)
          ),
          realtimeSyncService.syncUser(bet.userId, updatedUser).catch(err => 
            console.error('[RealtimeSync] Failed to sync user balance:', err.message)
          )
        ]).catch(() => {}); // Ignore sync errors in transaction
      }
      
      return newBet;
    });
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return await db
      .select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt));
  }

  async getBetsByGame(gameId: string): Promise<Bet[]> {
    return await db
      .select()
      .from(bets)
      .where(eq(bets.gameId, gameId))
      .orderBy(desc(bets.createdAt));
  }

  async getUserTotalBetAmountForGame(userId: string, gameId: string): Promise<number> {
    // Use SQL aggregation for better performance
    const result = await db
      .select({ total: sum(bets.amount) })
      .from(bets)
      .where(sql`${bets.userId} = ${userId} AND ${bets.gameId} = ${gameId}`);
    
    return result[0]?.total ? parseFloat(result[0].total as string) : 0;
  }

  async updateBetStatus(betId: string, status: "pending" | "won" | "lost" | "cashed_out" | "cancelled", actualPayout?: string): Promise<Bet | undefined> {
    // ✅ IDEMPOTENT SAFETY CHECK: Only allow transitions from "pending" to final states
    // This prevents re-settlement from overwriting existing outcomes
    const existingBet = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId))
      .limit(1);
    
    if (existingBet.length > 0 && existingBet[0].status !== 'pending') {
      console.log(`⚠️  Bet ${betId} already settled as ${existingBet[0].status}, skipping update to ${status}`);
      return existingBet[0];
    }
    
    const updateData: any = { 
      status,
      updatedAt: new Date() 
    };
    if (actualPayout !== undefined) {
      updateData.actualPayout = actualPayout;
    }
    
    const [bet] = await db
      .update(bets)
      .set(updateData)
      .where(eq(bets.id, betId))
      .returning();
    
    return bet || undefined;
  }

  async getActiveBetsByUser(userId: string): Promise<any[]> {
    const results = await db
      .select({
        id: bets.id,
        userId: bets.userId,
        gameId: bets.gameId,
        periodId: games.gameId,
        betType: bets.betType,
        betValue: bets.betValue,
        amount: bets.amount,
        potential: bets.potential,
        actualPayout: bets.actualPayout,
        status: bets.status,
        cashOutMultiplier: bets.cashOutMultiplier,
        autoCashOut: bets.autoCashOut,
        cashedOutAt: bets.cashedOutAt,
        createdAt: bets.createdAt,
      })
      .from(bets)
      .leftJoin(games, eq(bets.gameId, games.id))
      .where(sql`${bets.userId} = ${userId} AND ${bets.status} = 'pending'`)
      .orderBy(desc(bets.createdAt));
    
    return results;
  }

  async getAllPendingBets(): Promise<Bet[]> {
    return await db
      .select()
      .from(bets)
      .where(eq(bets.status, 'pending'))
      .orderBy(desc(bets.createdAt));
  }

  // Referral methods
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    
    return newReferral;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async updateReferralCommission(referralId: string, commission: string): Promise<Referral | undefined> {
    const [referral] = await db
      .update(referrals)
      .set({ totalCommission: commission })
      .where(eq(referrals.id, referralId))
      .returning();
    
    return referral || undefined;
  }

  async updateReferralHasDeposited(referralId: string, hasDeposited: boolean): Promise<Referral | undefined> {
    // Atomic update: only set to true if currently false (prevents race conditions)
    const [referral] = await db
      .update(referrals)
      .set({ hasDeposited })
      .where(sql`${referrals.id} = ${referralId} AND ${referrals.hasDeposited} = false`)
      .returning();
    
    return referral || undefined;
  }

  async getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: string }> {
    const [stats] = await db
      .select({
        totalReferrals: count(),
        totalCommission: sum(referrals.totalCommission)
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    
    return {
      totalReferrals: stats?.totalReferrals || 0,
      totalCommission: stats?.totalCommission || "0.00000000"
    };
  }

  // Transaction methods
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        agentId: transaction.agentId || null
      })
      .returning();
    
    if (newTransaction && realtimeSyncService.isEnabled()) {
      await realtimeSyncService.syncTransaction(newTransaction).catch(err => 
        console.error('[RealtimeSync] Failed to sync transaction:', err.message)
      );
    }
    
    return newTransaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, externalId))
      .limit(1);
    
    return transaction || undefined;
  }

  async getTransactionById(transactionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);
    
    return transaction || undefined;
  }

  async updateTransactionStatus(transactionId: string, status: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning();
    
    // If transaction is completed and is a deposit, update user VIP level and handle referral
    if (transaction && status === "completed" && transaction.type === "deposit") {
      await this.updateUserVipLevel(transaction.userId);
      
      // Check if user was referred and if deposit meets minimum requirement ($10)
      const depositAmount = parseFloat(transaction.fiatAmount || "0");
      if (depositAmount >= 10) {
        // Find if this user was referred
        const [referral] = await db
          .select()
          .from(referrals)
          .where(eq(referrals.referredId, transaction.userId))
          .limit(1);
        
        if (referral && !referral.hasDeposited) {
          // Update referral hasDeposited flag
          await db
            .update(referrals)
            .set({ hasDeposited: true })
            .where(eq(referrals.id, referral.id));
          
          // Increment referrer's teamSize
          const referrer = await this.getUser(referral.referrerId);
          if (referrer) {
            await this.updateUser(referral.referrerId, {
              teamSize: (referrer.teamSize || 0) + 1
            });
            
            // Update referrer's VIP level based on new teamSize
            await this.updateUserVipLevel(referral.referrerId);
          }
        }
      }
    }
    
    return transaction || undefined;
  }

  async updateTransactionStatusConditional(transactionId: string, newStatus: "pending" | "completed" | "failed" | "cancelled", currentStatus: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(sql`${transactions.id} = ${transactionId} AND ${transactions.status} = ${currentStatus}`)
      .returning();
    
    return transaction || undefined;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "pending"))
      .orderBy(asc(transactions.createdAt));
  }

  // Deposit request methods
  async createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest> {
    const [newRequest] = await db
      .insert(depositRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getDepositRequestById(requestId: string): Promise<DepositRequest | undefined> {
    const [request] = await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.id, requestId))
      .limit(1);
    return request || undefined;
  }

  async getDepositRequestsByUser(userId: string): Promise<DepositRequest[]> {
    return await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.userId, userId))
      .orderBy(desc(depositRequests.createdAt));
  }

  async getDepositRequestsByAgent(agentId: string, status?: "pending" | "approved" | "rejected" | "completed"): Promise<DepositRequest[]> {
    if (status) {
      return await db
        .select()
        .from(depositRequests)
        .where(and(eq(depositRequests.agentId, agentId), eq(depositRequests.status, status)))
        .orderBy(desc(depositRequests.createdAt));
    }
    return await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.agentId, agentId))
      .orderBy(desc(depositRequests.createdAt));
  }

  async updateDepositRequestStatus(requestId: string, status: "pending" | "approved" | "rejected" | "completed", updates?: Partial<DepositRequest>): Promise<DepositRequest | undefined> {
    const [request] = await db
      .update(depositRequests)
      .set({ 
        status, 
        processedAt: new Date(),
        updatedAt: new Date(),
        ...updates 
      })
      .where(eq(depositRequests.id, requestId))
      .returning();
    return request || undefined;
  }

  async atomicApproveDepositRequest(requestId: string, agentId: string, agentNote?: string): Promise<{ success: boolean; request?: DepositRequest; transaction?: Transaction; user?: User; error?: string }> {
    try {
      return await db.transaction(async (trx: any) => {
        const [request] = await trx
          .select()
          .from(depositRequests)
          .where(eq(depositRequests.id, requestId))
          .limit(1);

        if (!request) {
          return { success: false, error: 'Deposit request not found' };
        }

        if (request.agentId !== agentId) {
          return { success: false, error: 'Not your deposit request' };
        }

        if (request.status !== 'pending') {
          return { success: false, error: 'Request already processed' };
        }

        const [user] = await trx
          .select()
          .from(users)
          .where(eq(users.id, request.userId))
          .limit(1);

        if (!user) {
          return { success: false, error: 'User not found' };
        }

        // Get agent user to update their balance
        const [agent] = await trx
          .select()
          .from(users)
          .where(eq(users.id, agentId))
          .limit(1);

        if (!agent) {
          return { success: false, error: 'Agent not found' };
        }

        // Get agent profile for commission calculation
        const [agentProfile] = await trx
          .select()
          .from(agentProfiles)
          .where(eq(agentProfiles.userId, agentId))
          .limit(1);

        if (!agentProfile) {
          return { success: false, error: 'Agent profile not found' };
        }

        const amount = parseFloat(request.amount);
        
        // Check if agent is depositing to themselves
        if (request.userId === agentId) {
          console.error('❌ Agent cannot approve their own deposit request');
          return { success: false, error: 'Agent cannot approve their own deposit request. Please request deposit from a different agent.' };
        }
        
        // Check if agent has sufficient balance
        const agentBalance = parseFloat(agent.balance);
        if (agentBalance < amount) {
          console.error(`❌ Insufficient agent balance. Required: $${amount.toFixed(2)}, Available: $${agentBalance.toFixed(2)}`);
          return { 
            success: false, 
            error: `Insufficient balance. You need $${amount.toFixed(2)} but only have $${agentBalance.toFixed(2)}. Please deposit more funds to your agent account.` 
          };
        }
        
        // Calculate commission with validation
        const commissionRate = parseFloat(agentProfile.commissionRate);
        if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
          console.error(`❌ Invalid commission rate: ${agentProfile.commissionRate}`);
          return { 
            success: false, 
            error: 'Invalid agent commission rate. Please contact support.' 
          };
        }
        const commission = amount * commissionRate;
        
        // Update user balance (add deposit amount)
        const newUserBalance = (parseFloat(user.balance) + amount).toFixed(8);
        const newTotalDeposits = (parseFloat(user.totalDeposits) + amount).toFixed(8);
        
        // Fix: Update frozen balance for agent deposits as well
        // This ensures the deposited amount is correctly frozen until wager requirements are met
        const newFrozenBalance = (parseFloat(user.frozenBalance || '0') + amount).toFixed(8);

        const [updatedUser] = await trx
          .update(users)
          .set({
            balance: newUserBalance,
            totalDeposits: newTotalDeposits,
            frozenBalance: newFrozenBalance,
            updatedAt: new Date()
          })
          .where(eq(users.id, request.userId))
          .returning();

        // Update agent balance (subtract deposit amount)
        // Note: Agent commission from deposit approvals is tracked in agentProfiles.earningsBalance
        // User commission fields (totalCommission, lifetimeCommissionEarned) are for referral commissions only
        const newAgentBalance = (parseFloat(agent.balance) - amount).toFixed(8);
        
        await trx
          .update(users)
          .set({
            balance: newAgentBalance,
            updatedAt: new Date()
          })
          .where(eq(users.id, agentId));

        // Update agent earnings balance (add commission)
        const newEarningsBalance = (parseFloat(agentProfile.earningsBalance) + commission).toFixed(8);
        
        await trx
          .update(agentProfiles)
          .set({
            earningsBalance: newEarningsBalance,
            updatedAt: new Date()
          })
          .where(eq(agentProfiles.userId, agentId));

        // Create transaction for USER (deposit)
        const transactionId = randomUUID();
        const [transaction] = await trx
          .insert(transactions)
          .values({
            id: transactionId,
            userId: request.userId,
            agentId,
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
          .returning();

        // Create transaction for AGENT (withdrawal/deduction)
        const agentTransactionId = randomUUID();
        await trx
          .insert(transactions)
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
          });

        const [updatedRequest] = await trx
          .update(depositRequests)
          .set({
            status: 'approved',
            processedAt: new Date(),
            updatedAt: new Date(),
            agentNote: agentNote || null,
            transactionId: transaction.id
          })
          .where(eq(depositRequests.id, requestId))
          .returning();

        // Record agent activity with proper commission
        console.log('🔍 [AgentActivity] Creating activity for deposit approval:', {
          agentId,
          targetUserId: request.userId,
          amount: amount.toFixed(8),
          commission: commission.toFixed(8),
          transactionId: transaction.id
        });
        
        try {
          const [createdActivity] = await trx
            .insert(agentActivities)
            .values({
              agentId,
              action: 'deposit_approval',
              targetUserId: request.userId,
              amount: amount.toFixed(8),
              commissionAmount: commission.toFixed(8),
              transactionId: transaction.id,
              createdAt: new Date()
            })
            .returning();
          
          console.log('✅ [AgentActivity] Activity created successfully:', {
            activityId: createdActivity.id,
            action: createdActivity.action,
            commission: commission.toFixed(8)
          });
        } catch (activityError: any) {
          console.error('❌ [AgentActivity] Failed to create activity:', activityError);
          throw activityError; // Re-throw to rollback transaction
        }

        // Handle referral tracking for agent deposits (inside transaction for atomicity)
        let referrerData: { referrer?: User; oldTeamSize?: number; newTeamSize?: number; oldVipLevel?: string; newVipLevel?: string } | undefined;
        
        if (updatedUser.referredBy && amount >= 10) {
          try {
            // Get referral record within the same transaction
            const [userReferral] = await trx
              .select()
              .from(referrals)
              .where(and(
                eq(referrals.referrerId, updatedUser.referredBy),
                eq(referrals.referredId, updatedUser.id)
              ))
              .limit(1);
            
            // Only proceed if this is the first qualifying deposit
            if (userReferral && !userReferral.hasDeposited) {
              // Atomically update hasDeposited flag
              const [updatedReferral] = await trx
                .update(referrals)
                .set({ 
                  hasDeposited: true
                })
                .where(and(
                  eq(referrals.id, userReferral.id),
                  eq(referrals.hasDeposited, false) // Ensure it's still false (prevents race condition)
                ))
                .returning();
              
              // Only proceed if we successfully updated (prevents duplicate awards)
              if (updatedReferral) {
                console.log(`✅ [AgentDeposit] First qualifying deposit ($${amount}) for referred user ${updatedUser.id}`);
                
                // Get referrer
                const [referrer] = await trx
                  .select()
                  .from(users)
                  .where(eq(users.id, updatedUser.referredBy))
                  .limit(1);
                
                if (referrer) {
                  // Get referral bonus setting
                  const [bonusSetting] = await trx
                    .select()
                    .from(systemSettings)
                    .where(eq(systemSettings.key, 'referral_bonus_amount'))
                    .limit(1);
                  
                  const referralReward = bonusSetting?.value || "2.99000000";
                  const rewardAmount = parseFloat(referralReward);
                  
                  // Create referral bonus transaction
                  const bonusTransactionId = randomUUID();
                  await trx
                    .insert(transactions)
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
                    });
                  
                  // Update referrer's commission
                  const newCommission = (parseFloat(referrer.totalCommission || '0') + rewardAmount).toFixed(8);
                  const newLifetime = (parseFloat(referrer.lifetimeCommissionEarned || '0') + rewardAmount).toFixed(8);
                  
                  await trx
                    .update(users)
                    .set({
                      totalCommission: newCommission,
                      lifetimeCommissionEarned: newLifetime,
                      updatedAt: new Date()
                    })
                    .where(eq(users.id, referrer.id));
                  
                  // Update referral record's totalCommission
                  const referralCommission = (parseFloat(updatedReferral.totalCommission || '0') + rewardAmount).toFixed(8);
                  await trx
                    .update(referrals)
                    .set({
                      totalCommission: referralCommission
                    })
                    .where(eq(referrals.id, updatedReferral.id));
                  
                  console.log(`✅ [AgentDeposit] Referral bonus awarded: $${referralReward} to referrer ${referrer.id}`);
                  
                  // Update team size
                  const oldTeamSize = referrer.teamSize || 0;
                  const newTeamSize = oldTeamSize + 1;
                  const oldVipLevel = referrer.vipLevel;
                  
                  await trx
                    .update(users)
                    .set({
                      teamSize: newTeamSize,
                      updatedAt: new Date()
                    })
                    .where(eq(users.id, referrer.id));
                  
                  // Check if VIP level should be upgraded (using VipService static method)
                  const allVipLevels = await VipService.getVipLevelsFromStorage(this);
                  const referrerTotalDeposits = parseFloat(referrer.totalDeposits || '0');
                  const newVipLevel = VipService.calculateVipLevelStatic(newTeamSize, allVipLevels, referrerTotalDeposits);
                  
                  // Update VIP level if it changed
                  if (newVipLevel !== oldVipLevel) {
                    await trx
                      .update(users)
                      .set({
                        vipLevel: newVipLevel,
                        updatedAt: new Date()
                      })
                      .where(eq(users.id, referrer.id));
                    
                    console.log(`✅ [AgentDeposit] VIP level upgraded: ${referrer.email} from ${oldVipLevel} to ${newVipLevel}`);
                  }
                  
                  // Store referrer data for email notifications (sent outside transaction)
                  referrerData = {
                    referrer,
                    oldTeamSize,
                    newTeamSize,
                    oldVipLevel,
                    newVipLevel
                  };
                }
              } else {
                console.log(`⚠️ [AgentDeposit] Referral already marked as deposited, skipping duplicate award`);
              }
            }
          } catch (referralError: any) {
            console.error(`❌ [AgentDeposit] Error processing referral for user ${updatedUser.id}:`, referralError);
            // Don't throw - allow deposit to succeed even if referral tracking fails
          }
        }

        if (realtimeSyncService.isEnabled()) {
          await realtimeSyncService.syncUser(request.userId, updatedUser).catch(err =>
            console.error('[RealtimeSync] Failed to sync user in deposit approval:', err.message)
          );
          await realtimeSyncService.syncTransaction(transaction).catch(err =>
            console.error('[RealtimeSync] Failed to sync transaction in deposit approval:', err.message)
          );
        }

        return {
          success: true,
          request: updatedRequest,
          transaction,
          user: updatedUser,
          referrerData // Return referrer data for email notifications
        };
      });
    } catch (error: any) {
      console.error('Atomic deposit approval error:', error);
      return { success: false, error: error.message || 'Failed to approve deposit request' };
    }
  }

  // Coin flip game methods
  async createCoinFlipGame(game: InsertCoinFlipGame): Promise<CoinFlipGame> {
    const [newGame] = await db
      .insert(coinFlipGames)
      .values(game)
      .returning();
    return newGame;
  }

  async getCoinFlipGamesByUser(userId: string, limit: number = 10): Promise<CoinFlipGame[]> {
    return await db
      .select()
      .from(coinFlipGames)
      .where(eq(coinFlipGames.userId, userId))
      .orderBy(desc(coinFlipGames.createdAt))
      .limit(limit);
  }

  // Data staleness monitoring methods
  async getUsersWithRecentActivity(minutesAgo: number): Promise<User[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    const userIdsWithActivity = await db
      .selectDistinct({ userId: transactions.userId })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${cutoffTime}`);
    
    if (userIdsWithActivity.length === 0) {
      return [];
    }
    
    const userIds = userIdsWithActivity.map((u: { userId: string }) => u.userId);
    const activeUsers = await db
      .select()
      .from(users)
      .where(sql`${users.id} IN (${sql.join(userIds.map((id: string) => sql`${id}`), sql`, `)})`);
    
    return activeUsers;
  }

  async getRecentDeposits(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await db
      .select()
      .from(transactions)
      .where(sql`${transactions.type} = 'deposit' AND ${transactions.createdAt} >= ${cutoffTime}`)
      .orderBy(desc(transactions.createdAt));
  }

  async getRecentWithdrawals(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await db
      .select()
      .from(transactions)
      .where(sql`${transactions.type} = 'withdrawal' AND ${transactions.createdAt} >= ${cutoffTime}`)
      .orderBy(desc(transactions.createdAt));
  }

  async getRecentTransactions(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await db
      .select()
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${cutoffTime}`)
      .orderBy(desc(transactions.createdAt))
      .limit(100);
  }

  // Crash Settings methods
  async getCrashSettings(): Promise<CrashSetting | undefined> {
    const [settings] = await db.select().from(crashSettings).limit(1);
    return settings || undefined;
  }

  async updateCrashSettings(updates: Partial<CrashSetting>): Promise<CrashSetting | undefined> {
    const [existing] = await db.select().from(crashSettings).limit(1);
    
    if (existing) {
      const [updated] = await db
        .update(crashSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crashSettings.id, existing.id))
        .returning();
      return updated;
    }
    
    const id = randomUUID();
    const [newSettings] = await db
      .insert(crashSettings)
      .values({
        id,
        houseEdge: updates.houseEdge ?? "20.00",
        maxMultiplier: updates.maxMultiplier ?? "50.00",
        minCrashMultiplier: updates.minCrashMultiplier ?? "1.01",
        crashEnabled: updates.crashEnabled ?? true,
        updatedBy: updates.updatedBy ?? 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    return newSettings;
  }

  // Admin action methods
  async logAdminAction(action: InsertAdminAction): Promise<AdminAction> {
    const [newAction] = await db
      .insert(adminActions)
      .values(action)
      .returning();
    
    return newAction;
  }

  async getAdminActions(page: number = 1, limit: number = 50): Promise<{ actions: AdminAction[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [totalResult] = await db.select({ count: count() }).from(adminActions);
    const total = totalResult?.count || 0;
    
    const actionList = await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { actions: actionList, total };
  }

  // Analytics methods
  async createGameAnalytics(analytics: InsertGameAnalytics): Promise<GameAnalytics> {
    const [newAnalytics] = await db
      .insert(gameAnalytics)
      .values(analytics)
      .returning();
    
    return newAnalytics;
  }

  async updateGameAnalytics(gameId: string, updates: Partial<GameAnalytics>): Promise<GameAnalytics | undefined> {
    const [analytics] = await db
      .update(gameAnalytics)
      .set(updates)
      .where(eq(gameAnalytics.gameId, gameId))
      .returning();
    
    return analytics || undefined;
  }

  async getAnalyticsByGame(gameId: string): Promise<GameAnalytics | undefined> {
    const [analytics] = await db
      .select()
      .from(gameAnalytics)
      .where(eq(gameAnalytics.gameId, gameId));
    
    return analytics || undefined;
  }

  async getOverallAnalytics(): Promise<{
    totalGames: number;
    totalBets: number;
    totalVolume: string;
    totalProfit: string;
    averageBetSize: string;
  }> {
    const [gameStats] = await db
      .select({
        totalGames: count(),
        totalProfit: sum(games.houseProfit)
      })
      .from(games);
    
    const [betStats] = await db
      .select({
        totalBets: count(),
        totalVolume: sum(bets.amount)
      })
      .from(bets);
    
    const totalGames = gameStats?.totalGames || 0;
    const totalBets = betStats?.totalBets || 0;
    const totalVolume = betStats?.totalVolume || "0.00000000";
    const totalProfit = gameStats?.totalProfit || "0.00000000";
    const averageBetSize = totalBets > 0 
      ? (parseFloat(totalVolume) / totalBets).toFixed(8)
      : "0.00000000";
    
    return {
      totalGames,
      totalBets,
      totalVolume,
      totalProfit,
      averageBetSize
    };
  }

  // User session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db
      .insert(userSessions)
      .values(session)
      .returning();
    
    return newSession;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.loginTime));
  }

  async updateSessionStatus(sessionId: string, isActive: boolean): Promise<UserSession | undefined> {
    const [session] = await db
      .update(userSessions)
      .set({ 
        isActive, 
        logoutTime: isActive ? null : new Date() 
      })
      .where(eq(userSessions.id, sessionId))
      .returning();
    
    return session || undefined;
  }

  // Device login tracking methods
  async createDeviceLogin(deviceLogin: InsertDeviceLogin): Promise<DeviceLogin> {
    const [newDeviceLogin] = await db
      .insert(deviceLogins)
      .values(deviceLogin)
      .returning();
    
    return newDeviceLogin;
  }

  async getUserDeviceLogins(userId: string, limit: number = 50): Promise<DeviceLogin[]> {
    return await db
      .select()
      .from(deviceLogins)
      .where(eq(deviceLogins.userId, userId))
      .orderBy(desc(deviceLogins.loginAt))
      .limit(limit);
  }

  async clearUserSessions(userId: string): Promise<number> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.userId, userId));
    return result.rowCount || 0;
  }

  async clearDeviceLogins(userId: string): Promise<number> {
    const result = await db
      .delete(deviceLogins)
      .where(eq(deviceLogins.userId, userId));
    return result.rowCount || 0;
  }

  // Page view tracking methods
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const [newPageView] = await db
      .insert(pageViews)
      .values(pageView)
      .returning();
    
    return newPageView;
  }

  async getDailyVisitors(date?: Date): Promise<{ uniqueVisitors: number; totalPageViews: number }> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        totalPageViews: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipAddress})`,
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startOfDay} AND ${pageViews.createdAt} < ${endOfDay}`);

    return {
      uniqueVisitors: Number(result[0]?.uniqueVisitors || 0),
      totalPageViews: Number(result[0]?.totalPageViews || 0),
    };
  }

  async getTrafficStats(startDate: Date, endDate: Date): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    topPages: Array<{ path: string; views: number }>;
    deviceBreakdown: Array<{ deviceType: string; count: number }>;
    countryBreakdown: Array<{ country: string; count: number }>;
    dailyStats: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
  }> {
    const totalPageViews = await db
      .select({ count: count() })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`);

    const uniqueVisitors = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${pageViews.ipAddress})` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`);

    const topPages = await db
      .select({
        path: pageViews.path,
        views: count(),
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`)
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    const deviceBreakdown = await db
      .select({
        deviceType: pageViews.deviceType,
        count: count(),
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`)
      .groupBy(pageViews.deviceType);

    const countryBreakdown = await db
      .select({
        country: pageViews.country,
        count: count(),
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`)
      .groupBy(pageViews.country)
      .orderBy(desc(count()))
      .limit(20);

    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${pageViews.createdAt})`,
        pageViews: count(),
        uniqueVisitors: sql<number>`COUNT(DISTINCT ${pageViews.ipAddress})`,
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.createdAt} < ${endDate}`)
      .groupBy(sql`DATE(${pageViews.createdAt})`)
      .orderBy(sql`DATE(${pageViews.createdAt})`);

    return {
      totalPageViews: Number(totalPageViews[0]?.count || 0),
      uniqueVisitors: Number(uniqueVisitors[0]?.count || 0),
      topPages: topPages.map((p: any) => ({ path: p.path, views: Number(p.views) })),
      deviceBreakdown: deviceBreakdown.map((d: any) => ({ 
        deviceType: d.deviceType || 'Unknown', 
        count: Number(d.count) 
      })),
      countryBreakdown: countryBreakdown.map((c: any) => ({ 
        country: c.country || 'Unknown', 
        count: Number(c.count) 
      })),
      dailyStats: dailyStats.map((s: any) => ({
        date: s.date,
        pageViews: Number(s.pageViews),
        uniqueVisitors: Number(s.uniqueVisitors),
      })),
    };
  }

  // 2FA methods
  async startPending2FASetup(userId: string, secret: string): Promise<boolean> {
    // Clear any existing pending setup for this user
    this.clearPending2FASetup(userId);
    
    // Store pending setup with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pending2FASetups.set(userId, { secret, expiresAt });
    
    return true;
  }

  async getPending2FASecret(userId: string): Promise<string | null> {
    const pending = pending2FASetups.get(userId);
    if (!pending || pending.expiresAt < new Date()) {
      pending2FASetups.delete(userId);
      return null;
    }
    return pending.secret;
  }

  async completePending2FASetup(userId: string): Promise<User | undefined> {
    const secret = await this.getPending2FASecret(userId);
    if (!secret) {
      return undefined;
    }

    const [user] = await db
      .update(users)
      .set({ 
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    // Clear pending setup
    this.clearPending2FASetup(userId);
    
    return user || undefined;
  }

  async clearPending2FASetup(userId: string): Promise<void> {
    pending2FASetups.delete(userId);
  }

  async enable2FA(userId: string, secret: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }

  async disable2FA(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }

  async validate2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }
    
    try {
      return authenticator.verify({
        token,
        secret: user.twoFactorSecret
      });
    } catch (error) {
      return false;
    }
  }

  // Passkey methods
  async createPasskey(passkey: InsertPasskey): Promise<Passkey> {
    const [created] = await db
      .insert(passkeys)
      .values({
        userId: passkey.userId,
        credentialId: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter ?? 0,
        deviceName: passkey.deviceName,
        rpId: passkey.rpId,
        origin: passkey.origin,
        isActive: passkey.isActive ?? true,
        isDomainMismatch: passkey.isDomainMismatch ?? false
      })
      .returning();
    
    return created;
  }

  async getUserPasskeys(userId: string): Promise<Passkey[]> {
    return await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(desc(passkeys.createdAt));
  }

  async getAllActivePasskeys(): Promise<Passkey[]> {
    return await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.isActive, true));
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<Passkey | undefined> {
    const [passkey] = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.credentialId, credentialId))
      .limit(1);
    
    return passkey || undefined;
  }

  async updatePasskey(passkeyId: string, updates: Partial<Passkey>): Promise<Passkey | undefined> {
    const [updated] = await db
      .update(passkeys)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(passkeys.id, passkeyId))
      .returning();
    
    return updated || undefined;
  }

  async deletePasskey(passkeyId: string): Promise<boolean> {
    const result = await db
      .delete(passkeys)
      .where(eq(passkeys.id, passkeyId))
      .returning();
    
    return result.length > 0;
  }

  async updatePasskeyCounter(credentialId: string, counter: number): Promise<Passkey | undefined> {
    const [updated] = await db
      .update(passkeys)
      .set({
        counter,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(passkeys.credentialId, credentialId))
      .returning();
    
    return updated || undefined;
  }

  // System settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    
    return setting || undefined;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db
      .select()
      .from(systemSettings)
      .orderBy(asc(systemSettings.key));
  }

  async upsertSystemSetting(setting: UpdateSystemSetting, adminId: string): Promise<SystemSetting> {
    // Check if setting exists
    const existing = await this.getSystemSetting(setting.key);
    
    if (existing) {
      // Update existing setting
      const [updated] = await db
        .update(systemSettings)
        .set({
          value: setting.value,
          description: setting.description,
          isEncrypted: setting.isEncrypted || false,
          lastUpdatedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.key, setting.key))
        .returning();
      
      return updated;
    } else {
      // Create new setting
      const [created] = await db
        .insert(systemSettings)
        .values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          isEncrypted: setting.isEncrypted || false,
          lastUpdatedBy: adminId
        })
        .returning();
      
      return created;
    }
  }

  async deleteSystemSetting(key: string, adminId: string): Promise<boolean> {
    try {
      // Log admin action before deletion
      await this.logAdminAction({
        adminId,
        action: 'delete_system_setting',
        targetId: key,
        details: { settingKey: key }
      });

      const result = await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting system setting:', error);
      return false;
    }
  }

  // VIP level methods
  async updateUserVipLevel(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const teamSize = user.teamSize || 0;
    const totalDeposits = parseFloat(user.totalDeposits) || 0;
    
    // Get VIP levels from database settings (dynamic)
    const vipLevels = await VipService.getVipLevelsFromStorage(this);
    const newVipLevel = VipService.calculateVipLevelStatic(teamSize, vipLevels, totalDeposits);
    const newMaxBetLimit = parseFloat(VipService.getMaxBetLimitStatic(newVipLevel, vipLevels).toString()).toFixed(8);
    
    if (user.vipLevel !== newVipLevel || user.maxBetLimit !== newMaxBetLimit) {
      return await this.updateUser(userId, {
        vipLevel: newVipLevel as any,
        maxBetLimit: newMaxBetLimit
      });
    }
    
    return user;
  }

  // Agent management methods
  async createAgent(email: string, password: string, commissionRate: string = "0.0500"): Promise<{ user: User; agentProfile: AgentProfile }> {
    try {
      // Check if email already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error("Email already registered");
      }

      // Create user with agent role
      const passwordHash = await bcrypt.hash(password, 10);
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();

      const [user] = await db
        .insert(users)
        .values({
          email,
          publicId,
          passwordHash,
          referralCode,
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
        .returning();

      // Create agent profile
      const [agentProfile] = await db
        .insert(agentProfiles)
        .values({
          userId: user.id,
          commissionRate,
          earningsBalance: "0.00000000",
          isActive: true
        })
        .returning();

      return { user, agentProfile };
    } catch (error) {
      // Only log non-duplicate errors
      if (error instanceof Error && !error.message.includes('already registered')) {
        console.error('Error creating agent:', error);
      }
      throw error;
    }
  }

  async getAgentProfile(userId: string): Promise<AgentProfile | undefined> {
    try {
      const [agentProfile] = await db
        .select()
        .from(agentProfiles)
        .where(eq(agentProfiles.userId, userId))
        .limit(1);
      
      return agentProfile || undefined;
    } catch (error) {
      console.error('Error getting agent profile:', error);
      return undefined;
    }
  }

  async getAllAgents(page: number = 1, limit: number = 50): Promise<{ agents: Array<User & { agentProfile: AgentProfile }>; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get agents with their profiles
      const agentResults = await db
        .select({
          user: users,
          agentProfile: agentProfiles
        })
        .from(users)
        .innerJoin(agentProfiles, eq(users.id, agentProfiles.userId))
        .where(eq(users.role, "agent"))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .innerJoin(agentProfiles, eq(users.id, agentProfiles.userId))
        .where(eq(users.role, "agent"));

      const agents = agentResults.map((result: any) => ({
        ...result.user,
        agentProfile: result.agentProfile
      }));

      return { agents, total: count };
    } catch (error) {
      console.error('Error getting all agents:', error);
      return { agents: [], total: 0 };
    }
  }

  async updateAgentCommission(agentId: string, commissionRate: string): Promise<AgentProfile | undefined> {
    try {
      const [updatedProfile] = await db
        .update(agentProfiles)
        .set({ 
          commissionRate,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId))
        .returning();
      
      return updatedProfile || undefined;
    } catch (error) {
      console.error('Error updating agent commission:', error);
      return undefined;
    }
  }

  async toggleAgentStatus(agentId: string): Promise<AgentProfile | undefined> {
    try {
      // Get current status
      const currentProfile = await this.getAgentProfile(agentId);
      if (!currentProfile) {
        return undefined;
      }

      // Toggle status
      const [updatedProfile] = await db
        .update(agentProfiles)
        .set({ 
          isActive: !currentProfile.isActive,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId))
        .returning();
      
      // Also update user status if needed
      await db
        .update(users)
        .set({ 
          isActive: !currentProfile.isActive,
          updatedAt: new Date()
        })
        .where(eq(users.id, agentId));
      
      return updatedProfile || undefined;
    } catch (error) {
      console.error('Error toggling agent status:', error);
      return undefined;
    }
  }

  async promoteUserToAgent(userId: string, commissionRate: string = "0.0500"): Promise<{ user: User; agentProfile: AgentProfile }> {
    try {
      // Get the user
      const user = await this.getUser(userId);
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

      // Update user role to agent
      const [updatedUser] = await db
        .update(users)
        .set({ 
          role: "agent",
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      // Create agent profile
      const [agentProfile] = await db
        .insert(agentProfiles)
        .values({
          userId: userId,
          commissionRate: commissionRate,
          earningsBalance: "0.00000000",
          isActive: true
        })
        .returning();

      return { user: updatedUser, agentProfile };
    } catch (error) {
      console.error('Error promoting user to agent:', error);
      throw error;
    }
  }

  async getUserByPublicIdOrEmail(identifier: string): Promise<User | undefined> {
    try {
      // Check if identifier is email format
      const isEmail = identifier.includes('@');
      
      const [user] = await db
        .select()
        .from(users)
        .where(
          isEmail 
            ? eq(users.email, identifier)
            : eq(users.publicId, identifier)
        )
        .limit(1);
      
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by identifier:', error);
      return undefined;
    }
  }

  async processAgentDeposit(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }> {
    try {
      // Get target user
      const targetUser = await this.getUserByPublicIdOrEmail(userIdentifier);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get agent profile
      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile || !agentProfile.isActive) {
        throw new Error("Agent not found or inactive");
      }

      // Get agent user record to check balance
      const agentUser = await this.getUser(agentId);
      if (!agentUser) {
        throw new Error("Agent user not found");
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0 || !isFinite(depositAmount) || isNaN(depositAmount)) {
        throw new Error("Invalid deposit amount");
      }

      // Format amount properly for database
      const formattedAmount = depositAmount.toFixed(8);

      // Check if agent has sufficient balance
      if (parseFloat(agentUser.balance) < depositAmount) {
        throw new Error("Insufficient agent balance for this deposit");
      }

      // Calculate commission
      const commissionAmount = (depositAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);

      // Create transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: targetUser.id,
          agentId: agentId,
          type: "deposit",
          fiatAmount: formattedAmount,
          fiatCurrency: "USD",
          status: "completed",
          paymentMethod: "agent",
          fee: "0.00000000"
        })
        .returning();

      // Update user balance
      const newBalance = (parseFloat(targetUser.balance) + depositAmount).toFixed(8);
      const newTotalDeposits = (parseFloat(targetUser.totalDeposits) + depositAmount).toFixed(8);
      
      // Freeze the full deposit amount (users can bet with it but cannot withdraw it)
      const newFrozenBalance = (parseFloat(targetUser.frozenBalance || '0') + depositAmount).toFixed(8);
      
      await db
        .update(users)
        .set({ 
          balance: newBalance,
          totalDeposits: newTotalDeposits,
          frozenBalance: newFrozenBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUser.id));

      // Update agent earnings
      const newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
      await db
        .update(agentProfiles)
        .set({ 
          earningsBalance: newEarnings,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId));

      // Deduct deposit amount from agent's balance
      const newAgentBalance = (parseFloat(agentUser.balance) - depositAmount).toFixed(8);
      await db
        .update(users)
        .set({ 
          balance: newAgentBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, agentId));

      // Create a transaction record for the agent showing this payout
      await db
        .insert(transactions)
        .values({
          userId: agentId,
          type: "withdrawal",
          fiatAmount: formattedAmount,
          fiatCurrency: "USD",
          status: "completed",
          paymentMethod: "agent",
          fee: "0.00000000"
        });

      // Create agent activity record
      const activity = await this.createAgentActivity({
        agentId,
        action: "deposit",
        targetUserId: targetUser.id,
        amount: formattedAmount,
        commissionAmount,
        transactionId: transaction.id
      });

      // Update user VIP level
      await this.updateUserVipLevel(targetUser.id);
      
      // Handle first deposit referral bonus if user has a referrer and deposit >= $10
      if (targetUser.referredBy && depositAmount >= 10) {
        try {
          // Get referral record
          const referrals = await this.getReferralsByUser(targetUser.referredBy);
          const userReferral = referrals.find(r => r.referredId === targetUser.id);
          
          // If this is the first qualifying deposit (atomic check and update)
          if (userReferral && !userReferral.hasDeposited) {
            // Update referral to mark as deposited (atomic operation)
            const updatedReferral = await this.updateReferralHasDeposited(userReferral.id, true);
            
            if (updatedReferral) {
              // Get referrer
              const referrer = await this.getUser(targetUser.referredBy);
              if (referrer) {
                // Award referral bonus to REFERRER ONLY
                const referralBonusSetting = await this.getSystemSetting('referral_bonus_amount');
                const referralReward = referralBonusSetting?.value || "2.99000000";
                
                // Award to referrer only (the person who referred)
                await this.createTransaction({
                  userId: referrer.id,
                  type: "referral_bonus",
                  fiatAmount: referralReward,
                  fiatCurrency: "USD",
                  status: "completed",
                  paymentMethod: "internal",
                  fee: "0.00000000"
                });
                
                // Update referrer's total commission (available rewards)
                // User must withdraw to wallet to add to main balance
                const newCommission = (parseFloat(referrer.totalCommission || '0') + parseFloat(referralReward)).toFixed(8);
                const newLifetime = (parseFloat(referrer.lifetimeCommissionEarned || '0') + parseFloat(referralReward)).toFixed(8);
                await this.updateUser(referrer.id, {
                  totalCommission: newCommission,
                  lifetimeCommissionEarned: newLifetime
                });
                
                // Update referral record's totalCommission
                const referralCommission = (parseFloat(updatedReferral.totalCommission || '0') + parseFloat(referralReward)).toFixed(8);
                await this.updateReferralCommission(updatedReferral.id, referralCommission);
                
                // Increment referrer's team size
                const newTeamSize = (referrer.teamSize || 0) + 1;
                await this.updateUser(referrer.id, {
                  teamSize: newTeamSize
                });
                
                // Check if VIP level should be upgraded
                await this.updateUserVipLevel(referrer.id);
                
                console.log(`✅ Agent deposit: Referral bonus awarded: ${referralReward} to referrer ${referrer.id} available rewards only`);
              }
            }
          }
        } catch (error) {
          console.error(`Agent deposit: Error processing referral bonus for user ${targetUser.id}:`, error);
        }
      }

      return { transaction, activity };
    } catch (error) {
      console.error('Error processing agent deposit:', error);
      throw error;
    }
  }

  async processAgentWithdrawal(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }> {
    try {
      // Get target user
      const targetUser = await this.getUserByPublicIdOrEmail(userIdentifier);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get agent user and profile
      const agentUser = await this.getUser(agentId);
      if (!agentUser) {
        throw new Error("Agent user not found");
      }

      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile || !agentProfile.isActive) {
        throw new Error("Agent not found or inactive");
      }

      const withdrawalAmount = parseFloat(amount);
      if (withdrawalAmount <= 0 || !isFinite(withdrawalAmount) || isNaN(withdrawalAmount)) {
        throw new Error("Invalid withdrawal amount");
      }

      // Format amount properly for database
      const formattedAmount = withdrawalAmount.toFixed(8);

      // Check if user has sufficient balance
      if (parseFloat(targetUser.balance) < withdrawalAmount) {
        throw new Error("Insufficient user balance");
      }

      // Check if agent has sufficient balance to pay out
      if (parseFloat(agentUser.balance) < withdrawalAmount) {
        throw new Error("Insufficient agent balance to process withdrawal");
      }

      // Calculate commission
      const commissionAmount = (withdrawalAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);

      // Create transaction for user withdrawal
      const [transaction] = await db
        .insert(transactions)
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
        .returning();

      // Create transaction for agent (showing deduction)
      await db
        .insert(transactions)
        .values({
          userId: agentId,
          agentId: agentId,
          type: "withdrawal",
          fiatAmount: `-${formattedAmount}`,
          fiatCurrency: "USD",
          status: "completed",
          paymentMethod: "agent",
          fee: "0.00000000"
        })
        .returning();

      // Update user balance (deduct withdrawal amount)
      const newBalance = (parseFloat(targetUser.balance) - withdrawalAmount).toFixed(8);
      const newTotalWithdrawals = (parseFloat(targetUser.totalWithdrawals) + withdrawalAmount).toFixed(8);
      
      await db
        .update(users)
        .set({ 
          balance: newBalance,
          totalWithdrawals: newTotalWithdrawals,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUser.id));

      // Deduct withdrawal amount from agent's user account balance
      const newAgentBalance = (parseFloat(agentUser.balance) - withdrawalAmount).toFixed(8);
      await db
        .update(users)
        .set({ 
          balance: newAgentBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, agentId));

      // Update agent earnings (add commission)
      const newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
      await db
        .update(agentProfiles)
        .set({ 
          earningsBalance: newEarnings,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId));

      // Create agent activity record
      const activity = await this.createAgentActivity({
        agentId,
        action: "withdrawal",
        targetUserId: targetUser.id,
        amount: formattedAmount,
        commissionAmount,
        transactionId: transaction.id
      });

      return { transaction, activity };
    } catch (error) {
      console.error('Error processing agent withdrawal:', error);
      throw error;
    }
  }

  async createAgentActivity(activity: InsertAgentActivity): Promise<AgentActivity> {
    try {
      const [createdActivity] = await db
        .insert(agentActivities)
        .values(activity)
        .returning();
      
      return createdActivity;
    } catch (error) {
      console.error('Error creating agent activity:', error);
      throw error;
    }
  }

  async getAgentActivities(agentId: string, page: number = 1, limit: number = 50): Promise<{ activities: any[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get activities with user's public ID
      const activitiesResult = await db
        .select({
          id: agentActivities.id,
          agentId: agentActivities.agentId,
          action: agentActivities.action,
          targetUserId: agentActivities.targetUserId,
          amount: agentActivities.amount,
          commissionAmount: agentActivities.commissionAmount,
          transactionId: agentActivities.transactionId,
          createdAt: agentActivities.createdAt,
          targetUserPublicId: users.publicId,
        })
        .from(agentActivities)
        .leftJoin(users, eq(agentActivities.targetUserId, users.id))
        .where(eq(agentActivities.agentId, agentId))
        .orderBy(sql`${agentActivities.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(agentActivities)
        .where(eq(agentActivities.agentId, agentId));

      return { activities: activitiesResult, total: count };
    } catch (error) {
      console.error('Error getting agent activities:', error);
      return { activities: [], total: 0 };
    }
  }

  async getAgentEarnings(agentId: string): Promise<{ totalEarnings: string; commissionRate: string; totalDeposits: string }> {
    try {
      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile) {
        throw new Error("Agent profile not found");
      }

      // Calculate total deposits made by this agent
      const agentTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.agentId, agentId));
      
      const totalDeposits = agentTransactions
        .filter((t: any) => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.fiatAmount || '0'), 0)
        .toFixed(8);

      return {
        totalEarnings: agentProfile.earningsBalance,
        commissionRate: agentProfile.commissionRate,
        totalDeposits
      };
    } catch (error) {
      console.error('Error getting agent earnings:', error);
      throw error;
    }
  }

  async updateAgentBalance(agentId: string, amount: string): Promise<AgentProfile | undefined> {
    try {
      const [updatedProfile] = await db
        .update(agentProfiles)
        .set({ 
          earningsBalance: amount,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId))
        .returning();
      
      return updatedProfile || undefined;
    } catch (error) {
      console.error('Error updating agent balance:', error);
      return undefined;
    }
  }

  async adjustAgentBalance(agentId: string, amount: string, adminId: string): Promise<AgentProfile | undefined> {
    try {
      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile) return undefined;
      
      const agent = await this.getUser(agentId);
      if (!agent) return undefined;
      
      const currentEarningsBalance = parseFloat(agentProfile.earningsBalance);
      const currentUserBalance = parseFloat(agent.balance);
      const adjustment = parseFloat(amount);
      const newEarningsBalance = (currentEarningsBalance + adjustment).toFixed(8);
      const newUserBalance = (currentUserBalance + adjustment).toFixed(8);
      
      // Log the admin action
      await this.logAdminAction({
        adminId,
        action: 'agent_balance_adjustment',
        targetId: agentId,
        details: { 
          previousBalance: agentProfile.earningsBalance, 
          adjustment: amount, 
          newBalance: newEarningsBalance 
        }
      });
      
      // Update agent profile earnings balance
      const [updatedProfile] = await db
        .update(agentProfiles)
        .set({ 
          earningsBalance: newEarningsBalance,
          updatedAt: new Date()
        })
        .where(eq(agentProfiles.userId, agentId))
        .returning();
      
      // Update user wallet balance so it shows in agent dashboard
      await db
        .update(users)
        .set({ 
          balance: newUserBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, agentId));
      
      return updatedProfile || undefined;
    } catch (error) {
      console.error('Error adjusting agent balance:', error);
      return undefined;
    }
  }

  async clearDemoData(): Promise<void> {
    try {
      const { ne } = await import("drizzle-orm");
      
      // Delete all non-admin user related data (in order to respect foreign keys)
      await db.delete(goldenLiveEvents);
      await db.delete(goldenLiveStats);
      await db.delete(promoCodeRedemptions);
      await db.delete(pushSubscriptions);
      await db.delete(notifications);
      await db.delete(passkeys);
      await db.delete(agentActivities);
      await db.delete(agentProfiles);
      await db.delete(withdrawalRequests);
      await db.delete(passwordResetTokens);
      await db.delete(pageViews);
      await db.delete(userSessions);
      await db.delete(gameAnalytics);
      await db.delete(bets);
      await db.delete(referrals);
      await db.delete(transactions);
      await db.delete(games);
      
      // Only delete non-admin users
      await db.delete(users).where(ne(users.role, 'admin'));
      
      console.log('✅ Demo data cleared successfully (admin users preserved)');
    } catch (error) {
      console.error('Error clearing demo data:', error);
      throw error;
    }
  }

  async getUserCountsByCountry(): Promise<Array<{ countryCode: string; count: number }>> {
    const result = await db
      .select({
        countryCode: users.registrationCountry,
        count: count()
      })
      .from(users)
      .where(sql`${users.registrationCountry} IS NOT NULL AND ${users.registrationCountry} != ''`)
      .groupBy(users.registrationCountry)
      .orderBy(desc(count()));

    return result.map((row: { countryCode: string | null; count: number }) => ({
      countryCode: row.countryCode || 'Unknown',
      count: Number(row.count)
    }));
  }

  // VIP settings methods
  async getAllVipSettings(): Promise<VipSetting[]> {
    const settings = await db
      .select()
      .from(vipSettings)
      .orderBy(asc(vipSettings.levelOrder));
    return settings;
  }

  async getVipSettingById(id: string): Promise<VipSetting | undefined> {
    const [setting] = await db
      .select()
      .from(vipSettings)
      .where(eq(vipSettings.id, id));
    return setting || undefined;
  }

  async getVipSettingByLevelKey(levelKey: string): Promise<VipSetting | undefined> {
    const [setting] = await db
      .select()
      .from(vipSettings)
      .where(eq(vipSettings.levelKey, levelKey));
    return setting || undefined;
  }

  async createVipSetting(setting: InsertVipSetting): Promise<VipSetting> {
    const [newSetting] = await db
      .insert(vipSettings)
      .values(setting)
      .returning();
    return newSetting;
  }

  async updateVipSetting(id: string, updates: Partial<VipSetting>): Promise<VipSetting | undefined> {
    const [updatedSetting] = await db
      .update(vipSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vipSettings.id, id))
      .returning();
    return updatedSetting || undefined;
  }

  async deleteVipSetting(id: string): Promise<boolean> {
    const result = await db
      .delete(vipSettings)
      .where(eq(vipSettings.id, id))
      .returning();
    return result.length > 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(sql`${notifications.userId} = ${userId} AND ${notifications.isRead} = false`)
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(notificationId: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    await db.delete(notifications)
      .where(eq(notifications.id, notificationId));
    return true;
  }
  
  // Push subscription methods
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    try {
      // Try to update if exists, otherwise create
      const existing = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .limit(1);
      
      if (existing.length > 0) {
        const [updated] = await db.update(pushSubscriptions)
          .set({
            userId: subscription.userId,
            p256dhKey: subscription.p256dhKey,
            authKey: subscription.authKey,
            userAgent: subscription.userAgent,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
          .returning();
        return updated;
      }
      
      const [newSubscription] = await db.insert(pushSubscriptions).values(subscription).returning();
      return newSubscription;
    } catch (error) {
      console.error('Error creating push subscription:', error);
      throw error;
    }
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await db.select()
      .from(pushSubscriptions)
      .where(sql`${pushSubscriptions.userId} = ${userId} AND ${pushSubscriptions.isActive} = true`);
  }

  async getAllActivePushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true));
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    await db.update(pushSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return true;
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<boolean> {
    await db.update(pushSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushSubscriptions.userId, userId));
    return true;
  }

  // Withdrawal request methods
  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [withdrawalRequest] = await db
      .insert(withdrawalRequests)
      .values(request)
      .returning();
    return withdrawalRequest;
  }

  async getWithdrawalRequestsByUser(userId: string): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests(page: number = 1, limit: number = 50, status?: string): Promise<{ requests: WithdrawalRequest[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let query = db
      .select()
      .from(withdrawalRequests);

    if (status && status !== 'all') {
      query = query.where(eq(withdrawalRequests.status, status as any)) as any;
    }

    const requests = await query
      .orderBy(desc(withdrawalRequests.createdAt))
      .limit(limit)
      .offset(offset);

    let countQuery = db
      .select({ count: count() })
      .from(withdrawalRequests);

    if (status && status !== 'all') {
      countQuery = countQuery.where(eq(withdrawalRequests.status, status as any)) as any;
    }

    const [{ count: total }] = await countQuery;

    return { requests, total: Number(total) };
  }

  async updateWithdrawalRequestStatus(
    requestId: string,
    status: string,
    processedBy?: string,
    adminNote?: string
  ): Promise<WithdrawalRequest | undefined> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (processedBy) {
      updates.processedBy = processedBy;
      updates.processedAt = new Date();
    }

    if (adminNote !== undefined) {
      updates.adminNote = adminNote;
    }

    const [updated] = await db
      .update(withdrawalRequests)
      .set(updates)
      .where(eq(withdrawalRequests.id, requestId))
      .returning();

    return updated;
  }

  async getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | undefined> {
    const [request] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id))
      .limit(1);
    return request;
  }

  async getCompletedWithdrawalCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.userId, userId),
          eq(withdrawalRequests.status, 'completed')
        )
      );
    return result[0]?.count || 0;
  }

  // Crash game specific bet methods
  async updateBetForCashout(betId: string, cashOutMultiplier: string, cashedOutAt: Date): Promise<Bet | undefined> {
    const [updated] = await db
      .update(bets)
      .set({
        cashOutMultiplier,
        cashedOutAt,
        status: 'cashed_out',
        updatedAt: cashedOutAt
      })
      .where(eq(bets.id, betId))
      .returning();
    return updated;
  }

  async updateBetIfPending(betId: string, newStatus: "won" | "lost" | "cashed_out", additionalUpdates?: Partial<Bet>): Promise<boolean> {
    const [bet] = await db
      .select()
      .from(bets)
      .where(eq(bets.id, betId))
      .limit(1);
    
    if (!bet || bet.status !== 'pending') return false;
    
    await db
      .update(bets)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...additionalUpdates
      })
      .where(eq(bets.id, betId));
    
    return true;
  }

  async getUserActiveCrashBet(userId: string, gameId: string): Promise<Bet | undefined> {
    try {
      const [userBet] = await db
        .select()
        .from(bets)
        .where(
          and(
            eq(bets.userId, userId),
            eq(bets.gameId, gameId),
            eq(bets.betType, 'crash'),
            eq(bets.status, 'pending')
          )
        )
        .limit(1);
      return userBet;
    } catch (error) {
      console.error('Error fetching user active crash bet:', error);
      return undefined;
    }
  }

  async cleanupUserBetHistory(userId: string): Promise<void> {
    try {
      // Find all crash bets for the user, ordered by creation time descending
      const userBets = await db.select({ id: bets.id })
        .from(bets)
        .where(and(eq(bets.userId, userId), eq(bets.betType, 'crash')))
        .orderBy(desc(bets.createdAt));

      if (userBets.length > 100) {
        const idsToDelete = userBets.slice(100).map(b => b.id);
        
        await db.delete(bets)
          .where(inArray(bets.id, idsToDelete));
        
        console.log(`🧹 [CLEANUP] Removed ${idsToDelete.length} old crash bets for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ [CLEANUP] Error cleaning up bet history for user ${userId}:`, error);
    }
  }

  // Golden Live methods
  async getGoldenLiveStats(): Promise<GoldenLiveStats | undefined> {
    const [stats] = await db
      .select()
      .from(goldenLiveStats)
      .limit(1);
    
    // Initialize if doesn't exist
    if (!stats) {
      const [newStats] = await db
        .insert(goldenLiveStats)
        .values({
          totalPlayers: 18000,
          activePlayers: 1243,
          lastHourlyIncrease: new Date()
        })
        .returning();
      return newStats;
    }
    
    return stats;
  }

  async updateGoldenLiveStats(updates: Partial<GoldenLiveStats>): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) return undefined;

    const [updated] = await db
      .update(goldenLiveStats)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(goldenLiveStats.id, currentStats.id))
      .returning();
    
    return updated;
  }

  async createGoldenLiveEvent(event: InsertGoldenLiveEvent): Promise<GoldenLiveEvent> {
    const [newEvent] = await db
      .insert(goldenLiveEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getGoldenLiveEvents(limit: number = 50): Promise<GoldenLiveEvent[]> {
    const events = await db
      .select()
      .from(goldenLiveEvents)
      .orderBy(desc(goldenLiveEvents.createdAt))
      .limit(limit);
    return events;
  }

  async incrementTotalPlayersBy28(): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) return undefined;

    const newTotalPlayers = currentStats.totalPlayers + 280;
    
    // Create event for audit trail
    await this.createGoldenLiveEvent({
      eventType: 'hourly_increase',
      previousValue: currentStats.totalPlayers,
      newValue: newTotalPlayers,
      incrementAmount: 280,
      description: 'Automatic hourly increase of total players by 280'
    });

    // Update the stats
    return await this.updateGoldenLiveStats({
      totalPlayers: newTotalPlayers,
      lastHourlyIncrease: new Date()
    });
  }

  async updateActivePlayersCount(count: number): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) return undefined;

    // Create event for audit trail
    await this.createGoldenLiveEvent({
      eventType: 'active_player_update',
      previousValue: currentStats.activePlayers,
      newValue: count,
      incrementAmount: count - currentStats.activePlayers,
      description: `Active players count updated from ${currentStats.activePlayers} to ${count}`
    });

    // Update the stats
    return await this.updateGoldenLiveStats({
      activePlayers: count
    });
  }

  // Promo code methods
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [newPromoCode] = await db
      .insert(promoCodes)
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
      .returning();
    return newPromoCode;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const upperCode = code.toUpperCase();
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, upperCode))
      .limit(1);
    return promoCode || undefined;
  }

  async getAllPromoCodes(page: number = 1, limit: number = 50): Promise<{ codes: PromoCode[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [codes, totalResult] = await Promise.all([
      db.select()
        .from(promoCodes)
        .orderBy(desc(promoCodes.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(promoCodes)
    ]);

    return {
      codes,
      total: totalResult[0]?.count || 0
    };
  }

  async validatePromoCode(code: string, userId: string): Promise<{ valid: boolean; reason?: string; promoCode?: PromoCode }> {
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { valid: false, reason: 'Promo code not found' };
    }

    if (!promoCode.isActive) {
      return { valid: false, reason: 'Promo code is no longer active' };
    }

    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return { valid: false, reason: 'Promo code has expired' };
    }

    if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
      return { valid: false, reason: 'Promo code usage limit reached' };
    }

    // Check if user already redeemed this code
    const [existingRedemption] = await db
      .select()
      .from(promoCodeRedemptions)
      .where(
        sql`${promoCodeRedemptions.userId} = ${userId} AND ${promoCodeRedemptions.code} = ${promoCode.code}`
      )
      .limit(1);
    
    if (existingRedemption) {
      return { valid: false, reason: 'You have already redeemed this promo code' };
    }

    // Check deposit requirement
    if (promoCode.requireDeposit) {
      const user = await this.getUser(userId);
      if (!user || parseFloat(user.totalDeposits) === 0) {
        return { valid: false, reason: 'You must make a deposit before redeeming this code' };
      }
    }

    return { valid: true, promoCode };
  }

  async redeemPromoCode(code: string, userId: string): Promise<{ success: boolean; amountAwarded?: string; vipLevelUpgraded?: boolean; newVipLevel?: string; reason?: string }> {
    const validation = await this.validatePromoCode(code, userId);
    
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const promoCode = validation.promoCode!;
    
    // Calculate random amount between min and max (in USD)
    // Convert to coins first for proper integer-based random calculation
    const minCoins = Math.round(parseFloat(promoCode.minValue) * 100);
    const maxCoins = Math.round(parseFloat(promoCode.maxValue) * 100);
    const randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
    // Convert back to USD for storage
    const randomAmount = randomCoins / 100;
    const amountAwarded = randomAmount.toFixed(8);

    // Create redemption record
    await db
      .insert(promoCodeRedemptions)
      .values({
        promoCodeId: promoCode.id,
        userId,
        code: promoCode.code,
        amountAwarded,
      });

    // Update promo code used count
    await db
      .update(promoCodes)
      .set({
        usedCount: sql`${promoCodes.usedCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(promoCodes.id, promoCode.id));

    // Update user balance
    const user = await this.getUser(userId);
    let vipLevelUpgraded = false;
    let newVipLevel: string | undefined;
    
    if (user) {
      const newBalance = (parseFloat(user.balance) + parseFloat(amountAwarded)).toFixed(8);
      await this.updateUserBalance(userId, newBalance);
      
      // Handle VIP level upgrade if specified
      if (promoCode.vipLevelUpgrade) {
        await this.updateUser(userId, { vipLevel: promoCode.vipLevelUpgrade as any });
        vipLevelUpgraded = true;
        newVipLevel = promoCode.vipLevelUpgrade;
      }
    }

    return { success: true, amountAwarded, vipLevelUpgraded, newVipLevel };
  }

  async getUserPromoCodeRedemptions(userId: string): Promise<PromoCodeRedemption[]> {
    const redemptions = await db
      .select()
      .from(promoCodeRedemptions)
      .where(eq(promoCodeRedemptions.userId, userId))
      .orderBy(desc(promoCodeRedemptions.createdAt));
    return redemptions;
  }

  async updatePromoCodeStatus(promoCodeId: string, isActive: boolean): Promise<PromoCode | undefined> {
    const [updated] = await db
      .update(promoCodes)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(promoCodes.id, promoCodeId))
      .returning();
    return updated || undefined;
  }

  async deletePromoCode(promoCodeId: string): Promise<boolean> {
    const result = await db
      .delete(promoCodes)
      .where(eq(promoCodes.id, promoCodeId))
      .returning();
    return result.length > 0;
  }

  // VIP Level Telegram Links methods
  async getAllVipLevelTelegramLinks(): Promise<VipLevelTelegramLink[]> {
    const links = await db
      .select()
      .from(vipLevelTelegramLinks)
      .where(eq(vipLevelTelegramLinks.isActive, true))
      .orderBy(asc(vipLevelTelegramLinks.vipLevel));
    return links;
  }

  async getVipLevelTelegramLink(vipLevel: string): Promise<VipLevelTelegramLink | undefined> {
    const [link] = await db
      .select()
      .from(vipLevelTelegramLinks)
      .where(eq(vipLevelTelegramLinks.vipLevel, vipLevel as any))
      .limit(1);
    return link || undefined;
  }

  async upsertVipLevelTelegramLink(link: InsertVipLevelTelegramLink): Promise<VipLevelTelegramLink> {
    const existing = await this.getVipLevelTelegramLink(link.vipLevel as string);
    
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(vipLevelTelegramLinks)
        .set({
          telegramLink: link.telegramLink,
          description: link.description,
          isActive: link.isActive,
          updatedBy: link.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(vipLevelTelegramLinks.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new
      const [newLink] = await db
        .insert(vipLevelTelegramLinks)
        .values({
          vipLevel: link.vipLevel,
          telegramLink: link.telegramLink,
          description: link.description,
          isActive: link.isActive !== undefined ? link.isActive : true,
          updatedBy: link.updatedBy,
        })
        .returning();
      return newLink;
    }
  }

  async deleteVipLevelTelegramLink(id: string): Promise<boolean> {
    const result = await db
      .delete(vipLevelTelegramLinks)
      .where(eq(vipLevelTelegramLinks.id, id))
      .returning();
    return result.length > 0;
  }

  // Database connection methods
  async createDatabaseConnection(connection: InsertDatabaseConnection): Promise<DatabaseConnection> {
    const [newConnection] = await db
      .insert(databaseConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async getAllDatabaseConnections(page: number = 1, limit: number = 50): Promise<{ connections: DatabaseConnection[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [connections, totalResult] = await Promise.all([
      db.select().from(databaseConnections).limit(limit).offset(offset).orderBy(desc(databaseConnections.createdAt)),
      db.select({ count: count() }).from(databaseConnections)
    ]);

    return {
      connections,
      total: totalResult[0]?.count || 0
    };
  }

  async getDatabaseConnectionById(id: string): Promise<DatabaseConnection | undefined> {
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .limit(1);
    return connection;
  }

  async updateDatabaseConnection(id: string, updates: Partial<DatabaseConnection>): Promise<DatabaseConnection | undefined> {
    const [updated] = await db
      .update(databaseConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    return updated;
  }

  async deleteDatabaseConnection(id: string): Promise<boolean> {
    const result = await db
      .delete(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .returning();
    return result.length > 0;
  }

  async getActiveDatabaseConnection(): Promise<DatabaseConnection | undefined> {
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.isActive, true))
      .limit(1);
    return connection;
  }

  async setActiveDatabaseConnection(id: string): Promise<DatabaseConnection | undefined> {
    // First, deactivate all connections
    await db
      .update(databaseConnections)
      .set({ isActive: false, status: 'inactive' as const, updatedAt: new Date() });

    // Then activate the selected connection
    const [activated] = await db
      .update(databaseConnections)
      .set({ isActive: true, status: 'active' as const, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    
    return activated;
  }

  async setPrimaryDatabaseConnection(id: string): Promise<DatabaseConnection | undefined> {
    // Verify the connection exists and is active
    const connection = await this.getDatabaseConnectionById(id);
    if (!connection) {
      throw new Error('Database connection not found');
    }
    if (!connection.isActive) {
      throw new Error('Cannot set inactive database as primary. Please activate it first.');
    }

    // First, remove primary flag from all connections
    await db
      .update(databaseConnections)
      .set({ isPrimary: false, updatedAt: new Date() });

    // Then set this connection as primary
    const [primary] = await db
      .update(databaseConnections)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    
    return primary;
  }

  async getPredictedResults(adminId: string): Promise<PredictedResult[]> {
    // If adminId is 'any', get all predictions from all admins
    if (adminId === 'any') {
      const results = await db
        .select()
        .from(predictedResults)
        .orderBy(desc(predictedResults.createdAt));
      
      return results;
    }
    
    const results = await db
      .select()
      .from(predictedResults)
      .where(eq(predictedResults.adminId, adminId));
    
    return results;
  }

  async savePredictedResult(prediction: InsertPredictedResult): Promise<PredictedResult> {
    const { adminId, periodId, result } = prediction;
    
    // Check if a prediction already exists for this admin and period
    const existing = await db
      .select()
      .from(predictedResults)
      .where(eq(predictedResults.adminId, adminId))
      .where(eq(predictedResults.periodId, periodId));
    
    if (existing.length > 0) {
      // Update existing prediction
      const [updated] = await db
        .update(predictedResults)
        .set({ result, updatedAt: new Date() })
        .where(eq(predictedResults.id, existing[0].id))
        .returning();
      
      return updated;
    } else {
      // Create new prediction
      const [created] = await db
        .insert(predictedResults)
        .values(prediction)
        .returning();
      
      return created;
    }
  }

  async deletePredictedResult(id: string, adminId: string): Promise<boolean> {
    const result = await db
      .delete(predictedResults)
      .where(eq(predictedResults.id, id))
      .where(eq(predictedResults.adminId, adminId))
      .returning();
    
    return result.length > 0;
  }

  // Support chat session methods
  async createSupportChatSession(payload: InsertSupportChatSession): Promise<SupportChatSession> {
    const [session] = await db
      .insert(supportChatSessions)
      .values(payload)
      .returning();
    return session;
  }

  async getSupportChatSessionByToken(token: string): Promise<SupportChatSession | undefined> {
    const [session] = await db
      .select()
      .from(supportChatSessions)
      .where(eq(supportChatSessions.sessionToken, token));
    return session;
  }

  async getSupportChatSession(id: string): Promise<SupportChatSession | undefined> {
    const [session] = await db
      .select()
      .from(supportChatSessions)
      .where(eq(supportChatSessions.id, id));
    return session;
  }

  async updateSupportChatSession(id: string, updates: Partial<SupportChatSession>): Promise<SupportChatSession | undefined> {
    const [updated] = await db
      .update(supportChatSessions)
      .set({ ...updates, lastMessageAt: updates.lastMessageAt || new Date() })
      .where(eq(supportChatSessions.id, id))
      .returning();
    return updated;
  }

  async listOpenSupportSessions(limit?: number): Promise<SupportChatSession[]> {
    const sessions = await db
      .select()
      .from(supportChatSessions)
      .where(eq(supportChatSessions.status, 'open'))
      .orderBy(desc(supportChatSessions.createdAt))
      .limit(limit || 50);
    return sessions;
  }

  async createSupportChatMessage(message: InsertSupportChatMessage): Promise<SupportChatMessage> {
    const [created] = await db
      .insert(supportChatMessages)
      .values(message)
      .returning();
    
    await db
      .update(supportChatSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(supportChatSessions.id, message.sessionId));
    
    return created;
  }

  async getSupportChatMessages(sessionId: string, after?: Date): Promise<SupportChatMessage[]> {
    let query = db
      .select()
      .from(supportChatMessages)
      .where(eq(supportChatMessages.sessionId, sessionId))
      .orderBy(asc(supportChatMessages.createdAt));
    
    if (after) {
      query = query.where(sql`${supportChatMessages.createdAt} > ${after}`);
    }
    
    return await query;
  }

  async markMessagesDelivered(sessionId: string, deliveredAt?: Date): Promise<number> {
    const result = await db
      .update(supportChatMessages)
      .set({ deliveredAt: deliveredAt || new Date() })
      .where(eq(supportChatMessages.sessionId, sessionId))
      .where(sql`${supportChatMessages.deliveredAt} IS NULL`)
      .returning();
    
    return result.length;
  }

  async deleteSupportChatMessages(sessionId: string): Promise<number> {
    const result = await db
      .delete(supportChatMessages)
      .where(eq(supportChatMessages.sessionId, sessionId))
      .returning();
    
    console.log(`🗑️ Deleted ${result.length} message(s) for session ${sessionId}`);
    return result.length;
  }

  async createQuickReply(payload: { shortcut: string; message: string; createdBy: string }): Promise<QuickReply> {
    const [quickReply] = await db
      .insert(quickReplies)
      .values(payload)
      .returning();
    return quickReply;
  }

  async getQuickReplies(): Promise<QuickReply[]> {
    return await db
      .select()
      .from(quickReplies)
      .orderBy(desc(quickReplies.updatedAt));
  }

  async getQuickReplyById(id: string): Promise<QuickReply | undefined> {
    const [quickReply] = await db
      .select()
      .from(quickReplies)
      .where(eq(quickReplies.id, id));
    return quickReply;
  }

  async updateQuickReply(id: string, updates: { shortcut?: string; message?: string }): Promise<QuickReply | undefined> {
    const [updated] = await db
      .update(quickReplies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quickReplies.id, id))
      .returning();
    return updated;
  }

  async deleteQuickReply(id: string): Promise<boolean> {
    const result = await db
      .delete(quickReplies)
      .where(eq(quickReplies.id, id))
      .returning();
    return result.length > 0;
  }

  // Telegram Reactions (N1Panel) methods
  async getTelegramReactionSettings(): Promise<TelegramReactionSetting | undefined> {
    // Check environment variables first for API key (more secure)
    const apiKeyFromEnv = process.env.N1PANEL_API_KEY;
    const apiUrlFromEnv = process.env.N1PANEL_API_URL || "https://n1panel.com/api/v2";
    
    if (apiKeyFromEnv) {
      // Return settings from environment variables
      return {
        id: 'env-settings',
        apiKey: apiKeyFromEnv,
        apiUrl: apiUrlFromEnv,
        balance: null,
        isActive: true,
        lastBalanceCheck: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Fallback to database settings
    const [settings] = await db
      .select()
      .from(telegramReactionSettings)
      .limit(1);
    return settings;
  }

  async createOrUpdateTelegramReactionSettings(settings: UpdateTelegramReactionSetting): Promise<TelegramReactionSetting> {
    const existing = await this.getTelegramReactionSettings();
    
    if (existing) {
      const [updated] = await db
        .update(telegramReactionSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(telegramReactionSettings.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(telegramReactionSettings)
      .values({
        apiKey: settings.apiKey,
        apiUrl: settings.apiUrl || "https://n1panel.com/api/v2",
        isActive: settings.isActive ?? true,
      })
      .returning();
    return created;
  }

  async getAllTelegramGroups(): Promise<TelegramGroup[]> {
    return await db
      .select()
      .from(telegramGroups)
      .orderBy(desc(telegramGroups.createdAt));
  }

  async getTelegramGroupById(id: string): Promise<TelegramGroup | undefined> {
    const [group] = await db
      .select()
      .from(telegramGroups)
      .where(eq(telegramGroups.id, id));
    return group;
  }

  async createTelegramGroup(group: InsertTelegramGroup): Promise<TelegramGroup> {
    const [created] = await db
      .insert(telegramGroups)
      .values(group)
      .returning();
    return created;
  }

  async updateTelegramGroup(id: string, updates: UpdateTelegramGroup): Promise<TelegramGroup | undefined> {
    const [updated] = await db
      .update(telegramGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telegramGroups.id, id))
      .returning();
    return updated;
  }

  async deleteTelegramGroup(id: string): Promise<boolean> {
    const result = await db
      .delete(telegramGroups)
      .where(eq(telegramGroups.id, id))
      .returning();
    return result.length > 0;
  }

  // Telegram signals implementation
  async createTelegramSignal(signal: InsertTelegramSignal): Promise<TelegramSignal> {
    const [created] = await db
      .insert(telegramSignals)
      .values(signal)
      .returning();
    return created;
  }

  async getTelegramSignalById(id: string): Promise<TelegramSignal | undefined> {
    const [signal] = await db
      .select()
      .from(telegramSignals)
      .where(eq(telegramSignals.id, id));
    return signal;
  }

  async getTelegramSignalByGameId(gameId: string): Promise<TelegramSignal | undefined> {
    const [signal] = await db
      .select()
      .from(telegramSignals)
      .where(eq(telegramSignals.gameId, gameId))
      .orderBy(desc(telegramSignals.createdAt))
      .limit(1);
    return signal;
  }

  async getTelegramSignalByMessageId(messageId: number): Promise<TelegramSignal | undefined> {
    const [signal] = await db
      .select()
      .from(telegramSignals)
      .where(eq(telegramSignals.messageId, messageId));
    return signal;
  }

  async getAllTelegramSignals(limit: number = 50): Promise<TelegramSignal[]> {
    return await db
      .select()
      .from(telegramSignals)
      .orderBy(desc(telegramSignals.createdAt))
      .limit(limit);
  }

  async getPendingTelegramSignals(): Promise<TelegramSignal[]> {
    return await db
      .select()
      .from(telegramSignals)
      .where(eq(telegramSignals.status, 'sent'))
      .orderBy(telegramSignals.createdAt);
  }

  async updateTelegramSignal(id: string, updates: UpdateTelegramSignal): Promise<TelegramSignal | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.sentAt) {
      updateData.sentAt = new Date(updates.sentAt);
    }
    
    const [updated] = await db
      .update(telegramSignals)
      .set(updateData)
      .where(eq(telegramSignals.id, id))
      .returning();
    return updated;
  }

  async deleteTelegramSignal(id: string): Promise<boolean> {
    const result = await db
      .delete(telegramSignals)
      .where(eq(telegramSignals.id, id))
      .returning();
    return result.length > 0;
  }

  async getLatestTelegramSignalsByDuration(duration: number, limit: number = 10): Promise<TelegramSignal[]> {
    const signals = await db
      .select()
      .from(telegramSignals)
      .where(eq(telegramSignals.duration, duration))
      .orderBy(desc(telegramSignals.createdAt))
      .limit(limit);
    return signals.reverse();
  }

  async getAllTelegramReactionOrders(groupId?: string, limit?: number): Promise<TelegramReactionOrder[]> {
    const query = db
      .select()
      .from(telegramReactionOrders)
      .orderBy(desc(telegramReactionOrders.createdAt));
    
    if (groupId) {
      query.where(eq(telegramReactionOrders.groupId, groupId));
    }
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async getTelegramReactionOrderById(id: string): Promise<TelegramReactionOrder | undefined> {
    const [order] = await db
      .select()
      .from(telegramReactionOrders)
      .where(eq(telegramReactionOrders.id, id));
    return order;
  }

  async createTelegramReactionOrder(order: InsertTelegramReactionOrder): Promise<TelegramReactionOrder> {
    const [created] = await db
      .insert(telegramReactionOrders)
      .values(order)
      .returning();
    return created;
  }

  async updateTelegramReactionOrder(id: string, updates: Partial<TelegramReactionOrder>): Promise<TelegramReactionOrder | undefined> {
    const [updated] = await db
      .update(telegramReactionOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telegramReactionOrders.id, id))
      .returning();
    return updated;
  }

  async createN1PanelOrder(order: {
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    n1PanelOrderId: number | null;
    status: string;
    errorMessage: string | null;
  }): Promise<void> {
    const [existingOrder] = await db
      .select()
      .from(n1PanelReactionOrders)
      .where(
        and(
          eq(n1PanelReactionOrders.telegramMessageId, order.telegramMessageId),
          eq(n1PanelReactionOrders.telegramChannelId, order.telegramChannelId)
        )
      );

    if (existingOrder) {
      console.log(`⚠️  Order already exists for message ${order.telegramMessageId} in channel ${order.telegramChannelId}, skipping duplicate`);
      return;
    }

    await db.insert(n1PanelReactionOrders).values(order);
  }

  async updateN1PanelOrderStatus(orderId: number, updates: {
    status?: string;
    charge?: string;
    startCount?: string;
    remains?: string;
  }): Promise<void> {
    await db
      .update(n1PanelReactionOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(n1PanelReactionOrders.n1PanelOrderId, orderId));
  }

  async getPendingN1PanelOrders(): Promise<Array<{
    id: string;
    n1PanelOrderId: number | null;
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    status: string;
  }>> {
    const orders = await db
      .select()
      .from(n1PanelReactionOrders)
      .where(sql`${n1PanelReactionOrders.status} IN ('pending', 'processing')`)
      .orderBy(n1PanelReactionOrders.createdAt);
    return orders;
  }

  async getAllN1PanelOrders(limit = 100): Promise<Array<{
    id: string;
    telegramMessageId: number;
    telegramChannelId: string;
    messageLink: string;
    serviceId: number;
    quantity: number;
    n1PanelOrderId: number | null;
    status: string;
    charge: string | null;
    startCount: string | null;
    remains: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const orders = await db
      .select()
      .from(n1PanelReactionOrders)
      .orderBy(desc(n1PanelReactionOrders.createdAt))
      .limit(limit);
    return orders;
  }

  // Betting tasks implementations
  async getAllBettingTasks(): Promise<BettingTask[]> {
    return await db.select().from(bettingTasks).orderBy(desc(bettingTasks.createdAt));
  }

  async getActiveBettingTasks(): Promise<BettingTask[]> {
    return await db
      .select()
      .from(bettingTasks)
      .where(eq(bettingTasks.isActive, true))
      .orderBy(bettingTasks.durationMinutes);
  }

  async getBettingTaskById(id: string): Promise<BettingTask | undefined> {
    const tasks = await db.select().from(bettingTasks).where(eq(bettingTasks.id, id));
    return tasks[0];
  }

  async createBettingTask(task: InsertBettingTask): Promise<BettingTask> {
    const result = await db.insert(bettingTasks).values(task).returning();
    return result[0];
  }

  async updateBettingTask(id: string, updates: UpdateBettingTask): Promise<BettingTask | undefined> {
    const result = await db
      .update(bettingTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bettingTasks.id, id))
      .returning();
    return result[0];
  }

  async deleteBettingTask(id: string): Promise<boolean> {
    const result = await db.delete(bettingTasks).where(eq(bettingTasks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getUserTaskProgress(userId: string): Promise<Array<UserBettingTaskProgress & { task: BettingTask }>> {
    const progress = await db
      .select()
      .from(userBettingTaskProgress)
      .leftJoin(bettingTasks, eq(userBettingTaskProgress.taskId, bettingTasks.id))
      .where(eq(userBettingTaskProgress.userId, userId));
    
    return progress.map((p: any) => ({
      ...p.user_betting_task_progress,
      task: p.betting_tasks!
    }));
  }

  async getUserTaskProgressByTask(userId: string, taskId: string): Promise<UserBettingTaskProgress | undefined> {
    const progress = await db
      .select()
      .from(userBettingTaskProgress)
      .where(and(
        eq(userBettingTaskProgress.userId, userId),
        eq(userBettingTaskProgress.taskId, taskId)
      ));
    return progress[0];
  }

  async updateUserTaskProgress(userId: string, taskId: string, betAmount: string): Promise<UserBettingTaskProgress> {
    const existing = await this.getUserTaskProgressByTask(userId, taskId);
    
    if (existing) {
      const newAccumulated = (parseFloat(existing.betAccumulated) + parseFloat(betAmount)).toFixed(2);
      const result = await db
        .update(userBettingTaskProgress)
        .set({ 
          betAccumulated: newAccumulated,
          updatedAt: new Date()
        })
        .where(and(
          eq(userBettingTaskProgress.userId, userId),
          eq(userBettingTaskProgress.taskId, taskId)
        ))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(userBettingTaskProgress)
        .values({
          userId,
          taskId,
          betAccumulated: parseFloat(betAmount).toFixed(2),
          isCompleted: false
        })
        .returning();
      return result[0];
    }
  }

  async claimTaskReward(userId: string, taskId: string): Promise<{ success: boolean; reward?: string; error?: string }> {
    try {
      const task = await this.getBettingTaskById(taskId);
      if (!task) {
        return { success: false, error: "Task not found" };
      }

      console.log(`[ClaimReward] Task retrieved:`, { 
        taskId: task.id, 
        name: task.name,
        coinReward: task.coinReward,
        coinRewardType: typeof task.coinReward 
      });

      const progress = await this.getUserTaskProgressByTask(userId, taskId);
      if (!progress) {
        return { success: false, error: "No progress found for this task" };
      }

      if (progress.isCompleted) {
        return { success: false, error: "Task already claimed" };
      }

      if (parseFloat(progress.betAccumulated) < parseFloat(task.betRequirement)) {
        return { success: false, error: "Bet requirement not met" };
      }

      // Award coins atomically - ensure coinReward is converted to string
      const coinRewardAmount = String(task.coinReward);
      console.log(`[ClaimReward] Awarding coins:`, { 
        userId, 
        originalCoinReward: task.coinReward, 
        coinRewardAmount, 
        coinRewardAmountType: typeof coinRewardAmount 
      });

      const result = await this.atomicIncrementBalance(userId, coinRewardAmount);
      if (!result.success) {
        console.error(`[ClaimReward] Balance increment failed:`, result.error);
        return { success: false, error: "Failed to award coins" };
      }

      console.log(`[ClaimReward] Balance incremented successfully, new balance:`, result.user?.balance);

      // Create a transaction record so BalanceIntegrity service can track this
      await db.insert(transactions).values({
        userId: userId,
        type: "commission_withdrawal",
        cryptoCurrency: "USDT",
        cryptoAmount: coinRewardAmount,
        fiatAmount: coinRewardAmount,
        paymentMethod: "internal",
        status: "completed",
        txHash: `betting-task-${task.id}-${Date.now()}`
      });

      // Mark as completed
      await db
        .update(userBettingTaskProgress)
        .set({ 
          isCompleted: true,
          claimedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(userBettingTaskProgress.userId, userId),
          eq(userBettingTaskProgress.taskId, taskId)
        ));

      console.log(`[ClaimReward] Task marked as completed, returning reward:`, coinRewardAmount);
      return { success: true, reward: coinRewardAmount };
    } catch (error) {
      console.error('Error claiming task reward:', error);
      return { success: false, error: "Internal error" };
    }
  }

  // Whitelisted IP methods
  async getAllWhitelistedIps(): Promise<WhitelistedIp[]> {
    const result = await db.select().from(whitelistedIps).orderBy(desc(whitelistedIps.createdAt));
    return result;
  }

  async getWhitelistedIpByAddress(ipAddress: string): Promise<WhitelistedIp | undefined> {
    const result = await db.select().from(whitelistedIps).where(eq(whitelistedIps.ipAddress, ipAddress));
    return result[0];
  }

  async addWhitelistedIp(data: InsertWhitelistedIp): Promise<WhitelistedIp> {
    const result = await db.insert(whitelistedIps).values(data).returning();
    return result[0];
  }

  async updateWhitelistedIp(id: string, updates: Partial<UpdateWhitelistedIp>): Promise<WhitelistedIp | undefined> {
    const result = await db
      .update(whitelistedIps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whitelistedIps.id, id))
      .returning();
    return result[0];
  }

  async deleteWhitelistedIp(id: string): Promise<boolean> {
    const result = await db.delete(whitelistedIps).where(eq(whitelistedIps.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateWhitelistedIpAccountCount(ipAddress: string, newCount: number): Promise<void> {
    const whitelistedIp = await this.getWhitelistedIpByAddress(ipAddress);
    if (!whitelistedIp) return;

    const updates: any = {
      currentAccountCount: newCount,
      updatedAt: new Date()
    };

    // Check if threshold is exceeded (more than accountCountAtWhitelist)
    if (newCount > whitelistedIp.accountCountAtWhitelist && !whitelistedIp.exceededThreshold) {
      updates.exceededThreshold = true;
      updates.thresholdExceededAt = new Date();
    }

    await db.update(whitelistedIps)
      .set(updates)
      .where(eq(whitelistedIps.ipAddress, ipAddress));
  }

  // Telegram Scheduled Posts methods
  async createTelegramScheduledPost(post: InsertTelegramScheduledPost): Promise<TelegramScheduledPost> {
    const result = await db.insert(telegramScheduledPosts).values({
      ...post,
      scheduleTime: post.scheduleTime || null,
      periodId: post.periodId || null,
    }).returning();
    return result[0];
  }

  async getTelegramScheduledPosts(): Promise<TelegramScheduledPost[]> {
    return await db.select().from(telegramScheduledPosts).orderBy(desc(telegramScheduledPosts.createdAt));
  }

  async getTelegramScheduledPostById(id: string): Promise<TelegramScheduledPost | undefined> {
    const result = await db.select().from(telegramScheduledPosts).where(eq(telegramScheduledPosts.id, id));
    return result[0];
  }

  async updateTelegramScheduledPost(id: string, updates: Partial<TelegramScheduledPost>): Promise<TelegramScheduledPost | undefined> {
    const result = await db
      .update(telegramScheduledPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telegramScheduledPosts.id, id))
      .returning();
    return result[0];
  }

  async deleteTelegramScheduledPost(id: string): Promise<boolean> {
    const result = await db.delete(telegramScheduledPosts).where(eq(telegramScheduledPosts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getActiveTelegramScheduledPosts(): Promise<TelegramScheduledPost[]> {
    return await db.select().from(telegramScheduledPosts)
      .where(eq(telegramScheduledPosts.status, 'active'))
      .orderBy(asc(sql`COALESCE(${telegramScheduledPosts.scheduleTime}, '')`));
  }

  async updateScheduledPostSentStatus(id: string, sentAt: Date, repeatDaily: boolean): Promise<TelegramScheduledPost | undefined> {
    const updateData: any = { 
      lastSentAt: sentAt,
      sentCount: sql`${telegramScheduledPosts.sentCount} + 1`,
      updatedAt: new Date()
    };
    
    if (!repeatDaily) {
      updateData.status = 'completed';
    }
    
    const result = await db
      .update(telegramScheduledPosts)
      .set(updateData)
      .where(eq(telegramScheduledPosts.id, id))
      .returning();
    return result[0];
  }


  // Advanced Personalized Crash Settings
  async getAdvancedCrashSettings(): Promise<AdvancedCrashSetting | undefined> {
    const [settings] = await db.select().from(advancedCrashSettings).limit(1);
    return settings || undefined;
  }

  async updateAdvancedCrashSettings(updates: Partial<AdvancedCrashSetting>): Promise<AdvancedCrashSetting | undefined> {
    const [existing] = await db.select().from(advancedCrashSettings).limit(1);
    
    if (existing) {
      const [updated] = await db
        .update(advancedCrashSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(advancedCrashSettings.id, existing.id))
        .returning();
      return updated;
    }
    
    const id = randomUUID();
    const [newSettings] = await db
      .insert(advancedCrashSettings)
      .values({
        id,
        deepThinkingEnabled: updates.deepThinkingEnabled ?? true,
        whaleTargetMinMultiplier: updates.whaleTargetMinMultiplier ?? "1.01",
        whaleTargetMaxMultiplier: updates.whaleTargetMaxMultiplier ?? "1.04",
        noBetBaitMinMultiplier: updates.noBetBaitMinMultiplier ?? "7.00",
        noBetBaitMaxMultiplier: updates.noBetBaitMaxMultiplier ?? "20.00",
        standardLossMaxThreshold: updates.standardLossMaxThreshold ?? "2.00",
        playerWinProbability: updates.playerWinProbability ?? "40.00",
        updatedBy: updates.updatedBy ?? 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    return newSettings;
  }
}

// Simple in-memory storage implementation
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private games = new Map<string, Game>();
  private bets = new Map<string, Bet>();
  private transactions = new Map<string, Transaction>();
  private referrals = new Map<string, Referral>();
  private adminActions = new Map<string, AdminAction>();
  private gameAnalytics = new Map<string, GameAnalytics>();
  private userSessions = new Map<string, UserSession>();
  private deviceLogins = new Map<string, DeviceLogin>();
  private systemSettings = new Map<string, SystemSetting>();
  private telegramAutoJoinChannels = new Map<string, TelegramAutoJoinChannel>();
  private agentProfiles = new Map<string, AgentProfile>();
  private agentActivities = new Map<string, AgentActivity>();
  private passkeys = new Map<string, Passkey>();
  private goldenLiveStats = new Map<string, GoldenLiveStats>();
  private goldenLiveEvents = new Map<string, GoldenLiveEvent>();
  private pageViews = new Map<string, PageView>();
  private vipSettings = new Map<string, VipSetting>();
  private notifications = new Map<string, Notification>();
  private pushSubscriptions = new Map<string, PushSubscription>();
  private promoCodes = new Map<string, PromoCode>();
  private bettingTasks = new Map<string, BettingTask>();
  private userBettingTaskProgress = new Map<string, UserBettingTaskProgress>();
  private promoCodeRedemptions = new Map<string, PromoCodeRedemption>();
  private predictedResults = new Map<string, PredictedResult>();
  private supportChatSessions = new Map<string, SupportChatSession>();
  private supportChatMessages = new Map<string, SupportChatMessage>();
  private quickReplies = new Map<string, QuickReply>();
  private telegramLoginSessions = new Map<string, { userId?: string; expiresAt: Date }>();
  private depositRequests = new Map<string, DepositRequest>();
  private crashSettings = new Map<string, CrashSetting>();
  private advancedCrashSettings = new Map<string, AdvancedCrashSetting>();
  private telegramScheduledPostsMap = new Map<string, TelegramScheduledPost>();
  private nextUserId = 1;
  private nextGameId = 1;
  private nextBetId = 1;
  private nextTransactionId = 1;
  private nextReferralId = 1;
  private nextAdminActionId = 1;
  private nextAnalyticsId = 1;
  private nextSessionId = 1;
  private nextDeviceLoginId = 1;
  private nextAgentProfileId = 1;
  private nextAgentActivityId = 1;
  private nextPasskeyId = 1;
  private nextGoldenLiveStatsId = 1;
  private nextGoldenLiveEventId = 1;
  private nextPageViewId = 1;
  private nextVipSettingId = 1;
  private nextNotificationId = 1;
  private nextPromoCodeId = 1;
  private nextPromoCodeRedemptionId = 1;
  private nextPredictedResultId = 1;
  private nextDepositRequestId = 1;
  private hourlyTimer: NodeJS.Timeout | null = null;

  private initializationPromise: Promise<void>;

  constructor() {
    this.initializeSystemSettings();
    this.initializeGoldenLive();
    this.initializeVipSettings();
    this.initializationPromise = this.initializeDefaultData().then(() => {
      this.initializeTrafficData();
      this.initializeCrashSettings();
      this.initializeAdvancedCrashSettings();
    });
  }

  async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  private initializeSystemSettings() {
    const defaultSettings = [
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

    for (const setting of defaultSettings) {
      this.systemSettings.set(setting.id, setting);
    }
    console.log('✅ Default system settings initialized');
  }

  private async initializeDefaultData() {
    // Create demo admin user
    const adminPasswordHash = await bcrypt.hash('admin1234', 10);
    const adminPublicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    const adminUser: User = {
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

    // Create demo players with different countries for realistic geography data
    const demoCountries = ['IN', 'US', 'GB', 'AU', 'CA'];
    const demoIPs = ['192.168.1.10', '192.168.1.20', '192.168.1.30', '192.168.1.40', '192.168.1.50'];
    
    for (let i = 1; i <= 5; i++) {
      const playerPasswordHash = await bcrypt.hash('demo123', 10);
      const playerPublicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
      const playerUser: User = {
        id: `player-${i}`,
        publicId: playerPublicId,
        email: `player${i}@demo.com`,
        passwordHash: playerPasswordHash,
        withdrawalPasswordHash: null,
        profilePhoto: null,
        balance: "1000.00000000",
        frozenBalance: "0.00000000",
        accumulatedFee: "0.00000000",
        role: "user",
        vipLevel: "vip",
        isActive: true,
        referralCode: `DEMO${i}23`,
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
    }
  }

  private initializeTrafficData() {
    const now = new Date();
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Sri Lanka'];
    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
    const paths = ['/', '/games', '/deposit', '/withdraw', '/profile', '/history', '/referral'];
    
    // Generate page views for the last 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      
      // Generate 50-150 page views per day
      const pageViewsPerDay = Math.floor(Math.random() * 100) + 50;
      
      for (let i = 0; i < pageViewsPerDay; i++) {
        const id = `pageview-${this.nextPageViewId++}`;
        const randomDevice = devices[Math.floor(Math.random() * devices.length)];
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];
        const randomBrowser = browsers[Math.floor(Math.random() * browsers.length)];
        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        
        // Randomize the time within the day
        const randomHour = Math.floor(Math.random() * 24);
        const randomMinute = Math.floor(Math.random() * 60);
        const pageViewDate = new Date(date);
        pageViewDate.setHours(randomHour, randomMinute, 0, 0);
        
        // Generate a random IP address
        const randomIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        
        const pageView: PageView = {
          id,
          userId: null,
          path: randomPath,
          ipAddress: randomIP,
          country: randomCountry,
          userAgent: `Mozilla/5.0 (${randomDevice})`,
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
    
    console.log(`✅ Demo traffic data initialized (${this.pageViews.size} page views)`);
  }

  private initializeVipTelegramLinks(adminId: string) {
    const defaultTelegramLinks = [
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

    for (const linkData of defaultTelegramLinks) {
      const id = `vip-tg-link-${this.nextVipTelegramLinkId++}`;
      const link: VipLevelTelegramLink = {
        id,
        vipLevel: linkData.vipLevel as any,
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
  }

  private initializeVipSettings() {
    const vipLevels = [
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

    for (const level of vipLevels) {
      const id = `vip-setting-${this.nextVipSettingId++}`;
      const vipSetting: VipSetting = {
        id,
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
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.telegramId === telegramId);
  }

  async createTelegramLinkToken(userId: string, expiryMinutes: number = 5): Promise<{ token: string; expiresAt: Date }> {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    const user = this.users.get(userId);
    if (user) {
      user.telegramLinkToken = token;
      user.telegramLinkExpiresAt = expiresAt;
      this.users.set(userId, user);
    }
    
    return { token, expiresAt };
  }

  async getUserByLinkToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    const user = Array.from(this.users.values()).find(u => u.telegramLinkToken === token);
    
    if (!user) return undefined;
    
    if (user.telegramLinkExpiresAt && new Date(user.telegramLinkExpiresAt) < new Date()) {
      return undefined;
    }
    
    return user;
  }

  async linkTelegramAccount(userId: string, telegramData: { id: string; username?: string; first_name?: string; photo_url?: string }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.telegramId = telegramData.id.toString();
    user.telegramUsername = telegramData.username || null;
    user.telegramFirstName = telegramData.first_name || null;
    user.telegramPhotoUrl = telegramData.photo_url || null;
    user.telegramLinkToken = null;
    user.telegramLinkExpiresAt = null;
    
    this.users.set(userId, user);
    return user;
  }

  // Crash settings
  async initializeCrashSettings() {
    if (this.crashSettings.size === 0) {
      const id = randomUUID();
      this.crashSettings.set(id, {
        id,
        houseEdge: "20.00",
        maxMultiplier: "50.00",
        minCrashMultiplier: "1.01",
        crashEnabled: true,
        updatedBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async initializeAdvancedCrashSettings() {
    if (this.advancedCrashSettings.size === 0) {
      const id = randomUUID();
      this.advancedCrashSettings.set(id, {
        id,
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
  }

  async clearTelegramLinkToken(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.telegramLinkToken = null;
    user.telegramLinkExpiresAt = null;
    
    this.users.set(userId, user);
    return user;
  }

  // Telegram login session methods - now using database for persistence
  async createTelegramLoginSession(token: string, expiryMinutes: number = 5): Promise<void> {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    await db.insert(telegramLoginSessions).values({
      token,
      expiresAt,
      userId: null
    });
  }

  async getTelegramLoginSession(token: string): Promise<{ userId?: string; expiresAt: Date } | undefined> {
    const [session] = await db.select()
      .from(telegramLoginSessions)
      .where(eq(telegramLoginSessions.token, token))
      .limit(1);
    
    if (!session) {
      return undefined;
    }
    
    // Check if expired
    if (session.expiresAt < new Date()) {
      await db.delete(telegramLoginSessions)
        .where(eq(telegramLoginSessions.token, token));
      return undefined;
    }
    
    return {
      userId: session.userId || undefined,
      expiresAt: session.expiresAt
    };
  }

  async completeTelegramLogin(token: string, userId: string): Promise<void> {
    await db.update(telegramLoginSessions)
      .set({ userId })
      .where(eq(telegramLoginSessions.token, token));
  }

  async deleteTelegramLoginSession(token: string): Promise<void> {
    await db.delete(telegramLoginSessions)
      .where(eq(telegramLoginSessions.token, token));
  }
  
  // Telegram auto-join channels methods
  async createTelegramAutoJoinChannel(channel: InsertTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel> {
    const [created] = await db.insert(telegramAutoJoinChannels)
      .values(channel)
      .returning();
    return created;
  }
  
  async getTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]> {
    return await db.select()
      .from(telegramAutoJoinChannels)
      .orderBy(asc(telegramAutoJoinChannels.priority), asc(telegramAutoJoinChannels.createdAt));
  }
  
  async getEnabledTelegramAutoJoinChannels(): Promise<TelegramAutoJoinChannel[]> {
    return await db.select()
      .from(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.isEnabled, true))
      .orderBy(asc(telegramAutoJoinChannels.priority), asc(telegramAutoJoinChannels.createdAt));
  }
  
  async getTelegramAutoJoinChannel(id: string): Promise<TelegramAutoJoinChannel | undefined> {
    const [channel] = await db.select()
      .from(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.id, id))
      .limit(1);
    return channel;
  }
  
  async updateTelegramAutoJoinChannel(id: string, updates: UpdateTelegramAutoJoinChannel): Promise<TelegramAutoJoinChannel | undefined> {
    const [updated] = await db.update(telegramAutoJoinChannels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telegramAutoJoinChannels.id, id))
      .returning();
    return updated;
  }
  
  async deleteTelegramAutoJoinChannel(id: string): Promise<boolean> {
    const result = await db.delete(telegramAutoJoinChannels)
      .where(eq(telegramAutoJoinChannels.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createUser(insertUser: InsertUser, registrationIp?: string, registrationCountry?: string): Promise<User> {
    const id = `user-${this.nextUserId++}`;
    const passwordHash = await bcrypt.hash(insertUser.password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    
    // Check if referral code was provided to link with referrer
    let referrerId: string | null = null;
    if (insertUser.referralCode) {
      const referrer = Array.from(this.users.values()).find(user => user.referralCode === insertUser.referralCode);
      if (referrer) {
        referrerId = referrer.id;
      }
    }
    
    const user: User = {
      id,
      publicId,
      email: insertUser.email,
      passwordHash,
      withdrawalPasswordHash: insertUser.withdrawalPassword 
        ? await bcrypt.hash(insertUser.withdrawalPassword, 10) 
        : null,
      profilePhoto: null,
      referralCode,
      referredBy: referrerId,
      referralLevel: 1,
      balance: "0.09000000",
      frozenBalance: "0.00000000",
      accumulatedFee: "0.00000000",
      role: "user",
      vipLevel: "lv1",
      isActive: true,
      registrationIp: registrationIp || null,
      registrationCountry: registrationCountry || null,
      lastLoginIp: registrationIp || null,
      lastLoginDeviceModel: null,
      lastLoginDeviceType: null,
      lastLoginDeviceOs: null,
      lastLoginBrowser: null,
      telegramId: insertUser.telegramId || null,
      telegramLinkToken: null,
      telegramLinkExpiresAt: null,
      telegramUsername: null,
      telegramFirstName: null,
      telegramPhotoUrl: null,
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
      twoFactorEnabled: false,
      twoFactorSecret: null,
      isBanned: false,
      bannedUntil: null,
      banReason: null,
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
    
    this.users.set(id, user);
    
    // If user was referred, create referral record and award bonus coins to both parties
    if (referrerId) {
      try {
        // Create referral record
        const referralId = `referral-${this.nextReferralId++}`;
        const referral: Referral = {
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
        
        // Increment referrer's total team members count
        const referrerUser = this.users.get(referrerId);
        if (referrerUser) {
          this.users.set(referrerId, {
            ...referrerUser,
            totalTeamMembers: (referrerUser.totalTeamMembers || 0) + 1,
            updatedAt: new Date()
          });
        }
        
        // Bonus will be awarded to referrer only when new user makes first deposit >= $10
        
      } catch (error) {
        console.error('Error processing referral bonus:', error);
        // Continue with user creation even if referral bonus fails
      }
    }
    
    return user;
  }

  async validateUser(credentials: LoginUser): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (user && await bcrypt.compare(credentials.password, user.passwordHash)) {
      return user;
    }
    return undefined;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<User | undefined> {
    return this.updateUser(userId, { balance: newBalance });
  }

  async atomicDeductBalance(
    userId: string, 
    amount: string, 
    options?: { incrementTotalBets?: boolean; incrementDailyWager?: boolean }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const deductAmount = parseFloat(amount);
      
      // Validation
      if (isNaN(deductAmount) || deductAmount <= 0) {
        return { success: false, error: 'Invalid amount' };
      }
      
      // Get user
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Check balance
      const currentBalance = parseFloat(user.balance);
      if (currentBalance < deductAmount) {
        return { success: false, error: 'Insufficient balance' };
      }
      
      // Atomically deduct balance and update totals
      const newBalance = (currentBalance - deductAmount).toFixed(8);
      const currentTotalBets = parseFloat(user.totalBetsAmount || '0');
      const newTotalBets = options?.incrementTotalBets 
        ? (currentTotalBets + deductAmount).toFixed(8)
        : user.totalBetsAmount;
      
      const currentDailyWager = parseFloat(user.dailyWagerAmount || '0');
      const newDailyWager = options?.incrementDailyWager
        ? (currentDailyWager + deductAmount).toFixed(8)
        : user.dailyWagerAmount;
      
      // Update user object
      const updatedUser = {
        ...user,
        balance: newBalance,
        totalBetsAmount: newTotalBets,
        dailyWagerAmount: newDailyWager,
        updatedAt: new Date()
      };
      
      this.users.set(userId, updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Atomic balance deduction error:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  async atomicIncrementBalance(
    userId: string, 
    amount: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const incrementAmount = parseFloat(amount);
      
      // Validation
      if (isNaN(incrementAmount) || incrementAmount <= 0) {
        return { success: false, error: 'Invalid amount' };
      }
      
      // Get user
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Atomically increment balance
      const currentBalance = parseFloat(user.balance);
      const newBalance = (currentBalance + incrementAmount).toFixed(8);
      
      // Update user object
      const updatedUser = {
        ...user,
        balance: newBalance,
        updatedAt: new Date()
      };
      
      this.users.set(userId, updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Atomic balance increment error:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  async generateReferralCode(userId: string): Promise<string> {
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.updateUser(userId, { referralCode });
    return referralCode;
  }

  async getUsersByRegistrationIp(ipAddress: string): Promise<User[]> {
    if (!ipAddress) return [];
    
    return Array.from(this.users.values()).filter(
      user => user.registrationIp === ipAddress
    );
  }

  // Placeholder implementations for all other methods
  async getAllUsers(page?: number, limit?: number): Promise<{ users: User[]; total: number }> {
    const userList = Array.from(this.users.values());
    return { users: userList, total: userList.length };
  }

  async toggleUserStatus(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    return this.updateUser(userId, { isActive: !user.isActive });
  }

  async banUser(userId: string, reason: string, bannedUntil?: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    return this.updateUser(userId, {
      isBanned: true,
      bannedUntil: bannedUntil || null,
      banReason: reason,
      isActive: false
    });
  }

  async unbanUser(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    return this.updateUser(userId, {
      isBanned: false,
      bannedUntil: null,
      banReason: null,
      isActive: true
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!this.users.has(userId)) return false;
    this.users.delete(userId);
    return true;
  }

  async adjustUserBalance(userId: string, amount: string, adminId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const currentBalance = parseFloat(user.balance);
    const adjustment = parseFloat(amount);
    const newBalance = (currentBalance + adjustment).toFixed(8);
    
    return this.updateUser(userId, { balance: newBalance });
  }

  async createGame(game: InsertGame): Promise<Game> {
    // Use gameId as the unique identifier to prevent duplicate keys
    const id = game.gameId;
    const newGame: Game = {
      id,
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
    return newGame;
  }

  async getActiveGame(roundDuration: number): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.status === "active");
  }

  async updateGameResult(gameId: string, result: number, resultColor: string, resultSize: string): Promise<Game | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    
    const updatedGame = {
      ...game,
      result,
      resultColor,
      resultSize,
      status: "completed" as const,
      updatedAt: new Date()
    };
    
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  // Simplified implementations for remaining methods
  async setManualGameResult(gameId: string, result: number, adminId: string): Promise<Game | undefined> {
    // ONLY schedule the manual result - don't complete the game
    // Find game by gameId (not id)
    const game = Array.from(this.games.values()).find(g => g.gameId === gameId);
    if (!game) return undefined;
    
    const updatedGame = {
      ...game,
      manualResult: result,
      isManuallyControlled: true,
      updatedAt: new Date()
      // ✅ Don't set: result, resultColor, resultSize, status
    };
    
    this.games.set(game.id, updatedGame);
    console.log(`🎯 Manual result ${result} scheduled for game ${gameId} (MemStorage)`);
    return updatedGame;
  }

  async getGameHistory(limit?: number): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => 
        game.status === "completed" && 
        game.result !== null && 
        game.result !== undefined && 
        game.result >= 1 && 
        game.result <= 9
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit || 50);
  }

  async getGameById(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameByGameId(gameId: string): Promise<Game | undefined> {
    // Search through all games to find one with matching gameId
    return Array.from(this.games.values()).find(game => game.gameId === gameId);
  }

  async updateGameStats(gameId: string, stats: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...stats, updatedAt: new Date() };
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  // Bet methods (simplified)
  async createBet(bet: InsertBet & { potential: string }, maxBetLimit?: number): Promise<Bet> {
    // If maxBetLimit is provided, check total bets for this period
    if (maxBetLimit !== undefined) {
      const userBets = Array.from(this.bets.values()).filter(
        b => b.userId === bet.userId && b.gameId === bet.gameId
      );
      
      const existingTotal = userBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const newTotal = existingTotal + parseFloat(bet.amount);
      
      if (newTotal > maxBetLimit) {
        throw new Error(`Your reached maximum bet limit for this period`);
      }
    }
    
    const id = `bet-${this.nextBetId++}`;
    const newBet: Bet = {
      id,
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
    return newBet;
  }

  async createBetAndUpdateBalance(bet: InsertBet & { potential: string }, newBalance: string, maxBetLimit?: number, newAccumulatedFee?: string): Promise<Bet> {
    // Atomic operation: check limit + create bet + update balance
    if (maxBetLimit !== undefined) {
      const userBets = Array.from(this.bets.values()).filter(
        b => b.userId === bet.userId && b.gameId === bet.gameId
      );
      
      const existingTotal = userBets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const newTotal = existingTotal + parseFloat(bet.amount);
      
      if (newTotal > maxBetLimit) {
        throw new Error(`Your reached maximum bet limit for this period`);
      }
    }
    
    // Create bet
    const id = `bet-${this.nextBetId++}`;
    const newBet: Bet = {
      id,
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
    
    // Update balance, remainingRequiredBetAmount, and accumulatedFee
    const user = this.users.get(bet.userId);
    if (user) {
      // Decrease remainingRequiredBetAmount by bet amount (clamped to 0)
      const currentRemaining = parseFloat(user.remainingRequiredBetAmount || '0');
      const betAmount = parseFloat(bet.amount);
      const newRemaining = Math.max(0, currentRemaining - betAmount).toFixed(8);
      
      const updateData: any = { 
        ...user, 
        balance: newBalance,
        remainingRequiredBetAmount: newRemaining,
        updatedAt: new Date()
      };
      
      // Only update accumulatedFee if provided
      if (newAccumulatedFee !== undefined) {
        updateData.accumulatedFee = newAccumulatedFee;
      }
      
      this.users.set(bet.userId, updateData);
    }
    
    return newBet;
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.userId === userId);
  }

  async getBetsByGame(gameId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.gameId === gameId);
  }

  async getUserTotalBetAmountForGame(userId: string, gameId: string): Promise<number> {
    const userBets = Array.from(this.bets.values()).filter(
      bet => bet.userId === userId && bet.gameId === gameId
    );
    
    const total = userBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    return total;
  }

  async updateBetStatus(betId: string, status: "pending" | "won" | "lost" | "cashed_out", actualPayout?: string): Promise<Bet | undefined> {
    const bet = this.bets.get(betId);
    if (!bet) return undefined;
    
    const updatedBet = { 
      ...bet, 
      status,
      updatedAt: new Date()
    };
    if (actualPayout !== undefined) {
      updatedBet.actualPayout = actualPayout;
    }
    this.bets.set(betId, updatedBet);
    return updatedBet;
  }

  async getActiveBetsByUser(userId: string): Promise<any[]> {
    const activeBets = Array.from(this.bets.values()).filter(bet => bet.userId === userId && bet.status === 'pending');
    
    return activeBets.map(bet => {
      const game = this.games.get(bet.gameId);
      return {
        ...bet,
        periodId: game?.gameId || null
      };
    });
  }

  async getAllPendingBets(): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.status === 'pending');
  }

  // Crash game specific bet methods
  async updateBetForCashout(betId: string, cashOutMultiplier: string, cashedOutAt: Date): Promise<Bet | undefined> {
    const bet = this.bets.get(betId);
    if (!bet) return undefined;
    
    const updatedBet = { 
      ...bet, 
      status: "cashed_out" as const,
      cashOutMultiplier,
      cashedOutAt,
      updatedAt: cashedOutAt
    };
    this.bets.set(betId, updatedBet);
    return updatedBet;
  }

  async updateBetIfPending(betId: string, newStatus: "won" | "lost" | "cashed_out", additionalUpdates?: Partial<Bet>): Promise<boolean> {
    const bet = this.bets.get(betId);
    if (!bet || bet.status !== 'pending') return false;
    
    const updatedBet = { 
      ...bet, 
      status: newStatus,
      updatedAt: new Date(),
      ...additionalUpdates
    };
    this.bets.set(betId, updatedBet);
    return true;
  }

  async getUserActiveCrashBet(userId: string, gameId: string): Promise<Bet | undefined> {
    const userBets = Array.from(this.bets.values()).filter(bet => 
      bet.userId === userId && 
      bet.gameId === gameId && 
      bet.betType === 'crash' && 
      bet.status === 'pending'
    );
    return userBets[0]; // Return first active crash bet for this user/game
  }

  async cleanupUserBetHistory(userId: string): Promise<void> {
    const userBets = Array.from(this.bets.values())
      .filter(bet => bet.userId === userId && bet.betType === 'crash')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (userBets.length > 100) {
      const toDelete = userBets.slice(100);
      toDelete.forEach(bet => this.bets.delete(bet.id));
      console.log(`🧹 [MEM-CLEANUP] Removed ${toDelete.length} old crash bets for user ${userId}`);
    }
  }

  // Stub implementations for remaining methods
  async createReferral(referral: InsertReferral): Promise<Referral> { 
    const id = `ref-${this.nextReferralId++}`;
    const newReferral: Referral = {
      id,
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
    return newReferral;
  }
  async getReferralsByUser(userId: string): Promise<Referral[]> { 
    return Array.from(this.referrals.values()).filter(ref => ref.referrerId === userId);
  }
  async updateReferralCommission(referralId: string, commission: string): Promise<Referral | undefined> { 
    const referral = this.referrals.get(referralId);
    if (!referral) return undefined;
    
    const updated = { ...referral, totalCommission: commission };
    this.referrals.set(referralId, updated);
    return updated;
  }
  async updateReferralHasDeposited(referralId: string, hasDeposited: boolean): Promise<Referral | undefined> {
    const referral = this.referrals.get(referralId);
    if (!referral) return undefined;
    
    // Atomic check: only update if currently false (prevents race conditions)
    if (referral.hasDeposited === true) {
      return undefined; // Already deposited, don't update
    }
    
    const updated = { ...referral, hasDeposited };
    this.referrals.set(referralId, updated);
    return updated;
  }
  async getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: string }> { 
    const userReferrals = Array.from(this.referrals.values()).filter(ref => ref.referrerId === userId);
    const totalReferrals = userReferrals.length;
    const totalCommission = userReferrals.reduce((sum, ref) => {
      return (parseFloat(sum) + parseFloat(ref.totalCommission || "0")).toFixed(8);
    }, "0.00000000");
    
    return { totalReferrals, totalCommission }; 
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> { 
    const id = `txn-${this.nextTransactionId++}`;
    const newTransaction: Transaction = {
      id,
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
    return newTransaction;
  }
  async getTransactionsByUser(userId: string): Promise<Transaction[]> { 
    return Array.from(this.transactions.values()).filter(tx => tx.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getTransactionByExternalId(externalId: string): Promise<Transaction | undefined> { 
    return Array.from(this.transactions.values()).find(tx => tx.externalId === externalId);
  }
  
  async getTransactionById(transactionId: string): Promise<Transaction | undefined> {
    return this.transactions.get(transactionId);
  }
  
  async updateTransactionStatus(transactionId: string, status: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined> { 
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return undefined;
    
    const updatedTransaction = {
      ...transaction,
      status,
      updatedAt: new Date()
    };
    
    this.transactions.set(transactionId, updatedTransaction);
    
    // If transaction is completed and is a deposit, update user VIP level and handle referral
    if (status === "completed" && transaction.type === "deposit") {
      await this.updateUserVipLevel(transaction.userId);
      
      // Check if user was referred and if deposit meets minimum requirement ($10)
      const depositAmount = parseFloat(transaction.fiatAmount || "0");
      if (depositAmount >= 10) {
        // Find if this user was referred
        const referral = Array.from(this.referrals.values()).find(ref => ref.referredId === transaction.userId);
        
        if (referral && !referral.hasDeposited) {
          // Update referral hasDeposited flag
          const updatedReferral = { ...referral, hasDeposited: true };
          this.referrals.set(referral.id, updatedReferral);
          
          // Increment referrer's teamSize
          const referrer = await this.getUser(referral.referrerId);
          if (referrer) {
            await this.updateUser(referral.referrerId, {
              teamSize: (referrer.teamSize || 0) + 1
            });
            
            // Update referrer's VIP level based on new teamSize
            await this.updateUserVipLevel(referral.referrerId);
          }
        }
      }
    }
    
    return updatedTransaction;
  }
  async updateTransactionStatusConditional(transactionId: string, newStatus: "pending" | "completed" | "failed" | "cancelled", currentStatus: "pending" | "completed" | "failed" | "cancelled"): Promise<Transaction | undefined> { 
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== currentStatus) return undefined;
    
    const updatedTransaction = {
      ...transaction,
      status: newStatus,
      updatedAt: new Date()
    };
    
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }
  async getPendingTransactions(): Promise<Transaction[]> { return []; }

  // Coin flip game methods
  private coinFlipGames = new Map<string, CoinFlipGame>();
  private nextCoinFlipGameId = 1;

  async createCoinFlipGame(game: InsertCoinFlipGame): Promise<CoinFlipGame> {
    const id = `coinflip-${this.nextCoinFlipGameId++}`;
    const newGame: CoinFlipGame = {
      id,
      ...game,
      winAmount: game.winAmount ?? null,
      createdAt: new Date(),
    };
    this.coinFlipGames.set(id, newGame);
    return newGame;
  }

  async getCoinFlipGamesByUser(userId: string, limit: number = 10): Promise<CoinFlipGame[]> {
    return Array.from(this.coinFlipGames.values())
      .filter(game => game.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async getUsersWithRecentActivity(minutesAgo: number): Promise<User[]> {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    const userIdsWithActivity = new Set<string>();
    
    for (const tx of Array.from(this.transactions.values())) {
      if (tx.createdAt.getTime() >= cutoffTime) {
        userIdsWithActivity.add(tx.userId);
      }
    }
    
    return Array.from(userIdsWithActivity)
      .map(id => this.users.get(id))
      .filter((u): u is User => u !== undefined);
  }
  
  async getRecentDeposits(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    return Array.from(this.transactions.values())
      .filter(tx => tx.type === 'deposit' && tx.createdAt.getTime() >= cutoffTime)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getRecentWithdrawals(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    return Array.from(this.transactions.values())
      .filter(tx => tx.type === 'withdrawal' && tx.createdAt.getTime() >= cutoffTime)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getRecentTransactions(minutesAgo: number): Promise<Transaction[]> {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    return Array.from(this.transactions.values())
      .filter(tx => tx.createdAt.getTime() >= cutoffTime)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100);
  }

  async logAdminAction(action: InsertAdminAction): Promise<AdminAction> { 
    const id = `admin-${this.nextAdminActionId++}`;
    const newAction: AdminAction = {
      id,
      adminId: action.adminId,
      action: action.action,
      targetId: action.targetId || null,
      details: action.details,
      createdAt: new Date()
    };
    this.adminActions.set(id, newAction);
    return newAction;
  }
  async getAdminActions(page?: number, limit?: number): Promise<{ actions: AdminAction[]; total: number }> { return { actions: [], total: 0 }; }

  async createGameAnalytics(analytics: InsertGameAnalytics): Promise<GameAnalytics> { 
    const id = `analytics-${this.nextAnalyticsId++}`;
    const newAnalytics: GameAnalytics = {
      id,
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
    return newAnalytics;
  }
  async updateGameAnalytics(gameId: string, updates: Partial<GameAnalytics>): Promise<GameAnalytics | undefined> { return undefined; }
  async getAnalyticsByGame(gameId: string): Promise<GameAnalytics | undefined> { return undefined; }
  async getOverallAnalytics(): Promise<{ totalGames: number; totalBets: number; totalVolume: string; totalProfit: string; averageBetSize: string; }> {
    const completedGames = Array.from(this.games.values()).filter(g => g.status === 'completed');
    const totalGames = completedGames.length;
    
    let totalVolume = 0;
    let totalProfit = 0;
    
    // Calculate totals from completed games
    for (const game of completedGames) {
      if (game.totalBetsAmount) {
        totalVolume += parseFloat(game.totalBetsAmount);
      }
      if (game.houseProfit) {
        totalProfit += parseFloat(game.houseProfit);
      }
    }
    
    const totalBets = this.bets.size;
    const averageBetSize = totalBets > 0 
      ? (totalVolume / totalBets).toFixed(8)
      : "0.00000000";
    
    return { 
      totalGames, 
      totalBets, 
      totalVolume: totalVolume.toFixed(8), 
      totalProfit: totalProfit.toFixed(8), 
      averageBetSize 
    };
  }

  async createUserSession(session: InsertUserSession): Promise<UserSession> { 
    const id = `session-${this.nextSessionId++}`;
    const newSession: UserSession = {
      id,
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
    return newSession;
  }
  async getUserSessions(userId: string): Promise<UserSession[]> { 
    return Array.from(this.userSessions.values()).filter(session => session.userId === userId);
  }
  async updateSessionStatus(sessionId: string, isActive: boolean): Promise<UserSession | undefined> { return undefined; }

  // Device login tracking methods (simple implementation for MemStorage)
  async createDeviceLogin(deviceLogin: InsertDeviceLogin): Promise<DeviceLogin> {
    const id = `device-login-${this.nextDeviceLoginId++}`;
    const newDeviceLogin: DeviceLogin = {
      id,
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
    return newDeviceLogin;
  }

  async getUserDeviceLogins(userId: string, limit: number = 50): Promise<DeviceLogin[]> {
    return Array.from(this.deviceLogins.values())
      .filter(login => login.userId === userId)
      .sort((a, b) => b.loginAt.getTime() - a.loginAt.getTime())
      .slice(0, limit);
  }

  async clearUserSessions(userId: string): Promise<number> {
    const keysToDelete: string[] = [];
    Array.from(this.userSessions.entries()).forEach(([key, session]) => {
      if (session.userId === userId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.userSessions.delete(key));
    return keysToDelete.length;
  }

  async clearDeviceLogins(userId: string): Promise<number> {
    const keysToDelete: string[] = [];
    Array.from(this.deviceLogins.entries()).forEach(([key, login]) => {
      if (login.userId === userId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.deviceLogins.delete(key));
    return keysToDelete.length;
  }

  // Page view tracking methods (simple implementation for MemStorage)
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const id = `pageview-${this.nextPageViewId++}`;
    const newPageView: PageView = {
      id,
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
    return newPageView;
  }
  async getDailyVisitors(date?: Date): Promise<{ uniqueVisitors: number; totalPageViews: number }> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const uniqueIPs = new Set<string>();
    let totalPageViews = 0;

    for (const pageView of Array.from(this.pageViews.values())) {
      if (pageView.createdAt >= startOfDay && pageView.createdAt < endOfDay) {
        totalPageViews++;
        uniqueIPs.add(pageView.ipAddress);
      }
    }

    return {
      uniqueVisitors: uniqueIPs.size,
      totalPageViews,
    };
  }
  async getTrafficStats(startDate: Date, endDate: Date): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    topPages: Array<{ path: string; views: number }>;
    deviceBreakdown: Array<{ deviceType: string; count: number }>;
    countryBreakdown: Array<{ country: string; count: number }>;
    dailyStats: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
  }> {
    const uniqueIPs = new Set<string>();
    const pathCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const dailyData = new Map<string, { ips: Set<string>; count: number }>();

    for (const pageView of Array.from(this.pageViews.values())) {
      if (pageView.createdAt >= startDate && pageView.createdAt < endDate) {
        // Total page views and unique visitors
        uniqueIPs.add(pageView.ipAddress);

        // Top pages
        pathCounts.set(pageView.path, (pathCounts.get(pageView.path) || 0) + 1);

        // Device breakdown
        const device = pageView.deviceType || 'Unknown';
        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);

        // Country breakdown
        const country = pageView.country || 'Unknown';
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

        // Daily stats
        const dateStr = pageView.createdAt.toISOString().split('T')[0];
        if (!dailyData.has(dateStr)) {
          dailyData.set(dateStr, { ips: new Set(), count: 0 });
        }
        const dayData = dailyData.get(dateStr)!;
        dayData.ips.add(pageView.ipAddress);
        dayData.count++;
      }
    }

    // Sort and format top pages
    const topPages = Array.from(pathCounts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Format device breakdown
    const deviceBreakdown = Array.from(deviceCounts.entries())
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count);

    // Format country breakdown
    const countryBreakdown = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Format daily stats
    const dailyStats = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        pageViews: data.count,
        uniqueVisitors: data.ips.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPageViews: Array.from(this.pageViews.values()).filter(
        pv => pv.createdAt >= startDate && pv.createdAt < endDate
      ).length,
      uniqueVisitors: uniqueIPs.size,
      topPages,
      deviceBreakdown,
      countryBreakdown,
      dailyStats,
    };
  }

  // Password reset methods (simple implementation for MemStorage)
  async createPasswordResetToken(email: string): Promise<string> {
    const token = randomUUID();
    // In production, this would be stored with expiration
    return token;
  }
  async validatePasswordResetToken(token: string): Promise<string | null> {
    // Simple implementation - in production this would check expiration
    return "demo@example.com"; // Placeholder email
  }
  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.updateUser(user.id, { passwordHash });
    return true;
  }
  async markPasswordResetTokenUsed(token: string): Promise<void> {
    // Simple implementation - in production this would mark token as used
  }

  // 2FA methods (using the same pending2FASetups Map)
  async startPending2FASetup(userId: string, secret: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    pending2FASetups.set(userId, { secret, expiresAt });
    return true;
  }
  async getPending2FASecret(userId: string): Promise<string | null> {
    const pending = pending2FASetups.get(userId);
    if (!pending || pending.expiresAt < new Date()) {
      pending2FASetups.delete(userId);
      return null;
    }
    return pending.secret;
  }
  async completePending2FASetup(userId: string): Promise<User | undefined> {
    const secret = await this.getPending2FASecret(userId);
    if (!secret) return undefined;
    
    const result = await this.updateUser(userId, { 
      twoFactorSecret: secret,
      twoFactorEnabled: true 
    });
    
    pending2FASetups.delete(userId);
    return result;
  }
  async clearPending2FASetup(userId: string): Promise<void> {
    pending2FASetups.delete(userId);
  }
  async enable2FA(userId: string, secret: string): Promise<User | undefined> {
    return this.updateUser(userId, { twoFactorSecret: secret, twoFactorEnabled: true });
  }
  async disable2FA(userId: string): Promise<User | undefined> {
    return this.updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  }
  async validate2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }
    
    try {
      return authenticator.verify({ token, secret: user.twoFactorSecret });
    } catch (error) {
      return false;
    }
  }

  // Passkey methods
  async createPasskey(passkey: InsertPasskey): Promise<Passkey> {
    const id = `passkey-${this.nextPasskeyId++}`;
    const newPasskey: Passkey = {
      id,
      userId: passkey.userId,
      credentialId: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: passkey.counter ?? 0,
      deviceName: passkey.deviceName,
      rpId: passkey.rpId,
      origin: passkey.origin,
      isActive: passkey.isActive ?? true,
      isDomainMismatch: passkey.isDomainMismatch ?? false,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.passkeys.set(id, newPasskey);
    return newPasskey;
  }

  async getUserPasskeys(userId: string): Promise<Passkey[]> {
    return Array.from(this.passkeys.values()).filter(passkey => passkey.userId === userId);
  }

  async getAllActivePasskeys(): Promise<Passkey[]> {
    return Array.from(this.passkeys.values()).filter(passkey => passkey.isActive);
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<Passkey | undefined> {
    return Array.from(this.passkeys.values()).find(passkey => passkey.credentialId === credentialId);
  }

  async updatePasskey(passkeyId: string, updates: Partial<Passkey>): Promise<Passkey | undefined> {
    const passkey = this.passkeys.get(passkeyId);
    if (!passkey) return undefined;
    
    const updatedPasskey = { 
      ...passkey, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.passkeys.set(passkeyId, updatedPasskey);
    return updatedPasskey;
  }

  async deletePasskey(passkeyId: string): Promise<boolean> {
    return this.passkeys.delete(passkeyId);
  }

  async updatePasskeyCounter(credentialId: string, counter: number): Promise<Passkey | undefined> {
    const passkey = Array.from(this.passkeys.values()).find(p => p.credentialId === credentialId);
    if (!passkey) return undefined;
    
    const updatedPasskey = { 
      ...passkey, 
      counter, 
      lastUsedAt: new Date(),
      updatedAt: new Date() 
    };
    
    this.passkeys.set(passkey.id, updatedPasskey);
    return updatedPasskey;
  }

  // System settings methods - proper implementation for MemStorage
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    // Search through the systemSettings Map to find the setting by key
    return Array.from(this.systemSettings.values()).find(setting => setting.key === key);
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    // Return all system settings from the Map
    return Array.from(this.systemSettings.values());
  }

  async upsertSystemSetting(setting: UpdateSystemSetting, adminId: string): Promise<SystemSetting> {
    // Check if setting exists by finding it in the Map
    const existingSetting = Array.from(this.systemSettings.values()).find(s => s.key === setting.key);
    
    if (existingSetting) {
      // Update existing setting
      const updatedSetting: SystemSetting = {
        ...existingSetting,
        value: setting.value,
        description: setting.description ?? existingSetting.description,
        isEncrypted: setting.isEncrypted ?? existingSetting.isEncrypted,
        lastUpdatedBy: adminId,
        updatedAt: new Date()
      };
      this.systemSettings.set(existingSetting.id, updatedSetting);
      return updatedSetting;
    } else {
      // Create new setting
      const newSetting: SystemSetting = {
        id: `setting-${Date.now()}`,
        key: setting.key,
        value: setting.value,
        description: setting.description || null,
        isEncrypted: setting.isEncrypted || false,
        lastUpdatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.systemSettings.set(newSetting.id, newSetting);
      return newSetting;
    }
  }

  async deleteSystemSetting(key: string, adminId: string): Promise<boolean> {
    // Find and delete the setting from the Map
    const existingSetting = Array.from(this.systemSettings.values()).find(s => s.key === key);
    if (existingSetting) {
      this.systemSettings.delete(existingSetting.id);
      return true;
    }
    return false;
  }

  // VIP level methods
  async updateUserVipLevel(userId: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const teamSize = user.teamSize || 0;
    const totalDeposits = parseFloat(user.totalDeposits) || 0;
    
    // Get VIP levels from database settings (dynamic)
    const vipLevels = await VipService.getVipLevelsFromStorage(this);
    const newVipLevel = VipService.calculateVipLevelStatic(teamSize, vipLevels, totalDeposits);
    const newMaxBetLimit = parseFloat(VipService.getMaxBetLimitStatic(newVipLevel, vipLevels).toString()).toFixed(8);
    
    if (user.vipLevel !== newVipLevel || user.maxBetLimit !== newMaxBetLimit) {
      return await this.updateUser(userId, {
        vipLevel: newVipLevel as any,
        maxBetLimit: newMaxBetLimit
      });
    }
    
    return user;
  }

  // Agent management methods - stub implementations
  async createAgent(email: string, password: string, commissionRate: string = "0.0500"): Promise<{ user: User; agentProfile: AgentProfile }> {
    // Check if email already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create user with agent role
    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const publicId = Math.floor(Math.random() * 900000000000 + 100000000000).toString();

    const user: User = {
      id: randomUUID(),
      email,
      publicId,
      passwordHash,
      referralCode,
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

    // Create agent profile
    const agentProfile: AgentProfile = {
      id: randomUUID(),
      userId: user.id,
      displayName: null,
      commissionRate,
      earningsBalance: "0.00000000",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.agentProfiles.set(agentProfile.id, agentProfile);

    return { user, agentProfile };
  }

  async getAgentProfile(userId: string): Promise<AgentProfile | undefined> {
    return Array.from(this.agentProfiles.values()).find(profile => profile.userId === userId);
  }

  async getAllAgents(page: number = 1, limit: number = 50): Promise<{ agents: Array<User & { agentProfile: AgentProfile }>; total: number }> {
    // Find all users with role "agent"
    const agentUsers = Array.from(this.users.values()).filter(user => user.role === "agent");
    
    // Get agent profiles for these users and combine them
    const agents = agentUsers.map(user => {
      const agentProfile = Array.from(this.agentProfiles.values()).find(profile => profile.userId === user.id);
      return agentProfile ? { ...user, agentProfile } : null;
    }).filter(agent => agent !== null) as Array<User & { agentProfile: AgentProfile }>;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedAgents = agents.slice(startIndex, startIndex + limit);
    
    return { 
      agents: paginatedAgents, 
      total: agents.length 
    };
  }

  async updateAgentCommission(agentId: string, commissionRate: string): Promise<AgentProfile | undefined> {
    const agentProfile = await this.getAgentProfile(agentId);
    if (!agentProfile) {
      return undefined;
    }
    
    agentProfile.commissionRate = commissionRate;
    agentProfile.updatedAt = new Date();
    this.agentProfiles.set(agentProfile.id, agentProfile);
    
    return agentProfile;
  }

  async toggleAgentStatus(agentId: string): Promise<AgentProfile | undefined> {
    const agentProfile = await this.getAgentProfile(agentId);
    if (!agentProfile) {
      return undefined;
    }
    
    // Toggle the agent profile status
    agentProfile.isActive = !agentProfile.isActive;
    agentProfile.updatedAt = new Date();
    this.agentProfiles.set(agentProfile.id, agentProfile);
    
    // Also update user status
    const user = this.users.get(agentId);
    if (user) {
      user.isActive = agentProfile.isActive;
      user.updatedAt = new Date();
      this.users.set(agentId, user);
    }
    
    return agentProfile;
  }

  async promoteUserToAgent(userId: string, commissionRate: string = "0.0500"): Promise<{ user: User; agentProfile: AgentProfile }> {
    const user = this.users.get(userId);
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

    const agentProfile: AgentProfile = {
      id: randomUUID(),
      userId: userId,
      displayName: null,
      commissionRate: commissionRate,
      earningsBalance: "0.00000000",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.agentProfiles.set(agentProfile.id, agentProfile);

    return { user, agentProfile };
  }

  async getUserByPublicIdOrEmail(identifier: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => 
      user.publicId === identifier || user.email === identifier
    );
  }

  async processAgentDeposit(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }> {
    try {
      // Get target user
      const targetUser = await this.getUserByPublicIdOrEmail(userIdentifier);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get agent user and profile
      const agentUser = await this.getUser(agentId);
      if (!agentUser) {
        throw new Error("Agent user not found");
      }

      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile || !agentProfile.isActive) {
        throw new Error("Agent not found or inactive");
      }

      const depositAmount = parseFloat(amount);
      if (depositAmount <= 0 || !isFinite(depositAmount) || isNaN(depositAmount)) {
        throw new Error("Invalid deposit amount");
      }

      // Format amount properly for storage
      const formattedAmount = depositAmount.toFixed(8);

      // Check if agent has sufficient balance
      console.log(`🔍 Agent Balance Debug:`, {
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

      // Calculate commission
      const commissionAmount = (depositAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);

      // Create transaction for user deposit
      const transaction: Transaction = {
        id: randomUUID(),
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

      // Create agent commission transaction (separate from deposit)
      const commissionTransaction: Transaction = {
        id: randomUUID(),
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

      // Deduct deposit amount from agent balance
      const oldAgentBalance = agentUser.balance;
      const newAgentBalance = (parseFloat(agentUser.balance) - depositAmount).toFixed(8);
      agentUser.balance = newAgentBalance;
      agentUser.updatedAt = new Date();
      this.users.set(agentUser.id, agentUser);
      
      console.log(`✅ Agent Balance Updated:`, {
        agentId: agentUser.id,
        agentEmail: agentUser.email,
        oldBalance: oldAgentBalance,
        newBalance: newAgentBalance,
        depositAmount: depositAmount,
        difference: (parseFloat(oldAgentBalance) - parseFloat(newAgentBalance)).toFixed(8)
      });

      // Update user balance (add deposit amount)
      const newUserBalance = (parseFloat(targetUser.balance) + depositAmount).toFixed(8);
      const newTotalDeposits = (parseFloat(targetUser.totalDeposits) + depositAmount).toFixed(8);
      
      // Freeze the full deposit amount (users can bet with it but cannot withdraw it)
      const newFrozenBalance = (parseFloat(targetUser.frozenBalance || '0') + depositAmount).toFixed(8);
      
      targetUser.balance = newUserBalance;
      targetUser.totalDeposits = newTotalDeposits;
      targetUser.frozenBalance = newFrozenBalance;
      targetUser.updatedAt = new Date();
      this.users.set(targetUser.id, targetUser);

      // Check and update VIP level based on new deposit amount
      await this.updateUserVipLevel(targetUser.id);

      // Update agent commission balance (earnings can be withdrawn)
      const newCommissionBalance = (parseFloat(agentUser.totalCommission) + parseFloat(commissionAmount)).toFixed(8);
      agentUser.totalCommission = newCommissionBalance;
      this.users.set(agentUser.id, agentUser);

      // Also update agent profile earnings for display
      const newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
      agentProfile.earningsBalance = newEarnings;
      agentProfile.updatedAt = new Date();
      this.agentProfiles.set(agentProfile.id, agentProfile);

      // Create agent activity record
      const activity = await this.createAgentActivity({
        agentId,
        action: "deposit",
        targetUserId: targetUser.id,
        amount: formattedAmount,
        commissionAmount,
        transactionId: transaction.id
      });

      return { transaction, activity };
    } catch (error) {
      console.error('Error processing agent deposit:', error);
      throw error;
    }
  }

  async processAgentWithdrawal(agentId: string, userIdentifier: string, amount: string): Promise<{ transaction: Transaction; activity: AgentActivity }> {
    try {
      // Get target user
      const targetUser = await this.getUserByPublicIdOrEmail(userIdentifier);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get agent user and profile
      const agentUser = await this.getUser(agentId);
      if (!agentUser) {
        throw new Error("Agent user not found");
      }

      const agentProfile = await this.getAgentProfile(agentId);
      if (!agentProfile || !agentProfile.isActive) {
        throw new Error("Agent not found or inactive");
      }

      const withdrawalAmount = parseFloat(amount);
      if (withdrawalAmount <= 0 || !isFinite(withdrawalAmount) || isNaN(withdrawalAmount)) {
        throw new Error("Invalid withdrawal amount");
      }

      // Format amount properly for storage
      const formattedAmount = withdrawalAmount.toFixed(8);

      // Check if user has sufficient balance
      if (parseFloat(targetUser.balance) < withdrawalAmount) {
        throw new Error("Insufficient user balance");
      }

      // Check if agent has sufficient balance to pay out
      if (parseFloat(agentUser.balance) < withdrawalAmount) {
        throw new Error("Insufficient agent balance to process withdrawal");
      }

      // Calculate commission
      const commissionAmount = (withdrawalAmount * parseFloat(agentProfile.commissionRate)).toFixed(8);

      // Create transaction for user withdrawal
      const transaction: Transaction = {
        id: randomUUID(),
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

      // Create agent withdrawal transaction (showing deduction)
      const agentWithdrawalTransaction: Transaction = {
        id: randomUUID(),
        userId: agentId,
        agentId: agentId,
        type: "withdrawal",
        fiatAmount: `-${formattedAmount}`,
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

      // Deduct withdrawal amount from user balance
      const newUserBalance = (parseFloat(targetUser.balance) - withdrawalAmount).toFixed(8);
      const newTotalWithdrawals = (parseFloat(targetUser.totalWithdrawals) + withdrawalAmount).toFixed(8);
      
      targetUser.balance = newUserBalance;
      targetUser.totalWithdrawals = newTotalWithdrawals;
      targetUser.updatedAt = new Date();
      this.users.set(targetUser.id, targetUser);

      // Deduct withdrawal amount from agent balance (agent pays out cash)
      const newAgentBalance = (parseFloat(agentUser.balance) - withdrawalAmount).toFixed(8);
      agentUser.balance = newAgentBalance;
      agentUser.updatedAt = new Date();
      this.users.set(agentUser.id, agentUser);

      // Update agent commission balance (earnings can be withdrawn)
      const newCommissionBalance = (parseFloat(agentUser.totalCommission) + parseFloat(commissionAmount)).toFixed(8);
      agentUser.totalCommission = newCommissionBalance;
      this.users.set(agentUser.id, agentUser);

      // Also update agent profile earnings for display
      const newEarnings = (parseFloat(agentProfile.earningsBalance) + parseFloat(commissionAmount)).toFixed(8);
      agentProfile.earningsBalance = newEarnings;
      agentProfile.updatedAt = new Date();
      this.agentProfiles.set(agentProfile.id, agentProfile);

      // Create agent activity record
      const activity = await this.createAgentActivity({
        agentId,
        action: "withdrawal",
        targetUserId: targetUser.id,
        amount: formattedAmount,
        commissionAmount,
        transactionId: transaction.id
      });

      return { transaction, activity };
    } catch (error) {
      console.error('Error processing agent withdrawal:', error);
      throw error;
    }
  }

  async createAgentActivity(activity: InsertAgentActivity): Promise<AgentActivity> {
    try {
      const agentActivity: AgentActivity = {
        id: randomUUID(),
        agentId: activity.agentId,
        action: activity.action,
        amount: activity.amount,
        commissionAmount: activity.commissionAmount || "0.00000000",
        targetUserId: activity.targetUserId || null,
        transactionId: activity.transactionId || null,
        createdAt: new Date()
      };
      
      this.agentActivities.set(agentActivity.id, agentActivity);
      return agentActivity;
    } catch (error) {
      console.error('Error creating agent activity:', error);
      throw error;
    }
  }

  async getAgentActivities(agentId: string, page: number = 1, limit: number = 50): Promise<{ activities: any[]; total: number }> {
    try {
      const allActivities = Array.from(this.agentActivities.values())
        .filter(activity => activity.agentId === agentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      const startIndex = (page - 1) * limit;
      const paginatedActivities = allActivities.slice(startIndex, startIndex + limit).map(activity => {
        // Fetch the target user's public ID if targetUserId exists
        let targetUserPublicId = null;
        if (activity.targetUserId) {
          const targetUser = this.users.get(activity.targetUserId);
          if (targetUser) {
            targetUserPublicId = targetUser.publicId;
          }
        }
        
        return { ...activity, targetUserPublicId };
      });
      
      return { 
        activities: paginatedActivities, 
        total: allActivities.length 
      };
    } catch (error) {
      console.error('Error getting agent activities:', error);
      return { activities: [], total: 0 };
    }
  }

  async getAgentEarnings(agentId: string): Promise<{ totalEarnings: string; commissionRate: string; totalDeposits: string }> {
    const agentProfile = Array.from(this.agentProfiles.values()).find(profile => profile.userId === agentId);
    if (!agentProfile) {
      return { totalEarnings: "0.00000000", commissionRate: "0.0000", totalDeposits: "0.00000000" };
    }
    
    // Calculate total deposits made by this agent
    const agentTransactions = Array.from(this.transactions.values())
      .filter(t => t.agentId === agentId && t.type === 'deposit' && t.status === 'completed');
    
    const totalDeposits = agentTransactions
      .reduce((sum, t) => sum + parseFloat(t.fiatAmount || '0'), 0)
      .toFixed(8);
    
    return { 
      totalEarnings: agentProfile.earningsBalance, 
      commissionRate: agentProfile.commissionRate,
      totalDeposits
    };
  }

  async updateAgentBalance(agentId: string, amount: string): Promise<AgentProfile | undefined> {
    const agentProfile = Array.from(this.agentProfiles.values()).find(profile => profile.userId === agentId);
    if (!agentProfile) return undefined;
    
    agentProfile.earningsBalance = amount;
    agentProfile.updatedAt = new Date();
    this.agentProfiles.set(agentProfile.id, agentProfile);
    
    return agentProfile;
  }

  async adjustAgentBalance(agentId: string, amount: string, adminId: string): Promise<AgentProfile | undefined> {
    const agentProfile = Array.from(this.agentProfiles.values()).find(profile => profile.userId === agentId);
    if (!agentProfile) return undefined;
    
    const agent = await this.getUser(agentId);
    if (!agent) return undefined;
    
    const currentEarningsBalance = parseFloat(agentProfile.earningsBalance);
    const currentUserBalance = parseFloat(agent.balance);
    const adjustment = parseFloat(amount);
    const newEarningsBalance = (currentEarningsBalance + adjustment).toFixed(8);
    const newUserBalance = (currentUserBalance + adjustment).toFixed(8);
    
    // Update agent profile earnings balance
    agentProfile.earningsBalance = newEarningsBalance;
    agentProfile.updatedAt = new Date();
    this.agentProfiles.set(agentProfile.id, agentProfile);
    
    // Update user wallet balance so it shows in agent dashboard
    agent.balance = newUserBalance;
    agent.updatedAt = new Date();
    this.users.set(agent.id, agent);
    
    // Log the admin action
    const adminAction: AdminAction = {
      id: `admin-action-${this.nextAdminActionId++}`,
      adminId,
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
    
    return agentProfile;
  }

  async clearDemoData(): Promise<void> {
    try {
      // Clear all non-admin users
      const adminUsers = Array.from(this.users.values()).filter(user => user.role === 'admin');
      this.users.clear();
      adminUsers.forEach(user => this.users.set(user.id, user));
      
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
    } catch (error) {
      console.error('Error clearing demo data in MemStorage:', error);
      throw error;
    }
  }

  // Golden Live methods
  private initializeGoldenLive() {
    // Initialize Golden Live stats with default values
    const goldenLiveStats: GoldenLiveStats = {
      id: `golden-live-stats-${this.nextGoldenLiveStatsId++}`,
      totalPlayers: 18000, // Start with 18,000 players
      activePlayers: 1243, // Start with 1,243 active players  
      lastHourlyIncrease: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.goldenLiveStats.set(goldenLiveStats.id, goldenLiveStats);
    
    // Start the hourly timer for automatic player increase
    this.startHourlyPlayerIncrease();
  }

  private startHourlyPlayerIncrease() {
    // Clear any existing timer
    if (this.hourlyTimer) {
      clearInterval(this.hourlyTimer);
    }
    
    // Set up timer to increase total players by 280 every hour
    this.hourlyTimer = setInterval(async () => {
      await this.incrementTotalPlayersBy28();
    }, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds
  }

  async getGoldenLiveStats(): Promise<GoldenLiveStats | undefined> {
    const stats = Array.from(this.goldenLiveStats.values())[0];
    return stats || undefined;
  }

  async updateGoldenLiveStats(updates: Partial<GoldenLiveStats>): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) {
      return undefined;
    }

    const updatedStats: GoldenLiveStats = {
      ...currentStats,
      ...updates,
      updatedAt: new Date()
    };

    this.goldenLiveStats.set(currentStats.id, updatedStats);
    return updatedStats;
  }

  async createGoldenLiveEvent(event: InsertGoldenLiveEvent): Promise<GoldenLiveEvent> {
    const goldenLiveEvent: GoldenLiveEvent = {
      id: `golden-live-event-${this.nextGoldenLiveEventId++}`,
      eventType: event.eventType,
      previousValue: event.previousValue,
      newValue: event.newValue,
      incrementAmount: event.incrementAmount || 0,
      description: event.description || null,
      createdAt: new Date()
    };
    
    this.goldenLiveEvents.set(goldenLiveEvent.id, goldenLiveEvent);
    return goldenLiveEvent;
  }

  async getGoldenLiveEvents(limit: number = 50): Promise<GoldenLiveEvent[]> {
    const events = Array.from(this.goldenLiveEvents.values());
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return events.slice(0, limit);
  }

  async incrementTotalPlayersBy28(): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) {
      return undefined;
    }

    const newTotalPlayers = currentStats.totalPlayers + 280;
    
    // Create event for audit trail
    await this.createGoldenLiveEvent({
      eventType: 'hourly_increase',
      previousValue: currentStats.totalPlayers,
      newValue: newTotalPlayers,
      incrementAmount: 280,
      description: 'Automatic hourly increase of total players by 280'
    });

    // Update the stats
    return await this.updateGoldenLiveStats({
      totalPlayers: newTotalPlayers,
      lastHourlyIncrease: new Date()
    });
  }

  async updateActivePlayersCount(count: number): Promise<GoldenLiveStats | undefined> {
    const currentStats = await this.getGoldenLiveStats();
    if (!currentStats) {
      return undefined;
    }

    // Create event for audit trail
    await this.createGoldenLiveEvent({
      eventType: 'active_player_update',
      previousValue: currentStats.activePlayers,
      newValue: count,
      incrementAmount: count - currentStats.activePlayers,
      description: `Active players count updated from ${currentStats.activePlayers} to ${count}`
    });

    // Update the stats
    return await this.updateGoldenLiveStats({
      activePlayers: count
    });
  }

  async getUserCountsByCountry(): Promise<Array<{ countryCode: string; count: number }>> {
    const countryCounts = new Map<string, number>();
    
    for (const user of Array.from(this.users.values())) {
      if (user.registrationCountry && user.registrationCountry.trim() !== '') {
        const country = user.registrationCountry;
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      }
    }

    const result = Array.from(countryCounts.entries())
      .map(([countryCode, count]) => ({ countryCode, count }))
      .sort((a, b) => b.count - a.count);

    return result;
  }

  // VIP settings methods
  async getAllVipSettings(): Promise<VipSetting[]> {
    const settings = Array.from(this.vipSettings.values());
    settings.sort((a, b) => a.levelOrder - b.levelOrder);
    return settings;
  }

  async getVipSettingById(id: string): Promise<VipSetting | undefined> {
    return this.vipSettings.get(id);
  }

  async getVipSettingByLevelKey(levelKey: string): Promise<VipSetting | undefined> {
    return Array.from(this.vipSettings.values()).find(s => s.levelKey === levelKey);
  }

  async createVipSetting(setting: InsertVipSetting): Promise<VipSetting> {
    const newSetting: VipSetting = {
      id: `vip-setting-${this.nextVipSettingId++}`,
      levelKey: setting.levelKey,
      levelName: setting.levelName,
      levelOrder: setting.levelOrder,
      teamRequirement: setting.teamRequirement ?? 0,
      maxBet: setting.maxBet ?? '100000000.00000000',
      dailyWagerReward: setting.dailyWagerReward ?? '0.00000000',
      commissionRates: setting.commissionRates ?? '[]',
      rechargeAmount: setting.rechargeAmount ?? '1000.00000000',
      telegramLink: setting.telegramLink ?? null,
      supportEmail: setting.supportEmail ?? null,
      isActive: setting.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vipSettings.set(newSetting.id, newSetting);
    return newSetting;
  }

  async updateVipSetting(id: string, updates: Partial<VipSetting>): Promise<VipSetting | undefined> {
    const setting = this.vipSettings.get(id);
    if (!setting) return undefined;
    
    const updatedSetting: VipSetting = {
      ...setting,
      ...updates,
      updatedAt: new Date()
    };
    this.vipSettings.set(id, updatedSetting);
    return updatedSetting;
  }

  async deleteVipSetting(id: string): Promise<boolean> {
    return this.vipSettings.delete(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: `notification-${this.nextNotificationId++}`,
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
    return newNotification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId || n.userId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return userNotifications;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const unreadNotifications = Array.from(this.notifications.values())
      .filter(n => (n.userId === userId || n.userId === null) && !n.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return unreadNotifications;
  }

  async markNotificationRead(notificationId: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return undefined;
    
    const updated: Notification = {
      ...notification,
      isRead: true
    };
    this.notifications.set(notificationId, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    for (const [id, notification] of Array.from(this.notifications.entries())) {
      if (notification.userId === userId || notification.userId === null) {
        this.notifications.set(id, { ...notification, isRead: true });
      }
    }
    return true;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    return this.notifications.delete(notificationId);
  }
  
  // Push subscription methods
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const newSubscription: PushSubscription = {
      id: `push-${Date.now()}-${Math.random()}`,
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
    return newSubscription;
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values())
      .filter(sub => sub.userId === userId && sub.isActive);
  }

  async getAllActivePushSubscriptions(): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values())
      .filter(sub => sub.isActive);
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    const subscription = this.pushSubscriptions.get(endpoint);
    if (subscription) {
      this.pushSubscriptions.set(endpoint, { ...subscription, isActive: false, updatedAt: new Date() });
    }
    return true;
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<boolean> {
    for (const [endpoint, subscription] of Array.from(this.pushSubscriptions.entries())) {
      if (subscription.userId === userId) {
        this.pushSubscriptions.set(endpoint, { ...subscription, isActive: false, updatedAt: new Date() });
      }
    }
    return true;
  }

  // Withdrawal request methods
  private withdrawalRequests = new Map<string, WithdrawalRequest>();

  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const id = randomUUID();
    const withdrawalRequest: WithdrawalRequest = {
      id,
      ...request,
      currency: request.currency || "USD",
      commissionAmount: request.commissionAmount || "0.00000000",
      winningsAmount: request.winningsAmount || "0.00000000",
      eligible: request.eligible ?? false,
      duplicateIpCount: request.duplicateIpCount ?? 0,
      duplicateIpUserIds: request.duplicateIpUserIds ?? null,
      balanceFrozen: request.balanceFrozen ?? false,
      adminNote: request.adminNote || null,
      status: 'pending' as any,
      processedAt: null,
      processedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.withdrawalRequests.set(id, withdrawalRequest);
    return withdrawalRequest;
  }

  async getWithdrawalRequestsByUser(userId: string): Promise<WithdrawalRequest[]> {
    return Array.from(this.withdrawalRequests.values())
      .filter(req => req.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllWithdrawalRequests(page: number = 1, limit: number = 50, status?: string): Promise<{ requests: WithdrawalRequest[]; total: number }> {
    let all = Array.from(this.withdrawalRequests.values());
    
    if (status && status !== 'all') {
      all = all.filter(req => req.status === status);
    }
    
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const offset = (page - 1) * limit;
    const requests = all.slice(offset, offset + limit);
    
    return { requests, total: all.length };
  }

  async updateWithdrawalRequestStatus(
    requestId: string,
    status: string,
    processedBy?: string,
    adminNote?: string
  ): Promise<WithdrawalRequest | undefined> {
    const request = this.withdrawalRequests.get(requestId);
    if (!request) return undefined;

    const updated: WithdrawalRequest = {
      ...request,
      status: status as any,
      updatedAt: new Date(),
      processedBy: processedBy || request.processedBy,
      processedAt: processedBy ? new Date() : request.processedAt,
      adminNote: adminNote !== undefined ? adminNote : request.adminNote,
    };

    this.withdrawalRequests.set(requestId, updated);
    return updated;
  }

  async getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | undefined> {
    return this.withdrawalRequests.get(id);
  }

  async getCompletedWithdrawalCount(userId: string): Promise<number> {
    const userRequests = Array.from(this.withdrawalRequests.values()).filter(
      r => r.userId === userId && r.status === 'completed'
    );
    return userRequests.length;
  }

  // Promo code methods
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const id = `promo-code-${this.nextPromoCodeId++}`;
    const newPromoCode: PromoCode = {
      id,
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
    return newPromoCode;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const upperCode = code.toUpperCase();
    return Array.from(this.promoCodes.values()).find(pc => pc.code === upperCode);
  }

  async getAllPromoCodes(page: number = 1, limit: number = 50): Promise<{ codes: PromoCode[]; total: number }> {
    const all = Array.from(this.promoCodes.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const offset = (page - 1) * limit;
    const codes = all.slice(offset, offset + limit);
    
    return { codes, total: all.length };
  }

  async validatePromoCode(code: string, userId: string): Promise<{ valid: boolean; reason?: string; promoCode?: PromoCode }> {
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { valid: false, reason: 'Promo code not found' };
    }

    if (!promoCode.isActive) {
      return { valid: false, reason: 'Promo code is no longer active' };
    }

    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return { valid: false, reason: 'Promo code has expired' };
    }

    if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
      return { valid: false, reason: 'Promo code usage limit reached' };
    }

    // Check if user already redeemed this code
    const existingRedemption = Array.from(this.promoCodeRedemptions.values())
      .find(r => r.userId === userId && r.code === promoCode.code);
    
    if (existingRedemption) {
      return { valid: false, reason: 'You have already redeemed this promo code' };
    }

    // Check deposit requirement
    if (promoCode.requireDeposit) {
      const user = await this.getUser(userId);
      if (!user || parseFloat(user.totalDeposits) === 0) {
        return { valid: false, reason: 'You must make a deposit before redeeming this code' };
      }
    }

    return { valid: true, promoCode };
  }

  async redeemPromoCode(code: string, userId: string): Promise<{ success: boolean; amountAwarded?: string; vipLevelUpgraded?: boolean; newVipLevel?: string; reason?: string }> {
    const validation = await this.validatePromoCode(code, userId);
    
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const promoCode = validation.promoCode!;
    
    // Calculate random amount between min and max (in USD)
    // Convert to coins first for proper integer-based random calculation
    const minCoins = Math.round(parseFloat(promoCode.minValue) * 100);
    const maxCoins = Math.round(parseFloat(promoCode.maxValue) * 100);
    const randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
    // Convert back to USD for storage
    const randomAmount = randomCoins / 100;
    const amountAwarded = randomAmount.toFixed(8);

    // Create redemption record
    const redemptionId = `promo-redemption-${this.nextPromoCodeRedemptionId++}`;
    const redemption: PromoCodeRedemption = {
      id: redemptionId,
      promoCodeId: promoCode.id,
      userId,
      code: promoCode.code,
      amountAwarded,
      createdAt: new Date(),
    };
    this.promoCodeRedemptions.set(redemptionId, redemption);

    // Update promo code used count
    const updatedPromoCode = {
      ...promoCode,
      usedCount: promoCode.usedCount + 1,
      updatedAt: new Date(),
    };
    this.promoCodes.set(promoCode.id, updatedPromoCode);

    // Update user balance
    const user = await this.getUser(userId);
    let vipLevelUpgraded = false;
    let newVipLevel: string | undefined;
    
    if (user) {
      const newBalance = (parseFloat(user.balance) + parseFloat(amountAwarded)).toFixed(8);
      await this.updateUserBalance(userId, newBalance);
      
      // Handle VIP level upgrade if specified
      if (promoCode.vipLevelUpgrade) {
        await this.updateUser(userId, { vipLevel: promoCode.vipLevelUpgrade as any });
        vipLevelUpgraded = true;
        newVipLevel = promoCode.vipLevelUpgrade;
      }
    }

    return { success: true, amountAwarded, vipLevelUpgraded, newVipLevel };
  }

  async getUserPromoCodeRedemptions(userId: string): Promise<PromoCodeRedemption[]> {
    return Array.from(this.promoCodeRedemptions.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updatePromoCodeStatus(promoCodeId: string, isActive: boolean): Promise<PromoCode | undefined> {
    const promoCode = this.promoCodes.get(promoCodeId);
    if (!promoCode) return undefined;

    const updated: PromoCode = {
      ...promoCode,
      isActive,
      updatedAt: new Date(),
    };
    this.promoCodes.set(promoCodeId, updated);
    return updated;
  }

  async deletePromoCode(promoCodeId: string): Promise<boolean> {
    return this.promoCodes.delete(promoCodeId);
  }

  // VIP Level Telegram Links methods
  private vipLevelTelegramLinks = new Map<string, VipLevelTelegramLink>();
  private nextVipTelegramLinkId = 1;

  async getAllVipLevelTelegramLinks(): Promise<VipLevelTelegramLink[]> {
    return Array.from(this.vipLevelTelegramLinks.values())
      .filter(link => link.isActive)
      .sort((a, b) => a.vipLevel.localeCompare(b.vipLevel));
  }

  async getVipLevelTelegramLink(vipLevel: string): Promise<VipLevelTelegramLink | undefined> {
    return Array.from(this.vipLevelTelegramLinks.values())
      .find(link => link.vipLevel === vipLevel);
  }

  async upsertVipLevelTelegramLink(link: InsertVipLevelTelegramLink): Promise<VipLevelTelegramLink> {
    const existing = await this.getVipLevelTelegramLink(link.vipLevel as string);
    
    if (existing) {
      // Update existing
      const updated: VipLevelTelegramLink = {
        ...existing,
        telegramLink: link.telegramLink,
        description: link.description ?? null,
        isActive: link.isActive !== undefined ? link.isActive : existing.isActive,
        updatedBy: link.updatedBy,
        updatedAt: new Date(),
      };
      this.vipLevelTelegramLinks.set(existing.id, updated);
      return updated;
    } else {
      // Create new
      const id = `vip-tg-link-${this.nextVipTelegramLinkId++}`;
      const newLink: VipLevelTelegramLink = {
        id,
        vipLevel: link.vipLevel,
        telegramLink: link.telegramLink,
        description: link.description || null,
        isActive: link.isActive !== undefined ? link.isActive : true,
        updatedBy: link.updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.vipLevelTelegramLinks.set(id, newLink);
      return newLink;
    }
  }

  async deleteVipLevelTelegramLink(id: string): Promise<boolean> {
    return this.vipLevelTelegramLinks.delete(id);
  }

  // Database connection methods
  async createDatabaseConnection(connection: InsertDatabaseConnection): Promise<DatabaseConnection> {
    const [newConnection] = await db
      .insert(databaseConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async getAllDatabaseConnections(page: number = 1, limit: number = 50): Promise<{ connections: DatabaseConnection[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [connections, totalResult] = await Promise.all([
      db.select().from(databaseConnections).limit(limit).offset(offset).orderBy(desc(databaseConnections.createdAt)),
      db.select({ count: count() }).from(databaseConnections)
    ]);

    return {
      connections,
      total: totalResult[0]?.count || 0
    };
  }

  async getDatabaseConnectionById(id: string): Promise<DatabaseConnection | undefined> {
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .limit(1);
    return connection;
  }

  async updateDatabaseConnection(id: string, updates: Partial<DatabaseConnection>): Promise<DatabaseConnection | undefined> {
    const [updated] = await db
      .update(databaseConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    return updated;
  }

  async deleteDatabaseConnection(id: string): Promise<boolean> {
    const result = await db
      .delete(databaseConnections)
      .where(eq(databaseConnections.id, id))
      .returning();
    return result.length > 0;
  }

  async getActiveDatabaseConnection(): Promise<DatabaseConnection | undefined> {
    const [connection] = await db
      .select()
      .from(databaseConnections)
      .where(eq(databaseConnections.isActive, true))
      .limit(1);
    return connection;
  }

  async setActiveDatabaseConnection(id: string): Promise<DatabaseConnection | undefined> {
    // First, deactivate all connections
    await db
      .update(databaseConnections)
      .set({ isActive: false, status: 'inactive' as const, updatedAt: new Date() });

    // Then activate the selected connection
    const [activated] = await db
      .update(databaseConnections)
      .set({ isActive: true, status: 'active' as const, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    return activated;
  }

  async setPrimaryDatabaseConnection(id: string): Promise<DatabaseConnection | undefined> {
    // Verify the connection exists and is active
    const connection = await this.getDatabaseConnectionById(id);
    if (!connection) {
      throw new Error('Database connection not found');
    }
    if (!connection.isActive) {
      throw new Error('Cannot set inactive database as primary. Please activate it first.');
    }

    // First, remove primary flag from all connections
    await db
      .update(databaseConnections)
      .set({ isPrimary: false, updatedAt: new Date() });

    // Then set this connection as primary
    const [primary] = await db
      .update(databaseConnections)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(databaseConnections.id, id))
      .returning();
    
    return primary;
  }

  async getPredictedResults(adminId: string): Promise<PredictedResult[]> {
    // If adminId is 'any', get all predictions from all admins
    if (adminId === 'any') {
      const results = Array.from(this.predictedResults.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return results;
    }
    
    // Get predictions for specific admin
    const results = Array.from(this.predictedResults.values())
      .filter(p => p.adminId === adminId);
    
    return results;
  }

  async savePredictedResult(prediction: InsertPredictedResult): Promise<PredictedResult> {
    const { adminId, periodId, result } = prediction;
    
    // Check if a prediction already exists for this admin and period
    const existing = Array.from(this.predictedResults.values())
      .find(p => p.adminId === adminId && p.periodId === periodId);
    
    if (existing) {
      // Update existing prediction
      const updated = {
        ...existing,
        result,
        updatedAt: new Date()
      };
      this.predictedResults.set(existing.id, updated);
      return updated;
    } else {
      // Create new prediction
      const newPrediction: PredictedResult = {
        id: `predicted-result-${this.nextPredictedResultId++}`,
        adminId,
        periodId,
        result,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.predictedResults.set(newPrediction.id, newPrediction);
      return newPrediction;
    }
  }

  async deletePredictedResult(id: string, adminId: string): Promise<boolean> {
    const prediction = this.predictedResults.get(id);
    if (prediction && prediction.adminId === adminId) {
      this.predictedResults.delete(id);
      return true;
    }
    return false;
  }

  // Support chat session methods
  async createSupportChatSession(payload: InsertSupportChatSession): Promise<SupportChatSession> {
    const session: SupportChatSession = {
      id: randomUUID(),
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
    return session;
  }

  async getSupportChatSessionByToken(token: string): Promise<SupportChatSession | undefined> {
    return Array.from(this.supportChatSessions.values())
      .find(s => s.sessionToken === token);
  }

  async getSupportChatSession(id: string): Promise<SupportChatSession | undefined> {
    return this.supportChatSessions.get(id);
  }

  async updateSupportChatSession(id: string, updates: Partial<SupportChatSession>): Promise<SupportChatSession | undefined> {
    const session = this.supportChatSessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...updates, lastMessageAt: updates.lastMessageAt || new Date() };
    this.supportChatSessions.set(id, updated);
    return updated;
  }

  async listOpenSupportSessions(limit?: number): Promise<SupportChatSession[]> {
    const sessions = Array.from(this.supportChatSessions.values())
      .filter(s => s.status === 'open')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sessions.slice(0, limit || 50);
  }

  async createSupportChatMessage(message: InsertSupportChatMessage): Promise<SupportChatMessage> {
    const created: SupportChatMessage = {
      id: randomUUID(),
      sessionId: message.sessionId,
      author: message.author,
      authorTelegramId: message.authorTelegramId || null,
      body: message.body,
      metadata: message.metadata || null,
      deliveredAt: null,
      createdAt: new Date()
    };
    this.supportChatMessages.set(created.id, created);
    
    const session = this.supportChatSessions.get(message.sessionId);
    if (session) {
      session.lastMessageAt = new Date();
      this.supportChatSessions.set(session.id, session);
    }
    
    return created;
  }

  async getSupportChatMessages(sessionId: string, after?: Date): Promise<SupportChatMessage[]> {
    let messages = Array.from(this.supportChatMessages.values())
      .filter(m => m.sessionId === sessionId);
    
    if (after) {
      messages = messages.filter(m => m.createdAt > after);
    }
    
    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async markMessagesDelivered(sessionId: string, deliveredAt?: Date): Promise<number> {
    const messages = Array.from(this.supportChatMessages.values())
      .filter(m => m.sessionId === sessionId && !m.deliveredAt);
    
    const timestamp = deliveredAt || new Date();
    messages.forEach(m => {
      m.deliveredAt = timestamp;
      this.supportChatMessages.set(m.id, m);
    });
    
    return messages.length;
  }

  async deleteSupportChatMessages(sessionId: string): Promise<number> {
    const messages = Array.from(this.supportChatMessages.values())
      .filter(m => m.sessionId === sessionId);
    
    messages.forEach(m => {
      this.supportChatMessages.delete(m.id);
    });
    
    console.log(`🗑️ Deleted ${messages.length} message(s) for session ${sessionId}`);
    return messages.length;
  }

  async createQuickReply(payload: { shortcut: string; message: string; createdBy: string }): Promise<QuickReply> {
    const quickReply: QuickReply = {
      id: randomUUID(),
      shortcut: payload.shortcut,
      message: payload.message,
      createdBy: payload.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.quickReplies.set(quickReply.id, quickReply);
    return quickReply;
  }

  async getQuickReplies(): Promise<QuickReply[]> {
    return Array.from(this.quickReplies.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getQuickReplyById(id: string): Promise<QuickReply | undefined> {
    return this.quickReplies.get(id);
  }

  async updateQuickReply(id: string, updates: { shortcut?: string; message?: string }): Promise<QuickReply | undefined> {
    const quickReply = this.quickReplies.get(id);
    if (!quickReply) return undefined;
    
    const updated = { ...quickReply, ...updates, updatedAt: new Date() };
    this.quickReplies.set(id, updated);
    return updated;
  }

  async deleteQuickReply(id: string): Promise<boolean> {
    return this.quickReplies.delete(id);
  }

  // Telegram Reactions (N1Panel) stub methods
  async getTelegramReactionSettings(): Promise<TelegramReactionSetting | undefined> {
    return undefined;
  }

  async createOrUpdateTelegramReactionSettings(settings: UpdateTelegramReactionSetting): Promise<TelegramReactionSetting> {
    throw new Error("Telegram Reactions not supported in MemStorage");
  }

  async getAllTelegramGroups(): Promise<TelegramGroup[]> {
    return [];
  }

  async getTelegramGroupById(id: string): Promise<TelegramGroup | undefined> {
    return undefined;
  }

  async createTelegramGroup(group: InsertTelegramGroup): Promise<TelegramGroup> {
    throw new Error("Telegram Reactions not supported in MemStorage");
  }

  async updateTelegramGroup(id: string, updates: UpdateTelegramGroup): Promise<TelegramGroup | undefined> {
    return undefined;
  }

  async deleteTelegramGroup(id: string): Promise<boolean> {
    return false;
  }

  // Telegram signals stub methods
  async createTelegramSignal(signal: InsertTelegramSignal): Promise<TelegramSignal> {
    throw new Error("Telegram Signals not supported in MemStorage");
  }

  async getTelegramSignalById(id: string): Promise<TelegramSignal | undefined> {
    return undefined;
  }

  async getTelegramSignalByGameId(gameId: string): Promise<TelegramSignal | undefined> {
    return undefined;
  }

  async getTelegramSignalByMessageId(messageId: number): Promise<TelegramSignal | undefined> {
    return undefined;
  }

  async getAllTelegramSignals(limit?: number): Promise<TelegramSignal[]> {
    return [];
  }

  async getPendingTelegramSignals(): Promise<TelegramSignal[]> {
    return [];
  }

  async updateTelegramSignal(id: string, updates: UpdateTelegramSignal): Promise<TelegramSignal | undefined> {
    return undefined;
  }

  async deleteTelegramSignal(id: string): Promise<boolean> {
    return false;
  }

  async getLatestTelegramSignalsByDuration(duration: number, limit: number = 10): Promise<TelegramSignal[]> {
    return [];
  }

  async getAllTelegramReactionOrders(groupId?: string, limit?: number): Promise<TelegramReactionOrder[]> {
    return [];
  }

  async getTelegramReactionOrderById(id: string): Promise<TelegramReactionOrder | undefined> {
    return undefined;
  }

  async createTelegramReactionOrder(order: InsertTelegramReactionOrder): Promise<TelegramReactionOrder> {
    throw new Error("Telegram Reactions not supported in MemStorage");
  }

  async updateTelegramReactionOrder(id: string, updates: Partial<TelegramReactionOrder>): Promise<TelegramReactionOrder | undefined> {
    return undefined;
  }

  async createN1PanelOrder(): Promise<void> {
    console.log('⚠️  N1Panel orders not supported in MemStorage');
  }

  async updateN1PanelOrderStatus(): Promise<void> {
    console.log('⚠️  N1Panel orders not supported in MemStorage');
  }

  async getPendingN1PanelOrders(): Promise<Array<any>> {
    return [];
  }

  async getAllN1PanelOrders(): Promise<Array<any>> {
    return [];
  }

  // Betting tasks implementations
  async getAllBettingTasks(): Promise<BettingTask[]> {
    return Array.from(this.bettingTasks.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getActiveBettingTasks(): Promise<BettingTask[]> {
    return Array.from(this.bettingTasks.values())
      .filter(task => task.isActive)
      .sort((a, b) => a.durationMinutes - b.durationMinutes);
  }

  async getBettingTaskById(id: string): Promise<BettingTask | undefined> {
    return this.bettingTasks.get(id);
  }

  async createBettingTask(task: InsertBettingTask): Promise<BettingTask> {
    const id = randomUUID();
    const newTask: BettingTask = {
      id,
      name: task.name,
      isActive: task.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: task.description ?? null,
      betRequirement: task.betRequirement,
      durationMinutes: task.durationMinutes,
      coinReward: task.coinReward
    };
    this.bettingTasks.set(id, newTask);
    return newTask;
  }

  async updateBettingTask(id: string, updates: UpdateBettingTask): Promise<BettingTask | undefined> {
    const task = this.bettingTasks.get(id);
    if (!task) return undefined;
    
    const updated = { ...task, ...updates, updatedAt: new Date() };
    this.bettingTasks.set(id, updated);
    return updated;
  }

  async deleteBettingTask(id: string): Promise<boolean> {
    return this.bettingTasks.delete(id);
  }

  async getUserTaskProgress(userId: string): Promise<Array<UserBettingTaskProgress & { task: BettingTask }>> {
    const progress = Array.from(this.userBettingTaskProgress.values())
      .filter(p => p.userId === userId);
    
    return progress.map(p => {
      const task = this.bettingTasks.get(p.taskId);
      return { ...p, task: task! };
    }).filter(p => p.task);
  }

  async getUserTaskProgressByTask(userId: string, taskId: string): Promise<UserBettingTaskProgress | undefined> {
    return Array.from(this.userBettingTaskProgress.values())
      .find(p => p.userId === userId && p.taskId === taskId);
  }

  async updateUserTaskProgress(userId: string, taskId: string, betAmount: string): Promise<UserBettingTaskProgress> {
    const existing = await this.getUserTaskProgressByTask(userId, taskId);
    
    if (existing) {
      const newAccumulated = (parseFloat(existing.betAccumulated) + parseFloat(betAmount)).toFixed(2);
      const updated: UserBettingTaskProgress = {
        ...existing,
        betAccumulated: newAccumulated,
        updatedAt: new Date()
      };
      this.userBettingTaskProgress.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const progress: UserBettingTaskProgress = {
        id,
        userId,
        taskId,
        betAccumulated: parseFloat(betAmount).toFixed(2),
        isCompleted: false,
        claimedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userBettingTaskProgress.set(id, progress);
      return progress;
    }
  }

  async claimTaskReward(userId: string, taskId: string): Promise<{ success: boolean; reward?: string; error?: string }> {
    try {
      const task = await this.getBettingTaskById(taskId);
      if (!task) {
        return { success: false, error: "Task not found" };
      }

      const progress = await this.getUserTaskProgressByTask(userId, taskId);
      if (!progress) {
        return { success: false, error: "No progress found for this task" };
      }

      if (progress.isCompleted) {
        return { success: false, error: "Task already claimed" };
      }

      if (parseFloat(progress.betAccumulated) < parseFloat(task.betRequirement)) {
        return { success: false, error: "Bet requirement not met" };
      }

      // Get user's current balance before award
      const user = await this.getUser(userId);
      console.log(`🎁 [ClaimReward] User ${userId} claiming task ${task.name}`);
      console.log(`💰 [ClaimReward] Current balance: ${user?.balance}`);
      console.log(`🎁 [ClaimReward] Task coinReward (raw): ${task.coinReward}`);
      console.log(`🎁 [ClaimReward] Task coinReward (type): ${typeof task.coinReward}`);
      
      // Award coins atomically - ensure coinReward is converted to string
      const coinRewardAmount = String(task.coinReward);
      console.log(`🎁 [ClaimReward] coinRewardAmount to add: ${coinRewardAmount} (type: ${typeof coinRewardAmount})`);
      
      const result = await this.atomicIncrementBalance(userId, coinRewardAmount);
      if (!result.success) {
        return { success: false, error: "Failed to award coins" };
      }

      console.log(`✅ [ClaimReward] New balance after claim: ${result.user?.balance}`);
      
      // Create a transaction record so BalanceIntegrity service can track this
      await this.createTransaction({
        userId: userId,
        type: "commission_withdrawal",
        cryptoCurrency: "USDT",
        cryptoAmount: coinRewardAmount,
        fiatAmount: coinRewardAmount,
        paymentMethod: "internal",
        status: "completed",
        txHash: `betting-task-${task.id}-${Date.now()}`
      });
      
      // Mark as completed
      const updated: UserBettingTaskProgress = {
        ...progress,
        isCompleted: true,
        claimedAt: new Date(),
        updatedAt: new Date()
      };
      this.userBettingTaskProgress.set(progress.id, updated);

      return { success: true, reward: coinRewardAmount };
    } catch (error) {
      console.error('Error claiming task reward:', error);
      return { success: false, error: "Internal error" };
    }
  }

  // Deposit request methods
  async createDepositRequest(request: InsertDepositRequest): Promise<DepositRequest> {
    const id = `deposit-request-${this.nextDepositRequestId++}`;
    const depositRequest: DepositRequest = {
      id,
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
    return depositRequest;
  }

  async getDepositRequestById(requestId: string): Promise<DepositRequest | undefined> {
    return this.depositRequests.get(requestId);
  }

  async getDepositRequestsByUser(userId: string): Promise<DepositRequest[]> {
    return Array.from(this.depositRequests.values())
      .filter(request => request.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDepositRequestsByAgent(agentId: string, status?: "pending" | "approved" | "rejected" | "completed"): Promise<DepositRequest[]> {
    return Array.from(this.depositRequests.values())
      .filter(request => {
        if (request.agentId !== agentId) return false;
        if (status && request.status !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateDepositRequestStatus(requestId: string, status: "pending" | "approved" | "rejected" | "completed", updates?: Partial<DepositRequest>): Promise<DepositRequest | undefined> {
    const request = this.depositRequests.get(requestId);
    if (!request) {
      return undefined;
    }

    request.status = status;
    request.updatedAt = new Date();
    
    if (updates) {
      if (updates.agentNote !== undefined) request.agentNote = updates.agentNote;
      if (updates.transactionId !== undefined) request.transactionId = updates.transactionId;
      if (updates.processedAt !== undefined) request.processedAt = updates.processedAt;
    }

    if (status === "approved" || status === "rejected") {
      request.processedAt = new Date();
    }

    this.depositRequests.set(requestId, request);
    return request;
  }

  async atomicApproveDepositRequest(requestId: string, agentId: string, agentNote?: string): Promise<{ success: boolean; request?: DepositRequest; transaction?: Transaction; user?: User; error?: string }> {
    const request = this.depositRequests.get(requestId);
    
    if (!request) {
      return { success: false, error: 'Deposit request not found' };
    }

    if (request.agentId !== agentId) {
      return { success: false, error: 'Not your deposit request' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request already processed' };
    }

    const user = this.users.get(request.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get agent user to update their balance
    const agent = this.users.get(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Get agent profile for commission calculation
    const agentProfile = await this.getAgentProfile(agentId);
    if (!agentProfile) {
      return { success: false, error: 'Agent profile not found' };
    }

    const amount = parseFloat(request.amount);
    
    // Check if agent is depositing to themselves
    if (request.userId === agentId) {
      console.error('❌ Agent cannot approve their own deposit request');
      return { success: false, error: 'Agent cannot approve their own deposit request. Please request deposit from a different agent.' };
    }
    
    // Check if agent has sufficient balance
    const agentBalance = parseFloat(agent.balance);
    if (agentBalance < amount) {
      console.error(`❌ Insufficient agent balance. Required: $${amount.toFixed(2)}, Available: $${agentBalance.toFixed(2)}`);
      return { 
        success: false, 
        error: `Insufficient balance. You need $${amount.toFixed(2)} but only have $${agentBalance.toFixed(2)}. Please deposit more funds to your agent account.` 
      };
    }
    
    // Calculate commission with validation
    const commissionRate = parseFloat(agentProfile.commissionRate);
    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
      console.error(`❌ Invalid commission rate: ${agentProfile.commissionRate}`);
      return { 
        success: false, 
        error: 'Invalid agent commission rate. Please contact support.' 
      };
    }
    const commission = amount * commissionRate;
    
    // Update user balance (add deposit amount)
    const newUserBalance = (parseFloat(user.balance) + amount).toFixed(8);
    const newTotalDeposits = (parseFloat(user.totalDeposits) + amount).toFixed(8);
    
    // Freeze the full deposit amount (users can bet with it but cannot withdraw it)
    const newFrozenBalance = (parseFloat(user.frozenBalance || '0') + amount).toFixed(8);

    user.balance = newUserBalance;
    user.totalDeposits = newTotalDeposits;
    user.frozenBalance = newFrozenBalance;
    user.updatedAt = new Date();
    this.users.set(user.id, user);

    // Update agent balance (subtract deposit amount)
    // Note: Agent commission from deposit approvals is tracked in agentProfiles.earningsBalance
    // User commission fields (totalCommission, lifetimeCommissionEarned) are for referral commissions only
    const newAgentBalance = (parseFloat(agent.balance) - amount).toFixed(8);
    
    agent.balance = newAgentBalance;
    agent.updatedAt = new Date();
    this.users.set(agent.id, agent);

    // Update agent earnings balance (add commission)
    const newEarningsBalance = (parseFloat(agentProfile.earningsBalance) + commission).toFixed(8);
    agentProfile.earningsBalance = newEarningsBalance;
    agentProfile.updatedAt = new Date();
    this.agentProfiles.set(agentProfile.id, agentProfile);

    // Create transaction for USER (deposit)
    const transactionId = `transaction-${this.nextTransactionId++}`;
    const transaction: Transaction = {
      id: transactionId,
      userId: request.userId,
      agentId,
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

    // Create transaction for AGENT (withdrawal/deduction)
    const agentTransactionId = `transaction-${this.nextTransactionId++}`;
    const agentTransaction: Transaction = {
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

    // Record agent activity with proper commission
    const activityId = `activity-${this.nextAgentActivityId++}`;
    const activity: AgentActivity = {
      id: activityId,
      agentId,
      action: 'deposit_approval',
      targetUserId: request.userId,
      amount: amount.toFixed(8),
      commissionAmount: commission.toFixed(8),
      transactionId: transaction.id,
      createdAt: new Date()
    };
    this.agentActivities.set(activityId, activity);

    return {
      success: true,
      request,
      transaction,
      user
    };
  }

  // Whitelisted IP stub methods
  async getAllWhitelistedIps(): Promise<WhitelistedIp[]> {
    return [];
  }

  async getWhitelistedIpByAddress(ipAddress: string): Promise<WhitelistedIp | undefined> {
    return undefined;
  }

  async addWhitelistedIp(data: InsertWhitelistedIp): Promise<WhitelistedIp> {
    const id = randomUUID();
    const whitelistedIp: WhitelistedIp = {
      id,
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
    return whitelistedIp;
  }

  async updateWhitelistedIp(id: string, updates: Partial<UpdateWhitelistedIp>): Promise<WhitelistedIp | undefined> {
    return undefined;
  }

  async deleteWhitelistedIp(id: string): Promise<boolean> {
    return false;
  }

  async updateWhitelistedIpAccountCount(ipAddress: string, newCount: number): Promise<void> {
    return;
  }

  // Telegram Scheduled Posts stub methods
  async createTelegramScheduledPost(post: InsertTelegramScheduledPost): Promise<TelegramScheduledPost> {
    const id = randomUUID();
    const scheduledPost: TelegramScheduledPost = {
      id,
      channelId: post.channelId,
      title: post.title,
      messageText: post.messageText,
      photoPath: post.photoPath || null,
      photoUrl: post.photoUrl || null,
      buttons: post.buttons || null,
      scheduleTime: post.scheduleTime || null,
      timezone: post.timezone || "Asia/Colombo",
      repeatDaily: post.repeatDaily ?? true,
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
    return scheduledPost;
  }

  async getTelegramScheduledPosts(): Promise<TelegramScheduledPost[]> {
    return Array.from(this.telegramScheduledPostsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTelegramScheduledPostById(id: string): Promise<TelegramScheduledPost | undefined> {
    return this.telegramScheduledPostsMap.get(id);
  }

  async updateTelegramScheduledPost(id: string, updates: Partial<TelegramScheduledPost>): Promise<TelegramScheduledPost | undefined> {
    const existing = this.telegramScheduledPostsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.telegramScheduledPostsMap.set(id, updated);
    return updated;
  }

  async deleteTelegramScheduledPost(id: string): Promise<boolean> {
    return this.telegramScheduledPostsMap.delete(id);
  }

  async getActiveTelegramScheduledPosts(): Promise<TelegramScheduledPost[]> {
    return Array.from(this.telegramScheduledPostsMap.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => {
        const timeA = a.scheduleTime || '';
        const timeB = b.scheduleTime || '';
        return timeA.localeCompare(timeB);
      });
  }

  async updateScheduledPostSentStatus(id: string, sentAt: Date, repeatDaily: boolean): Promise<TelegramScheduledPost | undefined> {
    const existing = this.telegramScheduledPostsMap.get(id);
    if (!existing) return undefined;
    const updated = { 
      ...existing, 
      lastSentAt: sentAt,
      sentCount: existing.sentCount + 1,
      updatedAt: new Date(),
      status: repeatDaily ? existing.status : 'completed'
    };
    this.telegramScheduledPostsMap.set(id, updated);
    return updated;
  }



  // Crash Settings methods
  async getCrashSettings(): Promise<CrashSetting | undefined> {
    const settings = Array.from(this.crashSettings.values());
    if (settings.length > 0) return settings[0];
    return undefined;
  }

  async updateCrashSettings(updates: any): Promise<CrashSetting | undefined> {
    const existing = await this.getCrashSettings();
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      minCrashMultiplier: updates.minMultiplier || updates.minCrashMultiplier || existing.minCrashMultiplier,
      updatedAt: new Date()
    };
    this.crashSettings.set(existing.id, updated);
    return updated;
  }

  // Advanced Personalized Crash Settings
  async getAdvancedCrashSettings(): Promise<AdvancedCrashSetting | undefined> {
    const settings = Array.from(this.advancedCrashSettings.values());
    if (settings.length > 0) return settings[0];
    return undefined;
  }

  async updateAdvancedCrashSettings(updates: any): Promise<AdvancedCrashSetting | undefined> {
    const existing = await this.getAdvancedCrashSettings();
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.advancedCrashSettings.set(existing.id, updated);
    return updated;
  }
}

// Initialize storage with database
class StorageContainer {
  private instance!: IStorage;

  async initialize(): Promise<void> {
    // Check if DATABASE_URL is available and working
    const databaseUrl = process.env.DO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
    
    if (!databaseUrl) {
      console.log('DATABASE_URL or DO_DATABASE_URL not found or empty, switching to in-memory mode');
      const memStorage = new MemStorage();
      await memStorage.ensureInitialized();
      this.instance = memStorage;
      return;
    }

    try {
      console.log('Initializing DatabaseStorage...');
      this.instance = new DatabaseStorage();
      console.log('✅ DatabaseStorage initialized successfully');
    } catch (error) {
      console.error('❌ Database connection failed, falling back to MemStorage:', error);
      const memStorage = new MemStorage();
      await memStorage.ensureInitialized();
      this.instance = memStorage;
    }
  }

  get(): IStorage {
    return this.instance;
  }
}

const storageContainer = new StorageContainer();

// Create a proxy that always delegates to the current storage instance
const storage: IStorage = new Proxy({} as IStorage, {
  get(_, prop) {
    return (storageContainer.get() as any)[prop];
  }
});

async function initializeStorage(): Promise<void> {
  await storageContainer.initialize();
}

export { storage, initializeStorage };