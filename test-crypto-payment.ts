import { createNOWPayment, getNOWPaymentStatus } from './server/nowpayments';

async function testCryptoPayment() {
  console.log('\n🧪 ========== CRYPTO PAYMENT GATEWAY TEST ==========\n');
  
  // Test 1: API Credentials Check
  console.log('📋 Step 1: Checking API Credentials...');
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  
  if (apiKey) {
    console.log('✅ NOWPAYMENTS_API_KEY: Exists (Length:', apiKey.length, ')');
  } else {
    console.log('⚠️  NOWPAYMENTS_API_KEY: Not set (Will use MOCK mode)');
  }
  
  if (ipnSecret) {
    console.log('✅ NOWPAYMENTS_IPN_SECRET: Exists (Length:', ipnSecret.length, ')');
  } else {
    console.log('⚠️  NOWPAYMENTS_IPN_SECRET: Not set (Will use MOCK mode)');
  }
  
  const mode = apiKey ? 'PRODUCTION (Real API)' : 'MOCK (Testing)';
  console.log('\n🔧 Mode:', mode);
  
  // Test 2: Create Payment Request
  console.log('\n📋 Step 2: Creating Payment Request...');
  console.log('   Amount: $10 USD');
  console.log('   Currency: TRX');
  
  try {
    const payment = await createNOWPayment('10', 'TRX');
    
    if (payment) {
      console.log('\n✅ Payment Created Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Payment Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Payment ID:', payment.payment_id);
      console.log('   Status:', payment.payment_status);
      console.log('   Pay Address:', payment.pay_address);
      console.log('   Pay Amount:', payment.pay_amount, payment.pay_currency.toUpperCase());
      console.log('   Price Amount:', payment.price_amount, payment.price_currency);
      console.log('   IPN Callback:', payment.ipn_callback_url || 'Not set');
      console.log('   Order ID:', payment.order_id || 'Not set');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Test 3: Check Payment Status
      console.log('📋 Step 3: Checking Payment Status...');
      const status = await getNOWPaymentStatus(payment.payment_id.toString());
      
      if (status) {
        console.log('\n✅ Payment Status Retrieved!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Status Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Payment ID:', status.payment_id);
        console.log('   Status:', status.payment_status);
        console.log('   Pay Address:', status.pay_address);
        console.log('   Expected Amount:', status.pay_amount, status.pay_currency.toUpperCase());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        console.log('❌ Failed to retrieve payment status\n');
      }
      
      // Test Summary
      console.log('\n📊 ========== TEST SUMMARY ==========\n');
      console.log('✅ API Credentials:', apiKey ? 'Real' : 'Mock');
      console.log('✅ Payment Creation:', 'Success');
      console.log('✅ Payment Status Check:', status ? 'Success' : 'Failed');
      console.log('\n📝 Next Steps to Complete Payment:');
      console.log('   1. Send', payment.pay_amount, payment.pay_currency.toUpperCase(), 'to:', payment.pay_address);
      console.log('   2. Wait for blockchain confirmation (usually 1-5 minutes)');
      console.log('   3. NOWPayments will send IPN webhook to your server');
      console.log('   4. Server will verify signature and update user balance');
      console.log('   5. User will see balance increase in real-time\n');
      
      console.log('🔍 To monitor the payment:');
      if (apiKey) {
        console.log('   - Visit NOWPayments Dashboard: https://account.nowpayments.io/payments');
        console.log('   - Search for Payment ID:', payment.payment_id);
      } else {
        console.log('   - This is MOCK mode - no real blockchain transaction');
        console.log('   - In production, check NOWPayments dashboard');
      }
      
      console.log('\n💡 Database Transaction Flow:');
      console.log('   1. Transaction created with status: "pending"');
      console.log('   2. ExternalId:', payment.payment_id);
      console.log('   3. When payment confirmed, status → "completed"');
      console.log('   4. User balance += $' + payment.price_amount);
      console.log('   5. totalDeposits += $' + payment.price_amount);
      
    } else {
      console.log('\n❌ Payment Creation Failed!');
      console.log('   Check server logs for errors\n');
    }
    
  } catch (error) {
    console.log('\n❌ Error during test:');
    console.error(error);
  }
  
  console.log('\n🧪 ========== TEST COMPLETE ==========\n');
}

testCryptoPayment();
