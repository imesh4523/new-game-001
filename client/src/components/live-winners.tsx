import { useEffect, useState, useRef } from "react";
import { Trophy, Star, Crown, TrendingUp, Coins, Sparkles } from "lucide-react";
import { usdToGoldCoins } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/use-websocket";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function GoldenCoinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="url(#goldGradient)" stroke="#d97706" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="7" fill="url(#goldInnerGradient)" opacity="0.8"/>
      <Coins className="absolute inset-0 w-3 h-3 m-auto text-amber-900" strokeWidth={3} />
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="50%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#d97706"/>
        </linearGradient>
        <linearGradient id="goldInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface Winner {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  winAmount: number;
  betType: string;
  timestamp: Date;
  publicId?: string;
  vipLevel?: string;
}

// VIP level configuration matching backend rules
const VIP_CONFIG: Record<string, { maxBet: number; displayName: string; probability: number }> = {
  'lv1': { maxBet: 100, displayName: 'lv1', probability: 0.35 },
  'lv2': { maxBet: 500, displayName: 'lv2', probability: 0.25 },
  'vip': { maxBet: 1000, displayName: 'vip', probability: 0.20 },
  'vip1': { maxBet: 2000, displayName: 'vip1', probability: 0.10 },
  'vip2': { maxBet: 5000, displayName: 'vip2', probability: 0.05 },
  'vip3': { maxBet: 10000, displayName: 'vip3', probability: 0.03 },
  'vip4': { maxBet: 20000, displayName: 'vip4', probability: 0.01 },
  'vip5': { maxBet: 50000, displayName: 'vip5', probability: 0.005 },
  'vip6': { maxBet: 100000, displayName: 'vip6', probability: 0.003 },
  'vip7': { maxBet: 200000, displayName: 'vip7', probability: 0.002 },
};

function generateUsername(userId: string): string {
  const prefixes = ['Lucky', 'Winner', 'Player', 'VIP', 'Pro', 'Star'];
  const suffixes = ['★', '777', '99', '888', '★★', '♠'];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return `${prefixes[hash % prefixes.length]}${suffixes[hash % suffixes.length]}`;
}

function generatePublicId(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomPart = Math.abs(hash * 12345) % 100000000;
  return randomPart.toString().padStart(8, '0');
}

function generateVipLevel(userId: string): string {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [level, config] of Object.entries(VIP_CONFIG)) {
    cumulative += config.probability;
    if (random < cumulative) {
      return level;
    }
  }
  
  return 'lv1';
}

function generateRealisticWinAmount(vipLevel: string): number {
  const config = VIP_CONFIG[vipLevel];
  if (!config) return 1;
  
  const minBet = Math.max(1, config.maxBet * 0.10);
  const maxBet = config.maxBet * 0.80;
  const betAmount = minBet + Math.random() * (maxBet - minBet);
  
  const multipliers = [2, 2, 2, 2, 2, 9];
  const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
  
  const winInCoins = betAmount * multiplier;
  const winInUSD = winInCoins / 100;
  
  return Math.round(winInUSD * 100) / 100;
}

function maskPublicId(publicId: string): string {
  const last6 = publicId.slice(-6).padStart(6, '0');
  return `******${last6}`;
}

