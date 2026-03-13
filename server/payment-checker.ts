import type { IStorage } from './storage';
import { getNOWPaymentStatus } from './nowpayments';
import { vipService } from './vip-service';
import { sendDepositConfirmationEmail, sendVipLevelUpgradeEmail, sendLevelUpEmail } from './email';
import { sendTransactionPushNotification } from './routes';

// Broadcast function type
type BroadcastBalanceUpdate = (userId: string, oldBalance: string, newBalance: string, type: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'commission' | 'admin') => void;

let broadcastBalanceUpdate: BroadcastBalanceUpdate | null = null;
let checkInterval: NodeJS.Timeout | null = null;

// Payment checker status tracking
interface PaymentCheckerStatus {
  isRunning: boolean;
  lastCheckTime: string | null;
  lastCheckStats: {
    pending: number;
    completed: number;
    failed: number;
  };
  totalChecks: number;
  totalProcessed: number;
  totalFailed: number;
}

interface InternalCheckerStatus {
  isRunning: boolean;
  lastCheckTime: Date | null;
  lastCheckStats: {
    pending: number;
    completed: number;
    failed: number;
  };
  totalChecks: number;
  totalProcessed: number;
  totalFailed: number;
}

let checkerStatus: InternalCheckerStatus = {
  isRunning: false,
  lastCheckTime: null,
  lastCheckStats: {
    pending: 0,
    completed: 0,
    failed: 0,
  },
  totalChecks: 0,
  totalProcessed: 0,
  totalFailed: 0,
};

// Get current checker status (serialized for API)
export function getPaymentCheckerStatus(): PaymentCheckerStatus {
  return {
    ...checkerStatus,
    lastCheckTime: checkerStatus.lastCheckTime ? checkerStatus.lastCheckTime.toISOString() : null,
  };
}

export function setBroadcastBalanceUpdate(fn: BroadcastBalanceUpdate) {
  broadcastBalanceUpdate = fn;
}

