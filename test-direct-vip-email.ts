import { sendVipLevelUpgradeEmail } from './server/email';
import { db } from './server/db';
import { vipSettings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testDirectVipEmail() {
  console.log('🧪 Testing VIP Email with DIRECT database query...\n');
  
  const testEmail = 'test@example.com';
  
  // Directly query database for lv2 telegram link
  console.log('📊 Querying database directly for lv2 settings...');
  const [lv2Setting] = await db
    .select()
    .from(vipSettings)
    .where(eq(vipSettings.levelKey, 'lv2'));
  
  console.log('📱 Telegram Link from direct DB query:', lv2Setting?.telegramLink);
  console.log('📋 Full VIP Setting:', JSON.stringify(lv2Setting, null, 2));
  console.log('');
  
  // Test sending email
  console.log('📧 Sending VIP upgrade email: lv1 → lv2');
  console.log('─'.repeat(50));
  
  try {
    const result = await sendVipLevelUpgradeEmail(
      testEmail,
      'TestUser',
      'lv1',
      'lv2',
      [
        'Higher commission rates on team bets',
        `Max bet limit: ${lv2Setting?.maxBet || 'Unlimited'}`,
        `Daily wager reward: ${lv2Setting?.dailyWagerReward || '0'}%`,
        'Access to exclusive features'
      ],
      undefined, // No storage needed
      lv2Setting?.telegramLink || undefined
    );

    if (result) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check inbox:', testEmail);
      console.log('📬 Also check SPAM folder!');
      console.log('\n🔗 Telegram link in email:', lv2Setting?.telegramLink);
    } else {
      console.log('❌ Email failed - SMTP configuration issue');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testDirectVipEmail();
