import { storage, initializeStorage } from './server/storage';
import { sendVipLevelUpgradeEmail } from './server/email';

async function testRealVipEmail() {
  console.log('🧪 Testing VIP Email with Real SMTP...\n');
  
  // IMPORTANT: Initialize storage first!
  console.log('⚙️  Initializing storage...');
  await initializeStorage();
  console.log('✅ Storage initialized\n');
  
  // Verify SMTP settings
  const smtpHost = await storage.getSystemSetting('smtp_host');
  const smtpPort = await storage.getSystemSetting('smtp_port');
  const smtpUser = await storage.getSystemSetting('smtp_user');
  const smtpPass = await storage.getSystemSetting('smtp_pass');
  const fromEmail = await storage.getSystemSetting('from_email');
  
  console.log('📊 SMTP Settings:');
  console.log('   Host:', smtpHost?.value || 'NOT SET ❌');
  console.log('   Port:', smtpPort?.value || 'NOT SET ❌');
  console.log('   User:', smtpUser?.value || 'NOT SET ❌');
  console.log('   Pass:', smtpPass?.value ? '✅ SET (***' + smtpPass.value.slice(-4) + ')' : 'NOT SET ❌');
  console.log('   From:', fromEmail?.value || 'NOT SET ❌');
  console.log('');
  
  if (!smtpHost?.value || !smtpUser?.value || !smtpPass?.value) {
    console.log('❌ SMTP settings incomplete! Cannot send email.');
    process.exit(1);
  }
  
  // Get VIP telegram link
  const vipSetting = await storage.getVipSettingByLevelKey('lv2');
  console.log('📱 Telegram Link for lv2:', vipSetting?.telegramLink || 'NOT SET ❌');
  console.log('');
  
  // Send test VIP upgrade email
  const testEmail = 'test@example.com';
  console.log('📧 Sending VIP upgrade email: lv1 → lv2');
  console.log('📬 To:', testEmail);
  console.log('─'.repeat(50));
  
  try {
    const result = await sendVipLevelUpgradeEmail(
      testEmail,
      'TestUser',
      'lv1',
      'lv2',
      [
        'Higher commission rates on team bets',
        `Max bet limit: ${vipSetting?.maxBet || '999999'}`,
        `Daily wager reward: ${((parseFloat(vipSetting?.dailyWagerReward || '0') * 100).toFixed(2))}%`,
        'Access to exclusive VIP features'
      ],
      storage,
      vipSetting?.telegramLink || undefined
    );

    if (result) {
      console.log('\n✅ Email sent successfully!');
      console.log('📬 Check inbox:', testEmail);
      console.log('📬 Also check SPAM/Junk folder!');
      console.log('\n🔗 Email includes Telegram link:', vipSetting?.telegramLink || 'NO LINK');
    } else {
      console.log('\n❌ Email failed - Check SMTP configuration');
    }
  } catch (error: any) {
    console.error('\n❌ Error sending email:', error.message);
  }
  
  process.exit(0);
}

testRealVipEmail();
