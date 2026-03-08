import { sendVipLevelUpgradeEmail } from './email.ts';
import { storage } from './storage.ts';

const testEmail = 'test@example.com';
const userName = 'TestUser';
const oldLevel = 'lv1';
const newLevel = 'lv2';
const benefits = [
  '👑 Higher betting limits up to $5,000',
  '💰 Daily wager reward of 0.3%',
  '📊 Commission rates: 9% (Level 1), 8% (Level 2)',
  '📱 Access to exclusive VIP 2 Telegram channel'
];
const telegramLink = 'https://t.me/hopp778';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 VIP LEVEL 2 UPGRADE EMAIL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('To:', testEmail);
console.log('Subject: Join - Vip telegram link');
console.log('Telegram Link:', telegramLink);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

sendVipLevelUpgradeEmail(
  testEmail,
  userName,
  oldLevel,
  newLevel,
  benefits,
  storage,
  telegramLink
).then(success => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (success) {
    console.log('✅ SUCCESS: Email sent to', testEmail);
    console.log('📱 Includes Telegram join button:', telegramLink);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('❌ FAILED: Email could not be sent');
    console.log('Check SMTP configuration in Admin Panel');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
