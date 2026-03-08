import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import { storage, initializeStorage, type IStorage } from "./storage";
import { vipService } from "./vip-service";
import { type User, insertBetSchema, insertGameSchema, insertUserSchema, loginSchema, resetPasswordSchema, resetPasswordConfirmSchema, changePasswordSchema, changeWithdrawalPasswordSchema, setup2FASchema, verify2FASchema, validate2FASchema, telegramAuthSchema, updateSystemSettingSchema, insertTelegramAutoJoinChannelSchema, updateTelegramAutoJoinChannelSchema, insertDatabaseConnectionSchema, createAgentSchema, agentDepositSchema, agentWithdrawalSchema, updateCommissionSchema, agentSelfDepositSchema, startPasskeyRegistrationSchema, passkeyDeviceNameSchema, finishPasskeyRegistrationSchema, startPasskeyAuthenticationSchema, finishPasskeyAuthenticationSchema, updatePasskeySchema, createWithdrawalRequestSchema, sendNotificationSchema, markNotificationReadSchema, subscribeToPushSchema, unsubscribeFromPushSchema, systemSettings, agentProfiles, users, globalFreezeSessions, globalFreezeSnapshots } from "@shared/schema";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { db } from "./db";
import { eq, sql, inArray, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { z } from "zod";
import { createNOWPayment, getNOWPaymentStatus, verifyIPNSignature } from "./nowpayments";
import { parseUserAgent } from "./userAgentParser";
import { sendPasswordResetEmail, sendDepositConfirmationEmail, sendCustomEmail, sendWelcomeEmail, sendVipLevelUpgradeEmail, sendLevelUpEmail, sendWithdrawalRequestEmail, sendAgentApprovalEmail } from "./email";
import { sendWithdrawalNotification, testTelegramConnection, sendGameSignal, sendPhotoToSignalChannel, sendAdminLoginNotification, sendFailedLoginNotification, sendInvalid2FANotification, verifyChatAccess, sendChannelMessageWithButtons, sendTelegramSignal, editTelegramMessage } from "./telegram";
import sharp from "sharp";
import webPush from "web-push";
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { betSettlementService } from './bet-settlement-service';
import { betValidationService } from './bet-validation-service';
import { periodSyncService } from './period-sync-service';
import { calculationValidator } from './calculation-validator';
import { coinFlipBalanceValidator } from './coinflip-balance-validator';
import { gameAutoRecoveryService } from './game-auto-recovery-service';
import { processCompletedPayment, getPaymentCheckerStatus, triggerPaymentCheck } from './payment-checker';

// Web Push configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNzxJVkCqQqtqFmvIBftRJ1eMrD1QqlVH9wv3bNWxMF7IYc-_7xBQPPBjgAMZ7OpPVBbWVXUGhkPCZC2AhBZFmo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'XYcW7cNQGQ9kH9nH8gHj5K6F3vBqKzVCPK6JqD4gqMk';

// Auto-fix VAPID_SUBJECT: Ensure mailto: prefix is present
let VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:pursuer.ail-4d@icloud.com';
if (!VAPID_SUBJECT.startsWith('mailto:') && !VAPID_SUBJECT.startsWith('https://') && !VAPID_SUBJECT.startsWith('http://')) {
  console.log('🔧 Auto-fixing VAPID_SUBJECT: Adding mailto: prefix');
  VAPID_SUBJECT = `mailto:${VAPID_SUBJECT}`;
}

webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// WebAuthn configuration
const rpName = 'Gaming Platform';
const getRpID = () => {
  // Priority 1: Custom domain (user-configured)
  if (process.env.CUSTOM_DOMAIN) {
    return new URL(process.env.CUSTOM_DOMAIN).hostname;
  }
  
  // Priority 2: Digital Ocean App Platform domain
  // Digital Ocean sets APP_URL or you can use DIGITAL_OCEAN_APP_URL environment variable
  if (process.env.DIGITAL_OCEAN_APP_URL) {
    return new URL(process.env.DIGITAL_OCEAN_APP_URL).hostname;
  }
  if (process.env.APP_URL) {
    return new URL(process.env.APP_URL).hostname;
  }
  
  // Priority 3: Replit domain
  // Use the full subdomain for Replit development
  // Note: Passkeys registered in Replit dev won't work in production
  if (process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN;
  }
  
  // Priority 4: Fallback to localhost for development
  return 'localhost';
};

const getOrigin = () => {
  // Priority 1: Custom domain (user-configured)
  if (process.env.CUSTOM_DOMAIN) {
    return process.env.CUSTOM_DOMAIN;
  }
  
  // Priority 2: Digital Ocean App Platform
  if (process.env.DIGITAL_OCEAN_APP_URL) {
    return process.env.DIGITAL_OCEAN_APP_URL;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Priority 3: Replit - Always use HTTPS
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Priority 4: Fallback to localhost for development
  return 'http://localhost:5000';
};

const rpID = getRpID();
const origin = getOrigin();

// Log WebAuthn configuration for debugging
console.log('🔐 WebAuthn Configuration:');
console.log('   RP ID:', rpID);
console.log('   Origin:', origin);

// Helper function to convert base64url to base64
function base64urlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}

// Helper function to check if user is banned
async function checkUserBanStatus(userId: string): Promise<{ banned: boolean; message?: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { banned: false };
  }
  
  if (user.isBanned) {
    // Check if temporary ban has expired
    if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
      // Temporary ban has expired, unban the user automatically
      await storage.unbanUser(userId);
      return { banned: false };
    }
    
    // User is still banned
    const banMessage = user.bannedUntil 
      ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
      : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
    return { banned: true, message: banMessage };
  }
  
  return { banned: false };
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user is banned
  checkUserBanStatus(session.userId).then(banStatus => {
    if (banStatus.banned) {
      // Invalidate session
      (req as any).session.destroy();
      return res.status(403).json({ message: banStatus.message });
    }
    next();
  }).catch(() => {
    res.status(500).json({ message: 'Internal server error' });
  });
}

// Admin middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user is banned first, then check admin role
  checkUserBanStatus(session.userId).then(banStatus => {
    if (banStatus.banned) {
      // Invalidate session
      (req as any).session.destroy();
      return res.status(403).json({ message: banStatus.message });
    }
    
    // Check if user is admin
    return storage.getUser(session.userId).then(user => {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    });
  }).catch(() => {
    res.status(500).json({ message: 'Internal server error' });
  });
}

// Admin middleware with IP whitelist check
async function requireAdminWithIPCheck(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    // Check if user is banned first
    const banStatus = await checkUserBanStatus(session.userId);
    if (banStatus.banned) {
      (req as any).session.destroy();
      return res.status(403).json({ message: banStatus.message });
    }
    
    // Check if user is admin
    const user = await storage.getUser(session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Check IP whitelist
    const ipWhitelistSetting = await storage.getSystemSetting('admin_ip_whitelist');
    if (ipWhitelistSetting && ipWhitelistSetting.value) {
      const clientIP = getRealIP(req);
      const whitelistedIPs = ipWhitelistSetting.value.split(',').map(ip => ip.trim());
      
      if (!whitelistedIPs.includes(clientIP)) {
        console.log(`🚫 Admin access denied. IP ${clientIP} not in whitelist: ${whitelistedIPs.join(', ')}`);
        return res.status(403).json({ 
          message: `Access denied. Your IP address (${clientIP}) is not authorized to access the admin dashboard.` 
        });
      }
      
      console.log(`✅ Admin access granted. IP ${clientIP} is whitelisted`);
    }
    
    next();
  } catch (error) {
    console.error('Admin IP check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Helper function to check if IP is IPv4
function isIPv4(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

// Helper function to extract IPv4 from potential IPv6-mapped IPv4 address
function extractIPv4(ip: string): string {
  // Handle IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.1.1)
  if (ip.includes('::ffff:')) {
    const ipv4 = ip.split('::ffff:')[1];
    if (ipv4 && isIPv4(ipv4)) {
      return ipv4;
    }
  }
  return ip;
}

// Helper function to check if IP is a known proxy/CDN IP (should be excluded from security analysis)
function isKnownProxyIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // Cloudflare IP ranges
  const cloudflareRanges = [
    /^173\.245\.(4[89]|[5-6]\d|7[0-1])\./,      // 173.245.48.0/20
    /^103\.21\.24[4-7]\./,                       // 103.21.244.0/22
    /^103\.22\.20[0-3]\./,                       // 103.22.200.0/22
    /^103\.31\.4\./,                             // 103.31.4.0/22
    /^141\.101\.(64|65|66|67|68|69|70|71)\./,   // 141.101.64.0/18
    /^108\.162\./,                               // 108.162.192.0/18
    /^190\.93\.24[0-3]\./,                       // 190.93.240.0/20
    /^188\.114\.(96|97|98|99|10[0-9]|11[01])\./,// 188.114.96.0/20
    /^197\.234\.24[0-3]\./,                      // 197.234.240.0/22
    /^198\.41\.12[89]\./,                        // 198.41.128.0/17
    /^162\.158\./,                               // 162.158.0.0/15
    /^104\.(1[6-9]|2[0-9]|3[01])\./,           // 104.16.0.0/13
    /^104\.64\./,                                // 104.64.0.0/10
    /^172\.(6[4-9]|7[0-1])\./,                  // 172.64.0.0/13 - THIS IS THE ISSUE!
    /^131\.0\.72\./,                            // 131.0.72.0/22
  ];
  
  // DigitalOcean proxy IPs  
  const digitalOceanRanges = [
    /^104\.131\./,
    /^159\.89\./,
    /^165\.227\./,
    /^167\.99\./,
    /^178\.128\./,
  ];
  
  // Private/Reserved IP ranges
  const privateRanges = [
    /^10\./,                                    // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,             // 172.16.0.0/12
    /^192\.168\./,                              // 192.168.0.0/16
    /^127\./,                                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,                              // 169.254.0.0/16 (link-local)
  ];
  
  const allRanges = [...cloudflareRanges, ...digitalOceanRanges, ...privateRanges];
  
  return allRanges.some(range => range.test(ip));
}

// Helper function to get real IP address from proxy headers
// Trusted proxy headers (CF-Connecting-IP, DO-Connecting-IP, X-Forwarded-For) contain the REAL client IP
// Only filter out proxy IPs from direct connections
function getRealIP(req: Request): string {
  // Priority 1: Cloudflare Connecting IP (most reliable - always contains real client IP)
  const cfConnectingIP = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIP) {
    const cleanIP = extractIPv4(cfConnectingIP);
    if (cleanIP && cleanIP !== 'unknown') {
      return cleanIP;
    }
  }
  
  // Priority 2: DigitalOcean Connecting IP (trusted source)
  const doConnectingIP = req.headers['do-connecting-ip'] as string;
  if (doConnectingIP) {
    const cleanIP = extractIPv4(doConnectingIP);
    if (cleanIP && cleanIP !== 'unknown') {
      return cleanIP;
    }
  }
  
  // Priority 3: X-Forwarded-For (first IP is the real client, rest are proxies)
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0) {
      const cleanIP = extractIPv4(ips[0]);
      if (cleanIP && cleanIP !== 'unknown') {
        return cleanIP;
      }
    }
  }
  
  // Priority 4: X-Real-IP (trusted source)
  const xRealIP = req.headers['x-real-ip'] as string;
  if (xRealIP) {
    const cleanIP = extractIPv4(xRealIP);
    if (cleanIP && cleanIP !== 'unknown') {
      return cleanIP;
    }
  }
  
  // Priority 5: Direct connection IP (ONLY use if not a known proxy)
  // This filters out proxy IPs only when there are no trusted headers
  const directIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection as any)?.socket?.remoteAddress;
  if (directIP) {
    const cleanIP = extractIPv4(directIP);
    if (cleanIP && cleanIP !== 'unknown' && !isKnownProxyIP(cleanIP)) {
      return cleanIP;
    }
  }
  
  // Last resort
  return 'unknown';
}

// Photo validation function
function validatePhoto(photoData: string): boolean {
  if (!photoData) return true; // Photo is optional
  
  // Check if it's a valid base64 data URL
  const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
  if (!dataUrlRegex.test(photoData)) {
    return false;
  }
  
  // Check file size (base64 is ~1.37x larger than original)
  const sizeInBytes = (photoData.length - photoData.indexOf(',') - 1) * 0.75;
  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
  
  return sizeInBytes <= maxSizeInBytes;
}

// Security function to sanitize user data before sending to client
// Uses whitelist approach to only include safe fields
function sanitizeUserData(user: any) {
  return {
    id: user.id,
    publicId: user.publicId,
    email: user.email,
    profilePhoto: user.profilePhoto,
    balance: user.balance,
    role: user.role,
    vipLevel: user.vipLevel,
    isActive: user.isActive,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    totalDeposits: user.totalDeposits,
    totalWithdrawals: user.totalWithdrawals,
    totalWinnings: user.totalWinnings,
    totalLosses: user.totalLosses,
    maxBetLimit: user.maxBetLimit,
    twoFactorEnabled: user.twoFactorEnabled,
    wingoMode: user.wingoMode,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // Agent-specific fields (needed for agent dashboard settings)
    binanceId: user.binanceId,
    minDepositAmount: user.minDepositAmount,
    maxDepositAmount: user.maxDepositAmount,
    isAcceptingDeposits: user.isAcceptingDeposits
  };
}

// Security function to sanitize agent data before sending to client
function sanitizeAgentData(agent: any) {
  const sanitizedUser = sanitizeUserData(agent);
  return {
    ...sanitizedUser,
    agentProfile: agent.agentProfile // Agent profile doesn't contain sensitive data
  };
}

// Multi-level commission distribution function
// Commission is calculated from the betting fee (3% of bet amount), not the bet itself
async function distributeCommissions(userId: string, betAmount: number) {
  try {
    // Import VIP utilities
    const { VIP_LEVELS, getCommissionRate } = await import("@shared/schema");
    
    // Get the user who placed the bet
    const user = await storage.getUser(userId);
    if (!user || !user.referredBy) return; // No referrer, no commissions
    
    // Get betting fee percentage from system settings (default 3%)
    const feeSetting = await storage.getSystemSetting('betting_fee_percentage');
    let feePercentage = feeSetting?.value ? parseFloat(feeSetting.value) : 3;
    
    // Validate fee percentage to prevent NaN errors
    if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
      console.error(`Invalid betting fee percentage: ${feeSetting?.value}, using default 3%`);
      feePercentage = 3;
    }
    
    // Calculate the fee amount (e.g., 3% of $1000 bet = $30)
    const feeAmount = betAmount * (feePercentage / 100);
    
    // Track referral levels and distribute commissions FROM the fee amount
    let currentUserId: string | null = user.referredBy;
    let level = 1;
    const MAX_LEVELS = 9;
    
    while (currentUserId && level <= MAX_LEVELS) {
      const referrer = await storage.getUser(currentUserId);
      if (!referrer) break;
      
      // Get commission rate based on referrer's VIP level and team level
      const commissionRate = getCommissionRate(referrer.vipLevel, level);
      
      if (commissionRate > 0) {
        // Commission is calculated from the FEE, not the bet
        // Example: Fee is $30 (3% of $1000), Level 1 at 6% → $30 * 0.06 = $1.80
        const commissionAmount = feeAmount * commissionRate;
        
        // Update referrer's total commission (available rewards)
        // User must withdraw to wallet to add to main balance
        const newTotalCommission = (parseFloat(referrer.totalCommission) + commissionAmount).toFixed(8);
        const newLifetimeCommission = (parseFloat(referrer.lifetimeCommissionEarned || "0") + commissionAmount).toFixed(8);
        await storage.updateUser(referrer.id, {
          totalCommission: newTotalCommission,
          lifetimeCommissionEarned: newLifetimeCommission
        });
      }
      
      // Move to next level
      currentUserId = referrer.referredBy;
      level++;
    }
  } catch (error) {
    console.error('Error distributing commissions:', error);
  }
}

// Helper function to send transaction push notification (deposit/withdrawal)
export async function sendTransactionPushNotification(
  userId: string,
  transactionType: 'deposit' | 'withdrawal',
  amount: string,
  currency: string = 'USD',
  storageInstance?: IStorage
) {
  try {
    const storageToUse = storageInstance || storage;
    const user = await storageToUse.getUser(userId);
    if (!user) {
      console.log(`⚠️ [Push] User not found for transaction notification: ${userId}`);
      return;
    }

    const userSubscriptions = await storageToUse.getUserPushSubscriptions(userId);
    console.log(`🔔 [Push] Found ${userSubscriptions.length} push subscriptions for ${transactionType} notification to ${user.email}`);

    if (userSubscriptions.length === 0) {
      console.log(`⚠️ [Push] User ${user.email} has no active push subscriptions`);
      return;
    }

    const title = transactionType === 'deposit' 
      ? '✅ Deposit Successful' 
      : '✅ Withdrawal Approved';
    
    const message = transactionType === 'deposit'
      ? `Your deposit of ${amount} ${currency} has been successfully credited to your account!`
      : `Your withdrawal request of ${amount} ${currency} has been approved and is being processed!`;

    const pushPromises = userSubscriptions.map(async (sub, index) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey
        }
      };

      const payload = JSON.stringify({
        title,
        message,
        type: 'success',
        imageUrl: null,
        url: transactionType === 'deposit' ? '/account' : '/account'
      });

      console.log(`🔔 [Push] Sending ${transactionType} push ${index + 1}/${userSubscriptions.length} to endpoint: ${sub.endpoint.substring(0, 50)}...`);

      return webPush.sendNotification(pushSubscription, payload)
        .then(() => {
          console.log(`✅ [Push] ${transactionType} notification ${index + 1} sent successfully`);
        })
        .catch(error => {
          console.error(`❌ [Push] Failed to send ${transactionType} push ${index + 1}:`, error.message);
          if (error.statusCode === 410) {
            console.log(`🗑️ [Push] Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
            storageToUse.deletePushSubscription(sub.endpoint);
          }
        });
    });

    await Promise.all(pushPromises);
    console.log(`✅ [Push] All ${transactionType} push notifications sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ [Push] Error sending ${transactionType} push notifications:`, error);
  }
}

// Helper function to send push notification to agent about new deposit request
export async function sendAgentDepositRequestNotification(
  agentId: string,
  userId: string,
  amount: string,
  currency: string = 'USD',
  storageInstance?: IStorage
) {
  try {
    const storageToUse = storageInstance || storage;
    const agent = await storageToUse.getUser(agentId);
    const user = await storageToUse.getUser(userId);
    
    if (!agent || agent.role !== 'agent') {
      console.log(`⚠️ [Push] Agent not found or not an agent: ${agentId}`);
      return;
    }

    if (!user) {
      console.log(`⚠️ [Push] User not found for deposit request: ${userId}`);
      return;
    }

    const agentSubscriptions = await storageToUse.getUserPushSubscriptions(agentId);
    console.log(`🔔 [Push] Found ${agentSubscriptions.length} push subscriptions for agent deposit request notification to ${agent.email}`);

    if (agentSubscriptions.length === 0) {
      console.log(`⚠️ [Push] Agent ${agent.email} has no active push subscriptions`);
      return;
    }

    const userName = user.telegramUsername || user.telegramFirstName || user.email.split('@')[0];
    const title = '💰 New Deposit Request';
    const message = `${userName} requested a deposit of ${amount} ${currency}. Tap to review and approve.`;

    const pushPromises = agentSubscriptions.map(async (sub, index) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey
        }
      };

      const payload = JSON.stringify({
        title,
        message,
        type: 'info',
        imageUrl: null,
        url: '/agent-dashboard'
      });

      console.log(`🔔 [Push] Sending agent deposit request push ${index + 1}/${agentSubscriptions.length} to endpoint: ${sub.endpoint.substring(0, 50)}...`);

      return webPush.sendNotification(pushSubscription, payload)
        .then(() => {
          console.log(`✅ [Push] Agent deposit request notification ${index + 1} sent successfully`);
        })
        .catch(error => {
          console.error(`❌ [Push] Failed to send agent deposit request push ${index + 1}:`, error.message);
          if (error.statusCode === 410) {
            console.log(`🗑️ [Push] Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
            storageToUse.deletePushSubscription(sub.endpoint);
          }
        });
    });

    await Promise.all(pushPromises);
    console.log(`✅ [Push] All agent deposit request push notifications sent to ${agent.email}`);
  } catch (error) {
    console.error(`❌ [Push] Error sending agent deposit request push notifications:`, error);
  }
}

// Daily period system - periods calculated based on Sri Lanka time (UTC+5:30)

// Get current time in Sri Lanka timezone (UTC+5:30)
function getSriLankaTime(): Date {
  const now = new Date();
  // Sri Lanka is UTC+5:30 (5.5 hours ahead of UTC)
  const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return sriLankaTime;
}

function getTodayDateString(): string {
  const now = getSriLankaTime();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

function generateGameId(duration: number): string {
  const todayDate = getTodayDateString();
  
  // Calculate period number based on Sri Lanka time within the day
  const now = getSriLankaTime();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0); // Midnight in Sri Lanka time
  
  // Minutes since midnight in Sri Lanka time
  const minutesSinceMidnight = Math.floor((now.getTime() - startOfDay.getTime()) / (1000 * 60));
  
  // Calculate current period based on duration
  const currentPeriod = Math.floor(minutesSinceMidnight / duration) + 1;
  
  // Format: YYYYMMDD + 2-digit duration + 4-digit period number
  // Example: 20250927010779 (1-minute, period 779) or 20250927030260 (3-minute, period 260)
  const durationPadded = duration.toString().padStart(2, '0');
  const periodNumber = currentPeriod.toString().padStart(4, '0');
  
  return `${todayDate}${durationPadded}${periodNumber}`;
}

function getNumberColor(num: number): string {
  if (num === 5) return "violet";
  if ([1, 3, 7, 9].includes(num)) return "green";
  if (num === 0) return "violet";
  return "red"; // 2, 4, 6, 8
}

function getNumberSize(num: number): string {
  return num >= 5 ? "big" : "small";
}

function calculatePayout(betType: string, betValue: string, amount: number): number {
  switch (betType) {
    case "color":
      return betValue === "violet" ? amount * 4.5 : amount * 2;
    case "number":
      return amount * 9; // 9x for exact number
    case "size":
      return amount * 2;
    default:
      return amount;
  }
}

// Profit Guarantee System - FIXED VERSION
// Now loads actual house profit from database instead of in-memory tracking
class ProfitTracker {
  private static instance: ProfitTracker;
  private targetProfitPercentage: number = 20; // Default 20%
  private currentHouseProfit: number = 0; // Loaded from database
  private totalBetsFromDB: number = 0; // Total bets from database
  private lastSyncTime: number = 0;
  private syncIntervalMs: number = 30000; // Sync every 30 seconds
  
  static getInstance(): ProfitTracker {
    if (!ProfitTracker.instance) {
      ProfitTracker.instance = new ProfitTracker();
    }
    return ProfitTracker.instance;
  }

  // Update target profit percentage and current house profit from database
  async updateTargetProfit(): Promise<void> {
    try {
      // Get target profit setting
      const setting = await storage.getSystemSetting('house_profit_percentage');
      if (setting && setting.value) {
        this.targetProfitPercentage = parseInt(setting.value);
      }
      
      // Load actual house profit from database (sync periodically for performance)
      const now = Date.now();
      if (now - this.lastSyncTime > this.syncIntervalMs) {
        await this.syncFromDatabase();
        this.lastSyncTime = now;
      }
    } catch (error) {
      console.error('Failed to update profit tracker:', error);
    }
  }
  
  // Sync house profit data from database
  async syncFromDatabase(): Promise<void> {
    try {
      const db = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Get total house profit from completed games
      const profitResult = await db.db.execute(sql`
        SELECT 
          COALESCE(SUM(CAST(house_profit AS DECIMAL)), 0) as total_profit,
          COALESCE(SUM(CAST(total_bets_amount AS DECIMAL)), 0) as total_bets
        FROM games 
        WHERE status = 'completed' AND house_profit IS NOT NULL
      `);
      
      if (profitResult.rows && profitResult.rows.length > 0) {
        this.currentHouseProfit = parseFloat(profitResult.rows[0].total_profit as string) || 0;
        this.totalBetsFromDB = parseFloat(profitResult.rows[0].total_bets as string) || 0;
        console.log(`📊 [ProfitTracker] Synced from DB: House profit = $${this.currentHouseProfit.toFixed(2)}, Total bets = $${this.totalBetsFromDB.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Failed to sync profit from database:', error);
    }
  }

  // Get current profit percentage (now from database)
  getCurrentProfitPercentage(): number {
    if (this.totalBetsFromDB === 0) return 0;
    return (this.currentHouseProfit / this.totalBetsFromDB) * 100;
  }

  // Get how much we need to adjust to reach target
  getProfitAdjustment(): number {
    const currentProfit = this.getCurrentProfitPercentage();
    return this.targetProfitPercentage - currentProfit;
  }

  // Check if we should bias results toward house
  shouldBiasTowardHouse(): boolean {
    return this.getProfitAdjustment() > 2; // Only bias if more than 2% below target
  }

  // Check if we should bias results toward players (when house profit is too high)
  shouldBiasTowardPlayers(): boolean {
    return this.getProfitAdjustment() < -2; // Only bias if more than 2% above target
  }

  // Get bias strength (0-1, where 1 is maximum bias)
  // IMPROVED: Gentler bias especially for low targets like 2%
  // Key insight: For 2% target, being at 0% is only 2% off - shouldn't cause aggressive bias
  getBiasStrength(): number {
    const adjustment = Math.abs(this.getProfitAdjustment());
    const target = this.targetProfitPercentage;
    
    // Scale adjustment relative to target for fairer calculation
    // For 2% target: being 2% off is 100% relative deviation
    // For 20% target: being 2% off is only 10% relative deviation
    const relativeDeviation = target > 0 ? (adjustment / target) : adjustment;
    
    // If within 50% relative deviation (e.g., 1% off for 2% target), minimal bias
    if (relativeDeviation < 0.5) {
      return Math.min(relativeDeviation * 0.2, 0.15); // Max 15% bias when close
    }
    
    // If within 100% relative deviation (e.g., 2% off for 2% target), low bias
    if (relativeDeviation < 1.0) {
      return Math.min(0.15 + (relativeDeviation - 0.5) * 0.2, 0.25); // 15-25% bias
    }
    
    // If within 200% relative deviation, moderate bias
    if (relativeDeviation < 2.0) {
      return Math.min(0.25 + (relativeDeviation - 1.0) * 0.15, 0.4); // 25-40% bias
    }
    
    // If more than 200% off (e.g., 4%+ off for 2% target), stronger bias (max 50%)
    return Math.min(0.4 + (relativeDeviation - 2.0) * 0.05, 0.5);
  }

  // Force sync from database
  async forceSync(): Promise<void> {
    this.lastSyncTime = 0;
    await this.updateTargetProfit();
  }

  // Get current stats
  getStats() {
    return {
      currentHouseProfit: this.currentHouseProfit,
      totalBetsFromDB: this.totalBetsFromDB,
      currentProfitPercentage: this.getCurrentProfitPercentage(),
      targetProfitPercentage: this.targetProfitPercentage,
      adjustment: this.getProfitAdjustment(),
      biasStrength: this.getBiasStrength(),
      shouldBiasHouse: this.shouldBiasTowardHouse(),
      shouldBiasPlayers: this.shouldBiasTowardPlayers()
    };
  }
}

const profitTracker = ProfitTracker.getInstance();

export async function registerRoutes(app: Express): Promise<{ httpServer: Server; wss: WebSocketServer; startGames: () => void }> {
  // Initialize storage properly
  await initializeStorage();
  
  // Initialize VIP service cache to load bet limits
  await vipService.refreshCache();
  console.log('✅ VIP service cache initialized');
  
  // Initialize country blocking service
  const { countryBlockingService } = await import('./country-blocking-service');
  await countryBlockingService.loadSettings();
  console.log('✅ Country blocking service initialized');
  
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Serve service worker file explicitly before other routes
  // This ensures /service-worker.js returns JavaScript instead of HTML
  app.get('/service-worker.js', (req, res) => {
    const serviceWorkerPath = path.resolve(import.meta.dirname, '..', 'client', 'public', 'service-worker.js');
    if (fs.existsSync(serviceWorkerPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.sendFile(serviceWorkerPath);
    } else {
      res.status(404).send('Service worker not found');
    }
  });

  // Game state management
  const activeGames = new Map<number, { game: any; timer: NodeJS.Timeout; scheduledResult?: number }>();
  
  // Store recent balance updates to send to reconnecting clients
  const recentBalanceUpdates: Array<{ type: string; balanceUpdate: any }> = [];
  const MAX_STORED_UPDATES = 20;

  function broadcastToClients(data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function broadcastBalanceUpdate(userId: string, oldBalance: string, newBalance: string, changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet') {
    const changeAmount = (parseFloat(newBalance) - parseFloat(oldBalance)).toFixed(8);
    const balanceUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      oldBalance,
      newBalance,
      changeAmount,
      changeType,
      timestamp: new Date().toISOString()
    };

    const message = {
      type: 'balanceUpdate',
      balanceUpdate
    };
    
    // Store balance update for reconnecting clients
    recentBalanceUpdates.unshift(message);
    if (recentBalanceUpdates.length > MAX_STORED_UPDATES) {
      recentBalanceUpdates.pop();
    }
    
    broadcastToClients(message);
  }

  // Setup bet settlement service with broadcast callback
  betSettlementService.setBroadcastCallback(broadcastBalanceUpdate);

  // Setup bet validation service with broadcast callback
  betValidationService.setBroadcastCallback(broadcastBalanceUpdate);

  // Setup period sync service with broadcast callback
  periodSyncService.setBroadcastCallback(broadcastToClients);
  
  // Setup calculation validator with broadcast callback
  calculationValidator.setBroadcastCallback(broadcastToClients);

  // Setup Telegram support chat broadcast callback
  const { setSupportChatBroadcastCallback } = await import('./telegram');
  setSupportChatBroadcastCallback(broadcastToClients);
  console.log('✅ Telegram support chat broadcast callback registered');

  // Start automatic period synchronization (every 5 seconds)
  periodSyncService.startAutoSync(5000);
  console.log('✅ Period sync service started');

  // Setup coinflip balance validator with broadcast callback
  coinFlipBalanceValidator.setBroadcastCallback(broadcastBalanceUpdate);

  // Start automatic coinflip balance validation (every 7 seconds)
  coinFlipBalanceValidator.start();
  console.log('✅ CoinFlip balance validator started');

  // Initialize game auto-recovery service
  gameAutoRecoveryService.initialize();
  console.log('✅ Game auto-recovery service initialized');

  function broadcastAgentActivity(activity: any) {
    const message = {
      type: 'agentActivity',
      activity
    };
    
    broadcastToClients(message);
  }

  function broadcastAdminDashboardUpdate() {
    const message = {
      type: 'adminDashboardUpdate',
      timestamp: new Date().toISOString()
    };
    
    broadcastToClients(message);
  }

  async function broadcastLiveBettingUpdate() {
    try {
      const periods = [1, 3, 5, 10];
      const periodData = [];

      for (const duration of periods) {
        const colorTotals = {
          green: 0,
          red: 0,
          violet: 0
        };

        const activeGameData = activeGames.get(duration);
        if (activeGameData && activeGameData.game.status === 'active') {
          const bets = await storage.getBetsByGame(activeGameData.game.gameId);
          console.log(`📋 Game ${activeGameData.game.gameId} (${duration}min): Found ${bets.length} total bets`);
          
          for (const bet of bets) {
            if (bet.betType === 'color' && bet.status === 'pending') {
              const color = bet.betValue.toLowerCase();
              if (color === 'green' || color === 'red' || color === 'violet') {
                colorTotals[color] += parseFloat(bet.amount);
                console.log(`  ✓ ${color.toUpperCase()}: +$${bet.amount} (total now: $${colorTotals[color].toFixed(2)})`);
              }
            }
          }
        }

        periodData.push({
          duration,
          green: colorTotals.green.toFixed(2),
          red: colorTotals.red.toFixed(2),
          violet: colorTotals.violet.toFixed(2)
        });
      }

      const message = {
        type: 'liveBettingUpdate',
        liveBets: { periods: periodData }
      };
      
      console.log(`📊 Broadcasting live betting update to ${wss.clients.size} clients:`, JSON.stringify(periodData));
      broadcastToClients(message);
    } catch (error) {
      console.error('Error broadcasting live betting update:', error);
    }
  }

  async function broadcastServerMetrics() {
    try {
      const os = await import('os');
      
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      
      const cpuUsage = cpus.map((cpu, i) => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
        return {
          core: i,
          usage: Math.round(usage * 100) / 100
        };
      });
      
      const avgCpuUsage = cpuUsage.reduce((acc, cpu) => acc + cpu.usage, 0) / cpuCount;
      
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const uptime = os.uptime();
      const loadAvg = os.loadavg();
      
      const formatBytes = (bytes: number) => {
        const gb = bytes / (1024 ** 3);
        return `${gb.toFixed(2)} GB`;
      };
      
      const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        
        return parts.length > 0 ? parts.join(' ') : '< 1m';
      };
      
      const message = {
        type: 'serverMetrics',
        metrics: {
          cpu: {
            count: cpuCount,
            model: cpus[0]?.model || 'Unknown',
            usage: Math.round(avgCpuUsage * 100) / 100,
            cores: cpuUsage,
            loadAverage: {
              '1min': Math.round(loadAvg[0] * 100) / 100,
              '5min': Math.round(loadAvg[1] * 100) / 100,
              '15min': Math.round(loadAvg[2] * 100) / 100
            }
          },
          memory: {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            usagePercent: Math.round(memoryUsagePercent * 100) / 100,
            totalFormatted: formatBytes(totalMemory),
            usedFormatted: formatBytes(usedMemory),
            freeFormatted: formatBytes(freeMemory)
          },
          system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptime: Math.floor(uptime),
            uptimeFormatted: formatUptime(uptime)
          },
          timestamp: new Date().toISOString()
        }
      };
      
      broadcastToClients(message);
    } catch (error) {
      console.error('Error broadcasting server metrics:', error);
    }
  }

  async function startGame(roundDuration: number) {
    const gameId = generateGameId(roundDuration);
    
    // Check if this game already has an active timer
    const activeGameInfo = activeGames.get(roundDuration);
    if (activeGameInfo && activeGameInfo.game.gameId === gameId) {
      console.log(`✅ Game ${gameId} already running with active timer, skipping duplicate start`);
      return activeGameInfo.game;
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + roundDuration * 60 * 1000);

    // Use upsert (insert or update) to handle existing games
    let game;
    try {
      if ((storage as any).db) {
        const { games } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        // First try to find existing game with this gameId
        const [existingGame] = await (storage as any).db
          .select()
          .from(games)
          .where(eq(games.gameId, gameId))
          .limit(1);
        
        if (existingGame) {
          // If game exists and is active, reuse its start/end times to avoid timer drift
          if (existingGame.status === 'active') {
            console.log(`⚠️  Game ${gameId} already exists and is active, reusing existing times`);
            game = existingGame;
          } else {
            // Game exists but is completed/cancelled, restart it with new times
            console.log(`⚠️  Game ${gameId} already exists but is ${existingGame.status}, restarting with new times`);
            const [updatedGame] = await (storage as any).db
              .update(games)
              .set({
                roundDuration,
                startTime,
                endTime,
                status: "active",
                result: null,
                resultColor: null,
                resultSize: null,
                totalBetsAmount: "0.00000000",
                totalPayouts: "0.00000000",
                houseProfit: "0.00000000",
              })
              .where(eq(games.gameId, gameId))
              .returning();
            game = updatedGame;
            console.log(`✅ Game ${gameId} restarted successfully`);
          }
        } else {
          // Create new game
          game = await storage.createGame({
            gameId,
            roundDuration,
            startTime,
            endTime,
            status: "active",
          });
        }
      } else {
        // Fallback to regular create for in-memory storage
        game = await storage.createGame({
          gameId,
          roundDuration,
          startTime,
          endTime,
          status: "active",
        });
      }
    } catch (error: any) {
      // If duplicate key error, fetch the existing game instead of updating
      if (error.code === '23505' && error.constraint === 'games_game_id_unique') {
        console.log(`⚠️  Duplicate game ${gameId} detected, fetching existing game...`);
        try {
          const { games } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          const { db } = await import("./db");
          
          // Fetch the existing game without modifying it
          const [existingGame] = await db
            .select()
            .from(games)
            .where(eq(games.gameId, gameId))
            .limit(1);
          
          if (!existingGame) {
            throw new Error(`Game ${gameId} disappeared after duplicate error`);
          }
          
          game = existingGame;
          console.log(`✅ Game ${gameId} fetched successfully, using existing start/end times`);
        } catch (fetchError) {
          console.error(`❌ Failed to fetch existing game:`, fetchError);
          throw error;
        }
      } else {
        console.error(`❌ Failed to create/update game ${gameId}:`, error);
        throw error;
      }
    }

    // Use the game's actual endTime from the database
    const gameEndTime = new Date(game.endTime);
    const timerDelay = Math.max(0, gameEndTime.getTime() - Date.now());
    console.log(`⏰ Setting timer for ${roundDuration}-minute game (${gameId}): ${timerDelay}ms (ends at ${gameEndTime.toISOString()})`);

    const timer = setTimeout(async () => {
      console.log(`⏰ Timer fired for ${roundDuration}-minute game (${gameId})`);
      await endGame(game.gameId, roundDuration);
    }, timerDelay);

    // Clear existing timer for this duration before setting new one
    const existingGame = activeGames.get(roundDuration);
    if (existingGame?.timer) {
      clearTimeout(existingGame.timer);
      console.log(`🧹 Cleared old timer for ${roundDuration}-minute game before setting new one`);
    }

    activeGames.set(roundDuration, { game, timer });

    // Register period with sync service using the game's actual times
    periodSyncService.registerPeriod(roundDuration, gameId, new Date(game.startTime), gameEndTime, 'active');

    broadcastToClients({
      type: 'gameStarted',
      game: {
        ...game,
        timeRemaining: roundDuration * 60
      }
    });

    // Send Telegram signals using new stacked message system
    if (roundDuration === 3) {
      // Send signal asynchronously (don't block game start)
      (async () => {
        try {
          // Check if signals are enabled
          const signalEnabledSetting = await storage.getSystemSetting('telegram_signals_enabled');
          if (signalEnabledSetting && signalEnabledSetting.value !== 'true') {
            console.log('Telegram signals are disabled');
            return;
          }

          // Get signal chat ID from settings
          const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
          if (!signalChatIdSetting || !signalChatIdSetting.value) {
            console.log('Telegram signal chat ID not configured');
            return;
          }

          // Generate random color for signal with weighted probabilities
          // Violet: 15%, Green: 42.5%, Red: 42.5%
          const random = Math.random() * 100;
          let randomColor: string;
          
          if (random < 15) {
            randomColor = 'violet'; // 0-15: 15%
          } else if (random < 57.5) {
            randomColor = 'green'; // 15-57.5: 42.5%
          } else {
            randomColor = 'red'; // 57.5-100: 42.5%
          }

          // Send telegram signal using new stacked message system
          const messageId = await sendTelegramSignal(gameId, roundDuration, randomColor, signalChatIdSetting.value);
          
          if (!messageId) {
            console.error('Failed to send telegram signal - no message ID returned');
            return;
          }

          // Save signal to database
          const { insertTelegramSignalSchema } = await import('@shared/schema');
          const validation = insertTelegramSignalSchema.parse({
            gameId,
            duration: roundDuration,
            colour: randomColor,
            chatId: signalChatIdSetting.value,
          });
          
          const signal = await storage.createTelegramSignal(validation);
          
          // Update with message ID and sent status
          await storage.updateTelegramSignal(signal.id, {
            messageId,
            status: 'sent',
            sentAt: new Date().toISOString(),
          });

          console.log(`✅ Auto-signal sent for game ${gameId}: ${randomColor}`);
        } catch (err) {
          console.error('Failed to send game signal:', err);
        }
      })();
    }

    // Send 1-minute Telegram signals (separate from 3-minute signals)
    if (roundDuration === 1) {
      // Send signal asynchronously (don't block game start)
      (async () => {
        try {
          // Check if 1-minute signals are enabled
          const signal1minEnabledSetting = await storage.getSystemSetting('telegram_1min_signals_enabled');
          if (signal1minEnabledSetting && signal1minEnabledSetting.value !== 'true') {
            console.log('1-minute Telegram signals are disabled');
            return;
          }

          // Get 1-minute signal chat ID from settings
          const signal1minChatIdSetting = await storage.getSystemSetting('telegram_1min_signal_chat_id');
          if (!signal1minChatIdSetting || !signal1minChatIdSetting.value) {
            console.log('1-minute Telegram signal chat ID not configured');
            return;
          }

          // Generate random color for signal with weighted probabilities
          // Violet: 15%, Green: 42.5%, Red: 42.5%
          const random = Math.random() * 100;
          let randomColor: string;
          
          if (random < 15) {
            randomColor = 'violet'; // 0-15: 15%
          } else if (random < 57.5) {
            randomColor = 'green'; // 15-57.5: 42.5%
          } else {
            randomColor = 'red'; // 57.5-100: 42.5%
          }

          // Send telegram signal using new stacked message system
          const messageId = await sendTelegramSignal(gameId, roundDuration, randomColor, signal1minChatIdSetting.value);
          
          if (!messageId) {
            console.error('Failed to send 1-minute telegram signal - no message ID returned');
            return;
          }

          // Save signal to database
          const { insertTelegramSignalSchema } = await import('@shared/schema');
          const validation = insertTelegramSignalSchema.parse({
            gameId,
            duration: roundDuration,
            colour: randomColor,
            chatId: signal1minChatIdSetting.value,
          });
          
          const signal = await storage.createTelegramSignal(validation);
          
          // Update with message ID and sent status
          await storage.updateTelegramSignal(signal.id, {
            messageId,
            status: 'sent',
            sentAt: new Date().toISOString(),
          });

          console.log(`✅ Auto-signal sent for 1min game ${gameId}: ${randomColor}`);
        } catch (err) {
          console.error('Failed to send 1-minute game signal:', err);
        }
      })();
    }

    console.log(`✅ Game ${gameId} started, ends at ${gameEndTime.toISOString()}`);
    return game;
  }

  // Generate result based on selected algorithm
  async function generateGameResult(bets: any[]): Promise<number> {
    // Get selected algorithm from system settings
    const algorithmSetting = await storage.getSystemSetting('game_algorithm');
    const algorithm = algorithmSetting?.value || 'profit_guaranteed';
    
    if (bets.length === 0) {
      return Math.floor(Math.random() * 10); // No bets, always random (0-9)
    }

    switch (algorithm) {
      case 'fair_random':
        return generateFairRandomResult();
      
      case 'player_favored':
        return generatePlayerFavoredResult(bets);
      
      case 'percentage_control':
        return generatePercentageControlResult(bets);
      
      case 'profit_guaranteed':
      default:
        return generateProfitGuaranteedResult(bets);
    }
  }

  // Algorithm 1: Fair Random - completely random results
  function generateFairRandomResult(): number {
    return Math.floor(Math.random() * 10); // Generate 0-9
  }

  // Algorithm 4: Percentage Control - Simple percentage-based house win rate
  // Features:
  // 1. Admin sets house_win_percentage (e.g., 60% = house wins 60% of the time)
  // 2. Always makes the HIGHER bet amount lose (to maximize house profit)
  // 3. Does NOT consider cumulative profit tracking - each game is independent
  async function generatePercentageControlResult(bets: any[]): Promise<number> {
    // Get house win percentage from settings (default 60%)
    const houseWinPercentageSetting = await storage.getSystemSetting('house_win_percentage');
    let houseWinPercentage = houseWinPercentageSetting?.value ? parseFloat(houseWinPercentageSetting.value) : 60;
    
    // Validate percentage (0-100)
    if (isNaN(houseWinPercentage) || houseWinPercentage < 0 || houseWinPercentage > 100) {
      console.error(`Invalid house win percentage: ${houseWinPercentageSetting?.value}, using default 60%`);
      houseWinPercentage = 60;
    }
    
    console.log(`🎰 [PercentageControl] House Win Rate: ${houseWinPercentage}%, Player Win Rate: ${100 - houseWinPercentage}%`);
    
    // Calculate total bets per color
    const colorBets: { [key: string]: number } = {
      green: 0,
      red: 0,
      violet: 0
    };
    
    // Calculate total bets per size
    const sizeBets: { [key: string]: number } = {
      big: 0,
      small: 0
    };
    
    // Calculate total bets per number
    const numberBets: { [key: number]: number } = {};
    for (let i = 0; i <= 9; i++) {
      numberBets[i] = 0;
    }
    
    // Aggregate all bets
    for (const bet of bets) {
      const amount = parseFloat(bet.amount);
      if (bet.betType === 'color') {
        colorBets[bet.betValue] = (colorBets[bet.betValue] || 0) + amount;
      } else if (bet.betType === 'size') {
        sizeBets[bet.betValue] = (sizeBets[bet.betValue] || 0) + amount;
      } else if (bet.betType === 'number') {
        const num = parseInt(bet.betValue);
        numberBets[num] = (numberBets[num] || 0) + amount;
      }
    }
    
    console.log(`🎰 [PercentageControl] Color Bets: Green=$${colorBets.green.toFixed(2)}, Red=$${colorBets.red.toFixed(2)}, Violet=$${colorBets.violet.toFixed(2)}`);
    console.log(`🎰 [PercentageControl] Size Bets: Big=$${sizeBets.big.toFixed(2)}, Small=$${sizeBets.small.toFixed(2)}`);
    
    // Calculate house profit for each possible result (0-9)
    const resultAnalysis = [];
    for (let testResult = 0; testResult <= 9; testResult++) {
      const testColor = getNumberColor(testResult);
      const testSize = getNumberSize(testResult);
      
      let totalBetsAmount = 0;
      let totalPayout = 0;
      
      for (const bet of bets) {
        const amount = parseFloat(bet.amount);
        const potential = parseFloat(bet.potential);
        totalBetsAmount += amount;
        
        let wins = false;
        if (bet.betType === 'color' && bet.betValue === testColor) wins = true;
        if (bet.betType === 'size' && bet.betValue === testSize) wins = true;
        if (bet.betType === 'number' && parseInt(bet.betValue) === testResult) wins = true;
        
        if (wins) {
          totalPayout += potential;
        }
      }
      
      const houseProfit = totalBetsAmount - totalPayout;
      
      resultAnalysis.push({
        result: testResult,
        color: getNumberColor(testResult),
        size: getNumberSize(testResult),
        totalBetsAmount,
        totalPayout,
        houseProfit
      });
    }
    
    // Sort by house profit (highest first = higher bet amount loses)
    resultAnalysis.sort((a, b) => b.houseProfit - a.houseProfit);
    
    // Results that favor house (house profit > 0)
    const houseFavorResults = resultAnalysis.filter(r => r.houseProfit > 0);
    // Results that favor players (house profit < 0)
    const playerFavorResults = resultAnalysis.filter(r => r.houseProfit < 0);
    // Neutral results (house profit = 0)
    const neutralResults = resultAnalysis.filter(r => r.houseProfit === 0);
    
    console.log(`🎰 [PercentageControl] House-favor results: ${houseFavorResults.length}, Player-favor results: ${playerFavorResults.length}, Neutral: ${neutralResults.length}`);
    
    // Roll the dice based on house win percentage
    const roll = Math.random() * 100;
    const houseWins = roll < houseWinPercentage;
    
    console.log(`🎰 [PercentageControl] Roll: ${roll.toFixed(2)}, House wins this round: ${houseWins}`);
    
    let selectedResult: number;
    
    if (houseWins) {
      // House wins - pick result with HIGHEST house profit (higher bets lose)
      if (houseFavorResults.length > 0) {
        // Pick from top results that favor house
        const topResults = houseFavorResults.slice(0, Math.min(3, houseFavorResults.length));
        const randomIndex = Math.floor(Math.random() * topResults.length);
        selectedResult = topResults[randomIndex].result;
        console.log(`🏦 [PercentageControl] HOUSE WINS - Selected result ${selectedResult} (profit: $${topResults[randomIndex].houseProfit.toFixed(2)})`);
      } else if (neutralResults.length > 0) {
        // No house-favor results, use neutral
        const randomIndex = Math.floor(Math.random() * neutralResults.length);
        selectedResult = neutralResults[randomIndex].result;
        console.log(`🏦 [PercentageControl] HOUSE WINS (neutral) - Selected result ${selectedResult}`);
      } else {
        // All results favor players, pick least loss
        selectedResult = resultAnalysis[0].result;
        console.log(`🏦 [PercentageControl] HOUSE WINS (min loss) - Selected result ${selectedResult}`);
      }
    } else {
      // Players win - pick result with LOWEST house profit (higher bets win, or negative profit)
      if (playerFavorResults.length > 0) {
        // Pick from results that favor players (negative house profit)
        const topPlayerResults = playerFavorResults.slice(-3); // Get lowest profit results
        const randomIndex = Math.floor(Math.random() * topPlayerResults.length);
        selectedResult = topPlayerResults[randomIndex].result;
        console.log(`🎮 [PercentageControl] PLAYERS WIN - Selected result ${selectedResult} (house loss: $${Math.abs(topPlayerResults[randomIndex].houseProfit).toFixed(2)})`);
      } else if (neutralResults.length > 0) {
        // No player-favor results, use neutral
        const randomIndex = Math.floor(Math.random() * neutralResults.length);
        selectedResult = neutralResults[randomIndex].result;
        console.log(`🎮 [PercentageControl] PLAYERS WIN (neutral) - Selected result ${selectedResult}`);
      } else {
        // All results favor house, pick least profit for house
        selectedResult = resultAnalysis[resultAnalysis.length - 1].result;
        console.log(`🎮 [PercentageControl] PLAYERS WIN (min house profit) - Selected result ${selectedResult}`);
      }
    }
    
    return selectedResult;
  }

  // Algorithm 2: Profit Guaranteed - IMPROVED VERSION
  // Key fix: Select results CLOSE to target profit, not maximum profit
  async function generateProfitGuaranteedResult(bets: any[]): Promise<number> {
    // Update profit tracker from system settings
    await profitTracker.updateTargetProfit();
    
    const stats = profitTracker.getStats();
    const targetProfit = stats.targetProfitPercentage; // e.g., 2%
    
    // Calculate potential payouts for each possible result
    const resultAnalysis = [];
    for (let testResult = 0; testResult <= 9; testResult++) {
      const testColor = getNumberColor(testResult);
      const testSize = getNumberSize(testResult);
      let totalPayout = 0;
      let totalBets = 0;

      for (const bet of bets) {
        totalBets += parseFloat(bet.amount);
        let won = false;
        
        switch (bet.betType) {
          case "color":
            won = bet.betValue === testColor;
            break;
          case "number":
            won = parseInt(bet.betValue) === testResult;
            break;
          case "size":
            won = bet.betValue === testSize;
            break;
        }

        if (won) {
          totalPayout += parseFloat(bet.potential);
        }
      }

      const houseProfit = totalBets - totalPayout;
      const houseProfitPercentage = totalBets > 0 ? (houseProfit / totalBets) * 100 : 0;
      
      // Calculate how close this result is to our target profit
      const distanceFromTarget = Math.abs(houseProfitPercentage - targetProfit);

      resultAnalysis.push({
        result: testResult,
        totalBets,
        totalPayout,
        houseProfit,
        houseProfitPercentage,
        distanceFromTarget
      });
    }

    const biasStrength = profitTracker.getBiasStrength();
    const shouldBiasTowardHouse = profitTracker.shouldBiasTowardHouse();
    const shouldBiasTowardPlayers = profitTracker.shouldBiasTowardPlayers();
    
    console.log(`📊 [Algorithm] Target: ${targetProfit}%, Current: ${stats.currentProfitPercentage.toFixed(2)}%, Adjustment: ${stats.adjustment.toFixed(2)}%, BiasStrength: ${(biasStrength * 100).toFixed(1)}%`);
    console.log(`📊 [Algorithm] BiasHouse: ${shouldBiasTowardHouse}, BiasPlayers: ${shouldBiasTowardPlayers}`);

    // IMPROVED LOGIC: When near target, pick results CLOSEST to target profit
    // This prevents the algorithm from choosing max-loss results (100% house profit)
    
    // Filter results to acceptable range based on current state
    let acceptableResults = [...resultAnalysis];
    
    if (shouldBiasTowardHouse) {
      // Need more house profit - filter to positive profit results, but NOT extreme ones
      // For 2% target: prefer results giving 0-20% profit, not 100%
      const maxAcceptableProfit = Math.min(targetProfit + 15, 25); // Cap at 25% max per round
      acceptableResults = resultAnalysis.filter(r => 
        r.houseProfitPercentage >= 0 && r.houseProfitPercentage <= maxAcceptableProfit
      );
      
      // If no results in range, use results with positive profit but sort by closeness to target
      if (acceptableResults.length === 0) {
        acceptableResults = resultAnalysis.filter(r => r.houseProfitPercentage >= 0);
      }
    } else if (shouldBiasTowardPlayers) {
      // Need to give players more wins - filter to player-friendly results
      // BUG FIX: When biasing toward players, we need NEGATIVE house profit (players WIN)
      // The stronger the deviation from target, the more aggressively we favor players
      const adjustment = stats.adjustment; // This is negative when above target (e.g., -56.46)
      
      // Calculate how much we're above target as a factor for aggression
      const aboveTargetAmount = Math.abs(adjustment);
      
      // When significantly above target, prefer negative profit results (players win)
      // More above target = more aggressive bias toward player wins
      let maxAcceptableProfit: number;
      let minAcceptableProfit: number;
      
      if (aboveTargetAmount > 30) {
        // Very high profit (30%+ above target) - strongly favor players, prefer negative profits
        maxAcceptableProfit = Math.min(0, targetProfit - 10); // Must be 0 or negative
        minAcceptableProfit = -50; // Allow up to 50% player advantage
        console.log(`🎮 [Algorithm] HIGH player bias: Looking for results with house profit between ${minAcceptableProfit}% and ${maxAcceptableProfit}%`);
      } else if (aboveTargetAmount > 15) {
        // Moderately above target - moderate player bias
        maxAcceptableProfit = Math.min(targetProfit - 5, 5); // Slightly positive or negative
        minAcceptableProfit = -30; // Allow up to 30% player advantage
        console.log(`🎮 [Algorithm] MODERATE player bias: Looking for results with house profit between ${minAcceptableProfit}% and ${maxAcceptableProfit}%`);
      } else {
        // Slightly above target - gentle bias
        maxAcceptableProfit = targetProfit;
        minAcceptableProfit = -15; // Allow up to 15% player advantage
        console.log(`🎮 [Algorithm] GENTLE player bias: Looking for results with house profit between ${minAcceptableProfit}% and ${maxAcceptableProfit}%`);
      }
      
      // Filter for player-favorable results (negative house profit = players win)
      acceptableResults = resultAnalysis.filter(r => 
        r.houseProfitPercentage <= maxAcceptableProfit && r.houseProfitPercentage >= minAcceptableProfit
      );
      
      // Sort by LOWEST house profit first (most favorable to players)
      acceptableResults.sort((a, b) => a.houseProfitPercentage - b.houseProfitPercentage);
      
      console.log(`🎮 [Algorithm] Found ${acceptableResults.length} player-favorable results`);
      
      if (acceptableResults.length === 0) {
        // Fallback: get ANY results below target profit
        acceptableResults = resultAnalysis.filter(r => r.houseProfitPercentage <= targetProfit);
        acceptableResults.sort((a, b) => a.houseProfitPercentage - b.houseProfitPercentage);
      }
      
      if (acceptableResults.length === 0) {
        // Last resort: use all results but sort by lowest profit
        acceptableResults = [...resultAnalysis].sort((a, b) => a.houseProfitPercentage - b.houseProfitPercentage);
      }
    }
    
    // If still no acceptable results, use all results
    if (acceptableResults.length === 0) {
      acceptableResults = [...resultAnalysis];
    }
    
    // Sort by distance from target (closest first) - BUT NOT when biasing toward players
    // When biasing toward players, keep the sorting by lowest profit (already sorted above)
    if (!shouldBiasTowardPlayers) {
      acceptableResults.sort((a, b) => a.distanceFromTarget - b.distanceFromTarget);
    }
    
    console.log(`📊 [Algorithm] Acceptable results: ${acceptableResults.length}, Best match profit: ${acceptableResults[0]?.houseProfitPercentage.toFixed(1)}%`);

    // BALANCED SELECTION: Mix of closeness-to-target and randomness
    if (biasStrength > 0.05 && (shouldBiasTowardHouse || shouldBiasTowardPlayers)) {
      // Use weighted selection favoring results based on current bias direction
      // When biasing toward players: higher weight = lower house profit (players win more)
      // When biasing toward house: higher weight = closer to target profit
      
      // When significantly above target, use stronger bias to favor players
      const isStrongPlayerBias = shouldBiasTowardPlayers && Math.abs(stats.adjustment) > 30;
      const cappedBias = isStrongPlayerBias ? Math.min(biasStrength, 0.7) : Math.min(biasStrength, 0.4);
      
      const weights: number[] = [];
      for (let i = 0; i < acceptableResults.length; i++) {
        // Gentler decay - results closer to target get higher weight but not extreme
        const weight = Math.pow(1 - cappedBias * 0.5, i) + 0.1; // Add floor of 0.1
        weights.push(weight);
      }
      
      // Normalize weights
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map(w => w / totalWeight);
      
      // Weighted random selection
      const random = Math.random();
      let cumulative = 0;
      for (let i = 0; i < acceptableResults.length; i++) {
        cumulative += normalizedWeights[i];
        if (random <= cumulative) {
          const selected = acceptableResults[i];
          console.log(`🎯 [Algorithm] Selected result ${selected.result} (profit: ${selected.houseProfitPercentage.toFixed(1)}%, target distance: ${selected.distanceFromTarget.toFixed(1)}%)`);
          return selected.result;
        }
      }
      
      // Fallback to best match
      return acceptableResults[0].result;
    } else {
      // Near target - use mostly random with slight preference for target-close results
      // 70% pure random, 30% closest to target
      if (Math.random() < 0.7) {
        const randomResult = Math.floor(Math.random() * 10);
        console.log(`🎲 [Algorithm] Pure random result: ${randomResult} (near target)`);
        return randomResult;
      } else {
        const selected = acceptableResults[0];
        console.log(`🎯 [Algorithm] Target-optimal result: ${selected.result} (profit: ${selected.houseProfitPercentage.toFixed(1)}%)`);
        return selected.result;
      }
    }
  }

  // Algorithm 3: Player Favored - slightly favor players
  function generatePlayerFavoredResult(bets: any[]): number {
    // Calculate potential payouts for each possible result
    const resultAnalysis = [];
    for (let testResult = 0; testResult <= 9; testResult++) {
      const testColor = getNumberColor(testResult);
      const testSize = getNumberSize(testResult);
      let totalPayout = 0;
      let totalBets = 0;

      for (const bet of bets) {
        totalBets += parseFloat(bet.amount);
        let won = false;
        
        switch (bet.betType) {
          case "color":
            won = bet.betValue === testColor;
            break;
          case "number":
            won = parseInt(bet.betValue) === testResult;
            break;
          case "size":
            won = bet.betValue === testSize;
            break;
        }

        if (won) {
          totalPayout += parseFloat(bet.potential);
        }
      }

      const houseProfit = totalBets - totalPayout;
      const playerAdvantage = totalPayout - totalBets; // Positive when players win more

      resultAnalysis.push({
        result: testResult,
        totalBets,
        totalPayout,
        houseProfit,
        playerAdvantage
      });
    }

    // Sort by player advantage (descending) - favor results where players win more
    resultAnalysis.sort((a, b) => b.playerAdvantage - a.playerAdvantage);
    
    // 60% chance to pick from top 3 most favorable results for players
    // 40% chance for completely random
    if (Math.random() < 0.6) {
      const favorableResults = resultAnalysis.slice(0, 3);
      const selectedIndex = Math.floor(Math.random() * favorableResults.length);
      return favorableResults[selectedIndex].result;
    } else {
      return Math.floor(Math.random() * 10); // Generate 0-9
    }
  }

  // Helper function to calculate house profit analysis for all possible results
  function calculateHouseProfitAnalysis(bets: any[]): Array<{
    result: number;
    totalBets: number;
    totalPayout: number;
    houseProfit: number;
    houseProfitPercentage: number;
  }> {
    const resultAnalysis = [];
    
    for (let testResult = 0; testResult <= 9; testResult++) {
      const testColor = getNumberColor(testResult);
      const testSize = getNumberSize(testResult);
      let totalPayout = 0;
      let totalBets = 0;

      for (const bet of bets) {
        totalBets += parseFloat(bet.amount);
        let won = false;
        let payout = 0;
        
        switch (bet.betType) {
          case "color":
            won = bet.betValue === testColor;
            if (won) {
              // Color bets: 2x for green/red, 4.5x for violet
              if (bet.betValue === 'violet') {
                payout = parseFloat(bet.amount) * 4.5;
              } else {
                payout = parseFloat(bet.amount) * 2;
              }
            }
            break;
          case "number":
            won = parseInt(bet.betValue) === testResult;
            if (won) {
              // Number bets: 9x for all numbers (0-9)
              payout = parseFloat(bet.amount) * 9;
            }
            break;
          case "size":
            won = bet.betValue === testSize;
            if (won) {
              // Size bets: 2x
              payout = parseFloat(bet.amount) * 2;
            }
            break;
        }

        if (won) {
          // Use potential if available, otherwise use calculated payout
          if (bet.potential && !isNaN(parseFloat(bet.potential))) {
            totalPayout += parseFloat(bet.potential);
          } else {
            totalPayout += payout;
          }
        }
      }

      const houseProfit = totalBets - totalPayout;
      const houseProfitPercentage = totalBets > 0 ? (houseProfit / totalBets) * 100 : 0;

      resultAnalysis.push({
        result: testResult,
        totalBets,
        totalPayout,
        houseProfit,
        houseProfitPercentage
      });
    }

    return resultAnalysis;
  }

  // Helper function to select optimal result based on house profit percentage target
  async function selectOptimalResult(profitAnalysis: Array<{
    result: number;
    houseProfitPercentage: number;
  }>): Promise<number> {
    // Get the target house profit percentage from settings
    const targetProfitSetting = await storage.getSystemSetting('house_profit_target_percentage');
    let targetProfit = targetProfitSetting?.value ? parseFloat(targetProfitSetting.value) : 20;
    
    // Validate target percentage (0-100)
    if (isNaN(targetProfit) || targetProfit < 0 || targetProfit > 100) {
      console.error(`Invalid house profit target: ${targetProfitSetting?.value}, using default 20%`);
      targetProfit = 20;
    }

    // Sort by how close to target profit percentage (ascending - closest first)
    const sortedByCloseness = [...profitAnalysis].sort((a, b) => {
      const diffA = Math.abs(a.houseProfitPercentage - targetProfit);
      const diffB = Math.abs(b.houseProfitPercentage - targetProfit);
      return diffA - diffB;
    });

    // Pick from top 3 closest results to add some randomness
    const topCandidates = sortedByCloseness.slice(0, 3);
    const selectedIndex = Math.floor(Math.random() * topCandidates.length);
    const selectedResult = topCandidates[selectedIndex];

    console.log(`💰 [ProfitOptimization] Target: ${targetProfit}%, Selected result: ${selectedResult.result} (${selectedResult.houseProfitPercentage.toFixed(2)}% profit)`);
    
    return selectedResult.result;
  }

  async function endGame(gameId: string, roundDuration: number) {
    console.log(`🎲 Ending game ${gameId} (${roundDuration}-minute)`);
    
    const gameData = await storage.getGameByGameId(gameId);
    if (gameData && gameData.endTime) {
      const now = new Date();
      const endTime = new Date(gameData.endTime);
      const graceMs = 1000;
      
      // Check if there's a significant time difference, but DON'T block
      // This can happen when multiple server instances are running
      if (now.getTime() < (endTime.getTime() - graceMs)) {
        const secondsEarly = Math.floor((endTime.getTime() - now.getTime()) / 1000);
        console.warn(`⚠️  Timer fired ${secondsEarly}s before database endTime for game ${gameId}`);
        console.warn(`   Current time: ${now.toISOString()}`);
        console.warn(`   Database endTime: ${endTime.toISOString()}`);
        console.warn(`   This is likely due to multiple server instances updating the same game.`);
        console.warn(`   Proceeding with game completion (trusting timer over database).`);
        // Don't return - proceed with ending the game
      }
    }
    
    // Add 5 second delay to ensure client timer reaches 00:00 before results are shown
    // This accounts for client-server clock drift and network latency
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`⏱️  Result delay complete for game ${gameId}`);
    
    // Get all bets first to analyze them
    const bets = await storage.getBetsByGame(gameId);
    console.log(`📊 Found ${bets.length} bets for game ${gameId}`);
    
    let result: number;
    let usedAdminPrediction = false; // Track if we used an admin prediction
    
    if (gameData && gameData.manualResult !== null && gameData.manualResult !== undefined) {
      // Use the manual result from database (most reliable)
      result = gameData.manualResult;
      usedAdminPrediction = true; // Manual result is like a prediction - don't override
      console.log(`🎯 Using manual result from database: ${result}`);
    } else {
      // Check if there's a scheduled manual result in memory (backup check)
      const activeGame = activeGames.get(roundDuration);
      if (activeGame && activeGame.scheduledResult !== undefined) {
        // Use the manually scheduled result
        result = activeGame.scheduledResult;
        usedAdminPrediction = true; // Scheduled result is like a prediction - don't override
        console.log(`🎯 Using scheduled result from memory: ${result}`);
      } else {
        // Check if there's a predicted result from admin predictions
        try {
          const allPredictions = await storage.getPredictedResults('any');
          const prediction = allPredictions.find(p => p.periodId === gameId);
          
          if (prediction) {
            result = prediction.result;
            usedAdminPrediction = true; // CRITICAL: Mark that we used admin prediction
            console.log(`🔮 Using predicted result from database: ${result} for period ${gameId}`);
          } else {
            // Generate result based on selected algorithm
            result = await generateGameResult(bets);
            console.log(`🎲 Generated result: ${result}`);
          }
        } catch (error) {
          console.error('Error checking predicted results:', error);
          // Fallback to generated result
          result = await generateGameResult(bets);
          console.log(`🎲 Generated result: ${result}`);
        }
      }
    }
    
    let resultColor = getNumberColor(result);
    let resultSize = getNumberSize(result);

    // NEW LOGIC: Telegram signals vs House Profit Optimization
    // - If NO bets placed → Use telegram signals (80% win rate)
    // - If ANY bets placed → Use house profit optimization (ignore signals)
    let telegramSignalResult: 'WIN' | 'LOSS' | null = null;
    let signalData: any = null;
    let autoRed = false;
    let autoRedNumber: number | undefined;
    
    try {
      const signal = await storage.getTelegramSignalByGameId(gameId);
      if (signal && signal.messageId && signal.status === 'sent') {
        signalData = signal;
        console.log(`📱 [SignalProcessing] Found telegram signal for game ${gameId}: ${signal.colour}`);
        
        // CRITICAL FIX: If admin prediction was used, DON'T override it!
        // Admin predictions have HIGHEST priority over telegram signals and algorithms
        if (usedAdminPrediction) {
          // ═══════════════════════════════════════════════════════════════
          // CASE 0: ADMIN PREDICTION EXISTS → Use it, just determine signal outcome
          // ═══════════════════════════════════════════════════════════════
          console.log(`🔮 [SignalProcessing] Admin prediction in use. NOT overriding result: ${result}`);
          telegramSignalResult = signal.colour === resultColor ? 'WIN' : 'LOSS';
          autoRed = false;
          autoRedNumber = undefined;
          console.log(`📱 [SignalProcessing] Signal outcome determined: ${telegramSignalResult} (signal: ${signal.colour}, result: ${resultColor})`);
        }
        // KEY DECISION POINT: Check if ANY users placed bets
        else if (bets.length === 0) {
          // ═══════════════════════════════════════════════════════════════
          // CASE 1: NO BETS → Follow telegram signal with 80% win rate
          // ═══════════════════════════════════════════════════════════════
          console.log(`📊 [SignalProcessing] NO bets placed. Following telegram signal logic (80% win rate).`);
          
          const winPercentageSetting = await storage.getSystemSetting('telegram_signal_win_percentage');
          let winPercentage = winPercentageSetting?.value ? parseFloat(winPercentageSetting.value) : 80;
          
          if (isNaN(winPercentage) || winPercentage < 0 || winPercentage > 100) {
            console.error(`Invalid signal win percentage: ${winPercentageSetting?.value}, using default 80%`);
            winPercentage = 80;
          }
          
          const randomChance = Math.random() * 100;
          const shouldSignalWin = randomChance < winPercentage;
          
          console.log(`📊 [SignalProcessing] Win chance: ${winPercentage}%, Random: ${randomChance.toFixed(2)}%, Should win: ${shouldSignalWin}`);
          
          if (shouldSignalWin) {
            // Force signal to WIN
            telegramSignalResult = 'WIN';
            autoRed = true;
            
            if (signal.colour === 'green') {
              const greenNumbers = [1, 3, 7, 9];
              result = greenNumbers[Math.floor(Math.random() * greenNumbers.length)];
              resultColor = 'green';
            } else if (signal.colour === 'red') {
              const redNumbers = [2, 4, 6, 8];
              result = redNumbers[Math.floor(Math.random() * redNumbers.length)];
              resultColor = 'red';
            } else if (signal.colour === 'violet') {
              result = Math.random() < 0.5 ? 0 : 5;
              resultColor = 'violet';
            }
            
            autoRedNumber = result;
            resultSize = result >= 5 ? 'big' : 'small';
            console.log(`✅ [SignalProcessing] Signal forced to WIN. Result: ${result} (${resultColor})`);
          } else {
            // Allow signal to LOSE (use random result)
            telegramSignalResult = signal.colour === resultColor ? 'WIN' : 'LOSS';
            console.log(`📊 [SignalProcessing] Signal allowed to ${telegramSignalResult}. Result: ${result} (${resultColor})`);
          }
        } else {
          // ═══════════════════════════════════════════════════════════════
          // CASE 2: BETS EXIST (no admin prediction) → Use SELECTED ALGORITHM
          // ═══════════════════════════════════════════════════════════════
          const algorithmSetting = await storage.getSystemSetting('game_algorithm');
          const currentAlgorithm = algorithmSetting?.value || 'profit_guaranteed';
          
          console.log(`💰 [SignalProcessing] ${bets.length} bet(s) placed. Using algorithm: ${currentAlgorithm}`);
          console.log(`📊 [SignalProcessing] Signal prediction was: ${signal.colour}, but will be determined by selected algorithm`);
          
          // Use the selected algorithm from generateGameResult
          result = await generateGameResult(bets);
          resultColor = getNumberColor(result);
          resultSize = getNumberSize(result);
          
          // NOW determine signal outcome based on final result
          telegramSignalResult = signal.colour === resultColor ? 'WIN' : 'LOSS';
          
          // Not auto-generated in this case (algorithm-determined)
          autoRed = false;
          autoRedNumber = undefined;
          
          console.log(`✅ [SignalProcessing] Algorithm (${currentAlgorithm}) complete. Result: ${result} (${resultColor}), Signal: ${telegramSignalResult}`);
        }
        
        console.log(`📱 [SignalProcessing] FINAL: ${result} (${resultColor}, ${resultSize}), Signal outcome: ${telegramSignalResult}`);
      }
    } catch (error) {
      console.error('❌ [SignalProcessing] Error processing telegram signal:', error);
      telegramSignalResult = null;
    }

    const completedGame = await storage.updateGameResult(gameId, result, resultColor, resultSize);
    console.log(`✅ Game ${gameId} completed with result ${result} (${resultColor}, ${resultSize})`);
    
    if (completedGame) {
      // Track total bets for this game
      let totalBetsAmount = 0;
      let totalPayouts = 0;
      
      // STEP 1: First, calculate total bet amount from ALL bets (winning and losing)
      for (const bet of bets) {
        totalBetsAmount += parseFloat(bet.amount);
      }
      
      // STEP 2: Group bets by user to detect overlapping bets on same result
      const userBetsMap = new Map<string, any[]>();
      for (const bet of bets) {
        if (!userBetsMap.has(bet.userId)) {
          userBetsMap.set(bet.userId, []);
        }
        userBetsMap.get(bet.userId)!.push(bet);
      }
      
      // STEP 3: Process each user's bets to detect and handle overlapping wins
      const betsToMarkAsWon = new Set<string>();
      const betsToMarkAsSuperseded = new Set<string>(); // Overlapping wins with $0 payout
      const betsToMarkAsLost = new Set<string>();
      
      for (const [userId, userBets] of Array.from(userBetsMap.entries())) {
        // Check which bets won
        const winningBets = userBets.filter((bet: any) => {
          let isWin = false;
          switch (bet.betType) {
            case "color":
              isWin = bet.betValue === resultColor;
              console.log(`🎯 [BetCheck] Color bet - betValue: "${bet.betValue}", resultColor: "${resultColor}", match: ${isWin}, betId: ${bet.id}`);
              return isWin;
            case "number":
              isWin = parseInt(bet.betValue) === result;
              console.log(`🎯 [BetCheck] Number bet - betValue: "${bet.betValue}", result: ${result}, match: ${isWin}, betId: ${bet.id}`);
              return isWin;
            case "size":
              isWin = bet.betValue === resultSize;
              console.log(`🎯 [BetCheck] Size bet - betValue: "${bet.betValue}", resultSize: "${resultSize}", match: ${isWin}, betId: ${bet.id}`);
              return isWin;
            default:
              return false;
          }
        });
        
        const losingBets = userBets.filter((bet: any) => !winningBets.includes(bet));
        
        // Mark all losing bets
        for (const bet of losingBets) {
          betsToMarkAsLost.add(bet.id);
        }
        
        // Check for overlapping wins (multiple bet types on same result)
        // Overlaps can happen when:
        // 1. color + number (e.g., violet + 0, when result is 0 which is violet)
        // 2. color + size (e.g., red + big, when result is 6 which is red and big)
        // 3. number + size (e.g., 7 + big, when result is 7 which is big)
        // 4. All three (color + number + size)
        
        // Group winning bets by type
        const colorWins = winningBets.filter((b: any) => b.betType === 'color');
        const numberWins = winningBets.filter((b: any) => b.betType === 'number');
        const sizeWins = winningBets.filter((b: any) => b.betType === 'size');
        
        // Count how many different bet types won
        const winningBetTypeCount = [colorWins.length > 0, numberWins.length > 0, sizeWins.length > 0].filter(Boolean).length;
        
        // If user has multiple winning bet types, they're betting on overlapping outcomes
        // Only award the bet type with the highest payout
        if (winningBetTypeCount > 1) {
          // Determine which bet type has the highest payout per bet
          // (number bets pay 9x, violet color pays 4.5x, other colors pay 2x, size pays 2x)
          
          // Priority order (highest payout first):
          // 1. Number bets (9x payout)
          // 2. Violet color (4.5x payout) 
          // 3. Size bets (2x payout)
          // 4. Other colors (2x payout)
          
          let betsToAward: any[] = [];
          
          // Always prefer number bets (highest payout)
          if (numberWins.length > 0) {
            betsToAward = numberWins;
            console.log(`⚠️  Overlapping bets detected for user ${userId}. Awarding all ${numberWins.length} number bet(s) (highest payout type)`);
          }
          // If no number bets, prefer violet color (4.5x)
          else if (colorWins.some((b: any) => b.betValue === 'violet')) {
            betsToAward = colorWins.filter((b: any) => b.betValue === 'violet');
            console.log(`⚠️  Overlapping bets detected for user ${userId}. Awarding violet color bet(s) (highest payout type)`);
          }
          // Otherwise, prefer size or other color (both 2x, so pick whichever exists)
          else if (sizeWins.length > 0) {
            betsToAward = sizeWins;
            console.log(`⚠️  Overlapping bets detected for user ${userId}. Awarding ${sizeWins.length} size bet(s)`);
          }
          else if (colorWins.length > 0) {
            betsToAward = colorWins;
            console.log(`⚠️  Overlapping bets detected for user ${userId}. Awarding ${colorWins.length} color bet(s)`);
          }
          
          // Mark awarded bets as winners (will get full payout)
          for (const bet of betsToAward) {
            betsToMarkAsWon.add(bet.id);
          }
          
          // ✅ FIX: Mark non-selected overlapping winning bets as "superseded wins"
          // They matched the result but won't get paid (higher payout bet takes precedence)
          // Status: "won" with actualPayout = "0"
          for (const bet of winningBets) {
            if (!betsToAward.includes(bet)) {
              betsToMarkAsSuperseded.add(bet.id);
              console.log(`⚠️  Bet ${bet.id} (${bet.betType}: ${bet.betValue}) won but superseded by higher payout bet`);
            }
          }
        } else {
          // Only one bet type won, or no winning bets
          // Award all winning bets normally (no overlap)
          for (const bet of winningBets) {
            betsToMarkAsWon.add(bet.id);
          }
        }
      }
      
      // STEP 4: Process all bets based on winning/losing determination
      for (const bet of bets) {
        if (betsToMarkAsWon.has(bet.id)) {
          // Process winning bet
          const totalPayout = parseFloat(bet.potential);
          const betAmount = parseFloat(bet.amount);
          const winnings = totalPayout - betAmount;
          
          // Apply betting fee - deduct fee percentage from winnings (default 3%)
          let finalPayout = totalPayout;
          const feeSetting = await storage.getSystemSetting('betting_fee_percentage');
          let feePercentage = feeSetting?.value ? parseFloat(feeSetting.value) : 3;
          
          // Validate fee percentage to prevent NaN errors
          if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
            console.error(`Invalid betting fee percentage: ${feeSetting?.value}, using default 3%`);
            feePercentage = 3;
          }
          
          if (feePercentage > 0) {
            const feeAmount = winnings * (feePercentage / 100);
            finalPayout = betAmount + (winnings - feeAmount);
            console.log(`💰 Fee applied: ${feePercentage}% of winnings (${feeAmount.toFixed(8)}), final payout: ${finalPayout.toFixed(8)}`);
          }
          
          // Update bet status with fee-deducted payout
          await storage.updateBetStatus(bet.id, "won", finalPayout.toFixed(8));
          
          // ✅ VALIDATION: Verify bet was settled correctly
          console.log(`✅ [BetSettlement] Bet ${bet.id} marked as WON - Type: ${bet.betType}, Value: "${bet.betValue}", Result: ${result} (${resultColor}, ${resultSize}), Payout: ${finalPayout.toFixed(2)}`);
          
          // totalPayouts should include fee-deducted payout
          totalPayouts += finalPayout;
          
          const user = await storage.getUser(bet.userId);
          if (user) {
            const oldBalance = user.balance;
            const newBalance = (parseFloat(user.balance) + finalPayout).toFixed(8);
            await storage.updateUserBalance(bet.userId, newBalance);
            
            // Broadcast balance update for wins
            broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win');
          }
        } else {
          // Process losing bet
          await storage.updateBetStatus(bet.id, "lost");
          
          // ✅ VALIDATION: Verify bet was settled correctly
          console.log(`❌ [BetSettlement] Bet ${bet.id} marked as LOST - Type: ${bet.betType}, Value: "${bet.betValue}", Result: ${result} (${resultColor}, ${resultSize})`);
          
          // Broadcast loss notification for animation
          const user = await storage.getUser(bet.userId);
          if (user) {
            const betAmount = parseFloat(bet.amount);
            
            // Get the fee that was deducted when placing the bet
            const feeSettingLoss = await storage.getSystemSetting('betting_fee_percentage');
            let feePercentageLoss = feeSettingLoss?.value ? parseFloat(feeSettingLoss.value) : 3;
            if (isNaN(feePercentageLoss) || feePercentageLoss < 0 || feePercentageLoss > 100) {
              feePercentageLoss = 3;
            }
            const feeAmountLoss = betAmount * (feePercentageLoss / 100);
            
            // Total amount lost = bet + fee (what was actually deducted)
            const lostAmount = betAmount + feeAmountLoss;
            const currentBalance = parseFloat(user.balance);
            // Simulate the loss by showing balance before bet was placed vs current balance
            const balanceBeforeBet = (currentBalance + lostAmount).toFixed(8);
            broadcastBalanceUpdate(bet.userId, balanceBeforeBet, user.balance, 'loss');
          }
        }
      }

      // NOTE: Profit tracker now syncs from database automatically
      // No need for manual addBet/addPayout calls

      // FIXED: Calculate house profit correctly
      // House profit = total bets collected - total payouts to winners
      const houseProfit = totalBetsAmount - totalPayouts;
      await storage.updateGameStats(gameId, {
        totalBetsAmount: totalBetsAmount.toFixed(8),
        totalPayouts: totalPayouts.toFixed(8),
        houseProfit: houseProfit.toFixed(8)
      });

      // Get updated game with stats for broadcast
      const updatedGame = await storage.getGameById(gameId);

      broadcastToClients({
        type: 'gameEnded',
        game: updatedGame || completedGame,
        result: {
          number: result,
          color: resultColor,
          size: resultSize
        }
      });

      // Broadcast admin dashboard update for game completion
      broadcastAdminDashboardUpdate();

      // ✅ FIX: Update telegram signal message (result was already determined before bet settlement)
      try {
        if (telegramSignalResult !== null) {
          const signal = await storage.getTelegramSignalByGameId(gameId);
          if (signal && signal.messageId && signal.status === 'sent') {
            // Edit telegram message with result
            const { editTelegramMessage } = await import('./telegram');
            const edited = await editTelegramMessage(
              signal.chatId,
              signal.messageId,
              gameId,
              signal.duration,
              signal.colour,
              telegramSignalResult,
              autoRed,
              autoRedNumber
            );
            
            if (edited) {
              // Update signal status in database with auto-generated data
              await storage.updateTelegramSignal(signal.id, {
                status: 'updated',
                result: telegramSignalResult,
                autoRed: autoRed,
                autoRedNumber: autoRedNumber,
              });
              console.log(`✅ Telegram signal message updated for game ${gameId}: ${telegramSignalResult}`);
            }
          }
        }
      } catch (error) {
        console.error('Error updating telegram signal message:', error);
        // Don't fail game completion if telegram update fails
      }

      // STEP 5: Handle race condition - process any bets created during game ending
      // (Bets placed just before game ended but saved to DB after processing started)
      const allBetsAfterProcessing = await storage.getBetsByGame(gameId);
      const pendingBets = allBetsAfterProcessing.filter((b: any) => b.status === 'pending');
      
      if (pendingBets.length > 0) {
        console.log(`⚠️  Found ${pendingBets.length} pending bet(s) after game processing - handling race condition`);
        
        // Track additional amounts from late bets
        let additionalBetsAmount = 0;
        let additionalPayouts = 0;
        
        for (const bet of pendingBets) {
          // Add bet amount to total
          additionalBetsAmount += parseFloat(bet.amount);
          
          // Determine if this bet won or lost
          let isWinningBet = false;
          
          switch (bet.betType) {
            case "color":
              isWinningBet = bet.betValue === resultColor;
              break;
            case "number":
              isWinningBet = parseInt(bet.betValue) === result;
              break;
            case "size":
              isWinningBet = bet.betValue === resultSize;
              break;
          }
          
          if (isWinningBet) {
            // Process winning bet
            const totalPayout = parseFloat(bet.potential);
            const betAmount = parseFloat(bet.amount);
            
            // NO fee deduction here - fee was already deducted upfront when placing bet
            // User gets full potential payout
            const finalPayout = totalPayout;
            
            await storage.updateBetStatus(bet.id, "won", finalPayout.toFixed(8));
            
            // Add payout to total
            additionalPayouts += finalPayout;
            
            const user = await storage.getUser(bet.userId);
            if (user) {
              const oldBalance = user.balance;
              const newBalance = (parseFloat(user.balance) + finalPayout).toFixed(8);
              await storage.updateUserBalance(bet.userId, newBalance);
              broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win');
            }
            
            console.log(`✅ Late bet ${bet.id} marked as WON (${bet.betType}: ${bet.betValue})`);
          } else {
            // Process losing bet
            await storage.updateBetStatus(bet.id, "lost");
            
            const user = await storage.getUser(bet.userId);
            if (user) {
              const betAmount = parseFloat(bet.amount);
              
              // Get the fee that was deducted when placing the bet
              const feeSettingLateLoss = await storage.getSystemSetting('betting_fee_percentage');
              let feePercentageLateLoss = feeSettingLateLoss?.value ? parseFloat(feeSettingLateLoss.value) : 3;
              if (isNaN(feePercentageLateLoss) || feePercentageLateLoss < 0 || feePercentageLateLoss > 100) {
                feePercentageLateLoss = 3;
              }
              const feeAmountLateLoss = betAmount * (feePercentageLateLoss / 100);
              
              // Total amount lost = bet + fee (what was actually deducted)
              const lostAmount = betAmount + feeAmountLateLoss;
              const currentBalance = parseFloat(user.balance);
              const balanceBeforeBet = (currentBalance + lostAmount).toFixed(8);
              broadcastBalanceUpdate(bet.userId, balanceBeforeBet, user.balance, 'loss');
            }
            
            console.log(`❌ Late bet ${bet.id} marked as LOST (${bet.betType}: ${bet.betValue})`);
          }
        }
        
        // FIXED: Update game stats to include late bets
        if (additionalBetsAmount > 0 || additionalPayouts > 0) {
          const updatedTotalBets = totalBetsAmount + additionalBetsAmount;
          const updatedTotalPayouts = totalPayouts + additionalPayouts;
          const updatedHouseProfit = updatedTotalBets - updatedTotalPayouts;
          
          await storage.updateGameStats(gameId, {
            totalBetsAmount: updatedTotalBets.toFixed(8),
            totalPayouts: updatedTotalPayouts.toFixed(8),
            houseProfit: updatedHouseProfit.toFixed(8)
          });
          
          // NOTE: Profit tracker now syncs from database automatically
          
          console.log(`📊 Updated game stats with late bets - Total Bets: $${updatedTotalBets.toFixed(2)}, Payouts: $${updatedTotalPayouts.toFixed(2)}, Profit: $${updatedHouseProfit.toFixed(2)}`);
          
          // Broadcast admin dashboard update for late bet stats update
          broadcastAdminDashboardUpdate();
        }
      }

      // Update period status to completed
      periodSyncService.updatePeriodStatus(roundDuration, 'completed');

      // INSTANT RESULT BROADCAST: Send game result to all clients immediately
      try {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'gameResult',
              duration: roundDuration,
              gameId: gameId,
              result: result,
              resultColor: resultColor,
              resultSize: resultSize,
              timestamp: new Date().toISOString()
            }));
          }
        });
        console.log(`📢 [InstantResult] Broadcasted result ${result} (${resultColor}, ${resultSize}) to ${wss.clients.size} clients for game ${gameId}`);
      } catch (broadcastError) {
        console.error(`❌ [InstantResult] Error broadcasting game result:`, broadcastError);
      }

      // Validate game result calculations
      calculationValidator.validateGameResult(gameId).then(validation => {
        if (!validation.isValid) {
          console.error(`⚠️  Game ${gameId} validation failed:`, validation.errors);
        } else {
          console.log(`✅ Game ${gameId} validation passed`);
        }
      }).catch(err => {
        console.error(`❌ Error validating game ${gameId}:`, err);
      });

      // Start next game automatically
      activeGames.delete(roundDuration);
      console.log(`⏳ Scheduling next ${roundDuration}-minute game to start in 5 seconds...`);
      setTimeout(() => {
        console.log(`🎮 Starting next ${roundDuration}-minute game now...`);
        startGame(roundDuration);
      }, 5000); // 5 second break between games
    }
  }

  // Setup game auto-recovery service callbacks
  gameAutoRecoveryService.setStartGameCallback(startGame);
  gameAutoRecoveryService.setGetActiveGamesCallback(() => activeGames);
  
  // Start game auto-recovery monitoring (check every 10 seconds)
  gameAutoRecoveryService.start(10000);
  console.log('✅ Game auto-recovery service started (monitoring for inactive games)');

  // NOTE: Games are now initialized via startGames() callback after server.listen()
  // The old auto-initialization code has been removed to prevent duplicate games

  // WebSocket connection handling
  wss.on('connection', async (ws) => {

    // Send current active games
    for (const [duration, { game }] of Array.from(activeGames.entries())) {
      const timeRemaining = Math.max(0, Math.floor((new Date(game.endTime).getTime() - Date.now()) / 1000));
      ws.send(JSON.stringify({
        type: 'gameState',
        duration,
        game: {
          ...game,
          timeRemaining
        }
      }));
    }
    
    // Send recent balance updates (last 10) to newly connected client as backfill
    const updates = recentBalanceUpdates.slice(0, 10);
    for (const update of updates) {
      const backfillMessage = {
        ...update,
        balanceUpdate: {
          ...update.balanceUpdate,
          isBackfill: true
        }
      };
      ws.send(JSON.stringify(backfillMessage));
    }

    ws.on('close', () => {
    });
  });

  // API Routes
  app.get('/api/games/active/:duration', async (req, res) => {
    try {
      const duration = parseInt(req.params.duration);
      const activeGame = activeGames.get(duration);
      
      if (activeGame) {
        const timeRemaining = Math.max(0, Math.floor((new Date(activeGame.game.endTime).getTime() - Date.now()) / 1000));
        res.json({
          ...activeGame.game,
          timeRemaining
        });
      } else {
        res.status(404).json({ message: 'No active game found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/games/history', async (req, res) => {
    try {
      const history = await storage.getGameHistory(10);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/bets', requireAuth, async (req, res) => {
    try {
      const betData = insertBetSchema.parse(req.body);
      
      const userId = (req as any).session.userId; // Use authenticated user ID
      
      // Validate user exists and has sufficient balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      const amount = parseFloat(betData.amount);
      
      // Get betting fee percentage for balance check
      const feeSettingCheck = await storage.getSystemSetting('betting_fee_percentage');
      let feePercentageCheck = feeSettingCheck?.value ? parseFloat(feeSettingCheck.value) : 3;
      if (isNaN(feePercentageCheck) || feePercentageCheck < 0 || feePercentageCheck > 100) {
        feePercentageCheck = 3;
      }
      const feeAmountCheck = amount * (feePercentageCheck / 100);
      const totalRequired = amount + feeAmountCheck;
      
      if (parseFloat(user.balance) < totalRequired) {
        return res.status(400).json({ 
          message: `Insufficient balance. You need $${totalRequired.toFixed(2)} (bet: $${amount.toFixed(2)} + ${feePercentageCheck}% fee: $${feeAmountCheck.toFixed(2)})` 
        });
      }

      // Look up game by gameId to get the UUID
      const game = await storage.getGameById(betData.gameId);
      if (!game) {
        return res.status(404).json({ message: 'Game not found' });
      }

      // Calculate effective bet limit based on VIP level from VIP settings (cached)
      // Use VIP level limit configured in admin dashboard
      const effectiveMaxBet = vipService.getMaxBetLimit(user.vipLevel);

      // Calculate potential payout
      const potential = calculatePayout(betData.betType, betData.betValue, amount);

      // Get betting fee percentage from system settings (default 3%)
      const feeSetting = await storage.getSystemSetting('betting_fee_percentage');
      let feePercentage = feeSetting?.value ? parseFloat(feeSetting.value) : 3;
      
      // Validate fee percentage
      if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
        console.error(`Invalid betting fee percentage: ${feeSetting?.value}, using default 3%`);
        feePercentage = 3;
      }
      
      // Calculate fee amount (e.g., 3% of bet)
      const feeAmount = amount * (feePercentage / 100);
      
      // Fee accumulation system: only deduct whole coins
      const oldBalance = user.balance;
      const oldAccumulatedFee = parseFloat(user.accumulatedFee || '0');
      const newAccumulatedFee = oldAccumulatedFee + feeAmount;
      
      // Deduct bet amount + whole coins from accumulated fees
      const wholeFeeToDeduct = Math.floor(newAccumulatedFee);
      const remainingAccumulatedFee = newAccumulatedFee - wholeFeeToDeduct;
      
      const newBalance = (parseFloat(user.balance) - amount - wholeFeeToDeduct).toFixed(8);

      // Create bet and update balance in a SINGLE transaction for speed
      console.log(`🎯 Creating bet - User: ${userId.slice(0, 8)}, GameID: ${game.gameId}, Type: ${betData.betType}, Value: ${betData.betValue}, Amount: ${betData.amount}, Potential: ${potential.toFixed(2)}`);
      
      const bet = await storage.createBetAndUpdateBalance({
        userId,
        gameId: game.gameId, // Use the period ID (e.g., "20251029010711")
        betType: betData.betType,
        betValue: betData.betValue,
        amount: betData.amount,
        potential: potential.toFixed(8)
      }, newBalance, effectiveMaxBet, remainingAccumulatedFee.toFixed(8));
      
      console.log(`✅ Bet created successfully - BetID: ${bet.id}, GameID: ${bet.gameId}`);
      
      // Send response immediately for instant bet placement
      res.json(bet);
      
      // Run broadcasts and commissions AFTER response (non-blocking)
      setImmediate(async () => {
        try {
          // Broadcast balance update for bet placement
          broadcastBalanceUpdate(userId, oldBalance, newBalance, 'bet');
          
          // Broadcast live betting update to admins
          await broadcastLiveBettingUpdate();
          
          // Distribute commissions through referral chain
          await distributeCommissions(userId, amount);
          
          // Update betting task progress for matching durations
          try {
            const activeTasks = await storage.getActiveBettingTasks();
            const gameDuration = game.roundDuration; // Use actual roundDuration from game object
            
            let taskUpdated = false;
            for (const task of activeTasks) {
              if (task.durationMinutes === gameDuration) {
                await storage.updateUserTaskProgress(userId, task.id, betData.amount);
                taskUpdated = true;
              }
            }
            
            // Broadcast betting task update to user if any task was updated
            if (taskUpdated) {
              broadcastToClients({
                type: 'bettingTaskUpdate',
                userId: userId
              });
            }
          } catch (taskError) {
            console.error('Error updating betting task progress:', taskError);
          }
        } catch (err) {
          console.error('Error in post-bet operations:', err);
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid bet data', errors: error.errors });
      } else if (error instanceof Error && error.message.includes('maximum bet limit')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });


  app.get('/api/bets/user/active', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId; // Use authenticated user ID
      const activeBets = await storage.getActiveBetsByUser(userId);
      res.json(activeBets);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all user bets for activity history
  app.get('/api/bets/user/all', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId; // Use authenticated user ID
      const allBets = await storage.getBetsByUser(userId);
      res.json(allBets);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's betting history (alias for my-history component)
  app.get('/api/bets/my-history', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const allBets = await storage.getBetsByUser(userId);
      
      // Sort by creation date (newest first)
      const sortedBets = allBets.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(sortedBets);
    } catch (error) {
      console.error('Error fetching user betting history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's game history based on games they placed bets on
  app.get('/api/games/user/history', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      // Get all user bets
      const userBets = await storage.getBetsByUser(userId);
      
      // Get unique game IDs from user's bets
      const uniqueGameIds = new Set(userBets.map(bet => bet.gameId));
      const gameIds = Array.from(uniqueGameIds);
      
      // Fetch games for these IDs
      const userGames = await Promise.all(
        gameIds.map(gameId => storage.getGameById(gameId))
      );
      
      // Filter out undefined and incomplete games, then sort by creation date (newest first)
      const completedGames = userGames
        .filter(game => game && game.status === 'completed' && game.result !== null && game.result !== undefined)
        .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime())
        .slice(0, 10); // Limit to last 10
      
      res.json(completedGames);
    } catch (error) {
      console.error('Error fetching user game history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Coin flip game endpoint
  app.post('/api/coin-flip/play', requireAuth, async (req, res) => {
    try {
      // Check if coinflip game is enabled (maintenance mode)
      const coinflipEnabledSetting = await storage.getSystemSetting('coinflip_enabled');
      const coinflipEnabled = coinflipEnabledSetting?.value !== 'false';
      
      if (!coinflipEnabled) {
        return res.status(503).json({ 
          message: 'Coinflip game is currently under maintenance. Please try again later.' 
        });
      }

      const coinFlipSchema = z.object({
        side: z.enum(['head', 'tail']),
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 0.10; // Minimum 10 coins (0.10 USD)
        })
      });

      const { side, amount } = coinFlipSchema.parse(req.body);
      const userId = (req as any).session.userId;

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      const betAmount = parseFloat(amount);
      const oldBalance = parseFloat(user.balance);
      
      // Atomically deduct the bet amount to prevent race conditions
      const deductResult = await storage.atomicDeductBalance(userId, amount, { 
        incrementTotalBets: true 
      });
      
      if (!deductResult.success) {
        return res.status(400).json({ 
          message: deductResult.error || 'Insufficient balance'
        });
      }
      
      const balanceAfterBet = parseFloat(deductResult.user!.balance);
      
      // Get win probability from settings (default 50%)
      const winProbabilitySetting = await storage.getSystemSetting('coin_flip_win_probability');
      const winProbability = winProbabilitySetting ? parseFloat(winProbabilitySetting.value) / 100 : 0.5;
      
      // Flip coin with adjusted probability
      const playerWins = Math.random() < winProbability;
      const result: 'head' | 'tail' = playerWins ? side : (side === 'head' ? 'tail' : 'head');
      const won = result === side;

      // Calculate final balance based on result
      let finalBalance: number;
      let winAmount: number | null = null;
      
      if (won) {
        // Player wins: Atomically add 2x the bet (stake + profit) to the already-deducted balance
        // This prevents race conditions from concurrent bets
        winAmount = betAmount * 2; // Total payout (stake + profit)
        const payoutResult = await storage.atomicIncrementBalance(userId, winAmount.toFixed(8));
        
        if (!payoutResult.success || !payoutResult.user) {
          // Critical error: Balance deducted but payout failed
          console.error(`CRITICAL: Failed to credit winnings for user ${userId}:`, payoutResult.error);
          return res.status(500).json({ 
            message: 'Failed to process winnings. Please contact support with this error code.',
            errorCode: `CF-WIN-${Date.now()}`
          });
        }
        
        finalBalance = parseFloat(payoutResult.user.balance);
        // = (oldBalance - bet) + (bet * 2) = oldBalance + bet
      } else {
        // Player loses: Balance already deducted, get fresh balance
        const freshUser = await storage.getUser(userId);
        finalBalance = freshUser ? parseFloat(freshUser.balance) : balanceAfterBet;
        // finalBalance = oldBalance - bet
      }
      
      // Broadcast balance update once with correct type
      broadcastBalanceUpdate(userId, oldBalance.toFixed(8), finalBalance.toFixed(8), won ? 'win' : 'loss');

      // Distribute commissions on the bet amount
      await distributeCommissions(userId, betAmount);

      // Save coin flip game to database with total payout as winAmount
      await storage.createCoinFlipGame({
        userId,
        selectedSide: side,
        result,
        betAmount: betAmount.toFixed(8),
        won,
        winAmount: won ? winAmount!.toFixed(8) : null,
      });

      // Log the transaction for debugging
      console.log(`💰 CoinFlip: User ${userId} - Bet: $${betAmount.toFixed(2)}, Result: ${result}, Won: ${won}, Old Balance: $${oldBalance.toFixed(2)}, New Balance: $${finalBalance.toFixed(2)}, Net Change: ${won ? '+' : '-'}$${Math.abs(finalBalance - oldBalance).toFixed(2)}`);

      // Return result
      if (won) {
        res.json({
          won: true,
          result,
          winAmount: winAmount!.toFixed(8),
          newBalance: finalBalance.toFixed(8)
        });
      } else {
        res.json({
          won: false,
          result,
          newBalance: finalBalance.toFixed(8)
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid coin flip data', errors: error.errors });
      } else {
        console.error('Coin flip error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Get coin flip game history
  app.get('/api/coin-flip/history', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const games = await storage.getCoinFlipGamesByUser(userId, limit);

      res.json(games);
    } catch (error) {
      console.error('Coin flip history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Authentication routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Get user IP, Country, and User Agent
      const ipAddress = getRealIP(req);
      const country = (req.headers['cf-ipcountry'] as string) || (req as any).cloudflare?.country || null;
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Get device fingerprint from request body (if provided)
      const deviceFingerprint = req.body.deviceFingerprint;
      const parsedUA = parseUserAgent(userAgent, deviceFingerprint);

      const user = await storage.createUser(userData, ipAddress, country);
      const { passwordHash, ...safeUser } = user;
      
      // Create session and log login
      (req as any).session.userId = user.id;
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });
      
      // Store device login record if fingerprint is provided
      if (deviceFingerprint) {
        try {
          await storage.createDeviceLogin({
            userId: user.id,
            deviceFingerprint: deviceFingerprint.deviceId || 'unknown',
            deviceModel: parsedUA.deviceModel,
            deviceType: parsedUA.deviceType,
            operatingSystem: parsedUA.operatingSystem,
            browserName: parsedUA.browserName,
            browserVersion: parsedUA.browserVersion,
            screenWidth: deviceFingerprint.screenWidth,
            screenHeight: deviceFingerprint.screenHeight,
            pixelRatio: deviceFingerprint.pixelRatio?.toString() || '1',
            timezone: deviceFingerprint.timezone,
            language: deviceFingerprint.language,
            ipAddress,
            country,
          });
        } catch (err) {
          console.error('Failed to store device login:', err);
        }
      }
      
      // Send welcome email
      try {
        await sendWelcomeEmail(
          user.email,
          user.email.split('@')[0], // Use email username as name
          user.referralCode || '',
          storage
        );
      } catch (emailError) {
        console.error(`Failed to send welcome email to ${user.email}:`, emailError);
      }
      
      // Broadcast admin dashboard update for new user signup
      broadcastAdminDashboardUpdate();
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid signup data', errors: error.errors });
      } else {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.validateUser(credentials);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Prevent admin login from regular user login endpoint
      // Admins should use the /admin page for login
      if (user.role === 'admin') {
        return res.status(403).json({ 
          message: 'Admin accounts cannot login here. Please use the admin portal.' 
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Check if user is banned
      const banStatus = await checkUserBanStatus(user.id);
      if (banStatus.banned) {
        return res.status(403).json({ message: banStatus.message });
      }
      
      // Refresh user object in case ban was auto-removed
      const refreshedUser = await storage.getUser(user.id);
      if (!refreshedUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if 2FA is enabled
      if (refreshedUser.twoFactorEnabled) {
        // Don't create session yet, return that 2FA is required
        return res.json({ 
          requires2FA: true, 
          userId: refreshedUser.id,
          email: refreshedUser.email,
          message: 'Please enter your 2FA code'
        });
      }

      // Get user IP and User Agent for tracking
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const country = (req.headers['cf-ipcountry'] as string) || (req as any).cloudflare?.country || null;
      
      // Get device fingerprint from request body (if provided)
      const deviceFingerprint = req.body.deviceFingerprint;
      const parsedUA = parseUserAgent(userAgent, deviceFingerprint);

      // Update last login IP and device info
      await storage.updateUser(user.id, { 
        lastLoginIp: ipAddress,
        lastLoginDeviceModel: parsedUA.deviceModel,
        lastLoginDeviceType: parsedUA.deviceType,
        lastLoginDeviceOs: parsedUA.operatingSystem,
        lastLoginBrowser: parsedUA.browserName
      });

      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });
      
      // Store device login record if fingerprint is provided
      if (deviceFingerprint) {
        try {
          await storage.createDeviceLogin({
            userId: user.id,
            deviceFingerprint: deviceFingerprint.deviceId || 'unknown',
            deviceModel: parsedUA.deviceModel,
            deviceType: parsedUA.deviceType,
            operatingSystem: parsedUA.operatingSystem,
            browserName: parsedUA.browserName,
            browserVersion: parsedUA.browserVersion,
            screenWidth: deviceFingerprint.screenWidth,
            screenHeight: deviceFingerprint.screenHeight,
            pixelRatio: deviceFingerprint.pixelRatio?.toString() || '1',
            timezone: deviceFingerprint.timezone,
            language: deviceFingerprint.language,
            ipAddress,
            country,
          });
        } catch (err) {
          console.error('Failed to store device login:', err);
        }
      }

      const { passwordHash, ...safeUser } = user;
      
      // Create session
      (req as any).session.userId = user.id;
      
      // No need to check for admin role here since admins are blocked above
      // Admin logins should only happen through /admin page
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // 2FA login verification endpoint
  app.post('/api/auth/login/verify-2fa', async (req, res) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        return res.status(400).json({ message: 'User ID and 2FA token are required' });
      }

      // Get user first (we need email for notification)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin login from regular user login endpoint
      // Admins should use the /admin page for login
      if (user.role === 'admin') {
        return res.status(403).json({ 
          message: 'Admin accounts cannot login here. Please use the admin portal.' 
        });
      }

      // Validate 2FA token
      const isValid = await storage.validate2FAToken(userId, token);
      
      if (!isValid) {
        // Send Telegram notification for invalid 2FA attempt
        const ipAddress = getRealIP(req);
        const timestamp = new Date().toLocaleString('en-US', { 
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        // Send notification asynchronously (don't block response)
        sendInvalid2FANotification(user.email, ipAddress, timestamp).catch(err => {
          console.error('Failed to send invalid 2FA notification:', err);
        });
        
        return res.status(401).json({ message: 'Invalid 2FA code' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Check if user is banned
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
          // Temporary ban has expired, unban the user automatically
          await storage.unbanUser(user.id);
        } else {
          // User is still banned
          const banMessage = user.bannedUntil 
            ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
            : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
          return res.status(403).json({ message: banMessage });
        }
      }

      // Get user IP and User Agent for tracking
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const parsedUA = parseUserAgent(userAgent);

      // Update last login IP
      await storage.updateUser(user.id, { lastLoginIp: ipAddress });

      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });

      const { passwordHash, twoFactorSecret, ...safeUser } = user;
      
      // Create session
      (req as any).session.userId = user.id;
      
      // No need to check for admin role here since admins are blocked above
      // Admin logins should only happen through /admin page
      
      res.json(safeUser);
    } catch (error) {
      console.error('2FA login verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Start passkey login (no authentication required)
  app.post('/api/auth/passkey-login/start', async (req, res) => {
    try {
      console.log('🔐 Passkey login started - Origin:', origin, 'RP ID:', rpID);
      
      // Get all active passkeys from all users
      const allPasskeys = await storage.getAllActivePasskeys();
      
      // Filter passkeys to only those matching the current domain
      const compatiblePasskeys = allPasskeys.filter(pk => pk.rpId === rpID);
      const incompatiblePasskeys = allPasskeys.filter(pk => pk.rpId !== rpID);
      
      if (incompatiblePasskeys.length > 0) {
        console.log(`⚠️  Found ${incompatiblePasskeys.length} passkey(s) registered on different domains:`);
        incompatiblePasskeys.forEach(pk => {
          console.log(`   - Passkey ${pk.id} (${pk.deviceName}): registered on ${pk.rpId}, current domain is ${rpID}`);
        });
      }
      
      if (compatiblePasskeys.length === 0) {
        console.log('❌ No passkeys registered for this domain');
        
        let errorMessage = 'No passkeys registered for this domain';
        let hint = 'Please register a passkey first by logging in with email/password and adding a passkey in Security Settings.';
        
        if (incompatiblePasskeys.length > 0) {
          errorMessage = `Found ${incompatiblePasskeys.length} passkey(s) but they were registered on a different domain`;
          hint = `Your passkeys were registered on a different domain (${incompatiblePasskeys[0].rpId}) and won't work on ${rpID}. Please re-register your passkeys on this domain.`;
        }
        
        return res.status(400).json({ 
          message: errorMessage,
          hint,
          domainMismatch: incompatiblePasskeys.length > 0,
          currentDomain: rpID,
          passkeyDomains: incompatiblePasskeys.map(pk => pk.rpId)
        });
      }

      console.log(`✅ Found ${compatiblePasskeys.length} compatible passkey(s) for domain ${rpID}`);

      const allowCredentials = compatiblePasskeys.map(pk => ({
        id: pk.credentialId,
        transports: ['internal'] as AuthenticatorTransport[]
      }));

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred'
      });

      // Store challenge and current domain info in session
      (req as any).session.passkeyLoginChallenge = options.challenge;
      (req as any).session.passkeyLoginRpId = rpID;

      res.json(options);
    } catch (error) {
      console.error('Start passkey login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Finish passkey login (no authentication required, establishes session)
  app.post('/api/auth/passkey-login/finish', async (req, res) => {
    try {
      const expectedChallenge = (req as any).session.passkeyLoginChallenge;

      if (!expectedChallenge) {
        return res.status(400).json({ message: 'No passkey login in progress' });
      }

      const credentialId = req.body.id;
      
      console.log('🔍 Looking for passkey with credential ID:', credentialId);
      
      // Find which user owns this passkey
      const passkey = await storage.getPasskeyByCredentialId(credentialId);
      
      if (!passkey || !passkey.isActive) {
        console.log('❌ Passkey not found or inactive');
        return res.status(400).json({ message: 'Passkey not found or inactive' });
      }

      console.log('✅ Found passkey for user:', passkey.userId);

      // Allow both origin with and without port (browser may include :5000)
      const expectedOrigins = [origin, `${origin}:5000`];

      const verification = await verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(base64urlToBase64(passkey.publicKey), 'base64')),
          counter: passkey.counter
        }
      });

      if (verification.verified) {
        // Update passkey counter
        await storage.updatePasskeyCounter(passkey.credentialId, verification.authenticationInfo.newCounter);

        // Get the user
        const user = await storage.getUser(passkey.userId);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin login from regular user login endpoint
        // Admins should use the /admin page for login
        if (user.role === 'admin') {
          return res.status(403).json({ 
            message: 'Admin accounts cannot login here. Please use the admin portal.' 
          });
        }

        if (!user.isActive) {
          return res.status(403).json({ message: 'Account is deactivated' });
        }

        // Check if user is banned
        if (user.isBanned) {
          if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
            // Temporary ban has expired, unban the user automatically
            await storage.unbanUser(user.id);
          } else {
            // User is still banned
            const banMessage = user.bannedUntil 
              ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
              : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
            return res.status(403).json({ message: banMessage });
          }
        }

        // Get user IP and User Agent for tracking
        const ipAddress = getRealIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const parsedUA = parseUserAgent(userAgent);

        // Update last login IP
        await storage.updateUser(user.id, { lastLoginIp: ipAddress });

        // Create user session
        await storage.createUserSession({
          userId: user.id,
          ipAddress,
          userAgent,
          browserName: parsedUA.browserName,
          browserVersion: parsedUA.browserVersion,
          deviceType: parsedUA.deviceType,
          deviceModel: parsedUA.deviceModel,
          operatingSystem: parsedUA.operatingSystem,
          isActive: true
        });

        const { passwordHash, twoFactorSecret, ...safeUser } = user;
        
        // Create session
        (req as any).session.userId = user.id;

        // Clear the temporary challenge
        delete (req as any).session.passkeyLoginChallenge;

        // No need to check for admin role here since admins are blocked above
        // Admin logins should only happen through /admin page
        
        res.json(safeUser);
      } else {
        res.status(400).json({ message: 'Passkey authentication failed' });
      }
    } catch (error) {
      console.error('Finish passkey login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Telegram Login Authentication
  app.post('/api/auth/telegram-login', async (req, res) => {
    try {
      const telegramData = telegramAuthSchema.parse(req.body);
      
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!BOT_TOKEN) {
        return res.status(500).json({ message: 'Telegram authentication not configured' });
      }
      
      // Verify Telegram authentication data
      const { hash, ...dataToCheck } = telegramData;
      
      // Create data-check-string (alphabetically sorted)
      const dataCheckString = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${(dataToCheck as any)[key]}`)
        .join('\n');
      
      // Generate secret key from bot token
      const crypto = require('crypto');
      const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
      
      // Calculate expected hash
      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      
      // Verify hash
      if (expectedHash !== hash) {
        return res.status(401).json({ message: 'Invalid Telegram authentication data' });
      }
      
      // Check if auth_date is not too old (24 hours)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - telegramData.auth_date > 86400) {
        return res.status(401).json({ message: 'Telegram authentication expired. Please try again.' });
      }
      
      console.log('✅ Telegram authentication verified for user:', telegramData.id);
      
      // Find or create user based on Telegram ID
      const telegramId = telegramData.id.toString();
      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        // Create new user with Telegram data
        const username = telegramData.username || `telegram_${telegramId}`;
        const email = `${username}@telegram.user`;
        
        // Generate a random password for Telegram users
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        
        user = await storage.createUser({
          email,
          password: randomPassword,
          confirmPassword: randomPassword,
          withdrawalPassword: randomPassword.substring(0, 6),
          acceptedTerms: true,
          telegramId
        });
        
        console.log('✅ New user created via Telegram:', user.id);
      }

      // Prevent admin login from regular user login endpoint
      // Admins should use the /admin page for login
      if (user.role === 'admin') {
        return res.status(403).json({ 
          message: 'Admin accounts cannot login here. Please use the admin portal.' 
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      // Check if user is banned
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
          await storage.unbanUser(user.id);
        } else {
          const banMessage = user.bannedUntil 
            ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
            : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
          return res.status(403).json({ message: banMessage });
        }
      }
      
      // Get user IP and User Agent
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const parsedUA = parseUserAgent(userAgent);
      
      // Update last login IP
      await storage.updateUser(user.id, { lastLoginIp: ipAddress });
      
      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });
      
      const { passwordHash, twoFactorSecret, ...safeUser } = user;
      
      // Create session
      (req as any).session.userId = user.id;
      
      res.json(safeUser);
    } catch (error) {
      console.error('Telegram login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid Telegram data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ==============================================================================
  // ADMIN-ONLY LOGIN ENDPOINTS
  // These endpoints are exclusively for admin portal login (/admin page)
  // ==============================================================================

  // Admin login endpoint - Only accessible from /admin page
  app.post('/api/admin/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.validateUser(credentials);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // ONLY allow admin role - regular users/agents cannot login here
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. This portal is for administrators only.' 
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Check if user is banned
      const banStatus = await checkUserBanStatus(user.id);
      if (banStatus.banned) {
        return res.status(403).json({ message: banStatus.message });
      }
      
      // Refresh user object in case ban was auto-removed
      const refreshedUser = await storage.getUser(user.id);
      if (!refreshedUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if 2FA is enabled
      if (refreshedUser.twoFactorEnabled) {
        // Don't create session yet, return that 2FA is required
        return res.json({ 
          requires2FA: true, 
          userId: refreshedUser.id,
          email: refreshedUser.email,
          message: 'Please enter your 2FA code'
        });
      }

      // Get user IP and User Agent for tracking
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const country = (req.headers['cf-ipcountry'] as string) || (req as any).cloudflare?.country || null;
      
      const parsedUA = parseUserAgent(userAgent);

      // Update last login IP
      await storage.updateUser(user.id, { 
        lastLoginIp: ipAddress,
        lastLoginDeviceModel: parsedUA.deviceModel,
        lastLoginDeviceType: parsedUA.deviceType,
        lastLoginDeviceOs: parsedUA.operatingSystem,
        lastLoginBrowser: parsedUA.browserName
      });

      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });

      const { passwordHash, ...safeUser } = user;
      
      // Create session
      (req as any).session.userId = user.id;
      
      // Send Telegram notification for admin login
      const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      sendAdminLoginNotification(user.email, ipAddress, timestamp).catch(err => {
        console.error('Failed to send admin login notification:', err);
      });
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      } else {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Admin 2FA verification endpoint
  app.post('/api/admin/login/verify-2fa', async (req, res) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        return res.status(400).json({ message: 'User ID and 2FA token are required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // ONLY allow admin role
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. This portal is for administrators only.' 
        });
      }

      // Validate 2FA token
      const isValid = await storage.validate2FAToken(userId, token);
      
      if (!isValid) {
        const ipAddress = getRealIP(req);
        const timestamp = new Date().toLocaleString('en-US', { 
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        sendInvalid2FANotification(user.email, ipAddress, timestamp).catch(err => {
          console.error('Failed to send invalid 2FA notification:', err);
        });
        
        return res.status(401).json({ message: 'Invalid 2FA code' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Check if user is banned
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
          await storage.unbanUser(user.id);
        } else {
          const banMessage = user.bannedUntil 
            ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
            : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
          return res.status(403).json({ message: banMessage });
        }
      }

      // Get user IP and User Agent for tracking
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const parsedUA = parseUserAgent(userAgent);

      // Update last login IP
      await storage.updateUser(user.id, { lastLoginIp: ipAddress });

      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });

      const { passwordHash, twoFactorSecret, ...safeUser } = user;
      
      // Create session
      (req as any).session.userId = user.id;
      
      // Send Telegram notification for admin login
      const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      sendAdminLoginNotification(user.email, ipAddress, timestamp).catch(err => {
        console.error('Failed to send admin login notification:', err);
      });
      
      res.json(safeUser);
    } catch (error) {
      console.error('Admin 2FA login verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ==============================================================================

  // Generate Telegram Login Link (public - no auth required)
  app.post('/api/auth/telegram-login-link', async (req, res) => {
    try {
      // Try database settings first, then fallback to environment variable
      const usernameSetting = await storage.getSystemSetting('telegram_bot_username');
      const BOT_USERNAME = usernameSetting?.value || process.env.TELEGRAM_BOT_USERNAME;
      
      if (!BOT_USERNAME) {
        return res.status(500).json({ message: 'Telegram bot not configured' });
      }
      
      // Get configurable session timeout (default 10 minutes for better UX)
      const timeoutSetting = await storage.getSystemSetting('telegram_login_timeout_minutes');
      const timeoutMinutes = timeoutSetting?.value ? parseInt(timeoutSetting.value) : 10;
      
      // Generate a unique token for this login attempt (no userId needed)
      // We'll create a temporary token that the bot can use to identify this login session
      const token = `login_${crypto.randomBytes(16).toString('hex')}`;
      
      // Store the token with configurable expiry time (persisted in database)
      await storage.createTelegramLoginSession(token, timeoutMinutes);
      
      // Create the deep link
      const deepLink = `https://t.me/${BOT_USERNAME}?start=${token}`;
      
      res.json({ 
        deepLink, 
        token,
        botUsername: BOT_USERNAME
      });
    } catch (error) {
      console.error('Telegram login link generation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Poll for Telegram login status (public - no auth required)
  app.get('/api/auth/telegram-login-status/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const session = await storage.getTelegramLoginSession(token);
      
      if (!session) {
        return res.status(404).json({ 
          message: 'Login session expired or not found',
          status: 'expired'
        });
      }
      
      if (session.userId) {
        // Login completed - get user data and create session
        const user = await storage.getUser(session.userId);
        
        if (!user) {
          await storage.deleteTelegramLoginSession(token);
          return res.status(404).json({ 
            message: 'User not found',
            status: 'error'
          });
        }
        
        // Create session for the user
        (req as any).session.userId = user.id;
        
        // Save the session to ensure cookie is set
        await new Promise<void>((resolve, reject) => {
          (req as any).session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Clean up the login session
        await storage.deleteTelegramLoginSession(token);
        
        // Return user data
        const { passwordHash, twoFactorSecret, ...safeUser } = user;
        return res.json({ 
          status: 'completed',
          user: safeUser
        });
      }
      
      // Still waiting for user to click the link
      return res.json({ 
        status: 'pending',
        expiresAt: session.expiresAt
      });
    } catch (error) {
      console.error('Telegram login status check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Generate Telegram Deep Link for account connection
  app.post('/api/auth/telegram-link', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      // Try database settings first, then fallback to environment variable
      const usernameSetting = await storage.getSystemSetting('telegram_bot_username');
      const BOT_USERNAME = usernameSetting?.value || process.env.TELEGRAM_BOT_USERNAME;
      
      if (!BOT_USERNAME) {
        return res.status(500).json({ message: 'Telegram bot not configured' });
      }
      
      // Generate a unique token for this user
      const { token, expiresAt } = await storage.createTelegramLinkToken(userId, 5);
      
      // Create the deep link
      const deepLink = `https://t.me/${BOT_USERNAME}?start=${token}`;
      
      res.json({ 
        deepLink, 
        token,
        expiresAt,
        botUsername: BOT_USERNAME
      });
    } catch (error) {
      console.error('Telegram link generation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Connect Telegram to existing account
  app.post('/api/auth/telegram-connect', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const telegramData = telegramAuthSchema.parse(req.body);
      
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!BOT_TOKEN) {
        return res.status(500).json({ message: 'Telegram authentication not configured' });
      }
      
      // Verify Telegram authentication data
      const { hash, ...dataToCheck } = telegramData;
      
      const dataCheckString = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${(dataToCheck as any)[key]}`)
        .join('\n');
      
      const crypto = require('crypto');
      const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      
      if (expectedHash !== hash) {
        return res.status(401).json({ message: 'Invalid Telegram authentication data' });
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - telegramData.auth_date > 86400) {
        return res.status(401).json({ message: 'Telegram authentication expired. Please try again.' });
      }
      
      const telegramId = telegramData.id.toString();
      
      // Check if Telegram ID is already connected to another account
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'This Telegram account is already connected to another user' });
      }
      
      // Update user with Telegram ID
      await storage.updateUser(userId, { telegramId });
      
      const user = await storage.getUser(userId);
      const { passwordHash, twoFactorSecret, ...safeUser } = user!;
      
      res.json({ message: 'Telegram account connected successfully', user: safeUser });
    } catch (error) {
      console.error('Telegram connect error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid Telegram data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Disconnect Telegram from account
  app.post('/api/auth/telegram-disconnect', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      // Remove Telegram ID from user
      await storage.updateUser(userId, { telegramId: null });
      
      const user = await storage.getUser(userId);
      const { passwordHash, twoFactorSecret, ...safeUser } = user!;
      
      res.json({ message: 'Telegram account disconnected successfully', user: safeUser });
    } catch (error) {
      console.error('Telegram disconnect error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get betting requirement status for current user
  app.get('/api/auth/betting-requirement', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get betting requirement percentage from system settings (default 60%)
      const betRequirementSetting = await storage.getSystemSetting('betting_requirement_percentage');
      const betRequirementPercentage = betRequirementSetting ? parseFloat(betRequirementSetting.value) : 60;
      
      // Get daily notification interval from system settings (default 24 hours)
      const notificationIntervalSetting = await storage.getSystemSetting('betting_requirement_notification_interval');
      const notificationIntervalHours = notificationIntervalSetting ? parseFloat(notificationIntervalSetting.value) : 24;
      
      const totalDeposits = parseFloat(user.totalDeposits) || 0;
      const totalBetsAmount = parseFloat(user.totalBetsAmount) || 0;
      const totalCommission = parseFloat(user.totalCommission) || 0;
      
      const requiredBetAmount = totalDeposits > 0 ? totalDeposits * (betRequirementPercentage / 100) : 0;
      const remainingBetAmount = Math.max(0, requiredBetAmount - totalBetsAmount);
      const betPercentage = totalDeposits > 0 ? ((totalBetsAmount / totalDeposits) * 100) : 0;
      
      // Use same epsilon tolerance as withdrawal endpoint to handle floating-point precision
      const EPSILON = 0.01; // Allow 0.01 USD tolerance (1 cent)
      // Ensure epsilon doesn't make requirement negative for very small deposits
      const adjustedRequirement = Math.max(0, requiredBetAmount - EPSILON);
      const canWithdraw = totalDeposits === 0 || totalBetsAmount >= adjustedRequirement;
      
      // Check time since last notification was shown (using lastWagerResetDate as notification timestamp)
      const now = new Date();
      const lastNotificationDate = user.lastWagerResetDate ? new Date(user.lastWagerResetDate) : new Date(0);
      const hoursSinceLastNotification = (now.getTime() - lastNotificationDate.getTime()) / (1000 * 60 * 60);
      
      // Only show notification if betting requirement is not met AND enough time has passed
      const shouldShowNotification = !canWithdraw && hoursSinceLastNotification >= notificationIntervalHours;
      
      res.json({
        totalDeposits: totalDeposits.toFixed(2),
        totalBetsAmount: totalBetsAmount.toFixed(2),
        requiredBetAmount: requiredBetAmount.toFixed(2),
        remainingBetAmount: remainingBetAmount.toFixed(2),
        betPercentage: betPercentage.toFixed(2),
        requiredPercentage: betRequirementPercentage,
        canWithdraw,
        withdrawableCommission: totalCommission.toFixed(2),
        notificationIntervalHours,
        hoursSinceLastNotification: hoursSinceLastNotification.toFixed(1),
        shouldShowNotification
      });
    } catch (error) {
      console.error('Betting requirement status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Acknowledge/dismiss betting requirement notification
  app.post('/api/auth/dismiss-betting-notification', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      // Update lastWagerResetDate to record that notification was shown/dismissed
      const now = new Date();
      await storage.updateUser(userId, {
        lastWagerResetDate: now
      });
      
      console.log(`✅ Betting requirement notification dismissed for user ${userId}`);
      res.json({ message: 'Notification dismissed', timestamp: now });
    } catch (error) {
      console.error('Dismiss notification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Password reset routes
  app.post('/api/auth/request-reset', async (req, res) => {
    try {
      const { email } = resetPasswordSchema.parse(req.body);
      
      // Check if user with this email exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
      }

      // Create reset token
      const token = await storage.createPasswordResetToken(email);
      
      // Send reset email
      const emailSent = await sendPasswordResetEmail(email, token, storage);
      
      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
        return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
      }

      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid email format', errors: error.errors });
      } else {
        console.error('Password reset request error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/auth/confirm-reset', async (req, res) => {
    try {
      const { token, newPassword } = resetPasswordConfirmSchema.parse(req.body);
      
      // Validate reset token
      const email = await storage.validatePasswordResetToken(token);
      if (!email) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password
      const passwordUpdated = await storage.updatePassword(email, newPassword);
      if (!passwordUpdated) {
        return res.status(500).json({ message: 'Failed to update password' });
      }

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid reset data', errors: error.errors });
      } else {
        console.error('Password reset confirm error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Change password for authenticated user
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = (req as any).session.userId;
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      const passwordUpdated = await storage.updatePassword(user.email, newPassword);
      if (!passwordUpdated) {
        return res.status(500).json({ message: 'Failed to update password' });
      }

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid password data', errors: error.errors });
      } else {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Change withdrawal password for authenticated user
  app.post('/api/auth/change-withdrawal-password', requireAuth, async (req, res) => {
    try {
      const { currentWithdrawalPassword, newWithdrawalPassword } = changeWithdrawalPasswordSchema.parse(req.body);
      const userId = (req as any).session.userId;
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current withdrawal password
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(currentWithdrawalPassword, user.withdrawalPasswordHash || '');
      if (!isValid) {
        return res.status(400).json({ message: 'Current withdrawal password is incorrect' });
      }

      // Hash new withdrawal password
      const saltRounds = 10;
      const newHash = await bcrypt.hash(newWithdrawalPassword, saltRounds);

      // Update withdrawal password
      const updated = await storage.updateUser(user.id, { withdrawalPasswordHash: newHash });
      if (!updated) {
        return res.status(500).json({ message: 'Failed to update withdrawal password' });
      }

      res.json({ message: 'Withdrawal password changed successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid password data', errors: error.errors });
      } else {
        console.error('Withdrawal password change error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Mock user endpoint for demo (for backward compatibility)
  app.get('/api/user/demo', async (req, res) => {
    try {
      // Create or get demo user
      let user = await storage.getUserByEmail('demo@example.com');
      if (!user) {
        user = await storage.createUser({ 
          password: 'demo', 
          confirmPassword: 'demo',
          withdrawalPassword: 'demo123',
          acceptedTerms: true,
          email: 'demo@example.com'
        });
      } else {
        // Update existing demo user balance to 9 coins (0.09 USD)
        user = await storage.updateUserBalance(user.id, "0.09000000");
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create session for demo user so they can place bets
      (req as any).session.userId = user.id;
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Current authenticated user endpoint
  app.get('/api/user/current', requireAuth, async (req, res) => {
    try {
      // Prevent browser caching of user data to ensure balance updates are always fresh
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      const userId = (req as any).session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { passwordHash, withdrawalPasswordHash, twoFactorSecret, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Profile photo upload endpoint
  app.post('/api/user/profile-photo', requireAuth, async (req, res) => {
    try {
      const { profilePhoto } = req.body;
      
      if (!validatePhoto(profilePhoto)) {
        return res.status(400).json({ 
          message: 'Invalid photo format or size. Please use PNG, JPEG, or WebP under 5MB.' 
        });
      }
      
      const userId = (req as any).session.userId;
      const updatedUser = await storage.updateUser(userId, { profilePhoto });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { passwordHash, ...safeUser } = updatedUser;
      res.json({ message: 'Profile photo updated successfully', user: safeUser });
    } catch (error) {
      console.error('Profile photo upload error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update animation preferences endpoint
  app.post('/api/user/animation-preferences', requireAuth, async (req, res) => {
    try {
      const { enableAnimations } = req.body;
      
      if (typeof enableAnimations !== 'boolean') {
        return res.status(400).json({ 
          message: 'Invalid animation preference value' 
        });
      }
      
      const userId = (req as any).session.userId;
      const updatedUser = await storage.updateUser(userId, { enableAnimations });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { passwordHash, withdrawalPasswordHash, twoFactorSecret, ...safeUser } = updatedUser;
      res.json({ message: 'Animation preferences updated successfully', user: safeUser });
    } catch (error) {
      console.error('Animation preferences update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update Wingo Mode preference endpoint
  app.post('/api/user/wingo-mode', requireAuth, async (req, res) => {
    try {
      const { wingoMode } = req.body;
      
      if (typeof wingoMode !== 'boolean') {
        return res.status(400).json({ 
          message: 'Invalid Wingo Mode preference value' 
        });
      }
      
      const userId = (req as any).session.userId;
      const updatedUser = await storage.updateUser(userId, { wingoMode });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { passwordHash, withdrawalPasswordHash, twoFactorSecret, ...safeUser } = updatedUser;
      res.json({ message: 'Wingo Mode preference updated successfully', user: safeUser });
    } catch (error) {
      console.error('Wingo Mode preference update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Withdraw commission to wallet endpoint
  app.post('/api/user/withdraw-commission', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      console.log(`💰 Commission withdrawal request from user: ${userId}`);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check commission balance from user record
      let commissionBalance = parseFloat(user.totalCommission || "0");
      console.log(`💵 User record commission balance: $${commissionBalance}`);
      
      // If user.totalCommission is 0 or very small, verify against referrals table
      // This handles cases where the two sources might be out of sync
      if (commissionBalance < 0.00000001) {
        console.log(`🔍 Checking referrals table for commission...`);
        const stats = await storage.getReferralStats(userId);
        const referralCommission = parseFloat(stats.totalCommission || "0");
        console.log(`💵 Referrals table commission: $${referralCommission}`);
        
        if (referralCommission > 0) {
          // Sync the values - use referrals table as source of truth
          commissionBalance = referralCommission;
          await storage.updateUser(userId, { 
            totalCommission: referralCommission.toFixed(8)
          });
          console.log(`✅ Synced commission from referrals table: $${referralCommission}`);
        }
      }
      
      if (commissionBalance <= 0) {
        console.log(`⚠️ No commission available for user ${userId}`);
        return res.status(400).json({ message: 'No commission available to withdraw' });
      }
      
      // Calculate new balances
      const currentBalance = parseFloat(user.balance);
      const newBalance = (currentBalance + commissionBalance).toFixed(8);
      console.log(`📊 Balance update: $${currentBalance} → $${newBalance} (added $${commissionBalance})`);
      
      // Update user balance and reset available commission (but keep lifetime earnings)
      await storage.updateUser(userId, { 
        balance: newBalance,
        totalCommission: "0.00000000"
        // NOTE: lifetimeCommissionEarned is NOT reset - it tracks all-time earnings
      });
      console.log(`✅ User balance updated, available commission reset to 0`);
      
      // NOTE: We do NOT reset individual referral.totalCommission values
      // Those values represent the lifetime commission earned from each referral
      // and should be displayed in the Referral Program "Total Earned" section
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: "commission_withdrawal",
        fiatAmount: commissionBalance.toFixed(8),
        fiatCurrency: "USD",
        status: "completed",
        paymentMethod: "internal",
        fee: "0.00000000"
      });
      console.log(`✅ Transaction record created`);
      
      res.json({ 
        message: 'Commission transferred to wallet successfully',
        amount: commissionBalance.toFixed(8),
        newBalance 
      });
      console.log(`✅ Commission withdrawal completed for user ${userId}`);
    } catch (error) {
      console.error('❌ Commission withdrawal error:', error);
      res.status(500).json({ message: 'Failed to withdraw commission. Please try again later.' });
    }
  });

  // Image border removal endpoint
  app.post('/api/image/remove-border', async (req, res) => {
    try {
      const { imageData, borderSize = 10 } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: 'Image data is required' });
      }
      
      // Validate image format (base64 data URL)
      const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
      if (!dataUrlRegex.test(imageData)) {
        return res.status(400).json({ message: 'Invalid image format' });
      }
      
      // Extract base64 data
      const base64Data = imageData.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Get image metadata to determine crop dimensions
      const { width, height } = await sharp(imageBuffer).metadata();
      
      if (!width || !height) {
        return res.status(400).json({ message: 'Could not process image' });
      }
      
      // Calculate crop dimensions (remove border from all sides)
      const cropWidth = Math.max(1, width - (borderSize * 2));
      const cropHeight = Math.max(1, height - (borderSize * 2));
      
      // Process image to remove border
      const processedImageBuffer = await sharp(imageBuffer)
        .extract({
          left: borderSize,
          top: borderSize,
          width: cropWidth,
          height: cropHeight
        })
        .png() // Convert to PNG for consistent output
        .toBuffer();
      
      // Convert back to base64 data URL
      const processedBase64 = `data:image/png;base64,${processedImageBuffer.toString('base64')}`;
      
      res.json({ 
        processedImage: processedBase64,
        originalSize: { width, height },
        processedSize: { width: cropWidth, height: cropHeight }
      });
    } catch (error) {
      console.error('Image processing error:', error);
      res.status(500).json({ message: 'Failed to process image' });
    }
  });

  // DEVELOPMENT ONLY: Create admin user endpoint (remove in production)
  app.post('/api/dev/create-admin', async (req, res) => {
    try {
      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail('pursuer.ail-4d@icloud.com');
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin user already exists' });
      }
      
      const adminUser = await storage.createUser({
        password: 'admin123',
        confirmPassword: 'admin123',
        withdrawalPassword: 'admin456',
        acceptedTerms: true,
        email: 'pursuer.ail-4d@icloud.com'
      });
      
      // Update role to admin
      const updatedAdmin = await storage.updateUser(adminUser.id, { 
        role: "admin",
        balance: "10000.00000000"
      });
      
      if (updatedAdmin) {
        const { passwordHash, ...safeUser } = updatedAdmin;
        res.json({ message: 'Admin user created', user: safeUser });
      } else {
        res.status(500).json({ message: 'Failed to update admin user' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await storage.getAllUsers(page, limit);
      const safeUsers = result.users.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({ users: safeUsers, total: result.total });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/users/:userId/sessions', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/users/country-stats', requireAdmin, async (req, res) => {
    try {
      const countryCounts = await storage.getUserCountsByCountry();
      res.json(countryCounts);
    } catch (error) {
      console.error('Error fetching user country statistics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // IP Whitelist Management Routes
  app.get('/api/admin/whitelisted-ips', requireAdmin, async (req, res) => {
    try {
      const whitelistedIps = await storage.getAllWhitelistedIps();
      res.json(whitelistedIps);
    } catch (error) {
      console.error('Error fetching whitelisted IPs:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/whitelisted-ips', requireAdmin, async (req, res) => {
    try {
      const { ipAddress, whitelistedReason } = req.body;
      
      if (!ipAddress || typeof ipAddress !== 'string') {
        return res.status(400).json({ message: 'IP address is required' });
      }

      // Count how many accounts currently use this IP
      const allUsers = await storage.getAllUsers(1, 10000);
      const accountCount = allUsers.users.filter(user => 
        user.registrationIp === ipAddress || user.lastLoginIp === ipAddress
      ).length;

      const adminId = (req as any).session.userId;
      const whitelistedIp = await storage.addWhitelistedIp({
        ipAddress,
        accountCountAtWhitelist: accountCount,
        whitelistedBy: adminId,
        whitelistedReason: whitelistedReason || null,
      });

      res.json(whitelistedIp);
    } catch (error: any) {
      console.error('Error adding whitelisted IP:', error);
      if (error.message?.includes('unique')) {
        return res.status(400).json({ message: 'IP address is already whitelisted' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/admin/whitelisted-ips/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, whitelistedReason, currentAccountCount } = req.body;
      
      const updates: any = {};
      if (isActive !== undefined) updates.isActive = isActive;
      if (whitelistedReason !== undefined) updates.whitelistedReason = whitelistedReason;
      if (currentAccountCount !== undefined) {
        updates.currentAccountCount = currentAccountCount;
      }
      
      const whitelistedIp = await storage.updateWhitelistedIp(id, updates);

      if (!whitelistedIp) {
        return res.status(404).json({ message: 'Whitelisted IP not found' });
      }

      res.json(whitelistedIp);
    } catch (error) {
      console.error('Error updating whitelisted IP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/whitelisted-ips/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWhitelistedIp(id);

      if (!success) {
        return res.status(404).json({ message: 'Whitelisted IP not found' });
      }

      res.json({ message: 'Whitelisted IP removed successfully' });
    } catch (error) {
      console.error('Error deleting whitelisted IP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/toggle', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.toggleUserStatus(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Broadcast admin dashboard update for user status toggle
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/adjust-balance', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adjustBalanceSchema = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && isFinite(num) && Math.abs(num) <= 1000000;
        }, {
          message: "Amount must be a valid number within reasonable limits"
        })
      });
      
      const { amount } = adjustBalanceSchema.parse(req.body);
      
      const adminId = (req as any).session.userId;
      const user = await storage.adjustUserBalance(userId, amount, adminId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Send deposit confirmation email if amount is positive (deposit)
      const amountNum = parseFloat(amount);
      if (amountNum > 0) {
        try {
          // Create a transaction record for the email
          const transaction = await storage.createTransaction({
            userId: user.id,
            type: 'deposit',
            fiatAmount: amount,
            paymentMethod: 'agent',
            status: 'completed',
            externalId: `admin-deposit-${Date.now()}`
          });
          
          await sendDepositConfirmationEmail(
            user.email,
            amountNum.toFixed(2),
            'USD',
            transaction.id,
            user.balance,
            storage
          );
        } catch (emailError) {
          console.error(`Failed to send admin deposit email to ${user.email}:`, emailError);
          // Don't fail the request if email fails
        }
        
        // Send deposit push notification
        try {
          await sendTransactionPushNotification(
            user.id,
            'deposit',
            amountNum.toFixed(2),
            'USD'
          );
        } catch (pushError) {
          console.error(`Failed to send admin deposit push notification to ${user.email}:`, pushError);
        }
      }
      
      // Broadcast admin dashboard update for balance adjustment
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid balance adjustment data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/users/:userId/unfreeze-balance', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const unfreezeBalanceSchema = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1000000;
        }, {
          message: "Amount must be a valid non-negative number within reasonable limits"
        })
      });
      
      const { amount } = unfreezeBalanceSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const unfreezeAmount = parseFloat(amount);
      const currentFrozenBalance = parseFloat(user.frozenBalance || '0');
      
      // Calculate new frozen balance (cannot go below 0)
      const newFrozenBalance = Math.max(0, currentFrozenBalance - unfreezeAmount).toFixed(8);
      
      const updatedUser = await storage.updateUser(userId, {
        frozenBalance: newFrozenBalance
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'Failed to update user' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'unfreeze_user_balance',
        targetId: userId,
        details: JSON.stringify({
          unfreezeAmount: unfreezeAmount.toFixed(8),
          previousFrozenBalance: currentFrozenBalance.toFixed(8),
          newFrozenBalance
        })
      });
      
      // Broadcast admin dashboard update for balance unfreeze
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid unfreeze data', errors: error.errors });
      } else {
        console.error('Error unfreezing balance:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/users/:userId/award-commission', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const awardCommissionSchema = z.object({
        coins: z.number().int().positive().max(1000000),
      });
      
      const { coins } = awardCommissionSchema.parse(req.body);
      
      const usdAmount = (coins / 100).toFixed(8);
      
      const adminId = (req as any).session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const newTotalCommission = (parseFloat(user.totalCommission) + parseFloat(usdAmount)).toFixed(8);
      const newLifetimeCommission = (parseFloat(user.lifetimeCommissionEarned || "0") + parseFloat(usdAmount)).toFixed(8);
      
      const updatedUser = await storage.updateUser(userId, {
        totalCommission: newTotalCommission,
        lifetimeCommissionEarned: newLifetimeCommission
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'Failed to update user' });
      }
      
      await storage.createTransaction({
        userId,
        type: 'referral_bonus',
        fiatAmount: usdAmount,
        paymentMethod: 'internal',
        status: 'completed',
        externalId: `admin-commission-${Date.now()}`
      });
      
      await storage.logAdminAction({
        adminId,
        action: 'award_commission',
        targetId: userId,
        details: { 
          coins, 
          usdAmount,
          previousCommission: user.totalCommission,
          newCommission: newTotalCommission
        }
      });
      
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid commission data', errors: error.errors });
      } else {
        console.error('Award commission error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/users/:userId/ban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user is admin before banning
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (targetUser.role === 'admin') {
        return res.status(403).json({ message: 'Admin users cannot be banned' });
      }
      
      const banSchema = z.object({
        reason: z.string().min(1, 'Ban reason is required'),
        bannedUntil: z.string().optional()
      });
      
      const { reason, bannedUntil } = banSchema.parse(req.body);
      
      const bannedUntilDate = bannedUntil ? new Date(bannedUntil) : undefined;
      const user = await storage.banUser(userId, reason, bannedUntilDate);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Broadcast admin dashboard update for user ban
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid ban data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/users/:userId/unban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.unbanUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Broadcast admin dashboard update for user unban
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/clear-ip-history', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Clear all sessions and device logins for this user
      const sessionsCleared = await storage.clearUserSessions(userId);
      const deviceLoginsCleared = await storage.clearDeviceLogins(userId);
      
      // Clear the last login IP and related fields from the user record
      const updatedUser = await storage.updateUser(userId, {
        lastLoginIp: null,
        lastLoginDeviceModel: null,
        lastLoginDeviceType: null,
        lastLoginDeviceOs: null,
        lastLoginBrowser: null
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Log the admin action
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'clear_ip_history',
        targetId: userId,
        details: {
          sessionsCleared,
          deviceLoginsCleared,
          userEmail: user.email
        }
      });
      
      res.json({ 
        message: 'Login IP history cleared successfully',
        sessionsCleared,
        deviceLoginsCleared
      });
    } catch (error) {
      console.error('Clear IP history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/toggle-wingo-mode', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Toggle wingo mode
      const updatedUser = await storage.updateUser(userId, { 
        wingoMode: !currentUser.wingoMode 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Broadcast admin dashboard update
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error('Toggle wingo mode error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user exists and is not admin
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (targetUser.role === 'admin') {
        return res.status(403).json({ message: 'Admin users cannot be deleted' });
      }
      
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete user' });
      }
      
      // Broadcast admin dashboard update for user deletion
      broadcastAdminDashboardUpdate();
      
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user bet limit endpoint
  app.post('/api/admin/users/:userId/bet-limit', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const betLimitSchema = z.object({
        maxBetLimit: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1000000;
        }, {
          message: "Bet limit must be a valid positive number within reasonable limits"
        })
      });
      
      const { maxBetLimit } = betLimitSchema.parse(req.body);
      
      const adminId = (req as any).session.userId;
      const user = await storage.updateUser(userId, { maxBetLimit });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'bet_limit_update',
        targetId: userId,
        details: { newBetLimit: maxBetLimit }
      });
      
      // Broadcast admin dashboard update for bet limit change
      broadcastAdminDashboardUpdate();
      
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid bet limit data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Algorithm Statistics - Real-time House Profit Display
  app.get('/api/admin/algorithm-stats', requireAdmin, async (req, res) => {
    try {
      await profitTracker.updateTargetProfit();
      const stats = profitTracker.getStats();
      
      res.json({
        currentProfitPercentage: stats.currentProfitPercentage.toFixed(2),
        targetProfitPercentage: stats.targetProfitPercentage.toFixed(2),
        adjustment: stats.adjustment.toFixed(2),
        biasStrength: (stats.biasStrength * 100).toFixed(1),
        shouldBiasHouse: stats.shouldBiasHouse,
        shouldBiasPlayers: stats.shouldBiasPlayers,
        currentHouseProfit: stats.currentHouseProfit.toFixed(2),
        totalBets: stats.totalBetsFromDB.toFixed(2)
      });
    } catch (error) {
      console.error('Error getting algorithm stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Live Algorithm Monitor - Advanced real-time monitoring
  app.get('/api/admin/algorithm-monitor', requireAdmin, async (req, res) => {
    try {
      await profitTracker.updateTargetProfit();
      const stats = profitTracker.getStats();
      
      // Get all active periods with their bets and analysis
      const activePeriods: any[] = [];
      
      for (const [duration, { game }] of Array.from(activeGames.entries())) {
        const bets = await storage.getBetsByGame(game.gameId);
        const timeRemaining = Math.max(0, Math.floor((new Date(game.endTime).getTime() - Date.now()) / 1000));
        
        // Calculate profit analysis for each possible result
        const profitAnalysis: any[] = [];
        let totalBetsAmount = 0;
        
        for (const bet of bets) {
          totalBetsAmount += parseFloat(bet.amount);
        }
        
        for (let testResult = 0; testResult <= 9; testResult++) {
          const testColor = getNumberColor(testResult);
          const testSize = getNumberSize(testResult);
          let totalPayout = 0;
          
          for (const bet of bets) {
            let won = false;
            
            switch (bet.betType) {
              case "color":
                won = bet.betValue === testColor;
                break;
              case "number":
                won = parseInt(bet.betValue) === testResult;
                break;
              case "size":
                won = bet.betValue === testSize;
                break;
            }
            
            if (won && bet.potential) {
              totalPayout += parseFloat(bet.potential);
            }
          }
          
          const houseProfit = totalBetsAmount - totalPayout;
          const houseProfitPercentage = totalBetsAmount > 0 ? (houseProfit / totalBetsAmount) * 100 : 0;
          const distanceFromTarget = Math.abs(houseProfitPercentage - stats.targetProfitPercentage);
          
          profitAnalysis.push({
            result: testResult,
            color: testColor,
            size: testSize,
            totalPayout: totalPayout.toFixed(2),
            houseProfit: houseProfit.toFixed(2),
            houseProfitPercentage: houseProfitPercentage.toFixed(2),
            distanceFromTarget: distanceFromTarget.toFixed(2),
            isOptimal: distanceFromTarget < 5
          });
        }
        
        // Sort by distance from target
        profitAnalysis.sort((a, b) => parseFloat(a.distanceFromTarget) - parseFloat(b.distanceFromTarget));
        
        // Group bets by type
        const betsByType = {
          red: { count: 0, amount: 0 },
          green: { count: 0, amount: 0 },
          violet: { count: 0, amount: 0 },
          big: { count: 0, amount: 0 },
          small: { count: 0, amount: 0 },
          numbers: {} as Record<string, { count: number; amount: number }>
        };
        
        for (const bet of bets) {
          const amount = parseFloat(bet.amount);
          if (bet.betType === 'color') {
            if (bet.betValue === 'red') { betsByType.red.count++; betsByType.red.amount += amount; }
            else if (bet.betValue === 'green') { betsByType.green.count++; betsByType.green.amount += amount; }
            else if (bet.betValue === 'violet') { betsByType.violet.count++; betsByType.violet.amount += amount; }
          } else if (bet.betType === 'size') {
            if (bet.betValue === 'big') { betsByType.big.count++; betsByType.big.amount += amount; }
            else if (bet.betValue === 'small') { betsByType.small.count++; betsByType.small.amount += amount; }
          } else if (bet.betType === 'number') {
            if (!betsByType.numbers[bet.betValue]) {
              betsByType.numbers[bet.betValue] = { count: 0, amount: 0 };
            }
            betsByType.numbers[bet.betValue].count++;
            betsByType.numbers[bet.betValue].amount += amount;
          }
        }
        
        // Get unique users
        const uniqueUsers = new Set(bets.map(b => b.userId)).size;
        
        activePeriods.push({
          duration,
          gameId: game.gameId,
          startTime: game.startTime,
          endTime: game.endTime,
          timeRemaining,
          status: game.status,
          totalBets: bets.length,
          totalBetsAmount: totalBetsAmount.toFixed(2),
          uniqueUsers,
          betsByType: {
            red: { count: betsByType.red.count, amount: betsByType.red.amount.toFixed(2) },
            green: { count: betsByType.green.count, amount: betsByType.green.amount.toFixed(2) },
            violet: { count: betsByType.violet.count, amount: betsByType.violet.amount.toFixed(2) },
            big: { count: betsByType.big.count, amount: betsByType.big.amount.toFixed(2) },
            small: { count: betsByType.small.count, amount: betsByType.small.amount.toFixed(2) },
            numbers: Object.fromEntries(
              Object.entries(betsByType.numbers).map(([k, v]) => [k, { count: v.count, amount: v.amount.toFixed(2) }])
            )
          },
          profitAnalysis: profitAnalysis.slice(0, 5), // Top 5 optimal results
          allResultsAnalysis: profitAnalysis,
          recentBets: bets.slice(-10).reverse().map(b => ({
            id: b.id.slice(0, 8),
            type: b.betType,
            value: b.betValue,
            amount: parseFloat(b.amount).toFixed(2),
            potential: parseFloat(b.potential).toFixed(2),
            createdAt: b.createdAt
          }))
        });
      }
      
      // Sort periods by duration
      activePeriods.sort((a, b) => a.duration - b.duration);
      
      // Get recent completed games with algorithm decisions
      const recentGames = await storage.getGameHistory(10);
      const recentAlgorithmDecisions = recentGames.map(g => ({
        gameId: g.gameId,
        duration: g.roundDuration,
        result: g.result,
        resultColor: g.resultColor,
        resultSize: g.resultSize,
        totalBets: g.totalBetsAmount,
        totalPayouts: g.totalPayouts,
        houseProfit: g.houseProfit,
        completedAt: g.endTime
      }));
      
      res.json({
        timestamp: new Date().toISOString(),
        algorithmStatus: {
          currentProfitPercentage: stats.currentProfitPercentage.toFixed(2),
          targetProfitPercentage: stats.targetProfitPercentage.toFixed(2),
          adjustment: stats.adjustment.toFixed(2),
          biasStrength: (stats.biasStrength * 100).toFixed(1),
          biasDirection: stats.shouldBiasHouse ? 'house' : stats.shouldBiasPlayers ? 'players' : 'balanced',
          currentHouseProfit: stats.currentHouseProfit.toFixed(2),
          totalBetsAllTime: stats.totalBetsFromDB.toFixed(2)
        },
        activePeriods,
        recentAlgorithmDecisions
      });
    } catch (error) {
      console.error('Error getting algorithm monitor data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Balance Integrity Endpoints
  app.get('/api/admin/balance-integrity/report', requireAdmin, async (req, res) => {
    try {
      const { balanceIntegrityService } = await import('./balance-integrity-service');
      const report = balanceIntegrityService.getLastReport();
      
      if (!report) {
        return res.json({
          message: 'No balance integrity check has been run yet',
          report: null
        });
      }
      
      res.json(report);
    } catch (error) {
      console.error('Error getting balance integrity report:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/balance-integrity/check', requireAdmin, async (req, res) => {
    try {
      const { balanceIntegrityService } = await import('./balance-integrity-service');
      const report = await balanceIntegrityService.runIntegrityCheck();
      
      res.json({
        message: 'Balance integrity check completed',
        report
      });
    } catch (error) {
      console.error('Error running balance integrity check:', error);
      res.status(500).json({ message: 'Failed to run balance integrity check' });
    }
  });

  app.post('/api/admin/balance-integrity/fix/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { balanceIntegrityService } = await import('./balance-integrity-service');
      const result = await balanceIntegrityService.fixUserBalanceById(userId);
      
      if (!result.success) {
        return res.status(400).json({
          message: result.error || 'Failed to fix user balance'
        });
      }
      
      if (!result.discrepancy) {
        return res.json({
          message: 'User balance is already correct',
          discrepancy: null
        });
      }
      
      // Log admin action
      const adminId = (req as any).session.userId;
      await storage.logAdminAction({
        adminId,
        action: 'balance_fix',
        targetId: userId,
        details: {
          oldBalance: result.discrepancy.currentBalance,
          newBalance: result.discrepancy.calculatedBalance,
          difference: result.discrepancy.difference
        }
      });
      
      // Broadcast admin dashboard update
      broadcastAdminDashboardUpdate();
      
      res.json({
        message: 'Balance fixed successfully',
        discrepancy: result.discrepancy
      });
    } catch (error) {
      console.error('Error fixing user balance:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getOverallAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get payment statistics
  app.get('/api/admin/payment-statistics', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers(1, 100000);
      
      // Calculate total deposits amount
      const totalDepositsAmount = users.users.reduce((sum, user) => {
        return sum + parseFloat(user.totalDeposits || '0');
      }, 0);

      // Calculate total withdrawals amount
      const totalWithdrawalsAmount = users.users.reduce((sum, user) => {
        return sum + parseFloat(user.totalWithdrawals || '0');
      }, 0);

      // Get all withdrawal requests to calculate pending and cancelled counts
      const allWithdrawals = await storage.getAllWithdrawalRequests(1, 100000);
      const pendingWithdrawalsCount = allWithdrawals.requests.filter((w: any) => w.status === 'pending').length;
      const cancelledWithdrawalsCount = allWithdrawals.requests.filter((w: any) => w.status === 'rejected' || w.status === 'cancelled').length;

      // Get all deposit transactions to calculate pending and cancelled deposits count
      let pendingDepositsCount = 0;
      let cancelledDepositsCount = 0;
      for (const user of users.users) {
        const transactions = await storage.getTransactionsByUser(user.id);
        const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
        const cancelledDeposits = transactions.filter(t => t.type === 'deposit' && (t.status === 'cancelled' || t.status === 'failed'));
        pendingDepositsCount += pendingDeposits.length;
        cancelledDepositsCount += cancelledDeposits.length;
      }

      // Total pending payments = pending deposits + pending withdrawals
      const pendingPaymentsCount = pendingDepositsCount + pendingWithdrawalsCount;
      
      // Total cancelled payments = cancelled deposits + cancelled withdrawals
      const cancelledPaymentsCount = cancelledDepositsCount + cancelledWithdrawalsCount;

      res.json({
        totalDepositsAmount: totalDepositsAmount.toFixed(2),
        totalWithdrawalsAmount: totalWithdrawalsAmount.toFixed(2),
        pendingPaymentsCount,
        cancelledPaymentsCount
      });
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all referrals for admin tracking
  app.get('/api/admin/referrals', requireAdmin, async (req, res) => {
    try {
      // Use raw SQL with proper joins and aliases to get all data in one query
      if (!db) {
        // If no database, return empty data
        return res.json({
          referrals: [],
          stats: {
            totalReferrals: 0,
            activeReferrals: 0,
            inactiveReferrals: 0,
            totalCommissionPaid: 0,
            referralsWithDeposits: 0,
            referralsWithoutDeposits: 0,
          }
        });
      }

      const referralsData = await db.execute(sql`
        SELECT 
          r.id,
          r.referrer_id as "referrerId",
          r.referred_id as "referredId",
          r.referral_level as "referralLevel",
          COALESCE(r.commission_rate, 0)::numeric as "commissionRate",
          COALESCE(r.total_commission, 0)::numeric as "totalCommission",
          COALESCE(r.has_deposited, false) as "hasDeposited",
          COALESCE(r.status, 'inactive') as "status",
          r.created_at as "createdAt",
          COALESCE(referrer.email, 'Unknown') as "referrerEmail",
          COALESCE(referrer.public_id, 'N/A') as "referrerPublicId",
          COALESCE(referred.email, 'Unknown') as "referredEmail",
          COALESCE(referred.public_id, 'N/A') as "referredPublicId"
        FROM referrals r
        LEFT JOIN users referrer ON r.referrer_id = referrer.id
        LEFT JOIN users referred ON r.referred_id = referred.id
        ORDER BY r.created_at DESC
      `);

      const referrals = referralsData.rows || [];

      // Calculate summary statistics from the referral data (values are already numbers from SQL)
      const totalReferrals = referrals.length;
      const activeReferrals = referrals.filter((r: any) => r.status === 'active').length;
      const inactiveReferrals = totalReferrals - activeReferrals;
      const totalCommissionPaid = referrals.reduce((sum: number, r: any) => {
        const commission = Number(r.totalCommission) || 0;
        return sum + commission;
      }, 0);
      const referralsWithDeposits = referrals.filter((r: any) => r.hasDeposited === true).length;
      const referralsWithoutDeposits = totalReferrals - referralsWithDeposits;

      res.json({
        referrals,
        stats: {
          totalReferrals,
          activeReferrals,
          inactiveReferrals,
          totalCommissionPaid,
          referralsWithDeposits,
          referralsWithoutDeposits,
        }
      });
    } catch (error) {
      console.error('Error fetching admin referrals:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get revenue forecasting data
  app.get('/api/admin/analytics/revenue-forecast', requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const games = await storage.getGameHistory(1000);
      
      // Group games by day
      const revenueByDay = new Map<string, { date: string; revenue: number; bets: number; volume: number }>();
      
      games.forEach(game => {
        const gameDate = new Date(game.endTime || game.createdAt);
        if (gameDate >= startDate && gameDate <= endDate && game.status === 'completed') {
          const dayKey = gameDate.toISOString().split('T')[0];
          const existing = revenueByDay.get(dayKey) || { date: dayKey, revenue: 0, bets: 0, volume: 0 };
          existing.revenue += parseFloat(game.houseProfit || '0');
          existing.bets += 1;
          existing.volume += parseFloat(game.totalBetsAmount || '0');
          revenueByDay.set(dayKey, existing);
        }
      });
      
      const data = Array.from(revenueByDay.values()).sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate simple linear forecast for next 7 days
      const forecast = [];
      if (data.length > 1) {
        const recent = data.slice(-7);
        const avgRevenue = recent.reduce((sum, d) => sum + d.revenue, 0) / recent.length;
        const avgGrowth = recent.length > 1 
          ? (recent[recent.length - 1].revenue - recent[0].revenue) / (recent.length - 1)
          : 0;
        
        for (let i = 1; i <= 7; i++) {
          const forecastDate = new Date(endDate.getTime() + i * 24 * 60 * 60 * 1000);
          forecast.push({
            date: forecastDate.toISOString().split('T')[0],
            revenue: Math.max(0, avgRevenue + avgGrowth * i),
            isForecast: true
          });
        }
      }
      
      res.json({ historical: data, forecast });
    } catch (error) {
      console.error('Error fetching revenue forecast:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get player behavior analysis
  app.get('/api/admin/analytics/player-behavior', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers(1, 10000);
      
      // Calculate behavior metrics
      const activePlayers = users.users.filter(u => parseFloat(u.totalBetsAmount || '0') > 0).length;
      const totalBets = users.users.reduce((sum, u) => sum + (parseInt(u.totalBetsAmount || '0') > 0 ? 1 : 0), 0);
      const avgBetsPerPlayer = users.users.length > 0 
        ? totalBets / users.users.length 
        : 0;
      
      // Player segmentation by activity
      const playerSegments = {
        high: users.users.filter(u => parseFloat(u.totalBetsAmount || '0') > 1000).length,
        medium: users.users.filter(u => {
          const amount = parseFloat(u.totalBetsAmount || '0');
          return amount > 100 && amount <= 1000;
        }).length,
        low: users.users.filter(u => {
          const amount = parseFloat(u.totalBetsAmount || '0');
          return amount > 0 && amount <= 100;
        }).length,
        inactive: users.users.filter(u => parseFloat(u.totalBetsAmount || '0') === 0).length
      };
      
      // VIP level distribution
      const vipDistribution = users.users.reduce((acc, user) => {
        acc[user.vipLevel] = (acc[user.vipLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Win/Loss player analysis
      const winningPlayers = users.users.filter(u => parseFloat(u.totalWinnings || '0') > parseFloat(u.totalLosses || '0')).length;
      const losingPlayers = users.users.filter(u => parseFloat(u.totalLosses || '0') > parseFloat(u.totalWinnings || '0')).length;
      
      res.json({
        totalPlayers: users.total,
        activePlayers,
        avgBetsPerPlayer: Math.round(avgBetsPerPlayer * 100) / 100,
        playerSegments,
        vipDistribution,
        winningPlayers,
        losingPlayers,
        retentionRate: users.total > 0 ? (activePlayers / users.total * 100).toFixed(2) : '0'
      });
    } catch (error) {
      console.error('Error fetching player behavior:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get win/loss ratio data
  app.get('/api/admin/analytics/win-loss-ratio', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers(1, 10000);
      const games = await storage.getGameHistory(1000);
      
      // Calculate overall win/loss ratio
      const totalWinnings = users.users.reduce((sum, u) => sum + parseFloat(u.totalWinnings || '0'), 0);
      const totalLosses = users.users.reduce((sum, u) => sum + parseFloat(u.totalLosses || '0'), 0);
      const overallRatio = totalLosses > 0 ? totalWinnings / totalLosses : 0;
      
      // Calculate win rate for completed games
      const completedGames = games.filter(g => g.status === 'completed');
      const totalRevenue = completedGames.reduce((sum, g) => sum + parseFloat(g.houseProfit || '0'), 0);
      const totalVolume = completedGames.reduce((sum, g) => sum + parseFloat(g.totalBetsAmount || '0'), 0);
      const houseEdge = totalVolume > 0 ? (totalRevenue / totalVolume * 100).toFixed(2) : '0';
      
      // Distribution by result type
      const resultDistribution = completedGames.reduce((acc, game) => {
        if (game.result !== null) {
          const color = game.resultColor || 'unknown';
          acc[color] = (acc[color] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Player profit distribution
      const profitDistribution = {
        highProfit: users.users.filter(u => parseFloat(u.totalWinnings || '0') - parseFloat(u.totalLosses || '0') > 500).length,
        smallProfit: users.users.filter(u => {
          const profit = parseFloat(u.totalWinnings || '0') - parseFloat(u.totalLosses || '0');
          return profit > 0 && profit <= 500;
        }).length,
        smallLoss: users.users.filter(u => {
          const profit = parseFloat(u.totalWinnings || '0') - parseFloat(u.totalLosses || '0');
          return profit < 0 && profit >= -500;
        }).length,
        highLoss: users.users.filter(u => parseFloat(u.totalWinnings || '0') - parseFloat(u.totalLosses || '0') < -500).length
      };
      
      res.json({
        overallRatio: overallRatio.toFixed(2),
        totalWinnings: totalWinnings.toFixed(2),
        totalLosses: totalLosses.toFixed(2),
        houseEdge,
        resultDistribution,
        profitDistribution
      });
    } catch (error) {
      console.error('Error fetching win/loss ratio:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get peak hours analysis
  app.get('/api/admin/analytics/peak-hours', requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const games = await storage.getGameHistory(1000);
      
      // Initialize hourly data
      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        bets: 0,
        revenue: 0,
        visitors: 0
      }));
      
      // Aggregate games by hour
      games.forEach(game => {
        const gameDate = new Date(game.createdAt);
        if (gameDate >= startDate && gameDate <= endDate) {
          const hour = gameDate.getHours();
          hourlyActivity[hour].bets += 1;
          hourlyActivity[hour].revenue += parseFloat(game.houseProfit || '0');
        }
      });
      
      // Get traffic stats for visitor data by hour (approximate)
      const trafficStats = await storage.getTrafficStats(startDate, endDate);
      if (trafficStats.dailyStats && trafficStats.dailyStats.length > 0) {
        const avgVisitorsPerDay = trafficStats.dailyStats.reduce((sum, day) => sum + day.uniqueVisitors, 0) / trafficStats.dailyStats.length;
        const avgVisitorsPerHour = Math.round(avgVisitorsPerDay / 24);
        hourlyActivity.forEach((h, i) => {
          h.visitors = Math.round(avgVisitorsPerHour * (0.8 + Math.random() * 0.4));
        });
      }
      
      // Find peak hours
      const peakBettingHour = hourlyActivity.reduce((max, curr) => curr.bets > max.bets ? curr : max);
      const peakRevenueHour = hourlyActivity.reduce((max, curr) => curr.revenue > max.revenue ? curr : max);
      const peakVisitorHour = hourlyActivity.reduce((max, curr) => curr.visitors > max.visitors ? curr : max);
      
      res.json({
        hourlyActivity,
        peakHours: {
          betting: peakBettingHour.hour,
          revenue: peakRevenueHour.hour,
          visitors: peakVisitorHour.hour
        }
      });
    } catch (error) {
      console.error('Error fetching peak hours:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Generate user data report PDF
  app.get('/api/admin/user-report/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const PDFDocument = (await import('pdfkit')).default;
      const path = await import('path');
      
      // Fetch all user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user sessions (login history with IPs)
      const sessions = await storage.getUserSessions(userId);
      
      // Get user bets
      const bets = await storage.getBetsByUser(userId);
      
      // Get user transactions
      const transactions = await storage.getTransactionsByUser(userId);

      // Create PDF document with custom styling
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 40,
        info: {
          Title: `3xBet User Report - ${user.email}`,
          Author: '3xBet Gaming Platform',
          Subject: 'Comprehensive User Activity Report'
        }
      });

      // Collect PDF chunks in a buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="3xbet-user-report-${user.publicId || userId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        res.send(pdfBuffer);
      });
      doc.on('error', (err) => {
        console.error('PDF generation stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error generating PDF report' });
        }
      });

      // Brand colors
      const brandPurple = '#7c3aed';
      const brandBlue = '#6366f1';
      const darkBg = '#1e1b4b';
      const lightText = '#e0e7ff';
      const successGreen = '#10b981';
      const warningRed = '#ef4444';

      // Helper function to draw a header background
      const drawHeaderBg = () => {
        doc.save()
           .rect(0, 0, doc.page.width, 120)
           .fillAndStroke(brandPurple, brandPurple)
           .restore();
      };

      // Helper function to add logo
      const addLogo = async () => {
        try {
          // Try multiple logo paths
          const logoPaths = [
            path.join(process.cwd(), 'attached_assets', 'generated_images', '3Xbet_PWA_app_icon_d87f3d00.png'),
            path.join(process.cwd(), 'attached_assets', 'generated_images', '3Xbet_icon_with_green_ring_361ec355.png'),
            path.join(process.cwd(), 'attached_assets', 'generated_images', '3Xbet_purple-slate_gradient_icon_d346749c.png')
          ];
          
          for (const logoPath of logoPaths) {
            try {
              const fs = await import('fs');
              if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { width: 70, height: 70 });
                return;
              }
            } catch {}
          }
        } catch (err) {
          console.error('Logo not found, skipping:', err);
        }
      };

      // Helper function to add section header with style
      const addSectionHeader = (title: string, icon = '●') => {
        doc.fontSize(18)
           .fillColor(brandPurple)
           .text(`${icon} ${title}`, { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#000000');
      };

      // Helper function to add data row with label and value
      const addDataRow = (label: string, value: any, color = '#000000') => {
        doc.fontSize(11)
           .fillColor('#4b5563')
           .font('Helvetica-Bold')
           .text(label, { continued: true, width: 200 })
           .fillColor(color)
           .font('Helvetica')
           .text(value || 'N/A');
        doc.moveDown(0.4);
      };

      // Helper function to create a styled table
      const createTable = (headers: string[], rows: any[][], columnWidths: number[]) => {
        const startX = 50;
        let startY = doc.y;
        const rowHeight = 25;

        // Draw header
        doc.save()
           .rect(startX, startY, doc.page.width - 100, rowHeight)
           .fillAndStroke(brandPurple, brandPurple);
        
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 10;
          doc.text(header, x, startY + 8, { width: columnWidths[i] - 20 });
        });
        doc.restore();

        startY += rowHeight;

        // Draw rows
        rows.forEach((row, rowIdx) => {
          const bgColor = rowIdx % 2 === 0 ? '#f9fafb' : '#ffffff';
          doc.save()
             .rect(startX, startY, doc.page.width - 100, rowHeight)
             .fillAndStroke(bgColor, '#e5e7eb');

          doc.fillColor('#000000').fontSize(9).font('Helvetica');
          row.forEach((cell, i) => {
            const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 10;
            doc.text(String(cell || ''), x, startY + 8, { width: columnWidths[i] - 20 });
          });
          doc.restore();

          startY += rowHeight;
        });

        doc.y = startY + 10;
      };

      // Draw header background and add logo
      drawHeaderBg();
      await addLogo();

      // Add title
      doc.fontSize(32)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('USER ACTIVITY REPORT', 140, 40);
      
      doc.fontSize(14)
         .fillColor(lightText)
         .font('Helvetica')
         .text('3xBet Gaming Platform | Comprehensive User Analysis', 140, 78);
      
      // Add report metadata
      doc.fontSize(10)
         .fillColor('#c7d2fe')
         .text(`Generated: ${new Date().toLocaleString('en-US', { 
           year: 'numeric', month: 'long', day: 'numeric', 
           hour: '2-digit', minute: '2-digit' 
         })}`, 140, 100);

      doc.moveDown(1.5);

      // User Information Box
      const infoBoxY = doc.y;
      doc.save()
         .roundedRect(50, infoBoxY, doc.page.width - 100, 350, 10)
         .fillAndStroke('#f3f4f6', '#e5e7eb')
         .restore();

      doc.y = infoBoxY + 15;
      doc.x = 60;

      addSectionHeader('👤 User Information', '');
      addDataRow('User ID:', user.publicId || user.id, brandBlue);
      addDataRow('Email Address:', user.email, brandBlue);
      addDataRow('Account Role:', user.role.toUpperCase(), brandPurple);
      addDataRow('VIP Level:', user.vipLevel.toUpperCase(), '#f59e0b');
      addDataRow('Account Status:', user.isActive ? '✓ Active' : '✗ Inactive', user.isActive ? successGreen : warningRed);
      addDataRow('Current Balance:', `$${parseFloat(user.balance || '0').toFixed(2)}`, successGreen);
      addDataRow('Registration Country:', user.registrationCountry || 'Not available');
      addDataRow('Registration IP:', user.registrationIp || 'Not recorded');
      addDataRow('Last Login IP:', user.lastLoginIp || 'Not recorded');
      addDataRow('2FA Security:', user.twoFactorEnabled ? '✓ Enabled' : '✗ Disabled', user.twoFactorEnabled ? successGreen : warningRed);
      addDataRow('Withdrawal Password:', user.withdrawalPasswordHash ? '✓ Set' : '✗ Not Set', user.withdrawalPasswordHash ? successGreen : warningRed);
      addDataRow('Profile Photo:', user.profilePhoto ? '✓ Uploaded' : '✗ Not Set', user.profilePhoto ? successGreen : '#9ca3af');
      addDataRow('Member Since:', new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

      doc.moveDown(1);

      // Executive Summary Box
      doc.addPage();
      const summaryBoxY = doc.y;
      doc.save()
         .roundedRect(50, summaryBoxY, doc.page.width - 100, 180, 10)
         .fillAndStroke('#ede9fe', '#c4b5fd')
         .restore();

      doc.y = summaryBoxY + 15;
      doc.x = 60;

      addSectionHeader('📊 Executive Summary', '');
      
      const accountAge = Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const totalActivity = bets.length + transactions.length;
      const avgDailyActivity = accountAge > 0 ? (totalActivity / accountAge).toFixed(1) : '0';
      const lifetimeValue = parseFloat(user.totalDeposits || '0');
      const riskLevel = lifetimeValue > 5000 ? 'High Value' : lifetimeValue > 1000 ? 'Medium Value' : 'Low Value';
      
      addDataRow('Account Age:', `${accountAge} days`, brandPurple);
      addDataRow('Total Activities:', `${totalActivity} (${avgDailyActivity}/day avg)`, brandBlue);
      addDataRow('Lifetime Value (LTV):', `$${lifetimeValue.toFixed(2)}`, successGreen);
      addDataRow('User Classification:', riskLevel, lifetimeValue > 5000 ? successGreen : '#f59e0b');
      addDataRow('Activity Status:', sessions.length > 0 ? '✓ Active User' : '⚠ Inactive', sessions.length > 0 ? successGreen : warningRed);
      addDataRow('Last Activity:', sessions.length > 0 ? new Date(sessions[0].loginTime).toLocaleDateString('en-US') : 'No activity recorded');

      doc.moveDown(2);

      // Financial Summary with Stats Cards
      addSectionHeader('💰 Financial Summary');
      
      const netProfit = parseFloat(user.totalWinnings || '0') - parseFloat(user.totalLosses || '0');
      const winRate = bets.length > 0 ? ((bets.filter(b => b.status === 'won').length / bets.length) * 100).toFixed(1) : '0';
      
      const financialStats = [
        ['Total Deposits', `$${parseFloat(user.totalDeposits || '0').toFixed(2)}`, successGreen],
        ['Total Withdrawals', `$${parseFloat(user.totalWithdrawals || '0').toFixed(2)}`, brandBlue],
        ['Total Winnings', `$${parseFloat(user.totalWinnings || '0').toFixed(2)}`, successGreen],
        ['Total Losses', `$${parseFloat(user.totalLosses || '0').toFixed(2)}`, warningRed],
        ['Net Profit/Loss', `$${netProfit.toFixed(2)}`, netProfit >= 0 ? successGreen : warningRed],
        ['Total Bets Amount', `$${parseFloat(user.totalBetsAmount || '0').toFixed(2)}`, brandPurple],
        ['Commission Earned', `$${parseFloat(user.totalCommission || '0').toFixed(2)}`, '#f59e0b'],
        ['Win Rate', `${winRate}%`, parseFloat(winRate) > 50 ? successGreen : warningRed]
      ];

      financialStats.forEach(([label, value, color]) => {
        addDataRow(label, value, color);
      });

      doc.moveDown(1.5);

      // Referral & Team Information
      addSectionHeader('🔗 Referral & Team');
      addDataRow('Referral Code:', user.referralCode || 'Not set', brandPurple);
      addDataRow('Referred By:', user.referredBy || 'Direct signup');
      addDataRow('Qualified Team Size:', user.teamSize || 0);
      addDataRow('Total Team Members:', user.totalTeamMembers || 0);

      // New page for login history
      doc.addPage();
      addSectionHeader('🔐 Login History & Security');
      
      if (sessions && sessions.length > 0) {
        const uniqueIPs = Array.from(new Set(sessions.map(s => s.ipAddress)));
        doc.fontSize(11).fillColor('#4b5563').text(`Total Unique IP Addresses: ${uniqueIPs.length}`);
        doc.fontSize(11).fillColor('#4b5563').text(`Total Login Sessions: ${sessions.length}`);
        doc.moveDown(1);
        
        const sessionRows = sessions.slice(0, 15).map((s, idx) => [
          `${idx + 1}`,
          s.ipAddress,
          s.deviceType || 'Unknown',
          new Date(s.loginTime).toLocaleString()
        ]);

        createTable(['#', 'IP Address', 'Device', 'Login Time'], sessionRows, [40, 150, 120, 200]);

        if (sessions.length > 15) {
          doc.fontSize(10).fillColor('#6b7280').text(`... and ${sessions.length - 15} more sessions`);
        }
      } else {
        doc.fontSize(11).fillColor('#9ca3af').text('No login history available');
      }

      // Transaction History
      doc.addPage();
      addSectionHeader('💳 Transaction History');
      
      if (transactions && transactions.length > 0) {
        doc.fontSize(11).fillColor('#4b5563').text(`Total Transactions: ${transactions.length}`);
        doc.moveDown(1);
        
        const txnRows = transactions.slice(0, 20).map((txn, idx) => {
          const amount = txn.fiatAmount || txn.cryptoAmount || '0';
          const currency = txn.fiatCurrency || txn.cryptoCurrency || 'USD';
          return [
            `${idx + 1}`,
            txn.type.toUpperCase(),
            `$${parseFloat(amount).toFixed(2)} ${currency}`,
            txn.status,
            new Date(txn.createdAt).toLocaleDateString()
          ];
        });

        createTable(['#', 'Type', 'Amount', 'Status', 'Date'], txnRows, [40, 100, 120, 100, 150]);

        if (transactions.length > 20) {
          doc.fontSize(10).fillColor('#6b7280').text(`... and ${transactions.length - 20} more transactions`);
        }
      } else {
        doc.fontSize(11).fillColor('#9ca3af').text('No transactions available');
      }

      // Wallet Addresses
      if (transactions && transactions.length > 0) {
        const walletAddresses = Array.from(new Set(transactions
          .filter(t => t.paymentAddress)
          .map(t => t.paymentAddress)));
        
        if (walletAddresses.length > 0) {
          doc.moveDown(2);
          addSectionHeader('🔑 Wallet Addresses Used');
          doc.fontSize(11).fillColor('#4b5563').text(`Total Unique Wallets: ${walletAddresses.length}`);
          doc.moveDown(0.5);
          
          walletAddresses.slice(0, 10).forEach((addr, idx) => {
            doc.fontSize(9).fillColor('#000000').text(`${idx + 1}. ${addr}`);
            doc.moveDown(0.3);
          });

          if (walletAddresses.length > 10) {
            doc.fontSize(10).fillColor('#6b7280').text(`... and ${walletAddresses.length - 10} more wallets`);
          }
        }
      }

      // Betting History
      doc.addPage();
      addSectionHeader('🎲 Betting History');
      
      if (bets && bets.length > 0) {
        const wonBets = bets.filter(b => b.status === 'won').length;
        const lostBets = bets.filter(b => b.status === 'lost').length;
        
        doc.fontSize(11).fillColor('#4b5563').text(`Total Bets: ${bets.length}`);
        doc.fontSize(11).fillColor(successGreen).text(`Won: ${wonBets} (${((wonBets / bets.length) * 100).toFixed(1)}%)`);
        doc.fontSize(11).fillColor(warningRed).text(`Lost: ${lostBets} (${((lostBets / bets.length) * 100).toFixed(1)}%)`);
        doc.moveDown(1);
        
        const betRows = bets.slice(0, 25).map((bet, idx) => {
          const payout = bet.actualPayout ? `$${parseFloat(bet.actualPayout).toFixed(2)}` : '-';
          return [
            `${idx + 1}`,
            bet.betType.toUpperCase(),
            bet.betValue,
            `$${parseFloat(bet.amount).toFixed(2)}`,
            payout,
            bet.status.toUpperCase()
          ];
        });

        createTable(['#', 'Type', 'Value', 'Bet', 'Payout', 'Status'], betRows, [30, 80, 80, 80, 80, 80]);

        if (bets.length > 25) {
          doc.fontSize(10).fillColor('#6b7280').text(`... and ${bets.length - 25} more bets`);
        }
        
        // Betting Patterns Analysis
        doc.moveDown(2);
        addSectionHeader('📈 Betting Patterns & Analytics');
        
        const betTypes = bets.reduce((acc, bet) => {
          acc[bet.betType] = (acc[bet.betType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const favoriteBetType = Object.entries(betTypes).sort((a, b) => b[1] - a[1])[0];
        const avgBetAmount = bets.length > 0 ? (bets.reduce((sum, b) => sum + parseFloat(b.amount), 0) / bets.length).toFixed(2) : '0';
        const totalWagered = bets.reduce((sum, b) => sum + parseFloat(b.amount), 0).toFixed(2);
        const largestBet = bets.length > 0 ? Math.max(...bets.map(b => parseFloat(b.amount))).toFixed(2) : '0';
        const smallestBet = bets.length > 0 ? Math.min(...bets.map(b => parseFloat(b.amount))).toFixed(2) : '0';
        
        addDataRow('Favorite Bet Type:', favoriteBetType ? `${favoriteBetType[0].toUpperCase()} (${favoriteBetType[1]} bets)` : 'N/A', brandPurple);
        addDataRow('Total Amount Wagered:', `$${totalWagered}`, brandBlue);
        addDataRow('Average Bet Size:', `$${avgBetAmount}`, '#000000');
        addDataRow('Largest Single Bet:', `$${largestBet}`, successGreen);
        addDataRow('Smallest Single Bet:', `$${smallestBet}`, '#9ca3af');
        
        // Bet type distribution
        if (Object.keys(betTypes).length > 0) {
          doc.moveDown(1);
          doc.fontSize(12).fillColor(brandPurple).text('Bet Type Distribution:', { underline: true });
          doc.moveDown(0.5);
          
          Object.entries(betTypes).forEach(([type, count]) => {
            const percentage = ((count / bets.length) * 100).toFixed(1);
            doc.fontSize(10)
               .fillColor('#000000')
               .text(`${type.toUpperCase()}: ${count} bets (${percentage}%)`);
            doc.moveDown(0.3);
          });
        }
        
      } else {
        doc.fontSize(11).fillColor('#9ca3af').text('No betting history available');
      }

      // Professional Footer on all pages
      const pageRange = doc.bufferedPageRange();
      const totalPages = pageRange.count;
      for (let i = 0; i < totalPages; i++) {
        const pageNumber = pageRange.start + i;
        doc.switchToPage(pageNumber);
        
        // Footer background with gradient effect (simulated with rectangles)
        doc.save()
           .rect(0, doc.page.height - 60, doc.page.width, 60)
           .fillAndStroke(darkBg, darkBg)
           .restore();

        // Top border line
        doc.save()
           .moveTo(0, doc.page.height - 60)
           .lineTo(doc.page.width, doc.page.height - 60)
           .lineWidth(2)
           .strokeColor(brandPurple)
           .stroke()
           .restore();

        // Footer text - Company name and tagline
        doc.fontSize(11)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(
             '3xBet Gaming Platform',
             50,
             doc.page.height - 45,
             { align: 'center' }
           );

        doc.fontSize(8)
           .fillColor('#c7d2fe')
           .font('Helvetica')
           .text(
             'Professional Betting Solutions | Comprehensive User Analytics',
             50,
             doc.page.height - 32,
             { align: 'center' }
           );

        // Page number and confidentiality notice
        doc.fontSize(8)
           .fillColor(lightText)
           .text(
             `Page ${i + 1} of ${totalPages} | Generated: ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} | CONFIDENTIAL`,
             50,
             doc.page.height - 18,
             { align: 'center' }
           );
      }

      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating user report PDF:', error);
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error generating report' });
      }
    }
  });

  // Get daily visitor statistics
  app.get('/api/admin/traffic/daily', requireAdmin, async (req, res) => {
    try {
      const dateStr = req.query.date as string;
      const date = dateStr ? new Date(dateStr) : new Date();
      const stats = await storage.getDailyVisitors(date);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching daily visitors:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get comprehensive traffic statistics
  app.get('/api/admin/traffic/stats', requireAdmin, async (req, res) => {
    try {
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      // Default to last 7 days if no dates provided
      const endDate = endDateStr ? new Date(endDateStr) : new Date();
      const startDate = startDateStr ? new Date(startDateStr) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = await storage.getTrafficStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching traffic stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Track page view (for SPA navigation)
  app.post('/api/analytics/page-view', async (req, res) => {
    try {
      const session = (req as any).session;
      const clientIP = getRealIP(req);
      const country = (req.headers['cf-ipcountry'] as string) || (req as any).cloudflare?.country || null;
      const userAgent = req.headers['user-agent'];
      const parsedUA = parseUserAgent(userAgent);
      const { path } = req.body;

      if (!path) {
        return res.status(400).json({ message: 'Path is required' });
      }

      await storage.createPageView({
        userId: session?.userId || null,
        path,
        ipAddress: clientIP,
        country: country,
        userAgent: userAgent || null,
        browserName: parsedUA.browserName,
        deviceType: parsedUA.deviceType,
        operatingSystem: parsedUA.operatingSystem,
        referrer: req.headers.referer || null,
        sessionId: session?.id || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking page view:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user activity/sessions for admin
  app.get('/api/admin/user-activity', requireAdmin, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      if (userId) {
        // Get sessions for specific user
        const sessions = await storage.getUserSessions(userId);
        
        // Parse user agent for each session to extract browser/device info
        const enrichedSessions = sessions.map(session => {
          const parsedUA = parseUserAgent(session.userAgent || '');
          return {
            ...session,
            browserName: parsedUA.browserName,
            browserVersion: parsedUA.browserVersion,
            deviceType: parsedUA.deviceType,
            operatingSystem: parsedUA.operatingSystem
          };
        });
        
        res.json({ sessions: enrichedSessions, total: enrichedSessions.length });
      } else {
        // Get all users with their session count and last activity
        const usersResult = await storage.getAllUsers(page, limit);
        const enrichedUsers = await Promise.all(
          usersResult.users.map(async (user) => {
            const sessions = await storage.getUserSessions(user.id);
            const uniqueIPs = Array.from(new Set(sessions.map(s => s.ipAddress)));
            
            // Sort sessions by loginTime descending to get the most recent first
            const sortedSessions = sessions.sort((a, b) => 
              new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
            );
            const lastSession = sortedSessions.length > 0 ? sortedSessions[0] : null;
            
            // Parse last session user agent for browser/device info
            let lastBrowserInfo = null;
            if (lastSession) {
              const parsedUA = parseUserAgent(lastSession.userAgent || '');
              lastBrowserInfo = {
                browserName: parsedUA.browserName,
                browserVersion: parsedUA.browserVersion,
                deviceType: parsedUA.deviceType,
                operatingSystem: parsedUA.operatingSystem
              };
            }
            
            // Use sanitizeUserData to prevent sensitive data leakage
            const safeUser = sanitizeUserData(user);
            return {
              ...safeUser,
              sessionCount: sessions.length,
              uniqueIPCount: uniqueIPs.length,
              lastActivity: lastSession ? lastSession.loginTime : user.createdAt,
              lastIP: user.lastLoginIp || 'Unknown',
              lastBrowserInfo
            };
          })
        );
        
        res.json({ users: enrichedUsers, total: usersResult.total });
      }
    } catch (error) {
      console.error('User activity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Export all user data for backup - COMPLETE BACKUP OF ALL TABLES
  app.get('/api/admin/export', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      
      console.log('🔄 Starting COMPLETE database export...');
      
      // Only proceed if using database storage
      if (!(storage as any).db) {
        return res.status(400).json({ message: 'Database export only available when using database storage' });
      }
      
      // Import all tables from schema
      const schema = await import("@shared/schema");
      const db = (storage as any).db;
      
      // Export ALL tables directly from database
      const [
        users,
        games,
        bets,
        referrals,
        transactions,
        adminActions,
        gameAnalytics,
        userSessions,
        pageViews,
        passwordResetTokens,
        systemSettings,
        databaseConnections,
        withdrawalRequests,
        agentProfiles,
        agentActivities,
        passkeys,
        notifications,
        pushSubscriptions,
        promoCodes,
        promoCodeRedemptions,
        vipSettings,
        goldenLiveStats,
        goldenLiveEvents
      ] = await Promise.all([
        db.select().from(schema.users),
        db.select().from(schema.games),
        db.select().from(schema.bets),
        db.select().from(schema.referrals),
        db.select().from(schema.transactions),
        db.select().from(schema.adminActions),
        db.select().from(schema.gameAnalytics),
        db.select().from(schema.userSessions),
        db.select().from(schema.pageViews),
        db.select().from(schema.passwordResetTokens),
        db.select().from(schema.systemSettings),
        db.select().from(schema.databaseConnections),
        db.select().from(schema.withdrawalRequests),
        db.select().from(schema.agentProfiles),
        db.select().from(schema.agentActivities),
        db.select().from(schema.passkeys),
        db.select().from(schema.notifications),
        db.select().from(schema.pushSubscriptions),
        db.select().from(schema.promoCodes),
        db.select().from(schema.promoCodeRedemptions),
        db.select().from(schema.vipSettings),
        db.select().from(schema.goldenLiveStats),
        db.select().from(schema.goldenLiveEvents)
      ]);
      
      // Create complete export data structure with ALL tables
      const exportData = {
        version: '3.0', // Updated version for complete backup
        exportDate: new Date().toISOString(),
        exportedBy: adminId,
        isCompleteBackup: true,
        data: {
          // Core tables
          users,
          games,
          bets,
          referrals,
          transactions,
          
          // Admin & Analytics
          adminActions,
          gameAnalytics,
          
          // Session & Activity
          userSessions,
          pageViews,
          
          // Security & Auth
          passwordResetTokens,
          passkeys,
          
          // System
          systemSettings,
          databaseConnections,
          
          // Financial
          withdrawalRequests,
          
          // Agent system
          agentProfiles,
          agentActivities,
          
          // Notifications
          notifications,
          pushSubscriptions,
          
          // Promotions
          promoCodes,
          promoCodeRedemptions,
          
          // VIP & Golden
          vipSettings,
          goldenLiveStats,
          goldenLiveEvents,
          
          // Statistics
          stats: {
            totalUsers: users.length,
            totalGames: games.length,
            totalBets: bets.length,
            totalReferrals: referrals.length,
            totalTransactions: transactions.length,
            totalAdminActions: adminActions.length,
            totalGameAnalytics: gameAnalytics.length,
            totalUserSessions: userSessions.length,
            totalPageViews: pageViews.length,
            totalPasswordResetTokens: passwordResetTokens.length,
            totalSystemSettings: systemSettings.length,
            totalDatabaseConnections: databaseConnections.length,
            totalWithdrawalRequests: withdrawalRequests.length,
            totalAgentProfiles: agentProfiles.length,
            totalAgentActivities: agentActivities.length,
            totalPasskeys: passkeys.length,
            totalNotifications: notifications.length,
            totalPushSubscriptions: pushSubscriptions.length,
            totalPromoCodes: promoCodes.length,
            totalPromoCodeRedemptions: promoCodeRedemptions.length,
            totalVipSettings: vipSettings.length,
            totalGoldenLiveStats: goldenLiveStats.length,
            totalGoldenLiveEvents: goldenLiveEvents.length
          }
        }
      };
      
      console.log('✅ Complete database export ready:');
      console.log(`   📊 Total tables: 23`);
      console.log(`   👥 Users: ${users.length}`);
      console.log(`   🎮 Games: ${games.length}`);
      console.log(`   🎲 Bets: ${bets.length}`);
      console.log(`   📝 Transactions: ${transactions.length}`);
      console.log(`   🔐 User Sessions: ${userSessions.length}`);
      console.log(`   📄 Page Views: ${pageViews.length}`);
      console.log(`   ⚙️ Admin Actions: ${adminActions.length}`);
      console.log(`   💰 Withdrawal Requests: ${withdrawalRequests.length}`);
      console.log(`   🔔 Notifications: ${notifications.length}`);
      console.log(`   🔑 Passkeys: ${passkeys.length}`);
      console.log(`   🎁 Promo Codes: ${promoCodes.length}`);
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'complete_data_export',
        targetId: null,
        details: { 
          totalTables: 23,
          totalRecords: Object.values(exportData.data.stats).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0),
          exportDate: exportData.exportDate,
          isCompleteBackup: true
        }
      });
      
      res.json(exportData);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Import user data from backup
  app.post('/api/admin/import', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const importData = req.body;
      const clearBeforeImport = importData.clearBeforeImport || false;
      
      // Validate import data structure
      if (!importData.data || !importData.data.users || !Array.isArray(importData.data.users)) {
        return res.status(400).json({ message: 'Invalid import data structure' });
      }
      
      // Clear demo data before import if requested (preserves admin users)
      if (clearBeforeImport) {
        console.log('🗑️ Clearing demo data before import (admin users will be preserved)...');
        await storage.clearDemoData();
        console.log('✅ Demo data cleared successfully');
      }
      
      let newUsersCount = 0;
      let skippedCount = 0;
      let errors: Array<{ email: string; error: string }> = [];
      
      // Import users with their data
      console.log(`📥 Starting import of ${importData.data.users.length} users...`);
      for (const userData of importData.data.users) {
        try {
          // Check if user already exists
          const existingUser = await storage.getUserByEmail(userData.email);
          
          if (existingUser) {
            // Skip existing user - do not update or add any data
            console.log(`⏭️ Skipping existing user: ${userData.email}`);
            skippedCount++;
            continue;
          } else {
            // Create new user
            const newUser = await storage.createUser({
              email: userData.email,
              password: 'IMPORTED_HASH:' + userData.passwordHash, // Mark as imported
              confirmPassword: 'IMPORTED_HASH:' + userData.passwordHash,
              referralCode: userData.referralCode,
              withdrawalPassword: userData.withdrawalPasswordHash ? 'IMPORTED_HASH:' + userData.withdrawalPasswordHash : 'default123',
              acceptedTerms: true
            }, userData.registrationIp);
            
            // Update additional fields after creation
            await storage.updateUser(newUser.id, {
              publicId: userData.publicId,
              profilePhoto: userData.profilePhoto,
              balance: userData.balance,
              role: userData.role,
              vipLevel: userData.vipLevel,
              isActive: userData.isActive,
              referredBy: userData.referredBy,
              totalDeposits: userData.totalDeposits,
              totalWithdrawals: userData.totalWithdrawals,
              totalWinnings: userData.totalWinnings,
              totalLosses: userData.totalLosses,
              totalCommission: userData.totalCommission,
              lastLoginIp: userData.lastLoginIp,
              maxBetLimit: userData.maxBetLimit,
              twoFactorEnabled: userData.twoFactorEnabled,
              twoFactorSecret: userData.twoFactorSecret
            });
            
            // Import user sessions for new user
            if (userData.sessions && Array.isArray(userData.sessions)) {
              for (const sessionData of userData.sessions) {
                try {
                  await storage.createUserSession({
                    userId: newUser.id,
                    ipAddress: sessionData.ipAddress,
                    userAgent: sessionData.userAgent,
                    browserName: sessionData.browserName,
                    browserVersion: sessionData.browserVersion,
                    deviceType: sessionData.deviceType,
                    operatingSystem: sessionData.operatingSystem,
                    logoutTime: sessionData.logoutTime,
                    isActive: sessionData.isActive
                  });
                } catch (sessionError) {
                  // Silently skip duplicate sessions
                  console.log(`Skipping duplicate session for user: ${userData.email}`);
                }
              }
            }
            
            // Import user transactions for new user
            if (userData.transactions && Array.isArray(userData.transactions)) {
              for (const transactionData of userData.transactions) {
                try {
                  await storage.createTransaction({
                    userId: newUser.id,
                    agentId: transactionData.agentId,
                    type: transactionData.type,
                    fiatAmount: transactionData.fiatAmount,
                    cryptoAmount: transactionData.cryptoAmount,
                    fiatCurrency: transactionData.fiatCurrency,
                    cryptoCurrency: transactionData.cryptoCurrency,
                    status: transactionData.status,
                    paymentMethod: transactionData.paymentMethod,
                    externalId: transactionData.externalId,
                    paymentAddress: transactionData.paymentAddress,
                    txHash: transactionData.txHash,
                    fee: transactionData.fee
                  });
                } catch (txError) {
                  // Silently skip duplicate transactions
                  console.log(`Skipping duplicate transaction for user: ${userData.email}`);
                }
              }
            }
            
            newUsersCount++;
            console.log(`✅ Created new user: ${userData.email}`);
          }
        } catch (userError) {
          console.error(`❌ Error importing user ${userData.email}:`, userError);
          const errorMessage = userError instanceof Error ? userError.message : String(userError);
          errors.push({ email: userData.email, error: errorMessage });
        }
      }
      
      console.log(`📊 User import summary: ${newUsersCount} new, ${skippedCount} skipped, ${errors.length} errors`);
      
      // Import games (if available)
      let gamesImported = 0;
      if (importData.data.games && Array.isArray(importData.data.games)) {
        for (const gameData of importData.data.games) {
          try {
            if ((storage as any).db) {
              const { games } = await import("@shared/schema");
              const { sql } = await import("drizzle-orm");
              await (storage as any).db.insert(games).values({
                gameId: gameData.gameId,
                gameType: gameData.gameType,
                roundDuration: gameData.roundDuration,
                startTime: new Date(gameData.startTime),
                endTime: new Date(gameData.endTime),
                status: gameData.status,
                result: gameData.result,
                resultColor: gameData.resultColor,
                resultSize: gameData.resultSize,
                crashPoint: gameData.crashPoint,
                currentMultiplier: gameData.currentMultiplier,
                crashedAt: gameData.crashedAt ? new Date(gameData.crashedAt) : undefined,
                isManuallyControlled: gameData.isManuallyControlled,
                manualResult: gameData.manualResult,
                totalBetsAmount: gameData.totalBetsAmount,
                totalPayouts: gameData.totalPayouts,
                houseProfit: gameData.houseProfit
              }).onConflictDoNothing();
            } else {
              const newGame = await storage.createGame({
                gameId: gameData.gameId,
                gameType: gameData.gameType,
                roundDuration: gameData.roundDuration,
                startTime: new Date(gameData.startTime),
                endTime: new Date(gameData.endTime),
                status: gameData.status,
                crashPoint: gameData.crashPoint,
                currentMultiplier: gameData.currentMultiplier,
                crashedAt: gameData.crashedAt ? new Date(gameData.crashedAt) : undefined,
                isManuallyControlled: gameData.isManuallyControlled,
                manualResult: gameData.manualResult
              });
              
              if (newGame) {
                if (gameData.result !== undefined && gameData.resultColor && gameData.resultSize) {
                  await storage.updateGameResult(newGame.id, gameData.result, gameData.resultColor, gameData.resultSize);
                }
                
                if (gameData.totalBetsAmount || gameData.totalPayouts || gameData.houseProfit) {
                  await storage.updateGameStats(newGame.id, {
                    totalBetsAmount: gameData.totalBetsAmount,
                    totalPayouts: gameData.totalPayouts,
                    houseProfit: gameData.houseProfit
                  });
                }
              }
            }
            gamesImported++;
          } catch (gameError) {
            console.error(`Error importing game ${gameData.gameId}:`, gameError);
          }
        }
      }
      
      // Import referrals and bets for each user (needs to be done after all users are imported)
      let referralsImported = 0;
      let betsImported = 0;
      for (const userData of importData.data.users) {
        try {
          const user = await storage.getUserByEmail(userData.email);
          if (!user) continue;
          
          // Import referrals
          if (userData.referrals && Array.isArray(userData.referrals)) {
            for (const referralData of userData.referrals) {
              try {
                if ((storage as any).db) {
                  const { referrals } = await import("@shared/schema");
                  await (storage as any).db.insert(referrals).values({
                    referrerId: user.id,
                    referredId: referralData.referredId,
                    referralLevel: referralData.referralLevel,
                    commissionRate: referralData.commissionRate,
                    totalCommission: referralData.totalCommission,
                    hasDeposited: referralData.hasDeposited,
                    status: referralData.status
                  }).onConflictDoNothing();
                } else {
                  await storage.createReferral({
                    referrerId: user.id,
                    referredId: referralData.referredId,
                    referralLevel: referralData.referralLevel,
                    commissionRate: referralData.commissionRate,
                    hasDeposited: referralData.hasDeposited,
                    status: referralData.status
                  });
                }
                referralsImported++;
              } catch (refError) {
                console.error(`Error importing referral:`, refError);
              }
            }
          }
          
          // Import bets
          if (userData.bets && Array.isArray(userData.bets)) {
            for (const betData of userData.bets) {
              try {
                if ((storage as any).db) {
                  const { bets } = await import("@shared/schema");
                  await (storage as any).db.insert(bets).values({
                    userId: user.id,
                    gameId: betData.gameId,
                    betType: betData.betType,
                    betValue: betData.betValue,
                    amount: betData.amount,
                    potential: betData.potential,
                    actualPayout: betData.actualPayout,
                    status: betData.status,
                    cashOutMultiplier: betData.cashOutMultiplier,
                    autoCashOut: betData.autoCashOut,
                    cashedOutAt: betData.cashedOutAt ? new Date(betData.cashedOutAt) : undefined
                  }).onConflictDoNothing();
                } else {
                  const newBet = await storage.createBet({
                    userId: user.id,
                    gameId: betData.gameId,
                    betType: betData.betType,
                    betValue: betData.betValue,
                    amount: betData.amount,
                    potential: betData.potential || betData.amount,
                    cashOutMultiplier: betData.cashOutMultiplier,
                    autoCashOut: betData.autoCashOut,
                    cashedOutAt: betData.cashedOutAt ? new Date(betData.cashedOutAt) : undefined
                  });
                  if (newBet && betData.status) {
                    await storage.updateBetStatus(newBet.id, betData.status, betData.actualPayout);
                  }
                }
                betsImported++;
              } catch (betError) {
                console.error(`Error importing bet:`, betError);
              }
            }
          }
        } catch (error) {
          console.error(`Error importing user data for ${userData.email}:`, error);
        }
      }
      
      // Import agent profiles (if available)
      let agentProfilesImported = 0;
      if (importData.data.agentProfiles && Array.isArray(importData.data.agentProfiles)) {
        for (const agentData of importData.data.agentProfiles) {
          try {
            // Find the user by their agent's userId
            const user = await storage.getUser(agentData.userId);
            if (user && user.role === 'agent') {
              // Check if agent profile already exists
              const existingProfile = await storage.getAgentProfile(user.id);
              if (!existingProfile) {
                // Create agent profile directly in DB
                if ((storage as any).db) {
                  const { agentProfiles } = await import("@shared/schema");
                  await (storage as any).db.insert(agentProfiles).values({
                    userId: user.id,
                    commissionRate: agentData.commissionRate,
                    earningsBalance: agentData.earningsBalance,
                    isActive: agentData.isActive
                  }).onConflictDoNothing();
                  agentProfilesImported++;
                }
              }
            }
          } catch (agentError) {
            console.error(`Error importing agent profile:`, agentError);
          }
        }
      }
      
      // Import withdrawal requests (if available)
      let withdrawalRequestsImported = 0;
      if (importData.data.withdrawalRequests && Array.isArray(importData.data.withdrawalRequests)) {
        for (const withdrawalData of importData.data.withdrawalRequests) {
          try {
            if ((storage as any).db) {
              const { withdrawalRequests } = await import("@shared/schema");
              await (storage as any).db.insert(withdrawalRequests).values({
                userId: withdrawalData.userId,
                amount: withdrawalData.amount,
                currency: withdrawalData.currency,
                walletAddress: withdrawalData.walletAddress,
                status: withdrawalData.status,
                adminNote: withdrawalData.adminNote,
                requiredBetAmount: withdrawalData.requiredBetAmount,
                currentBetAmount: withdrawalData.currentBetAmount,
                eligible: withdrawalData.eligible !== undefined ? withdrawalData.eligible : withdrawalData.canWithdraw,
                processedAt: withdrawalData.processedAt ? new Date(withdrawalData.processedAt) : undefined,
                processedBy: withdrawalData.processedBy
              }).onConflictDoNothing();
              withdrawalRequestsImported++;
            }
          } catch (withdrawalError) {
            console.error(`Error importing withdrawal request:`, withdrawalError);
          }
        }
      }
      
      // Import admin actions (if available)
      let adminActionsImported = 0;
      if (importData.data.adminActions && Array.isArray(importData.data.adminActions)) {
        for (const actionData of importData.data.adminActions) {
          try {
            if ((storage as any).db) {
              const { adminActions } = await import("@shared/schema");
              await (storage as any).db.insert(adminActions).values({
                adminId: actionData.adminId,
                action: actionData.action,
                targetId: actionData.targetId,
                details: actionData.details,
                createdAt: actionData.createdAt ? new Date(actionData.createdAt) : new Date()
              }).onConflictDoNothing();
              adminActionsImported++;
            }
          } catch (adminActionError) {
            console.error(`Error importing admin action:`, adminActionError);
          }
        }
      }
      
      console.log(`📊 Full import summary:
        - New users created: ${newUsersCount}
        - Existing users skipped: ${skippedCount}
        - Games imported: ${gamesImported}
        - Referrals imported: ${referralsImported}
        - Bets imported: ${betsImported}
        - Agent profiles imported: ${agentProfilesImported}
        - Withdrawal requests imported: ${withdrawalRequestsImported}
        - Admin actions imported: ${adminActionsImported}
        - Errors: ${errors.length}
      `);
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'data_import',
        targetId: null,
        details: { 
          newUsersCount,
          skippedCount,
          gamesImported,
          referralsImported,
          betsImported,
          agentProfilesImported,
          withdrawalRequestsImported,
          adminActionsImported,
          totalAttempted: importData.data.users.length,
          importDate: new Date().toISOString(),
          clearedDemoData: clearBeforeImport,
          errors: errors.length > 0 ? errors : undefined
        }
      });
      
      res.json({
        message: `Import completed successfully. Created ${newUsersCount} new users, skipped ${skippedCount} existing users.`,
        newUsersCount,
        skippedCount,
        gamesImported,
        referralsImported,
        betsImported,
        agentProfilesImported,
        withdrawalRequestsImported,
        adminActionsImported,
        totalAttempted: importData.data.users.length,
        clearedDemoData: clearBeforeImport,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Clear all data with security code + 2FA validation
  app.post('/api/admin/clear-all-data', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const { securityCode, twoFactorCode } = req.body;
      
      // Get admin user to check 2FA
      const adminUser = await storage.getUser(adminId);
      if (!adminUser) {
        return res.status(403).json({ message: 'Admin user not found.' });
      }
      
      // Check if 2FA is enabled for this admin
      if (adminUser.twoFactorEnabled && adminUser.twoFactorSecret) {
        // Validate 2FA code
        if (!twoFactorCode) {
          return res.status(403).json({ message: '2FA code required. Please enter your 2FA code.' });
        }
        
        const is2FAValid = await storage.validate2FAToken(adminId, twoFactorCode);
        if (!is2FAValid) {
          return res.status(403).json({ message: 'Invalid 2FA code. Access denied.' });
        }
      }
      
      // Valid security codes
      const validCodes = [
        'K8n9pQ2rS4tU6vW8xY0zA1bC3dE5fG7',
        'mL2nJ4pK6rL8tM0vN2xP4zQ6rS8tU0',
        'X9yZ2aB4cD6eF8gH0jK2lM4nO6pQ8',
        'R7sT9uV1wX3yZ5aB7cD9eF1gH3jK5',
        'P8qR0tS2uV4wX6yZ8aB0cD2eF4gH6'
      ];
      
      // Validate security code
      if (!securityCode || !validCodes.includes(securityCode)) {
        return res.status(403).json({ message: 'Invalid security code. Access denied.' });
      }
      
      // Track counts before deletion
      const usersBeforeClear = await storage.getAllUsers(1, 10000);
      const totalUsersCleared = usersBeforeClear.users.length;
      
      // Clear all demo data using the storage method
      await storage.clearDemoData();
      
      // Log admin action for audit
      await storage.logAdminAction({
        adminId,
        action: 'clear_all_data',
        targetId: null,
        details: { 
          totalUsersCleared,
          securityCodeUsed: securityCode.substring(0, 8) + '***', // Log partial code for audit
          clearedAt: new Date().toISOString()
        }
      });
      
      res.json({
        message: 'All data cleared successfully',
        totalUsersCleared,
        adminActionsPreserved: true,
        systemSettingsPreserved: true
      });
    } catch (error) {
      console.error('Clear all data error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/games/active', requireAdmin, async (req, res) => {
    try {
      const games = [];
      for (const [duration, { game }] of Array.from(activeGames.entries())) {
        const timeRemaining = Math.max(0, Math.floor((new Date(game.endTime).getTime() - Date.now()) / 1000));
        games.push({
          ...game,
          timeRemaining
        });
      }
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/live-bets', requireAdmin, async (req, res) => {
    try {
      // Disable caching for real-time data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const periods = [1, 3, 5, 10];
      const periodData = [];

      for (const duration of periods) {
        const colorTotals = {
          green: 0,
          red: 0,
          violet: 0
        };

        const activeGameData = activeGames.get(duration);
        if (activeGameData && activeGameData.game.status === 'active') {
          const bets = await storage.getBetsByGame(activeGameData.game.gameId);
          
          for (const bet of bets) {
            if (bet.betType === 'color' && bet.status === 'pending') {
              const color = bet.betValue.toLowerCase();
              if (color === 'green' || color === 'red' || color === 'violet') {
                colorTotals[color] += parseFloat(bet.amount);
              }
            }
          }
        }

        periodData.push({
          duration,
          green: colorTotals.green.toFixed(2),
          red: colorTotals.red.toFixed(2),
          violet: colorTotals.violet.toFixed(2)
        });
      }

      res.json({ periods: periodData });
    } catch (error) {
      console.error('Error fetching live bets:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Period synchronization status endpoint
  app.get('/api/admin/period-sync/status', requireAdmin, async (req, res) => {
    try {
      const syncStatus = periodSyncService.getSyncStatus();
      res.json(syncStatus);
    } catch (error) {
      console.error('Error fetching period sync status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Trigger period sync auto-fix
  app.post('/api/admin/period-sync/fix', requireAdmin, async (req, res) => {
    try {
      const result = await periodSyncService.autoFixPeriods();
      res.json(result);
    } catch (error) {
      console.error('Error fixing period sync:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Game auto-recovery status endpoint
  app.get('/api/admin/game-recovery/status', requireAdmin, async (req, res) => {
    try {
      const stats = gameAutoRecoveryService.getStats();
      const monitoringStatus = gameAutoRecoveryService.getMonitoringStatus();
      
      res.json({
        success: true,
        stats,
        monitoring: monitoringStatus
      });
    } catch (error) {
      console.error('Error fetching game recovery status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Manual recovery for specific duration
  app.post('/api/admin/game-recovery/recover/:duration', requireAdmin, async (req, res) => {
    try {
      const duration = parseInt(req.params.duration);
      
      if (![1, 3, 5, 10].includes(duration)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid duration. Must be 1, 3, 5, or 10 minutes.' 
        });
      }
      
      const result = await gameAutoRecoveryService.manualRecover(duration);
      
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'manual_game_recovery',
        targetId: `${duration}min`,
        details: { 
          duration,
          result,
          timestamp: new Date().toISOString() 
        },
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error triggering manual recovery:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Configure inactive time threshold
  app.post('/api/admin/game-recovery/configure', requireAdmin, async (req, res) => {
    try {
      const { duration, maxInactiveSeconds } = req.body;
      
      if (![1, 3, 5, 10].includes(duration)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid duration. Must be 1, 3, 5, or 10 minutes.' 
        });
      }
      
      if (!maxInactiveSeconds || maxInactiveSeconds < 10 || maxInactiveSeconds > 300) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid maxInactiveSeconds. Must be between 10 and 300 seconds.' 
        });
      }
      
      gameAutoRecoveryService.configureInactiveTime(duration, maxInactiveSeconds);
      
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'configure_game_recovery',
        targetId: `${duration}min`,
        details: { 
          duration,
          maxInactiveSeconds,
          timestamp: new Date().toISOString() 
        },
      });
      
      res.json({
        success: true,
        message: `Updated ${duration}min game max inactive time to ${maxInactiveSeconds}s`
      });
    } catch (error) {
      console.error('Error configuring game recovery:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Clear recovery history
  app.post('/api/admin/game-recovery/clear-history', requireAdmin, async (req, res) => {
    try {
      gameAutoRecoveryService.clearHistory();
      
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'clear_recovery_history',
        targetId: null,
        details: { timestamp: new Date().toISOString() },
      });
      
      res.json({
        success: true,
        message: 'Recovery history cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing recovery history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Calculation validation report endpoint
  app.get('/api/admin/validation/report', requireAdmin, async (req, res) => {
    try {
      const report = calculationValidator.getValidationReport();
      res.json(report);
    } catch (error) {
      console.error('Error fetching validation report:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Run comprehensive validation
  app.post('/api/admin/validation/run', requireAdmin, async (req, res) => {
    try {
      const report = await calculationValidator.runComprehensiveValidation();
      res.json(report);
    } catch (error) {
      console.error('Error running validation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get critical validation errors only
  app.get('/api/admin/validation/critical', requireAdmin, async (req, res) => {
    try {
      const criticalErrors = calculationValidator.getCriticalErrors();
      res.json({ errors: criticalErrors });
    } catch (error) {
      console.error('Error fetching critical validation errors:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/games/history', requireAdmin, async (req, res) => {
    try {
      const history = await storage.getGameHistory(20); // Get more for admin
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Predicted results endpoints
  app.get('/api/admin/predicted-results', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const predictions = await storage.getPredictedResults(adminId);
      res.json(predictions);
    } catch (error) {
      console.error('Error fetching predicted results:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/predicted-results', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const predictionSchema = z.object({
        periodId: z.string().min(1),
        result: z.number().min(0).max(9),
      });
      
      const { periodId, result } = predictionSchema.parse(req.body);
      
      const prediction = await storage.savePredictedResult({
        adminId,
        periodId,
        result,
      });
      
      res.json(prediction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid prediction data', errors: error.errors });
      } else {
        console.error('Error saving predicted result:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/predicted-results/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).session.userId;
      
      await storage.deletePredictedResult(id, adminId);
      
      res.json({ message: 'Prediction deleted successfully' });
    } catch (error) {
      console.error('Error deleting predicted result:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/games/:gameId/manual-result', requireAdmin, async (req, res) => {
    try {
      const { gameId } = req.params;
      const resultSchema = z.object({
        result: z.number().min(0).max(9),
        betAmount: z.number().optional()
      });
      
      const { result, betAmount } = resultSchema.parse(req.body);
      
      const adminId = (req as any).session.userId;
      
      // Find the game in active games
      let targetDuration: number | null = null;
      for (const [duration, { game }] of Array.from(activeGames.entries())) {
        if (game.id === gameId) {
          targetDuration = duration;
          break;
        }
      }
      
      if (targetDuration === null) {
        return res.status(404).json({ message: 'Active game not found' });
      }
      
      const activeGame = activeGames.get(targetDuration);
      if (!activeGame) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      // STEP 1: Set the manual result FIRST (always succeeds)
      // This is the primary action and should not be blocked by bet failures
      await storage.setManualGameResult(gameId, result, adminId);
      
      // Add scheduled result to the active game object so endGame can use it
      activeGame.scheduledResult = result;
      
      console.log(`🎯 Manual result ${result} scheduled for game ${activeGame.game.gameId}`);
      
      // STEP 2: Try to place bet if amount provided (optional, can fail independently)
      let betStatus = null;
      let betError = null;
      
      if (betAmount && betAmount > 0) {
        let oldBalance: string | null = null;
        let balanceDeducted = false;
        
        try {
          const admin = await storage.getUser(adminId);
          if (!admin) {
            throw new Error('Admin user not found');
          }

          const amount = betAmount;
          
          if (parseFloat(admin.balance) < amount) {
            throw new Error(`Insufficient balance. You have $${admin.balance}, need $${amount}`);
          }

          // Deduct balance FIRST
          oldBalance = admin.balance;
          const newBalance = (parseFloat(admin.balance) - amount).toFixed(8);
          await storage.updateUserBalance(adminId, newBalance);
          balanceDeducted = true;
          
          // Broadcast balance update
          broadcastBalanceUpdate(adminId, oldBalance, newBalance, 'bet');

          // Calculate potential payout for number bet
          const potential = calculatePayout('number', result.toString(), amount);

          // Try to create bet - if this fails, balance will be restored in catch
          await storage.createBet({
            userId: adminId,
            gameId: activeGame.game.gameId,
            betType: 'number',
            betValue: result.toString(),
            amount: amount.toFixed(8),
            potential: potential.toFixed(8)
          });
          
          betStatus = 'success';
          console.log(`💰 Admin bet placed: $${amount} on result ${result}`);
        } catch (error: any) {
          // If balance was deducted, restore it (bet failed)
          if (balanceDeducted && oldBalance !== null) {
            try {
              await storage.updateUserBalance(adminId, oldBalance);
              broadcastBalanceUpdate(adminId, (parseFloat(oldBalance) - betAmount).toFixed(8), oldBalance, 'deposit');
              console.log(`↩️  Balance restored after bet failure: ${oldBalance}`);
            } catch (restoreError) {
              console.error(`❌ CRITICAL: Failed to restore balance after bet failure:`, restoreError);
              betError = `Bet failed AND balance restoration failed. Please contact admin. Original error: ${error.message}`;
            }
          }
          
          // Bet failed, but result was already set - log and continue
          betStatus = 'failed';
          betError = betError || error.message || 'Failed to place bet';
          console.warn(`⚠️  Bet placement failed (result still scheduled): ${betError}`);
        }
      }
      
      // Return success with detailed status
      res.json({ 
        message: `Manual result ${result} scheduled for game ${activeGame.game.gameId}. Will be applied when the period ends.`,
        game: activeGame.game,
        scheduledResult: result,
        betPlaced: betStatus === 'success',
        betStatus,
        betError: betError || undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid result data', errors: error.errors });
      } else {
        console.error('Error setting manual result:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Cancel game endpoint
  app.post('/api/admin/games/:gameId/cancel', requireAdmin, async (req, res) => {
    try {
      const { gameId } = req.params;
      
      // Find the game in active games
      let targetDuration: number | null = null;
      for (const [duration, { game }] of Array.from(activeGames.entries())) {
        if (game.id === gameId) {
          targetDuration = duration;
          break;
        }
      }
      
      if (targetDuration === null) {
        return res.status(404).json({ message: 'Active game not found' });
      }
      
      const activeGame = activeGames.get(targetDuration);
      if (!activeGame) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      // Clear the timer to stop the game
      clearTimeout(activeGame.timer);
      
      // Update game status to cancelled
      await storage.updateGameStats(gameId, { status: 'cancelled' });
      
      // Get all pending bets for this game and refund them
      const pendingBets = await storage.getBetsByGame(gameId);
      for (const bet of pendingBets) {
        if (bet.status === 'pending') {
          // Refund the bet amount to user balance
          const user = await storage.getUser(bet.userId);
          if (user) {
            const newBalance = (parseFloat(user.balance) + parseFloat(bet.amount)).toFixed(8);
            await storage.updateUserBalance(bet.userId, newBalance);
          }
          // Mark bet as cancelled to reflect the refund in analytics and history
          await storage.updateBetStatus(bet.id, 'cancelled');
        }
      }
      
      // Remove from active games
      activeGames.delete(targetDuration);
      
      // Broadcast cancellation
      broadcastToClients({
        type: 'gameCancelled',
        gameId: gameId,
        duration: targetDuration
      });
      
      // Broadcast admin dashboard update for game cancellation
      broadcastAdminDashboardUpdate();
      
      // Start new game after a short delay
      setTimeout(() => startGame(targetDuration as number), 3000);
      
      res.json({ 
        message: `Game ${gameId} has been cancelled successfully`,
        gameId: gameId
      });
    } catch (error) {
      console.error('Error cancelling game:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Complete game endpoint (force complete with random result)
  app.post('/api/admin/games/:gameId/complete', requireAdmin, async (req, res) => {
    try {
      const { gameId } = req.params;
      
      // Find the game in active games
      let targetDuration: number | null = null;
      for (const [duration, { game }] of Array.from(activeGames.entries())) {
        if (game.id === gameId) {
          targetDuration = duration;
          break;
        }
      }
      
      if (targetDuration === null) {
        return res.status(404).json({ message: 'Active game not found' });
      }
      
      const activeGame = activeGames.get(targetDuration);
      if (!activeGame) {
        return res.status(404).json({ message: 'Game not found' });
      }
      
      // Clear the timer
      clearTimeout(activeGame.timer);
      
      // End the game immediately (use game's period ID, not internal ID)
      await endGame(activeGame.game.gameId, targetDuration);
      
      res.json({ 
        message: `Game ${gameId} has been completed successfully`,
        gameId: gameId
      });
    } catch (error) {
      console.error('Error completing game:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Diagnostic endpoint to check webhook configuration
  app.get('/api/payments/webhook-info', requireAdmin, async (req, res) => {
    try {
      const getIPNCallbackURL = () => {
        if (process.env.APP_URL) {
          const url = process.env.APP_URL.replace(/\/$/, '');
          return `${url}/api/payments/webhook`;
        }
        if (process.env.PRODUCTION_URL) {
          const url = process.env.PRODUCTION_URL.replace(/\/$/, '');
          return `${url}/api/payments/webhook`;
        }
        if (process.env.REPLIT_DEV_DOMAIN) {
          return `https://${process.env.REPLIT_DEV_DOMAIN}/api/payments/webhook`;
        }
        return 'http://localhost:5000/api/payments/webhook';
      };

      res.json({
        currentWebhookURL: getIPNCallbackURL(),
        environment: {
          APP_URL: process.env.APP_URL || '(not set)',
          PRODUCTION_URL: process.env.PRODUCTION_URL || '(not set)',
          REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || '(not set)',
          NODE_ENV: process.env.NODE_ENV
        },
        instructions: {
          currentlyUsing: getIPNCallbackURL(),
          message: 'Update this URL in your NOWPayments dashboard → Settings → IPN Settings → IPN Callback URL'
        }
      });
    } catch (error) {
      console.error('Webhook info error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // NOWPayments integration routes
  app.post('/api/payments/create', requireAuth, async (req, res) => {
    try {
      const paymentSchema = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && isFinite(num) && num >= 11;
        }, {
          message: "Amount must be a valid number with minimum 11 USD"
        }),
        currency: z.enum(["TRX", "USDTTRC20", "USDTMATIC"])
      });
      
      const { amount, currency } = paymentSchema.parse(req.body);
      const userId = (req as any).session.userId;
      
      // Get user for validation
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create payment with NOWPayments (amount is in USD)
      const nowPayment = await createNOWPayment(amount, currency, storage);
      
      if (!nowPayment) {
        return res.status(500).json({ message: 'Failed to create payment' });
      }

      // Validate that NOWPayments returned the correct currency
      const expectedCurrency = currency.toLowerCase();
      const receivedCurrency = nowPayment.pay_currency.toLowerCase();
      
      if (receivedCurrency !== expectedCurrency && receivedCurrency !== 'trx' && receivedCurrency !== 'usdttrc20' && receivedCurrency !== 'usdtmatic') {
        console.error(`⚠️ Currency mismatch! Requested: ${expectedCurrency}, Received: ${receivedCurrency}`);
        console.error(`   This may be due to NOWPayments account settings (Fixed outcome currency)`);
      }
      
      // Log warning if currencies don't match (TRX when USDT requested, or vice versa)
      if ((expectedCurrency === 'usdttrc20' && receivedCurrency === 'trx') || 
          (expectedCurrency === 'trx' && receivedCurrency === 'usdttrc20')) {
        console.warn(`⚠️ CURRENCY MISMATCH DETECTED:`);
        console.warn(`   User requested: ${currency}`);
        console.warn(`   NOWPayments returned: ${nowPayment.pay_currency}`);
        console.warn(`   Check NOWPayments dashboard → Settings → Outcome Currency`);
        console.warn(`   This may cause "Wrong asset deposit" errors!`);
      }

      // Generate QR code for the payment address
      const qrCodeDataUrl = await QRCode.toDataURL(nowPayment.pay_address);

      // Save transaction to database with NOWPayments response data
      const transaction = await storage.createTransaction({
        userId,
        type: "deposit",
        fiatAmount: nowPayment.price_amount.toString(),
        fiatCurrency: nowPayment.price_currency || "USD",
        cryptoAmount: nowPayment.pay_amount.toString(),
        cryptoCurrency: nowPayment.pay_currency,
        status: "pending",
        paymentMethod: "crypto",
        externalId: nowPayment.payment_id.toString(),
        paymentAddress: nowPayment.pay_address,
        fee: "0"
      });

      res.json({
        payment_id: nowPayment.payment_id,
        pay_address: nowPayment.pay_address,
        pay_amount: nowPayment.pay_amount,
        pay_currency: nowPayment.pay_currency,
        price_amount: nowPayment.price_amount,
        price_currency: nowPayment.price_currency,
        qr_code: qrCodeDataUrl,
        transaction_id: transaction.id,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
      });
    } catch (error) {
      console.error('Payment creation error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid payment data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // NOWPayments IPN webhook endpoint
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      // Generate correlation ID for this webhook request
      const correlationId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Log incoming webhook request for debugging (sanitized)
      console.log(`🔔 [Webhook:${correlationId}] Received NOWPayments IPN callback`);
      console.log(`   [${correlationId}] Method:`, req.method);
      console.log(`   [${correlationId}] Path:`, req.path);
      console.log(`   [${correlationId}] Signature present:`, req.headers['x-nowpayments-sig'] ? 'YES' : 'NO');
      
      // Only log full details in development mode
      if (process.env.NODE_ENV?.includes('development') || process.env.DEBUG_WEBHOOKS === 'true') {
        console.log(`   [${correlationId}] Debug - Payment ID from body:`, req.body?.payment_id);
        console.log(`   [${correlationId}] Debug - Payment status:`, req.body?.payment_status);
      }
      
      // Get raw body for signature verification (captured by express.json verify callback)
      const rawBody = (req as any).rawBody as Buffer;
      const signature = req.headers['x-nowpayments-sig'] as string;

      // Check for missing raw body or signature
      if (!rawBody) {
        console.log(`❌ [Webhook:${correlationId}] Missing raw body`);
        return res.status(400).json({ message: 'Missing raw body' });
      }

      if (!signature && !process.env.NODE_ENV?.includes('development')) {
        console.log(`❌ [Webhook:${correlationId}] Missing signature`);
        return res.status(400).json({ message: 'Missing signature' });
      }

      // Verify IPN signature
      const signatureValid = await verifyIPNSignature(rawBody, signature, storage);
      console.log(`🔐 [Webhook:${correlationId}] Signature verification:`, signatureValid ? '✅ VALID' : '❌ INVALID');
      
      if (!signatureValid) {
        return res.status(401).json({ message: 'Invalid signature' });
      }

      // Body is already parsed by express.json middleware

      // Validate IPN payload
      const ipnSchema = z.object({
        payment_id: z.number(),
        payment_status: z.string(),
        pay_address: z.string().optional(),
        pay_amount: z.number().optional(),
        pay_currency: z.string().optional(),
        price_amount: z.number().optional(),
        price_currency: z.string().optional(),
        outcome_amount: z.number().optional(),
        outcome_currency: z.string().optional()
      });

      const ipnData = ipnSchema.parse(req.body);

      // Find transaction by external payment ID
      console.log(`🔍 [Webhook:${correlationId}] Looking for transaction with payment_id:`, ipnData.payment_id);
      const transaction = await storage.getTransactionByExternalId(ipnData.payment_id.toString());
      
      if (!transaction) {
        console.log(`❌ [Webhook:${correlationId}] Transaction not found for payment_id:`, ipnData.payment_id);
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      console.log(`✅ [Webhook:${correlationId}] Transaction found:`, transaction.id, '| Status:', transaction.status);

      // Idempotency check - don't process if already completed
      if (transaction.status === 'completed') {
        console.log(`⚠️  [Webhook:${correlationId}] Transaction already processed, skipping`);
        return res.json({ message: 'Transaction already processed' });
      }

      // Update transaction status based on NOWPayments status
      console.log(`📝 [Webhook:${correlationId}] Payment status:`, ipnData.payment_status);
      let newStatus: "pending" | "completed" | "failed" | "cancelled" = transaction.status;
      switch (ipnData.payment_status) {
        case 'finished':
          console.log(`💰 [Webhook:${correlationId}] Payment finished, processing deposit...`);
          newStatus = 'completed';
          
          // Atomically update transaction status only if not already completed (prevents double-crediting)
          const updatedTransaction = await storage.updateTransactionStatusConditional(
            transaction.id, 
            newStatus, 
            'pending'
          );
          
          if (updatedTransaction && updatedTransaction.status === 'completed') {
            console.log(`✅ [Webhook:${correlationId}] Transaction status updated to completed`);
            
            // Check if this is an agent self-deposit (userId === agentId)
            const isAgentSelfDeposit = transaction.agentId && transaction.userId === transaction.agentId;
            
            if (isAgentSelfDeposit) {
              // Handle agent self-deposit - credit agent's wallet balance
              const agent = await storage.getUser(transaction.userId);
              if (agent) {
                // Use actual received amount (outcome_amount) if available, otherwise fall back to original amount
                let usdAmount: number;
                if (ipnData.outcome_amount && ipnData.outcome_amount > 0) {
                  // Validate currency - ensure we're receiving USD
                  const receivedCurrency = ipnData.outcome_currency || ipnData.price_currency || 'USD';
                  if (receivedCurrency.toLowerCase() !== 'usd') {
                    // Use original amount instead for non-USD currencies
                    usdAmount = parseFloat(transaction.fiatAmount || '0');
                  } else {
                    // Use the actual USD amount received from NOWPayments
                    usdAmount = ipnData.outcome_amount;
                  }
                } else if (transaction.fiatAmount) {
                  // Fallback to original requested amount if outcome_amount not available
                  usdAmount = parseFloat(transaction.fiatAmount);
                } else {
                  // Don't return error - acknowledge IPN to prevent retries
                  usdAmount = 0;
                }
                
                if (usdAmount > 0) {
                  // Update agent's wallet balance (not earnings balance)
                  const newBalance = (parseFloat(agent.balance) + usdAmount).toFixed(8);
                  const newTotalDeposits = (parseFloat(agent.totalDeposits) + usdAmount).toFixed(8);
                  
                  // Freeze the full deposit amount (users can bet with it but cannot withdraw it)
                  const newFrozenBalance = (parseFloat(agent.frozenBalance || '0') + usdAmount).toFixed(8);
                  
                  // Update agent balance, totalDeposits, and frozenBalance
                  await storage.updateUser(transaction.userId, {
                    balance: newBalance,
                    totalDeposits: newTotalDeposits,
                    frozenBalance: newFrozenBalance
                  });
                  
                  // Broadcast balance update via WebSocket
                  broadcastBalanceUpdate(transaction.userId, agent.balance, newBalance, 'deposit');
                  
                  // Send deposit confirmation email to agent
                  try {
                    await sendDepositConfirmationEmail(
                      agent.email,
                      usdAmount.toFixed(2),
                      'USD',
                      transaction.id,
                      newBalance,
                      storage
                    );
                  } catch (emailError) {
                    console.error(`Failed to send agent deposit confirmation email to ${agent.email}:`, emailError);
                  }
                }
              }
            } else {
              // Regular user deposit - credit user balance in USD based on actual received amount
              const user = await storage.getUser(transaction.userId);
              if (user) {
                // Use actual received amount (outcome_amount) if available, otherwise fall back to original amount
                let usdAmount: number;
                if (ipnData.outcome_amount && ipnData.outcome_amount > 0) {
                  // Validate currency - ensure we're receiving USD
                  const receivedCurrency = ipnData.outcome_currency || ipnData.price_currency || 'USD';
                  if (receivedCurrency.toLowerCase() !== 'usd') {
                    // Use original amount instead for non-USD currencies
                    usdAmount = parseFloat(transaction.fiatAmount || '0');
                  } else {
                    // Use the actual USD amount received from NOWPayments
                    usdAmount = ipnData.outcome_amount;
                  }
                } else if (transaction.fiatAmount) {
                  // Fallback to original requested amount if outcome_amount not available
                  usdAmount = parseFloat(transaction.fiatAmount);
                } else {
                  // Don't return error - acknowledge IPN to prevent retries
                  usdAmount = 0;
                }
                
                if (usdAmount > 0) {
                  console.log(`💵 [Webhook:${correlationId}] Crediting user balance: $${usdAmount} to user ${user.id.substring(0, 8)}...`);
                  
                  const newBalance = (parseFloat(user.balance) + usdAmount).toFixed(8);
                  const newTotalDeposits = (parseFloat(user.totalDeposits) + usdAmount).toFixed(8);
                  
                  // Freeze the full deposit amount (users can bet with it but cannot withdraw it)
                  const newFrozenBalance = (parseFloat(user.frozenBalance || '0') + usdAmount).toFixed(8);
                  
                  // Store old VIP level before update
                  const oldVipLevel = user.vipLevel;
                  
                  // Update user balance, totalDeposits, and frozenBalance
                  await storage.updateUser(transaction.userId, {
                    balance: newBalance,
                    totalDeposits: newTotalDeposits,
                    frozenBalance: newFrozenBalance
                  });
                  
                  // Update VIP level based on new deposit
                  const updatedUser = await storage.updateUserVipLevel(transaction.userId);
                  
                  // Send VIP upgrade email if level changed
                  if (updatedUser && updatedUser.vipLevel !== oldVipLevel) {
                    try {
                      const allVipLevels = await vipService.getVipLevels();
                      const newVipSetting = allVipLevels[updatedUser.vipLevel];
                      
                      const benefits = [
                        `Higher commission rates on team bets`,
                        `Max bet limit: ${newVipSetting?.maxBetLimit || 'Unlimited'}`,
                        `Daily wager reward: ${((newVipSetting?.dailyWagerReward || 0) * 100).toFixed(2)}%`,
                        `Access to exclusive features`
                      ];
                      
                      // Get Telegram link for the new VIP level
                      const vipSettingRecord = await storage.getVipSettingByLevelKey(updatedUser.vipLevel);
                      const telegramLink = vipSettingRecord?.telegramLink || undefined;
                      
                      await sendVipLevelUpgradeEmail(
                        user.email,
                        user.email.split('@')[0],
                        oldVipLevel,
                        updatedUser.vipLevel,
                        benefits,
                        storage,
                        telegramLink
                      );
                      console.log(`✅ VIP upgrade email sent to ${user.email}: ${oldVipLevel} → ${updatedUser.vipLevel}`);
                    } catch (emailError) {
                      console.error(`Failed to send VIP upgrade email to ${user.email}:`, emailError);
                    }
                  }
                  
                  // Broadcast balance update via WebSocket
                  console.log(`📡 [Webhook:${correlationId}] Broadcasting balance update to clients`);
                  broadcastBalanceUpdate(transaction.userId, user.balance, newBalance, 'deposit');
                  
                  console.log(`✅ [Webhook:${correlationId}] Deposit completed successfully | Amount: $${usdAmount} | New balance: $${newBalance}`);
                  
                  // Send deposit confirmation email
                  try {
                    await sendDepositConfirmationEmail(
                      user.email,
                      usdAmount.toFixed(2),
                      'USD',
                      transaction.id,
                      newBalance,
                      storage
                    );
                  } catch (emailError) {
                    console.error(`Failed to send deposit confirmation email to ${user.email}:`, emailError);
                  }
                  
                  // Send deposit push notification
                  try {
                    await sendTransactionPushNotification(
                      transaction.userId,
                      'deposit',
                      usdAmount.toFixed(2),
                      'USD'
                    );
                  } catch (pushError) {
                    console.error(`Failed to send deposit push notification to ${user.email}:`, pushError);
                  }
                  
                  // Update referral tracking if user has a referrer and deposit >= $10
                  if (user.referredBy && usdAmount >= 10) {
                    try {
                      // Get referral record
                      const referrals = await storage.getReferralsByUser(user.referredBy);
                      const userReferral = referrals.find(r => r.referredId === user.id);
                      
                      // If this is the first qualifying deposit (atomic check and update)
                      if (userReferral && !userReferral.hasDeposited) {
                        // Update referral to mark as deposited (atomic operation)
                        const updatedReferral = await storage.updateReferralHasDeposited(userReferral.id, true);
                        
                        // Only increment teamSize if we successfully updated hasDeposited
                        if (updatedReferral) {
                          // Get referrer and increment qualified team size (for VIP level)
                          const referrer = await storage.getUser(user.referredBy);
                          if (referrer) {
                            // Award referral bonus to REFERRER ONLY on first deposit
                            try {
                              const referralBonusSetting = await storage.getSystemSetting('referral_bonus_amount');
                              const referralReward = referralBonusSetting?.value || "2.99000000";
                              
                              // Award to referrer only (the person who referred)
                              await storage.createTransaction({
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
                              await storage.updateUser(referrer.id, {
                                totalCommission: newCommission,
                                lifetimeCommissionEarned: newLifetime
                              });
                              
                              // Update referral record's totalCommission
                              const referralCommission = (parseFloat(updatedReferral.totalCommission || '0') + parseFloat(referralReward)).toFixed(8);
                              await storage.updateReferralCommission(updatedReferral.id, referralCommission);
                              
                              console.log(`✅ Referral bonus awarded: ${referralReward} to referrer ${referrer.id} available rewards only`);
                            } catch (bonusError) {
                              console.error(`Failed to award referral bonus:`, bonusError);
                            }
                            
                            const oldTeamSize = referrer.teamSize || 0;
                            const newTeamSize = oldTeamSize + 1;
                            const oldVipLevel = referrer.vipLevel;
                            
                            await storage.updateUser(user.referredBy, {
                              teamSize: newTeamSize
                            });
                            
                            // Check if VIP level should be upgraded
                            const updatedReferrer = await storage.updateUserVipLevel(user.referredBy);
                            
                            if (updatedReferrer) {
                              // Send level up email for team growth
                              try {
                                await sendLevelUpEmail(
                                  referrer.email,
                                  referrer.email.split('@')[0],
                                  newTeamSize,
                                  `Team Member ${newTeamSize}`,
                                  'Increased commission rates',
                                  storage
                                );
                              } catch (emailError) {
                                console.error(`Failed to send level up email to ${referrer.email}:`, emailError);
                              }
                              
                              // If VIP level changed, send VIP upgrade email
                              if (updatedReferrer.vipLevel !== oldVipLevel) {
                                try {
                                  const allVipLevels = await vipService.getVipLevels();
                                  const newVipSetting = allVipLevels[updatedReferrer.vipLevel];
                                  
                                  const benefits = [
                                    `Higher commission rates on team bets`,
                                    `Max bet limit: ${newVipSetting?.maxBetLimit || 'Unlimited'}`,
                                    `Daily wager reward: ${((newVipSetting?.dailyWagerReward || 0) * 100).toFixed(2)}%`,
                                    `Access to exclusive features`
                                  ];
                                  
                                  // Get Telegram link for the new VIP level
                                  const vipSettingRecord = await storage.getVipSettingByLevelKey(updatedReferrer.vipLevel);
                                  const telegramLink = vipSettingRecord?.telegramLink || undefined;
                                  
                                  await sendVipLevelUpgradeEmail(
                                    referrer.email,
                                    referrer.email.split('@')[0],
                                    oldVipLevel,
                                    updatedReferrer.vipLevel,
                                    benefits,
                                    storage,
                                    telegramLink
                                  );
                                } catch (emailError) {
                                  console.error(`Failed to send VIP upgrade email to ${referrer.email}:`, emailError);
                                }
                              }
                            }
                          }
                        }
                      }
                    } catch (error) {
                      console.error(`IPN: Error updating referral tracking for user ${transaction.userId}:`, error);
                      // Continue even if referral tracking fails
                    }
                  }
                }
              } else {
              }
            }
            
            // Broadcast admin dashboard update for deposit completion
            broadcastAdminDashboardUpdate();
          } else {
          }
          break;
        case 'failed':
        case 'expired':
        case 'refunded':
          newStatus = 'failed';
          // Use conditional update to prevent overwriting completed transactions
          await storage.updateTransactionStatusConditional(
            transaction.id, 
            newStatus, 
            'pending'
          );
          break;
        case 'confirming':
        case 'confirmed':
        case 'sending':
          // Keep as pending for these intermediate states
          break;
      }

      res.json({ message: 'IPN processed successfully' });
    } catch (error) {
      console.error('IPN processing error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid IPN data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Get payment status endpoint
  app.get('/api/payments/:paymentId/status', requireAuth, async (req, res) => {
    try {
      const { paymentId } = req.params;
      const userId = (req as any).session.userId;
      
      // Find transaction
      const transaction = await storage.getTransactionByExternalId(paymentId);
      
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // Get status from NOWPayments
      const paymentStatus = await getNOWPaymentStatus(paymentId, storage);
      
      if (paymentStatus) {
        res.json({
          payment_id: paymentId,
          status: paymentStatus.payment_status,
          pay_address: paymentStatus.pay_address,
          pay_amount: paymentStatus.pay_amount,
          transaction_status: transaction.status
        });
      } else {
        res.json({
          payment_id: paymentId,
          transaction_status: transaction.status
        });
      }
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 2FA Routes
  app.post('/api/2fa/setup', requireAuth, async (req, res) => {
    try {
      const { userId } = setup2FASchema.parse(req.body);
      const sessionUserId = (req as any).session.userId;
      
      // Only allow users to setup 2FA for themselves (security requirement)
      if (userId !== sessionUserId) {
        return res.status(403).json({ message: 'Users can only setup 2FA for themselves' });
      }
      
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Store secret temporarily for this user
      await storage.startPending2FASetup(userId, secret);
      
      // Get target user info
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create service info
      const serviceName = 'Gaming Platform';
      const otpauthUrl = authenticator.keyuri(targetUser.email, serviceName, secret);
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      
      // Only return QR code, never expose the secret to client
      res.json({
        qrCode: qrCodeDataUrl,
        message: 'Scan the QR code with Google Authenticator and verify with a token'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        console.error('2FA setup error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/2fa/verify', requireAuth, async (req, res) => {
    try {
      const { userId, token } = validate2FASchema.parse(req.body);
      const sessionUserId = (req as any).session.userId;
      
      // Only allow users to verify 2FA for themselves
      if (userId !== sessionUserId) {
        return res.status(403).json({ message: 'Users can only verify 2FA for themselves' });
      }
      
      // Get the pending secret from server storage
      const secret = await storage.getPending2FASecret(userId);
      if (!secret) {
        return res.status(400).json({ message: 'No pending 2FA setup found. Please start setup again.' });
      }
      
      const isValid = authenticator.verify({
        token,
        secret
      });
      
      if (isValid) {
        // Complete the 2FA setup
        await storage.completePending2FASetup(userId);
        
        res.json({ success: true, message: '2FA enabled successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid token' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        console.error('2FA verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/2fa/validate', requireAuth, async (req, res) => {
    try {
      const { userId, token } = validate2FASchema.parse(req.body);
      const sessionUserId = (req as any).session.userId;
      
      // Check if user is trying to validate 2FA for themselves or if admin
      const user = await storage.getUser(sessionUserId);
      if (!user || (userId !== sessionUserId && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const isValid = await storage.validate2FAToken(userId, token);
      
      if (isValid) {
        res.json({ success: true, message: 'Authentication successful' });
      } else {
        res.status(401).json({ success: false, message: 'Invalid 2FA token' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        console.error('2FA validation error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/2fa/disable', requireAuth, async (req, res) => {
    try {
      const { userId } = setup2FASchema.parse(req.body);
      const sessionUserId = (req as any).session.userId;
      
      // Check if user is trying to disable 2FA for themselves or if admin
      const user = await storage.getUser(sessionUserId);
      if (!user || (userId !== sessionUserId && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.disable2FA(userId);
      
      res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        console.error('2FA disable error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Public System Settings Route (for non-sensitive settings)
  app.get('/api/settings/public', async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      // Only return non-sensitive settings that users need
      const publicKeys = [
        'withdrawals_enabled',
        'telegram_support_link',
        'referral_bonus_amount',
        'minimum_withdrawal_amount',
        'maximum_withdrawal_amount'
      ];
      const publicSettings = settings
        .filter(setting => publicKeys.includes(setting.key))
        .map(setting => ({
          id: setting.id,
          key: setting.key,
          value: setting.value,
          description: setting.description
        }));
      res.json(publicSettings);
    } catch (error) {
      console.error('Get public settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // System Settings Admin Routes
  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      // Hide sensitive values for security
      const safeSettings = settings.map(setting => ({
        ...setting,
        value: setting.isEncrypted || setting.key.toLowerCase().includes('key') || setting.key.toLowerCase().includes('secret') 
          ? '***HIDDEN***' 
          : setting.value
      }));
      res.json(safeSettings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      // Hide sensitive values for security
      const safeSetting = {
        ...setting,
        value: setting.isEncrypted || setting.key.toLowerCase().includes('key') || setting.key.toLowerCase().includes('secret') 
          ? '***HIDDEN***' 
          : setting.value
      };
      
      res.json(safeSetting);
    } catch (error) {
      console.error('Get setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = updateSystemSettingSchema.parse({ ...req.body, key });
      const adminId = (req as any).session.userId;
      
      const updatedSetting = await storage.upsertSystemSetting(setting, adminId);
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_system_setting',
        targetId: key,
        details: { settingKey: key, description: setting.description }
      });
      
      // Hide sensitive values for security
      const safeSetting = {
        ...updatedSetting,
        value: updatedSetting.isEncrypted || updatedSetting.key.toLowerCase().includes('key') || updatedSetting.key.toLowerCase().includes('secret') 
          ? '***HIDDEN***' 
          : updatedSetting.value
      };
      
      res.json(safeSetting);
    } catch (error) {
      console.error('Update setting error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid setting data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const adminId = (req as any).session.userId;
      
      const deleted = await storage.deleteSystemSetting(key, adminId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error('Delete setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Public System Settings Endpoint (for non-sensitive settings like Christmas mode)
  // This endpoint exposes only allowlisted system settings to the frontend without authentication.
  // IMPORTANT: When adding new public settings, ensure they contain NO sensitive information
  // (API keys, secrets, tokens, passwords, internal configurations, etc.)
  app.get('/api/system-settings/public', async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      
      // Allowlist of settings that are safe to expose publicly
      // Add new settings here deliberately after security review
      const publicSettingsAllowlist = [
        'christmas_mode_enabled',      // Controls festive snow animation
        'valentine_mode_enabled',      // Controls Valentine hearts animation
        'withdrawals_enabled',         // Public withdrawal availability status
        'country_blocking_mode',       // Country blocking mode (blacklist/whitelist)
        'passkey_enabled',             // Passkey access control for all users
        'coinflip_enabled',            // Coinflip game maintenance mode control
        'telegram_bot_username',       // Telegram bot username for Login Widget (public info, not token)
        'telegram_login_enabled',      // Control Telegram login/connect feature visibility
        'wingo_mode_enabled',          // Global control for Wingo Mode feature availability
        'app_version'                  // PWA app version display (e.g., v2.0.1)
      ];
      
      // Only return allowlisted settings
      const publicSettings = settings
        .filter(setting => publicSettingsAllowlist.includes(setting.key))
        .map(setting => ({
          key: setting.key,
          value: setting.value
        }));
      
      res.json(publicSettings);
    } catch (error) {
      console.error('Get public settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Database Management Routes - Coming Soon
  // TODO: Implement multi-database management feature
  
  // Country Blocking Management Routes
  app.get('/api/admin/country-blocking', requireAdmin, async (req, res) => {
    try {
      const [blockedSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'blocked_countries'))
        .limit(1);
      
      const [allowedSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'allowed_countries'))
        .limit(1);
      
      const [modeSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'country_blocking_mode'))
        .limit(1);

      let blockedCountries: string[] = [];
      let allowedCountries: string[] = [];
      let mode = 'blacklist';

      try {
        if (blockedSetting?.value) {
          blockedCountries = JSON.parse(blockedSetting.value);
        }
      } catch (e) {
        console.error('Error parsing blocked countries:', e);
      }

      try {
        if (allowedSetting?.value) {
          allowedCountries = JSON.parse(allowedSetting.value);
        }
      } catch (e) {
        console.error('Error parsing allowed countries:', e);
      }

      if (modeSetting?.value) {
        mode = modeSetting.value;
      }

      res.json({
        blockedCountries,
        allowedCountries,
        mode
      });
    } catch (error) {
      console.error('Get country blocking settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/country-blocking', requireAdmin, async (req, res) => {
    try {
      const { blockedCountries, allowedCountries, mode } = req.body;
      const adminId = (req as any).session.userId;

      // Validate input
      if (!Array.isArray(blockedCountries) || !Array.isArray(allowedCountries)) {
        return res.status(400).json({ message: 'Invalid country lists format' });
      }

      if (mode !== 'blacklist' && mode !== 'whitelist') {
        return res.status(400).json({ message: 'Invalid blocking mode. Must be "blacklist" or "whitelist"' });
      }

      // Validate country codes (should be 2-letter ISO codes)
      const countryCodePattern = /^[A-Z]{2}$/;
      const invalidBlocked = blockedCountries.filter(code => !countryCodePattern.test(code));
      const invalidAllowed = allowedCountries.filter(code => !countryCodePattern.test(code));

      if (invalidBlocked.length > 0 || invalidAllowed.length > 0) {
        return res.status(400).json({ 
          message: 'Invalid country codes. Must be 2-letter uppercase ISO codes (e.g., US, GB, LK)',
          invalidBlocked,
          invalidAllowed
        });
      }

      // Update settings in database
      await storage.upsertSystemSetting({
        key: 'blocked_countries',
        value: JSON.stringify(blockedCountries),
        description: 'JSON array of country codes to block (e.g., ["CN", "RU", "KP"]). Leave empty [] to block none.'
      }, adminId);

      await storage.upsertSystemSetting({
        key: 'allowed_countries',
        value: JSON.stringify(allowedCountries),
        description: 'JSON array of allowed country codes for whitelist mode (e.g., ["US", "GB", "LK"]). Leave empty [] to allow all.'
      }, adminId);

      await storage.upsertSystemSetting({
        key: 'country_blocking_mode',
        value: mode,
        description: 'Country blocking mode: "blacklist" (block specific countries) or "whitelist" (only allow specific countries)'
      }, adminId);

      // Force reload the country blocking service
      const { countryBlockingService } = await import('./country-blocking-service');
      await countryBlockingService.loadSettings();

      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_country_blocking',
        targetId: null,
        details: { 
          mode,
          blockedCountries,
          allowedCountries,
          totalBlocked: blockedCountries.length,
          totalAllowed: allowedCountries.length
        }
      });

      res.json({
        success: true,
        message: 'Country blocking settings updated successfully',
        blockedCountries,
        allowedCountries,
        mode
      });
    } catch (error) {
      console.error('Update country blocking settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Passkey Access Control Routes
  app.get('/api/admin/passkey-settings', requireAdmin, async (req, res) => {
    try {
      const [passkeyEnabledSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'passkey_enabled'))
        .limit(1);

      const passkeyEnabled = passkeyEnabledSetting?.value === 'true';

      res.json({ passkeyEnabled });
    } catch (error) {
      console.error('Get passkey settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/passkey-settings', requireAdmin, async (req, res) => {
    try {
      const { passkeyEnabled } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof passkeyEnabled !== 'boolean') {
        return res.status(400).json({ message: 'passkeyEnabled must be a boolean' });
      }

      await storage.upsertSystemSetting({
        key: 'passkey_enabled',
        value: passkeyEnabled.toString(),
        description: 'Passkey access control - when disabled, hides login, game, and withdrawal pages for all users'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_passkey_settings',
        targetId: null,
        details: { passkeyEnabled }
      });

      res.json({
        success: true,
        message: `Passkey access ${passkeyEnabled ? 'enabled' : 'disabled'} successfully`,
        passkeyEnabled
      });
    } catch (error) {
      console.error('Update passkey settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Coinflip Maintenance Mode Routes
  app.get('/api/admin/coinflip-settings', requireAdmin, async (req, res) => {
    try {
      const [coinflipEnabledSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'coinflip_enabled'))
        .limit(1);

      const coinflipEnabled = coinflipEnabledSetting?.value !== 'false';

      res.json({ coinflipEnabled });
    } catch (error) {
      console.error('Get coinflip settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/coinflip-settings', requireAdmin, async (req, res) => {
    try {
      const { coinflipEnabled } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof coinflipEnabled !== 'boolean') {
        return res.status(400).json({ message: 'coinflipEnabled must be a boolean' });
      }

      await storage.upsertSystemSetting({
        key: 'coinflip_enabled',
        value: coinflipEnabled.toString(),
        description: 'Coinflip game maintenance mode - when disabled, shows maintenance message to users'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_coinflip_settings',
        targetId: null,
        details: { coinflipEnabled }
      });

      res.json({
        success: true,
        message: `Coinflip game ${coinflipEnabled ? 'enabled' : 'disabled (maintenance mode)'} successfully`,
        coinflipEnabled
      });
    } catch (error) {
      console.error('Update coinflip settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Win Go Maintenance Mode Routes
  app.get('/api/admin/wingo-settings', requireAdmin, async (req, res) => {
    try {
      const [wingoEnabledSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'wingo_enabled'))
        .limit(1);

      const wingoEnabled = wingoEnabledSetting?.value !== 'false';

      res.json({ wingoEnabled });
    } catch (error) {
      console.error('Get Win Go settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/wingo-settings', requireAdmin, async (req, res) => {
    try {
      const { wingoEnabled } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof wingoEnabled !== 'boolean') {
        return res.status(400).json({ message: 'wingoEnabled must be a boolean' });
      }

      await storage.upsertSystemSetting({
        key: 'wingo_enabled',
        value: wingoEnabled.toString(),
        description: 'Win Go game maintenance mode - when disabled, shows maintenance message to users'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_wingo_settings',
        targetId: null,
        details: { wingoEnabled }
      });

      res.json({
        success: true,
        message: `Win Go game ${wingoEnabled ? 'enabled' : 'disabled (maintenance mode)'} successfully`,
        wingoEnabled
      });
    } catch (error) {
      console.error('Update Win Go settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Crash Game Maintenance Mode Routes
  app.get('/api/admin/crash-settings', requireAdmin, async (req, res) => {
    try {
      const [crashEnabledSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'crash_enabled'))
        .limit(1);

      const crashEnabled = crashEnabledSetting?.value !== 'false';

      res.json({ crashEnabled });
    } catch (error) {
      console.error('Get Crash settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/crash-settings', requireAdmin, async (req, res) => {
    try {
      const { crashEnabled } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof crashEnabled !== 'boolean') {
        return res.status(400).json({ message: 'crashEnabled must be a boolean' });
      }

      await storage.upsertSystemSetting({
        key: 'crash_enabled',
        value: crashEnabled.toString(),
        description: 'Crash game maintenance mode - when disabled, shows maintenance message to users'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_crash_settings',
        targetId: null,
        details: { crashEnabled }
      });

      res.json({
        success: true,
        message: `Crash game ${crashEnabled ? 'enabled' : 'disabled (maintenance mode)'} successfully`,
        crashEnabled
      });
    } catch (error) {
      console.error('Update Crash settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Color Betting Maintenance Mode Routes
  app.get('/api/admin/color-betting-settings', requireAdmin, async (req, res) => {
    try {
      const [colorBettingEnabledSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'color_betting_enabled'))
        .limit(1);

      const colorBettingEnabled = colorBettingEnabledSetting?.value !== 'false';

      res.json({ colorBettingEnabled });
    } catch (error) {
      console.error('Get Color Betting settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/color-betting-settings', requireAdmin, async (req, res) => {
    try {
      const { colorBettingEnabled } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof colorBettingEnabled !== 'boolean') {
        return res.status(400).json({ message: 'colorBettingEnabled must be a boolean' });
      }

      await storage.upsertSystemSetting({
        key: 'color_betting_enabled',
        value: colorBettingEnabled.toString(),
        description: 'Color Betting game maintenance mode - when disabled, shows maintenance message to users'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_color_betting_settings',
        targetId: null,
        details: { colorBettingEnabled }
      });

      res.json({
        success: true,
        message: `Color Betting game ${colorBettingEnabled ? 'enabled' : 'disabled (maintenance mode)'} successfully`,
        colorBettingEnabled
      });
    } catch (error) {
      console.error('Update Color Betting settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Payment Methods Visibility Settings Routes
  app.get('/api/admin/payment-methods-settings', requireAdmin, async (req, res) => {
    try {
      const trxSetting = await storage.getSystemSetting('payment_method_trx_enabled');
      const usdtTrc20Setting = await storage.getSystemSetting('payment_method_usdttrc20_enabled');
      const usdtMaticSetting = await storage.getSystemSetting('payment_method_usdtmatic_enabled');

      res.json({
        trx: !trxSetting || trxSetting.value === 'true',
        usdttrc20: !usdtTrc20Setting || usdtTrc20Setting.value === 'true',
        usdtmatic: !usdtMaticSetting || usdtMaticSetting.value === 'true'
      });
    } catch (error) {
      console.error('Get payment methods settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/payment-methods-settings', requireAdmin, async (req, res) => {
    try {
      const { trx, usdttrc20, usdtmatic } = req.body;
      const adminId = (req as any).session.userId;

      // Coerce to boolean to handle both boolean and string inputs
      const trxEnabled = Boolean(trx === true || trx === 'true');
      const usdttrc20Enabled = Boolean(usdttrc20 === true || usdttrc20 === 'true');
      const usdtmaticEnabled = Boolean(usdtmatic === true || usdtmatic === 'true');

      await storage.upsertSystemSetting({
        key: 'payment_method_trx_enabled',
        value: trxEnabled.toString(),
        description: 'TRX payment method visibility - when disabled, TRX is hidden from user deposit page'
      }, adminId);

      await storage.upsertSystemSetting({
        key: 'payment_method_usdttrc20_enabled',
        value: usdttrc20Enabled.toString(),
        description: 'USDT TRC20 payment method visibility - when disabled, USDT TRC20 is hidden from user deposit page'
      }, adminId);

      await storage.upsertSystemSetting({
        key: 'payment_method_usdtmatic_enabled',
        value: usdtmaticEnabled.toString(),
        description: 'USDT Polygon payment method visibility - when disabled, USDT Polygon is hidden from user deposit page'
      }, adminId);

      await storage.logAdminAction({
        adminId,
        action: 'update_payment_methods_settings',
        targetId: null,
        details: { 
          trx: trxEnabled, 
          usdttrc20: usdttrc20Enabled, 
          usdtmatic: usdtmaticEnabled 
        }
      });

      res.json({
        success: true,
        message: 'Payment methods visibility settings updated successfully',
        trx: trxEnabled,
        usdttrc20: usdttrc20Enabled,
        usdtmatic: usdtmaticEnabled
      });
    } catch (error) {
      console.error('Update payment methods settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Public endpoint for users to check enabled payment methods
  app.get('/api/payment-methods-settings', async (req, res) => {
    try {
      const trxSetting = await storage.getSystemSetting('payment_method_trx_enabled');
      const usdtTrc20Setting = await storage.getSystemSetting('payment_method_usdttrc20_enabled');
      const usdtMaticSetting = await storage.getSystemSetting('payment_method_usdtmatic_enabled');

      res.json({
        trx: !trxSetting || trxSetting.value === 'true',
        usdttrc20: !usdtTrc20Setting || usdtTrc20Setting.value === 'true',
        usdtmatic: !usdtMaticSetting || usdtMaticSetting.value === 'true'
      });
    } catch (error) {
      console.error('Get payment methods settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Global Freeze/Unfreeze Control Routes
  app.get('/api/admin/freeze-settings', requireAdmin, async (req, res) => {
    try {
      const [activeSession] = await db.select()
        .from(globalFreezeSessions)
        .where(eq(globalFreezeSessions.status, 'active'))
        .limit(1);

      const globalUnfreezeActive = !!activeSession;

      res.json({ globalUnfreezeActive });
    } catch (error) {
      console.error('Get freeze settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/freeze-settings', requireAdmin, async (req, res) => {
    try {
      const { globalUnfreezeActive } = req.body;
      const adminId = (req as any).session.userId;

      if (typeof globalUnfreezeActive !== 'boolean') {
        return res.status(400).json({ message: 'globalUnfreezeActive must be a boolean' });
      }

      if (globalUnfreezeActive) {
        const result = await db.transaction(async (tx: any) => {
          const [existingActiveSession] = await tx.select()
            .from(globalFreezeSessions)
            .where(eq(globalFreezeSessions.status, 'active'))
            .limit(1)
            .for('update');

          if (existingActiveSession) {
            throw new Error('ALREADY_ACTIVE');
          }

          const allUsersWithFrozenBalance = await tx.select()
            .from(users)
            .where(sql`${users.frozenBalance} > 0`)
            .for('update');

          const expectedUserCount = allUsersWithFrozenBalance.length;
          
          if (expectedUserCount === 0) {
            return { 
              totalUsersAffected: 0,
              snapshotsCreated: 0,
              usersUpdated: 0,
              noUsersToUnfreeze: true,
              noSessionCreated: true
            };
          }

          const [totalAmountResult] = await tx.select({
            totalAmount: sql<string>`COALESCE(SUM(${users.frozenBalance}), '0.00000000')`
          })
          .from(users)
          .where(sql`${users.frozenBalance} > 0`);

          const totalAmountUnfrozen = totalAmountResult.totalAmount;

          const [newSession] = await tx.insert(globalFreezeSessions).values({
            status: 'active',
            initiatedBy: adminId,
            totalUsersAffected: expectedUserCount,
            totalAmountUnfrozen: totalAmountUnfrozen
          }).returning();

          const snapshotsToInsert = allUsersWithFrozenBalance.map((user: any) => ({
            sessionId: newSession.id,
            userId: user.id,
            originalFrozenBalance: user.frozenBalance
          }));

          const insertedSnapshots = await tx.insert(globalFreezeSnapshots)
            .values(snapshotsToInsert)
            .returning();

          if (insertedSnapshots.length !== expectedUserCount) {
            throw new Error(`Snapshot insertion mismatch: expected ${expectedUserCount}, inserted ${insertedSnapshots.length}`);
          }

          const userIds = allUsersWithFrozenBalance.map((u: any) => u.id);
          const updatedUsers = await tx.update(users)
            .set({ frozenBalance: '0.00000000' })
            .where(inArray(users.id, userIds))
            .returning({ id: users.id });

          if (updatedUsers.length !== expectedUserCount) {
            throw new Error(`User update mismatch: expected ${expectedUserCount}, updated ${updatedUsers.length}`);
          }

          return { 
            newSession, 
            totalUsersAffected: expectedUserCount,
            snapshotsCreated: insertedSnapshots.length,
            usersUpdated: updatedUsers.length
          };
        }).catch((error: Error) => {
          if (error.message === 'ALREADY_ACTIVE') {
            return { alreadyActive: true };
          }
          throw error;
        });

        if (result && 'alreadyActive' in result) {
          return res.json({
            success: true,
            message: 'Global unfreeze is already active',
            globalUnfreezeActive: true
          });
        }

        const { newSession, totalUsersAffected, snapshotsCreated, usersUpdated, noUsersToUnfreeze, noSessionCreated } = result;

        if (noUsersToUnfreeze) {
          console.log(`ℹ️ Global unfreeze: No users currently have frozen balances, no session created`);

          return res.json({
            success: true,
            message: 'Global unfreeze mode enabled. No users currently have frozen balances.',
            globalUnfreezeActive: true,
            details: {
              usersAffected: 0,
              note: 'No active session created as no users needed unfreezing'
            }
          });
        }

        const [verificationResult] = await db.select({ 
          frozenCount: sql<number>`COUNT(*) FILTER (WHERE ${users.frozenBalance} > 0)`,
          totalFrozenAmount: sql<string>`COALESCE(SUM(${users.frozenBalance}), 0)`
        }).from(users);

        const unfrozenUsersStillFrozen = await db.select({ 
          id: users.id,
          email: users.email,
          frozenBalance: users.frozenBalance
        })
        .from(users)
        .innerJoin(globalFreezeSnapshots, eq(globalFreezeSnapshots.userId, users.id))
        .where(sql`${globalFreezeSnapshots.sessionId} = ${newSession.id} AND ${users.frozenBalance} > 0`);

        if (unfrozenUsersStillFrozen.length > 0) {
          console.error(`❌ Post-commit validation failed: ${unfrozenUsersStillFrozen.length} users still have frozen balance after unfreeze`);
          console.error('Affected users:', unfrozenUsersStillFrozen);
          
          return res.status(500).json({
            success: false,
            message: 'Unfreeze operation completed but validation failed. Some users still have frozen balances.',
            error: 'POST_VALIDATION_FAILED',
            details: {
              usersStillFrozen: unfrozenUsersStillFrozen.length,
              totalUsersAffected
            }
          });
        }

        await storage.logAdminAction({
          adminId,
          action: 'activate_global_unfreeze',
          targetId: newSession.id,
          details: { 
            totalUsersAffected,
            totalAmountUnfrozen: newSession.totalAmountUnfrozen,
            snapshotsCreated,
            usersUpdated,
            postVerification: verificationResult
          }
        });

        console.log(`✅ Global unfreeze activated: ${totalUsersAffected} users affected, ${newSession.totalAmountUnfrozen} total unfrozen`);
        console.log(`📊 Validation: ${snapshotsCreated} snapshots created, ${usersUpdated} users updated`);
        console.log(`🔍 Post-commit check: ${verificationResult.frozenCount} users with frozen balance remaining, total frozen: ${verificationResult.totalFrozenAmount}`);

        res.json({
          success: true,
          message: `Global unfreeze activated. ${totalUsersAffected} users unfrozen.`,
          globalUnfreezeActive: true,
          details: {
            usersAffected: totalUsersAffected,
            snapshotsCreated,
            usersUpdated
          }
        });
      } else {
        const result = await db.transaction(async (tx: any) => {
          const [activeSession] = await tx.select()
            .from(globalFreezeSessions)
            .where(eq(globalFreezeSessions.status, 'active'))
            .limit(1)
            .for('update');

          if (!activeSession) {
            throw new Error('NO_ACTIVE_SESSION');
          }

          const snapshots = await tx.select()
            .from(globalFreezeSnapshots)
            .where(eq(globalFreezeSnapshots.sessionId, activeSession.id))
            .for('update');

          const expectedSnapshotCount = snapshots.length;
          const snapshotUserIds = snapshots.map((s: typeof globalFreezeSnapshots.$inferSelect) => s.userId);

          const existingUsers = await tx.select({ id: users.id })
            .from(users)
            .where(inArray(users.id, snapshotUserIds))
            .for('update');

          if (existingUsers.length !== expectedSnapshotCount) {
            throw new Error(`User validation failed: ${expectedSnapshotCount} snapshots exist but only ${existingUsers.length} users found. ${expectedSnapshotCount - existingUsers.length} users may have been deleted.`);
          }

          const restoredUserIds: string[] = [];

          for (const snapshot of snapshots) {
            const [updatedUser] = await tx.update(users)
              .set({ frozenBalance: snapshot.originalFrozenBalance })
              .where(eq(users.id, snapshot.userId))
              .returning({ id: users.id });
            
            if (!updatedUser) {
              throw new Error(`Critical: User ${snapshot.userId} disappeared during restore operation`);
            }
            
            restoredUserIds.push(updatedUser.id);
          }

          if (restoredUserIds.length !== expectedSnapshotCount) {
            throw new Error(`User restore mismatch: expected ${expectedSnapshotCount}, restored ${restoredUserIds.length}`);
          }

          await tx.update(globalFreezeSessions)
            .set({ 
              status: 'completed',
              deactivatedAt: new Date()
            })
            .where(eq(globalFreezeSessions.id, activeSession.id));

          return { 
            activeSession, 
            snapshotsCount: expectedSnapshotCount,
            usersRestored: restoredUserIds.length
          };
        }).catch((error: Error) => {
          if (error.message === 'NO_ACTIVE_SESSION') {
            return { noActiveSession: true };
          }
          throw error;
        });

        if (result && 'noActiveSession' in result) {
          return res.json({
            success: true,
            message: 'No active global unfreeze session to deactivate',
            globalUnfreezeActive: false
          });
        }

        const { activeSession, snapshotsCount, usersRestored } = result;

        const [verificationResult] = await db.select({ 
          zeroFrozenCount: sql<number>`COUNT(*) FILTER (WHERE ${users.frozenBalance} = 0)`,
          totalFrozenAmount: sql<string>`COALESCE(SUM(${users.frozenBalance}), 0)`
        }).from(users);

        const notRestoredUsers = await db.select({ 
          userId: globalFreezeSnapshots.userId,
          originalBalance: globalFreezeSnapshots.originalFrozenBalance,
          currentBalance: users.frozenBalance
        })
        .from(globalFreezeSnapshots)
        .innerJoin(users, eq(users.id, globalFreezeSnapshots.userId))
        .where(sql`${globalFreezeSnapshots.sessionId} = ${activeSession.id} AND ${users.frozenBalance} != ${globalFreezeSnapshots.originalFrozenBalance}`);

        if (notRestoredUsers.length > 0) {
          console.error(`❌ Post-commit validation failed: ${notRestoredUsers.length} users' balances were not restored correctly`);
          console.error('Affected users:', notRestoredUsers);
          
          return res.status(500).json({
            success: false,
            message: 'Refreeze operation completed but validation failed. Some users were not restored to original frozen balances.',
            error: 'POST_VALIDATION_FAILED',
            details: {
              usersNotRestored: notRestoredUsers.length,
              totalUsersExpected: snapshotsCount
            }
          });
        }

        await storage.logAdminAction({
          adminId,
          action: 'deactivate_global_unfreeze',
          targetId: activeSession.id,
          details: { 
            totalUsersRestored: snapshotsCount,
            totalAmountRestored: activeSession.totalAmountUnfrozen,
            usersRestored,
            postVerification: verificationResult
          }
        });

        console.log(`✅ Global unfreeze deactivated: ${snapshotsCount} users' frozen balances restored`);
        console.log(`📊 Validation: ${usersRestored} users restored`);
        console.log(`🔍 Post-commit check: ${verificationResult.zeroFrozenCount} users with zero frozen balance, total frozen: ${verificationResult.totalFrozenAmount}`);

        res.json({
          success: true,
          message: `Global unfreeze deactivated. ${snapshotsCount} users' frozen balances restored.`,
          globalUnfreezeActive: false,
          details: {
            usersRestored,
            snapshotsCount
          }
        });
      }
    } catch (error) {
      console.error('❌ Update freeze settings error:', error);
      res.status(500).json({ 
        message: 'Failed to update freeze settings. All changes have been rolled back.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // VIP Bet Limits Management Routes
  app.get('/api/admin/vip-bet-limits', requireAdmin, async (req, res) => {
    try {
      const vipLevels = ['lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7'];
      const vipBetLimits: Record<string, string> = {};
      
      // Get bet limits from vipSettings table (stored in USD, display as coins)
      for (const level of vipLevels) {
        const vipSetting = await storage.getVipSettingByLevelKey(level);
        
        if (vipSetting) {
          // Convert USD to gold coins for display (1 USD = 100 coins)
          const limitInUsd = parseFloat(vipSetting.maxBet);
          const limitInCoins = (limitInUsd * 100).toFixed(8);
          vipBetLimits[level] = limitInCoins;
        } else {
          // Fallback to safe defaults (in USD, so multiply by 100 for coins)
          const safeFallbacksUsd: Record<string, string> = {
            'lv1': '1',      // 100 coins
            'lv2': '5',      // 500 coins
            'vip': '10',     // 1000 coins
            'vip1': '20',    // 2000 coins
            'vip2': '50',    // 5000 coins
            'vip3': '100',   // 10000 coins
            'vip4': '200',   // 20000 coins
            'vip5': '500',   // 50000 coins
            'vip6': '1000',  // 100000 coins
            'vip7': '2000'   // 200000 coins
          };
          const usdValue = parseFloat(safeFallbacksUsd[level] || '1');
          vipBetLimits[level] = (usdValue * 100).toFixed(8);
        }
      }
      
      res.json(vipBetLimits);
    } catch (error) {
      console.error('Get VIP bet limits error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/vip-bet-limits/:vipLevel', requireAdmin, async (req, res) => {
    try {
      const { vipLevel } = req.params;
      const { limit } = req.body;
      
      // Validate VIP level
      const validLevels = ['lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7'];
      if (!validLevels.includes(vipLevel)) {
        return res.status(400).json({ message: 'Invalid VIP level' });
      }
      
      // Validate limit (received in gold coins from frontend)
      const limitInCoins = parseFloat(limit);
      if (isNaN(limitInCoins) || limitInCoins < 0 || limitInCoins > 10000000) {
        return res.status(400).json({ message: 'Limit must be a valid positive number within reasonable bounds (0-10,000,000 coins)' });
      }
      
      // Convert gold coins to USD (100 gold coins = 1 USD)
      const limitInUsd = (limitInCoins / 100).toFixed(8);
      
      console.log(`💰 VIP BET LIMIT UPDATE: ${vipLevel}`);
      console.log(`   Input: ${limitInCoins} coins → Stored as: ${limitInUsd} USD`);
      
      const adminId = (req as any).session.userId;
      
      // Update the vipSettings table directly instead of systemSettings
      const vipSettingRecord = await storage.getVipSettingByLevelKey(vipLevel);
      
      if (vipSettingRecord) {
        // Update existing vipSettings record with USD value
        await storage.updateVipSetting(vipSettingRecord.id, {
          maxBet: limitInUsd
        });
      } else {
        // If no record exists, log a warning but don't fail
        console.warn(`VIP setting not found for level: ${vipLevel}`);
        return res.status(404).json({ message: `VIP setting not found for level: ${vipLevel}` });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_vip_bet_limit',
        targetId: vipLevel,
        details: { vipLevel, newLimit: limit }
      });

      // Force refresh VIP service cache to apply new limits immediately
      await vipService.forceRefresh();

      // Broadcast VIP settings update via WebSocket
      broadcastToClients({
        type: 'vipSettingsUpdated',
        message: 'VIP bet limits have been updated'
      });
      
      res.json({ success: true, vipLevel, limit: limit.toString() });
    } catch (error) {
      console.error('Update VIP bet limit error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get VIP deposit requirements
  app.get('/api/admin/vip-deposit-requirements', requireAdmin, async (req, res) => {
    try {
      const vipLevels = ['lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7'];
      const vipDepositReqs: Record<string, string> = {};
      
      // Get deposit requirements from vipSettings table
      for (const level of vipLevels) {
        const vipSetting = await storage.getVipSettingByLevelKey(level);
        
        // Default values based on level
        const defaults: Record<string, string> = {
          'lv1': '0',
          'lv2': '100',
          'vip': '500',
          'vip1': '1000',
          'vip2': '2000',
          'vip3': '3000',
          'vip4': '4000',
          'vip5': '5000',
          'vip6': '6000',
          'vip7': '7000'
        };
        
        vipDepositReqs[level] = vipSetting?.rechargeAmount || defaults[level] || '0';
      }
      
      res.json(vipDepositReqs);
    } catch (error) {
      console.error('Get VIP deposit requirements error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update VIP deposit requirement
  app.put('/api/admin/vip-deposit-requirements/:vipLevel', requireAdmin, async (req, res) => {
    try {
      const { vipLevel } = req.params;
      const { depositRequirement } = req.body;
      
      // Validate VIP level
      const validLevels = ['lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7'];
      if (!validLevels.includes(vipLevel)) {
        return res.status(400).json({ message: 'Invalid VIP level' });
      }
      
      // Validate deposit requirement
      const depositNum = parseFloat(depositRequirement);
      if (isNaN(depositNum) || depositNum < 0 || depositNum > 100000000) {
        return res.status(400).json({ message: 'Deposit requirement must be a valid positive number within reasonable bounds (0-100,000,000 USD)' });
      }
      
      const adminId = (req as any).session.userId;
      
      // Update the vipSettings table directly instead of systemSettings
      const vipSettingRecord = await storage.getVipSettingByLevelKey(vipLevel);
      
      if (vipSettingRecord) {
        // Update existing vipSettings record
        await storage.updateVipSetting(vipSettingRecord.id, {
          rechargeAmount: depositRequirement.toString()
        });
      } else {
        // If no record exists, log a warning but don't fail
        console.warn(`VIP setting not found for level: ${vipLevel}`);
        return res.status(404).json({ message: `VIP setting not found for level: ${vipLevel}` });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_vip_deposit_requirement',
        targetId: vipLevel,
        details: { vipLevel, newDepositRequirement: depositRequirement }
      });

      // Force refresh VIP service cache to apply new requirements immediately
      await vipService.forceRefresh();

      // Broadcast VIP settings update via WebSocket
      broadcastToClients({
        type: 'vipSettingsUpdated',
        message: 'VIP deposit requirements have been updated'
      });
      
      res.json({ success: true, vipLevel, depositRequirement: depositRequirement.toString() });
    } catch (error) {
      console.error('Update VIP deposit requirement error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


  // Telegram notification test route
  app.post('/api/admin/telegram/test', requireAdmin, async (req, res) => {
    try {
      const success = await testTelegramConnection();
      
      if (success) {
        res.json({ message: 'Test notification sent successfully!' });
      } else {
        res.status(400).json({ message: 'Failed to send test notification. Please check your Telegram bot token and chat ID settings.' });
      }
    } catch (error) {
      console.error('Telegram test error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Telegram chat access verification route
  app.post('/api/admin/telegram/verify-chat', requireAdmin, async (req, res) => {
    try {
      const { chatId } = req.body;
      
      if (!chatId) {
        return res.status(400).json({ message: 'Chat ID is required' });
      }

      const result = await verifyChatAccess(chatId);
      
      if (result.success) {
        res.json({ 
          message: 'Chat access verified successfully!',
          chatInfo: result.chatInfo
        });
      } else {
        res.status(400).json({ 
          message: `Failed to verify chat access: ${result.error}`,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Telegram chat verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Telegram message with button test route
  app.post('/api/admin/telegram/test-button', requireAdmin, async (req, res) => {
    try {
      const success = await sendChannelMessageWithButtons(
        '<b>🎯 Test Message with Button</b>\n\n' +
        '✅ This is a test message from your 3XBet admin panel!\n\n' +
        '📱 Click the button below to test:',
        [
          [
            { text: '🎮 Visit 3XBet', url: 'https://yourwebsite.com' },
            { text: '💰 Deposit', url: 'https://yourwebsite.com/deposit' }
          ],
          [
            { text: '📞 Support', url: 'https://yourwebsite.com/support' }
          ]
        ]
      );
      
      if (success) {
        res.json({ 
          message: 'Test message with buttons sent successfully! Check your Telegram channel.' 
        });
      } else {
        res.status(400).json({ 
          message: 'Failed to send test message. Please check your Telegram bot token and chat ID settings.' 
        });
      }
    } catch (error) {
      console.error('Telegram button test error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // SendGrid test email route
  app.post('/api/admin/sendgrid/test', requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address format' });
      }

      // Send test email using sendPasswordResetEmail as test
      const testToken = 'TEST-TOKEN-' + Date.now();
      const success = await sendPasswordResetEmail(email, testToken, storage);
      
      if (success) {
        res.json({ 
          message: `Test email sent successfully to ${email}!`,
          note: 'This was a password reset email sent as a test. Check your inbox.'
        });
      } else {
        res.status(400).json({ 
          message: 'Failed to send test email. Please check your SendGrid API key and from email settings.' 
        });
      }
    } catch (error) {
      console.error('SendGrid test error:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SendGrid statistics route
  app.get('/api/admin/sendgrid/stats', requireAdmin, async (req, res) => {
    try {
      const emailCountSetting = await storage.getSystemSetting('sendgrid_email_count');
      const emailCount = emailCountSetting?.value ? parseInt(emailCountSetting.value) : 0;
      
      const sendGridApiKey = await storage.getSystemSetting('sendgrid_api_key');
      const sendGridFromEmail = await storage.getSystemSetting('sendgrid_from_email');
      const smtpHost = await storage.getSystemSetting('smtp_host');
      
      res.json({
        emailCount,
        configured: !!(sendGridApiKey?.value || smtpHost?.value),
        sendGridConfigured: !!sendGridApiKey?.value,
        smtpConfigured: !!smtpHost?.value,
        fromEmail: sendGridFromEmail?.value || 'Not configured',
        lastUpdated: emailCountSetting?.updatedAt || 'Never'
      });
    } catch (error) {
      console.error('SendGrid stats error:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  // Telegram send photo to signal channel route
  app.post('/api/admin/telegram/send-photo', requireAdmin, async (req, res) => {
    try {
      const { photoUrl, caption } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ message: 'Photo URL is required' });
      }
      
      const success = await sendPhotoToSignalChannel(photoUrl, caption);
      
      if (success) {
        res.json({ message: 'Photo sent to Telegram signal channel successfully!' });
      } else {
        res.status(400).json({ message: 'Failed to send photo. Please check your Telegram settings and signal chat ID.' });
      }
    } catch (error) {
      console.error('Telegram send photo error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Telegram auto-join channels routes
  app.get('/api/admin/telegram-auto-join-channels', requireAdmin, async (req, res) => {
    try {
      const channels = await storage.getTelegramAutoJoinChannels();
      res.json(channels);
    } catch (error) {
      console.error('Get telegram auto-join channels error:', error);
      res.status(500).json({ message: 'Failed to fetch channels' });
    }
  });
  
  app.post('/api/admin/telegram-auto-join-channels', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const channelData = insertTelegramAutoJoinChannelSchema.parse({
        ...req.body,
        createdBy: adminId
      });
      
      const channel = await storage.createTelegramAutoJoinChannel(channelData);
      res.json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid channel data', 
          errors: error.errors 
        });
      }
      console.error('Create telegram auto-join channel error:', error);
      res.status(500).json({ message: 'Failed to create channel' });
    }
  });
  
  app.put('/api/admin/telegram-auto-join-channels/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateTelegramAutoJoinChannelSchema.parse(req.body);
      
      const channel = await storage.updateTelegramAutoJoinChannel(id, updates);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      res.json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid channel data', 
          errors: error.errors 
        });
      }
      console.error('Update telegram auto-join channel error:', error);
      res.status(500).json({ message: 'Failed to update channel' });
    }
  });
  
  app.delete('/api/admin/telegram-auto-join-channels/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTelegramAutoJoinChannel(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Delete telegram auto-join channel error:', error);
      res.status(500).json({ message: 'Failed to delete channel' });
    }
  });

  // Telegram Scheduled Posts routes
  app.get('/api/admin/telegram/scheduled-posts', requireAdmin, async (req, res) => {
    try {
      const posts = await storage.getTelegramScheduledPosts();
      res.json(posts);
    } catch (error) {
      console.error('Get telegram scheduled posts error:', error);
      res.status(500).json({ message: 'Failed to fetch scheduled posts' });
    }
  });

  app.post('/api/admin/telegram/scheduled-posts', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      const { createTelegramScheduledPostSchema } = await import('@shared/schema');
      
      const postData = createTelegramScheduledPostSchema.parse(req.body);
      
      const post = await storage.createTelegramScheduledPost({
        ...postData,
        createdBy: adminId
      });
      
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid post data', 
          errors: error.errors 
        });
      }
      console.error('Create telegram scheduled post error:', error);
      res.status(500).json({ message: 'Failed to create scheduled post' });
    }
  });

  app.get('/api/admin/telegram/scheduled-posts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getTelegramScheduledPostById(id);
      
      if (!post) {
        return res.status(404).json({ message: 'Scheduled post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Get telegram scheduled post error:', error);
      res.status(500).json({ message: 'Failed to fetch scheduled post' });
    }
  });

  app.patch('/api/admin/telegram/scheduled-posts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateTelegramScheduledPostSchema } = await import('@shared/schema');
      
      const updates = updateTelegramScheduledPostSchema.omit({ id: true }).parse(req.body);
      
      const post = await storage.updateTelegramScheduledPost(id, updates);
      if (!post) {
        return res.status(404).json({ message: 'Scheduled post not found' });
      }
      
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid update data', 
          errors: error.errors 
        });
      }
      console.error('Update telegram scheduled post error:', error);
      res.status(500).json({ message: 'Failed to update scheduled post' });
    }
  });

  app.delete('/api/admin/telegram/scheduled-posts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTelegramScheduledPost(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Scheduled post not found' });
      }
      
      res.json({ message: 'Scheduled post deleted successfully' });
    } catch (error) {
      console.error('Delete telegram scheduled post error:', error);
      res.status(500).json({ message: 'Failed to delete scheduled post' });
    }
  });

  app.post('/api/admin/telegram/scheduled-posts/:id/send-now', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getTelegramScheduledPostById(id);
      
      if (!post) {
        return res.status(404).json({ message: 'Scheduled post not found' });
      }
      
      // Send the post now using existing Telegram functions
      const { sendPhotoToChannel, sendMessageToChannel } = await import('./telegram');
      
      let success = false;
      if (post.photoPath || post.photoUrl) {
        const photoSource = post.photoPath || post.photoUrl;
        success = await sendPhotoToChannel(post.channelId, photoSource!, post.messageText, post.buttons);
      } else {
        success = await sendMessageToChannel(post.channelId, post.messageText, post.buttons);
      }
      
      if (success) {
        await storage.updateScheduledPostSentStatus(id, new Date(), post.repeatDaily);
        res.json({ message: 'Post sent successfully', success: true });
      } else {
        res.status(400).json({ message: 'Failed to send post to Telegram channel', success: false });
      }
    } catch (error) {
      console.error('Send telegram scheduled post error:', error);
      res.status(500).json({ message: 'Failed to send scheduled post' });
    }
  });

  // Test endpoint to simulate crypto deposit status update
  app.post('/api/admin/test-deposit-update', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      
      // Create a test user or use existing admin
      const testUser = await storage.getUser(adminId);
      if (!testUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const initialBalance = testUser.balance;
      
      // Step 1: Create a pending deposit transaction (simulating crypto payment creation)
      const testAmount = 50.00; // $50 test deposit
      const testTransaction = await storage.createTransaction({
        userId: testUser.id,
        type: 'deposit',
        fiatAmount: testAmount.toString(),
        fiatCurrency: 'USD',
        cryptoAmount: '0.001', // Simulated crypto amount
        cryptoCurrency: 'USDT',
        status: 'pending',
        paymentMethod: 'crypto',
        externalId: `test-${Date.now()}`, // Unique test payment ID
        paymentAddress: 'TTestAddress123456789',
        fee: '0'
      });
      
      console.log(`🧪 Test deposit created - Transaction ID: ${testTransaction.id}, Status: ${testTransaction.status}`);
      
      // Step 2: Simulate webhook completion (what happens when payment is confirmed)
      const updatedTransaction = await storage.updateTransactionStatusConditional(
        testTransaction.id,
        'completed',
        'pending'
      );
      
      if (updatedTransaction && updatedTransaction.status === 'completed') {
        // Step 3: Credit user balance (simulating webhook handler logic)
        const newBalance = (parseFloat(initialBalance) + testAmount).toFixed(8);
        const newTotalDeposits = (parseFloat(testUser.totalDeposits) + testAmount).toFixed(8);
        
        await storage.updateUser(testUser.id, {
          balance: newBalance,
          totalDeposits: newTotalDeposits
        });
        
        console.log(`✅ Test deposit completed - Status: ${updatedTransaction.status}, Balance updated: ${initialBalance} → ${newBalance}`);
        
        // Broadcast balance update
        broadcastBalanceUpdate(testUser.id, initialBalance, newBalance, 'deposit');
        
        res.json({
          success: true,
          message: 'Crypto deposit status update test completed successfully!',
          test_results: {
            transaction_id: testTransaction.id,
            initial_status: 'pending',
            final_status: updatedTransaction.status,
            amount: testAmount,
            balance_before: initialBalance,
            balance_after: newBalance,
            status_updated: true
          }
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to update transaction status',
          transaction_id: testTransaction.id 
        });
      }
    } catch (error) {
      console.error('Test deposit update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // APK rebuild route
  app.post('/api/admin/rebuild-apk', requireAdmin, async (req, res) => {
    try {
      const { serverUrl } = req.body;
      const adminId = (req as any).session.userId;
      
      if (!serverUrl) {
        return res.status(400).json({ message: 'Server URL is required' });
      }
      
      // Update server URL setting
      await storage.upsertSystemSetting({
        key: 'backend_server_url',
        value: serverUrl,
        description: 'Backend server URL for mobile APK configuration'
      }, adminId);
      
      // Import rebuild script dynamically
      const { rebuildAPK } = await import('../scripts/rebuild-apk.js');
      
      // Start rebuild in background
      res.json({ message: 'APK rebuild started. This may take 2-3 minutes. Check the server logs for progress.' });
      
      // Run rebuild asynchronously
      rebuildAPK({ serverUrl }).then(result => {
        console.log('APK rebuild completed:', result.message);
        
        // Log admin action
        storage.logAdminAction({
          adminId,
          action: 'rebuild_apk',
          targetId: serverUrl,
          details: { serverUrl, success: result.success }
        });
      }).catch(error => {
        console.error('APK rebuild error:', error);
      });
      
    } catch (error) {
      console.error('APK rebuild request error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Public VIP Levels endpoint (for frontend)
  app.get('/api/vip/levels', async (req, res) => {
    try {
      const vipLevels = await vipService.getVipLevels();
      res.json(vipLevels);
    } catch (error) {
      console.error('Get VIP levels error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // VIP Settings Admin Routes
  app.get('/api/admin/vip-settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllVipSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get VIP settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/vip-settings/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.getVipSettingById(id);
      
      if (!setting) {
        return res.status(404).json({ message: 'VIP setting not found' });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Get VIP setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/vip-settings', requireAdmin, async (req, res) => {
    try {
      const settingData = req.body;
      const adminId = (req as any).session.userId;
      
      const newSetting = await storage.createVipSetting(settingData);
      
      // Refresh VIP service cache
      await vipService.forceRefresh();
      
      // Broadcast VIP settings update to all clients
      broadcastToClients({
        type: 'vipSettingsUpdated',
        timestamp: Date.now()
      });
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'create_vip_setting',
        targetId: newSetting.id,
        details: { levelName: newSetting.levelName, levelOrder: newSetting.levelOrder }
      });
      
      res.json(newSetting);
    } catch (error) {
      console.error('Create VIP setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/vip-settings/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminId = (req as any).session.userId;
      
      const updatedSetting = await storage.updateVipSetting(id, updates);
      
      if (!updatedSetting) {
        return res.status(404).json({ message: 'VIP setting not found' });
      }
      
      // Refresh VIP service cache
      await vipService.forceRefresh();
      
      // Broadcast VIP settings update to all clients
      broadcastToClients({
        type: 'vipSettingsUpdated',
        timestamp: Date.now()
      });
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_vip_setting',
        targetId: id,
        details: { levelName: updatedSetting.levelName, updates }
      });
      
      res.json(updatedSetting);
    } catch (error) {
      console.error('Update VIP setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/vip-settings/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).session.userId;
      
      const deleted = await storage.deleteVipSetting(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'VIP setting not found' });
      }
      
      // Refresh VIP service cache
      await vipService.forceRefresh();
      
      // Broadcast VIP settings update to all clients
      broadcastToClients({
        type: 'vipSettingsUpdated',
        timestamp: Date.now()
      });
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'delete_vip_setting',
        targetId: id,
        details: { deleted: true }
      });
      
      res.json({ message: 'VIP setting deleted successfully' });
    } catch (error) {
      console.error('Delete VIP setting error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin email sending route
  app.post('/api/admin/send-email', requireAdmin, async (req, res) => {
    try {
      const emailSchema = z.object({
        recipientType: z.enum(['all', 'specific']),
        userIds: z.array(z.string()).optional(),
        subject: z.string().min(1, 'Subject is required'),
        message: z.string().min(1, 'Message is required')
      });
      
      const emailData = emailSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      let recipients: string[] = [];
      let recipientEmails: string[] = [];
      
      if (emailData.recipientType === 'all') {
        // Get all users
        const result = await storage.getAllUsers(1, 10000);
        recipients = result.users.map(u => u.id);
        recipientEmails = result.users.map(u => u.email);
      } else if (emailData.recipientType === 'specific' && emailData.userIds) {
        // Get specific users
        for (const userId of emailData.userIds) {
          const user = await storage.getUser(userId);
          if (user) {
            recipients.push(user.id);
            recipientEmails.push(user.email);
          }
        }
      }
      
      if (recipientEmails.length === 0) {
        return res.status(400).json({ message: 'No valid recipients found' });
      }
      
      // Send email
      const emailSent = await sendCustomEmail(
        recipientEmails,
        emailData.subject,
        emailData.message,
        storage
      );
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send email' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'send_email',
        targetId: emailData.recipientType === 'all' ? 'all_users' : recipients.join(','),
        details: { 
          subject: emailData.subject,
          recipientCount: recipientEmails.length,
          recipientType: emailData.recipientType
        }
      });
      
      res.json({ 
        message: `Email sent successfully to ${recipientEmails.length} recipient(s)`,
        recipientCount: recipientEmails.length
      });
    } catch (error) {
      console.error('Send email error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid email data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // User management routes for admin
  app.get('/api/admin/users/search', requireAdmin, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      // Get all users and filter by email, id, or publicId
      const result = await storage.getAllUsers(1, 1000); // Get a large set to search
      const filteredUsers = result.users.filter(user => 
        user.email.toLowerCase().includes(q.toLowerCase()) ||
        user.id.includes(q) ||
        (user.publicId && user.publicId.includes(q))
      );
      
      const safeUsers = filteredUsers.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({ users: safeUsers, total: safeUsers.length });
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/users/:userId/update-password', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const passwordSchema = z.object({
        newPassword: z.string().min(8, 'Password must be at least 8 characters')
      });
      
      const { newPassword } = passwordSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Hash the new password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update the password
      const updatedUser = await storage.updateUser(userId, { passwordHash });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'Failed to update user password' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'password_reset_by_admin',
        targetId: userId,
        details: { targetEmail: user.email }
      });
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password update error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid password data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/users/:userId/update-withdrawal-password', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const passwordSchema = z.object({
        newWithdrawalPassword: z.string().min(6, 'Withdrawal password must be at least 6 characters')
      });
      
      const { newWithdrawalPassword } = passwordSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Hash the new withdrawal password
      const bcrypt = await import('bcrypt');
      const withdrawalPasswordHash = await bcrypt.hash(newWithdrawalPassword, 10);
      
      // Update the withdrawal password
      const updatedUser = await storage.updateUser(userId, { withdrawalPasswordHash });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'Failed to update user withdrawal password' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'withdrawal_password_reset_by_admin',
        targetId: userId,
        details: { targetEmail: user.email }
      });
      
      res.json({ message: 'Withdrawal password updated successfully' });
    } catch (error) {
      console.error('Withdrawal password update error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid withdrawal password data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // =================== Admin Financial Management Routes ===================
  
  // Get all deposits for admin view
  app.get('/api/admin/deposits', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const statusFilter = req.query.status as string;
      
      // Get all transactions of type 'deposit'
      const allUsers = await storage.getAllUsers(1, 1000);
      const allDeposits = [];
      
      for (const user of allUsers.users) {
        const transactions = await storage.getTransactionsByUser(user.id);
        let deposits = transactions.filter(t => t.type === 'deposit');
        
        // Apply status filter if provided and valid (not "all")
        if (statusFilter && statusFilter !== 'all') {
          deposits = deposits.filter(d => d.status === statusFilter);
        }
        
        for (const deposit of deposits) {
          allDeposits.push({
            ...deposit,
            userEmail: user.email,
            userPublicId: user.publicId
          });
        }
      }
      
      // Sort by creation date, newest first
      allDeposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDeposits = allDeposits.slice(startIndex, endIndex);
      
      res.json({
        deposits: paginatedDeposits,
        total: allDeposits.length,
        page,
        totalPages: Math.ceil(allDeposits.length / limit)
      });
    } catch (error) {
      console.error('Get deposits error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Manually approve a pending crypto deposit
  app.post('/api/admin/crypto-deposits/:transactionId/approve', requireAdmin, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const adminId = (req as any).session.userId;
      
      // Get the transaction
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Validate it's a pending crypto deposit
      if (transaction.type !== 'deposit') {
        return res.status(400).json({ message: 'Transaction is not a deposit' });
      }
      
      if (transaction.paymentMethod !== 'crypto') {
        return res.status(400).json({ message: 'Transaction is not a crypto payment' });
      }
      
      if (transaction.status === 'completed') {
        return res.status(400).json({ message: 'Transaction is already completed' });
      }
      
      if (transaction.status !== 'pending') {
        return res.status(400).json({ message: `Transaction status is ${transaction.status}, cannot approve` });
      }
      
      if (!transaction.externalId) {
        return res.status(400).json({ message: 'Transaction has no external payment ID' });
      }
      
      console.log(`👨‍💼 [ManualApproval] Admin ${adminId} manually approving deposit ${transactionId.substring(0, 8)}...`);
      
      // Get payment status from NOWPayments to get accurate payment data
      const paymentStatus = await getNOWPaymentStatus(transaction.externalId, storage);
      
      if (!paymentStatus) {
        return res.status(400).json({ message: 'Could not fetch payment status from NOWPayments' });
      }
      
      console.log(`📊 [ManualApproval] Payment status: ${paymentStatus.payment_status}`);
      
      // Check if payment is actually finished
      if (paymentStatus.payment_status !== 'finished') {
        return res.status(400).json({ 
          message: `Payment is not finished yet. Current status: ${paymentStatus.payment_status}` 
        });
      }
      
      // Process the payment using the same logic as the automatic checker
      const success = await processCompletedPayment(
        transaction, 
        paymentStatus, 
        storage, 
        `ManualApproval:${adminId.substring(0, 8)}`
      );
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to process payment' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'manual_crypto_deposit_approval',
        targetId: transactionId,
        details: { 
          transactionId,
          userId: transaction.userId,
          amount: transaction.fiatAmount,
          externalId: transaction.externalId
        }
      });
      
      console.log(`✅ [ManualApproval] Deposit ${transactionId.substring(0, 8)} manually approved by admin`);
      
      res.json({ 
        message: 'Deposit approved successfully',
        transactionId: transaction.id
      });
    } catch (error) {
      console.error('Manual crypto deposit approval error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get payment checker status
  app.get('/api/admin/payment-checker/status', requireAdmin, async (req, res) => {
    try {
      const status = getPaymentCheckerStatus();
      res.json(status);
    } catch (error) {
      console.error('Get payment checker status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Manually trigger payment check
  app.post('/api/admin/payment-checker/trigger', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      
      // Trigger the check
      await triggerPaymentCheck(storage);
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'manual_payment_check_trigger',
        targetId: null,
        details: { triggeredAt: new Date().toISOString() }
      });
      
      // Get updated status
      const status = getPaymentCheckerStatus();
      
      console.log(`✅ [PaymentChecker] Manual check triggered by admin ${adminId.substring(0, 8)}`);
      
      res.json({ 
        message: 'Payment check triggered successfully',
        status
      });
    } catch (error) {
      console.error('Manual payment check trigger error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all withdrawal requests for admin view
  app.get('/api/admin/withdrawals', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const statusFilter = req.query.status as string;
      
      // Only pass status filter to storage if it's not "all"
      const validStatus = statusFilter && statusFilter !== 'all' ? statusFilter : undefined;
      
      // Get withdrawal requests from the dedicated table with IP duplicate info
      const { requests, total } = await storage.getAllWithdrawalRequests(page, limit, validStatus);
      
      // Enrich with user data
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          if (!user) return null;
          
          // Get duplicate user info if there are duplicates
          let duplicateUsers: any[] = [];
          if (request.duplicateIpCount > 0 && request.duplicateIpUserIds) {
            duplicateUsers = await Promise.all(
              request.duplicateIpUserIds.map(async (userId) => {
                const dupUser = await storage.getUser(userId);
                return dupUser ? {
                  id: dupUser.id,
                  publicId: dupUser.publicId,
                  email: dupUser.email,
                  registrationIp: dupUser.registrationIp
                } : null;
              })
            );
            duplicateUsers = duplicateUsers.filter(u => u !== null);
          }
          
          // Calculate bet percentage
          const totalDeposits = parseFloat(user.totalDeposits);
          const totalBets = parseFloat(user.totalBetsAmount);
          const betPercentage = totalDeposits > 0 ? (totalBets / totalDeposits) * 100 : 0;
          
          // Get count of completed withdrawals for this user
          const completedWithdrawals = await storage.getCompletedWithdrawalCount(user.id);
          
          return {
            ...request,
            userEmail: user.email,
            userPublicId: user.publicId,
            userRegistrationIp: user.registrationIp,
            userTotalDeposits: user.totalDeposits,
            userTotalBets: user.totalBetsAmount,
            userBetPercentage: betPercentage,
            userLiveBalance: user.balance,
            userTotalReferralEarnings: user.lifetimeCommissionEarned,
            userWithdrawalCount: completedWithdrawals,
            duplicateUsers
          };
        })
      );
      
      // Filter out any null entries
      const validRequests = enrichedRequests.filter(r => r !== null);
      
      res.json({
        withdrawals: validRequests,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Get withdrawals error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Process withdrawal request (approve/reject)
  app.post('/api/admin/withdrawals/:transactionId/process', requireAdmin, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const processSchema = z.object({
        action: z.enum(['approve', 'reject']),
        adminNote: z.string().optional()
      });
      
      const { action, adminNote } = processSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      // Find the withdrawal request from the withdrawalRequests table
      const withdrawalRequest = await storage.getWithdrawalRequestById(transactionId);
      
      if (!withdrawalRequest) {
        return res.status(404).json({ message: 'Withdrawal request not found' });
      }
      
      if (withdrawalRequest.status !== 'pending') {
        return res.status(400).json({ message: 'Withdrawal request has already been processed' });
      }
      
      const user = await storage.getUser(withdrawalRequest.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update withdrawal request status
      const updatedRequest = await storage.updateWithdrawalRequestStatus(
        withdrawalRequest.id,
        newStatus,
        adminId,
        adminNote
      );
      
      if (!updatedRequest) {
        return res.status(400).json({ message: 'Request could not be updated - may have already been processed' });
      }
      
      // Find and update the corresponding transaction
      // Match by userId, type='withdrawal', and amount
      const userTransactions = await storage.getTransactionsByUser(withdrawalRequest.userId);
      const matchingTransaction = userTransactions.find(t => 
        t.type === 'withdrawal' &&
        t.status === 'pending' &&
        parseFloat(t.fiatAmount || '0') === parseFloat(withdrawalRequest.amount)
      );
      
      if (matchingTransaction) {
        // Update transaction status: approve → completed, reject → cancelled
        const transactionStatus = action === 'approve' ? 'completed' : 'cancelled';
        await storage.updateTransactionStatus(matchingTransaction.id, transactionStatus);
        console.log(`📝 Updated transaction ${matchingTransaction.id} status to ${transactionStatus}`);
      } else {
        console.log(`⚠️ No matching pending transaction found for withdrawal request ${withdrawalRequest.id}`);
      }
      
      if (action === 'approve') {
        const withdrawalAmount = parseFloat(withdrawalRequest.amount);
        const balanceFrozen = withdrawalRequest.balanceFrozen || false;
        
        // Check if balance was already frozen
        if (!balanceFrozen) {
          // Legacy request: balance was NOT frozen, need to deduct now
          if (user.role === 'agent') {
            const agentProfile = await storage.getAgentProfile(user.id);
            if (!agentProfile || !agentProfile.isActive) {
              await storage.updateWithdrawalRequestStatus(withdrawalRequest.id, 'pending');
              return res.status(400).json({ message: 'Agent profile not found or inactive' });
            }
            const currentBalance = parseFloat(agentProfile.earningsBalance);
            
            if (currentBalance < withdrawalAmount) {
              await storage.updateWithdrawalRequestStatus(withdrawalRequest.id, 'pending');
              return res.status(400).json({ message: 'Insufficient agent earnings balance for withdrawal' });
            }
            
            const newEarningsBalance = (currentBalance - withdrawalAmount).toFixed(8);
            await storage.updateAgentBalance(user.id, newEarningsBalance);
            console.log(`💰 Deducting ${withdrawalAmount} USD from agent earnings balance (legacy request)`);
          } else {
            const currentBalance = parseFloat(user.balance);
            
            if (currentBalance < withdrawalAmount) {
              await storage.updateWithdrawalRequestStatus(withdrawalRequest.id, 'pending');
              return res.status(400).json({ message: 'Insufficient user balance for withdrawal' });
            }
            
            const newBalance = (currentBalance - withdrawalAmount).toFixed(8);
            await storage.updateUserBalance(user.id, newBalance);
            console.log(`💰 Deducting ${withdrawalAmount} USD from user balance (legacy request)`);
          }
        } else {
          // New request: balance was already frozen, no need to deduct again
          console.log(`💰 Balance already frozen for withdrawal (${withdrawalAmount} USD)`);
        }
        
        // Update user's total withdrawals for both agents and regular users
        const newTotalWithdrawals = (parseFloat(user.totalWithdrawals) + withdrawalAmount).toFixed(8);
        await storage.updateUser(user.id, { totalWithdrawals: newTotalWithdrawals });
        
        // Log approval
        await storage.logAdminAction({
          adminId,
          action: 'approve_withdrawal',
          targetId: user.id,
          details: { 
            withdrawalRequestId: withdrawalRequest.id,
            amount: withdrawalRequest.amount,
            currency: withdrawalRequest.currency,
            walletAddress: withdrawalRequest.walletAddress,
            balanceFrozen,
            adminNote 
          }
        });
        
        console.log(`✅ Withdrawal ${withdrawalRequest.id} approved for user ${user.email} - Amount: ${withdrawalRequest.amount} ${withdrawalRequest.currency}`);
        
        // Send withdrawal approval push notification
        try {
          await sendTransactionPushNotification(
            user.id,
            'withdrawal',
            withdrawalRequest.amount,
            withdrawalRequest.currency
          );
        } catch (pushError) {
          console.error(`Failed to send withdrawal push notification to ${user.email}:`, pushError);
        }
      } else {
        // Rejection: refund the frozen amount back to user's balance (only if it was frozen)
        const withdrawalAmount = parseFloat(withdrawalRequest.amount);
        const balanceFrozen = withdrawalRequest.balanceFrozen || false;
        
        if (balanceFrozen) {
          // Only refund if balance was actually frozen
          if (user.role === 'agent') {
            const agentProfile = await storage.getAgentProfile(user.id);
            if (agentProfile) {
              const currentBalance = parseFloat(agentProfile.earningsBalance);
              const refundedBalance = (currentBalance + withdrawalAmount).toFixed(8);
              await storage.updateAgentBalance(user.id, refundedBalance);
              console.log(`💰 Refunded ${withdrawalAmount} USD to agent earnings balance (withdrawal rejected)`);
            }
          } else {
            const currentBalance = parseFloat(user.balance);
            const refundedBalance = (currentBalance + withdrawalAmount).toFixed(8);
            await storage.updateUserBalance(user.id, refundedBalance);
            console.log(`💰 Refunded ${withdrawalAmount} USD to user balance (withdrawal rejected)`);
          }
        } else {
          // Legacy request: balance was never frozen, no refund needed
          console.log(`💰 No refund needed for legacy request (balance was never frozen)`);
        }
        
        // Log rejection
        await storage.logAdminAction({
          adminId,
          action: 'reject_withdrawal',
          targetId: user.id,
          details: { 
            withdrawalRequestId: withdrawalRequest.id,
            amount: withdrawalRequest.amount,
            currency: withdrawalRequest.currency,
            balanceFrozen,
            adminNote 
          }
        });
        
        console.log(`❌ Withdrawal ${withdrawalRequest.id} rejected for user ${user.email} - Reason: ${adminNote || 'No reason provided'}`);
      }
      
      // Broadcast admin dashboard update for withdrawal processing
      broadcastAdminDashboardUpdate();
      
      res.json({ 
        message: `Withdrawal request ${action}d successfully`,
        transactionId,
        status: newStatus
      });
    } catch (error) {
      console.error('Process withdrawal error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid processing data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // =================== Agent Management Routes ===================
  
  // Admin routes for agent management
  app.post('/api/admin/agents', requireAdmin, async (req, res) => {
    try {
      const agentData = createAgentSchema.parse(req.body);
      const adminId = (req as any).session.userId;
      
      const { user, agentProfile } = await storage.createAgent(
        agentData.email, 
        agentData.password, 
        agentData.commissionRate
      );
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'create_agent',
        targetId: user.id,
        details: { agentEmail: user.email, commissionRate: agentProfile.commissionRate }
      });
      
      // Broadcast admin dashboard update for agent creation
      broadcastAdminDashboardUpdate();
      
      const safeUser = sanitizeUserData(user);
      res.json({ user: safeUser, agentProfile });
    } catch (error) {
      console.error('Create agent error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid agent data', errors: error.errors });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
      }
    }
  });

  app.get('/api/admin/agents', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await storage.getAllAgents(page, limit);
      console.log(`📊 [Admin Agents] Retrieved ${result.agents.length} agents from database (total: ${result.total})`);
      
      const safeAgents = result.agents.map(agent => {
        return sanitizeAgentData(agent);
      });
      
      console.log(`📊 [Admin Agents] Returning ${safeAgents.length} agents: ${safeAgents.map(a => a.email).join(', ')}`);
      
      res.json({ agents: safeAgents, total: result.total });
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/agents/:agentId/toggle', requireAdmin, async (req, res) => {
    try {
      const { agentId } = req.params;
      const adminId = (req as any).session.userId;
      
      const agentProfile = await storage.toggleAgentStatus(agentId);
      
      if (!agentProfile) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'toggle_agent_status',
        targetId: agentId,
        details: { newStatus: agentProfile.isActive }
      });
      
      // Broadcast admin dashboard update for agent status toggle
      broadcastAdminDashboardUpdate();
      
      res.json(agentProfile);
    } catch (error) {
      console.error('Toggle agent status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/agents/:agentId/commission', requireAdmin, async (req, res) => {
    try {
      const { agentId } = req.params;
      const commissionData = updateCommissionSchema.parse({ ...req.body, agentId });
      const adminId = (req as any).session.userId;
      
      const agentProfile = await storage.updateAgentCommission(agentId, commissionData.commissionRate);
      
      if (!agentProfile) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'update_agent_commission',
        targetId: agentId,
        details: { newCommissionRate: commissionData.commissionRate }
      });
      
      // Broadcast admin dashboard update for agent commission update
      broadcastAdminDashboardUpdate();
      
      res.json(agentProfile);
    } catch (error) {
      console.error('Update commission error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid commission data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/admin/agents/:agentId/adjust-balance', requireAdmin, async (req, res) => {
    try {
      const { agentId } = req.params;
      const adjustBalanceSchema = z.object({
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && isFinite(num) && Math.abs(num) <= 1000000;
        }, {
          message: "Amount must be a valid number within reasonable limits"
        })
      });
      
      const { amount } = adjustBalanceSchema.parse(req.body);
      
      const adminId = (req as any).session.userId;
      const agentProfile = await storage.adjustAgentBalance(agentId, amount, adminId);
      
      if (!agentProfile) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      // Broadcast admin dashboard update for agent balance adjustment
      broadcastAdminDashboardUpdate();
      
      res.json(agentProfile);
    } catch (error) {
      console.error('Adjust agent balance error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid balance adjustment data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Promote user to agent endpoint
  app.post('/api/admin/users/:userId/promote-to-agent', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = (req as any).session.userId;
      
      const { user, agentProfile } = await storage.promoteUserToAgent(userId);
      
      // Log admin action
      await storage.logAdminAction({
        adminId,
        action: 'promote_user_to_agent',
        targetId: userId,
        details: { email: user.email, commissionRate: agentProfile.commissionRate }
      });
      
      // Send agent approval email with all details
      try {
        await sendAgentApprovalEmail(
          user.email,
          user.email.split('@')[0], // Use email prefix as username
          agentProfile.commissionRate,
          storage
        );
        console.log(`✅ Agent approval email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send agent approval email:', emailError);
        // Don't fail the whole request if email fails
      }
      
      // Broadcast admin dashboard update for user promotion to agent
      broadcastAdminDashboardUpdate();
      
      const safeUser = sanitizeUserData(user);
      res.json({ user: safeUser, agentProfile });
    } catch (error) {
      console.error('Promote user to agent error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to promote user to agent' });
    }
  });

  // Agent authentication and operations
  app.post('/api/agent/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.validateUser(credentials);
      if (!user || user.role !== 'agent') {
        // Send Telegram notification for failed agent login attempt
        const ipAddress = getRealIP(req);
        const timestamp = new Date().toLocaleString('en-US', { 
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        // Send notification asynchronously (don't block response)
        sendFailedLoginNotification(credentials.email, ipAddress, timestamp).catch(err => {
          console.error('Failed to send failed agent login notification:', err);
        });
        
        return res.status(401).json({ message: 'Invalid agent credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Agent account is deactivated' });
      }

      // Check if user is banned
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil) <= new Date()) {
          // Temporary ban has expired, unban the user automatically
          await storage.unbanUser(user.id);
        } else {
          // User is still banned
          const banMessage = user.bannedUntil 
            ? `Account is banned until ${new Date(user.bannedUntil).toLocaleDateString()}. Reason: ${user.banReason || 'No reason provided'}`
            : `Account is permanently banned. Reason: ${user.banReason || 'No reason provided'}`;
          return res.status(403).json({ message: banMessage });
        }
      }

      // Check agent profile status
      const agentProfile = await storage.getAgentProfile(user.id);
      if (!agentProfile || !agentProfile.isActive) {
        return res.status(403).json({ message: 'Agent profile is inactive' });
      }

      // Get user IP and User Agent for tracking
      const ipAddress = getRealIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const parsedUA = parseUserAgent(userAgent);

      // Update last login IP
      await storage.updateUser(user.id, { lastLoginIp: ipAddress });

      // Create user session
      await storage.createUserSession({
        userId: user.id,
        ipAddress,
        userAgent,
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        deviceType: parsedUA.deviceType,
        deviceModel: parsedUA.deviceModel,
        operatingSystem: parsedUA.operatingSystem,
        isActive: true
      });

      const safeUser = sanitizeUserData(user);
      
      // Create session
      (req as any).session.userId = user.id;
      
      res.json({ ...safeUser, agentProfile });
    } catch (error) {
      console.error('Agent login error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Agent deposit processing
  app.post('/api/agent/deposit', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const depositData = agentDepositSchema.parse(req.body);
      
      // Get old balances before the deposit
      const oldAgentBalance = agent.balance;
      const targetUserBefore = await storage.getUserByPublicIdOrEmail(depositData.userIdentifier);
      const oldTargetBalance = targetUserBefore?.balance || "0.00000000";
      
      const result = await storage.processAgentDeposit(
        agentId, 
        depositData.userIdentifier, 
        depositData.amount
      );
      
      // Get target user for email and activity broadcast
      const targetUser = await storage.getUserByPublicIdOrEmail(depositData.userIdentifier);
      
      // Get new balances after the deposit
      const agentAfter = await storage.getUser(agentId);
      const newAgentBalance = agentAfter?.balance || "0.00000000";
      const newTargetBalance = targetUser?.balance || "0.00000000";
      
      // Broadcast balance updates for both agent and target user
      broadcastBalanceUpdate(agentId, oldAgentBalance, newAgentBalance, 'withdrawal');
      if (targetUser) {
        broadcastBalanceUpdate(targetUser.id, oldTargetBalance, newTargetBalance, 'deposit');
      }
      
      // Broadcast agent activity to connected clients with targetUserPublicId
      if (result.activity && targetUser) {
        broadcastAgentActivity({
          ...result.activity,
          targetUserPublicId: targetUser.publicId
        });
      }
      
      // Broadcast admin dashboard update for agent deposit
      broadcastAdminDashboardUpdate();
      
      // Send deposit confirmation email to user
      if (targetUser) {
        try {
          await sendDepositConfirmationEmail(
            targetUser.email,
            depositData.amount,
            'USD',
            result.transaction.id,
            targetUser.balance,
            storage
          );
          console.log(`📧 Agent deposit confirmation email sent to ${targetUser.email}`);
        } catch (emailError) {
          console.error(`Failed to send agent deposit confirmation email:`, emailError);
        }
        
        // Send deposit push notification
        try {
          await sendTransactionPushNotification(
            targetUser.id,
            'deposit',
            parseFloat(depositData.amount).toFixed(2),
            'USD'
          );
        } catch (pushError) {
          console.error(`Failed to send agent deposit push notification to ${targetUser.email}:`, pushError);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('Agent deposit error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid deposit data', errors: error.errors });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
      }
    }
  });

  // Agent withdrawal processing
  app.post('/api/agent/withdrawal', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      // Check if agent withdrawals are enabled
      const agentWithdrawalsEnabledSetting = await storage.getSystemSetting('agent_withdrawals_enabled');
      const agentWithdrawalsEnabled = agentWithdrawalsEnabledSetting?.value !== 'false'; // Default to enabled if not set
      
      if (!agentWithdrawalsEnabled) {
        return res.status(403).json({ message: 'Agent withdrawals are currently suspended. Only deposits are allowed.' });
      }

      const withdrawalData = agentWithdrawalSchema.parse(req.body);
      
      const result = await storage.processAgentWithdrawal(
        agentId, 
        withdrawalData.userIdentifier, 
        withdrawalData.amount
      );
      
      // Get target user for activity broadcast
      const targetUser = await storage.getUserByPublicIdOrEmail(withdrawalData.userIdentifier);
      
      // Broadcast agent activity to connected clients with targetUserPublicId
      if (result.activity && targetUser) {
        broadcastAgentActivity({
          ...result.activity,
          targetUserPublicId: targetUser.publicId
        });
      }
      
      // Broadcast admin dashboard update for agent withdrawal
      broadcastAdminDashboardUpdate();
      
      res.json(result);
    } catch (error) {
      console.error('Agent withdrawal error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid withdrawal data', errors: error.errors });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
      }
    }
  });

  // Get all agents (for user deposit request page)
  app.get('/api/agents', requireAuth, async (req, res) => {
    try {
      const amount = req.query.amount ? parseFloat(req.query.amount as string) : undefined;
      const result = await storage.getAllAgents(1, 100);
      
      // Filter and map agent data
      let agentData = result.agents
        .filter(agent => {
          // Filter out agents without agentProfile (safety check)
          if (!agent.agentProfile) return false;
          
          // Filter out agents not accepting deposits
          if (!agent.isAcceptingDeposits) return false;
          
          // Filter by amount range if amount is provided
          if (amount) {
            const minAmount = agent.minDepositAmount ? parseFloat(agent.minDepositAmount) : 0;
            const maxAmount = agent.maxDepositAmount ? parseFloat(agent.maxDepositAmount) : Infinity;
            
            // Only include agents whose range covers the requested amount
            if (amount < minAmount || amount > maxAmount) return false;
            
            // Filter by agent's balance - agent must have enough balance to fulfill the deposit
            const agentBalance = parseFloat(agent.balance || "0");
            if (agentBalance < amount) return false;
          }
          
          return true;
        })
        .map(agent => {
          const displayName = agent.agentProfile?.displayName;
          const agentName = (displayName && displayName.toLowerCase() !== 'agent') ? displayName :
                           agent.telegramUsername || 
                           agent.telegramFirstName || 
                           agent.email.split('@')[0];
          
          return {
            id: agent.id,
            publicId: agent.publicId,
            email: agent.email,
            displayName: agentName,
            binanceId: agent.binanceId,
            commissionRate: agent.agentProfile.commissionRate
          };
        });
      
      // Sort by commission rate (lowest to highest) - like Binance P2P
      agentData.sort((a, b) => {
        const rateA = parseFloat(a.commissionRate || "0");
        const rateB = parseFloat(b.commissionRate || "0");
        return rateA - rateB;
      });
      
      res.json(agentData);
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ message: 'Failed to fetch agents' });
    }
  });

  // User creates deposit request to agent
  app.post('/api/deposit-requests', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const { agentId, amount, paymentProof, userNote } = req.body;

      if (!agentId || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Agent and valid amount are required' });
      }

      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(404).json({ message: 'Agent not found' });
      }

      // Validate agent is accepting deposits
      if (!agent.isAcceptingDeposits) {
        return res.status(400).json({ message: 'This agent is not currently accepting deposits' });
      }

      // Validate amount is within agent's accepted range
      const minAmount = agent.minDepositAmount ? parseFloat(agent.minDepositAmount) : 0;
      const maxAmount = agent.maxDepositAmount ? parseFloat(agent.maxDepositAmount) : Infinity;
      const requestAmount = parseFloat(amount);

      if (requestAmount < minAmount) {
        return res.status(400).json({ 
          message: `Amount is below agent's minimum deposit of $${minAmount}` 
        });
      }

      if (requestAmount > maxAmount) {
        return res.status(400).json({ 
          message: `Amount exceeds agent's maximum deposit of $${maxAmount}` 
        });
      }

      const request = await storage.createDepositRequest({
        userId,
        agentId,
        amount: amount.toString(),
        currency: 'USD',
        status: 'pending',
        paymentProof,
        userNote
      });

      // Send push notification to agent about new deposit request
      try {
        await sendAgentDepositRequestNotification(
          agentId,
          userId,
          parseFloat(amount).toFixed(2),
          'USD'
        );
      } catch (pushError) {
        console.error(`Failed to send deposit request push notification to agent ${agentId}:`, pushError);
        // Don't fail the request if push notification fails
      }

      res.json(request);
    } catch (error) {
      console.error('Create deposit request error:', error);
      res.status(500).json({ message: 'Failed to create deposit request' });
    }
  });

  // User views their deposit requests
  app.get('/api/deposit-requests/my-requests', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const requests = await storage.getDepositRequestsByUser(userId);
      
      // Enrich requests with agent data if agentId is present
      const requestsWithAgentData = await Promise.all(
        requests.map(async (request) => {
          let agentData = null;
          
          if (request.agentId) {
            try {
              const agent = await storage.getUser(request.agentId);
              const agentProfile = await storage.getAgentProfile(request.agentId);
              
              if (agent && agent.email) {
                // Determine agent name with priority: displayName (if not "agent") > telegramUsername > telegramFirstName > email username
                const displayName = agentProfile?.displayName;
                const agentName = (displayName && displayName.toLowerCase() !== 'agent') ? displayName :
                                agent.telegramUsername || 
                                agent.telegramFirstName || 
                                agent.email.split('@')[0];
                
                agentData = {
                  agentEmail: agent.email,
                  agentPublicId: agent.publicId,
                  agentName
                };
              }
            } catch (err) {
              console.error(`Error fetching agent data for deposit request ${request.id}:`, err);
            }
          }
          
          return agentData ? { ...request, ...agentData } : request;
        })
      );
      
      res.json(requestsWithAgentData);
    } catch (error) {
      console.error('Get user deposit requests error:', error);
      res.status(500).json({ message: 'Failed to fetch deposit requests' });
    }
  });

  // Agent views their deposit requests
  app.get('/api/agent/deposit-requests', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const status = req.query.status as "pending" | "approved" | "rejected" | "completed" | undefined;
      const requests = await storage.getDepositRequestsByAgent(agentId, status);
      
      // Enrich requests with user data
      const requestsWithUserData = await Promise.all(
        requests.map(async (request) => {
          let userData = null;
          
          if (request.userId) {
            try {
              const user = await storage.getUser(request.userId);
              
              if (user) {
                userData = {
                  userPublicId: user.publicId,
                  userEmail: user.email
                };
              }
            } catch (err) {
              console.error(`Error fetching user data for deposit request ${request.id}:`, err);
            }
          }
          
          return userData ? { ...request, ...userData } : request;
        })
      );
      
      res.json(requestsWithUserData);
    } catch (error) {
      console.error('Get agent deposit requests error:', error);
      res.status(500).json({ message: 'Failed to fetch deposit requests' });
    }
  });

  // Agent approves deposit request (Atomic Transaction)
  app.post('/api/agent/deposit-requests/:id/approve', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      const { id } = req.params;
      const { agentNote } = req.body;

      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const result = await storage.atomicApproveDepositRequest(id, agentId, agentNote);

      if (!result.success) {
        const statusCode = result.error === 'Deposit request not found' || result.error === 'User not found' ? 404 
          : result.error === 'Not your deposit request' ? 403 
          : result.error === 'Request already processed' ? 400 
          : 500;
        return res.status(statusCode).json({ message: result.error });
      }

      const { request: updatedRequest, transaction, user, referrerData } = result;
      if (!updatedRequest || !transaction || !user) {
        return res.status(500).json({ message: 'Failed to approve deposit request' });
      }

      const amount = parseFloat(updatedRequest.amount);
      const oldBalance = (parseFloat(user.balance) - amount).toFixed(8);
      const newBalance = user.balance;

      broadcastBalanceUpdate(updatedRequest.userId, oldBalance, newBalance, 'deposit');
      broadcastAdminDashboardUpdate();

      // Send deposit confirmation email
      try {
        await sendDepositConfirmationEmail(
          user.email,
          amount.toFixed(2),
          'USD',
          transaction.id,
          newBalance,
          storage
        );
        console.log(`📧 Agent deposit confirmation email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send agent deposit confirmation email:`, emailError);
      }

      // Send deposit push notification
      try {
        await sendTransactionPushNotification(
          updatedRequest.userId,
          'deposit',
          amount.toFixed(2),
          'USD'
        );
        console.log(`🔔 Agent deposit push notification sent to ${user.email}`);
      } catch (pushError) {
        console.error(`Failed to send agent deposit push notification:`, pushError);
      }

      // Send referral-related emails if referrerData is present (from transaction)
      if (referrerData?.referrer && referrerData.newTeamSize !== undefined) {
        const { referrer, oldTeamSize, newTeamSize, oldVipLevel, newVipLevel } = referrerData;
        
        // Send level up email for team growth
        try {
          await sendLevelUpEmail(
            referrer.email,
            referrer.email.split('@')[0],
            newTeamSize,
            `Team Member ${newTeamSize}`,
            'Increased commission rates',
            storage
          );
          console.log(`✅ [AgentDeposit] Level up email sent to ${referrer.email}`);
        } catch (emailError) {
          console.error(`[AgentDeposit] Failed to send level up email to ${referrer.email}:`, emailError);
        }
        
        // If VIP level changed, send VIP upgrade email
        if (newVipLevel && oldVipLevel && newVipLevel !== oldVipLevel) {
          try {
            const allVipLevels = await vipService.getVipLevels();
            const newVipSetting = allVipLevels[newVipLevel];
            
            const benefits = [
              `Higher commission rates on team bets`,
              `Max bet limit: ${newVipSetting?.maxBetLimit || 'Unlimited'}`,
              `Daily wager reward: ${((newVipSetting?.dailyWagerReward || 0) * 100).toFixed(2)}%`,
              `Access to exclusive features`
            ];
            
            // Get Telegram link for the new VIP level
            const vipSettingRecord = await storage.getVipSettingByLevelKey(newVipLevel);
            const telegramLink = vipSettingRecord?.telegramLink || undefined;
            
            await sendVipLevelUpgradeEmail(
              referrer.email,
              referrer.email.split('@')[0],
              oldVipLevel,
              newVipLevel,
              benefits,
              storage,
              telegramLink
            );
            console.log(`✅ [AgentDeposit] VIP upgrade email sent to ${referrer.email}: ${oldVipLevel} → ${newVipLevel}`);
          } catch (emailError) {
            console.error(`[AgentDeposit] Failed to send VIP upgrade email to ${referrer.email}:`, emailError);
          }
        }
      }

      // Create in-app notification
      try {
        await storage.createNotification({
          userId: updatedRequest.userId,
          title: "✅ Deposit Approved",
          message: `Your agent deposit request of $${amount.toFixed(2)} has been approved and credited to your account!`,
          type: "success",
          imageUrl: null,
          sentBy: agentId
        });
        console.log(`🔔 In-app notification created for ${user.email}`);
      } catch (notifError) {
        console.error(`Failed to create in-app notification:`, notifError);
      }

      res.json({ request: updatedRequest, transaction });
    } catch (error) {
      console.error('Approve deposit request error:', error);
      res.status(500).json({ message: 'Failed to approve deposit request' });
    }
  });

  // Agent rejects deposit request
  app.post('/api/agent/deposit-requests/:id/reject', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      const { id } = req.params;
      const { agentNote } = req.body;

      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const request = await storage.getDepositRequestById(id);
      if (!request) {
        return res.status(404).json({ message: 'Deposit request not found' });
      }

      if (request.agentId !== agentId) {
        return res.status(403).json({ message: 'Not your deposit request' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Request already processed' });
      }

      const updatedRequest = await storage.updateDepositRequestStatus(id, 'rejected', {
        agentNote
      });

      // Get user for notification
      const user = await storage.getUser(request.userId);

      // Create in-app notification for rejection
      if (user) {
        try {
          const rejectReason = agentNote ? ` Reason: ${agentNote}` : '';
          await storage.createNotification({
            userId: request.userId,
            title: "❌ Deposit Request Rejected",
            message: `Your agent deposit request of $${parseFloat(request.amount).toFixed(2)} has been rejected.${rejectReason}`,
            type: "error",
            imageUrl: null,
            sentBy: agentId
          });
          console.log(`🔔 Rejection notification created for ${user.email}`);
        } catch (notifError) {
          console.error(`Failed to create rejection notification:`, notifError);
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error('Reject deposit request error:', error);
      res.status(500).json({ message: 'Failed to reject deposit request' });
    }
  });

  // Agent updates Binance ID
  app.post('/api/agent/binance-id', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      const { binanceId } = req.body;

      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const updatedAgent = await storage.updateUser(agentId, { binanceId });
      res.json({ binanceId: updatedAgent?.binanceId });
    } catch (error) {
      console.error('Update Binance ID error:', error);
      res.status(500).json({ message: 'Failed to update Binance ID' });
    }
  });

  // User withdrawal request
  app.post('/api/payments/withdraw', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      const withdrawalData = createWithdrawalRequestSchema.parse(req.body);
      
      // Get user to verify balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify withdrawal password
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(withdrawalData.withdrawalPassword, user.withdrawalPasswordHash || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Incorrect withdrawal password' });
      }

      // Check withdrawal cooldown period
      const cooldownSetting = await storage.getSystemSetting('withdrawal_cooldown_hours');
      const cooldownHours = cooldownSetting ? parseFloat(cooldownSetting.value) : 24; // Default 24 hours
      
      if (user.lastWithdrawalRequestAt) {
        const lastRequestTime = new Date(user.lastWithdrawalRequestAt).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceLastRequest = (currentTime - lastRequestTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastRequest < cooldownHours) {
          const remainingHours = Math.ceil(cooldownHours - hoursSinceLastRequest);
          const remainingMinutes = Math.ceil((cooldownHours - hoursSinceLastRequest) * 60);
          
          let timeMessage = '';
          if (remainingHours < 1) {
            timeMessage = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
          } else {
            timeMessage = `${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
          }
          
          return res.status(429).json({ 
            message: `You can only request a withdrawal once every ${cooldownHours} hours. Please wait ${timeMessage} before making another withdrawal request.`,
            remainingHours: parseFloat(remainingHours.toFixed(2)),
            cooldownHours
          });
        }
      }

      // Check minimum VIP level requirement for withdrawals
      const minVipLevelSetting = await storage.getSystemSetting('minimum_withdrawal_vip_level');
      if (minVipLevelSetting && minVipLevelSetting.value !== 'lv1') {
        const { VIP_LEVELS } = await import("@shared/schema");
        const vipLevelOrder: Record<string, number> = {
          'lv1': 1, 'lv2': 2, 'vip': 3, 'vip1': 4, 'vip2': 5, 
          'vip3': 6, 'vip4': 7, 'vip5': 8, 'vip6': 9, 'vip7': 10
        };
        
        const userVipOrder = vipLevelOrder[user.vipLevel] || 1;
        const minVipOrder = vipLevelOrder[minVipLevelSetting.value] || 1;
        
        if (userVipOrder < minVipOrder) {
          const minLevelName = VIP_LEVELS[minVipLevelSetting.value as keyof typeof VIP_LEVELS]?.displayName || minVipLevelSetting.value;
          const userLevelName = VIP_LEVELS[user.vipLevel as keyof typeof VIP_LEVELS]?.displayName || user.vipLevel;
          return res.status(403).json({ 
            message: `Withdrawals are only available for ${minLevelName} and above. Your current level is ${userLevelName}. Invite more friends to upgrade your VIP level.`
          });
        }
      }

      // Get betting requirement percentage from system settings (default 60%)
      const betRequirementSetting = await storage.getSystemSetting('betting_requirement_percentage');
      const betRequirementPercentage = betRequirementSetting ? parseFloat(betRequirementSetting.value) : 60;
      
      // Check betting requirement with separate handling for commission/referral money
      // Commission/referral earnings are ALWAYS withdrawable without betting requirements
      // Only deposit-based balance requires wagering to prevent abuse
      const totalDeposits = parseFloat(user.totalDeposits) || 0;
      const totalBetsAmount = parseFloat(user.totalBetsAmount) || 0;
      const totalCommission = parseFloat(user.totalCommission) || 0;
      
      // Only apply betting requirement if user has made deposits
      if (totalDeposits > 0) {
        const requiredBetAmount = totalDeposits * (betRequirementPercentage / 100);
        
        // Use a small epsilon for floating-point comparison to handle precision issues
        // For example, if user bets exactly 60%, floating point arithmetic might result in 59.9999%
        const EPSILON = 0.01; // Allow 0.01 USD tolerance (1 cent)
        // Ensure epsilon doesn't make requirement negative for very small deposits
        const adjustedRequirement = Math.max(0, requiredBetAmount - EPSILON);
        const hasBetEnough = totalBetsAmount >= adjustedRequirement;
        
        // Check if user has met the wagering requirement
        if (!hasBetEnough) {
          // User hasn't met requirement yet - but they can still withdraw commission money
          const withdrawalAmountUSD = parseFloat(withdrawalData.amount) / 100; // Convert coins to USD
          
          // If withdrawal amount is covered by commission balance, allow it
          if (withdrawalAmountUSD <= totalCommission) {
            // This withdrawal is from commission/referral earnings - allow without restriction
            console.log(`💰 Allowing commission withdrawal: $${withdrawalAmountUSD} USD from commission balance: $${totalCommission}`);
          } else {
            // Withdrawal amount exceeds commission - they need to meet the requirement
            const betPercentage = totalDeposits > 0 ? ((totalBetsAmount / totalDeposits) * 100).toFixed(2) : '0.00';
            const remainingBetAmount = Math.max(0, requiredBetAmount - totalBetsAmount);
            const withdrawableCommission = totalCommission;
            
            console.log(`❌ Withdrawal blocked - Betting requirement not met:`, {
              totalDeposits: totalDeposits.toFixed(2),
              totalBets: totalBetsAmount.toFixed(2),
              requiredBet: requiredBetAmount.toFixed(2),
              betPercentage,
              requiredPercentage: betRequirementPercentage
            });
            
            return res.status(400).json({ 
              message: `You need to bet more to unlock withdrawals`,
              betPercentage: parseFloat(betPercentage),
              requiredPercentage: betRequirementPercentage,
              totalDeposits: totalDeposits.toFixed(2),
              totalBets: totalBetsAmount.toFixed(2),
              remainingBetAmount: remainingBetAmount.toFixed(2),
              withdrawableCommission: withdrawableCommission.toFixed(2)
            });
          }
        } else {
          // Betting requirement met
          console.log(`✅ Betting requirement satisfied:`, {
            totalDeposits: totalDeposits.toFixed(2),
            totalBets: totalBetsAmount.toFixed(2),
            requiredBet: requiredBetAmount.toFixed(2),
            betPercentage: ((totalBetsAmount / totalDeposits) * 100).toFixed(2) + '%'
          });
        }
      }

      const coinAmount = parseFloat(withdrawalData.amount);
      
      // Server-side validation for minimum withdrawal amount
      const MIN_WITHDRAWAL_COINS = 1200;
      if (coinAmount < MIN_WITHDRAWAL_COINS) {
        return res.status(400).json({ message: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_COINS} coins` });
      }
      
      // Calculate network fee based on currency
      let networkFeeCoins = 0;
      const cryptoCurrencies = {
        "USDT_TRC20": { networkFeeCoins: 100 },
        "USDT_POLYGON": { networkFeeCoins: 80 }
      };
      
      const selectedCrypto = cryptoCurrencies[withdrawalData.currency as keyof typeof cryptoCurrencies];
      if (selectedCrypto) {
        networkFeeCoins = selectedCrypto.networkFeeCoins;
      }
      
      const totalCoinsNeeded = coinAmount + networkFeeCoins;
      let availableBalanceUSD: number;
      
      // For agents, check their earnings balance instead of regular balance
      if (user.role === 'agent') {
        const agentProfile = await storage.getAgentProfile(userId);
        if (!agentProfile || !agentProfile.isActive) {
          return res.status(403).json({ message: 'Agent profile not found or inactive' });
        }
        availableBalanceUSD = parseFloat(agentProfile.earningsBalance);
      } else {
        // For regular users, available balance = balance - frozen balance
        // Frozen balance represents deposited funds that users can bet with but cannot withdraw
        const frozenBalance = parseFloat(user.frozenBalance || '0');
        availableBalanceUSD = parseFloat(user.balance) - frozenBalance;
      }
      
      const USD_TO_COINS_RATE = 100; // Use constant instead of magic number
      const userBalanceInCoins = availableBalanceUSD * USD_TO_COINS_RATE;

      if (userBalanceInCoins < totalCoinsNeeded) {
        return res.status(400).json({ message: 'Insufficient balance for withdrawal including network fee' });
      }

      // Check for duplicate accounts from same IP
      let duplicateIpCount = 0;
      let duplicateIpUsers: User[] = [];
      if (user.registrationIp) {
        duplicateIpUsers = await storage.getUsersByRegistrationIp(user.registrationIp);
        // Exclude current user from count
        duplicateIpCount = duplicateIpUsers.filter(u => u.id !== userId).length;
        
        if (duplicateIpCount > 0) {
          console.log(`⚠️  WARNING: User ${user.email} has ${duplicateIpCount} other account(s) from same IP: ${user.registrationIp}`);
        }
      }

      // Deduct balance immediately to freeze coins during pending approval
      const withdrawalAmountUSD = coinAmount / 100; // Convert coins to USD
      
      // Deduct the withdrawal amount from user's balance (freeze the coins)
      if (user.role === 'agent') {
        const agentProfile = await storage.getAgentProfile(userId);
        if (agentProfile) {
          const newEarningsBalance = (parseFloat(agentProfile.earningsBalance) - withdrawalAmountUSD).toFixed(8);
          await storage.updateAgentBalance(userId, newEarningsBalance);
          console.log(`💰 Frozen ${withdrawalAmountUSD} USD from agent earnings balance (pending approval)`);
        }
      } else {
        const newBalance = (parseFloat(user.balance) - withdrawalAmountUSD).toFixed(8);
        await storage.updateUserBalance(userId, newBalance);
        console.log(`💰 Frozen ${withdrawalAmountUSD} USD from user balance (pending approval)`);
      }
      
      let transaction;
      try {
        // Create transaction with pending status - balance already deducted above
        transaction = await storage.createTransaction({
          userId,
          type: 'withdrawal',
          fiatAmount: (coinAmount / 100).toString(), // Convert coins to USD for storage
          cryptoAmount: withdrawalData.amount, // Store original coin amount
          fiatCurrency: 'USD',
          cryptoCurrency: withdrawalData.currency,
          status: 'pending',
          paymentMethod: 'crypto',
          paymentAddress: withdrawalData.address,
          fee: '0'
        });
      } catch (transactionError) {
        // Rollback balance if transaction creation fails
        if (user.role === 'agent') {
          const agentProfile = await storage.getAgentProfile(userId);
          if (agentProfile) {
            const refundedBalance = (parseFloat(agentProfile.earningsBalance) + withdrawalAmountUSD).toFixed(8);
            await storage.updateAgentBalance(userId, refundedBalance);
          }
        } else {
          const refundedBalance = (parseFloat(user.balance) + withdrawalAmountUSD).toFixed(8);
          await storage.updateUserBalance(userId, refundedBalance);
        }
        throw new Error('Failed to create withdrawal transaction: ' + (transactionError instanceof Error ? transactionError.message : 'Unknown error'));
      }

      // Create withdrawal request with duplicate IP detection info
      const requiredBetAmount = totalDeposits > 0 ? totalDeposits * (betRequirementPercentage / 100) : 0;
      const eligible = totalDeposits === 0 || totalBetsAmount >= requiredBetAmount || withdrawalAmountUSD <= totalCommission;
      const duplicateIpUserIds = duplicateIpUsers
        .filter(u => u.id !== userId)
        .map(u => u.id);

      // Calculate withdrawal source breakdown
      // NOTE: This is an approximation based on current balance composition
      // For accurate tracking, the system would need to maintain separate balance pools
      // Currently we estimate based on the user's financial profile at withdrawal time
      
      // Calculate net winnings (total winnings minus total losses)
      const totalWinnings = parseFloat(user.totalWinnings) || 0;
      const totalLosses = parseFloat(user.totalLosses) || 0;
      const netWinnings = Math.max(0, totalWinnings - totalLosses);
      
      // Current balance is composed of: deposits + commission + net winnings - withdrawals
      // We approximate the source by allocating in order: commission first, then winnings, then deposits
      const currentBalance = availableBalanceUSD;
      
      // Estimate how much of current balance is from commission (capped at total commission earned)
      const estimatedCommissionInBalance = Math.min(totalCommission, currentBalance);
      
      // Remaining balance after commission
      const remainingAfterCommission = currentBalance - estimatedCommissionInBalance;
      
      // Estimate how much of remaining balance is from net winnings
      const estimatedWinningsInBalance = Math.min(netWinnings, remainingAfterCommission);
      
      // Now allocate the withdrawal amount to sources
      // Priority: commission first, then winnings, then other (deposits)
      const commissionAmountInWithdrawal = Math.min(withdrawalAmountUSD, estimatedCommissionInBalance);
      const remainingWithdrawalAmount = withdrawalAmountUSD - commissionAmountInWithdrawal;
      const winningsAmountInWithdrawal = Math.min(remainingWithdrawalAmount, estimatedWinningsInBalance);

      try {
        await storage.createWithdrawalRequest({
          userId,
          amount: withdrawalAmountUSD.toString(),
          currency: withdrawalData.currency,
          walletAddress: withdrawalData.address,
          requiredBetAmount: requiredBetAmount.toFixed(8),
          currentBetAmount: totalBetsAmount.toFixed(8),
          eligible,
          duplicateIpCount,
          duplicateIpUserIds,
          commissionAmount: commissionAmountInWithdrawal.toFixed(8),
          winningsAmount: winningsAmountInWithdrawal.toFixed(8),
          balanceFrozen: true, // Mark that balance was frozen when this request was created
        });
        
        // Update user's last withdrawal request timestamp
        await storage.updateUser(userId, {
          lastWithdrawalRequestAt: new Date()
        });
      } catch (withdrawalRequestError) {
        console.error('Failed to create withdrawal request:', withdrawalRequestError);
        // Continue anyway, transaction is already created
      }

      console.log(`💰 Withdrawal request created: ${withdrawalAmountUSD} USD for user ${userId}, waiting for admin approval`);

      // Send Telegram notification
      try {
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        await sendWithdrawalNotification(
          user.email,
          withdrawalAmountUSD.toString(),
          withdrawalData.currency,
          currentTime
        );
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        // Don't fail the withdrawal request if Telegram fails
      }

      // Send email notification to user (only shows withdrawal amount, no balance)
      try {
        await sendWithdrawalRequestEmail(
          user.email,
          withdrawalAmountUSD.toFixed(2),
          'USD',
          withdrawalData.address,
          storage
        );
      } catch (emailError) {
        console.error('Failed to send withdrawal email:', emailError);
        // Don't fail the withdrawal request if email fails
      }

      res.json({ 
        message: 'Withdrawal request created successfully',
        transactionId: transaction.id
      });
    } catch (error) {
      console.error('User withdrawal error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid withdrawal data', errors: error.errors });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
      }
    }
  });

  // Agent activities and earnings
  app.get('/api/agent/activities', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await storage.getAgentActivities(agentId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get agent activities error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/agent/earnings', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const earnings = await storage.getAgentEarnings(agentId);
      res.json(earnings);
    } catch (error) {
      console.error('Get agent earnings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/agent/profile', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const agentProfile = await storage.getAgentProfile(agentId);
      if (!agentProfile) {
        return res.status(404).json({ message: 'Agent profile not found' });
      }

      const safeUser = sanitizeUserData(agent);
      res.json({ user: safeUser, agentProfile });
    } catch (error) {
      console.error('Get agent profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update agent settings (Binance ID, deposit limits, accepting deposits toggle)
  app.patch('/api/agent/settings', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      const { displayName, binanceId, minDepositAmount, maxDepositAmount, isAcceptingDeposits } = req.body;

      // Validation
      if (minDepositAmount && maxDepositAmount) {
        const minAmt = parseFloat(minDepositAmount);
        const maxAmt = parseFloat(maxDepositAmount);
        if (minAmt > maxAmt) {
          return res.status(400).json({ message: 'Minimum amount cannot be greater than maximum amount' });
        }
        if (minAmt < 1 || maxAmt < 1) {
          return res.status(400).json({ message: 'Amounts must be greater than 0' });
        }
      }

      // Update user with new settings
      await storage.updateUser(agentId, {
        binanceId: binanceId !== undefined ? binanceId : agent.binanceId,
        minDepositAmount: minDepositAmount !== undefined ? minDepositAmount : agent.minDepositAmount,
        maxDepositAmount: maxDepositAmount !== undefined ? maxDepositAmount : agent.maxDepositAmount,
        isAcceptingDeposits: isAcceptingDeposits !== undefined ? isAcceptingDeposits : agent.isAcceptingDeposits
      });

      // Update agent profile display name if provided
      if (displayName !== undefined) {
        const agentProfile = await storage.getAgentProfile(agentId);
        if (agentProfile) {
          await db
            .update(agentProfiles)
            .set({ 
              displayName: displayName || null,
              updatedAt: new Date()
            })
            .where(eq(agentProfiles.userId, agentId));
        }
      }

      const updatedAgent = await storage.getUser(agentId);
      const safeUser = sanitizeUserData(updatedAgent!);
      res.json({ user: safeUser });
    } catch (error) {
      console.error('Update agent settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Agent self-deposit through NOWPayments
  app.post('/api/agent/self-deposit', requireAuth, async (req, res) => {
    try {
      const agentId = (req as any).session.userId;
      
      // Verify user is an agent
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(403).json({ message: 'Access denied: Agent role required' });
      }

      // Verify agent profile is active
      const agentProfile = await storage.getAgentProfile(agentId);
      if (!agentProfile || !agentProfile.isActive) {
        return res.status(403).json({ message: 'Agent account is inactive' });
      }

      const depositData = agentSelfDepositSchema.parse(req.body);
      
      // Create payment with NOWPayments
      const nowPayment = await createNOWPayment(depositData.amount, depositData.currency, storage);
      
      if (!nowPayment) {
        return res.status(500).json({ message: 'Failed to create payment' });
      }

      // Generate QR code for the payment address
      const qrCodeDataUrl = await QRCode.toDataURL(nowPayment.pay_address);

      // Save transaction to database with agent-specific flag
      const transaction = await storage.createTransaction({
        userId: agentId,
        agentId: agentId, // Mark as agent self-deposit
        type: "deposit",
        fiatAmount: nowPayment.price_amount.toString(),
        fiatCurrency: nowPayment.price_currency || "USD",
        cryptoAmount: nowPayment.pay_amount.toString(),
        cryptoCurrency: nowPayment.pay_currency,
        status: "pending",
        paymentMethod: "crypto",
        externalId: nowPayment.payment_id.toString(),
        paymentAddress: nowPayment.pay_address,
        fee: "0"
      });

      res.json({
        payment_id: nowPayment.payment_id,
        pay_address: nowPayment.pay_address,
        pay_amount: nowPayment.pay_amount,
        pay_currency: nowPayment.pay_currency,
        price_amount: nowPayment.price_amount,
        price_currency: nowPayment.price_currency,
        qr_code: qrCodeDataUrl,
        transaction_id: transaction.id,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
      });
    } catch (error) {
      console.error('Agent self-deposit error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid deposit data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Referral endpoints
  app.get('/api/user/referral', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get referral statistics
      const stats = await storage.getReferralStats(userId);
      
      // Get list of referred users (just basic info)
      const referrals = await storage.getReferralsByUser(userId);
      
      // Generate referral link using request origin
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const referralLink = `${baseUrl}/signup?ref=${user.referralCode}`;
      
      res.json({
        referralCode: user.referralCode,
        referralLink,
        totalReferrals: stats.totalReferrals,
        totalCommission: user.lifetimeCommissionEarned || stats.totalCommission,
        referrals: referrals.map(ref => ({
          id: ref.id,
          referredId: ref.referredId,
          commissionRate: ref.commissionRate,
          totalCommission: ref.totalCommission,
          status: ref.status,
          createdAt: ref.createdAt
        }))
      });
    } catch (error) {
      console.error('Get referral info error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/user/referral/qr', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Generate referral link using request origin
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const referralLink = `${baseUrl}/signup?ref=${user.referralCode}`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(referralLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.json({
        qrCode: qrCodeDataUrl,
        referralLink,
        referralCode: user.referralCode
      });
    } catch (error) {
      console.error('Generate QR code error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get commission earnings history
  app.get('/api/user/commission-history', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get all transactions for this user that are commission-related
      const allTransactions = await storage.getTransactionsByUser(userId);
      
      // Filter for referral bonuses and get referred user info
      const commissionHistory = await Promise.all(
        allTransactions
          .filter(tx => tx.type === 'referral_bonus')
          .map(async (tx) => {
            // Try to find which referral this belongs to
            let referredUserEmail = 'Unknown User';
            const referrals = await storage.getReferralsByUser(userId);
            
            // Match by approximate timing or amount if possible
            // For now, just show the transaction
            return {
              id: tx.id,
              type: 'referral_bonus',
              amount: tx.fiatAmount || '0',
              currency: tx.fiatCurrency || 'USD',
              date: tx.createdAt,
              description: 'Referral Bonus - New user joined and deposited',
              referredUser: referredUserEmail
            };
          })
      );
      
      // Get bet commission history from referral records
      const referrals = await storage.getReferralsByUser(userId);
      const betCommissions = await Promise.all(
        referrals
          .filter(ref => parseFloat(ref.totalCommission || '0') > 0)
          .map(async (ref) => {
            const referredUser = await storage.getUser(ref.referredId);
            return {
              id: ref.id,
              type: 'bet_commission',
              amount: ref.totalCommission,
              currency: 'USD',
              date: ref.createdAt,
              description: 'Betting Commission',
              referredUser: referredUser?.email || 'Unknown User',
              commissionRate: ref.commissionRate
            };
          })
      );
      
      // Combine and sort by date (newest first)
      const allHistory = [...commissionHistory, ...betCommissions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      res.json({
        history: allHistory,
        totalEarnings: user.totalCommission
      });
    } catch (error) {
      console.error('Get commission history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get genuine referred users (users with first deposit)
  app.get('/api/user/referral/genuine', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get all referrals
      const referrals = await storage.getReferralsByUser(userId);
      
      // Filter genuine users (those with deposits) - double check both referral flag and user's actual deposits
      const genuineUsersData = await Promise.all(
        referrals.map(async (ref) => {
          const referredUser = await storage.getUser(ref.referredId);
          if (!referredUser) return null;
          
          // Check both hasDeposited flag AND actual total deposits to be certain
          const hasActuallyDeposited = ref.hasDeposited === true && parseFloat(referredUser.totalDeposits || '0') > 0;
          
          if (!hasActuallyDeposited) return null;
          
          return {
            publicId: referredUser.publicId || 'Unknown',
            balance: referredUser.balance || '0.00000000'
          };
        })
      );
      
      // Filter out null entries
      const genuineUsers = genuineUsersData.filter(user => user !== null);
      
      res.json({
        count: genuineUsers.length,
        users: genuineUsers
      });
    } catch (error) {
      console.error('Get genuine referrals error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user transactions (deposits and withdrawals)
  app.get('/api/user/transactions', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string; // Optional filter: 'deposit', 'withdrawal', or 'all'
      
      // Get user transactions
      const allTransactions = await storage.getTransactionsByUser(userId);
      
      // Filter by type if specified
      const filteredTransactions = type && type !== 'all' 
        ? allTransactions.filter(t => t.type === type)
        : allTransactions;
      
      // Sort by creation date, newest first
      filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
      
      // Fetch agent data for transactions that have an agentId
      const transactionsWithAgentData = await Promise.all(
        paginatedTransactions.map(async (transaction) => {
          let agentData = null;
          
          if (transaction.agentId) {
            try {
              const agent = await storage.getUser(transaction.agentId);
              if (agent && agent.email) {
                agentData = {
                  agentEmail: agent.email,
                  agentPublicId: agent.publicId,
                  agentName: agent.email.split('@')[0] // Use email username as agent name
                };
              }
            } catch (err) {
              console.error(`Error fetching agent data for transaction ${transaction.id}:`, err);
            }
          }
          
          return {
            ...transaction,
            timestamp: transaction.createdAt, // Add timestamp field mapped from createdAt
            amount: transaction.fiatAmount || '0', // Add amount field for frontend (USD amount)
            network: transaction.cryptoCurrency ? 
              (transaction.cryptoCurrency.includes('TRC20') ? 'TRC20' : 
               transaction.cryptoCurrency.includes('POLYGON') ? 'POLYGON' : 
               transaction.cryptoCurrency === 'TRX' ? 'TRON' : '') : '',
            address: transaction.paymentAddress || '', // Add address field for frontend
            ...(agentData ? agentData : {}) // Spread agent data if available
          };
        })
      );

      res.json({
        transactions: transactionsWithAgentData,
        total: filteredTransactions.length,
        page,
        totalPages: Math.ceil(filteredTransactions.length / limit)
      });
    } catch (error) {
      console.error('Get user transactions error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Passkey API Routes
  // Start passkey registration
  app.post('/api/passkeys/register/start', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const { deviceName } = passkeyDeviceNameSchema.parse(req.body);
      
      console.log('🔐 Passkey registration started - Origin:', origin, 'RP ID:', rpID);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.email,
        userDisplayName: user.email,
        excludeCredentials: [], // TODO: get existing credentials to exclude
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'preferred',
          // Remove authenticatorAttachment to allow both platform and cross-platform authenticators
        },
        attestationType: 'none',
      });

      // Store challenge in session for later verification
      (req as any).session.challenge = options.challenge;
      (req as any).session.deviceName = deviceName;

      res.json(options);
    } catch (error) {
      console.error('Start passkey registration error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Finish passkey registration
  app.post('/api/passkeys/register/finish', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const expectedChallenge = (req as any).session.challenge;
      const deviceName = (req as any).session.deviceName;

      if (!expectedChallenge) {
        return res.status(400).json({ message: 'No registration in progress' });
      }

      // Allow both origin with and without port (browser may include :5000)
      const expectedOrigins = [origin, `${origin}:5000`];

      const verification = await verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

        // Store the passkey with domain information
        const passkey = await storage.createPasskey({
          userId,
          credentialId: Buffer.from(credential.id).toString('base64url'),
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          deviceName: deviceName || 'Unknown Device',
          rpId: rpID,
          origin: origin,
          isActive: true,
          isDomainMismatch: false
        });

        // Clear session data
        delete (req as any).session.challenge;
        delete (req as any).session.deviceName;

        res.json({ 
          verified: true, 
          passkey: {
            id: passkey.id,
            deviceName: passkey.deviceName,
            createdAt: passkey.createdAt
          }
        });
      } else {
        res.status(400).json({ message: 'Passkey registration failed' });
      }
    } catch (error) {
      console.error('Finish passkey registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Start passkey authentication
  app.post('/api/passkeys/authenticate/start', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const { purpose } = startPasskeyAuthenticationSchema.parse(req.body);
      
      // Get user's passkeys
      const userPasskeys = await storage.getUserPasskeys(userId);
      if (userPasskeys.length === 0) {
        return res.status(400).json({ message: 'No passkeys registered' });
      }

      const allowCredentials = userPasskeys
        .filter(pk => pk.isActive)
        .map(pk => ({
          id: pk.credentialId,
          transports: ['internal'] as AuthenticatorTransport[]
        }));

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred'
      });

      // Store challenge and purpose in session
      (req as any).session.authChallenge = options.challenge;
      (req as any).session.authPurpose = purpose;

      res.json(options);
    } catch (error) {
      console.error('Start passkey authentication error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Finish passkey authentication
  app.post('/api/passkeys/authenticate/finish', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const expectedChallenge = (req as any).session.authChallenge;
      const purpose = (req as any).session.authPurpose;

      if (!expectedChallenge) {
        return res.status(400).json({ message: 'No authentication in progress' });
      }

      const credentialId = req.body.id;
      const passkey = await storage.getPasskeyByCredentialId(credentialId);

      if (!passkey || passkey.userId !== userId || !passkey.isActive) {
        return res.status(400).json({ message: 'Invalid passkey' });
      }

      // Allow both origin with and without port (browser may include :5000)
      const expectedOrigins = [origin, `${origin}:5000`];

      const verification = await verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(base64urlToBase64(passkey.publicKey), 'base64')),
          counter: passkey.counter
        }
      });

      if (verification.verified) {
        // Update counter
        await storage.updatePasskeyCounter(passkey.credentialId, verification.authenticationInfo.newCounter);

        // Clear session data
        delete (req as any).session.authChallenge;
        delete (req as any).session.authPurpose;

        // Store authentication result in session for withdrawal use
        (req as any).session.passkeyVerified = true;
        (req as any).session.passkeyVerifiedAt = Date.now();
        (req as any).session.passkeyPurpose = purpose;

        res.json({ 
          verified: true,
          purpose,
          deviceName: passkey.deviceName
        });
      } else {
        res.status(400).json({ message: 'Passkey authentication failed' });
      }
    } catch (error) {
      console.error('Finish passkey authentication error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's passkeys
  app.get('/api/user/passkeys', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const passkeys = await storage.getUserPasskeys(userId);
      
      // Don't send sensitive data to frontend
      const safePasskeys = passkeys.map(pk => ({
        id: pk.id,
        deviceName: pk.deviceName,
        isActive: pk.isActive,
        lastUsedAt: pk.lastUsedAt,
        createdAt: pk.createdAt
      }));

      res.json(safePasskeys);
    } catch (error) {
      console.error('Get user passkeys error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update a passkey
  app.put('/api/passkeys/update', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const { passkeyId, deviceName, isActive } = updatePasskeySchema.parse(req.body);
      
      // Verify the passkey belongs to the user
      const passkey = await storage.getUserPasskeys(userId);
      const targetPasskey = passkey.find(pk => pk.id === passkeyId);
      
      if (!targetPasskey) {
        return res.status(404).json({ message: 'Passkey not found' });
      }

      const updates: Partial<typeof targetPasskey> = {};
      if (deviceName !== undefined) updates.deviceName = deviceName;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedPasskey = await storage.updatePasskey(passkeyId, updates);
      
      if (updatedPasskey) {
        res.json({
          id: updatedPasskey.id,
          deviceName: updatedPasskey.deviceName,
          isActive: updatedPasskey.isActive,
          lastUsedAt: updatedPasskey.lastUsedAt,
          createdAt: updatedPasskey.createdAt
        });
      } else {
        res.status(500).json({ message: 'Failed to update passkey' });
      }
    } catch (error) {
      console.error('Update passkey error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Delete a passkey
  app.delete('/api/passkeys/:passkeyId', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const { passkeyId } = req.params;
      
      // Verify the passkey belongs to the user
      const passkeys = await storage.getUserPasskeys(userId);
      const targetPasskey = passkeys.find(pk => pk.id === passkeyId);
      
      if (!targetPasskey) {
        return res.status(404).json({ message: 'Passkey not found' });
      }

      const deleted = await storage.deletePasskey(passkeyId);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: 'Failed to delete passkey' });
      }
    } catch (error) {
      console.error('Delete passkey error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin Passkey Management Routes
  // Get passkeys for a specific user (admin only)
  app.get('/api/admin/users/:userId/passkeys', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const passkeys = await storage.getUserPasskeys(userId);
      
      // Return full passkey info for admin
      const adminPasskeys = passkeys.map(pk => ({
        id: pk.id,
        userId: pk.userId,
        credentialId: pk.credentialId,
        deviceName: pk.deviceName,
        isActive: pk.isActive,
        lastUsedAt: pk.lastUsedAt,
        createdAt: pk.createdAt,
        counter: pk.counter
      }));
      
      res.json(adminPasskeys);
    } catch (error) {
      console.error('Get user passkeys (admin) error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Start passkey registration for a user (admin only)
  app.post('/api/admin/users/:userId/passkeys/start-registration', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceName } = req.body;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user's existing passkeys for excludeCredentials
      const existingPasskeys = await storage.getUserPasskeys(userId);
      const excludeCredentials = existingPasskeys.map(pk => ({
        id: pk.credentialId,
        transports: ['internal', 'hybrid'] as AuthenticatorTransport[]
      }));

      // Generate registration options
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new Uint8Array(Buffer.from(user.id, 'utf8')),
        userName: user.email,
        userDisplayName: user.email,
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
        attestationType: 'none',
      });

      // Store challenge in session for this user
      (req as any).session[`regChallenge_${userId}`] = options.challenge;

      res.json({
        registrationOptions: options,
        userEmail: user.email,
        deviceName: deviceName || 'New Device',
        instructions: 'Share these registration options with the user so they can complete passkey setup on their device.'
      });
    } catch (error) {
      console.error('Start admin passkey registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Complete passkey registration for a user (admin only)
  app.post('/api/admin/users/:userId/passkeys/finish-registration', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { deviceName, registrationResponse } = req.body;
      
      const expectedChallenge = (req as any).session[`regChallenge_${userId}`];
      if (!expectedChallenge) {
        return res.status(400).json({ message: 'No registration in progress for this user' });
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const counter = 0; // Initial counter value for new passkeys
        const credentialID = credential.id;
        const credentialPublicKey = credential.publicKey;

        // Store the passkey with domain information
        const passkey = await storage.createPasskey({
          userId,
          credentialId: Buffer.from(credentialID).toString('base64url'),
          publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          deviceName: deviceName || 'New Device',
          counter,
          rpId: rpID,
          origin: origin,
          isActive: true,
          isDomainMismatch: false
        });

        // Clear session data
        delete (req as any).session[`regChallenge_${userId}`];

        res.json({
          success: true,
          passkey: {
            id: passkey.id,
            deviceName: passkey.deviceName,
            createdAt: passkey.createdAt
          }
        });
      } else {
        res.status(400).json({ message: 'Passkey registration failed' });
      }
    } catch (error) {
      console.error('Finish admin passkey registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete passkey for any user (admin only)
  app.delete('/api/admin/passkeys/:passkeyId', requireAdmin, async (req, res) => {
    try {
      const { passkeyId } = req.params;
      
      // Get the passkey first to verify it exists
      const allUsers = await storage.getAllUsers();
      let targetPasskey = null;
      let targetUser = null;
      
      for (const user of allUsers.users) {
        const userPasskeys = await storage.getUserPasskeys(user.id);
        const passkey = userPasskeys.find(pk => pk.id === passkeyId);
        if (passkey) {
          targetPasskey = passkey;
          targetUser = user;
          break;
        }
      }
      
      if (!targetPasskey) {
        return res.status(404).json({ message: 'Passkey not found' });
      }

      const deleted = await storage.deletePasskey(passkeyId);
      
      if (deleted) {
        res.json({ 
          success: true, 
          deletedPasskey: {
            id: targetPasskey.id,
            userId: targetPasskey.userId,
            deviceName: targetPasskey.deviceName,
            userEmail: targetUser?.email
          }
        });
      } else {
        res.status(500).json({ message: 'Failed to delete passkey' });
      }
    } catch (error) {
      console.error('Admin delete passkey error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get domain migration status (admin only)
  app.get('/api/admin/passkeys/domain-status', requireAdmin, async (req, res) => {
    try {
      const allPasskeys = await storage.getAllActivePasskeys();
      const currentDomain = rpID;
      
      const compatible = allPasskeys.filter(pk => pk.rpId === currentDomain);
      const incompatible = allPasskeys.filter(pk => pk.rpId !== currentDomain);
      const unknown = incompatible.filter(pk => !pk.rpId || pk.rpId === 'unknown');
      
      // Group incompatible passkeys by domain
      const domainGroups = new Map<string, number>();
      incompatible.forEach(pk => {
        const domain = pk.rpId || 'unknown';
        domainGroups.set(domain, (domainGroups.get(domain) || 0) + 1);
      });
      
      res.json({
        currentDomain,
        totalPasskeys: allPasskeys.length,
        compatible: {
          count: compatible.length,
          passkeys: compatible.map(pk => ({
            id: pk.id,
            userId: pk.userId,
            deviceName: pk.deviceName,
            rpId: pk.rpId,
            origin: pk.origin,
            createdAt: pk.createdAt
          }))
        },
        incompatible: {
          count: incompatible.length,
          domains: Array.from(domainGroups.entries()).map(([domain, count]) => ({ domain, count })),
          passkeys: incompatible.map(pk => ({
            id: pk.id,
            userId: pk.userId,
            deviceName: pk.deviceName,
            rpId: pk.rpId,
            origin: pk.origin,
            createdAt: pk.createdAt
          }))
        },
        unknownDomain: {
          count: unknown.length
        }
      });
    } catch (error) {
      console.error('Get domain status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Bulk deactivate domain-mismatched passkeys (admin only)
  app.post('/api/admin/passkeys/bulk-deactivate-mismatched', requireAdmin, async (req, res) => {
    try {
      const allPasskeys = await storage.getAllActivePasskeys();
      const currentDomain = rpID;
      
      const incompatiblePasskeys = allPasskeys.filter(pk => pk.rpId !== currentDomain);
      
      if (incompatiblePasskeys.length === 0) {
        return res.json({
          success: true,
          message: 'No domain-mismatched passkeys found',
          deactivatedCount: 0
        });
      }
      
      let deactivatedCount = 0;
      const deactivatedPasskeys = [];
      
      for (const passkey of incompatiblePasskeys) {
        const updated = await storage.updatePasskey(passkey.id, {
          isActive: false,
          isDomainMismatch: true
        });
        
        if (updated) {
          deactivatedCount++;
          deactivatedPasskeys.push({
            id: passkey.id,
            userId: passkey.userId,
            deviceName: passkey.deviceName,
            rpId: passkey.rpId
          });
        }
      }
      
      console.log(`✅ Deactivated ${deactivatedCount} domain-mismatched passkeys`);
      
      res.json({
        success: true,
        message: `Successfully deactivated ${deactivatedCount} domain-mismatched passkeys`,
        deactivatedCount,
        currentDomain,
        deactivatedPasskeys
      });
    } catch (error) {
      console.error('Bulk deactivate mismatched passkeys error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Golden Live endpoints
  app.get('/api/golden-live/stats', async (req, res) => {
    try {
      const stats = await storage.getGoldenLiveStats();
      if (!stats) {
        return res.status(404).json({ message: 'Golden Live stats not found' });
      }
      res.json(stats);
    } catch (error) {
      console.error('Get Golden Live stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/golden-live/events', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getGoldenLiveEvents(limit);
      res.json(events);
    } catch (error) {
      console.error('Get Golden Live events error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/golden-live/update-active-players', async (req, res) => {
    try {
      const { count } = req.body;
      if (typeof count !== 'number' || count < 0) {
        return res.status(400).json({ message: 'Invalid active player count' });
      }
      
      const updatedStats = await storage.updateActivePlayersCount(count);
      if (!updatedStats) {
        return res.status(404).json({ message: 'Golden Live stats not found' });
      }
      
      // Broadcast the updated stats to all connected clients
      broadcastToClients({
        type: 'goldenLiveUpdate',
        stats: updatedStats
      });
      
      res.json(updatedStats);
    } catch (error) {
      console.error('Update active players error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/golden-live/increment-total', requireAdmin, async (req, res) => {
    try {
      const updatedStats = await storage.incrementTotalPlayersBy28();
      if (!updatedStats) {
        return res.status(404).json({ message: 'Golden Live stats not found' });
      }
      
      // Broadcast the updated stats to all connected clients
      broadcastToClients({
        type: 'goldenLiveUpdate',
        stats: updatedStats
      });
      
      res.json(updatedStats);
    } catch (error) {
      console.error('Increment total players error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/golden-live/set-total', requireAdmin, async (req, res) => {
    try {
      const { total } = req.body;
      if (typeof total !== 'number' || total < 0) {
        return res.status(400).json({ message: 'Invalid total value' });
      }
      
      const updatedStats = await storage.updateGoldenLiveStats({ totalPlayers: total });
      if (!updatedStats) {
        return res.status(404).json({ message: 'Golden Live stats not found' });
      }
      
      // Broadcast the updated stats to all connected clients
      broadcastToClients({
        type: 'goldenLiveUpdate',
        stats: updatedStats
      });
      
      console.log(`📊 [Golden Live] Total players manually set to: ${total}`);
      
      res.json(updatedStats);
    } catch (error) {
      console.error('Set total players error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Notification endpoints
  app.post('/api/notifications/send', requireAdmin, async (req, res) => {
    try {
      const session = (req as any).session;
      const admin = await storage.getUser(session.userId);
      if (!admin) {
        return res.status(401).json({ message: 'Admin not found' });
      }

      const validation = sendNotificationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid notification data', 
          errors: validation.error.errors 
        });
      }

      const { userId: userIdentifier, title, message, type, imageUrl } = validation.data;

      if (userIdentifier) {
        // Send to specific user - resolve identifier to user
        let targetUser = await storage.getUserByPublicIdOrEmail(userIdentifier);
        if (!targetUser) {
          // Try getting by ID directly
          targetUser = await storage.getUser(userIdentifier);
        }
        
        if (!targetUser) {
          return res.status(404).json({ 
            message: 'User not found', 
            details: 'No user found with that ID or email' 
          });
        }

        const notification = await storage.createNotification({
          userId: targetUser.id,
          title: title || "Notification",
          message,
          type: type || "info",
          imageUrl: imageUrl || null,
          sentBy: admin.id
        });
        
        // Send PWA push notification
        try {
          const userSubscriptions = await storage.getUserPushSubscriptions(targetUser.id);
          console.log(`🔔 [Notification] Found ${userSubscriptions.length} push subscriptions for user ${targetUser.email}`);
          
          if (userSubscriptions.length === 0) {
            console.log(`⚠️ [Notification] User ${targetUser.email} has no active push subscriptions`);
          }
          
          const pushPromises = userSubscriptions.map(async (sub, index) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dhKey,
                auth: sub.authKey
              }
            };
            
            const payload = JSON.stringify({
              title,
              message,
              type: type || "info",
              imageUrl: imageUrl || null,
              notificationId: notification.id,
              url: '/'
            });
            
            console.log(`🔔 [Notification] Sending push ${index + 1}/${userSubscriptions.length} to endpoint: ${sub.endpoint.substring(0, 50)}...`);
            
            return webPush.sendNotification(pushSubscription, payload)
              .then(() => {
                console.log(`✅ [Notification] Push ${index + 1} sent successfully`);
              })
              .catch(error => {
                console.error(`❌ [Notification] Failed to send push ${index + 1} to endpoint:`, sub.endpoint.substring(0, 50), error.message);
                if (error.statusCode === 410) {
                  console.log(`🗑️ [Notification] Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
                  storage.deletePushSubscription(sub.endpoint);
                }
              });
          });
          
          await Promise.all(pushPromises);
          console.log(`✅ [Notification] All push notifications processed for user ${targetUser.email}`);
        } catch (pushError) {
          console.error('❌ [Notification] Error sending push notifications:', pushError);
        }
        
        res.json({ success: true, notification, targetUser: { id: targetUser.id, email: targetUser.email } });
      } else {
        // Send to all users
        const allUsers = await storage.getAllUsers();
        const notifications = [];
        
        for (const user of allUsers.users) {
          const notification = await storage.createNotification({
            userId: user.id,
            title: title || "Notification",
            message,
            type: type || "info",
            imageUrl: imageUrl || null,
            sentBy: admin.id
          });
          notifications.push(notification);
        }
        
        // Send PWA push notifications to all users
        try {
          const allSubscriptions = await storage.getAllActivePushSubscriptions();
          console.log(`🔔 [Notification] Broadcasting to ${allSubscriptions.length} active push subscriptions`);
          
          if (allSubscriptions.length === 0) {
            console.log(`⚠️ [Notification] No active push subscriptions found for broadcast`);
          }
          
          const pushPromises = allSubscriptions.map(async (sub, index) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dhKey,
                auth: sub.authKey
              }
            };
            
            const payload = JSON.stringify({
              title,
              message,
              type: type || "info",
              imageUrl: imageUrl || null,
              url: '/'
            });
            
            console.log(`🔔 [Notification] Broadcasting push ${index + 1}/${allSubscriptions.length} to endpoint: ${sub.endpoint.substring(0, 50)}...`);
            
            return webPush.sendNotification(pushSubscription, payload)
              .then(() => {
                console.log(`✅ [Notification] Broadcast ${index + 1} sent successfully`);
              })
              .catch(error => {
                console.error(`❌ [Notification] Failed to send broadcast ${index + 1} to endpoint:`, sub.endpoint.substring(0, 50), error.message);
                if (error.statusCode === 410) {
                  console.log(`🗑️ [Notification] Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
                  storage.deletePushSubscription(sub.endpoint);
                }
              });
          });
          
          await Promise.all(pushPromises);
          console.log(`✅ [Notification] All broadcast notifications processed (${allSubscriptions.length} total)`);
        } catch (pushError) {
          console.error('❌ [Notification] Error sending push notifications to all users:', pushError);
        }
        
        // Broadcast to all users (safe for broadcast-to-all scenario)
        broadcastToClients({
          type: 'notificationsRefresh',
          message: 'New notification available'
        });
        
        res.json({ success: true, count: notifications.length });
      }
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const notifications = await storage.getUserNotifications(session.userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/notifications/unread', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const notifications = await storage.getUnreadNotifications(session.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Get unread notifications error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/notifications/mark-read', requireAuth, async (req, res) => {
    try {
      const validation = markNotificationReadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const { notificationId } = validation.data;
      const notification = await storage.markNotificationRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json({ success: true, notification });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      await storage.markAllNotificationsRead(session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Push notification endpoints
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post('/api/push/subscribe', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const validation = subscribeToPushSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid subscription data', 
          errors: validation.error.errors 
        });
      }

      const { endpoint, keys } = validation.data;
      const userAgent = req.headers['user-agent'] || 'Unknown';

      await storage.createPushSubscription({
        userId: session.userId,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent,
        isActive: true
      });

      res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (error) {
      console.error('Push subscription error:', error);
      res.status(500).json({ message: 'Failed to subscribe to push notifications' });
    }
  });

  app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
    try {
      const validation = unsubscribeFromPushSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const { endpoint } = validation.data;
      await storage.deletePushSubscription(endpoint);

      res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ message: 'Failed to unsubscribe from push notifications' });
    }
  });

  // Test push notification endpoint
  app.post('/api/push/test', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const user = await storage.getUser(session.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`🧪 [Push Test] Testing push notification for user ${user.email}`);
      
      const userSubscriptions = await storage.getUserPushSubscriptions(session.userId);
      console.log(`🧪 [Push Test] Found ${userSubscriptions.length} subscriptions`);

      if (userSubscriptions.length === 0) {
        return res.status(400).json({ 
          message: 'No push subscriptions found. Please enable notifications first.',
          subscribed: false
        });
      }

      const title = '🧪 Test Notification';
      const message = 'This is a test push notification. If you see this, push notifications are working!';

      let successCount = 0;
      let errorCount = 0;

      for (const sub of userSubscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey
          }
        };

        const payload = JSON.stringify({
          title,
          message,
          type: 'info',
          url: '/'
        });

        try {
          await webPush.sendNotification(pushSubscription, payload);
          console.log(`✅ [Push Test] Notification sent successfully to ${sub.endpoint.substring(0, 50)}...`);
          successCount++;
        } catch (error: any) {
          console.error(`❌ [Push Test] Failed to send notification:`, error.message);
          errorCount++;
          
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`🗑️ [Push Test] Removing expired subscription`);
            await storage.deletePushSubscription(sub.endpoint);
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Sent ${successCount} notification(s), ${errorCount} failed`,
        subscribed: true,
        totalSubscriptions: userSubscriptions.length,
        successCount,
        errorCount
      });
    } catch (error) {
      console.error('❌ [Push Test] Error:', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  });

  // Promo code endpoints
  app.post('/api/admin/promo-codes', requireAdmin, async (req, res) => {
    try {
      const { createPromoCodeSchema } = await import('@shared/schema');
      const validation = createPromoCodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const session = (req as any).session;
      const promoCode = await storage.createPromoCode({
        ...validation.data,
        createdBy: session.userId,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : null,
      });

      await storage.logAdminAction({
        adminId: session.userId,
        action: 'create_promo_code',
        targetId: promoCode.id,
        details: { code: promoCode.code, totalValue: promoCode.totalValue },
      });

      res.json({ success: true, promoCode });
    } catch (error) {
      console.error('Create promo code error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/promo-codes', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await storage.getAllPromoCodes(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get promo codes error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/admin/promo-codes/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean' });
      }

      const updated = await storage.updatePromoCodeStatus(id, isActive);
      if (!updated) {
        return res.status(404).json({ message: 'Promo code not found' });
      }

      const session = (req as any).session;
      await storage.logAdminAction({
        adminId: session.userId,
        action: isActive ? 'activate_promo_code' : 'deactivate_promo_code',
        targetId: id,
        details: { code: updated.code },
      });

      res.json({ success: true, promoCode: updated });
    } catch (error) {
      console.error('Update promo code status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/promo-codes/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePromoCode(id);

      if (!success) {
        return res.status(404).json({ message: 'Promo code not found' });
      }

      const session = (req as any).session;
      await storage.logAdminAction({
        adminId: session.userId,
        action: 'delete_promo_code',
        targetId: id,
        details: {},
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete promo code error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/promo-codes/redeem', requireAuth, async (req, res) => {
    try {
      const { redeemPromoCodeSchema } = await import('@shared/schema');
      const validation = redeemPromoCodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const session = (req as any).session;
      const result = await storage.redeemPromoCode(validation.data.code, session.userId);

      if (!result.success) {
        return res.status(400).json({ message: result.reason });
      }

      // Get updated user balance
      const user = await storage.getUser(session.userId);
      
      res.json({ 
        success: true, 
        amountAwarded: result.amountAwarded,
        newBalance: user?.balance 
      });
    } catch (error) {
      console.error('Redeem promo code error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/promo-codes/my-redemptions', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const redemptions = await storage.getUserPromoCodeRedemptions(session.userId);
      res.json(redemptions);
    } catch (error) {
      console.error('Get user promo code redemptions error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // VIP Level Telegram Links routes
  app.get('/api/vip-telegram-links', async (req, res) => {
    try {
      const links = await storage.getAllVipLevelTelegramLinks();
      res.json(links);
    } catch (error) {
      console.error('Get VIP telegram links error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user's VIP level Telegram link
  app.get('/api/user/vip-telegram-link', requireAuth, async (req, res) => {
    try {
      const session = (req as any).session;
      const user = await storage.getUser(session.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const link = await storage.getVipLevelTelegramLink(user.vipLevel);
      
      if (!link || !link.isActive) {
        return res.json({ telegramLink: null });
      }

      res.json({ 
        telegramLink: link.telegramLink,
        description: link.description,
        vipLevel: user.vipLevel
      });
    } catch (error) {
      console.error('Get user VIP telegram link error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/vip-telegram-links', requireAdmin, async (req, res) => {
    try {
      const links = await storage.getAllVipLevelTelegramLinks();
      // Transform array to key-value object for frontend
      const linksMap = links.reduce((acc, link) => {
        acc[link.vipLevel] = link.telegramLink || '';
        return acc;
      }, {} as Record<string, string>);
      res.json(linksMap);
    } catch (error) {
      console.error('Get VIP telegram links error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/vip-telegram-links', requireAdmin, async (req, res) => {
    try {
      const { upsertVipLevelTelegramLinkSchema } = await import('@shared/schema');
      const validation = upsertVipLevelTelegramLinkSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validation.error.errors 
        });
      }

      const session = (req as any).session;
      const link = await storage.upsertVipLevelTelegramLink({
        ...validation.data,
        updatedBy: session.userId
      });

      await storage.logAdminAction({
        adminId: session.userId,
        action: 'update_vip_telegram_link',
        targetId: link.id,
        details: { 
          vipLevel: link.vipLevel,
          telegramLink: link.telegramLink,
          description: link.description 
        },
      });

      res.json({ success: true, link });
    } catch (error) {
      console.error('Upsert VIP telegram link error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/admin/vip-telegram-links/:vipLevel', requireAdmin, async (req, res) => {
    try {
      const { vipLevel } = req.params;
      const { telegramLink } = req.body;
      
      // Validate VIP level
      const validLevels = ['lv1', 'lv2', 'vip', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5', 'vip6', 'vip7'] as const;
      if (!validLevels.includes(vipLevel as any)) {
        return res.status(400).json({ message: 'Invalid VIP level' });
      }
      
      // Validate telegram link (optional, can be empty to clear)
      if (telegramLink && typeof telegramLink !== 'string') {
        return res.status(400).json({ message: 'Telegram link must be a string' });
      }
      
      const session = (req as any).session;
      const link = await storage.upsertVipLevelTelegramLink({
        vipLevel: vipLevel as typeof validLevels[number],
        telegramLink: telegramLink || '',
        description: `Exclusive Telegram channel for ${vipLevel.toUpperCase()} members`,
        isActive: true,
        updatedBy: session.userId
      });

      await storage.logAdminAction({
        adminId: session.userId,
        action: 'update_vip_telegram_link',
        targetId: link.id,
        details: { 
          vipLevel: link.vipLevel,
          telegramLink: link.telegramLink 
        },
      });

      res.json({ success: true, link });
    } catch (error) {
      console.error('Update VIP telegram link error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Database connection routes
  app.get('/api/admin/database-connections', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await storage.getAllDatabaseConnections(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get database connections error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections', requireAdmin, async (req, res) => {
    try {
      const session = (req as any).session;
      const { setAsPrimary, enableRealtimeSync, ...connectionData } = req.body;
      
      const connection = await storage.createDatabaseConnection({
        ...connectionData,
        createdBy: session.userId
      });

      await storage.logAdminAction({
        adminId: session.userId,
        action: 'create_database_connection',
        targetId: connection.id,
        details: { name: connection.name, host: connection.host, setAsPrimary, enableRealtimeSync },
      });

      const { multiDatabaseService } = await import('./multi-database-service');
      
      console.log(`[DB Setup] Testing connection to ${connection.name}...`);
      const testResult = await multiDatabaseService.testConnection(connection);
      
      await storage.updateDatabaseConnection(connection.id, {
        lastTestAt: new Date(),
        connectionStatus: testResult.message,
        updatedBy: session.userId
      });

      if (!testResult.success) {
        return res.json({ 
          success: false, 
          connection,
          testResult,
          message: `Connection created but test failed: ${testResult.message}. Please check your connection settings.`
        });
      }

      console.log(`[DB Setup] Connection test successful! Starting data sync...`);
      
      const syncResult = await multiDatabaseService.syncDataToExternalDatabase(
        connection,
        (status, progress) => {
          console.log(`[DB Setup] Sync progress: ${status} (${progress}%)`);
        }
      );

      if (syncResult.success) {
        const updates: any = {
          lastSyncAt: new Date(),
          status: 'active',
          updatedBy: session.userId
        };

        if (setAsPrimary) {
          updates.isActive = true;
          console.log(`[DB Setup] 🎯 Setting ${connection.name} as PRIMARY database...`);
        }

        await storage.updateDatabaseConnection(connection.id, updates);

        if (setAsPrimary) {
          await storage.setActiveDatabaseConnection(connection.id);
          console.log(`[DB Setup] ✅ ${connection.name} is now the PRIMARY database!`);
        }

        if (enableRealtimeSync) {
          const { realtimeSyncService } = await import('./realtime-sync-service');
          await realtimeSyncService.enableForConnection(connection.id);
          console.log(`[DB Setup] ⚡ Real-time sync enabled for ${connection.name}`);
        }

        await storage.logAdminAction({
          adminId: session.userId,
          action: 'sync_database',
          targetId: connection.id,
          details: { name: connection.name, stats: syncResult.stats, setAsPrimary, enableRealtimeSync },
        });

        console.log(`[DB Setup] ✅ Database setup complete! Tables created and data synced.`);
      }

      res.json({ 
        success: true, 
        connection,
        testResult,
        syncResult,
        setAsPrimary,
        enableRealtimeSync,
        message: syncResult.success 
          ? `Successfully created ${connection.name}! All tables created and data synced automatically.${setAsPrimary ? ' Now set as PRIMARY database.' : ''}${enableRealtimeSync ? ' Real-time sync enabled.' : ''}`
          : `Connection created and tested, but sync failed: ${syncResult.message}`
      });
    } catch (error) {
      console.error('Create database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections/:id/test', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await storage.getDatabaseConnectionById(id);

      if (!connection) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      const { multiDatabaseService } = await import('./multi-database-service');
      const result = await multiDatabaseService.testConnection(connection);

      await storage.updateDatabaseConnection(id, {
        lastTestAt: new Date(),
        connectionStatus: result.message,
        updatedBy: (req as any).session.userId
      });

      res.json(result);
    } catch (error) {
      console.error('Test database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections/:id/sync', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await storage.getDatabaseConnectionById(id);

      if (!connection) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      const { multiDatabaseService } = await import('./multi-database-service');
      
      const result = await multiDatabaseService.syncDataToExternalDatabase(
        connection,
        (status, progress) => {
          console.log(`Sync progress: ${status} (${progress}%)`);
        }
      );

      if (result.success) {
        await storage.updateDatabaseConnection(id, {
          lastSyncAt: new Date(),
          updatedBy: (req as any).session.userId
        });

        await storage.logAdminAction({
          adminId: (req as any).session.userId,
          action: 'sync_database',
          targetId: id,
          details: { name: connection.name, stats: result.stats },
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Sync database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections/:id/activate', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const activated = await storage.setActiveDatabaseConnection(id);

      if (!activated) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'activate_database_connection',
        targetId: id,
        details: { name: activated.name },
      });

      res.json({ success: true, connection: activated });
    } catch (error) {
      console.error('Activate database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections/:id/set-primary', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const primary = await storage.setPrimaryDatabaseConnection(id);

      if (!primary) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'set_primary_database',
        targetId: id,
        details: { name: primary.name },
      });

      res.json({ 
        success: true, 
        connection: primary,
        message: `${primary.name} is now the primary database for the application` 
      });
    } catch (error: any) {
      console.error('Set primary database connection error:', error);
      res.status(400).json({ message: error.message || 'Internal server error' });
    }
  });

  app.post('/api/admin/database-connections/revert-to-replit-primary', requireAdmin, async (req, res) => {
    try {
      const { databaseConnections } = await import("@shared/schema");
      
      await db
        .update(databaseConnections)
        .set({ isPrimary: false, updatedAt: new Date() });

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'revert_to_replit_primary',
        targetId: null,
        details: { message: 'Reverted to Replit managed database as primary' },
      });

      res.json({ 
        success: true, 
        message: 'Replit managed database is now the primary database' 
      });
    } catch (error: any) {
      console.error('Revert to Replit primary error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  app.put('/api/admin/database-connections/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        updatedBy: (req as any).session.userId
      };

      const updated = await storage.updateDatabaseConnection(id, updates);

      if (!updated) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'update_database_connection',
        targetId: id,
        details: { name: updated.name },
      });

      res.json({ success: true, connection: updated });
    } catch (error) {
      console.error('Update database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/admin/database-connections/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await storage.getDatabaseConnectionById(id);

      if (!connection) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      if (connection.isActive) {
        return res.status(400).json({ message: 'Cannot delete active database connection' });
      }

      const success = await storage.deleteDatabaseConnection(id);

      if (!success) {
        return res.status(404).json({ message: 'Database connection not found' });
      }

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'delete_database_connection',
        targetId: id,
        details: { name: connection.name },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete database connection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Digital Ocean Integration Routes
  app.get('/api/admin/digitalocean/droplets', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.DIGITALOCEAN_API_KEY;
      
      if (!apiKey) {
        return res.json({ 
          droplets: [], 
          total: 0, 
          hasApiKey: false 
        });
      }

      const response = await fetch('https://api.digitalocean.com/v2/droplets', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Digital Ocean API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      res.json({
        droplets: data.droplets || [],
        total: data.droplets?.length || 0,
        hasApiKey: true
      });
    } catch (error) {
      console.error('Get Digital Ocean droplets error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch droplets',
        droplets: [],
        total: 0,
        hasApiKey: true
      });
    }
  });

  app.post('/api/admin/digitalocean/refresh', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.DIGITALOCEAN_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Digital Ocean API key not configured' 
        });
      }

      const response = await fetch('https://api.digitalocean.com/v2/droplets', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Digital Ocean API error: ${response.statusText}`);
      }

      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'refresh_digitalocean_droplets',
        targetId: null,
        details: { timestamp: new Date().toISOString() },
      });

      res.json({ 
        success: true, 
        message: 'Droplets refreshed successfully' 
      });
    } catch (error) {
      console.error('Refresh Digital Ocean droplets error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to refresh droplets' 
      });
    }
  });

  app.post('/api/admin/digitalocean/deploy/:dropletId', requireAdmin, async (req, res) => {
    try {
      const { dropletId } = req.params;
      const apiKey = process.env.DIGITALOCEAN_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Digital Ocean API key not configured' 
        });
      }

      // Get droplet details first
      const dropletResponse = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!dropletResponse.ok) {
        throw new Error(`Failed to get droplet details: ${dropletResponse.statusText}`);
      }

      const dropletData = await dropletResponse.json();
      const droplet = dropletData.droplet;
      const publicIp = droplet.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address;

      if (!publicIp) {
        return res.status(400).json({
          success: false,
          message: 'Droplet does not have a public IP address'
        });
      }

      // Log the deployment action
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'deploy_to_digitalocean',
        targetId: dropletId,
        details: { 
          dropletName: droplet.name,
          dropletIp: publicIp,
          timestamp: new Date().toISOString() 
        },
      });

      // Execute real deployment using deployment service
      const { deploymentService } = await import('./deployment-service');
      
      const deploymentResult = await deploymentService.deployToDroplet({
        dropletId: parseInt(dropletId),
        dropletName: droplet.name,
        ipAddress: publicIp
      });

      if (!deploymentResult.success) {
        return res.status(500).json({
          success: false,
          message: deploymentResult.message,
          error: deploymentResult.error,
          logs: deploymentResult.logs
        });
      }

      res.json({ 
        success: true, 
        message: `Successfully deployed to ${droplet.name}`,
        dropletId: dropletId,
        dropletName: droplet.name,
        logs: deploymentResult.logs
      });
    } catch (error) {
      console.error('Deploy to Digital Ocean error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deploy to server' 
      });
    }
  });

  // Setup load balancer endpoint
  app.post('/api/admin/digitalocean/setup-loadbalancer', requireAdmin, async (req, res) => {
    try {
      const apiKey = process.env.DIGITALOCEAN_API_KEY;
      const { method = 'least_conn', serverWeights = {} } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Digital Ocean API key not configured' 
        });
      }

      // Validate load balancing method
      const validMethods = ['round_robin', 'least_conn', 'ip_hash'];
      if (!validMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          message: `Invalid load balancing method. Must be one of: ${validMethods.join(', ')}`
        });
      }

      // Get all droplets
      const response = await fetch('https://api.digitalocean.com/v2/droplets', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Digital Ocean API error: ${response.statusText}`);
      }

      const data = await response.json();
      const activeDroplets = data.droplets.filter((d: any) => d.status === 'active');

      if (activeDroplets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active droplets found to setup load balancer'
        });
      }

      // Use the first droplet as the load balancer
      const primaryDroplet = activeDroplets[0];
      const primaryIp = primaryDroplet.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address;

      if (!primaryIp) {
        return res.status(400).json({
          success: false,
          message: 'Primary droplet does not have a public IP address'
        });
      }

      // Prepare backend servers list with custom weights
      const backendServers = activeDroplets.map((droplet: any, idx: number) => {
        const ip = droplet.networks?.v4?.find((n: any) => n.type === 'public')?.ip_address;
        // Use custom weight if provided, otherwise default: 1 for primary, 3 for others
        const weight = serverWeights[droplet.id] || (idx === 0 ? 1 : 3);
        return {
          ip,
          weight: parseInt(weight) || 1
        };
      }).filter((server: any) => server.ip);

      // Execute load balancer setup with method
      const { deploymentService } = await import('./deployment-service');
      
      const setupResult = await deploymentService.setupLoadBalancer(
        primaryIp,
        backendServers,
        method
      );

      // Log the action
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'setup_load_balancer',
        targetId: primaryDroplet.id.toString(),
        details: { 
          primaryServer: primaryDroplet.name,
          backendServers: backendServers.map((s: any) => s.ip),
          timestamp: new Date().toISOString() 
        },
      });

      if (!setupResult.success) {
        return res.status(500).json({
          success: false,
          message: setupResult.message,
          error: setupResult.error,
          logs: setupResult.logs
        });
      }

      res.json({
        success: true,
        message: `Load balancer configured on ${primaryDroplet.name}`,
        primaryServer: primaryDroplet.name,
        backendCount: backendServers.length,
        logs: setupResult.logs
      });
    } catch (error) {
      console.error('Setup load balancer error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to setup load balancer' 
      });
    }
  });

  // ============================================================================
  // AUTO-FIX & SELF-HEALING ENDPOINTS
  // ============================================================================

  // Get self-healing system status
  app.get('/api/admin/self-healing/status', requireAdmin, async (req, res) => {
    try {
      const { selfHealingService } = await import('./self-healing-service');
      const status = selfHealingService.getHealthStatus();
      
      res.json({
        success: true,
        status,
      });
    } catch (error) {
      console.error('Get self-healing status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Force a healing cycle
  app.post('/api/admin/self-healing/force-heal', requireAdmin, async (req, res) => {
    try {
      const { selfHealingService } = await import('./self-healing-service');
      await selfHealingService.forceHeal();
      
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'force_system_heal',
        targetId: null,
        details: { timestamp: new Date().toISOString() },
      });
      
      res.json({
        success: true,
        message: 'Healing cycle completed',
      });
    } catch (error) {
      console.error('Force heal error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get recent errors from error monitor
  app.get('/api/admin/error-monitor/errors', requireAdmin, async (req, res) => {
    try {
      const { errorMonitorService } = await import('./error-monitor-service');
      const limit = parseInt(req.query.limit as string) || 50;
      const errors = errorMonitorService.getRecentErrors(limit);
      
      res.json({
        success: true,
        errors,
      });
    } catch (error) {
      console.error('Get errors error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get data staleness monitor stats
  app.get('/api/admin/data-staleness/stats', requireAdmin, async (req, res) => {
    try {
      const { dataStalenessMonitor } = await import('./data-staleness-monitor');
      const stats = dataStalenessMonitor.getStats();
      
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Get staleness stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reset data staleness monitor stats
  app.post('/api/admin/data-staleness/reset', requireAdmin, async (req, res) => {
    try {
      const { dataStalenessMonitor } = await import('./data-staleness-monitor');
      dataStalenessMonitor.resetStats();
      
      await storage.logAdminAction({
        adminId: (req as any).session.userId,
        action: 'reset_staleness_monitor',
        targetId: null,
        details: { timestamp: new Date().toISOString() },
      });
      
      res.json({
        success: true,
        message: 'Staleness monitor stats reset',
      });
    } catch (error) {
      console.error('Reset staleness stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get LSP auto-fix history
  app.get('/api/admin/lsp-autofix/history', requireAdmin, async (req, res) => {
    try {
      const { lspAutoFixService } = await import('./lsp-autofix-service');
      const limit = parseInt(req.query.limit as string) || 50;
      const history = lspAutoFixService.getFixHistory(limit);
      
      res.json({
        success: true,
        history,
      });
    } catch (error) {
      console.error('Get LSP history error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get server usage metrics
  app.get('/api/admin/server-metrics', requireAdmin, async (req, res) => {
    try {
      const os = await import('os');
      
      // Get CPU information
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      
      // Calculate CPU usage percentage
      const cpuUsage = cpus.map((cpu, i) => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        const usage = total > 0 ? ((total - idle) / total) * 100 : 0;
        return {
          core: i,
          usage: Math.round(usage * 100) / 100
        };
      });
      
      // Calculate average CPU usage
      const avgCpuUsage = cpuUsage.reduce((acc, cpu) => acc + cpu.usage, 0) / cpuCount;
      
      // Get memory information
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      // Get system information
      const uptime = os.uptime();
      const platform = os.platform();
      const arch = os.arch();
      const hostname = os.hostname();
      const loadAvg = os.loadavg();
      
      // Format bytes to human readable
      const formatBytes = (bytes: number) => {
        const gb = bytes / (1024 ** 3);
        return `${gb.toFixed(2)} GB`;
      };
      
      res.json({
        success: true,
        metrics: {
          cpu: {
            count: cpuCount,
            model: cpus[0]?.model || 'Unknown',
            usage: Math.round(avgCpuUsage * 100) / 100,
            cores: cpuUsage,
            loadAverage: {
              '1min': Math.round(loadAvg[0] * 100) / 100,
              '5min': Math.round(loadAvg[1] * 100) / 100,
              '15min': Math.round(loadAvg[2] * 100) / 100
            }
          },
          memory: {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            usagePercent: Math.round(memoryUsagePercent * 100) / 100,
            totalFormatted: formatBytes(totalMemory),
            usedFormatted: formatBytes(usedMemory),
            freeFormatted: formatBytes(freeMemory)
          },
          system: {
            platform,
            arch,
            hostname,
            uptime: Math.floor(uptime),
            uptimeFormatted: formatUptime(uptime)
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get server metrics error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Helper function to format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }

  // Start server metrics broadcasting every 30 seconds (optimized for mobile/Android performance)
  setInterval(async () => {
    try {
      await broadcastServerMetrics();
    } catch (error) {
      console.error('Error in server metrics broadcast:', error);
    }
  }, 30000);

  // Auto-increment Golden Live total players with configurable per-hour rate
  // Defaults: 110-130 players per hour, distributed across 60 minutes for realistic growth
  // This gives daily increase of ~3000-4000 players
  let goldenLiveFractionalRemainder = 0; // Accumulate fractional increments
  let goldenLiveUpdateCount = 0; // Counter for logging
  
  async function updateGoldenLivePlayers() {
    try {
      const currentStats = await storage.getGoldenLiveStats();
      if (currentStats) {
        // Get configurable per-hour increment range from system settings
        const minPerHourSetting = await storage.getSystemSetting('golden_live_increment_min_per_hour');
        const maxPerHourSetting = await storage.getSystemSetting('golden_live_increment_max_per_hour');
        const intervalMsSetting = await storage.getSystemSetting('golden_live_increment_interval_ms');
        
        const minPerHour = minPerHourSetting?.value ? parseInt(minPerHourSetting.value) : 110;
        const maxPerHour = maxPerHourSetting?.value ? parseInt(maxPerHourSetting.value) : 130;
        const intervalMs = intervalMsSetting?.value ? parseInt(intervalMsSetting.value) : 500;
        
        // Calculate random per-hour rate
        const perHourRate = Math.random() * (maxPerHour - minPerHour) + minPerHour;
        
        // Convert per-hour to per-second, then apply interval
        const perSecondRate = perHourRate / 3600;
        
        // Calculate increment for this tick (with fractional accuracy)
        const incrementFloat = perSecondRate * (intervalMs / 1000) + goldenLiveFractionalRemainder;
        const increment = Math.floor(incrementFloat);
        goldenLiveFractionalRemainder = incrementFloat - increment; // Save remainder for next tick
        
        const newTotal = currentStats.totalPlayers + increment;
        
        await storage.updateGoldenLiveStats({
          totalPlayers: newTotal
        });
        
        // Only log every 120 updates (once per minute at 500ms intervals) to reduce console spam
        goldenLiveUpdateCount++;
        if (goldenLiveUpdateCount >= 120) {
          console.log(`📊 [Golden Live] Total players: ${newTotal}`);
          goldenLiveUpdateCount = 0;
        }
      }
    } catch (error) {
      console.error('Error updating Golden Live stats:', error);
    }
  }
  
  // Start the Golden Live update interval
  let goldenLiveInterval = setInterval(updateGoldenLivePlayers, 500); // Default 500ms
  
  // Console/Admin command to configure Golden Live increment settings
  app.post('/api/admin/golden-live/configure', requireAdmin, async (req, res) => {
    try {
      const { minPerHour, maxPerHour, intervalMs } = req.body;
      
      // Validate inputs
      if (minPerHour !== undefined && (isNaN(minPerHour) || minPerHour < 0)) {
        return res.status(400).json({ message: 'Invalid minPerHour value' });
      }
      if (maxPerHour !== undefined && (isNaN(maxPerHour) || maxPerHour < 0)) {
        return res.status(400).json({ message: 'Invalid maxPerHour value' });
      }
      if (intervalMs !== undefined && (isNaN(intervalMs) || intervalMs < 100 || intervalMs > 10000)) {
        return res.status(400).json({ message: 'Invalid intervalMs value (must be 100-10000)' });
      }
      if (minPerHour !== undefined && maxPerHour !== undefined && minPerHour > maxPerHour) {
        return res.status(400).json({ message: 'minPerHour cannot be greater than maxPerHour' });
      }
      
      // Update settings
      const adminId = (req as any).session.userId;
      const updates = [];
      if (minPerHour !== undefined) {
        await storage.upsertSystemSetting({ 
          key: 'golden_live_increment_min_per_hour', 
          value: minPerHour.toString() 
        }, adminId);
        updates.push(`Min: ${minPerHour}/hour`);
      }
      if (maxPerHour !== undefined) {
        await storage.upsertSystemSetting({ 
          key: 'golden_live_increment_max_per_hour', 
          value: maxPerHour.toString() 
        }, adminId);
        updates.push(`Max: ${maxPerHour}/hour`);
      }
      if (intervalMs !== undefined) {
        await storage.upsertSystemSetting({ 
          key: 'golden_live_increment_interval_ms', 
          value: intervalMs.toString() 
        }, adminId);
        updates.push(`Interval: ${intervalMs}ms`);
        
        // Restart interval with new timing
        clearInterval(goldenLiveInterval);
        goldenLiveInterval = setInterval(updateGoldenLivePlayers, intervalMs);
      }
      
      console.log(`⚙️  [Golden Live] Settings updated: ${updates.join(', ')}`);
      
      res.json({ 
        success: true, 
        message: 'Golden Live settings updated',
        settings: {
          minPerHour: minPerHour ?? (await storage.getSystemSetting('golden_live_increment_min_per_hour'))?.value ?? '110',
          maxPerHour: maxPerHour ?? (await storage.getSystemSetting('golden_live_increment_max_per_hour'))?.value ?? '130',
          intervalMs: intervalMs ?? (await storage.getSystemSetting('golden_live_increment_interval_ms'))?.value ?? '500'
        }
      });
    } catch (error) {
      console.error('Golden Live configure error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get current Golden Live configuration
  app.get('/api/admin/golden-live/config', requireAdmin, async (req, res) => {
    try {
      const minPerHour = (await storage.getSystemSetting('golden_live_increment_min_per_hour'))?.value ?? '110';
      const maxPerHour = (await storage.getSystemSetting('golden_live_increment_max_per_hour'))?.value ?? '130';
      const intervalMs = (await storage.getSystemSetting('golden_live_increment_interval_ms'))?.value ?? '500';
      
      const min = parseInt(minPerHour);
      const max = parseInt(maxPerHour);
      const dailyMin = min * 24;
      const dailyMax = max * 24;
      
      res.json({
        minPerHour: min,
        maxPerHour: max,
        intervalMs: parseInt(intervalMs),
        description: `Currently adding ${min}-${max} players per hour (~${dailyMin}-${dailyMax} per day), updating every ${intervalMs}ms`
      });
    } catch (error) {
      console.error('Get Golden Live config error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Support chat routes
  app.post('/api/support/chat/sessions', async (req, res) => {
    try {
      const { insertSupportChatSessionSchema } = await import("@shared/schema");
      const validation = insertSupportChatSessionSchema.parse(req.body);
      
      const session = await storage.createSupportChatSession(validation);
      
      // Broadcast new session to admin dashboard
      broadcastToClients({
        type: 'support-chat:new-session',
        session
      });
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid session data', errors: error.errors });
      } else {
        console.error('Create chat session error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/support/chat/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSupportChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Get chat session error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/support/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { insertSupportChatMessageSchema } = await import("@shared/schema");
      const validation = insertSupportChatMessageSchema.parse({
        ...req.body,
        sessionId
      });
      
      const session = await storage.getSupportChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const message = await storage.createSupportChatMessage(validation);
      
      broadcastToClients({
        type: 'support-chat:new-message',
        sessionId,
        message
      });
      
      // Forward user messages to Telegram
      if (validation.author === 'user') {
        const { forwardSupportChatMessage } = await import('./telegram');
        await forwardSupportChatMessage(
          session.sessionToken,
          session.userDisplayName,
          validation.body
        );
      }
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      } else {
        console.error('Create chat message error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/support/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const after = req.query.after ? new Date(req.query.after as string) : undefined;
      
      const messages = await storage.getSupportChatMessages(sessionId, after);
      res.json(messages);
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/support/chat/sessions/:sessionId/status', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const statusSchema = z.object({
        status: z.enum(['open', 'active', 'closed'])
      });
      const { status } = statusSchema.parse(req.body);
      
      const updates: any = { status };
      if (status === 'closed') {
        updates.closedAt = new Date();
      }
      
      const session = await storage.updateSupportChatSession(sessionId, updates);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Clean up when session is closed
      if (status === 'closed') {
        // Clean up Telegram message mappings
        const { cleanupSessionMessageMappings } = await import('./telegram');
        cleanupSessionMessageMappings(session.sessionToken);
        
        // Delete all messages for this session to ensure clean slate for next chat
        await storage.deleteSupportChatMessages(sessionId);
        
        // Broadcast session closure to all clients
        broadcastToClients({
          type: 'support-chat:session-closed',
          sessionId
        });
      }
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid status data', errors: error.errors });
      } else {
        console.error('Update session status error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/support/chat/upload-image', async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ message: 'Image data is required' });
      }
      
      if (!validatePhoto(image)) {
        return res.status(400).json({ 
          message: 'Invalid image format or size. Please use PNG, JPEG, or WebP under 5MB.' 
        });
      }
      
      res.json({ 
        url: image,
        success: true 
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/support/chat/sessions', requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const sessions = await storage.listOpenSupportSessions(limit);
      res.json(sessions);
    } catch (error) {
      console.error('List support sessions error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/support/chat/sessions/:sessionId/user', requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getSupportChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      if (!session.userId) {
        return res.status(404).json({ message: 'No user associated with this session' });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        publicId: user.publicId,
        email: user.email,
        profilePhoto: user.profilePhoto,
        vipLevel: user.vipLevel,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Get session user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/live-chat/settings', requireAdmin, async (req, res) => {
    try {
      const chatIconVisibleSetting = await storage.getSystemSetting('chat_icon_visible');
      const telegramIntegrationSetting = await storage.getSystemSetting('telegram_integration_enabled');
      const telegramSupportChatIdSetting = await storage.getSystemSetting('telegram_support_chat_id');
      
      res.json({
        chatIconVisible: chatIconVisibleSetting?.value === 'true',
        telegramIntegrationEnabled: telegramIntegrationSetting?.value === 'true',
        telegramSupportChatId: telegramSupportChatIdSetting?.value || ''
      });
    } catch (error) {
      console.error('Get live chat settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/admin/live-chat/settings', requireAdmin, async (req, res) => {
    try {
      const adminId = (req as any).session.userId;
      if (!adminId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const settingsSchema = z.object({
        chatIconVisible: z.boolean().optional(),
        telegramIntegrationEnabled: z.boolean().optional(),
        telegramSupportChatId: z.string().optional()
      });
      
      const settings = settingsSchema.parse(req.body);

      if (settings.chatIconVisible !== undefined) {
        await storage.upsertSystemSetting({
          key: 'chat_icon_visible',
          value: settings.chatIconVisible.toString(),
          description: 'Controls visibility of live chat icon for users',
          isEncrypted: false
        }, adminId);
      }

      if (settings.telegramIntegrationEnabled !== undefined) {
        await storage.upsertSystemSetting({
          key: 'telegram_integration_enabled',
          value: settings.telegramIntegrationEnabled.toString(),
          description: 'Controls whether Telegram bot receives live chat messages',
          isEncrypted: false
        }, adminId);
      }

      if (settings.telegramSupportChatId !== undefined) {
        await storage.upsertSystemSetting({
          key: 'telegram_support_chat_id',
          value: settings.telegramSupportChatId,
          description: 'Telegram chat ID where live chat messages are forwarded',
          isEncrypted: false
        }, adminId);
      }

      const chatIconVisibleSetting = await storage.getSystemSetting('chat_icon_visible');
      const telegramIntegrationSetting = await storage.getSystemSetting('telegram_integration_enabled');
      const telegramSupportChatIdSetting = await storage.getSystemSetting('telegram_support_chat_id');
      
      res.json({
        chatIconVisible: chatIconVisibleSetting?.value === 'true',
        telegramIntegrationEnabled: telegramIntegrationSetting?.value === 'true',
        telegramSupportChatId: telegramSupportChatIdSetting?.value || ''
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      } else {
        console.error('Update live chat settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/live-chat/settings', async (req, res) => {
    try {
      const chatIconVisibleSetting = await storage.getSystemSetting('chat_icon_visible');
      const telegramIntegrationSetting = await storage.getSystemSetting('telegram_integration_enabled');
      
      res.json({
        chatIconVisible: chatIconVisibleSetting?.value !== 'false',
        telegramIntegrationEnabled: telegramIntegrationSetting?.value !== 'false'
      });
    } catch (error) {
      console.error('Get live chat settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Quick reply routes
  app.get('/api/admin/quick-replies', requireAdmin, async (req, res) => {
    try {
      const quickReplies = await storage.getQuickReplies();
      res.json(quickReplies);
    } catch (error) {
      console.error('Get quick replies error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/quick-replies', requireAdmin, async (req, res) => {
    try {
      console.log('📝 [QuickReply] Create request received:', req.body);
      const { insertQuickReplySchema } = await import("@shared/schema");
      const validation = insertQuickReplySchema.parse(req.body);
      
      const adminId = (req as any).session.userId;
      console.log('👤 [QuickReply] Admin ID:', adminId);
      
      if (!adminId) {
        console.error('❌ [QuickReply] No admin ID in session');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const quickReply = await storage.createQuickReply({
        shortcut: validation.shortcut,
        message: validation.message,
        createdBy: adminId
      });
      
      console.log('✅ [QuickReply] Created successfully:', quickReply.id);
      res.json(quickReply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ [QuickReply] Validation error:', error.errors);
        return res.status(400).json({ message: 'Invalid quick reply data', errors: error.errors });
      } else if ((error as any).code === '23505') {
        console.error('❌ [QuickReply] Duplicate shortcut error');
        return res.status(409).json({ message: 'A quick reply with this shortcut already exists' });
      } else {
        console.error('❌ [QuickReply] Create error:', error);
        console.error('Error details:', {
          message: (error as any).message,
          code: (error as any).code,
          stack: (error as any).stack
        });
        return res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.patch('/api/admin/quick-replies/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateQuickReplySchema } = await import("@shared/schema");
      const validation = updateQuickReplySchema.parse(req.body);
      
      const updates: { shortcut?: string; message?: string } = {};
      if (validation.shortcut !== undefined) updates.shortcut = validation.shortcut;
      if (validation.message !== undefined) updates.message = validation.message;
      
      const updated = await storage.updateQuickReply(id, updates);
      
      if (!updated) {
        return res.status(404).json({ message: 'Quick reply not found' });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid quick reply data', errors: error.errors });
      } else if ((error as any).code === '23505') {
        res.status(409).json({ message: 'A quick reply with this shortcut already exists' });
      } else {
        console.error('Update quick reply error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/quick-replies/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteQuickReply(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Quick reply not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete quick reply error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Telegram Reactions (N1Panel) routes
  app.get('/api/admin/telegram-reactions/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getTelegramReactionSettings();
      res.json(settings || null);
    } catch (error) {
      console.error('Get Telegram reaction settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/telegram-reactions/settings', requireAdmin, async (req, res) => {
    try {
      const { updateTelegramReactionSettingSchema } = await import("@shared/schema");
      const validation = updateTelegramReactionSettingSchema.parse(req.body);
      
      const settings = await storage.createOrUpdateTelegramReactionSettings(validation);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      } else {
        console.error('Save Telegram reaction settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/admin/telegram-reactions/groups', requireAdmin, async (req, res) => {
    try {
      const groups = await storage.getAllTelegramGroups();
      res.json(groups);
    } catch (error) {
      console.error('Get Telegram groups error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/telegram-reactions/groups/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const group = await storage.getTelegramGroupById(id);
      
      if (!group) {
        return res.status(404).json({ message: 'Telegram group not found' });
      }
      
      res.json(group);
    } catch (error) {
      console.error('Get Telegram group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/telegram-reactions/groups', requireAdmin, async (req, res) => {
    try {
      const { insertTelegramGroupSchema } = await import("@shared/schema");
      const validation = insertTelegramGroupSchema.parse(req.body);
      
      const group = await storage.createTelegramGroup(validation);
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid group data', errors: error.errors });
      } else if ((error as any).code === '23505') {
        res.status(409).json({ message: 'A group with this Telegram ID already exists' });
      } else {
        console.error('Create Telegram group error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.patch('/api/admin/telegram-reactions/groups/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateTelegramGroupSchema } = await import("@shared/schema");
      const validation = updateTelegramGroupSchema.parse(req.body);
      
      const updated = await storage.updateTelegramGroup(id, validation);
      
      if (!updated) {
        return res.status(404).json({ message: 'Telegram group not found' });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid group data', errors: error.errors });
      } else {
        console.error('Update Telegram group error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/telegram-reactions/groups/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTelegramGroup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Telegram group not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete Telegram group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/telegram-reactions/orders', requireAdmin, async (req, res) => {
    try {
      const { groupId, limit } = req.query;
      const orders = await storage.getAllTelegramReactionOrders(
        groupId as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(orders);
    } catch (error) {
      console.error('Get Telegram reaction orders error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/telegram-reactions/orders', requireAdmin, async (req, res) => {
    try {
      const { insertTelegramReactionOrderSchema } = await import("@shared/schema");
      const validation = insertTelegramReactionOrderSchema.parse(req.body);
      
      const order = await storage.createTelegramReactionOrder(validation);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid order data', errors: error.errors });
      } else {
        console.error('Create Telegram reaction order error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/admin/telegram-reactions/services', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getTelegramReactionSettings();
      
      if (!settings || !settings.apiKey) {
        return res.status(400).json({ message: 'N1Panel API key not configured' });
      }
      
      const { createN1PanelService } = await import("./n1panel-service");
      const n1panel = createN1PanelService(settings.apiUrl, settings.apiKey);
      
      const services = await n1panel.getTelegramServices();
      res.json(services);
    } catch (error) {
      console.error('Fetch N1Panel services error:', error);
      res.status(500).json({ message: 'Failed to fetch services from N1Panel' });
    }
  });

  app.get('/api/admin/telegram-reactions/balance', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getTelegramReactionSettings();
      
      if (!settings || !settings.apiKey) {
        return res.status(400).json({ message: 'N1Panel API key not configured' });
      }
      
      const { createN1PanelService } = await import("./n1panel-service");
      const n1panel = createN1PanelService(settings.apiUrl, settings.apiKey);
      
      const balance = await n1panel.getBalance();
      res.json(balance);
    } catch (error) {
      console.error('Fetch N1Panel balance error:', error);
      res.status(500).json({ message: 'Failed to fetch balance from N1Panel' });
    }
  });

  app.get('/api/admin/n1panel-orders', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const orders = await storage.getAllN1PanelOrders(limit);
      res.json({ orders });
    } catch (error) {
      console.error('Fetch N1Panel orders error:', error);
      res.status(500).json({ message: 'Failed to fetch N1Panel orders' });
    }
  });

  app.get('/api/admin/n1panel-auto-reaction/settings', requireAdmin, async (req, res) => {
    try {
      const enabledSetting = await storage.getSystemSetting('n1panel_auto_reaction_enabled');
      const channelIdSetting = await storage.getSystemSetting('n1panel_reaction_channel_id');
      const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
      const serviceIdSetting = await storage.getSystemSetting('n1panel_reaction_service_id');
      const minQuantitySetting = await storage.getSystemSetting('n1panel_reaction_min_quantity');
      const maxQuantitySetting = await storage.getSystemSetting('n1panel_reaction_max_quantity');

      res.json({
        enabled: enabledSetting?.value === 'true',
        channelId: channelIdSetting?.value || '',
        channelUsername: channelUsernameSetting?.value || '',
        serviceId: serviceIdSetting?.value || '',
        minQuantity: minQuantitySetting?.value || '20',
        maxQuantity: maxQuantitySetting?.value || '50',
      });
    } catch (error) {
      console.error('Fetch N1Panel auto-reaction settings error:', error);
      res.status(500).json({ message: 'Failed to fetch auto-reaction settings' });
    }
  });

  app.post('/api/admin/n1panel-auto-reaction/settings', requireAdmin, async (req, res) => {
    try {
      const { enabled, channelId, channelUsername, serviceId, minQuantity, maxQuantity } = req.body;

      await storage.upsertSystemSetting({ key: 'n1panel_auto_reaction_enabled', value: String(enabled) }, 'admin');
      await storage.upsertSystemSetting({ key: 'n1panel_reaction_channel_id', value: channelId }, 'admin');
      await storage.upsertSystemSetting({ key: 'n1panel_channel_username', value: channelUsername }, 'admin');
      await storage.upsertSystemSetting({ key: 'n1panel_reaction_service_id', value: serviceId }, 'admin');
      await storage.upsertSystemSetting({ key: 'n1panel_reaction_min_quantity', value: String(minQuantity) }, 'admin');
      await storage.upsertSystemSetting({ key: 'n1panel_reaction_max_quantity', value: String(maxQuantity) }, 'admin');

      const { initializeAutoReaction } = await import('./n1panel-auto-reaction');
      await initializeAutoReaction();

      res.json({
        success: true,
        message: 'Auto-reaction settings saved successfully',
      });
    } catch (error) {
      console.error('Save N1Panel auto-reaction settings error:', error);
      res.status(500).json({ message: 'Failed to save auto-reaction settings' });
    }
  });

  // Telegram Signals routes
  app.get('/api/admin/telegram-signals', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const signals = await storage.getAllTelegramSignals(limit);
      res.json(signals);
    } catch (error) {
      console.error('Get telegram signals error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/telegram-signals/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const signal = await storage.getTelegramSignalById(id);
      
      if (!signal) {
        return res.status(404).json({ message: 'Telegram signal not found' });
      }
      
      res.json(signal);
    } catch (error) {
      console.error('Get telegram signal error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/telegram-signals/send', requireAdmin, async (req, res) => {
    try {
      const { gameId, duration, colour } = req.body;
      
      if (!gameId || !duration || !colour) {
        return res.status(400).json({ message: 'gameId, duration, and colour are required' });
      }
      
      // Get signal chat ID from settings
      const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
      if (!signalChatIdSetting || !signalChatIdSetting.value) {
        return res.status(400).json({ message: 'Telegram signal chat ID not configured' });
      }
      
      // Send telegram signal
      const { sendTelegramSignal } = await import('./telegram');
      const messageId = await sendTelegramSignal(gameId, duration, colour, signalChatIdSetting.value);
      
      if (!messageId) {
        return res.status(500).json({ message: 'Failed to send telegram signal' });
      }
      
      // Save signal to database
      const { insertTelegramSignalSchema } = await import('@shared/schema');
      const validation = insertTelegramSignalSchema.parse({
        gameId,
        duration,
        colour,
        chatId: signalChatIdSetting.value,
      });
      
      const signal = await storage.createTelegramSignal(validation);
      
      // Update with message ID and sent status
      const updated = await storage.updateTelegramSignal(signal.id, {
        messageId,
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid signal data', errors: error.errors });
      } else {
        console.error('Send telegram signal error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/telegram-signals/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTelegramSignal(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Telegram signal not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete telegram signal error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Betting tasks routes
  app.get('/api/betting-tasks', requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getActiveBettingTasks();
      const userId = (req as any).session.userId;
      const progress = await storage.getUserTaskProgress(userId);
      
      const tasksWithProgress = tasks.map(task => {
        const userProgress = progress.find(p => p.taskId === task.id);
        return {
          ...task,
          coinReward: (Math.floor(parseFloat(task.coinReward) * 100)).toString(),
          userProgress: userProgress ? {
            betAccumulated: userProgress.betAccumulated,
            isCompleted: userProgress.isCompleted,
            claimedAt: userProgress.claimedAt
          } : null
        };
      });
      
      res.json(tasksWithProgress);
    } catch (error) {
      console.error('Get betting tasks error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/betting-tasks/:taskId/claim', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = (req as any).session.userId;
      
      const result = await storage.claimTaskReward(userId, taskId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully claimed ${result.reward} coins`,
        reward: result.reward 
      });
    } catch (error) {
      console.error('Claim task reward error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin betting tasks routes
  app.get('/api/admin/betting-tasks', requireAdmin, async (req, res) => {
    try {
      const tasks = await storage.getAllBettingTasks();
      res.json(tasks);
    } catch (error) {
      console.error('Get all betting tasks error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/admin/betting-tasks', requireAdmin, async (req, res) => {
    try {
      const { insertBettingTaskSchema } = await import("@shared/schema");
      const validation = insertBettingTaskSchema.parse(req.body);
      
      const task = await storage.createBettingTask(validation);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid task data', errors: error.errors });
      } else {
        console.error('Create betting task error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.patch('/api/admin/betting-tasks/:taskId', requireAdmin, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { updateBettingTaskSchema } = await import("@shared/schema");
      const validation = updateBettingTaskSchema.parse(req.body);
      
      const task = await storage.updateBettingTask(taskId, validation);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid task data', errors: error.errors });
      } else {
        console.error('Update betting task error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/betting-tasks/:taskId', requireAdmin, async (req, res) => {
    try {
      const { taskId } = req.params;
      const success = await storage.deleteBettingTask(taskId);
      
      if (!success) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Delete betting task error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Crash Game System
  interface CrashGameState {
    phase: 'waiting' | 'flying' | 'crashed';
    multiplier: number;
    crashPoint?: number;
    startTime?: number;
    gameId?: string;
    players: Array<{
      userId: string;
      username: string;
      bet: number;
      cashedOut?: boolean;
      cashoutMultiplier?: number;
      autoCashout?: number;
    }>;
  }

  // Helper function to sanitize crash game state for broadcast (only fake players, NO real data)
  function getSanitizedCrashStateToBroadcast() {
    const fakePlayers = crashGameState.players.filter(p => p.userId.startsWith('fake_'));
    
    // Create completely new object without spreading (no references to original)
    const sanitized: any = {
      phase: crashGameState.phase,
      multiplier: crashGameState.multiplier,
      startTime: crashGameState.startTime,
      gameId: crashGameState.gameId,
      players: fakePlayers.map(p => ({
        username: p.username,
        bet: p.bet,
        cashedOut: p.cashedOut,
        cashoutMultiplier: p.cashoutMultiplier,
      })),
      totalPlayers: fakePlayers.length, // Only count fake players for broadcasts
    };
    
    // Only add crashPoint if game has crashed
    if (crashGameState.phase === 'crashed' && crashGameState.crashPoint) {
      sanitized.crashPoint = crashGameState.crashPoint;
    }
    
    return sanitized;
  }

  let crashGameState: CrashGameState = {
    phase: 'waiting',
    multiplier: 1.00,
    players: [],
  };

  let crashGameHistory: number[] = []; // Store last 15 crash points
  let crashGameInterval: NodeJS.Timeout | null = null;
  let crashGameTimer: NodeJS.Timeout | null = null;
  let isProcessingCashouts = false; // Prevent overlapping cashout processing
  

  // Generate random crash point (between 1.01x and 10.00x with bias towards lower values)
  function generateCrashPoint(): number {
    // Use exponential distribution for realistic crash game behavior
    const random = Math.random();
    const crashPoint = Math.max(1.01, Math.min(10, 1 / (1 - random * 0.99)));
    return Math.round(crashPoint * 100) / 100;
  }

  // Unified cash-out settlement function
  async function settleCrashCashout(userId: string, multiplier: number, betAmount: number): Promise<boolean> {
    try {
      // Skip settlement for fake players
      if (userId.startsWith('fake_')) {
        return true; // Fake players don't need real settlement
      }
      
      const winAmount = betAmount * multiplier;
      
      // Credit balance
      await storage.atomicIncrementBalance(userId, winAmount.toString());
      
      // Update bet status with proper settlement
      const bet = await storage.getUserActiveCrashBet(userId, crashGameState.gameId!);
      if (bet) {
        await storage.updateBetStatus(bet.id, 'cashed_out', winAmount.toString());
      }
      
      return true;
    } catch (error) {
      console.error(`Error settling cash-out for user ${userId}:`, error);
      return false;
    }
  }

  async function startCrashGame() {
    const crashPoint = generateCrashPoint();
    const gameId = crashGameState.gameId || `crash_${Date.now()}`;
    
    console.log(`🚀 Starting crash game ${gameId}, will crash at ${crashPoint}x`);
    
    // Only keep real players and any fake players that joined during waiting
    const allPlayers = crashGameState.players.map(p => ({ ...p, cashedOut: false }));
    
    crashGameState = {
      phase: 'flying',
      multiplier: 1.00,
      crashPoint,
      startTime: Date.now(),
      gameId,
      players: allPlayers,
    };

    // Create game in database
    try {
      await storage.createGame({
        gameId,
        gameType: 'crash',
        roundDuration: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60000),
        crashPoint: crashPoint.toString(),
      });
    } catch (error) {
      console.error('Error creating crash game in database:', error);
    }

    // Broadcast game started (with sanitized state - only fake players)
    broadcastToClients({
      type: 'crashGameStarted',
      state: getSanitizedCrashStateToBroadcast(),
    });

    // Serialized game loop - processes multiplier updates and auto cash-outs
    const gameLoop = async () => {
      if (crashGameState.phase !== 'flying') {
        return;
      }

      const elapsed = (Date.now() - (crashGameState.startTime || 0)) / 1000;
      // Exponential growth: multiplier = 1.0 * e^(0.1 * elapsed)
      const newMultiplier = Math.exp(0.1 * elapsed);
      crashGameState.multiplier = Math.round(newMultiplier * 100) / 100;

      // Process auto cash-outs sequentially (only for real players)
      for (const player of crashGameState.players) {
        if (!player.cashedOut && player.autoCashout && crashGameState.multiplier >= player.autoCashout) {
          player.cashedOut = true;
          player.cashoutMultiplier = crashGameState.multiplier;
          
          // Only settle real players (fake players auto-cashout visually only)
          if (!player.userId.startsWith('fake_')) {
            const success = await settleCrashCashout(player.userId, crashGameState.multiplier, player.bet);
            if (success) {
              console.log(`🎯 Auto cash-out: ${player.userId.slice(0, 6)} @ ${crashGameState.multiplier}x`);
            }
          }
        }
      }

      // Check if we've reached crash point
      if (crashGameState.multiplier >= crashPoint) {
        crashCrashGame();
        return;
      }

      // Broadcast updated state (sanitized - only fake players)
      broadcastToClients({
        type: 'crashGameUpdate',
        state: getSanitizedCrashStateToBroadcast(),
      });

      // Schedule next iteration
      if (crashGameState.phase === 'flying') {
        setTimeout(gameLoop, 100);
      }
    };

    // Start the game loop
    gameLoop();
  }

  async function crashCrashGame() {
    // No need to clear interval since we're using setTimeout loop
    
    console.log(`💥 Crash game crashed at ${crashGameState.multiplier}x`);
    
    crashGameState.phase = 'crashed';
    
    // Add to history (keep last 15)
    if (crashGameState.crashPoint) {
      crashGameHistory.unshift(crashGameState.crashPoint);
      if (crashGameHistory.length > 15) {
        crashGameHistory = crashGameHistory.slice(0, 15);
      }
    }
    
    // Process all uncashed out bets as losses (skip fake players)
    for (const player of crashGameState.players) {
      if (!player.cashedOut && !player.userId.startsWith('fake_')) {
        try {
          const bet = await storage.getUserActiveCrashBet(player.userId, crashGameState.gameId!);
          if (bet) {
            await storage.updateBetStatus(bet.id, 'lost', '0');
          }
        } catch (error) {
          console.error(`Error processing crash bet for user ${player.userId}:`, error);
        }
      }
    }

    // Update game in database
    try {
      if (crashGameState.gameId) {
        await storage.updateGameResult(
          crashGameState.gameId,
          Math.floor(crashGameState.crashPoint || 1),
          'red',
          'small'
        );
      }
    } catch (error) {
      console.error('Error updating crash game result:', error);
    }

    broadcastToClients({
      type: 'crashGameCrashed',
      state: getSanitizedCrashStateToBroadcast(),
    });

    // Reset after 5 seconds
    crashGameTimer = setTimeout(() => {
      const waitTime = 7000; // 7 seconds wait time
      const nextStartTime = Date.now() + waitTime;
      const gameId = `crash_${Date.now()}`;
      
      // Completely reset players
      crashGameState = {
        phase: 'waiting',
        multiplier: 1.00,
        players: [], // Fresh start with no players
        startTime: nextStartTime,
        gameId,
      };
      
      broadcastToClients({
        type: 'crashGameWaiting',
        state: getSanitizedCrashStateToBroadcast(),
      });

      // Gradually add fake players over the 7 seconds waiting time
      const numFakePlayers = Math.floor(Math.random() * 8) + 8; // 8-15 bots
      const usedNames = new Set();
      let addedFakePlayers = 0;
      
      const intervalDelay = Math.floor((waitTime - 1500) / numFakePlayers);

      const fakeUserInterval = setInterval(() => {
        if (crashGameState.phase !== 'waiting' || addedFakePlayers >= numFakePlayers) {
          clearInterval(fakeUserInterval);
          return;
        }

        let username;
        do {
          const randomPrefix = Math.floor(1000000 + Math.random() * 9000000).toString();
          username = `${randomPrefix}*****`;
        } while (usedNames.has(username));
        usedNames.add(username);
        
        const betAmount = Math.floor(Math.random() * 18) + 2; 
        const autoCashout = Math.random() > 0.4 ? (1.1 + Math.random() * 5.0) : undefined;
        
        crashGameState.players.push({
          userId: `fake_${addedFakePlayers}_${Date.now()}`,
          username,
          bet: betAmount,
          cashedOut: false,
          autoCashout: autoCashout ? Math.round(autoCashout * 100) / 100 : undefined,
        });
        
        addedFakePlayers++;
        
        broadcastToClients({
          type: 'crashGameUpdate',
          state: getSanitizedCrashStateToBroadcast(),
        });
      }, intervalDelay);

      // Start new game after wait time
      setTimeout(() => {
        clearInterval(fakeUserInterval);
        startCrashGame();
      }, waitTime);
    }, 5000);
  }

  // Crash game routes
  app.get('/api/crash/state', requireAuth, async (req, res) => {
    // Check if crash game is enabled (maintenance mode check)
    const crashEnabledSetting = await storage.getSystemSetting('crash_enabled');
    const crashEnabled = crashEnabledSetting?.value !== 'false';
    if (!crashEnabled) {
      return res.status(503).json({ message: 'Crash game is currently under maintenance' });
    }

    const userId = (req.session as any).userId!;
    
    // Only show current user's player data + fake players for live feel
    const currentUserPlayer = crashGameState.players.find(p => p.userId === userId);
    const fakePlayers = crashGameState.players.filter(p => p.userId.startsWith('fake_'));
    
    const playersToShow = [
      ...(currentUserPlayer ? [{
        username: 'You',
        bet: currentUserPlayer.bet,
        cashedOut: currentUserPlayer.cashedOut,
        cashoutMultiplier: currentUserPlayer.cashoutMultiplier,
      }] : []),
      ...fakePlayers.map(p => ({
        username: p.username, // Fake usernames are safe to show
        bet: p.bet,
        cashedOut: p.cashedOut,
        cashoutMultiplier: p.cashoutMultiplier,
      }))
    ];
    
    const sanitizedState: any = {
      phase: crashGameState.phase,
      multiplier: crashGameState.multiplier,
      startTime: crashGameState.startTime,
      gameId: crashGameState.gameId,
      players: playersToShow,
      totalPlayers: crashGameState.players.length, // Total including all real players
    };
    
    // Never expose crashPoint until game ends
    if (crashGameState.phase === 'crashed' && crashGameState.crashPoint) {
      sanitizedState.crashPoint = crashGameState.crashPoint;
    }
    
    res.json(sanitizedState);
  });

  // Crash game history endpoint
  app.get('/api/crash/history', requireAuth, async (req, res) => {
    // Check if crash game is enabled (maintenance mode check)
    const crashEnabledSetting = await storage.getSystemSetting('crash_enabled');
    const crashEnabled = crashEnabledSetting?.value !== 'false';
    if (!crashEnabled) {
      return res.status(503).json({ message: 'Crash game is currently under maintenance' });
    }

    res.json(crashGameHistory);
  });

  app.post('/api/crash/bet', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId!;
      const { amount, autoCashout } = req.body;

      // Check if crash game is enabled (maintenance mode check)
      const crashEnabledSetting = await storage.getSystemSetting('crash_enabled');
      const crashEnabled = crashEnabledSetting?.value !== 'false';
      if (!crashEnabled) {
        return res.status(503).json({ message: 'Crash game is currently under maintenance' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }

      if (crashGameState.phase !== 'waiting') {
        return res.status(400).json({ message: 'Cannot place bet while game is in progress' });
      }

      // Check if user already has a bet
      if (crashGameState.players.some(p => p.userId === userId)) {
        return res.status(400).json({ message: 'You already have a bet placed' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const balance = parseFloat(user.balance);
      if (balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Deduct balance
      const deductResult = await storage.atomicDeductBalance(userId, amount.toString());
      if (!deductResult.success) {
        return res.status(400).json({ message: deductResult.error || 'Failed to deduct balance' });
      }

      // Add player to game with anonymized username
      crashGameState.players.push({
        userId,
        username: `Player${Math.floor(Math.random() * 9000) + 1000}`, // Anonymized username
        bet: amount,
        cashedOut: false,
        autoCashout: autoCashout ? parseFloat(autoCashout) : undefined,
      });

      // Create bet in database (will be settled later)
      if (crashGameState.gameId) {
        await storage.createBet({
          userId,
          gameId: crashGameState.gameId,
          betType: 'crash',
          betValue: 'crash', // Crash game doesn't have specific bet value
          amount: amount.toString(),
          potential: (amount * 2).toString(), // Placeholder
          autoCashOut: autoCashout?.toString(),
        });
      }

      broadcastToClients({
        type: 'crashGameUpdate',
        state: getSanitizedCrashStateToBroadcast(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Crash bet error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/crash/cashout', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId!;

      // Check if crash game is enabled (maintenance mode check)
      const crashEnabledSetting = await storage.getSystemSetting('crash_enabled');
      const crashEnabled = crashEnabledSetting?.value !== 'false';
      if (!crashEnabled) {
        return res.status(503).json({ message: 'Crash game is currently under maintenance' });
      }

      if (crashGameState.phase !== 'flying') {
        return res.status(400).json({ message: 'Cannot cash out right now' });
      }

      const player = crashGameState.players.find(p => p.userId === userId);
      if (!player) {
        return res.status(400).json({ message: 'You don\'t have an active bet' });
      }

      if (player.cashedOut) {
        return res.status(400).json({ message: 'Already cashed out' });
      }

      // Update player state
      player.cashedOut = true;
      player.cashoutMultiplier = crashGameState.multiplier;

      // Use unified settlement function
      const success = await settleCrashCashout(userId, crashGameState.multiplier, player.bet);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to process cash-out' });
      }

      const winAmount = player.bet * crashGameState.multiplier;

      broadcastToClients({
        type: 'crashGameUpdate',
        state: getSanitizedCrashStateToBroadcast(),
      });

      res.json({ 
        success: true, 
        winAmount,
        multiplier: crashGameState.multiplier,
      });
    } catch (error) {
      console.error('Crash cashout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Start crash game loop
  setTimeout(() => {
    console.log('🚀 Starting crash game system...');
    startCrashGame();
  }, 2000);

  async function loadAndStartExistingGames() {
    console.log('🔍 Checking for existing active games in database...');
    
    const durations = [1, 3, 5, 10];
    for (const duration of durations) {
      try {
        const gameId = generateGameId(duration);
        
        // Check if game exists in database
        const existingGame = await storage.getGameByGameId(gameId);
        
        if (existingGame && existingGame.status === 'active') {
          console.log(`✅ Found existing active game ${gameId} in database`);
          console.log(`   Start: ${new Date(existingGame.startTime).toISOString()}`);
          console.log(`   End: ${new Date(existingGame.endTime).toISOString()}`);
          
          // Use the existing game's times to set up the timer
          const gameEndTime = new Date(existingGame.endTime);
          const now = new Date();
          
          // Only set timer if game hasn't ended yet
          if (gameEndTime > now) {
            const timerDelay = Math.max(0, gameEndTime.getTime() - now.getTime());
            console.log(`⏰ Resuming timer for ${duration}-minute game (${gameId}): ${timerDelay}ms remaining`);
            
            const timer = setTimeout(async () => {
              console.log(`⏰ Timer fired for ${duration}-minute game (${gameId})`);
              await endGame(existingGame.gameId, duration);
            }, timerDelay);
            
            // Clear existing timer for this duration before setting new one
            const existingActiveGame = activeGames.get(duration);
            if (existingActiveGame?.timer) {
              clearTimeout(existingActiveGame.timer);
              console.log(`🧹 Cleared old timer for ${duration}-minute game before resuming`);
            }
            
            activeGames.set(duration, { game: existingGame, timer });
            
            // Register period with sync service using the game's actual times
            periodSyncService.registerPeriod(
              duration, 
              gameId, 
              new Date(existingGame.startTime), 
              gameEndTime, 
              'active'
            );
            
            console.log(`✅ ${duration}-minute game timer resumed`);
          } else {
            console.log(`⚠️  Game ${gameId} has already ended, starting new game`);
            await startGame(duration);
          }
        } else {
          console.log(`📝 No existing active game found for ${duration}-minute duration, creating new game`);
          await startGame(duration);
        }
      } catch (error) {
        console.error(`❌ Error loading ${duration}-minute game:`, error);
        // Fall back to creating new game
        await startGame(duration);
      }
    }
  }

  return {
    httpServer,
    wss,
    startGames: async () => {
      // Start initial games after server is ready
      try {
        console.log('🎮 Starting game timers...');
        
        // Load existing games from database first
        await loadAndStartExistingGames();
        
        console.log('🎮 All games initialized successfully');
        
        // Start broadcasting server metrics
        console.log('📊 Starting server metrics broadcast...');
        await broadcastServerMetrics();
        console.log('✅ Server metrics broadcast started');
        
        // Start automatic bet settlement service
        console.log('🔄 Starting automatic bet settlement service...');
        betSettlementService.start();
        
        // Start automatic bet validation service
        console.log('🔍 Starting automatic bet validation service...');
        betValidationService.start();
      } catch (error) {
        console.error('❌ Error initializing games:', error);
      }
    }
  };
}
