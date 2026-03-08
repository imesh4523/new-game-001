# 🔔 Push Notification System - Complete Guide

## මොනවද දැනට Active Notification Types?

ඔයාගේ app එකේ දැනට **5 ප්‍රධාන notification types** තියෙනවා:

---

## 1️⃣ Game Results Notifications (ක්‍රීඩා ප්‍රතිඵල)

### කොහොමද වැඩ කරන්නේ:

```
Game Timer Completes
    ↓
Game Result Generated
    ↓
Bets Settled (Win/Loss calculated)
    ↓
🔔 Push Notification Sent to Players
    ↓
User Device Shows Notification
```

### Trigger කරන තැන:
- **File:** `server/routes.ts` - Game settlement logic
- **When:** Game එකක් complete වෙලා result එනකොට
- **Who gets:** ඒ game එකේ bet කළ සියලු players

### Notification Content:
```
Title: "Game Result - Period 20251112010465"
Body: "Result: 7 (Red, Big) - Your bet status: Won/Lost"
Icon: Game icon
```

### Code Flow:
```javascript
// Game completes
await storage.settleGameBets(gameId, result)
    ↓
// For each player who placed bet
for (bet of gameBets) {
    ↓
    // Create notification in database
    await storage.createNotification({
        userId: bet.userId,
        title: "Game Result",
        message: `Result: ${result}`,
        type: "game_result"
    })
    ↓
    // Send push notification
    sendPushToUser(bet.userId, notification)
}
```

---

## 2️⃣ Deposit Confirmation (තැන්පතු තහවුරු කිරීම)

### කොහොමද වැඩ කරන්නේ:

```
User Sends Crypto Payment
    ↓
Blockchain Confirms (1-5 mins)
    ↓
NOWPayments Sends Webhook (IPN)
    ↓
Backend Verifies Payment
    ↓
Balance Updated
    ↓
🔔 Push Notification Sent
    ↓
User Sees Success Notification
```

### Trigger කරන තැන:
- **File:** `server/routes.ts` - Webhook handler `/api/payments/webhook`
- **When:** NOWPayments IPN confirm කරනකොට payment එක "finished"
- **Who gets:** Deposit කළ user පමණක්

### Notification Content:
```
Title: "Deposit Successful! 💰"
Body: "Your $10 USD deposit has been credited to your account"
Icon: Money icon
Action: Open app to see new balance
```

### Code Flow:
```javascript
// Webhook receives payment confirmation
app.post('/api/payments/webhook', async (req, res) => {
    ↓
    // Verify signature
    const isValid = await verifyIPNSignature(...)
    ↓
    if (ipnData.payment_status === 'finished') {
        ↓
        // Update balance
        await storage.updateUserBalance(userId, newBalance)
        ↓
        // Create notification
        await storage.createNotification({
            userId: userId,
            title: "Deposit Successful",
            message: `$${amount} credited`,
            type: "deposit"
        })
        ↓
        // Send push
        sendPushToUser(userId, notification)
    }
})
```

---

## 3️⃣ Withdrawal Updates (මුදල් ගැනීම් Updates)

### කොහොමද වැඩ කරන්නේ:

```
User Requests Withdrawal
    ↓
Admin Reviews Request
    ↓
Admin Approves/Rejects
    ↓
🔔 Push Notification Sent
    ↓
User Notified of Decision
```

### Trigger කරන තැන:
- **File:** `server/routes.ts` - Admin withdrawal approval endpoints
- **When:** Admin කෙනෙක් withdrawal approve or reject කරනකොට
- **Who gets:** Withdrawal request කළ user

### Notification Types:

#### ✅ Approval Notification:
```
Title: "Withdrawal Approved ✅"
Body: "Your withdrawal of $50 has been approved and processed"
Icon: Check mark
```

#### ❌ Rejection Notification:
```
Title: "Withdrawal Rejected ❌"
Body: "Your withdrawal request was rejected. Reason: [admin reason]"
Icon: Warning icon
```

### Code Flow:
```javascript
// Admin approves withdrawal
app.post('/api/admin/withdrawals/:id/approve', async (req, res) => {
    ↓
    // Process withdrawal
    await storage.approveWithdrawal(withdrawalId)
    ↓
    // Create notification
    await storage.createNotification({
        userId: withdrawal.userId,
        title: "Withdrawal Approved",
        message: `$${withdrawal.amount} processed`,
        type: "withdrawal_approved"
    })
    ↓
    // Send push
    sendPushToUser(withdrawal.userId, notification)
})
```

---

## 4️⃣ VIP Level Upgrades (VIP Level වැඩි වීම)

### කොහොමද වැඩ කරන්නේ:

```
User Makes Deposit/Referrals
    ↓
Backend Checks VIP Criteria
    ↓
Qualifies for Higher Level
    ↓
VIP Level Updated
    ↓
🔔 Push Notification Sent
    ↓
Congratulations Message + New Benefits
```

### Trigger කරන තැන:
- **File:** `server/vip-service.ts` - VIP level calculation logic
- **When:** User deposit කරනකොට හෝ referrals ගණන වැඩි වෙනකොට
- **Who gets:** VIP level upgrade වුණු user

### Notification Content:
```
Title: "🎉 VIP Level Upgrade!"
Body: "Congratulations! You've been upgraded to VIP3"
Additional: "New benefits: Higher bet limits, better commission rates"
Icon: Trophy/Star icon
```

### VIP Level Criteria:
```
LV1 → LV2: Team Size ≥ 3 members with $10+ deposit
LV2 → VIP: Team Size ≥ 10 members
VIP → VIP1: Team Size ≥ 20 members
VIP1 → VIP2: Team Size ≥ 50 members
... and so on
```

