# Database Documentation

## Overview
This project uses **PostgreSQL** database with **Drizzle ORM** for type-safe database operations. The database schema is defined in `shared/schema.ts` file.

## Database Setup Instructions

### Step 1: Create PostgreSQL Database in Replit
1. Open your Replit project
2. Go to the "Tools" section in the left sidebar
3. Click on "Database" 
4. Click "Create PostgreSQL Database"
5. Replit will automatically create a database and set the `DATABASE_URL` environment variable

### Step 2: Push Schema to Database
After the database is created, run this command in the Shell:
```bash
npm run db:push
```

If you see any warnings about data loss, use:
```bash
npm run db:push --force
```

### Step 3: Verify Database Connection
The application will automatically connect to the database using the `DATABASE_URL` environment variable. Check the console logs to confirm the connection:
- ✅ Look for: "Database connection established using Neon serverless driver"

## Database Schema Location
All database tables and schemas are defined in:
- **File**: `shared/schema.ts`
- **Migration Config**: `drizzle.config.ts`
- **Database Connection**: `server/db.ts`

## Complete Database Tables

### 1. Users Table (`users`)
Stores all user account information, balances, and statistics.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `publicId`: Random numeric ID displayed to users (e.g., 02826262818)
- `email`: User email (unique, required)
- `passwordHash`: Encrypted password
- `withdrawalPasswordHash`: Separate password for withdrawals
- `profilePhoto`: Base64 encoded photo or file path
- `balance`: User's coin balance (supports crypto precision: 18 digits, 8 decimals)
- `role`: User role (user/admin/agent)
- `vipLevel`: VIP level (lv1, lv2, vip, vip1-vip7)
- `isActive`: Account status
- `referralCode`: Unique referral code
- `referredBy`: Who referred this user (foreign key to users)
- `referralLevel`: Position in referral tree (1=direct, 2=second level, etc.)
- `totalDeposits`: Lifetime deposits
- `totalWithdrawals`: Lifetime withdrawals
- `totalWinnings`: Total money won
- `totalLosses`: Total money lost
- `totalCommission`: Commission earned from referrals and betting
- `totalBetsAmount`: Total wagered amount
- `dailyWagerAmount`: Today's wager amount
- `lastWagerResetDate`: Date of last daily reset
- `teamSize`: Qualified referrals with $10+ deposit (for VIP level)
- `totalTeamMembers`: All referrals (including those without deposits)
- `registrationIp`: IP address at registration
- `registrationCountry`: Country code from registration
- `lastLoginIp`: Last login IP address
- `maxBetLimit`: Maximum bet allowed (VIP-based)
- `twoFactorEnabled`: 2FA status (true/false)
- `twoFactorSecret`: TOTP secret for 2FA
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

**Enums Used:**
- `user_role`: "user", "admin", "agent"
- `vip_level`: "lv1", "lv2", "vip", "vip1", "vip2", "vip3", "vip4", "vip5", "vip6", "vip7"

---

### 2. Games Table (`games`)
Stores information about each game round (color game or crash game).

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `gameId`: Unique game identifier (for display)
- `gameType`: Type of game ("color" or "crash")
- `roundDuration`: Duration in minutes
- `startTime`: Game start timestamp
- `endTime`: Game end timestamp
- `status`: Game status ("active", "completed", "cancelled")
- `result`: Winning number (0-9) for color game
- `resultColor`: Winning color ("green", "red", "violet")
- `resultSize`: Result size ("big", "small")

**Crash Game Specific Fields:**
- `crashPoint`: Multiplier when crash happens (e.g., 2.34)
- `currentMultiplier`: Current multiplier for active games
- `crashedAt`: Timestamp when crash occurred
- `isManuallyControlled`: Admin manually controls result
- `manualResult`: Admin-set result (0-9)

**Financial Fields:**
- `totalBetsAmount`: Total bets placed in this game
- `totalPayouts`: Total paid to winners
- `houseProfit`: Profit from this game
- `createdAt`: Game creation timestamp

**Indexes:**
- Index on `status` for fast game filtering

---

### 3. Bets Table (`bets`)
Records all bets placed by users.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User who placed bet (foreign key to users)
- `gameId`: Game where bet placed (foreign key to games)
- `betType`: Type of bet ("color", "number", "size", "crash")
- `betValue`: Specific bet value (e.g., "green", "red", "0-9", "big", "small")
- `amount`: Bet amount
- `potential`: Potential payout
- `actualPayout`: Actual payout after fees (null for lost/pending)
- `status`: Bet status ("pending", "won", "lost", "cashed_out", "cancelled")