function getTimeAgo(timestamp: Date): string {
  const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function LiveWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const processedUpdateIdsRef = useRef<Set<string>>(new Set());
  const { balanceUpdates } = useWebSocket();

  useEffect(() => {
    if (balanceUpdates.length === 0) return;
    
    const newWinners: Winner[] = [];
    
    for (const update of balanceUpdates) {
      if (!update.id || processedUpdateIdsRef.current.has(update.id)) continue;
      
      if (update.isBackfill) {
        processedUpdateIdsRef.current.add(update.id);
        continue;
      }
      
      if (update.changeType === 'win' && parseFloat(update.changeAmount) > 0) {
        const winAmount = parseFloat(update.changeAmount);
        
        const newWinner: Winner = {
          id: update.id,
          userId: update.userId,
          username: generateUsername(update.userId),
          userAvatar: '',
          winAmount,
          betType: ['Color', 'Number', 'Size'][Math.floor(Math.random() * 3)],
          timestamp: new Date(update.timestamp),
          publicId: generatePublicId(update.userId),
          vipLevel: generateVipLevel(update.userId)
        };

        newWinners.push(newWinner);
        processedUpdateIdsRef.current.add(update.id);
        
        if (processedUpdateIdsRef.current.size > 100) {
          const arr = Array.from(processedUpdateIdsRef.current);
          processedUpdateIdsRef.current = new Set(arr.slice(arr.length - 100));
        }
      }
    }
    
    if (newWinners.length > 0) {
      setWinners(prev => [...newWinners.reverse(), ...prev].slice(0, 10));
    }
  }, [balanceUpdates]);

  useEffect(() => {
    const demoWinners: Winner[] = [
      {
        id: '1',
        userId: 'user-101',
        username: 'Player★★★',
        userAvatar: '👑',
        winAmount: 1.60,
        betType: 'Color',
        timestamp: new Date(Date.now() - 15000),
        publicId: '82846251',
        vipLevel: 'lv1'
      },
      {
        id: '2',
        userId: 'user-102',
        username: 'Lucky777',
        userAvatar: '🎯',
        winAmount: 13.50,
        betType: 'Number',
        timestamp: new Date(Date.now() - 18000),
        publicId: '19573842',
        vipLevel: 'vip'
      },
      {
        id: '3',
        userId: 'user-103',
        username: 'Winner99',
        userAvatar: '⭐',
        winAmount: 7.20,
        betType: 'Size',
        timestamp: new Date(Date.now() - 21000),
        publicId: '62676215',
        vipLevel: 'lv2'
      },
      {
        id: '4',
        userId: 'user-104',
        username: 'VIP★Player',
        userAvatar: '💎',
        winAmount: 28.00,
        betType: 'Color',
        timestamp: new Date(Date.now() - 25000),
        publicId: '93817264',
        vipLevel: 'vip1'
      },
      {
        id: '5',
        userId: 'user-105',
        username: 'Champion',
        userAvatar: '🏆',
        winAmount: 72.00,
        betType: 'Number',
        timestamp: new Date(Date.now() - 28000),
        publicId: '47291836',
        vipLevel: 'vip2'
      }
    ];

    setWinners(demoWinners);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomUserId = `user-${Math.floor(Math.random() * 10000)}`;
      const betTypes = ['Color', 'Number', 'Size'];
      const vipLevel = generateVipLevel(randomUserId);
      
      const newWinner: Winner = {
        id: `auto-${Date.now()}-${Math.random()}`,
        userId: randomUserId,
        username: generateUsername(randomUserId),
        userAvatar: '',
        winAmount: generateRealisticWinAmount(vipLevel),
        betType: betTypes[Math.floor(Math.random() * betTypes.length)],
        timestamp: new Date(),
        publicId: generatePublicId(randomUserId),
        vipLevel: vipLevel
      };

      setWinners(prev => [newWinner, ...prev].slice(0, 10));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-600/20 backdrop-blur-md border border-yellow-400/30 shadow-xl p-6" data-testid="live-winners">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/[0.08] to-amber-500/[0.05]"></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-2 right-4 animate-pulse">
          <Sparkles className="w-3 h-3 text-yellow-400/60" />
        </div>
        <div className="absolute bottom-4 left-6 animate-pulse" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-2 h-2 text-amber-400/40" />
        </div>
        <div className="absolute top-6 left-1/3 animate-pulse" style={{ animationDelay: '2s' }}>
          <Sparkles className="w-2.5 h-2.5 text-yellow-300/50" />
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold golden-gradient bg-clip-text text-transparent">Live Winners 🎉</h3>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-xs font-medium text-yellow-400/70 uppercase tracking-wide">LIVE</span>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {winners.map((winner) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20 rounded-lg border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
              data-testid={`winner-${winner.id}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10 border-2 border-yellow-500/50 shadow-lg">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.userId}`} 
                    alt={`User ${maskPublicId(winner.publicId || '000000')}`}
                  />
                  <AvatarFallback className="golden-gradient text-black font-bold">
                    {winner.publicId?.slice(-2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" data-testid={`text-userid-${winner.id}`}>
                      {maskPublicId(winner.publicId || '000000')}
                    </p>
                    {winner.vipLevel && (
                      <span className="text-xs px-2 py-0.5 golden-gradient rounded-full text-black font-bold">
                        ({winner.vipLevel})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 bg-primary/20 rounded-full text-primary">
                      {winner.betType}
                    </span>
                    <span>•</span>
                    <span>{getTimeAgo(winner.timestamp)}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right ml-2">
                <div className="flex items-center gap-1 font-bold text-yellow-400">
                  <GoldenCoinIcon className="w-5 h-5" />
                  <span data-testid={`text-winamount-${winner.id}`}>
                    {usdToGoldCoins(winner.winAmount).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ${winner.winAmount.toFixed(2)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {winners.length === 0 && (
          <div className="text-center text-muted-foreground py-8" data-testid="text-no-winners">
            <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent winners yet</p>
            <p className="text-sm">Be the first to win!</p>
          </div>
        )}
      </div>
    </div>
  );
}
