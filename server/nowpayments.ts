import { createHmac, timingSafeEqual } from 'crypto';
import type { IStorage } from './storage';

// NOWPayments API integration
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

// Helper function to get API credentials from settings or env vars
async function getAPICredentials(storage?: IStorage): Promise<{ apiKey: string; ipnSecret: string }> {
  let apiKey = '';
  let ipnSecret = '';

  // First, try to get from database settings
  if (storage) {
    try {
      const settings = await storage.getAllSystemSettings();
      const apiKeySetting = settings.find(s => s.key === 'nowpayments_api_key');
      const ipnSecretSetting = settings.find(s => s.key === 'nowpayments_ipn_secret');
      
      if (apiKeySetting?.value) {
        apiKey = apiKeySetting.value;
      }
      if (ipnSecretSetting?.value) {
        ipnSecret = ipnSecretSetting.value;
      }
    } catch (error) {
      console.log('Could not fetch settings from database, using environment variables');
    }
  }

  // Fall back to environment variables if not found in settings
  if (!apiKey) {
    apiKey = process.env.NOWPAYMENTS_API_KEY || '';
  }
  if (!ipnSecret) {
    ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';
  }

  return { apiKey, ipnSecret };
}

// Currency mapping from UI to NOWPayments API
// NOWPayments supported currencies: https://nowpayments.io/supported-coins/
const CURRENCY_MAPPING = {
  'TRX': 'trx',                // TRON
  'USDTTRC20': 'usdttrc20',    // USDT on TRON (TRC20)
  'USDTMATIC': 'usdtmatic'     // USDT on Polygon (MATIC)
};

// Get the IPN callback URL based on environment
function getIPNCallbackURL(): string {
  // Priority order:
  // 1. APP_URL - For production deployments (DigitalOcean, VPS, etc.)
  // 2. PRODUCTION_URL - Alternative production URL env var
  // 3. REPLIT_DEV_DOMAIN - For Replit development
  // 4. localhost - For local development
  
  if (process.env.APP_URL) {
    const url = process.env.APP_URL.replace(/\/$/, ''); // Remove trailing slash
    return `${url}/api/payments/webhook`;
  }
  
  if (process.env.PRODUCTION_URL) {
    const url = process.env.PRODUCTION_URL.replace(/\/$/, '');
    return `${url}/api/payments/webhook`;
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/payments/webhook`;
  }
  
  return 'http://localhost:5000/api/payments/webhook';
}

interface NOWPaymentResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  ipn_callback_url?: string;
  order_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

export async function createNOWPayment(amountUSD: string, currency: string, storage?: IStorage): Promise<NOWPaymentResponse | null> {
  const apiCurrency = CURRENCY_MAPPING[currency as keyof typeof CURRENCY_MAPPING] || currency.toLowerCase();
  
  // Get API credentials from settings or env vars
  const { apiKey } = await getAPICredentials(storage);
  
  // For development, use a mock implementation if no API key is provided
  const IS_MOCK = !apiKey;
  
  if (IS_MOCK) {
    // Mock response for development
    const mockPayAmount = currency === 'TRX' ? (parseFloat(amountUSD) * 16) : parseFloat(amountUSD); // Mock conversion
    return {
      payment_id: Math.floor(Math.random() * 1000000),
      payment_status: 'waiting',
      pay_address: generateMockAddress(currency),
      pay_amount: mockPayAmount,
      pay_currency: apiCurrency,
      price_amount: parseFloat(amountUSD),
      price_currency: 'USD',
      ipn_callback_url: getIPNCallbackURL(),
      order_id: `order_${Date.now()}`
    };
  }

  try {
    const ipnCallbackUrl = getIPNCallbackURL();
    
    const paymentRequest = {
      price_amount: parseFloat(amountUSD),
      price_currency: 'USD',
      pay_currency: apiCurrency,
      ipn_callback_url: ipnCallbackUrl,
      order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log(`💳 Creating NOWPayments payment:`);
    console.log(`   Amount: ${paymentRequest.price_amount} ${paymentRequest.price_currency}`);
    console.log(`   Pay Currency: ${paymentRequest.pay_currency} (UI: ${currency})`);
    console.log(`   IPN Callback: ${ipnCallbackUrl}`);
    console.log(`   Order ID: ${paymentRequest.order_id}`);
    
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(paymentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ NOWPayments API error: ${response.status}`);
      console.error(`   Error details: ${errorText}`);
      console.error(`   Requested currency: ${apiCurrency}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Payment created successfully:`);
    console.log(`   Payment ID: ${data.payment_id}`);
    console.log(`   Pay Address: ${data.pay_address}`);
    console.log(`   Pay Amount: ${data.pay_amount} ${data.pay_currency}`);
    console.log(`   Status: ${data.payment_status}`);
    return data;
  } catch (error) {
    console.error('Error creating NOWPayments payment:', error);
    return null;
  }
}

export async function getNOWPaymentStatus(paymentId: string, storage?: IStorage): Promise<NOWPaymentResponse | null> {
  // Get API credentials from settings or env vars
  const { apiKey } = await getAPICredentials(storage);
  
  // For development, use a mock implementation if no API key is provided
  const IS_MOCK = !apiKey;
  
  if (IS_MOCK) {
    // Mock response for development
    return {
      payment_id: parseInt(paymentId),
      payment_status: 'waiting',
      pay_address: generateMockAddress('USDT'),
      pay_amount: 100,
      pay_currency: 'USDTTRC20',
      price_amount: 100,
      price_currency: 'USD'
    };
  }

  try {
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      console.error('NOWPayments status API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting NOWPayments status:', error);
    return null;
  }
}

// IPN signature verification
export async function verifyIPNSignature(rawBody: Buffer, signature: string, storage?: IStorage): Promise<boolean> {
  // Get API credentials from settings or env vars
  const { ipnSecret } = await getAPICredentials(storage);
  
  // For development, use a mock implementation if no secret is provided
  const IS_MOCK = !ipnSecret;
  
  if (IS_MOCK) {
    return true; // Skip verification in mock mode only
  }
  
  if (!signature || !ipnSecret) {
    return false;
  }
  
  const hmac = createHmac('sha512', ipnSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');
  
  // Use constant-time comparison
  try {
    return timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function generateMockAddress(currency: string): string {
  const addressPrefixes = {
    'TRX': 'T',
    'USDTTRC20': 'T',
    'USDTMATIC': '0x'
  };
  
  const prefix = addressPrefixes[currency as keyof typeof addressPrefixes] || 'T';
  
  // Generate proper length addresses
  if (prefix === '0x') {
    // Ethereum/Polygon addresses are 40 hex characters after 0x
    const hexChars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 40; i++) {
      randomHex += hexChars[Math.floor(Math.random() * hexChars.length)];
    }
    return `0x${randomHex}`;
  } else {
    // TRON addresses are 34 characters total (T + 33 base58 characters)
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let randomBase58 = '';
    for (let i = 0; i < 33; i++) {
      randomBase58 += base58Chars[Math.floor(Math.random() * base58Chars.length)];
    }
    return `${prefix}${randomBase58}`;
  }
}