import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Send, AlertTriangle, Eye, EyeOff, Shield, Clock, CheckCircle, XCircle, ExternalLink, Copy } from "lucide-react";
import { useLocation } from "wouter";
import FallingAnimation from "@/components/falling-animation";
import BettingRequirementNotification from "@/components/betting-requirement-notification";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";
import trxIcon from "@assets/crypto-icons/trx.webp";
import usdtIcon from "@assets/crypto-icons/usdt.png";

const cryptoCurrencies = [
  { value: "TRX", label: "TRX", iconSrc: trxIcon, network: "TRON", minWithdraw: 1200, networkFeeCoins: 45 },
  { value: "USDT_TRC20", label: "USDT", iconSrc: usdtIcon, network: "TRC20", minWithdraw: 1200, networkFeeCoins: 100 }
];

interface Transaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  currency?: string;
  cryptoCurrency?: string;
  network?: string;
  address?: string;
  createdAt: string;
  transactionHash?: string;
  fee?: string;
}

interface TransactionApiResponse {
  transactions: Transaction[];
  total: number;
}

export default function WithdrawalPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [address, setAddress] = useState("");
  const [withdrawalPassword, setWithdrawalPassword] = useState("");
  const [showWithdrawalPassword, setShowWithdrawalPassword] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Get user data
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: demoUser } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user,
  });

  // Get agent profile data if user is an agent
  const { data: agentData } = useQuery<any>({
    queryKey: ['/api/agent/profile'],
    enabled: user?.role === 'agent',
  });

  const currentUser = user || demoUser;
  const isAgent = currentUser?.role === 'agent';
  
  // For agents, use earnings balance; for regular users, use regular balance
  const availableBalance = isAgent && agentData?.agentProfile?.earningsBalance 
    ? parseFloat(agentData.agentProfile.earningsBalance)
    : (currentUser?.balance ? parseFloat(currentUser.balance) : 0);
    
  // Convert USD balance to coins for display and calculations
  const userBalanceInCoins = usdToGoldCoins(availableBalance);

  // Get user transactions
  const { data: transactionData, isLoading: isLoadingTransactions } = useQuery<TransactionApiResponse>({
    queryKey: ['/api/user/transactions'],
    enabled: !!user,
    retry: false,
  });

  const transactions = transactionData?.transactions || [];
  const withdrawalTransactions = transactions.filter(t => t.type === 'withdrawal');

  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: string; currency: string; address: string; withdrawalPassword: string }) => {
      const response = await apiRequest("POST", "/api/payments/withdraw", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for processing.",
      });
      setAmount("");
      setCurrency("");
      setAddress("");
      setWithdrawalPassword("");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/demo'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] });
      if (isAgent) {
        queryClient.invalidateQueries({ queryKey: ['/api/agent/profile'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create withdrawal",
        variant: "destructive",
      });
    },
  });

  const handleWithdrawal = () => {
    if (!amount || !currency || !address || !withdrawalPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields including withdrawal password",
        variant: "destructive",
      });
      return;
    }

    const selectedCrypto = cryptoCurrencies.find(c => c.value === currency);
    const withdrawAmount = parseFloat(amount);
    const coinAmount = withdrawAmount;
    
    const networkFee = selectedCrypto?.networkFeeCoins || 0;
    const totalCoinsNeeded = coinAmount + networkFee;

    if (coinAmount < 1200) {
      toast({
        title: "Error",
        description: "Minimum withdrawal amount is 1200 coins",
        variant: "destructive",
      });
      return;
    }

    if (userBalanceInCoins < totalCoinsNeeded) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough coins for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    createWithdrawalMutation.mutate({ amount, currency, address, withdrawalPassword });
  };

  const selectedCrypto = cryptoCurrencies.find(c => c.value === currency);
  const coinAmount = parseFloat(amount) || 0;
  const cryptoEquivalent = coinAmount / 100;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'rejected':
      case 'cancelled':
      case 'canceled':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    // Map status to display labels
    const statusLabels: any = {
      'completed': 'Completed',
      'approved': 'Completed',
      'pending': 'Pending',
      'rejected': 'Canceled',
      'cancelled': 'Canceled',
      'canceled': 'Canceled',
      'failed': 'Failed'
    };
    
    const variants: any = {
      'completed': 'default',
      'approved': 'default',
      'pending': 'secondary',
      'rejected': 'destructive',
      'cancelled': 'destructive',
      'canceled': 'destructive',
      'failed': 'destructive'
    };
    
    const displayLabel = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="text-xs">
        {displayLabel}
      </Badge>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

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
            <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Withdrawal</h1>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              Available Coins
              {isAgent && (
                <Badge variant="outline" className="text-xs border-white/30 text-white">
                  Earnings Balance
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {formatGoldCoins(userBalanceInCoins)}
            </div>
            {isAgent && (
              <p className="text-xs text-white/60 mt-2">
                This shows your commission earnings available for withdrawal
              </p>
            )}
          </CardContent>
        </Card>

        {/* Betting Requirement Notification - Hidden as per user request */}
        {/* {user && !isAgent && <BettingRequirementNotification />} */}

        {/* Tabs for Withdrawal and History */}
        <Tabs defaultValue="withdrawal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-md border border-white/20">
            <TabsTrigger value="withdrawal" className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="history" className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawal" className="space-y-6">
            {/* Withdrawal Form */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Send className="w-5 h-5 text-red-400" />
                  Crypto Withdrawal
                </CardTitle>
                <CardDescription className="text-white/70">
                  Withdraw your coins to your crypto wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Selection */}
                <div className="space-y-2">
                  <Label className="text-white/90">Select Cryptocurrency</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {cryptoCurrencies.map((crypto) => (
                      <button
                        key={crypto.value}
                        onClick={() => setCurrency(crypto.value)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          currency === crypto.value 
                            ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                        data-testid={`button-crypto-${crypto.value}`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={crypto.iconSrc} 
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

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white/90">Amount (Coins)</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="1200"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      step="100"
                      min="1200"
                      data-testid="input-amount"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-white/50">
                      🪙
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    Minimum withdrawal: 1200 coins
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-white/90">Wallet Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder={`Enter your ${selectedCrypto?.label || 'crypto'} wallet address`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    data-testid="input-address"
                  />
                  <p className="text-xs text-white/60">
                    Make sure this address supports {selectedCrypto?.network || 'the selected'} network
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdrawalPassword" className="text-white/90">Withdrawal Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="withdrawalPassword"
                      type={showWithdrawalPassword ? "text" : "password"}
                      placeholder="Enter withdrawal password"
                      value={withdrawalPassword}
                      onChange={(e) => setWithdrawalPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      data-testid="input-withdrawal-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalPassword(!showWithdrawalPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                      data-testid="button-toggle-withdrawal-password"
                    >
                      {showWithdrawalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-white/60">
                    For security, enter your withdrawal password to confirm
                  </p>
                </div>

                {currency && amount && (
                  <div className="space-y-3 p-3 bg-white/5 border border-white/20 rounded-lg">
                    <div className="flex justify-between text-sm text-white/90">
                      <span>You will receive:</span>
                      <span className="font-medium text-yellow-400">
                        {cryptoEquivalent.toFixed(6)} {selectedCrypto?.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white/70">
                      <span>Network Fee:</span>
                      <span>
                        {selectedCrypto?.networkFeeCoins || 0} coins
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-white/20 pt-3 text-white">
                      <span>Total Amount:</span>
                      <span className="text-yellow-400">
                        {coinAmount + (selectedCrypto?.networkFeeCoins || 0)} coins
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleWithdrawal}
                  disabled={
                    createWithdrawalMutation.isPending || 
                    !amount || 
                    !currency || 
                    !address ||
                    !withdrawalPassword
                  }
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
                  data-testid="button-withdraw"
                >
                  {createWithdrawalMutation.isPending ? "Processing..." : "Request Withdrawal"}
                </Button>
              </CardContent>
            </Card>

            {/* Warning Card */}
            <Card className="bg-white/10 backdrop-blur-md border-red-400/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <h4 className="font-medium text-red-400">Important Notice</h4>
                    <ul className="space-y-1 text-white/70">
                      <li>• Withdrawals are processed within 1m to 24 hours</li>
                      <li>• Double-check your wallet address - transactions cannot be reversed</li>
                      <li>• Network fees may vary based on blockchain congestion</li>
                      <li>• Minimum withdrawal amount is 1200 coins</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Transaction History */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Withdrawal History</CardTitle>
                <CardDescription className="text-white/70">
                  Click on any transaction to view full details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="text-center py-8 text-white/70">Loading...</div>
                ) : withdrawalTransactions.length === 0 ? (
                  <div className="text-center py-8 text-white/70">
                    No withdrawal history yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawalTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        onClick={() => setSelectedTransaction(transaction)}
                        className="p-4 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        data-testid={`transaction-${transaction.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transaction.status)}
                            <div>
                              <div className="font-medium text-white">
                                {transaction.currency || 'USDT'} Withdrawal
                              </div>
                              <div className="text-xs text-white/60">
                                {formatDate(transaction.createdAt)}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(transaction.status)}
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-white/90">
                            <span>Amount:</span>
                            <span className="font-medium text-red-400">
                              -{usdToGoldCoins(parseFloat(transaction.amount || '0')).toLocaleString()} coins
                            </span>
                          </div>
                          {(() => {
                            const crypto = transaction.currency || transaction.cryptoCurrency;
                            const matchedCrypto = cryptoCurrencies.find(c => 
                              c.value === crypto || crypto?.includes(c.value)
                            );
                            const networkFee = matchedCrypto?.networkFeeCoins || 0;
                            
                            return networkFee > 0 ? (
                              <div className="flex justify-between text-white/60">
                                <span>Network Fee:</span>
                                <span>{networkFee} coins</span>
                              </div>
                            ) : null;
                          })()}
                          {transaction.network && (
                            <div className="flex justify-between text-white/60">
                              <span>Network:</span>
                              <span>{transaction.network}</span>
                            </div>
                          )}
                          {transaction.address && (
                            <div className="flex justify-between text-white/60">
                              <span>Address:</span>
                              <span className="font-mono text-xs truncate max-w-[150px]">
                                {transaction.address}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                          <span>Click for full details</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTransaction && getStatusIcon(selectedTransaction.status)}
              Transaction Details
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Complete information about this withdrawal
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-white/80">Status:</span>
                {getStatusBadge(selectedTransaction.status)}
              </div>

              {/* Transaction ID */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70">Transaction ID:</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedTransaction.id, "Transaction ID")}
                    className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/10"
                    data-testid="button-copy-tx-id"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs font-mono text-white break-all" data-testid="text-transaction-id">
                  {selectedTransaction.id}
                </p>
              </div>

              {/* Amount Details */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Amount:</span>
                  <span className="font-medium text-red-400" data-testid="text-amount-detail">
                    -{usdToGoldCoins(parseFloat(selectedTransaction.amount || '0')).toLocaleString()} coins
                  </span>
                </div>
                {(() => {
                  const crypto = selectedTransaction.currency || selectedTransaction.cryptoCurrency;
                  const matchedCrypto = cryptoCurrencies.find(c => 
                    c.value === crypto || crypto?.includes(c.value)
                  );
                  const networkFee = matchedCrypto?.networkFeeCoins || 0;
                  const coinAmount = usdToGoldCoins(parseFloat(selectedTransaction.amount || '0'));
                  const cryptoAmount = (coinAmount / 100).toFixed(6);
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">You Received:</span>
                        <span className="text-yellow-400">{cryptoAmount} {selectedTransaction.currency || 'USDT'}</span>
                      </div>
                      {networkFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Network Fee:</span>
                          <span className="text-white/60">{networkFee} coins</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Crypto Details */}
              {selectedTransaction.network && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70">Network:</span>
                    <span className="font-medium text-white">{selectedTransaction.network}</span>
                  </div>
                </div>
              )}

              {/* Wallet Address */}
              {selectedTransaction.address && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">Wallet Address:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedTransaction.address!, "Wallet address")}
                      className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/10"
                      data-testid="button-copy-address"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-white break-all" data-testid="text-wallet-address">
                    {selectedTransaction.address}
                  </p>
                </div>
              )}

              {/* Transaction Hash */}
              {selectedTransaction.transactionHash && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">Transaction Hash:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedTransaction.transactionHash!, "Transaction hash")}
                      className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/10"
                      data-testid="button-copy-hash"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-white break-all" data-testid="text-tx-hash">
                    {selectedTransaction.transactionHash}
                  </p>
                </div>
              )}

              {/* Date & Time */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Date & Time:</span>
                  <span className="text-white text-sm" data-testid="text-date-detail">
                    {formatFullDate(selectedTransaction.createdAt)}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setSelectedTransaction(null)}
                className="w-full bg-blue-500 hover:bg-blue-600"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
