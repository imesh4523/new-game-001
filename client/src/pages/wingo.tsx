import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GameTimer from "@/components/game-timer";
import ColorBetting from "@/components/color-betting";
import BettingControls from "@/components/betting-controls";
import GameHistory from "@/components/game-history";
import LiveStatusIndicator from "@/components/live-status-indicator";
import Enhanced3XBetLogo from "@/components/enhanced-3xbet-logo";
import LiveBalance from "@/components/live-balance";
import GoldenArea from "@/components/golden-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Settings, Gamepad2 } from "lucide-react";
import WinCelebration from "@/components/win-celebration";
import LossAnimation from "@/components/loss-animation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { formatGoldCoins, formatGoldCoinsText, usdToGoldCoins } from "@/lib/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Game History Section Component for Wingo Mode - Memoized for performance
const GameHistorySection = memo(function GameHistorySection() {
  const { data: gameHistory = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/games/history'],
  });

  const getNumberColor = useCallback((num: number) => {
    if ([0, 5].includes(num)) return 'from-purple-500 to-red-500';
    if ([1, 3, 7, 9].includes(num)) return 'from-green-400 to-green-600';
    return 'from-red-400 to-red-600';
  }, []);

  const getSizeLabel = useCallback((num: number) => {
    return num >= 5 ? 'Big' : 'Small';
  }, []);

  const getColorName = useCallback((num: number) => {
    if ([1, 3, 7, 9].includes(num)) return { name: 'Green', color: 'text-green-400' };
    if ([0, 5].includes(num)) return { name: 'Purple', color: 'text-purple-400' };
    return { name: 'Red', color: 'text-red-400' };
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-black/20 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Gamepad2 className="w-5 h-5" />
            Game History
          </CardTitle>
          <CardDescription className="text-white/60">
            All recent game results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Gamepad2 className="w-5 h-5" />
          Game History
        </CardTitle>
        <CardDescription className="text-white/60">
          All recent game results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {gameHistory.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No game history available</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 mb-3 p-2 rounded-lg bg-white/5 text-xs font-semibold text-white/70">
              <span>Period</span>
              <span>Number</span>
              <span>Size</span>
              <span>Color</span>
            </div>
            {gameHistory.slice(0, 10).map((game: any) => {
              const colorInfo = getColorName(game.result);
              return (
                <div 
                  key={game.id}
                  className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  data-testid={`row-game-${game.id}`}
                >
                  <span className="font-mono text-white/90 text-xs truncate">
                    {game.gameId?.slice(-8) || '----'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${getNumberColor(game.result)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                      {game.result}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-white/80 border-white/20 w-fit">
                    {getSizeLabel(game.result)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs border-white/20 w-fit ${colorInfo.color}`}
                  >
                    {colorInfo.name}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function WingoPage() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRound, setSelectedRound] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showLossAnimation, setShowLossAnimation] = useState(false);
  const [lossAmount, setLossAmount] = useState(0);
  const [processedUpdateIds, setProcessedUpdateIds] = useState<Set<string>>(new Set());
  const [pendingWins, setPendingWins] = useState<number[]>([]);
  const [pendingLosses, setPendingLosses] = useState<number[]>([]);

  // Check authentication
  const { data: user, isLoading, error } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Fallback to demo user if not authenticated
  const { data: demoUser, isLoading: demoLoading } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user && !!error,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Get public settings to check if Wingo Mode is globally enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  // Check if Win Go game is enabled (maintenance mode)
  const wingoEnabled = publicSettings?.find(s => s.key === 'wingo_enabled')?.value !== 'false';

  // WebSocket connection for real-time updates
  const { gameStates, gameResults, balanceUpdates, connectionStatus } = useWebSocket();

  const currentUser = user || demoUser;

  // Check if user has Wingo Mode enabled
  const isWingoMode = currentUser?.wingoMode === true;

  // Enforce global Wingo Mode setting - redirect away if disabled or user preference is off
  useEffect(() => {
    // Wait for both public settings and user data to load before enforcing
    if (!publicSettings || isLoading || demoLoading) return;
    if (!currentUser) return;
    
    const wingoModeGloballyEnabled = publicSettings.find(s => s.key === 'wingo_mode_enabled')?.value !== 'false';
    // Redirect if feature is globally disabled OR user doesn't have it enabled
    if (!wingoModeGloballyEnabled || !currentUser.wingoMode) {
      setLocation('/');
    }
  }, [publicSettings, currentUser, isLoading, demoLoading, setLocation]);

  // Memoize callbacks to prevent re-renders
  const handleWinComplete = useCallback(() => setShowWinCelebration(false), []);
  const handleLossComplete = useCallback(() => setShowLossAnimation(false), []);

  useEffect(() => {
    if (balanceUpdates.length === 0 || !currentUser) return;

    const newWins: number[] = [];
    const newLosses: number[] = [];

    for (const update of balanceUpdates) {
      if (!update.id || processedUpdateIds.has(update.id)) continue;

      if (update.isBackfill) {
        setProcessedUpdateIds(prev => new Set(Array.from(prev).concat(update.id)));
        continue;
      }

      const isAuthenticatedUser = !!user;
      const isDemoUser = !user && demoUser?.email === 'demo@example.com';
      
      const userMatches = update && (
        (isAuthenticatedUser && (update.userId === currentUser?.id || update.userId === currentUser?.publicId)) ||
        (isDemoUser && update.userId === 'user-1')
      );
      
      if (userMatches) {
        const changeAmount = parseFloat(update.changeAmount);
        
        if (update.changeType === 'win' && changeAmount > 0) {
          newWins.push(changeAmount);
          setProcessedUpdateIds(prev => {
            const newSet = new Set(Array.from(prev).concat(update.id));
            if (newSet.size > 100) {
              const arr = Array.from(newSet);
              return new Set(arr.slice(arr.length - 100));
            }
            return newSet;
          });
        } else if (update.changeType === 'loss' && changeAmount < 0) {
          newLosses.push(Math.abs(changeAmount));
          setProcessedUpdateIds(prev => {
            const newSet = new Set(Array.from(prev).concat(update.id));
            if (newSet.size > 100) {
              const arr = Array.from(newSet);
              return new Set(arr.slice(arr.length - 100));
            }
            return newSet;
          });
        }
      }
    }

    if (newWins.length > 0) {
      setPendingWins(prev => prev.concat(newWins));
    }
    if (newLosses.length > 0) {
      setPendingLosses(prev => prev.concat(newLosses));
    }
  }, [balanceUpdates, currentUser, processedUpdateIds, user, demoUser]);

  useEffect(() => {
    if (pendingWins.length > 0) {
      const timer = setTimeout(() => {
        const totalWin = pendingWins.reduce((sum, amount) => sum + amount, 0);
        setWinAmount(totalWin);
        
        // Use toast notification in Wingo Mode, animation otherwise
        if (isWingoMode) {
          toast({
            title: "You Won!",
            description: `+${formatGoldCoinsText(usdToGoldCoins(totalWin.toString()))}`,
            className: "bg-green-600 text-white border-green-500",
          });
        } else {
          setShowWinCelebration(true);
        }
        
        setPendingWins([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingWins, isWingoMode, toast]);

  useEffect(() => {
    if (pendingLosses.length > 0) {
      const timer = setTimeout(() => {
        const totalLoss = pendingLosses.reduce((sum, amount) => sum + amount, 0);
        setLossAmount(totalLoss);
        
        // Use toast notification in Wingo Mode, animation otherwise
        if (isWingoMode) {
          toast({
            title: "Loss",
            description: `-${formatGoldCoinsText(usdToGoldCoins(totalLoss.toString()))}`,
            className: "bg-red-600 text-white border-red-500",
          });
        } else {
          setShowLossAnimation(true);
        }
        
        setPendingLosses([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingLosses, isWingoMode, toast]);

  // Show loading or redirect to login if no user available
  if (isLoading || (demoLoading && !user && !!error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access the gaming platform.
          </p>
          <Button onClick={() => setLocation('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!wingoEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/20 rounded-full border-2 border-purple-500/30 mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/30 rounded-full">
                  <Gamepad2 className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Under Maintenance</h2>
                <p className="text-white/70 mb-4">
                  The Win Go game is currently under maintenance. We're working to make it even better!
                </p>
                <p className="text-purple-300 text-sm">
                  Please check back later or try our other games.
                </p>
              </div>
            </div>
            
            <div className="pt-6">
              <Button
                onClick={() => setLocation('/')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 rounded-lg font-semibold text-lg shadow-lg"
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentGame = gameStates[selectedRound];

  return (
    <div 
      className={`min-h-screen gradient-bg-purple-blue ${isWingoMode ? 'wingo-optimized' : ''}`} 
      data-testid="wingo-container"
    >
      {/* Show animations only when NOT in Wingo Mode */}
      {!isWingoMode && showWinCelebration && (
        <WinCelebration 
          winAmount={winAmount} 
          onComplete={handleWinComplete}
        />
      )}
      {!isWingoMode && showLossAnimation && (
        <LossAnimation 
          lossAmount={lossAmount} 
          onComplete={handleLossComplete}
        />
      )}
      
      <div className="w-full glass-background min-h-screen">
        {/* Minimal Header - Fixed at top */}
        <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/account')}
                className="text-white hover:bg-white/10 h-8 w-8 p-0"
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Enhanced3XBetLogo size="sm" />
            </div>
            <LiveBalance user={currentUser} balanceUpdates={balanceUpdates} showTrend={true} />
          </div>
        </div>
        
        <main className="pt-4 px-4 space-y-6 pb-6">
          {/* Live Status Indicator - Hide in Wingo Mode */}
          {!isWingoMode && <LiveStatusIndicator compact={true} />}
          
          {/* Game Chart Section */}
          <GameTimer
            selectedRound={selectedRound}
            onRoundChange={setSelectedRound}
            currentGame={currentGame}
            data-testid="game-timer"
          />
          
          {/* Place Bet Section */}
          <ColorBetting
            selectedColor={selectedColor}
            selectedNumber={selectedNumber}
            onColorSelect={setSelectedColor}
            onNumberSelect={setSelectedNumber}
            data-testid="color-betting"
          />
          
          <BettingControls
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            multiplier={multiplier}
            onMultiplierChange={setMultiplier}
            selectedColor={selectedColor}
            selectedNumber={selectedNumber}
            currentGame={currentGame}
            user={user}
            data-testid="betting-controls"
          />
          
          {/* Golden Area - Hide in Wingo Mode */}
          {!isWingoMode && <GoldenArea data-testid="golden-area" />}
          
          {/* Game History Section - Use different component based on Wingo Mode */}
          {isWingoMode ? (
            <GameHistorySection />
          ) : (
            <GameHistory data-testid="game-history" />
          )}
        </main>
      </div>
    </div>
  );
}