**Crash Game Specific Fields:**
- `cashOutMultiplier`: Multiplier when player cashed out
- `autoCashOut`: Auto cash out at this multiplier
- `cashedOutAt`: Timestamp of cash out

**Indexes:**
- Index on `userId` for user bet history
- Index on `gameId` for game bets
- Index on `status` for status filtering

---

### 4. Referrals Table (`referrals`)
Manages the referral system.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `referrerId`: User who referred (foreign key to users)
- `referredId`: User who was referred (foreign key to users, unique)
- `referralLevel`: Level in referrer's team (1=direct, 2=indirect, etc.)
- `commissionRate`: Commission percentage (default 6%)
- `totalCommission`: Total commission earned
- `hasDeposited`: Whether referred user deposited (true/false)
- `status`: Referral status ("active", "inactive")
- `createdAt`: Referral creation timestamp

**Indexes:**
- Index on `referrerId` for referrer lookups

---

### 5. Transactions Table (`transactions`)
Logs all financial transactions.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User performing transaction (foreign key to users)
- `agentId`: Agent processing transaction (foreign key to users with role='agent')
- `type`: Transaction type ("deposit", "withdrawal", "referral_bonus", "agent_commission", "commission_withdrawal")
- `fiatAmount`: Fiat currency amount (USD, EUR, etc.)
- `cryptoAmount`: Cryptocurrency amount (BTC, ETH, USDT, etc.)
- `fiatCurrency`: Fiat currency code (default "USD")
- `cryptoCurrency`: Crypto currency code (BTC, ETH, USDT, etc.)
- `status`: Transaction status ("pending", "completed", "failed", "cancelled")
- `paymentMethod`: Payment method ("crypto", "bank_transfer", "agent", "internal")
- `externalId`: External payment provider ID (e.g., NOWPayments ID)
- `paymentAddress`: Crypto wallet address
- `txHash`: Blockchain transaction hash
- `fee`: Transaction fee
- `createdAt`: Transaction creation timestamp
- `updatedAt`: Last update timestamp

**Indexes:**
- Index on `userId` for user transactions
- Index on `externalId` for payment lookups
- Index on `status` for status filtering

---

### 6. Admin Actions Table (`admin_actions`)
Audit log for admin actions.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `adminId`: Admin who performed action (foreign key to users)
- `action`: Action type (e.g., "manual_game_result", "user_edit", "balance_adjustment")
- `targetId`: ID of affected entity (user, game, etc.)
- `details`: JSON data with action details
- `createdAt`: Action timestamp

**Indexes:**
- Index on `adminId` for admin activity tracking

---

### 7. Game Analytics Table (`game_analytics`)
Statistics for each game round.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `gameId`: Game being analyzed (foreign key to games, unique)
- `totalPlayers`: Number of players
- `totalBets`: Number of bets
- `totalVolume`: Total betting volume
- `houseEdge`: House edge percentage (default 5%)
- `actualProfit`: Actual profit earned
- `expectedProfit`: Expected profit based on house edge
- `profitMargin`: Profit margin percentage
- `createdAt`: Analytics creation timestamp

---

### 8. User Sessions Table (`user_sessions`)
Tracks user login history and device information.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User of this session (foreign key to users)
- `ipAddress`: Login IP address
- `userAgent`: Browser user agent string
- `browserName`: Parsed browser name
- `browserVersion`: Parsed browser version
- `deviceType`: Device type (mobile, desktop, tablet)
- `operatingSystem`: Parsed OS name
- `loginTime`: Login timestamp
- `logoutTime`: Logout timestamp
- `isActive`: Session active status
- `createdAt`: Session creation timestamp

**Indexes:**
- Index on `userId` for user session history

---

### 9. Page Views Table (`page_views`)
Website traffic analytics.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: Logged-in user (foreign key to users, null for anonymous)
- `path`: Page URL path (e.g., "/", "/game", "/profile")
- `ipAddress`: Visitor IP address
- `country`: Country code from Cloudflare (e.g., "US", "LK", "IN")
- `userAgent`: Browser user agent
- `browserName`: Parsed browser name
- `deviceType`: Device type (mobile, desktop, tablet)
- `operatingSystem`: Parsed OS name
- `referrer`: Where visitor came from
- `sessionId`: Unique session identifier
- `createdAt`: Page view timestamp

