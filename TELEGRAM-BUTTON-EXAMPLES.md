# 📱 Telegram Message Button Examples

මේකේ Telegram channel එකට message button එක්ක යවන විදිහ සරලව පැහැදිලි කරලා තියෙනවා.

## 🎯 Simple Example - URL Button එකක් එක්ක Message එකක්

```typescript
import { sendChannelMessageWithButtons } from './server/telegram';

// Example 1: Single URL button
await sendChannelMessageWithButtons(
  '<b>🎉 New Promotion!</b>\n\n💰 Get 50% bonus on your first deposit!\n\n👇 Click below to join now:',
  [
    [
      { text: '🎮 Join Now', url: 'https://yourwebsite.com/register' }
    ]
  ]
);
```

## 🎯 Multiple Buttons (Horizontal Row)

```typescript
// Example 2: Multiple buttons in one row
await sendChannelMessageWithButtons(
  '<b>🎰 Play Now!</b>\n\nChoose your game:',
  [
    [
      { text: '🟢 WinGo 1 Min', url: 'https://yourwebsite.com/game/1min' },
      { text: '🔴 WinGo 3 Min', url: 'https://yourwebsite.com/game/3min' }
    ]
  ]
);
```

## 🎯 Multiple Rows of Buttons

```typescript
// Example 3: Multiple rows of buttons
await sendChannelMessageWithButtons(
  '<b>🎯 Quick Actions</b>\n\nSelect an option:',
  [
    [
      { text: '💰 Deposit', url: 'https://yourwebsite.com/deposit' },
      { text: '💸 Withdraw', url: 'https://yourwebsite.com/withdraw' }
    ],
    [
      { text: '🎮 Play Games', url: 'https://yourwebsite.com/games' }
    ],
    [
      { text: '📞 Support', url: 'https://yourwebsite.com/support' }
    ]
  ]
);
```

## 🎯 Telegram Mini App Button

```typescript
// Example 4: Web App button (for Telegram Mini Apps)
import { sendMessageWithButton } from './server/telegram';

await sendMessageWithButton(
  '-1001234567890',  // Your channel ID
  '<b>🎮 Play 3XBet Mini App</b>\n\n🚀 Launch the game instantly:',
  [
    [
      { 
        text: '🎯 Launch Game', 
        web_app: { url: 'https://yourwebsite.com' }
      }
    ]
  ]
);
```

## 🎯 Callback Button (for Interactive Bots)

```typescript
// Example 5: Callback button (triggers bot action)
await sendMessageWithButton(
  '-1001234567890',  // Your channel ID
  '<b>⚙️ Settings</b>\n\nChoose an option:',
  [
    [
      { text: '🔔 Enable Notifications', callback_data: 'enable_notif' },
      { text: '🔕 Disable Notifications', callback_data: 'disable_notif' }
    ]
  ]
);
```

## 🎯 Real World Example - Deposit Notification

```typescript
// Example 6: Practical use case - Deposit completed
import { sendChannelMessageWithButtons } from './server/telegram';

export async function sendDepositCompleteNotification(
  userName: string,
  amount: string,
  transactionId: string
) {
  await sendChannelMessageWithButtons(
    `✅ <b>DEPOSIT SUCCESSFUL</b>

👤 User: ${userName}
💰 Amount: $${amount}
🆔 TX ID: ${transactionId}
⏰ Time: ${new Date().toLocaleString()}

🎉 User can now play!`,
    [
      [
        { 
          text: '👀 View User Profile', 
          url: `https://yourwebsite.com/admin/users/${userName}` 
        },
        { 
          text: '📊 View Transaction', 
          url: `https://yourwebsite.com/admin/transactions/${transactionId}` 
        }
      ],
      [
        { 
          text: '🎮 Launch App', 
          web_app: { url: 'https://yourwebsite.com' }
        }
      ]
    ]
  );
}
```

## 📋 Button Types

### 1️⃣ URL Button
```typescript
{ text: 'Button Text', url: 'https://example.com' }
```
- Opens a website in browser
- Best for external links

### 2️⃣ Web App Button
```typescript
{ text: 'Launch App', web_app: { url: 'https://yourapp.com' } }
```
- Opens Telegram Mini App
- Full screen web app inside Telegram
- **මේක use කරන්න ඔයාගේ mini app එක launch කරන්න**

### 3️⃣ Callback Button
```typescript
{ text: 'Click Me', callback_data: 'action_name' }
```
- Triggers bot action
- Needs callback handler in bot code

## 🔧 How to Use in Your Project

### Step 1: Import the function
```typescript
import { sendChannelMessageWithButtons } from './server/telegram';
```

### Step 2: Call it wherever you need
```typescript
// In any route or function
await sendChannelMessageWithButtons(
  'Your message here',
  [
    [{ text: 'Button 1', url: 'https://link1.com' }],
    [{ text: 'Button 2', url: 'https://link2.com' }]
  ]
);
```

## 📝 Important Notes

1. **Message Format**: Use HTML tags:
   - `<b>Bold</b>`
   - `<i>Italic</i>`
   - `<code>Code</code>`
   - `<a href="url">Link</a>`

2. **Button Layout**:
   - Each inner array `[]` = one row
   - Multiple objects in same array = buttons in same row
   - Maximum 8 buttons per row recommended

3. **Channel ID**:
   - Get from Admin → Settings → Telegram Chat ID
   - Format: `-1001234567890`

## 🎉 Ready to Use!

දැන් ඔබට channel එකට message button එක්ක යවන්න පුළුවන්! 

Example කොහොමද use කරන්නේ:

```typescript
// Simple announcement with join button
sendChannelMessageWithButtons(
  '🎁 <b>Special Offer!</b>\n\n50% Bonus for new users!\n\nJoin now 👇',
  [
    [
      { text: '🚀 Join 3XBet', url: 'https://yourwebsite.com/register' }
    ]
  ]
);
```

එච්චර තමයි! 😊