// Process a completed payment (shared logic from webhook handler)
// IMPORTANT: This function only marks the transaction as completed AFTER successfully crediting the balance
// to prevent race conditions where a transaction is marked complete but the user doesn't get credited
export async function processCompletedPayment(
  transaction: any,
  paymentStatus: any,
  storage: IStorage,
  correlationId?: string
): Promise<boolean> {
  const logPrefix = correlationId ? `[${correlationId}]` : '[PaymentChecker]';
  
  try {
    
    // Check if transaction is already completed (idempotency)
    if (transaction.status === 'completed') {
      console.log(`⚠️  ${logPrefix} Transaction ${transaction.id.substring(0, 8)} already completed, skipping`);
      return false;
    }

    console.log(`💰 ${logPrefix} Processing payment for transaction ${transaction.id.substring(0, 8)}...`);

    // CRITICAL: Atomically update transaction status BEFORE crediting balance
    // This prevents race conditions where multiple processes try to credit the same transaction
    // Only ONE process will successfully change status from 'pending' to 'completed'
    const updatedTransaction = await storage.updateTransactionStatusConditional(
      transaction.id,
      'completed',
      'pending'
    );

    if (!updatedTransaction || updatedTransaction.status !== 'completed') {
      console.log(`⚠️  ${logPrefix} Failed to update transaction status (already processed by another process)`);
      return false;
    }

    console.log(`✅ ${logPrefix} Transaction ${transaction.id.substring(0, 8)} status locked as completed`);

    // Now proceed to credit the balance - safe from race conditions
    // Check if this is an agent self-deposit (userId === agentId)
    const isAgentSelfDeposit = transaction.agentId && transaction.userId === transaction.agentId;

    if (isAgentSelfDeposit) {
      // Handle agent self-deposit - credit agent's wallet balance
      const agent = await storage.getUser(transaction.userId);
      if (agent) {
        // Always credit the originally requested fiat amount so players don't lose money to network/gateway fees
        let usdAmount: number;
        if (transaction.fiatAmount && parseFloat(transaction.fiatAmount) > 0) {
          usdAmount = parseFloat(transaction.fiatAmount);
        } else if (paymentStatus.price_amount && paymentStatus.price_amount > 0) {
          usdAmount = paymentStatus.price_amount;
        } else if (paymentStatus.outcome_amount && paymentStatus.outcome_amount > 0) {
          // Fallback for unexpected cases
          const receivedCurrency = paymentStatus.outcome_currency || paymentStatus.price_currency || 'USD';
          if (receivedCurrency.toLowerCase() !== 'usd') {
            usdAmount = 0; // Better safe than credit weird amounts
          } else {
            usdAmount = paymentStatus.outcome_amount;
          }
        } else {
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
          if (broadcastBalanceUpdate) {
            broadcastBalanceUpdate(transaction.userId, agent.balance, newBalance, 'deposit');
          }

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
            console.error(`${logPrefix} Failed to send agent deposit confirmation email:`, emailError);
          }

          // Send deposit push notification to agent
          try {
            await sendTransactionPushNotification(
              agent.id,
              'deposit',
              usdAmount.toFixed(2),
              'USD',
              storage
            );
          } catch (pushError) {
            console.error(`${logPrefix} Failed to send agent deposit push notification:`, pushError);
          }

          console.log(`✅ ${logPrefix} Agent deposit completed: $${usdAmount} credited to ${agent.email}`);
        }
      }
    } else {
      // Regular user deposit - credit user balance in USD based on actual received amount
      const user = await storage.getUser(transaction.userId);
      if (user) {
        // Always credit the originally requested fiat amount so players don't lose money to network/gateway fees
        let usdAmount: number;
        if (transaction.fiatAmount && parseFloat(transaction.fiatAmount) > 0) {
          usdAmount = parseFloat(transaction.fiatAmount);
        } else if (paymentStatus.price_amount && paymentStatus.price_amount > 0) {
          usdAmount = paymentStatus.price_amount;
        } else if (paymentStatus.outcome_amount && paymentStatus.outcome_amount > 0) {
          // Fallback for unexpected cases
          const receivedCurrency = paymentStatus.outcome_currency || paymentStatus.price_currency || 'USD';
          if (receivedCurrency.toLowerCase() !== 'usd') {
            usdAmount = 0; // Better safe than credit weird amounts
          } else {
            usdAmount = paymentStatus.outcome_amount;
          }
        } else {
          usdAmount = 0;
        }

        if (usdAmount > 0) {
          console.log(`💵 ${logPrefix} Crediting user balance: $${usdAmount} to user ${user.id.substring(0, 8)}...`);

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
                `Exclusive VIP support and rewards`
              ];

              // Get Telegram link for the new VIP level
              const vipSettingRecord = await storage.getVipSettingByLevelKey(updatedUser.vipLevel);
              const telegramLink = vipSettingRecord?.telegramLink || undefined;

              await sendVipLevelUpgradeEmail(
                updatedUser.email,
                updatedUser.email.split('@')[0],
                oldVipLevel,
                updatedUser.vipLevel,
                benefits,
                storage,
                telegramLink
              );
            } catch (emailError) {
              console.error(`${logPrefix} Failed to send VIP upgrade email:`, emailError);
            }
          }

          // Broadcast balance update via WebSocket
          if (broadcastBalanceUpdate) {
            broadcastBalanceUpdate(transaction.userId, user.balance, newBalance, 'deposit');
          }

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
            console.error(`${logPrefix} Failed to send deposit confirmation email:`, emailError);
          }

          // Send deposit push notification
          try {
            await sendTransactionPushNotification(
              user.id,
              'deposit',
              usdAmount.toFixed(2),
              'USD',
              storage
            );
          } catch (pushError) {
            console.error(`${logPrefix} Failed to send deposit push notification:`, pushError);
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
                      
                      console.log(`✅ ${logPrefix} Referral bonus awarded: ${referralReward} to referrer ${referrer.id} (available rewards only)`);
                    } catch (bonusError) {
                      console.error(`${logPrefix} Failed to award referral bonus:`, bonusError);
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
                        console.error(`${logPrefix} Failed to send level up email to ${referrer.email}:`, emailError);
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
                          console.error(`${logPrefix} Failed to send VIP upgrade email to ${referrer.email}:`, emailError);
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`${logPrefix} Error updating referral tracking for user ${transaction.userId}:`, error);
              // Continue even if referral tracking fails
            }
          }

          console.log(`✅ ${logPrefix} User deposit completed: $${usdAmount} credited to ${user.email}`);
        }
      }
    }

    // Transaction was already marked as completed at the beginning (before crediting balance)
    // This ensures only one process can credit the balance
    return true;
  } catch (error) {
    console.error(`${logPrefix || '[PaymentChecker]'} Error processing completed payment:`, error);
    
    // CRITICAL: Mark transaction as failed if crediting failed after status was locked
    // DO NOT revert to "pending" as that would allow retry and risk double-crediting
    // Setting to "failed" prevents auto-retry; admin must manually review and retry if needed
    try {
      await storage.updateTransactionStatus(transaction.id, 'failed');
      console.error(`❌ ${logPrefix} CRITICAL: Transaction ${transaction.id.substring(0, 8)} marked as FAILED after partial completion`);
      console.error(`${logPrefix} This transaction may have partial balance updates. Manual review required.`);
      console.error(`${logPrefix} Error details:`, error);
    } catch (statusError) {
      console.error(`${logPrefix} CRITICAL: Failed to update transaction status to failed:`, statusError);
      // Transaction is in unknown state - manual intervention required
    }
    
    return false;
  }
}

