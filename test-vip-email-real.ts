import { sendVipLevelUpgradeEmail } from './server/email';
import { storage } from './server/storage';

async function testVipEmail() {
  console.log('🧪 Testing VIP Level Upgrade Email...\n');
  
  const testEmail = 'test@example.com';
  const userName = 'TestUser';
  const oldLevel = 'lv1';
  const newLevel = 'lv2';
  const benefits = [
    'Higher commission rates on team bets',
    'Max bet limit: 999999',
    'Daily wager reward: 0.00%',
    'Access to exclusive features'
  ];
  const telegramLink = 'https://t.me/hopp778';

  console.log('📧 Sending test VIP upgrade email to:', testEmail);
  console.log('📊 Old Level:', oldLevel);
  console.log('📊 New Level:', newLevel);
  console.log('📱 Telegram Link:', telegramLink);
  console.log('');

  try {
    const result = await sendVipLevelUpgradeEmail(
      testEmail,
      userName,
      oldLevel,
      newLevel,
      benefits,
      storage,
      telegramLink
    );

    if (result) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox at:', testEmail);
      console.log('📬 Don\'t forget to check SPAM folder!');
    } else {
      console.log('❌ Email sending failed');
      console.log('⚠️  Check SMTP settings in database');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }

  process.exit(0);
}

testVipEmail();
