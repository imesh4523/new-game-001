import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';

let bot: TelegramBot | null = null;
let currentBotToken: string | null = null;
let broadcastCallback: ((data: any) => void) | null = null;

// Track Telegram message ID to support session mappings
// Maps Telegram message_id to session token for reply tracking
const messageIdToSessionToken = new Map<number, string>();

export function setSupportChatBroadcastCallback(callback: (data: any) => void) {
  broadcastCallback = callback;
  console.log('✅ Telegram support chat broadcast callback registered');
}

// Clean up message mappings for a specific session token
export function cleanupSessionMessageMappings(sessionToken: string): void {
  let cleanedCount = 0;
  for (const [messageId, token] of Array.from(messageIdToSessionToken.entries())) {
    if (token === sessionToken) {
      messageIdToSessionToken.delete(messageId);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} message mapping(s) for session ${sessionToken.slice(0, 8)}...`);
  }
}

export async function initializeTelegramBot(forceReload: boolean = false): Promise<boolean> {
  try {
    // Check if Telegram bot polling is disabled via environment variable
    // This is useful when running multiple instances (e.g., on Digital Ocean)
    // Set DISABLE_TELEGRAM_POLLING=true on instances where you don't want the bot to poll
    if (process.env.DISABLE_TELEGRAM_POLLING === 'true') {
      console.log('⏸️  Telegram bot polling disabled via DISABLE_TELEGRAM_POLLING environment variable');
      return false;
    }

    const tokenSetting = await storage.getSystemSetting('telegram_bot_token');
    
    if (!tokenSetting || !tokenSetting.value) {
      console.log('Telegram bot token not configured');
      return false;
    }

    // Reinitialize if token has changed or force reload is requested
    if (forceReload || currentBotToken !== tokenSetting.value) {
      if (bot) {
        // Clean up old bot instance
        try {
          await bot.close();
        } catch (e) {
          // Ignore close errors
        }
        bot = null;
      }
      
      bot = new TelegramBot(tokenSetting.value, { 
        polling: {
          interval: 1000,
          autoStart: true,
          params: {
            timeout: 10
          }
        }
      });
      currentBotToken = tokenSetting.value;
      
      // Handle polling errors (409 Conflict when multiple instances run)
      bot.on('polling_error', (error: any) => {
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
          // Suppress 409 errors to reduce console noise - this happens when multiple instances run
          // To fix: Set DISABLE_TELEGRAM_POLLING=true on other instances
          return;
        }
        // Log other polling errors
        console.error('Telegram polling error:', error);
      });
      
      // Set up /start command handler for deep link authentication and login
      bot.onText(/\/start (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const token = match?.[1];
        
        if (!token) {
          await bot?.sendMessage(chatId, '❌ Invalid link. Please use the link from your account or login page.');
          return;
        }
        
        try {
          // Check if this is a login token (starts with "login_")
          if (token.startsWith('login_')) {
            // Handle login flow
            const loginSession = await storage.getTelegramLoginSession(token);
            
            if (!loginSession) {
              await bot?.sendMessage(chatId, '❌ Login link expired or invalid. Please generate a new link from the login page.');
              return;
            }
            
            // Find user by Telegram ID
            const user = await storage.getUserByTelegramId(msg.from!.id.toString());
            
            if (!user) {
              await bot?.sendMessage(chatId, '❌ No account found with this Telegram account. Please link your Telegram account first from your account settings after logging in with email.');
              return;
            }
            
            // Complete the login
            await storage.completeTelegramLogin(token, user.id);
            
            await bot?.sendMessage(
              chatId, 
              `✅ Login successful!\n\nWelcome back, ${user.email}!\n\nYou can now close this chat and return to the app.`
            );
            
            console.log(`✅ Telegram login completed for user ${user.email}`);
            return;
          }
          
          // Handle account linking flow (existing flow)
          const user = await storage.getUserByLinkToken(token);
          
          if (!user) {
            await bot?.sendMessage(chatId, '❌ Link expired or invalid. Please generate a new link from your account settings.');
            return;
          }
          
          // Check if another account is already using this Telegram ID
          const existingUser = await storage.getUserByTelegramId(msg.from!.id.toString());
          if (existingUser && existingUser.id !== user.id) {
            await bot?.sendMessage(chatId, '❌ This Telegram account is already linked to another account.');
            return;
          }
          
          // Link the Telegram account
          await storage.linkTelegramAccount(user.id, {
            id: msg.from!.id.toString(),
            username: msg.from?.username,
            first_name: msg.from?.first_name,
            photo_url: undefined
          });
          
          await bot?.sendMessage(
            chatId, 
            `✅ Success! Your Telegram account has been linked to your gaming account.\n\nYou can now use Telegram Quick Login on the login page.\n\nYou can now close this chat and return to the app.`
          );
          
          console.log(`✅ Telegram account linked for user ${user.email}`);
        } catch (error) {
          console.error('Error processing Telegram command:', error);
          await bot?.sendMessage(chatId, '❌ An error occurred. Please try again later.');
        }
      });
      
      // Handle channel posts for auto-reactions
      bot.on('channel_post', async (msg) => {
        console.log(`📢 New channel post detected in ${msg.chat.id}: ${msg.message_id}`);
        
        try {
          const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
          const channelId = msg.chat.id.toString();
          
          // Get channel username from settings - REQUIRED for N1Panel
          const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
          
          if (!channelUsernameSetting || !channelUsernameSetting.value) {
            console.error('❌ Channel username not configured! N1Panel ONLY supports username format (https://t.me/username/123), NOT channel ID format. Please configure channel username in admin panel.');
            return;
          }
          
          // Use channel username format (ONLY format supported by N1Panel)
          // Example: https://t.me/threexbet_official/640
          const messageLink = `https://t.me/${channelUsernameSetting.value}/${msg.message_id}`;
          console.log(`🔗 Message link for N1Panel: ${messageLink}`);
          
          await handleNewChannelMessage(msg.message_id, channelId, messageLink);
        } catch (error) {
          console.error('Error handling channel post for auto-reaction:', error);
        }
      });
      
      // Handle support chat replies and general messages
      bot.on('message', async (msg) => {
        // Skip bot's own messages (including forwarded notifications and warnings)
        if (msg.from?.is_bot) {
          return;
        }
        
        // Skip /start commands (handled by onText above)
        if (msg.text?.startsWith('/start')) {
          return;
        }
        
        // Handle GROUP messages for auto-reactions (groups/supergroups only)
        if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && !msg.reply_to_message) {
          try {
            const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
            const groupId = msg.chat.id.toString();
            
            // Get configured channel ID from settings
            const channelIdSetting = await storage.getSystemSetting('n1panel_reaction_channel_id');
            
            // Only process if this is the configured group
            if (channelIdSetting && channelIdSetting.value === groupId) {
              console.log(`📢 New GROUP message detected in ${msg.chat.id}: ${msg.message_id}`);
              
              // Get channel username from settings - REQUIRED for N1Panel
              const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
              
              if (!channelUsernameSetting || !channelUsernameSetting.value) {
                console.error('❌ Channel username not configured! N1Panel ONLY supports username format (https://t.me/username/123), NOT channel ID format. Please configure channel username in admin panel.');
              } else {
                // Use channel username format (ONLY format supported by N1Panel)
                // Example: https://t.me/threexbet_official/640
                const messageLink = `https://t.me/${channelUsernameSetting.value}/${msg.message_id}`;
                console.log(`🔗 Message link for N1Panel: ${messageLink}`);
                
                await handleNewChannelMessage(msg.message_id, groupId, messageLink);
              }
            }
          } catch (error) {
            console.error('Error handling group message for auto-reaction:', error);
          }
        }
        
        // Check for custom emojis in the message and log their IDs
        if (msg.entities) {
          const customEmojis = msg.entities.filter(e => e.type === 'custom_emoji');
          if (customEmojis.length > 0) {
            console.log('🎨 Custom Emoji detected in message:');
            customEmojis.forEach((entity: any) => {
              const emojiText = msg.text?.substring(entity.offset, entity.offset + entity.length) || '';
              console.log(`   ID: ${entity.custom_emoji_id}`);
              console.log(`   Emoji: ${emojiText}`);
              console.log(`   Position: ${entity.offset}, Length: ${entity.length}`);
            });
            
            // Send the IDs back to the user
            const emojiList = customEmojis.map((e: any) => `• ID: <code>${e.custom_emoji_id}</code>`).join('\n');
            await bot?.sendMessage(
              msg.chat.id,
              `🎨 <b>Custom Emoji IDs Found:</b>\n\n${emojiList}\n\n💡 You can use these IDs in your bot code!`,
              { parse_mode: 'HTML' }
            );
          }
        }
        
        // Check if this is a reply to a support chat message
        if (msg.reply_to_message && msg.text) {
          const replyToMessageId = msg.reply_to_message.message_id;
          const sessionToken = messageIdToSessionToken.get(replyToMessageId);
          
          if (sessionToken) {
            try {
              const session = await storage.getSupportChatSessionByToken(sessionToken);
              if (session && session.status !== 'closed') {
                // Create support message
                const message = await storage.createSupportChatMessage({
                  sessionId: session.id,
                  author: 'support',
                  authorTelegramId: msg.from?.id.toString() || null,
                  body: msg.text
                });
                
                // Broadcast to all connected WebSocket clients
                if (broadcastCallback) {
                  broadcastCallback({
                    type: 'support-chat:new-message',
                    sessionId: session.id,
                    message
                  });
                } else {
                  console.warn('⚠️ Broadcast callback not set - message not sent to WebSocket clients');
                }
                
                console.log(`✅ Support reply forwarded for session ${session.id} (user: ${session.userDisplayName})`);
              } else {
                await bot?.sendMessage(
                  msg.chat.id,
                  '⚠️ This chat session has been closed. The user will not receive this message.'
                );
              }
            } catch (error) {
              console.error('Error processing support chat reply:', error);
              await bot?.sendMessage(
                msg.chat.id,
                '❌ Error processing your reply. Please try again or contact support.'
              );
            }
          } else {
            // Message ID not found in our mapping
            console.log(`⚠️ Reply to unknown message (msg_id: ${replyToMessageId})`);
          }
        } else if (msg.text && msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
          // Message in support group but not a reply
          await bot?.sendMessage(
            msg.chat.id,
            '⚠️ Please reply to a customer message so we know which chat to route this to.',
            { reply_to_message_id: msg.message_id }
          );
        }
      });
      
      console.log('✅ Telegram bot initialized successfully with deep link support');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    currentBotToken = null;
    bot = null;
    return false;
  }
}