**Indexes:**
- Index on `userId` for user activity
- Index on `path` for page analytics
- Index on `createdAt` for time-based queries

---

### 10. Password Reset Tokens Table (`password_reset_tokens`)
Stores password reset tokens.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `email`: User email
- `token`: Unique reset token
- `expiresAt`: Token expiration timestamp
- `used`: Whether token was used (true/false)
- `createdAt`: Token creation timestamp

---

### 11. System Settings Table (`system_settings`)
Admin-configurable system settings.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `key`: Setting name (unique, e.g., "nowpayments_api_key")
- `value`: Setting value (encrypted if sensitive)
- `description`: Optional description
- `isEncrypted`: Whether value is encrypted (true/false)
- `lastUpdatedBy`: Admin who last updated (foreign key to users)
- `createdAt`: Setting creation timestamp
- `updatedAt`: Last update timestamp

---

### 12. Withdrawal Requests Table (`withdrawal_requests`)
User withdrawal requests with validation.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User requesting withdrawal (foreign key to users)
- `amount`: Withdrawal amount
- `currency`: Currency code (default "USD")
- `walletAddress`: Destination wallet address
- `status`: Request status ("pending", "approved", "rejected", "processing", "completed")
- `adminNote`: Admin notes
- `requiredBetAmount`: Required betting amount (60% of deposits)
- `currentBetAmount`: User's current betting amount
- `eligible`: Auto-calculated eligibility (true/false)
- `duplicateIpCount`: Number of accounts from same registration IP
- `duplicateIpUserIds`: Array of user IDs with same IP
- `processedAt`: Processing timestamp
- `processedBy`: Admin who processed (foreign key to users)
- `createdAt`: Request creation timestamp
- `updatedAt`: Last update timestamp

**Indexes:**
- Index on `userId` for user withdrawals
- Index on `status` for status filtering

---

### 13. Agent Profiles Table (`agent_profiles`)
Extended profiles for agent users.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User with role='agent' (foreign key to users, unique)
- `commissionRate`: Commission percentage (default 5%)
- `earningsBalance`: Agent's commission earnings
- `isActive`: Agent active status (true/false)
- `createdAt`: Profile creation timestamp
- `updatedAt`: Last update timestamp

---

### 14. Agent Activities Table (`agent_activities`)
Audit log for agent actions.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `agentId`: Agent performing action (foreign key to users)
- `action`: Action type ("deposit", "withdrawal", "commission_award")
- `targetUserId`: User affected by action (foreign key to users)
- `amount`: Transaction amount
- `commissionAmount`: Commission earned
- `transactionId`: Related transaction (foreign key to transactions)
- `createdAt`: Activity timestamp

**Indexes:**
- Index on `agentId` for agent activity tracking

---

### 15. Passkeys Table (`passkeys`)
WebAuthn credentials for secure withdrawal authentication.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: User owning passkey (foreign key to users)
- `credentialId`: Base64URL encoded credential ID (unique)
- `publicKey`: Base64URL encoded public key
- `counter`: Signature counter (prevents replay attacks)
- `deviceName`: User-friendly device name (e.g., "iPhone", "Touch ID", "YubiKey")
- `isActive`: Passkey active status (true/false)
- `lastUsedAt`: Last usage timestamp
- `createdAt`: Passkey creation timestamp
- `updatedAt`: Last update timestamp

---

### 16. Notifications Table (`notifications`)
Admin-to-user messaging system.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `userId`: Target user (foreign key to users, null = all users)
- `title`: Notification title
- `message`: Notification message
- `type`: Notification type ("info", "success", "warning", "error")
- `imageUrl`: Optional image URL
- `isRead`: Read status (true/false)
- `sentBy`: Admin who sent (foreign key to users)
- `createdAt`: Notification timestamp

**Indexes:**
- Index on `userId` for user notifications
- Index on `isRead` for unread filtering

---

### 17. VIP Settings Table (`vip_settings`)
Admin-configurable VIP level settings.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `levelKey`: Level identifier (unique, e.g., "lv1", "vip1")
- `levelName`: Display name (unique, e.g., "Level 1", "VIP 1")
- `levelOrder`: Ordering number (unique, e.g., 0, 1, 2)
- `teamRequirement`: Required team members
- `maxBet`: Maximum bet limit
- `dailyWagerReward`: Daily wager reward percentage
- `commissionRates`: JSON array of commission rates
- `rechargeAmount`: Reference USDT amount
- `isActive`: VIP level active status (true/false)
- `createdAt`: Setting creation timestamp
- `updatedAt`: Last update timestamp

