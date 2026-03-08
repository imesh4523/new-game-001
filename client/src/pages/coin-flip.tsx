import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Coins, Play, TrendingUp } from "lucide-react";
import LiveBalance from "@/components/live-balance";
import BottomNav from "@/components/BottomNav";
import WinCelebration from "@/components/win-celebration";
import LossAnimation from "@/components/loss-animation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { goldCoinsToUsd, usdToGoldCoins, formatGoldCoins, formatGoldCoinsText } from "@/lib/currency";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAudioNotifications } from "@/hooks/use-audio-notifications";

type CoinSide = "head" | "tail" | null;

export default function CoinFlipPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { balanceUpdates } = useWebSocket();
  const { playNotification, initializeAudio } = useAudioNotifications();

  const [selectedSide, setSelectedSide] = useState<CoinSide>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide>(null);
  const [showResult, setShowResult] = useState(false);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showLossAnimation, setShowLossAnimation] = useState(false);
  const [lossAmount, setLossAmount] = useState(0);
  const [blockBalanceUpdate, setBlockBalanceUpdate] = useState(false);

  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlippingRef = useRef(false);

  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);


  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: publicSettings, isLoading: isLoadingSettings, isError: isSettingsError } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const coinflipEnabled = isSettingsError ? false : publicSettings?.find(s => s.key === 'coinflip_enabled')?.value !== 'false';

  const { data: gameHistory = [], isLoading: isHistoryLoading } = useQuery<Array<{
    id: string;
    userId: string;
    selectedSide: string;
    result: string;
    betAmount: string;
    won: boolean;
    winAmount: string | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/coin-flip/history'],
    enabled: !!user,
  });

  const flipCoinMutation = useMutation({
    mutationFn: async (betData: { side: string; amount: number }) => {
      const response = await apiRequest("POST", "/api/coin-flip/play", {
        side: betData.side,
        amount: goldCoinsToUsd(betData.amount).toString(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data.result);
      setShowResult(false);
      setShowWinCelebration(false);
      setShowLossAnimation(false);
      
      playNotification({ frequency: 600, duration: 150, type: 'beep', volume: 0.4 });
      
      soundIntervalRef.current = setInterval(() => {
        playNotification({ frequency: 800, duration: 100, type: 'beep', volume: 0.3 });
      }, 500);
      
      flipTimeoutRef.current = setTimeout(() => {
        if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
        isFlippingRef.current = false;
        setIsFlipping(false);
        setShowResult(true);
        
        playNotification({ 
          frequency: data.won ? 1200 : 400, 
          duration: 300, 
          type: data.won ? 'alert' : 'warning',
          volume: 0.5 
        });
        
        // Refresh game history and balance from database immediately
        queryClient.invalidateQueries({ queryKey: ['/api/coin-flip/history'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
        
        // Unblock balance updates so the new balance shows immediately
        setBlockBalanceUpdate(false);
        
        if (data.won) {
          setWinAmount(parseFloat(data.winAmount));
          setShowWinCelebration(true);
          toast({
            title: "🎉 You Won!",
            description: `You won ${formatGoldCoinsText(usdToGoldCoins(parseFloat(data.winAmount)))}!`,
          });
        } else {
          setLossAmount(goldCoinsToUsd(betAmount));
          setShowLossAnimation(true);
          toast({
            title: "Better Luck Next Time",
            description: `The coin landed on ${data.result}`,
            variant: "destructive",
          });
        }
        
        resultTimeoutRef.current = setTimeout(() => {
          setShowResult(false);
          setResult(null);
        }, 3000);
      }, 8000);
    },
    onError: (error: any) => {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
      isFlippingRef.current = false;
      setIsFlipping(false);
      
      let errorMessage = "Failed to flip coin";
      
      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        errorMessage = "Server is currently unavailable. Please check your internet connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timed out. The server might be slow or down. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFlip = () => {
    if (isFlippingRef.current || isFlipping || flipCoinMutation.isPending) {
      return;
    }

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to play",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    if (!selectedSide) {
      toast({
        title: "Select a Side",
        description: "Please choose Head or Tail",
        variant: "destructive",
      });
      return;
    }

    if (betAmount < 10) {
      toast({
        title: "Invalid Bet",
        description: "Minimum bet is 10 coins",
        variant: "destructive",
      });
      return;
    }

    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    
    isFlippingRef.current = true;
    setIsFlipping(true);
    setResult(null);
    setShowResult(false);
    setBlockBalanceUpdate(true);
    flipCoinMutation.mutate({ side: selectedSide, amount: betAmount });
  };

  const betAmounts = [10, 50, 100, 500, 1000];

  if (isLoading || isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!coinflipEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
          <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/games')}
              className="text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <LiveBalance user={user} balanceUpdates={balanceUpdates} blockUpdate={blockBalanceUpdate} />
          </div>

          <div className="flex items-center justify-center min-h-[70vh]">
            <Card className="bg-black/30 backdrop-blur-md border border-orange-500/30 p-8 max-w-md mx-4">
              <CardContent className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Coins className="w-10 h-10 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Under Maintenance</h2>
                  <p className="text-white/70 mb-4">
                    The Coinflip game is currently under maintenance. We're working to make it even better!
                  </p>
                  <p className="text-orange-300 text-sm">
                    Please check back later or try our other games.
                  </p>
                </div>
                <Button
                  onClick={() => setLocation('/games')}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold"
                  data-testid="button-back-to-games"
                >
                  Back to Games
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      {showWinCelebration && (
        <WinCelebration 
          winAmount={winAmount} 
          onComplete={() => {
            setShowWinCelebration(false);
          }}
        />
      )}
      {showLossAnimation && (
        <LossAnimation 
          lossAmount={lossAmount} 
          onComplete={() => {
            setShowLossAnimation(false);
          }}
        />
      )}

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/games')}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <LiveBalance user={user} balanceUpdates={balanceUpdates} blockUpdate={blockBalanceUpdate} />
        </div>

        {/* Game Title */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Coins className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
              Head & Tail
            </h1>
            <Coins className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-white/70 mb-6">Flip the coin and double your bet!</p>
        
          {/* Coin Display */}
          <div className="flex justify-center mb-8">
          <div className="relative perspective-container">
            <div
              className={`w-56 h-56 ${
                isFlipping ? 'animate-coin-flip-3d' : showResult ? 'animate-coin-land' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: !isFlipping && result === 'tail' ? 'rotateY(180deg)' : !isFlipping ? 'rotateY(0deg)' : undefined,
                transition: !isFlipping ? 'transform 0.6s ease-out' : 'none',
              }}
            >
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                  background: 'radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 40%, #d97706 70%, #92400e 100%)',
                  boxShadow: 'inset 0 -15px 30px rgba(0,0,0,0.4), inset 0 15px 30px rgba(255,255,255,0.3), 0 20px 50px rgba(0,0,0,0.5), 0 0 0 12px #f59e0b, 0 0 0 15px #d97706, 0 0 0 18px #92400e',
                }}
              >
                {/* Head Side - Empty during flip, shows result after */}
                {showResult && result === 'head' && (
                  <div className="text-center relative animate-fade-in">
                    <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-yellow-300/50 to-transparent blur-xl"></div>
                    <div className="text-7xl font-black text-amber-900 drop-shadow-2xl" style={{ textShadow: '0 5px 15px rgba(0,0,0,0.5), 0 0 20px rgba(251, 191, 36, 0.5)' }}>H</div>
                    <div className="text-base font-bold text-amber-900/90 tracking-widest mt-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>HEAD</div>
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'radial-gradient(circle at 30% 30%, #f59e0b 0%, #d97706 40%, #b45309 70%, #78350f 100%)',
                  boxShadow: 'inset 0 -15px 30px rgba(0,0,0,0.4), inset 0 15px 30px rgba(255,255,255,0.3), 0 20px 50px rgba(0,0,0,0.5), 0 0 0 12px #d97706, 0 0 0 15px #b45309, 0 0 0 18px #78350f',
                }}
              >
                {/* Tail Side - Empty during flip, shows result after */}
                {showResult && result === 'tail' && (
                  <div className="text-center relative animate-fade-in" style={{ transform: 'rotateY(180deg)' }}>
                    <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-amber-300/50 to-transparent blur-xl"></div>
                    <div className="text-7xl font-black text-amber-900 drop-shadow-2xl" style={{ textShadow: '0 5px 15px rgba(0,0,0,0.5), 0 0 20px rgba(245, 158, 11, 0.5)' }}>T</div>
                    <div className="text-base font-bold text-amber-900/90 tracking-widest mt-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>TAIL</div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Glow effects */}
            <div className="absolute inset-0 -z-10 rounded-full bg-yellow-400/30 blur-3xl animate-pulse"></div>
            <div className="absolute inset-0 -z-20 rounded-full bg-amber-500/20 blur-[100px]"></div>
            
            {/* Impact particles */}
            {showResult && (
              <>
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const distance = 80 + Math.random() * 40;
                  const tx = Math.cos(angle) * distance;
                  const ty = Math.sin(angle) * distance;
                  return (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                      style={{
                        background: flipCoinMutation.data?.won 
                          ? 'linear-gradient(45deg, #fbbf24, #f59e0b)' 
                          : 'linear-gradient(45deg, #ef4444, #dc2626)',
                        animation: 'particle-burst 0.8s ease-out forwards',
                        '--tx': `${tx}px`,
                        '--ty': `${ty}px`,
                      } as any}
                    />
                  );
                })}
              </>
            )}
            
            {/* Dynamic shadow based on flip state */}
            <div 
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/40 rounded-full blur-xl transition-all duration-300"
              style={{
                opacity: isFlipping ? 0.2 : 0.6,
                transform: `translateX(-50%) scale(${isFlipping ? 0.8 : 1})`,
              }}
            />
          </div>
          </div>
        </div>

        {/* Result Display */}
        {showResult && (
          <div className="text-center mb-6 animate-fade-in">
            <div className={`text-2xl font-bold ${flipCoinMutation.data?.won ? 'text-green-400' : 'text-red-400'}`}>
              {flipCoinMutation.data?.won ? '🎉 You Won!' : '😔 You Lost'}
            </div>
            <div className="text-lg text-white/80">
              Result: {result?.toUpperCase()}
            </div>
          </div>
        )}

        {/* Selection Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6 px-4">
          <button
            onClick={() => setSelectedSide('head')}
            disabled={isFlipping}
            className={`relative overflow-hidden py-6 px-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
              selectedSide === 'head' 
                ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-900 ring-4 ring-yellow-300/80 scale-105 shadow-2xl' 
                : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20'
            } disabled:opacity-50`}
            data-testid="button-select-head"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">H</div>
              <div className="text-sm">HEAD</div>
              <div className="text-xs opacity-80">Win 2x</div>
            </div>
            {selectedSide === 'head' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </button>

          <button
            onClick={() => setSelectedSide('tail')}
            disabled={isFlipping}
            className={`relative overflow-hidden py-6 px-6 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
              selectedSide === 'tail' 
                ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900 ring-4 ring-amber-300/80 scale-105 shadow-2xl' 
                : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20'
            } disabled:opacity-50`}
            data-testid="button-select-tail"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">T</div>
              <div className="text-sm">TAIL</div>
              <div className="text-xs opacity-80">Win 2x</div>
            </div>
            {selectedSide === 'tail' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </button>
        </div>

        {/* Bet Amount */}
        <Card className="bg-black/30 backdrop-blur-md border border-white/10 mb-6 mx-4">
          <CardContent className="p-4">
            <div className="mb-3">
              <div className="text-sm text-white/70 mb-2">Bet Amount</div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                  disabled={isFlipping}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  data-testid="input-bet-amount"
                />
              </div>
            </div>

            {/* Quick Bet Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {betAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={isFlipping}
                  className={`py-2 px-2 rounded-lg font-bold text-sm transition-all ${
                    betAmount === amount
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } disabled:opacity-50`}
                  data-testid={`button-bet-${amount}`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Potential Win Display */}
            <div className="mt-4 p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">Potential Profit:</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <div className="text-lg font-bold text-green-400">
                    +{formatGoldCoins(betAmount)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/60 mt-1">
                Win doubles your money (50/50 odds)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flip Button */}
        <div className="px-4 mb-6">
          <Button
            onClick={handleFlip}
            disabled={isFlipping || flipCoinMutation.isPending || !selectedSide}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-bold text-xl py-6 rounded-xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-flip-coin"
          >
            {isFlipping ? (
              <>
                <Coins className="w-6 h-6 mr-2 animate-spin" />
                Flipping...
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-2" />
                Flip Coin
              </>
            )}
          </Button>
        </div>

        {/* Betting History */}
        <div className="px-4 mb-24">
          <Card className="bg-black/30 backdrop-blur-md border border-white/10">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                Betting History
              </h3>
              {isHistoryLoading ? (
                <div className="text-center py-8 text-white/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div>
                  <p>Loading history...</p>
                </div>
              ) : gameHistory.length > 0 ? (
                <div className="space-y-2">
                  {gameHistory.map((game) => (
                    <div
                      key={game.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        game.won
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                      data-testid={`history-item-${game.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          game.result === 'head' 
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-900'
                            : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900'
                        }`}>
                          {game.result === 'head' ? 'H' : 'T'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            Chose: {game.selectedSide.toUpperCase()}
                          </div>
                          <div className="text-xs text-white/60">
                            {new Date(game.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${game.won ? 'text-green-400' : 'text-red-400'}`}>
                          {game.won ? '+' : '-'}{formatGoldCoins(game.won && game.winAmount ? usdToGoldCoins(parseFloat(game.winAmount) - parseFloat(game.betAmount)) : usdToGoldCoins(parseFloat(game.betAmount)))}
                        </div>
                        <div className="text-xs text-white/60">
                          Bet: {formatGoldCoins(usdToGoldCoins(parseFloat(game.betAmount)))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/50">
                  <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No betting history yet</p>
                  <p className="text-sm mt-1">Start playing to see your history!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav user={user} />

      <style>{`
        .perspective-container {
          perspective: 1000px;
        }
        
        @keyframes coin-flip-3d {
          0% { 
            transform: translateY(0px) rotateY(0deg) rotateX(0deg) scale(1);
          }
          5% {
            transform: translateY(-60px) rotateY(90deg) rotateX(15deg) scale(1.05);
          }
          10% {
            transform: translateY(-100px) rotateY(180deg) rotateX(30deg) scale(1.1);
          }
          15% {
            transform: translateY(-130px) rotateY(270deg) rotateX(45deg) scale(1.12);
          }
          20% {
            transform: translateY(-140px) rotateY(360deg) rotateX(50deg) scale(1.15);
          }
          25% {
            transform: translateY(-130px) rotateY(450deg) rotateX(45deg) scale(1.12);
          }
          30% {
            transform: translateY(-110px) rotateY(540deg) rotateX(35deg) scale(1.1);
          }
          35% {
            transform: translateY(-80px) rotateY(630deg) rotateX(25deg) scale(1.08);
          }
          40% {
            transform: translateY(-60px) rotateY(720deg) rotateX(15deg) scale(1.05);
          }
          45% {
            transform: translateY(-40px) rotateY(810deg) rotateX(10deg) scale(1.03);
          }
          50% {
            transform: translateY(-20px) rotateY(900deg) rotateX(5deg) scale(1.02);
          }
          55% {
            transform: translateY(-10px) rotateY(990deg) rotateX(2deg) scale(1.01);
          }
          60% {
            transform: translateY(0px) rotateY(1080deg) rotateX(0deg) scale(1);
          }
          65% {
            transform: translateY(10px) rotateY(1170deg) rotateX(-5deg) scale(0.98);
          }
          70% {
            transform: translateY(20px) rotateY(1260deg) rotateX(-8deg) scale(0.96);
          }
          75% {
            transform: translateY(25px) rotateY(1350deg) rotateX(-10deg) scale(0.95);
          }
          80% {
            transform: translateY(10px) rotateY(1440deg) rotateX(-5deg) scale(0.97);
          }
          85% {
            transform: translateY(0px) rotateY(1530deg) rotateX(0deg) scale(1);
          }
          90% {
            transform: translateY(-5px) rotateY(1620deg) rotateX(0deg) scale(1.01);
          }
          93% {
            transform: translateY(0px) rotateY(1680deg) rotateX(0deg) scale(0.99);
          }
          96% {
            transform: translateY(-2px) rotateY(1740deg) rotateX(0deg) scale(1.005);
          }
          100% { 
            transform: translateY(0px) rotateY(1800deg) rotateX(0deg) scale(1);
          }
        }
        
        .animate-coin-flip-3d {
          animation: coin-flip-3d 8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          filter: blur(0px);
        }
        
        @keyframes coin-land {
          0% {
            transform: translateY(0) scale(1);
          }
          30% {
            transform: translateY(-15px) scale(1.05);
          }
          50% {
            transform: translateY(0px) scale(0.95);
          }
          70% {
            transform: translateY(-5px) scale(1.02);
          }
          85% {
            transform: translateY(0px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-coin-land {
          animation: coin-land 0.6s ease-out;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        
        @keyframes particle-burst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
