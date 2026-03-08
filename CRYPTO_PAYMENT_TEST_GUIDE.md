# Crypto Payment Gateway - Complete A-Z Testing Guide

මෙම document එක NOWPayments crypto payment gateway එක කොහොමද වැඩ කරන්නේ කියලා සහ test කරන හැටි පැහැදිලි කරනවා.

## 📋 සම්පූර්ණ Flow සාරාංශය

### 1️⃣ Payment Request Creation (Payment එකක් Request කිරීම)
```
User → Frontend → Backend → NOWPayments API
```

**මෙතන වෙන දේ:**
- User deposit page එකෙන් amount එකක් සහ currency එකක් select කරනවා (TRX, USDT-TRC20, USDT-MATIC)
- Frontend `/api/payments/create` endpoint එකට POST request එකක් යවනවා
- Backend NOWPayments API එකට payment request එකක් යවනවා
- NOWPayments API එක payment address එකක් සහ amount එකක් return කරනවා

**Example Request:**
```json
POST /api/payments/create
{
  "amount": "100",
  "currency": "TRX"
}
```

**Example Response:**
```json
{
  "payment_id": 123456,
  "pay_address": "TXYZabc123...",
  "pay_amount": 1600,
  "pay_currency": "trx",
  "price_amount": 100,
  "price_currency": "USD",
  "qr_code": "data:image/png;base64,...",
  "transaction_id": "uuid-here",
  "expires_at": "2025-11-12T03:00:00Z"
}
```

### 2️⃣ Database එකේ Transaction Record එකක් Create වෙනවා

**Location:** `server/routes.ts` - Line 8566-8579

```javascript
const transaction = await storage.createTransaction({
  userId: agentId,
  agentId: agentId,
  type: "deposit",
  fiatAmount: nowPayment.price_amount.toString(),
  fiatCurrency: nowPayment.price_currency || "USD",
  cryptoAmount: nowPayment.pay_amount.toString(),
  cryptoCurrency: nowPayment.pay_currency,
  status: "pending",
  paymentMethod: "crypto",
  externalId: nowPayment.payment_id.toString(),
  paymentAddress: nowPayment.pay_address,
  fee: "0"
});
```

**මෙතන Save වෙන Data:**
- Transaction Type: `deposit`
- Status: `pending` (මුලින්ම pending එකෙන් start වෙනවා)
- Fiat Amount: USD value (e.g., 100)
- Crypto Amount: Cryptocurrency value (e.g., 1600 TRX)
- External ID: NOWPayments payment_id
- Payment Address: Crypto wallet address

### 3️⃣ User Payment කරනවා

User NOWPayments එකෙන් ලැබුණු address එකට crypto යවනවා:
- QR code එක scan කරලා or
- Address එක copy කරලා wallet එකෙන් send කරනවා

### 4️⃣ NOWPayments Webhook (IPN) Callback

Payment confirm වුණාම NOWPayments API එක webhook call back එකක් යවනවා:

**Webhook URL:** `https://your-domain.com/api/payments/webhook`

**Webhook එකේ තියෙන Data:**
```json
{
  "payment_id": 123456,
  "payment_status": "finished",
  "pay_amount": 1600,
  "actually_paid": 1600,
  "pay_currency": "trx",
  "order_id": "order_1699876543210",
  "outcome_amount": 100,
  "outcome_currency": "USD"
}
```

**Security Validation:**
```javascript
// NOWPayments IPN signature verify කරනවා HMAC SHA512 use කරලා
const signature = req.headers['x-nowpayments-sig'];
const isValid = await verifyIPNSignature(rawBody, signature, storage);
```

### 5️⃣ Payment Status Check කරනවා

**Location:** `server/routes.ts` - Webhook handler

```javascript
if (ipnData.payment_status === 'finished') {
  // Payment successful - process the deposit
} else if (['failed', 'expired', 'refunded'].includes(ipnData.payment_status)) {
  // Payment failed - update transaction status
}
```

### 6️⃣ Balance Update කරනවා

