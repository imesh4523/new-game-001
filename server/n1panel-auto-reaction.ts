import { storage } from './storage';
import { createN1PanelService, N1PanelAPIService } from './n1panel-service';

let isAutoReactionEnabled = false;
let n1panelService: N1PanelAPIService | null = null;
let autoReactionConfig: {
  channelId: string;
  serviceId: number;
  minQuantity: number;
  maxQuantity: number;
} | null = null;

export function isAutoReactionActive(): boolean {
  return isAutoReactionEnabled;
}

export async function initializeAutoReaction(): Promise<boolean> {
  try {
    const enabledSetting = await storage.getSystemSetting('n1panel_auto_reaction_enabled');
    const channelIdSetting = await storage.getSystemSetting('n1panel_reaction_channel_id');
    const channelUsernameSetting = await storage.getSystemSetting('n1panel_channel_username');
    const serviceIdSetting = await storage.getSystemSetting('n1panel_reaction_service_id');
    const minQuantitySetting = await storage.getSystemSetting('n1panel_reaction_min_quantity');
    const maxQuantitySetting = await storage.getSystemSetting('n1panel_reaction_max_quantity');

    if (!enabledSetting || enabledSetting.value !== 'true') {
      console.log('⏸️  N1Panel auto-reaction is disabled');
      isAutoReactionEnabled = false;
      return false;
    }

    if (!channelIdSetting || !serviceIdSetting || !minQuantitySetting || !maxQuantitySetting) {
      console.log('⚠️  N1Panel auto-reaction configuration incomplete');
      isAutoReactionEnabled = false;
      return false;
    }

    if (!channelUsernameSetting || !channelUsernameSetting.value) {
      console.error('❌ Channel username is REQUIRED! N1Panel only supports username format (https://t.me/username/123). Please configure channel username in admin panel.');
      isAutoReactionEnabled = false;
      return false;
    }

    const apiSettings = await storage.getTelegramReactionSettings();
    if (!apiSettings || !apiSettings.apiKey) {
      console.log('⚠️  N1Panel API key not configured');
      isAutoReactionEnabled = false;
      return false;
    }

    n1panelService = createN1PanelService(apiSettings.apiUrl, apiSettings.apiKey);

    autoReactionConfig = {
      channelId: channelIdSetting.value,
      serviceId: parseInt(serviceIdSetting.value),
      minQuantity: parseInt(minQuantitySetting.value),
      maxQuantity: parseInt(maxQuantitySetting.value),
    };

    isAutoReactionEnabled = true;
    console.log('✅ N1Panel auto-reaction initialized successfully');
    console.log(`📢 Monitoring channel: ${autoReactionConfig.channelId}`);
    console.log(`📝 Channel username: ${channelUsernameSetting.value}`);
    console.log(`🎯 Service ID: ${autoReactionConfig.serviceId}`);
    console.log(`📊 Quantity range: ${autoReactionConfig.minQuantity}-${autoReactionConfig.maxQuantity}`);
    console.log(`🔗 Link format: https://t.me/${channelUsernameSetting.value}/[message_id]`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize N1Panel auto-reaction:', error);
    isAutoReactionEnabled = false;
    return false;
  }
}

function generateRandomQuantity(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function handleNewChannelMessage(
  messageId: number,
  channelId: string,
  messageLink: string
): Promise<void> {
  if (!isAutoReactionEnabled || !n1panelService || !autoReactionConfig) {
    console.log('⚠️  Auto-reaction not enabled or not configured');
    return;
  }

  if (channelId !== autoReactionConfig.channelId) {
    console.log(`ℹ️  Message from different channel (${channelId}), ignoring`);
    return;
  }

  try {
    const randomQuantity = generateRandomQuantity(
      autoReactionConfig.minQuantity,
      autoReactionConfig.maxQuantity
    );

    console.log(`🎲 Generated random quantity: ${randomQuantity}`);
    console.log(`📤 Placing N1Panel order for message: ${messageLink}`);

    const orderResult = await n1panelService.placeOrder(
      autoReactionConfig.serviceId,
      messageLink,
      randomQuantity
    );

    if (orderResult.error) {
      console.error('❌ N1Panel order failed:', orderResult.error);
      
      await storage.createN1PanelOrder({
        telegramMessageId: messageId,
        telegramChannelId: channelId,
        messageLink,
        serviceId: autoReactionConfig.serviceId,
        quantity: randomQuantity,
        n1PanelOrderId: null,
        status: 'failed',
        errorMessage: orderResult.error,
      });
      
      return;
    }

    if (!orderResult.order) {
      console.error('❌ No order ID returned from N1Panel');
      
      await storage.createN1PanelOrder({
        telegramMessageId: messageId,
        telegramChannelId: channelId,
        messageLink,
        serviceId: autoReactionConfig.serviceId,
        quantity: randomQuantity,
        n1PanelOrderId: null,
        status: 'failed',
        errorMessage: 'No order ID returned',
      });
      
      return;
    }

    console.log(`✅ N1Panel order placed successfully! Order ID: ${orderResult.order}`);

    await storage.createN1PanelOrder({
      telegramMessageId: messageId,
      telegramChannelId: channelId,
      messageLink,
      serviceId: autoReactionConfig.serviceId,
      quantity: randomQuantity,
      n1PanelOrderId: orderResult.order,
      status: 'processing',
      errorMessage: null,
    });

    setTimeout(async () => {
      try {
        await checkOrderStatus(orderResult.order!);
      } catch (error) {
        console.error('Error checking order status:', error);
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Error handling channel message:', error);
    
    try {
      await storage.createN1PanelOrder({
        telegramMessageId: messageId,
        telegramChannelId: channelId,
        messageLink,
        serviceId: autoReactionConfig.serviceId,
        quantity: 0,
        n1PanelOrderId: null,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error('Failed to save error to database:', dbError);
    }
  }
}

async function checkOrderStatus(orderId: number): Promise<void> {
  if (!n1panelService) {
    return;
  }

  try {
    const statusResult = await n1panelService.getOrderStatus(orderId);
    
    if (statusResult.error) {
      console.error(`❌ Failed to check status for order ${orderId}:`, statusResult.error);
      return;
    }

    await storage.updateN1PanelOrderStatus(orderId, {
      status: statusResult.status === 'Completed' ? 'completed' : 'processing',
      charge: statusResult.charge,
      startCount: statusResult.start_count,
      remains: statusResult.remains,
    });

    console.log(`📊 Order ${orderId} status updated:`, statusResult.status);
  } catch (error) {
    console.error(`Error checking status for order ${orderId}:`, error);
  }
}

export async function checkAllPendingOrders(): Promise<void> {
  if (!n1panelService) {
    return;
  }

  try {
    const pendingOrders = await storage.getPendingN1PanelOrders();
    
    for (const order of pendingOrders) {
      if (order.n1PanelOrderId) {
        await checkOrderStatus(order.n1PanelOrderId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error checking pending orders:', error);
  }
}

setInterval(() => {
  if (isAutoReactionEnabled) {
    checkAllPendingOrders().catch(console.error);
  }
}, 60000);
