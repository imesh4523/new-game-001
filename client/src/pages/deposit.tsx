import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CreditCard, Wallet, Copy, Check, AlertCircle, Coins, History, Clock } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { useLocation } from "wouter";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";
import FallingAnimation from "@/components/falling-animation";
import trxIcon from "@assets/crypto-icons/trx.webp";
import usdtIcon from "@assets/crypto-icons/usdt.png";
import polygonIcon from "@assets/crypto-icons/polygon.svg";

const cryptoCurrencies = [
  { value: "TRX", label: "TRX", icon: trxIcon, network: "TRON" },
  { value: "USDTTRC20", label: "USDT", icon: usdtIcon, network: "TRC20" },
  { value: "USDTMATIC", label: "USDT", icon: polygonIcon, network: "Polygon" }
];

// Display mapping for currency codes (backend API codes -> user-friendly display names)
const currencyDisplayNames: Record<string, string> = {
  'trx': 'TRX',
  'usdttrc20': 'USDTTRC20',
  'usdtmatic': 'USDTPOLYGON' // Display as USDTPOLYGON for better clarity
};

// Helper function to get display name for currency
const getCurrencyDisplayName = (currency: string): string => {
  const lowerCurrency = currency.toLowerCase();
  return currencyDisplayNames[lowerCurrency] || currency.toUpperCase();
};

interface PaymentData {
  payment_id: number;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  qr_code: string;
  transaction_id: string;
  expires_at: string;
}