Payment successful වුණාම user balance එක update වෙනවා:

```javascript
// User balance එක update කරනවා
const newBalance = parseFloat(user.balance) + parseFloat(ipnData.outcome_amount);
await storage.updateUserBalance(userId, newBalance.toString());

// Transaction status එක update කරනවා
await storage.updateTransactionStatus(transaction.id, 'completed');
```

**Database Changes:**
- `users.balance` → වැඩි වෙනවා deposit amount එකෙන්
- `users.totalDeposits` → වැඩි වෙනවා
- `transactions.status` → `pending` to `completed`

### 7️⃣ Frontend Update

WebSocket හරහා frontend එකට real-time update එකක් යනවා:
- Balance automatically update වෙනවා
- Toast notification එකක් show වෙනවා
- Transaction history එකේ status update වෙනවා

---

## 🧪 Testing Instructions (සිංහලෙන්)

### Method 1: Frontend UI හරහා Test කරන එක

1. **Website එක open කරන්න:**
   - Browser එකෙන් application URL එක open කරන්න
   - Login වෙන්න (or register කරන්න)

2. **Deposit Page එකට යන්න:**
   - Navigation bar එකෙන් "Deposit" click කරන්න
   - Or `/deposit` route එකට යන්න

3. **Payment Details Enter කරන්න:**
   - Amount එකක් type කරන්න (e.g., 10 USD)
   - Currency එකක් select කරන්න (TRX, USDT-TRC20, or USDT-MATIC)
   - "Create Deposit" button එක click කරන්න

4. **Payment Address Copy කරන්න:**
   - QR code එක show වෙයි
   - Wallet address එක copy කරන්න
   - Amount එක copy කරන්න

5. **Payment යවන්න:**
   - ඔයාගේ crypto wallet එකෙන් එම address එකට payment එක යවන්න
   - Exact amount එක යවන්න (fee වලට වැඩියෙන්)

6. **Payment Confirm වෙනවද බලන්න:**
   - Transaction history එකෙන් status එක බලන්න
   - Balance එක update වුණාද බලන්න
   - Email notification එකක් ආවාද බලන්න

### Method 2: API Endpoints හරහා Direct Test කරන එක

#### Step 1: Payment Create කරන්න
```bash
curl -X POST https://your-domain.com/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "amount": "10",
    "currency": "TRX"
  }'
```

**Expected Response:**
```json
{
  "payment_id": 123456,
  "pay_address": "TXYZabc123...",
  "pay_amount": 160,
  "pay_currency": "trx",
  "price_amount": 10,
  "price_currency": "USD",
  "qr_code": "data:image/png;base64,...",
  "transaction_id": "uuid-here",
  "expires_at": "2025-11-12T03:00:00Z"
}
```

#### Step 2: Payment Status Check කරන්න
```bash
curl -X GET https://your-domain.com/api/payments/status/123456 \
  -H "Cookie: connect.sid=your-session-cookie"
```

**Expected Response:**
```json
{
  "payment_id": 123456,
  "payment_status": "waiting",
  "pay_address": "TXYZabc123...",
  "pay_amount": 160,
  "pay_currency": "trx",
  "price_amount": 10,
  "price_currency": "USD"
}
```

#### Step 3: Webhook Simulate කරන්න (Testing only)
```bash
curl -X POST https://your-domain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: signature-here" \
  -d '{
    "payment_id": 123456,
    "payment_status": "finished",
    "pay_amount": 160,
    "actually_paid": 160,
    "pay_currency": "trx",
    "order_id": "order_1699876543210",
    "outcome_amount": 10,
    "outcome_currency": "USD"
  }'
```

---

## 🔐 API Credentials Setup

### Environment Variables:
```bash
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here
```

### Database Settings (Alternative):
```sql
INSERT INTO system_settings (key, value) VALUES 
  ('nowpayments_api_key', 'your_api_key_here'),
  ('nowpayments_ipn_secret', 'your_ipn_secret_here');
```

**Priority:** Database Settings > Environment Variables

