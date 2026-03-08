import TelegramBot from 'node-telegram-bot-api';
import { db } from '../server/db';
import { systemSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testTelegramBot() {
  try {
    console.log('\n🤖 Telegram Bot Diagnostic Test\n');
    console.log('═'.repeat(80));
    
    // Get bot token
    const [tokenSetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'telegram_bot_token'))
      .limit(1);
    
    if (!tokenSetting || !tokenSetting.value) {
      console.log('❌ Bot token not found in database');
      return;
    }
    
    console.log('✅ Bot token found');
    console.log(`   Token: ${tokenSetting.value.substring(0, 15)}...`);
    
    // Get channel ID
    const [channelSetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'n1panel_reaction_channel_id'))
      .limit(1);
    
    if (!channelSetting || !channelSetting.value) {
      console.log('❌ Channel ID not found in database');
      return;
    }
    
    console.log('✅ Channel ID found');
    console.log(`   Channel ID: ${channelSetting.value}`);
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n📡 Testing bot connection...\n');
    
    // Create bot instance (no polling)
    const bot = new TelegramBot(tokenSetting.value, { polling: false });
    
    // Get bot info
    const botInfo = await bot.getMe();
    console.log('✅ Bot is online!');
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   Name: ${botInfo.first_name}`);
    console.log(`   ID: ${botInfo.id}`);
    
    // Try to get chat info
    console.log('\n' + '─'.repeat(80));
    console.log('\n📢 Testing channel access...\n');
    
    try {
      const chatInfo = await bot.getChat(channelSetting.value);
      console.log('✅ Bot can access the channel!');
      console.log(`   Channel Title: ${chatInfo.title}`);
      console.log(`   Channel Type: ${chatInfo.type}`);
      
      // Get chat member info
      try {
        const memberInfo = await bot.getChatMember(channelSetting.value, botInfo.id.toString());
        console.log(`\n✅ Bot membership status: ${memberInfo.status}`);
        
        if (memberInfo.status === 'administrator') {
          console.log('   ✅ Bot is an ADMINISTRATOR - Channel posts will be received!');
        } else if (memberInfo.status === 'member') {
          console.log('   ⚠️  Bot is only a MEMBER - Channel posts may not be received');
          console.log('   🔧 Make the bot an ADMINISTRATOR in channel settings');
        } else {
          console.log(`   ⚠️  Bot status is: ${memberInfo.status}`);
        }
      } catch (memberError: any) {
        console.log('⚠️  Could not check bot admin status');
        console.log(`   Error: ${memberError.message}`);
      }
      
    } catch (chatError: any) {
      console.log('❌ Bot CANNOT access the channel!');
      console.log(`   Error: ${chatError.message}`);
      console.log('\n💡 Possible issues:');
      console.log('   1. Bot is not added to the channel');
      console.log('   2. Channel ID is incorrect');
      console.log('   3. Bot was removed from the channel');
      console.log('\n🔧 To fix:');
      console.log('   1. Go to your Telegram channel');
      console.log('   2. Add the bot as an administrator');
      console.log('   3. Give it "Post Messages" permission');
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Diagnostic test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testTelegramBot();