export default function DepositPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("11");
  const [currency, setCurrency] = useState("TRX");
  const [network, setNetwork] = useState("TRON");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);

  // Get user data
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Get payment methods visibility settings
  const { data: paymentMethodsSettings } = useQuery<{ trx: boolean; usdttrc20: boolean; usdtmatic: boolean }>({
    queryKey: ['/api/payment-methods-settings'],
  });

  // Get user's deposit history
  const { data: transactionsData } = useQuery<{ transactions: any[] }>({
    queryKey: ['/api/user/transactions', { type: 'deposit', limit: 10 }],
  });

  // Filter available crypto currencies based on admin settings
  const availableCryptoCurrencies = cryptoCurrencies.filter(crypto => {
    if (!paymentMethodsSettings) return true; // Show all if settings not loaded yet
    
    if (crypto.value === "TRX") {
      return paymentMethodsSettings.trx;
    } else if (crypto.value === "USDTTRC20") {
      return paymentMethodsSettings.usdttrc20;
    } else if (crypto.value === "USDTMATIC") {
      return paymentMethodsSettings.usdtmatic;
    }
    return true;
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { amount: string; currency: string }) => {
      const response = await apiRequest("POST", "/api/payments/create", data);
      return response.json();
    },
    onSuccess: (data: PaymentData) => {
      setPaymentData(data);
      // Calculate initial time left
      const expiresAt = new Date(data.expires_at).getTime();
      const now = Date.now();
      const timeDiff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(timeDiff);
      
      toast({
        title: "Payment Created",
        description: "Your deposit address has been generated. Please scan the QR code or copy the address.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/demo'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  const handleDeposit = () => {
    if (!amount || !currency) {
      toast({
        title: "Error",
        description: "Please enter amount and select currency",
        variant: "destructive",
      });
      return;
    }

    // Check minimum amounts based on currency
    const minAmount = currency === "TRX" ? 11 : 11; // 11 USDT or 11 TRX minimum
    if (parseFloat(amount) < minAmount) {
      toast({
        title: "Error",
        description: `Minimum deposit amount is ${minAmount} ${currency === "TRX" ? "TRX" : "USDT"}`,
        variant: "destructive",
      });
      return;
    }

    // For USDT, require network selection
    if (currency.includes("USDT") && !network) {
      toast({
        title: "Error",
        description: "Please select a network for USDT",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate({ amount, currency });
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Redirect to signup if not authenticated (after loading completes)
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/signup');
    }
  }, [user, isLoading, setLocation]);

  // Update currency if current selection is not available
  useEffect(() => {
    if (paymentMethodsSettings && availableCryptoCurrencies.length > 0) {
      const isCurrencyAvailable = availableCryptoCurrencies.some(c => c.value === currency);
      if (!isCurrencyAvailable) {
        // Set to first available currency
        const firstAvailable = availableCryptoCurrencies[0];
        setCurrency(firstAvailable.value);
        setNetwork(firstAvailable.network);
      }
    }
  }, [paymentMethodsSettings, availableCryptoCurrencies, currency]);

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!paymentData?.pay_address) return;
    
    try {
      await navigator.clipboard.writeText(paymentData.pay_address);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "The deposit address has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  // Copy amount to clipboard
  const copyAmount = async () => {
    if (!paymentData?.pay_amount) return;
    
    try {
      await navigator.clipboard.writeText(paymentData.pay_amount.toString());
      setAmountCopied(true);
      toast({
        title: "Amount Copied",
        description: "The payment amount has been copied to your clipboard.",
      });
      setTimeout(() => setAmountCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy amount. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const selectedCrypto = availableCryptoCurrencies.find(c => c.value === currency);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4">
      <FallingAnimation />
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/')}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold text-white">Deposit</h1>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {formatGoldCoins(usdToGoldCoins(user?.balance || "0"))}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Form */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5 text-yellow-400" />
              Crypto Deposit
            </CardTitle>
            <CardDescription className="text-white/70">
              Add funds to your account using cryptocurrency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Crypto/Domestic Tabs */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button 
                  className="flex-1 py-2 px-4 text-sm font-medium rounded-md bg-blue-500 text-white"
                  data-testid="tab-crypto"
                >
                  Crypto
                </button>
                <button 
                  className="flex-1 py-2 px-4 text-sm font-medium rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => setLocation('/agent-deposit')}
                  data-testid="tab-domestic"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Domestic</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
                      <SiBinance className="w-3 h-3" />
                      0 Fees
                    </span>
                  </div>
                </button>
              </div>

              {/* Currency Selection */}
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-white/90">Deposit Currency</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableCryptoCurrencies.map((crypto) => (
                    <button
                      key={crypto.value}
                      onClick={() => {
                        setCurrency(crypto.value);
                        // Auto-select network based on currency
                        if (crypto.value === "TRX") {
                          setNetwork("TRON");
                        } else if (crypto.value === "USDTTRC20") {
                          setNetwork("TRC20");
                        } else if (crypto.value === "USDTMATIC") {
                          setNetwork("Polygon");
                        }
                      }}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        currency === crypto.value 
                          ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      }`}
                      data-testid={`button-crypto-${crypto.value}`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={crypto.icon} 
                          alt={crypto.label} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold">{crypto.label}</span>
                          <span className="text-xs opacity-75">{crypto.network}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Payment Details Section - Show after payment is created */}
            {paymentData && (
              <div className="space-y-4 bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Payment Created</h3>
                  <p className="text-sm text-white/70 mb-4">
                    Scan the QR code or copy the address below to complete your deposit
                  </p>
                </div>
                
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <img 
                      src={paymentData.qr_code} 
                      alt="Payment QR Code" 
                      className="w-48 h-48"
                      data-testid="img-qr-code"
                    />
                  </div>
                </div>
                
                {/* Countdown Timer */}
                <div className="text-center mb-4">
                  <p className="text-white/70 text-sm">Time remaining</p>
                  <div className="text-2xl font-bold text-yellow-400" data-testid="text-countdown">
                    {formatCountdown(timeLeft)}
                  </div>
                </div>
                
                {/* Important Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200/90">
                      <p className="font-semibold mb-1">⚠️ Important - Currency Match Required</p>
                      <p className="text-xs text-yellow-200/70">
                        Please send EXACTLY the currency shown below ({getCurrencyDisplayName(paymentData.pay_currency)}). 
                        Sending a different cryptocurrency will cause payment errors and delays.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Amount */}
                <div className="space-y-2">
                  <p className="text-white/90 font-medium text-center mb-2">
                    Send exactly this amount to the address below
                  </p>
                  <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-yellow-400 font-bold text-lg" data-testid="text-payment-amount">
                        {paymentData.pay_amount} {getCurrencyDisplayName(paymentData.pay_currency)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyAmount}
                        className="flex-shrink-0 text-yellow-400 hover:text-yellow-300 hover:bg-white/10"
                        data-testid="button-copy-amount"
                      >
                        {amountCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Payment Address */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-white/90 text-sm break-all" data-testid="text-payment-address">
                      {paymentData.pay_address}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={copyAddress}
                      className="flex-shrink-0 text-white/70 hover:text-white hover:bg-white/10"
                      data-testid="button-copy-address"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <Button
                  onClick={() => {
                    setPaymentData(null);
                    setAmount("11");
                    setCurrency("TRX");
                    setNetwork("TRON");
                    setTimeLeft(0);
                  }}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-new-payment"
                >
                  Create New Payment
                </Button>
              </div>
            )}
            
            {!paymentData && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white/90">Amount (USD)</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount (min. 11)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-16 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      step="0.1"
                      data-testid="input-amount"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-white/50">
                      USD
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    Minimum deposit: 11 USD
                  </p>
                </div>

                {/* Recharge Tips */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-white/90">Recharge Tips</h4>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">1.</span>
                      <span>The recharge amount must be greater than or equal to 11 USD</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">2.</span>
                      <span>The recharge address will be valid for 30 mins. If you cannot recharge successfully in 30 mins, the wallet address will be invalid.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">3.</span>
                      <span>If you have any other questions, please contact us at: <span className="text-yellow-400">support@threexbet.com</span></span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={createPaymentMutation.isPending || !amount || !currency || (currency.includes("USDT") && !network)}
                  className="w-full bg-green-500 hover:bg-green-600"
                  data-testid="button-deposit"
                >
                  {createPaymentMutation.isPending ? "Creating Payment..." : "Create Deposit"}
                </Button>
              </>
            )}

          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-white/90">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5"></div>
                <div>
                  <strong className="text-white">Instant Processing:</strong> Your deposit will be credited within 1-3 confirmations
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5"></div>
                <div>
                  <strong className="text-white">Secure:</strong> All transactions are securely processed
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5"></div>
                <div>
                  <strong className="text-white">No Hidden Fees:</strong> Only network fees apply
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}