---

## 📊 Payment Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1. Select amount & currency
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 2. POST /api/payments/create
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 3. createNOWPayment()
       ▼
┌─────────────┐
│ NOWPayments │
│     API     │
└──────┬──────┘
       │ 4. Return payment_address
       ▼
┌─────────────┐
│   Backend   │──► 5. Create transaction (status: pending)
└──────┬──────┘
       │ 6. Return payment details
       ▼
┌─────────────┐
│  Frontend   │──► 7. Show QR code & address
└──────┬──────┘
       │ 8. User sends crypto
       ▼
┌─────────────┐
│ Blockchain  │
└──────┬──────┘
       │ 9. Transaction confirmed
       ▼
┌─────────────┐
│ NOWPayments │
└──────┬──────┘
       │ 10. POST /api/payments/webhook (IPN)
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 11. Verify signature
       │ 12. Check payment_status
       │ 13. Update transaction (status: completed)
       │ 14. Update user balance
       ▼
┌─────────────┐
│  Database   │
└──────┬──────┘
       │ 15. WebSocket broadcast
       ▼
┌─────────────┐
│  Frontend   │──► 16. Update UI, show notification
└─────────────┘
```

---

## 🔍 Debugging & Verification Checklist

### ✅ Step 1: API Credentials
- [ ] `NOWPAYMENTS_API_KEY` set වෙලා තියෙනවාද?
- [ ] `NOWPAYMENTS_IPN_SECRET` set වෙලා තියෙනවාද?
- [ ] API key valid එකක්ද? (NOWPayments dashboard එකෙන් check කරන්න)

### ✅ Step 2: Payment Creation
- [ ] `/api/payments/create` endpoint එක respond කරනවාද?
- [ ] Response එකේ `payment_id` තියෙනවාද?
- [ ] Response එකේ `pay_address` valid එකක්ද?
- [ ] QR code generate වෙනවාද?

### ✅ Step 3: Database Record
- [ ] `transactions` table එකේ record එකක් create වුණාද?
- [ ] Transaction status `pending` එකෙන් start වුණාද?
- [ ] `externalId` එක NOWPayments `payment_id` එක save වුණාද?

### ✅ Step 4: Webhook Reception
- [ ] Webhook URL එක publicly accessible එකක්ද?
- [ ] IPN signature verify වෙනවාද?
- [ ] Payment status correctly identify කරනවාද?

### ✅ Step 5: Balance Update
- [ ] User balance එක correct amount එකෙන් වැඩි වුණාද?
- [ ] `totalDeposits` එක update වුණාද?
- [ ] Transaction status `completed` වුණාද?

### ✅ Step 6: Frontend Verification
- [ ] Balance real-time එකට update වුණාද?
- [ ] Toast notification show වුණාද?
- [ ] Transaction history එකේ status update වුණාද?

---

## 🚨 Common Issues & Solutions

### Issue 1: Payment එක create වෙන්නේ නැති
**Symptoms:** API error 401 or 403
**Solution:** 
- API key එක check කරන්න
- API key එකට permissions තියෙනවාද බලන්න
- NOWPayments dashboard එකෙන් API key එක regenerate කරන්න

### Issue 2: Webhook එන්නේ නැති
**Symptoms:** Payment කළාට balance update වෙන්නේ නැති
**Solution:**
- Webhook URL එක publicly accessible එකක්ද බලන්න
- Firewall/security rules check කරන්න
- NOWPayments dashboard එකෙන් webhook logs බලන්න
- IPN callback URL එක correct එකක්ද verify කරන්න

### Issue 3: Balance update වෙන්නේ නැති
**Symptoms:** Webhook එනවා නමුත් balance එක වැඩි වෙන්නේ නැති
**Solution:**
- Server logs එකෙන් errors check කරන්න
- Database connection ok ද බලන්න
- Transaction status `completed` වුණාද බලන්න
- WebSocket connection active ද බලන්න

### Issue 4: Wrong amount credited
**Symptoms:** Balance එකට වැරදි amount එකක් add වෙනවා
**Solution:**
- IPN data එකේ `outcome_amount` use කරනවාද බලන්න (not `pay_amount`)
- Currency conversion හරියටද වෙන්නේ කියලා check කරන්න
- Decimal precision issues නැත්තද බලන්න

---

## 📱 Testing Scenarios

### Scenario 1: Successful Payment
1. Amount: $10 USD
2. Currency: TRX
3. Expected: User balance +$10, Transaction status: completed

### Scenario 2: Failed Payment
1. Amount: $10 USD
2. Currency: TRX
3. Action: User sends insufficient amount
4. Expected: Transaction status: failed, No balance change

### Scenario 3: Expired Payment
1. Amount: $10 USD
2. Currency: TRX
3. Action: Wait 30+ minutes without payment
4. Expected: Transaction status: expired, No balance change

### Scenario 4: Duplicate Webhook
1. Create payment
2. Complete payment
3. Webhook sent again (duplicate)
4. Expected: Balance shouldn't change again (idempotency)

---

## 🔄 Mock Mode vs Production Mode

### Mock Mode (Development)
- API credentials නැති විට automatically activate වෙනවා
- Fake payment addresses generate කරනවා
- Signature verification skip කරනවා
- Testing purposes only

### Production Mode
- Valid API credentials තියෙන විට
- Real NOWPayments API calls
- Full signature verification
- Real blockchain transactions

---

## 📝 Code Locations Reference

| Feature | File | Line Range |
|---------|------|-----------|
| Payment Creation | `server/nowpayments.ts` | 88-143 |
| Payment Status Check | `server/nowpayments.ts` | 145-184 |
| IPN Signature Verify | `server/nowpayments.ts` | 187-213 |
| Create Payment Route | `server/routes.ts` | 8520-8600 |
| Webhook Handler | `server/routes.ts` | Search for `/api/payments/webhook` |
| Frontend Deposit Page | `client/src/pages/deposit.tsx` | Full file |
| Transaction Schema | `shared/schema.ts` | Search for `transactions` table |

---

## 🎯 Quick Test Commands

### Test 1: Check API Credentials
```bash
# Environment variables check
echo $NOWPAYMENTS_API_KEY
echo $NOWPAYMENTS_IPN_SECRET

