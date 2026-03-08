import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import GameTimer from "@/components/game-timer";
import ColorBetting from "@/components/color-betting";
import BettingControls from "@/components/betting-controls";
import GameHistory from "@/components/game-history";
import MyBets from "@/components/my-bets";
import LiveStatusIndicator from "@/components/live-status-indicator";
import Enhanced3XBetLogo from "@/components/enhanced-3xbet-logo";
import LiveBalance from "@/components/live-balance";
import GoldenArea from "@/components/golden-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Palette } from "lucide-react";
import FallingAnimation from "@/components/falling-animation";
import WinCelebration from "@/components/win-celebration";
import LossAnimation from "@/components/loss-animation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function GamePage() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Fallback to demo user if not authenticated
  const { data: demoUser, isLoading: demoLoading } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user && !!error,
    staleTime: 10 * 60 * 1000, // 10 minutes 
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Get public settings to check if Color Betting game is enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const colorBettingEnabled = publicSettings?.find(s => s.key === 'color_betting_enabled')?.value !== 'false';

  // WebSocket connection for real-time updates - must be before conditional returns
  const { gameStates, gameResults, balanceUpdates, connectionStatus } = useWebSocket();

  const currentUser = user || demoUser;

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
  }, [balanceUpdates, currentUser, processedUpdateIds]);

  useEffect(() => {
    if (pendingWins.length > 0) {
      const timer = setTimeout(() => {
        const totalWin = pendingWins.reduce((sum, amount) => sum + amount, 0);
        setWinAmount(totalWin);
        setShowWinCelebration(true);
        setPendingWins([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingWins]);

  useEffect(() => {
    if (pendingLosses.length > 0) {
      const timer = setTimeout(() => {
        const totalLoss = pendingLosses.reduce((sum, amount) => sum + amount, 0);
        setLossAmount(totalLoss);
        setShowLossAnimation(true);
        setPendingLosses([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingLosses]);

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

  if (!colorBettingEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-red-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-green-500/20 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute w-96 h-96 bg-violet-500/20 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600/20 to-violet-600/20 rounded-full border-2 border-purple-500/30 mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600/30 to-violet-600/30 rounded-full">
                  <Palette className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Under Maintenance</h2>
                <p className="text-white/70 mb-4">
                  The Color Betting game is currently under maintenance. We're working to make it even better!
                </p>
                <p className="text-purple-300 text-sm">
                  Please check back later or try our other games.
                </p>
              </div>
            </div>
            
            <div className="pt-6">
              <Button
                onClick={() => setLocation('/')}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-8 py-6 rounded-lg font-semibold text-lg shadow-lg"
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
    <div className="min-h-screen gradient-bg-purple-blue" data-testid="game-container">
      {!isMobile && <FallingAnimation />}
      {showWinCelebration && (
        <WinCelebration 
          winAmount={winAmount} 
          onComplete={() => setShowWinCelebration(false)}
        />
      )}
      {showLossAnimation && (
        <LossAnimation 
          lossAmount={lossAmount} 
          onComplete={() => setShowLossAnimation(false)}
        />
      )}
      <div className="w-full glass-background min-h-screen">
        
        
        <main className="pt-4 px-4 space-y-6">
        {/* Logo Left, Balance Right */}
        <div className="flex justify-between items-center">
          <Enhanced3XBetLogo size="sm" />
          <LiveBalance user={currentUser} balanceUpdates={balanceUpdates} showTrend={true} />
        </div>
        
        
        {/* Live Status Indicator - Compact */}
        <LiveStatusIndicator compact={true} />
        
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
        
        {/* Golden Area - Live Numbers */}
        <GoldenArea data-testid="golden-area" />
        
        {/* Game History Section */}
        <GameHistory data-testid="game-history" />
        
        <div className="h-20" />
        </main>
      </div>
    </div>
  );
}