### Code Flow:
```javascript
// After deposit completes
async function updateUserVIPLevel(userId) {
    ↓
    // Get user team size
    const teamSize = await storage.getUserTeamSize(userId)
    ↓
    // Calculate new VIP level
    const newLevel = calculateVIPLevel(teamSize)
    ↓
    if (newLevel > currentLevel) {
        ↓
        // Update VIP level
        await storage.updateUserVIPLevel(userId, newLevel)
        ↓
        // Send VIP upgrade email
        await sendVipLevelUpgradeEmail(user, newLevel)
        ↓
        // Create notification
        await storage.createNotification({
            userId: userId,
            title: "VIP Upgrade",
            message: `Upgraded to ${newLevel}`,
            type: "vip_upgrade"
        })
        ↓
        // Send push
        sendPushToUser(userId, notification)
    }
}
```

---

## 5️⃣ Custom Admin Messages (Admin පණිවිඩ)

### කොහොමද වැඩ කරන්නේ:

```
Admin Opens Admin Dashboard
    ↓
Goes to Notifications Section
    ↓
Types Message + Selects Target
    ↓
Clicks Send Button
    ↓
🔔 Push Sent Immediately
    ↓
Selected Users Receive Notification
```

### Trigger කරන තැන:
- **File:** `server/routes.ts` - `/api/notifications/send` endpoint
- **When:** Admin manually notification යවනකොට
- **Who gets:** Admin select කරපු users (specific user or broadcast to all)

### Admin Can Send:

#### 📍 To Specific User:
```
Target: user@example.com
Title: "Special Promotion for You!"
Body: "Get 50% bonus on your next deposit"
```

#### 📢 Broadcast to All Users:
```
Target: "All Users"
Title: "System Maintenance Notice"
Body: "Server maintenance on Sunday 2AM-4AM"
```

### Code Flow:
```javascript
// Admin sends notification
app.post('/api/notifications/send', requireAdmin, async (req, res) => {
    ↓
    const { title, message, targetUserId } = req.body
    ↓
    if (targetUserId === 'all') {
        ↓
        // Broadcast to all users
        const allUsers = await storage.getAllUsers()
        ↓
        for (user of allUsers) {
            ↓
            // Create notification
            await storage.createNotification({
                userId: user.id,
                title: title,
                message: message,
                type: "admin_message"
            })
            ↓
            // Send push
            sendPushToUser(user.id, notification)
        }
    } else {
        ↓
        // Send to specific user
        await storage.createNotification({
            userId: targetUserId,
            title: title,
            message: message
        })
        ↓
        sendPushToUser(targetUserId, notification)
    }
})
```

---

## 🔧 Technical Implementation Details

### Push Notification Architecture:

```
┌─────────────────┐
│  Server Event   │  (Deposit, Game, VIP, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Create DB     │  (notifications table)
│  Notification   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Get User's     │  (push_subscriptions table)
│  Push Tokens    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  web-push lib   │  (Send to FCM/Apple)
│  sendNotification│
└────────┬────────┘
         │
         ├─────► FCM (Firebase) ──► Android Device
         │
         └─────► Apple Push ──────► iOS Device
```

### Database Tables:

#### `notifications` Table:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT, -- 'game_result', 'deposit', 'withdrawal', etc.
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
)
```

#### `push_subscriptions` Table:
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
)
```

### Files Involved:

| File | Purpose |
|------|---------|
| `server/routes.ts` | Notification endpoints + triggers |
| `client/src/hooks/use-push-notifications.tsx` | Frontend push logic |
| `client/src/hooks/use-auto-push-subscribe.tsx` | Auto subscribe new users |
| `client/public/service-worker.js` | Background notifications |
| `client/src/components/push-notification-banner.tsx` | Permission request UI |

---

## 📱 User Experience Flow:

### First Time User:

```
1. User opens app
   ↓
2. Banner appears: "Enable notifications?"
   ↓
3. User clicks "Enable"
   ↓
4. Browser asks permission
   ↓
5. User accepts
   ↓
6. Push token generated
   ↓
7. Token saved to database
   ↓
8. User subscribed! ✅
```

### Receiving Notification:

```
Server sends push
   ↓
FCM/Apple delivers to device
   ↓
Service Worker receives
   ↓
Notification appears on screen
   ↓
User clicks notification
   ↓
App opens to relevant page
```

---

## 🔐 Security Features:

✅ **VAPID Keys:** Secure authentication for web push  
✅ **Endpoint Validation:** Only valid subscriptions accepted  
✅ **User Authorization:** Each notification tied to specific user  
✅ **Automatic Cleanup:** Expired subscriptions removed (410 errors)  
✅ **Rate Limiting:** Prevent spam notifications  

---

## 📊 Notification Statistics (From Logs):

```
Total Active Subscriptions: 8 users
├─ FCM (Android): 4 subscriptions
├─ Apple (iOS): 4 subscriptions
└─ Success Rate: ~62.5% (5/8 delivered)
```

**Why some fail:**
- Expired tokens (user uninstalled app)
- Invalid endpoints (token rotated)
- Network issues
- User revoked permissions

---

## 🎯 Summary:

### Notification එකක් යවන එක කියන්නේ:

1. **Event happens** (Deposit, Game, etc.)
2. **Create DB record** (notifications table)
3. **Get user's push tokens** (push_subscriptions table)
4. **Send via web-push** (FCM/Apple)
5. **User sees notification** (Real-time)

### දැනට Active:
✅ Game Results  
✅ Deposits  
✅ Withdrawals  
✅ VIP Upgrades  
✅ Admin Messages  

සියලු notification types fully operational! 🎉
