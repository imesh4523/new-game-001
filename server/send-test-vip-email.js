import { sendVipLevelUpgradeEmail } from './email.ts';
import { storage } from './storage.ts';

const testEmail = 'test@example.com';
const userName = 'TestUser';
const oldLevel = 'lv1';
const newLevel = 'lv2';
const benefits = [
  'Higher betting limits up to $5,000',
  'Daily wager reward of 0.3%',
  'Commission rates: 9% (Level 1), 8% (Level 2)',
  'Access to exclusive VIP 2 Telegram channel'
];
const telegramLink = 'https://t.me/hopp778';

console.log('📧 Sending VIP Level 2 upgrade email...');
console.log('To:', testEmail);
console.log('Telegram Link:', telegramLink);
console.log('Benefits:', benefits);

sendVipLevelUpgradeEmail(
  testEmail,
  userName,
  oldLevel,
  newLevel,
  benefits,
  storage,
  telegramLink
).then(success => {
  if (success) {
    console.log('✅ VIP upgrade email sent successfully to', testEmail);
    console.log('📱 Email includes Telegram join link:', telegramLink);
  } else {
    console.log('❌ Email sending failed - check SMTP settings');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Error sending email:', error);
  process.exit(1);
});