---

### 18. Golden Live Stats Table (`golden_live_stats`)
Live statistics for Golden Live feature.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `totalPlayers`: Total players count
- `activePlayers`: Active players count
- `lastHourlyIncrease`: Last hourly increase timestamp
- `createdAt`: Stats creation timestamp
- `updatedAt`: Last update timestamp

---

### 19. Golden Live Events Table (`golden_live_events`)
Audit trail for Golden Live events.

**Key Fields:**
- `id` (Primary Key): Auto-generated UUID
- `eventType`: Event type ("hourly_increase", "manual_adjustment", "active_player_update")
- `previousValue`: Previous value
- `newValue`: New value
- `incrementAmount`: Increment amount
- `description`: Event description
- `createdAt`: Event timestamp

---

## VIP Levels Configuration

The system has 10 VIP levels with increasing benefits:

1. **LV1** (Default): 0 team members, 0% daily wager reward
2. **LV2**: 1 team member, 0.05% daily wager reward
3. **VIP**: 7 team members, 0.1% daily wager reward
4. **VIP 1**: 10 team members, 0.2% daily wager reward
5. **VIP 2**: 20 team members, 0.3% daily wager reward
6. **VIP 3**: 30 team members, 0.4% daily wager reward
7. **VIP 4**: 40 team members, 0.5% daily wager reward
8. **VIP 5**: 50 team members, 0.6% daily wager reward
9. **VIP 6**: 60 team members, 0.7% daily wager reward
10. **VIP 7**: 70 team members, 0.8% daily wager reward

Each level has different commission rates for referral levels.

---

## Database Relationships

### Main Relationships:
- **Users → Bets**: One user can place many bets
- **Users → Transactions**: One user can have many transactions
- **Users → Referrals**: One user can refer many users (referrer)
- **Users → User Sessions**: One user can have many sessions
- **Users → Withdrawal Requests**: One user can have many withdrawal requests
- **Users → Agent Profile**: One user (agent) has one agent profile
- **Games → Bets**: One game can have many bets
- **Games → Analytics**: One game has one analytics record
- **Referrals**: Links referrer user to referred user

---

## Important Notes for Agent

### When Recreating This Database:

1. **DO NOT MODIFY** the schema file `shared/schema.ts` - it's already complete
2. **CREATE** PostgreSQL database in Replit Tools → Database
3. **RUN** `npm run db:push` to create all tables
4. **VERIFY** connection in console logs
5. **Import Data** (if you have export from another database):
   - Use the database export/import feature in Replit
   - Or use SQL dump files

### Database Configuration:
- **ORM**: Drizzle ORM
- **Driver**: Neon Serverless Driver
- **Dialect**: PostgreSQL
- **Schema File**: `shared/schema.ts`
- **Connection**: Environment variable `DATABASE_URL` (auto-set by Replit)

### Key Features:
- ✅ UUID primary keys (auto-generated)
- ✅ Timestamps (auto-set)
- ✅ Indexes for performance
- ✅ Foreign key relationships
- ✅ Enum types for data validation
- ✅ Decimal precision for financial data
- ✅ JSON fields for flexible data

---

## Troubleshooting

### If Database Connection Fails:
1. Check if `DATABASE_URL` environment variable exists
2. Verify database is created in Replit Tools
3. Check console logs for error messages
4. Try restarting the application

### If Schema Push Fails:
1. Use `npm run db:push --force` to override warnings
2. Check for syntax errors in `shared/schema.ts`
3. Verify Drizzle Kit is installed: `npm list drizzle-kit`

### For Data Import:
1. Export data from old database using SQL dump
2. Import using Replit database tools or pgAdmin
3. Or use database migration tools

---

## Summary

This is a **complete gaming platform database** with:
- 19 database tables
- User management with VIP levels
- Game management (Color & Crash games)
- Betting system with real-time tracking
- Referral system with multi-level commission
- Financial transactions (deposits/withdrawals)
- Agent system for manual deposits/withdrawals
- Admin tools and audit logs
- Security features (2FA, Passkeys)
- Analytics and tracking

**All data is production-ready with proper indexing, relationships, and data validation.**
