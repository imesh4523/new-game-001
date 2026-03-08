import { sendVipLevelUpgradeEmail } from './email.ts';

const testEmail = 'hi@gmail.com';
const userName = 'hi';
const oldLevel = 'lv1';
const newLevel = 'lv2';
const benefits = [
  'Higher betting limits up to $5,000',
  'Daily wager reward of 0.3%',
  'Commission rates: 9% (Level 1), 8% (Level 2)',
  'Access to exclusive VIP 2 Telegram channel'
];
const telegramLink = 'https://t.me/hopp778';

console.log('Sending test VIP upgrade email...');
console.log('To:', testEmail);
console.log('Telegram Link:', telegramLink);

sendVipLevelUpgradeEmail(
  testEmail,
  userName,
  oldLevel,
  newLevel,
  benefits,
  null,
  telegramLink
).then(success => {
  if (success) {
    console.log('✅ Email sent successfully!');
  } else {
    console.log('❌ Email sending failed');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
