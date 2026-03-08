import { sendChannelMessageWithButtons, sendMessageWithButton } from './server/telegram';

async function testTelegramButtons() {
  console.log('🧪 Testing Telegram buttons...\n');

  // Test 1: Simple message with one button
  console.log('📤 Test 1: Sending message with single button...');
  await sendChannelMessageWithButtons(
    '<b>🎉 Welcome to 3XBet!</b>\n\nJoin us now and get 50% bonus on your first deposit!',
    [
      [
        { text: '🚀 Join Now', url: 'https://yourwebsite.com/register' }
      ]
    ]
  );
  console.log('✅ Test 1 sent!\n');

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Message with multiple buttons (horizontal)
  console.log('📤 Test 2: Sending message with multiple horizontal buttons...');
  await sendChannelMessageWithButtons(
    '<b>🎮 Choose Your Game</b>\n\nSelect a game duration:',
    [
      [
        { text: '🟢 1 Min', url: 'https://yourwebsite.com/game/1min' },
        { text: '🔴 3 Min', url: 'https://yourwebsite.com/game/3min' },
        { text: '🟣 5 Min', url: 'https://yourwebsite.com/game/5min' }
      ]
    ]
  );
  console.log('✅ Test 2 sent!\n');

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Message with multiple rows of buttons
  console.log('📤 Test 3: Sending message with multiple rows of buttons...');
  await sendChannelMessageWithButtons(
    '<b>🎯 Quick Actions</b>\n\nWhat would you like to do?',
    [
      [
        { text: '💰 Deposit', url: 'https://yourwebsite.com/deposit' },
        { text: '💸 Withdraw', url: 'https://yourwebsite.com/withdraw' }
      ],
      [
        { text: '🎮 Play Now', url: 'https://yourwebsite.com/games' }
      ],
      [
        { text: '📞 Support', url: 'https://yourwebsite.com/support' }
      ]
    ]
  );
  console.log('✅ Test 3 sent!\n');

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Promotion with Web App button (uses sendMessageWithButton for web_app support)
  console.log('📤 Test 4: Sending promotional message...');
  await sendChannelMessageWithButtons(
    '<b>🎁 Special Promotion!</b>\n\n🔥 Get 100% Bonus on your next deposit!\n\n⏰ Limited time offer!',
    [
      [
        { text: '💰 Deposit Now', url: 'https://yourwebsite.com/deposit' },
        { text: '📖 Terms', url: 'https://yourwebsite.com/terms' }
      ]
    ]
  );
  console.log('✅ Test 4 sent!\n');

  console.log('🎉 All tests completed!');
}

// Run the test
testTelegramButtons().catch(console.error);