# Database settings check
curl -X GET https://your-domain.com/api/admin/settings \
  -H "Cookie: connect.sid=admin-session"
```

### Test 2: Create Test Payment
```bash
curl -X POST https://your-domain.com/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session" \
  -d '{"amount":"5","currency":"TRX"}' | jq
```

### Test 3: Check Transaction History
```bash
curl -X GET https://your-domain.com/api/agent/transactions \
  -H "Cookie: connect.sid=your-session" | jq
```

---

## 💡 Tips for Testing

1. **Use Small Amounts:** Start with $1-5 USD for testing
2. **Test Networks:** Use testnet coins if available
3. **Monitor Logs:** Keep server logs open while testing
4. **Check Timestamps:** Ensure payment isn't expired
5. **Verify QR Codes:** Scan QR codes before sending payment
6. **Double Check Address:** Always verify wallet address
7. **Save Payment IDs:** Keep track of payment_id for debugging
8. **Test Multiple Currencies:** Test TRX, USDT-TRC20, USDT-MATIC separately

---

## 🎉 Success Indicators

සාර්ථකව payment එකක් complete වුණාම ඔයාට පේන්න ඕනේ:

✅ NOWPayments dashboard එකේ payment status: "finished"  
✅ Database එකේ transaction status: "completed"  
✅ User balance එක වැඩි වෙලා තියෙන්න ඕනේ  
✅ Frontend balance real-time update වෙලා තියෙන්න ඕනේ  
✅ Toast notification "Deposit successful" show වෙන්න ඕනේ  
✅ Email confirmation එකක් send වෙන්න ඕනේ  
✅ Transaction history එකේ record එක තියෙන්න ඕනේ  

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Author:** Crypto Payment Integration Team