// Check pending payments
async function checkPendingPayments(storage: IStorage) {
  try {
    // Update status
    checkerStatus.totalChecks++;
    checkerStatus.lastCheckTime = new Date();
    
    // Get all pending transactions
    const pendingTransactions = await storage.getPendingTransactions();

    if (pendingTransactions.length === 0) {
      console.log('🔍 [PaymentChecker] No pending transactions found');
      checkerStatus.lastCheckStats = {
        pending: 0,
        completed: 0,
        failed: 0,
      };
      return;
    }

    console.log(`🔍 [PaymentChecker] Checking ${pendingTransactions.length} pending transaction(s)...`);

    let completedCount = 0;
    let failedCount = 0;

    // Check each pending transaction
    for (const transaction of pendingTransactions) {
      // Only check transactions with external payment IDs (NOWPayments transactions)
      if (!transaction.externalId) {
        continue;
      }

      try {
        // Get payment status from NOWPayments API
        const paymentStatus = await getNOWPaymentStatus(transaction.externalId, storage);

        if (!paymentStatus) {
          console.log(`⚠️  [PaymentChecker] Could not fetch status for payment ${transaction.externalId}`);
          continue;
        }

        console.log(`📊 [PaymentChecker] Payment ${transaction.externalId} status: ${paymentStatus.payment_status}`);

        // Process based on payment status
        switch (paymentStatus.payment_status) {
          case 'finished':
            // Payment completed - process deposit
            const success = await processCompletedPayment(transaction, paymentStatus, storage);
            if (success) {
              completedCount++;
              console.log(`✅ [PaymentChecker] Payment ${transaction.externalId} completed and processed`);
            }
            break;

          case 'failed':
          case 'expired':
            // Payment failed or expired - update status
            await storage.updateTransactionStatusConditional(
              transaction.id,
              'failed',
              'pending'
            );
            failedCount++;
            console.log(`❌ [PaymentChecker] Payment ${transaction.externalId} ${paymentStatus.payment_status}`);
            break;

          case 'waiting':
          case 'confirming':
          case 'confirmed':
          case 'sending':
          case 'partially_paid':
            // Still pending - do nothing
            console.log(`⏳ [PaymentChecker] Payment ${transaction.externalId} still pending (${paymentStatus.payment_status})`);
            break;

          default:
            console.log(`⚠️  [PaymentChecker] Unknown payment status: ${paymentStatus.payment_status}`);
        }
      } catch (error) {
        console.error(`[PaymentChecker] Error checking payment ${transaction.externalId}:`, error);
      }
    }

    if (completedCount > 0 || failedCount > 0) {
      console.log(`✅ [PaymentChecker] Check complete - Completed: ${completedCount}, Failed: ${failedCount}`);
    }
    
    // Update final stats
    const stillPending = pendingTransactions.length - completedCount - failedCount;
    checkerStatus.lastCheckStats = {
      pending: stillPending,
      completed: completedCount,
      failed: failedCount,
    };
    checkerStatus.totalProcessed += completedCount;
    checkerStatus.totalFailed += failedCount;
  } catch (error) {
    console.error('[PaymentChecker] Error in checkPendingPayments:', error);
  }
}

// Manual trigger for immediate check
export async function triggerPaymentCheck(storage: IStorage): Promise<void> {
  console.log('🔄 [PaymentChecker] Manual check triggered');
  await checkPendingPayments(storage);
}

// Start the payment checker service
export function startPaymentChecker(storage: IStorage) {
  if (checkInterval) {
    console.log('⚠️  [PaymentChecker] Service already running');
    return;
  }

  console.log('🔄 Starting automatic payment status checker...');
  console.log('✅ Payment status checker started (runs every 1 minute)');

  checkerStatus.isRunning = true;

  // Run immediately on start
  checkPendingPayments(storage).catch(error => {
    console.error('[PaymentChecker] Initial check failed:', error);
  });

  // Run every 1 minute (60000ms)
  checkInterval = setInterval(() => {
    checkPendingPayments(storage).catch(error => {
      console.error('[PaymentChecker] Scheduled check failed:', error);
    });
  }, 60000);
}

// Stop the payment checker service
export function stopPaymentChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    checkerStatus.isRunning = false;
    console.log('✅ Payment status checker stopped');
  }
}