export async function sendWithdrawalNotification(
  userName: string,
  amount: string,
  paymentMethod: string,
  time: string
): Promise<boolean> {
  try {
    // Check if withdrawal notifications are enabled
    const withdrawalNotifEnabledSetting = await storage.getSystemSetting('telegram_withdrawal_notifications_enabled');
    if (withdrawalNotifEnabledSetting && withdrawalNotifEnabledSetting.value === 'false') {
      console.log('ℹ️ Telegram withdrawal notifications are intentionally disabled - skipping notification');
      return true; // Return true because this is an intentional skip, not a failure
    }
    
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    // Always check if we need to reinitialize (in case token was updated)
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const message = `
🔔 NEW WITHDRAWAL REQUEST

👤 User: ${userName}
💰 Amount: $${amount}
💳 Payment: ${paymentMethod}
⏰ Time: ${time}

👉 Check admin panel now
    `.trim();

    // Send to primary chat
    await bot.sendMessage(chatIdSetting.value, message);
    console.log('✅ Telegram notification sent successfully');
    
    // Check if forwarding is enabled and send to secondary chat
    const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
    if (forwardChatIdSetting && forwardChatIdSetting.value) {
      try {
        await bot.sendMessage(forwardChatIdSetting.value, message);
        console.log('✅ Telegram notification forwarded to secondary chat successfully');
      } catch (forwardError) {
        console.error('Failed to forward to secondary chat:', forwardError);
        // Don't fail the main notification if forwarding fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    
    // If authorization error, force reload and retry once
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
        if (!chatIdSetting || !chatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const message = `
🔔 NEW WITHDRAWAL REQUEST

👤 User: ${userName}
💰 Amount: $${amount}
💳 Payment: ${paymentMethod}
⏰ Time: ${time}

👉 Check admin panel now
          `.trim();
          await bot.sendMessage(chatIdSetting.value, message);
          
          // Also try forwarding on retry
          const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
          if (forwardChatIdSetting && forwardChatIdSetting.value) {
            try {
              await bot.sendMessage(forwardChatIdSetting.value, message);
            } catch (forwardError) {
              console.error('Failed to forward to secondary chat on retry:', forwardError);
            }
          }
          
          console.log('✅ Telegram notification sent successfully after token reload');
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send notification after token reload:', retryError);
      }
    }
    
    return false;
  }
}

export async function verifyChatAccess(chatId: string): Promise<{ success: boolean; error?: string; chatInfo?: any }> {
  try {
    const initialized = await initializeTelegramBot(true);
    if (!initialized || !bot) {
      return { success: false, error: 'Bot not initialized' };
    }

    const chatInfo = await bot.getChat(chatId);
    console.log('✅ Chat info retrieved:', chatInfo);
    
    return { 
      success: true, 
      chatInfo: {
        id: chatInfo.id,
        title: chatInfo.title,
        type: chatInfo.type,
        username: chatInfo.username
      }
    };
  } catch (error: any) {
    console.error('Failed to verify chat access:', error);
    
    let errorMessage = 'Unknown error';
    if (error?.response?.body?.description) {
      errorMessage = error.response.body.description;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function testTelegramConnection(): Promise<boolean> {
  try {
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    // Always reload token for test (to ensure we're using latest settings)
    const initialized = await initializeTelegramBot(true);
    if (!initialized || !bot) {
      return false;
    }

    const message = '✅ Test notification successful! Your Telegram bot is working correctly.';
    await bot.sendMessage(chatIdSetting.value, message);
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    
    // Clear cached token on error so next attempt will retry
    currentBotToken = null;
    bot = null;
    
    return false;
  }
}

export async function getChatId(botToken: string): Promise<string | null> {
  try {
    const tempBot = new TelegramBot(botToken, { polling: false });
    const updates = await tempBot.getUpdates({ limit: 1, offset: -1 });
    
    if (updates.length > 0 && updates[0].message?.chat?.id) {
      return updates[0].message.chat.id.toString();
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get chat ID:', error);
    return null;
  }
}

export async function sendGameSignal(
  gameId: string,
  duration: number = 3,
  photoUrl?: string
): Promise<boolean> {
  try {
    const signalEnabledSetting = await storage.getSystemSetting('telegram_signals_enabled');
    
    if (!signalEnabledSetting || signalEnabledSetting.value !== 'true') {
      console.log('Telegram signals are disabled');
      return false;
    }

    const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
    
    if (!signalChatIdSetting || !signalChatIdSetting.value) {
      console.log('Telegram signal chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const colors = ['🟢', '🔴', '🟣'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const message = `<b>WinGo ${duration} min\n🎉  </b>${gameId}<b>    Join   ${randomColor}</b>`;

    // Send photo with caption if photoUrl is provided
    let sentMessage;
    if (photoUrl) {
      sentMessage = await bot.sendPhoto(signalChatIdSetting.value, photoUrl, { 
        caption: message,
        parse_mode: 'HTML'
      });
      console.log('✅ Telegram signal with photo sent successfully:', message);
    } else {
      sentMessage = await bot.sendMessage(signalChatIdSetting.value, message, {
        parse_mode: 'HTML'
      });
      console.log('✅ Telegram signal sent successfully:', message);
    }
    
    // Trigger auto-reaction for the sent signal (bot won't receive its own message as channel_post)
    if (sentMessage && sentMessage.message_id) {
      try {
        const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
        const channelId = signalChatIdSetting.value;
        
        // Get channel username from settings - REQUIRED for N1Panel
        const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
        
        if (channelUsernameSetting && channelUsernameSetting.value) {
          // Use channel username format (ONLY format supported by N1Panel)
          const messageLink = `https://t.me/${channelUsernameSetting.value}/${sentMessage.message_id}`;
          console.log(`🔗 Auto-triggering N1Panel reaction for sent signal: ${messageLink}`);
          
          await handleNewChannelMessage(sentMessage.message_id, channelId, messageLink);
        }
      } catch (error) {
        console.error('Error triggering auto-reaction for sent signal:', error);
        // Don't fail the signal sending if auto-reaction fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send Telegram signal:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
        if (!signalChatIdSetting || !signalChatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const colors = ['🟢', '🔴', '🟣'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const message = `<b>WinGo ${duration} min\n🎉  </b>${gameId}<b>    Join   ${randomColor}</b>`;
          
          let sentMessage;
          if (photoUrl) {
            sentMessage = await bot.sendPhoto(signalChatIdSetting.value, photoUrl, { 
              caption: message,
              parse_mode: 'HTML'
            });
            console.log('✅ Telegram signal with photo sent successfully after token reload');
          } else {
            sentMessage = await bot.sendMessage(signalChatIdSetting.value, message, {
              parse_mode: 'HTML'
            });
            console.log('✅ Telegram signal sent successfully after token reload');
          }
          
          // Trigger auto-reaction for the sent signal
          if (sentMessage && sentMessage.message_id) {
            try {
              const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
              const channelId = signalChatIdSetting.value;
              
              const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
              
              if (channelUsernameSetting && channelUsernameSetting.value) {
                const messageLink = `https://t.me/${channelUsernameSetting.value}/${sentMessage.message_id}`;
                console.log(`🔗 Auto-triggering N1Panel reaction for sent signal (after retry): ${messageLink}`);
                
                await handleNewChannelMessage(sentMessage.message_id, channelId, messageLink);
              }
            } catch (error) {
              console.error('Error triggering auto-reaction for sent signal (retry):', error);
            }
          }
          
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send signal after token reload:', retryError);
      }
    }
    
    return false;
  }
}

function buildStackedMessage(signals: any[], duration: number): string {
  let message = `<b>WinGo ${duration} min\n`;
  
  let winCount = 0;
  let totalWithResult = 0;
  
  for (const signal of signals) {
    let colorEmoji = signal.colour === 'green' ? '🟢' : signal.colour === 'red' ? '🔴' : '🟣';
    let resultText = '  ...⏳';
    
    // Check if this signal has a result (WIN or LOSS)
    if (signal.result === 'WIN' || signal.result === 'LOSS') {
      resultText = `  ${signal.result}`;
      totalWithResult++;
      if (signal.result === 'WIN') {
        winCount++;
      }
    } else if (signal.result && signal.result !== 'WIN' && signal.result !== 'LOSS') {
      // If result is a number (old format), show the number
      resultText = `  ${signal.result}`;
    }
    
    message += `🎉  </b>${signal.gameId}<b>    JOIN   ${colorEmoji}${resultText}\n`;
  }
  
  // Add wins counter at the bottom if there are any results
  if (totalWithResult > 0) {
    message += `\nWINS ${winCount}/${signals.length} 🎊🎉`;
  }
  
  message += `</b>`;
  return message;
}

export async function sendTelegramSignal(
  gameId: string,
  duration: number,
  colour: string,
  chatId: string
): Promise<number | null> {
  try {
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return null;
    }

    // Batch size: Always 20 signals for all game types
    const batchSize = 20;
    
    // Track signals count for current message
    const countKey = `telegram_signal_count_${duration}min`;
    const countSetting = await storage.getSystemSetting(countKey);
    let currentCount = countSetting?.value ? parseInt(countSetting.value) : 0;
    
    // Simple setting key - one message per duration (no slots)
    const settingKey = `telegram_stacked_message_${duration}min`;
    const existingMessageSetting = await storage.getSystemSetting(settingKey);
    
    // Check if we need to start a new message (when 20 signals are complete)
    let shouldCreateNewMessage = false;
    if (currentCount >= batchSize) {
      // Reset counter and force new message
      currentCount = 0;
      shouldCreateNewMessage = true;
      console.log(`📦 Starting new message for ${duration} min signals (previous message filled with ${batchSize} signals)`);
    }
    
    // Increment counter for new signal
    currentCount++;
    await storage.upsertSystemSetting({ key: countKey, value: currentCount.toString(), description: `Signal count for ${duration} min current message` }, 'system');
    
    // Get the last (batchSize-1) signals + new one = max batchSize
    const latestSignals = await storage.getLatestTelegramSignalsByDuration(duration, batchSize - 1);
    const newSignal = {
      gameId,
      colour,
      duration,
      result: null
    };
    
    // Only include signals up to current count (for current message batch)
    const signalsForMessage = [...latestSignals, newSignal].slice(-currentCount);
    
    const message = buildStackedMessage(signalsForMessage, duration);
    
    let messageId: number;
    let isNewMessage = false;
    
    // If we should create new message OR no existing message, create new one
    if (shouldCreateNewMessage || !existingMessageSetting || !existingMessageSetting.value) {
      const sentMessage = await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML'
      });
      messageId = sentMessage.message_id;
      isNewMessage = true;
      await storage.upsertSystemSetting({ key: settingKey, value: messageId.toString(), description: `Telegram stacked message ID for ${duration} min` }, 'system');
      console.log(`✅ Telegram stacked message created: ${gameId} (${colour}) - Message ID: ${messageId} (Signal ${currentCount}/${batchSize})`);
    } else {
      try {
        const existingMessageId = parseInt(existingMessageSetting.value);
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: existingMessageId,
          parse_mode: 'HTML'
        });
        messageId = existingMessageId;
        isNewMessage = false;
        console.log(`✅ Telegram stacked message updated: ${gameId} (${colour}) - Message ID: ${messageId} (Signal ${currentCount}/${batchSize})`);
      } catch (editError) {
        // If edit fails (message too old, etc), create new message
        console.log(`⚠️  Failed to edit existing message, creating new one`);
        const sentMessage = await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML'
        });
        messageId = sentMessage.message_id;
        isNewMessage = true;
        await storage.upsertSystemSetting({ key: settingKey, value: messageId.toString(), description: `Telegram stacked message ID for ${duration} min` }, 'system');
        console.log(`✅ Telegram stacked message created (after edit fail): ${gameId} (${colour}) - Message ID: ${messageId}`);
      }
    }
    
    // Trigger auto-reaction for NEW messages only
    try {
      const { handleNewChannelMessage, isAutoReactionActive } = await import('./n1panel-auto-reaction');
      
      if (isAutoReactionActive()) {
        const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
        
        if (channelUsernameSetting && channelUsernameSetting.value) {
          const messageLink = `https://t.me/${channelUsernameSetting.value}/${messageId}`;
          
          if (isNewMessage) {
            console.log(`🔄 Manually triggering auto-reaction for new stacked message: ${messageLink}`);
            await handleNewChannelMessage(messageId, chatId, messageLink);
          } else {
            console.log(`ℹ️  Skipping auto-reaction for edited message (already has reactions)`);
          }
        }
      }
    } catch (reactionError) {
      console.error('⚠️  Error triggering auto-reaction:', reactionError);
    }
    
    return messageId;
  } catch (error) {
    console.error('Failed to send Telegram signal:', error);
    return null;
  }
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  gameId: string,
  duration: number,
  colour: string,
  result: 'WIN' | 'LOSS',
  autoRed?: boolean,
  autoRedNumber?: number
): Promise<boolean> {
  try {
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    // Get current signal count for this duration's message
    const countKey = `telegram_signal_count_${duration}min`;
    const countSetting = await storage.getSystemSetting(countKey);
    const currentCount = countSetting?.value ? parseInt(countSetting.value) : 20;
    
    // Get only the signals that belong to current message (based on count)
    const latestSignals = await storage.getLatestTelegramSignalsByDuration(duration, currentCount);
    
    const updatedSignals = latestSignals.map(signal => {
      if (signal.gameId === gameId) {
        return { 
          ...signal, 
          result,
          autoRed: autoRed || false,
          autoRedNumber: autoRedNumber
        };
      }
      return signal;
    });
    
    const message = buildStackedMessage(updatedSignals, duration);

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML'
    });
    
    if (autoRed && autoRedNumber !== undefined) {
      console.log(`✅ Telegram stacked message edited: ${gameId} - Auto-generated ${colour.toUpperCase()} ${autoRedNumber} (no bets on signal colour) - Result: ${result}`);
    } else {
      console.log(`✅ Telegram stacked message edited: ${gameId} - Result: ${result}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to edit Telegram message:', error);
    return false;
  }
}

export async function sendPhotoToSignalChannel(
  photoUrl: string,
  caption?: string
): Promise<boolean> {
  try {
    const signalEnabledSetting = await storage.getSystemSetting('telegram_signals_enabled');
    
    if (!signalEnabledSetting || signalEnabledSetting.value !== 'true') {
      console.log('Telegram signals are disabled');
      return false;
    }

    const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
    
    if (!signalChatIdSetting || !signalChatIdSetting.value) {
      console.log('Telegram signal chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    await bot.sendPhoto(signalChatIdSetting.value, photoUrl, { 
      caption: caption || '' 
    });
    console.log('✅ Photo sent to Telegram signal channel successfully');
    return true;
  } catch (error) {
    console.error('Failed to send photo to Telegram signal channel:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const signalChatIdSetting = await storage.getSystemSetting('telegram_signal_chat_id');
        if (!signalChatIdSetting || !signalChatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          await bot.sendPhoto(signalChatIdSetting.value, photoUrl, { 
            caption: caption || '' 
          });
          console.log('✅ Photo sent to Telegram signal channel after token reload');
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send photo after token reload:', retryError);
      }
    }
    
    return false;
  }
}

export async function sendAdminLoginNotification(
  adminEmail: string,
  ipAddress: string,
  timestamp: string
): Promise<boolean> {
  try {
    // Check if login notifications are enabled
    const loginNotifEnabledSetting = await storage.getSystemSetting('telegram_login_notifications_enabled');
    if (loginNotifEnabledSetting && loginNotifEnabledSetting.value === 'false') {
      console.log('ℹ️ Telegram login notifications are intentionally disabled - skipping notification');
      return true; // Return true because this is an intentional skip, not a failure
    }
    
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const message = `
🔐 ADMIN LOGIN DETECTED

👤 User: ${adminEmail}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔔 An admin has logged into the dashboard.
    `.trim();

    // Send to primary chat
    await bot.sendMessage(chatIdSetting.value, message);
    console.log('✅ Admin login notification sent successfully');
    
    // Check if forwarding is enabled and send to secondary chat
    const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
    if (forwardChatIdSetting && forwardChatIdSetting.value) {
      try {
        await bot.sendMessage(forwardChatIdSetting.value, message);
        console.log('✅ Admin login notification forwarded to secondary chat successfully');
      } catch (forwardError) {
        console.error('Failed to forward admin login to secondary chat:', forwardError);
        // Don't fail the main notification if forwarding fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send admin login notification:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
        if (!chatIdSetting || !chatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const message = `
🔐 ADMIN LOGIN DETECTED

👤 User: ${adminEmail}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔔 An admin has logged into the dashboard.
          `.trim();
          await bot.sendMessage(chatIdSetting.value, message);
          
          // Also try forwarding on retry
          const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
          if (forwardChatIdSetting && forwardChatIdSetting.value) {
            try {
              await bot.sendMessage(forwardChatIdSetting.value, message);
            } catch (forwardError) {
              console.error('Failed to forward admin login to secondary chat on retry:', forwardError);
            }
          }
          
          console.log('✅ Admin login notification sent successfully after token reload');
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send notification after token reload:', retryError);
      }
    }
    
    return false;
  }
}

export async function sendFailedLoginNotification(
  email: string,
  ipAddress: string,
  timestamp: string
): Promise<boolean> {
  try {
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const message = `
⚠️ FAILED LOGIN ATTEMPT

👤 Email: ${email}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔒 Invalid credentials provided.
    `.trim();

    await bot.sendMessage(chatIdSetting.value, message);
    console.log('✅ Failed login notification sent successfully');
    
    // Check if forwarding is enabled and send to secondary chat
    const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
    if (forwardChatIdSetting && forwardChatIdSetting.value) {
      try {
        await bot.sendMessage(forwardChatIdSetting.value, message);
        console.log('✅ Failed login notification forwarded to secondary chat successfully');
      } catch (forwardError) {
        console.error('Failed to forward failed login to secondary chat:', forwardError);
        // Don't fail the main notification if forwarding fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send failed login notification:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
        if (!chatIdSetting || !chatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const message = `
⚠️ FAILED LOGIN ATTEMPT

👤 Email: ${email}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔒 Invalid credentials provided.
          `.trim();
          await bot.sendMessage(chatIdSetting.value, message);
          
          // Also try forwarding on retry
          const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
          if (forwardChatIdSetting && forwardChatIdSetting.value) {
            try {
              await bot.sendMessage(forwardChatIdSetting.value, message);
            } catch (forwardError) {
              console.error('Failed to forward failed login to secondary chat on retry:', forwardError);
            }
          }
          
          console.log('✅ Failed login notification sent successfully after token reload');
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send notification after token reload:', retryError);
      }
    }
    
    return false;
  }
}

export async function sendInvalid2FANotification(
  email: string,
  ipAddress: string,
  timestamp: string
): Promise<boolean> {
  try {
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const message = `
⚠️ INVALID 2FA CODE ATTEMPT

👤 User: ${email}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔒 Someone entered a wrong 2FA code.
    `.trim();

    await bot.sendMessage(chatIdSetting.value, message);
    console.log('✅ Invalid 2FA notification sent successfully');
    
    // Check if forwarding is enabled and send to secondary chat
    const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
    if (forwardChatIdSetting && forwardChatIdSetting.value) {
      try {
        await bot.sendMessage(forwardChatIdSetting.value, message);
        console.log('✅ Invalid 2FA notification forwarded to secondary chat successfully');
      } catch (forwardError) {
        console.error('Failed to forward invalid 2FA to secondary chat:', forwardError);
        // Don't fail the main notification if forwarding fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send invalid 2FA notification:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
        if (!chatIdSetting || !chatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const message = `
⚠️ INVALID 2FA CODE ATTEMPT

👤 User: ${email}
🌐 IP Address: ${ipAddress}
⏰ Time: ${timestamp}

🔒 Someone entered a wrong 2FA code.
          `.trim();
          await bot.sendMessage(chatIdSetting.value, message);
          
          // Also try forwarding on retry
          const forwardChatIdSetting = await storage.getSystemSetting('telegram_forward_chat_id');
          if (forwardChatIdSetting && forwardChatIdSetting.value) {
            try {
              await bot.sendMessage(forwardChatIdSetting.value, message);
            } catch (forwardError) {
              console.error('Failed to forward invalid 2FA to secondary chat on retry:', forwardError);
            }
          }
          
          console.log('✅ Invalid 2FA notification sent successfully after token reload');
          return true;
        }
      } catch (retryError) {
        console.error('Failed to send notification after token reload:', retryError);
      }
    }
    
    return false;
  }
}

// Forward user support chat message to Telegram
export async function forwardSupportChatMessage(
  sessionToken: string,
  userDisplayName: string,
  messageBody: string
): Promise<boolean> {
  try {
    const telegramIntegrationSetting = await storage.getSystemSetting('telegram_integration_enabled');
    
    if (telegramIntegrationSetting?.value === 'false') {
      console.log('📴 Telegram integration is disabled - message not forwarded to Telegram');
      return true;
    }

    const supportChatIdSetting = await storage.getSystemSetting('telegram_support_chat_id');
    
    if (!supportChatIdSetting || !supportChatIdSetting.value) {
      console.log('Telegram support chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    const message = `
💬 NEW SUPPORT MESSAGE

👤 From: ${userDisplayName}
📝 Message: ${messageBody}

Reply to this message to respond to the user.
    `.trim();

    // Send message and capture the message_id for reply tracking
    const sentMessage = await bot.sendMessage(supportChatIdSetting.value, message);
    
    // Store the mapping between Telegram message ID and session token for replies
    messageIdToSessionToken.set(sentMessage.message_id, sessionToken);
    
    console.log(`✅ Support chat message forwarded to Telegram (msg_id: ${sentMessage.message_id}, session: ${sessionToken.slice(0, 8)}...)`);
    return true;
  } catch (error) {
    console.error('Failed to forward support chat message:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('⚠️ Authorization error, attempting to reload bot token...');
      try {
        const supportChatIdSetting = await storage.getSystemSetting('telegram_support_chat_id');
        if (!supportChatIdSetting || !supportChatIdSetting.value) {
          return false;
        }
        
        const reinitialized = await initializeTelegramBot(true);
        if (reinitialized && bot) {
          const message = `
💬 NEW SUPPORT MESSAGE

👤 From: ${userDisplayName}
📝 Message: ${messageBody}

Reply to this message to respond to the user.
          `.trim();
          const sentMessage = await bot.sendMessage(supportChatIdSetting.value, message);
          messageIdToSessionToken.set(sentMessage.message_id, sessionToken);
          console.log(`✅ Support chat message forwarded after token reload (msg_id: ${sentMessage.message_id})`);
          return true;
        }
      } catch (retryError) {
        console.error('Failed to forward message after token reload:', retryError);
      }
    }
    
    return false;
  }
}

export async function sendMessageWithButton(
  chatId: string,
  messageText: string,
  buttonConfig: {
    text: string;
    url?: string;
    callback_data?: string;
    web_app?: { url: string };
  }[][]
): Promise<boolean> {
  try {
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      console.log('Bot not initialized');
      return false;
    }

    await bot.sendMessage(chatId, messageText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttonConfig
      }
    });

    console.log('✅ Message with buttons sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send message with buttons:', error);
    return false;
  }
}

export async function sendChannelMessageWithButtons(
  message: string,
  buttons: { text: string; url?: string; callback_data?: string }[][]
): Promise<boolean> {
  try {
    const chatIdSetting = await storage.getSystemSetting('telegram_chat_id');
    
    if (!chatIdSetting || !chatIdSetting.value) {
      console.log('Telegram chat ID not configured');
      return false;
    }

    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      return false;
    }

    await bot.sendMessage(chatIdSetting.value, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons
      }
    });

    console.log('✅ Channel message with buttons sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send channel message with buttons:', error);
    return false;
  }
}

// Parse buttons JSON string to inline keyboard format
function parseButtonsToInlineKeyboard(buttonsJson: string | null | undefined): { inline_keyboard: Array<Array<{ text: string; url: string }>> } | undefined {
  if (!buttonsJson) return undefined;
  
  try {
    const buttons = JSON.parse(buttonsJson);
    if (!Array.isArray(buttons) || buttons.length === 0) return undefined;
    
    // Convert array of buttons to inline keyboard format (one button per row)
    const inlineKeyboard = buttons
      .filter((btn: any) => btn.text && btn.url)
      .map((btn: any) => [{ text: btn.text, url: btn.url }]);
    
    if (inlineKeyboard.length === 0) return undefined;
    
    return { inline_keyboard: inlineKeyboard };
  } catch (e) {
    console.error('Failed to parse buttons JSON:', e);
    return undefined;
  }
}

// Send a photo to a specific channel/chat
export async function sendPhotoToChannel(
  channelId: string,
  photoSource: string,
  caption?: string,
  buttonsJson?: string | null
): Promise<boolean> {
  try {
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      console.log('Bot not initialized');
      return false;
    }

    const replyMarkup = parseButtonsToInlineKeyboard(buttonsJson);

    let sentMessage: any;
    // Handle base64 image data
    if (photoSource.startsWith('data:image/')) {
      // Extract the base64 data after the comma
      const base64Data = photoSource.split(',')[1];
      if (!base64Data) {
        console.error('Invalid base64 image format');
        return false;
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      sentMessage = await bot.sendPhoto(channelId, imageBuffer, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
    } else {
      // It's a URL, send directly
      sentMessage = await bot.sendPhoto(channelId, photoSource, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
    }

    console.log(`✅ Photo sent to channel ${channelId} successfully`);
    
    // Trigger auto-reaction service if a message was sent
    if (sentMessage && sentMessage.message_id) {
      try {
        const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
        const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
        
        if (channelUsernameSetting && channelUsernameSetting.value) {
          const messageLink = `https://t.me/${channelUsernameSetting.value}/${sentMessage.message_id}`;
          console.log(`🔗 Scheduled post auto-reaction triggered: ${messageLink}`);
          await handleNewChannelMessage(sentMessage.message_id, channelId, messageLink);
        }
      } catch (autoReactionError) {
        console.error('⚠️ Auto-reaction not triggered (service may be disabled):', (autoReactionError as any).message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send photo to channel:', error);
    return false;
  }
}

// Send a text message to a specific channel/chat
export async function sendMessageToChannel(
  channelId: string,
  message: string,
  buttonsJson?: string | null
): Promise<boolean> {
  try {
    const initialized = await initializeTelegramBot();
    if (!initialized || !bot) {
      console.log('Bot not initialized');
      return false;
    }

    const replyMarkup = parseButtonsToInlineKeyboard(buttonsJson);

    const sentMessage = await bot.sendMessage(channelId, message, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });

    console.log(`✅ Message sent to channel ${channelId} successfully`);
    
    // Trigger auto-reaction service if a message was sent
    if (sentMessage && sentMessage.message_id) {
      try {
        const { handleNewChannelMessage } = await import('./n1panel-auto-reaction');
        const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
        
        if (channelUsernameSetting && channelUsernameSetting.value) {
          const messageLink = `https://t.me/${channelUsernameSetting.value}/${sentMessage.message_id}`;
          console.log(`🔗 Scheduled post auto-reaction triggered: ${messageLink}`);
          await handleNewChannelMessage(sentMessage.message_id, channelId, messageLink);
        }
      } catch (autoReactionError) {
        console.error('⚠️ Auto-reaction not triggered (service may be disabled):', (autoReactionError as any).message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send message to channel:', error);
    return false;
  }
}
