import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Home, 
  Activity, 
  Gift, 
  User,
  Gamepad2,
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowDownToLine,
  Wallet,
  Volume2,
  Sparkles
} from "lucide-react";
import usdtIcon from "@assets/stock_images/usdt_tether_cryptocu_3db70ff1.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GameTimer from "@/components/game-timer";
import ColorBetting from "@/components/color-betting";
import BettingControls from "@/components/betting-controls";
import GameHistory from "@/components/game-history";
import MyBets from "@/components/my-bets";
import LiveStatusIndicator from "@/components/live-status-indicator";
import Enhanced3XBetLogo, { Compact3XBetLogo } from "@/components/enhanced-3xbet-logo";
import LiveBalance from "@/components/live-balance";
import LiveTrendsChart from "@/components/live-trends-chart";
import GoldenArea from "@/components/golden-area";
import { useWebSocket } from "@/hooks/use-websocket";
import FallingAnimation from "@/components/falling-animation";
import WinCelebration from "@/components/win-celebration";
import LossAnimation from "@/components/loss-animation";
import LiveWinners from "@/components/live-winners";
import PushNotificationBanner from "@/components/push-notification-banner";
import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  useEffect(() => {
    document.title = "Home | 3xbet - Real-Time Gaming";
  }, []);
  const [location, setLocation] = useLocation();
  const [selectedRound, setSelectedRound] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<'game' | 'chart'>('game');
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showLossAnimation, setShowLossAnimation] = useState(false);
  const [lossAmount, setLossAmount] = useState(0);
  const [processedUpdateIds, setProcessedUpdateIds] = useState<Set<string>>(new Set());
  const [pendingWins, setPendingWins] = useState<number[]>([]);
  const [pendingLosses, setPendingLosses] = useState<number[]>([]);
  const [isPWA, setIsPWA] = useState(false);

  // Detect PWA mode (standalone)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsPWA(isStandalone);
  }, []);

  // WebSocket connection for real-time updates
  const { gameStates, gameResults, balanceUpdates, connectionStatus } = useWebSocket();

  // Get user data
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Get public settings to check if Wingo Mode is globally enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const currentUser = user;

  // Redirect to Wingo Mode if enabled (both globally and by user)
  useEffect(() => {
    if (!publicSettings || !user) return;
    const wingoModeGloballyEnabled = publicSettings.find(s => s.key === 'wingo_mode_enabled')?.value !== 'false';
    if (user.wingoMode && wingoModeGloballyEnabled) {
      setLocation('/wingo?modeon');
    }
  }, [user, publicSettings, setLocation]);

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
      
      const userMatches = update && isAuthenticatedUser && (update.userId === currentUser?.id || update.userId === currentUser?.publicId);
      
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

  const currentGame = gameStates[selectedRound];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      <FallingAnimation />
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
      
      {/* Push Notification Banner */}
      <PushNotificationBanner />
      
      {/* Main Content - Game Interface */}
      <main className="pb-20">
        <div className={`${isPWA ? 'pt-10' : 'pt-4'} px-4 space-y-6`}>
          {/* Logo Left, Deposit Button Center, Balance Right */}
          <div className="flex justify-between items-center">
            <Enhanced3XBetLogo size="sm" />
            
            {/* Deposit Button */}
            <button 
              onClick={() => setLocation(user ? '/deposit' : '/signup')}
              className="relative group p-3 rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 hover:from-emerald-500 hover:via-green-600 hover:to-teal-700 transition-all duration-500 transform hover:scale-110 hover:rotate-3 shadow-2xl hover:shadow-emerald-500/40 border border-white/20 backdrop-blur-sm"
              style={{
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                background: 'linear-gradient(135deg, #10B981, #059669, #047857)',
                transformStyle: 'preserve-3d'
              }}
              data-testid="button-deposit"
            >
              {/* 3D lighting effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 opacity-30 blur-lg scale-110 group-hover:opacity-50 group-hover:scale-125 transition-all duration-500"></div>
              
              {/* Icon container with 3D effect */}
              <div className="relative z-10 transform group-hover:translate-y-[-2px] transition-transform duration-300">
                <ArrowDownToLine className="w-6 h-6 text-white drop-shadow-lg filter group-hover:drop-shadow-xl transition-all duration-300" />
              </div>
              
              {/* Floating particles animation */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute top-1 left-1 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-1 right-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-2 right-2 w-0.5 h-0.5 bg-emerald-200/50 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
              </div>
            </button>

            <LiveBalance user={currentUser} balanceUpdates={balanceUpdates} showTrend={true} />
          </div>
          
          {/* Live Status Indicator */}
          <LiveStatusIndicator compact={true} />
          
          {/* Announcement Banner */}
          <div className="glass-card rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-purple-400/10"></div>
            <div className="relative z-10 overflow-hidden py-1.5 px-3">
              <div className="announcement-scroll">
                <div className="announcement-content">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-pink-400 animate-pulse flex-shrink-0" />
                    <span className="text-xs text-white font-medium">Invite new members to get 4.89 USDT</span>
                    <div className="relative w-4 h-4 flex-shrink-0" style={{ 
                      transformStyle: 'preserve-3d',
                      animation: 'usdt-flip 2s linear infinite'
                    }}>
                      <svg viewBox="0 0 339.43 295.27" className="w-full h-full" style={{ filter: 'drop-shadow(0 2px 8px rgba(80, 175, 149, 0.9))' }}>
                        <g>
                          <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,293.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z"/>
                          <path fill="white" d="M191.19,144.8c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z"/>
                        </g>
                      </svg>
                      <style>{`
                        @keyframes usdt-flip {
                          0% { transform: rotateY(0deg); }
                          100% { transform: rotateY(360deg); }
                        }
                      `}</style>
                    </div>
                    <span className="text-xs text-white font-medium mr-8">Install the latest app</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-pink-400 animate-pulse flex-shrink-0" />
                    <span className="text-xs text-white font-medium">Invite new members to get 4.89 USDT</span>
                    <div className="relative w-4 h-4 flex-shrink-0" style={{ 
                      transformStyle: 'preserve-3d',
                      animation: 'usdt-flip 2s linear infinite'
                    }}>
                      <svg viewBox="0 0 339.43 295.27" className="w-full h-full" style={{ filter: 'drop-shadow(0 2px 8px rgba(80, 175, 149, 0.9))' }}>
                        <g>
                          <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,293.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z"/>
                          <path fill="white" d="M191.19,144.8c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z"/>
                        </g>
                      </svg>
                      <style>{`
                        @keyframes usdt-flip {
                          0% { transform: rotateY(0deg); }
                          100% { transform: rotateY(360deg); }
                        }
                      `}</style>
                    </div>
                    <span className="text-xs text-white font-medium mr-8">Install the latest app</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 p-1 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab('game')}
              className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'game'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              data-testid="tab-game"
            >
              <Gamepad2 className="w-4 h-4" />
              Game
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'chart'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              data-testid="tab-chart"
            >
              <BarChart3 className="w-4 h-4" />
              Chart
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'game' && (
            <div className="relative">
              {/* Game Timer */}
              <GameTimer
                selectedRound={selectedRound}
                onRoundChange={setSelectedRound}
                currentGame={currentGame}
                data-testid="game-timer"
              />
              
              {/* Color Betting */}
              <ColorBetting
                selectedColor={selectedColor}
                selectedNumber={selectedNumber}
                onColorSelect={!user ? () => setLocation('/signup') : setSelectedColor}
                onNumberSelect={!user ? () => setLocation('/signup') : setSelectedNumber}
                data-testid="color-betting"
              />
              
              {/* Betting Controls */}
              <BettingControls
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                multiplier={multiplier}
                onMultiplierChange={setMultiplier}
                selectedColor={selectedColor}
                selectedNumber={selectedNumber}
                currentGame={currentGame}
                user={currentUser}
                data-testid="betting-controls"
              />
              
              {/* Signup Overlay for Non-Authenticated Users */}
              {!user && (
                <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md animate-in zoom-in-95 duration-500" style={{ perspective: '1000px' }}>
                    <Card className="relative bg-gradient-to-br from-slate-800 via-purple-900 to-blue-900 border-0 shadow-2xl transform hover:scale-105 transition-all duration-300" 
                      style={{ 
                        transformStyle: 'preserve-3d',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(234, 179, 8, 0.3)',
                      }}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-transparent to-purple-500/20 rounded-lg opacity-50"></div>
                      
                      <CardHeader className="text-center relative">
                        <div className="flex justify-center mb-4">
                          <Compact3XBetLogo />
                        </div>
                        <CardDescription className="text-white/80 text-base">
                          Register now to start playing and win real rewards
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 relative">
                        <Button
                          onClick={() => setLocation('/signup')}
                          className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-6 text-lg shadow-lg transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300"
                          style={{
                            boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                          }}
                          data-testid="button-signup-overlay"
                        >
                          Sign Up Now
                        </Button>
                        <Button
                          onClick={() => setLocation('/login')}
                          className="w-full bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 py-6 text-lg transform hover:scale-105 transition-all duration-300"
                          data-testid="button-login-overlay"
                        >
                          Already have an account? Login
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Golden Area - Live Numbers */}
              <GoldenArea data-testid="golden-area" />
              
              {/* Game History */}
              <GameHistory data-testid="game-history" />
              
              {/* Live Winners */}
              <LiveWinners data-testid="live-winners" />
              
              {/* My Bets - Only show for authenticated users */}
              {user && <MyBets data-testid="my-bets" />}
            </div>
          )}

          {activeTab === 'chart' && (
            <LiveTrendsChart data-testid="live-trends-chart" />
          )}

        </div>
      </main>

      <BottomNav user={user} />
    </div>
  );
}