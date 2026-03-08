import { sendVipLevelUpgradeEmail } from './server/email';
import { storage } from './server/storage';

async function testAllVipEmails() {
  console.log('🧪 Testing VIP Email with ALL levels...\n');
  
  const testEmail = 'test@example.com';
  
  // Test Level 1 → Level 2
  console.log('📧 Test 1: Level 1 → Level 2');
  console.log('─'.repeat(50));
  
  try {
    const vipSetting = await storage.getVipSettingByLevelKey('lv2');
    console.log('📱 Telegram Link from DB:', vipSetting?.telegramLink);
    
    const result = await sendVipLevelUpgradeEmail(
      testEmail,
      'TestUser',
      'lv1',
      'lv2',
      [
        'Higher commission rates on team bets',
        'Max bet limit: 999999',
        'Daily wager reward: 0.00%',
        'Access to exclusive features'
      ],
      storage,
      vipSetting?.telegramLink || undefined
    );

    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email sending failed - Check SMTP settings');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n');
  
  // Test VIP 1 → VIP 2
  console.log('📧 Test 2: VIP 1 → VIP 2');
  console.log('─'.repeat(50));
  
  try {
    const vipSetting = await storage.getVipSettingByLevelKey('vip2');
    console.log('📱 Telegram Link from DB:', vipSetting?.telegramLink);
    
    const result = await sendVipLevelUpgradeEmail(
      testEmail,
      'TestUser',
      'vip1',
      'vip2',
      [
        'VIP 2 exclusive commission rates',
        'Max bet limit: 999999',
        'Daily wager reward: 0.00%',
        'Priority support access'
      ],
      storage,
      vipSetting?.telegramLink || undefined
    );

    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email sending failed - Check SMTP settings');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n📬 Check your inbox: ' + testEmail);
  console.log('📬 Don\'t forget to check SPAM folder!');
  console.log('\n✨ All tests completed!');
  
  process.exit(0);
}

testAllVipEmails();
