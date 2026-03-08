import { ChevronLeft, HelpCircle, Wallet, ArrowUpFromLine } from "lucide-react";
import { useLocation } from "wouter";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";
import LiveBalance from "./live-balance";
import NotificationsBell from "./notifications-bell";

interface BalanceUpdate {
  userId: string;
  oldBalance: string;
  newBalance: string;
  changeAmount: string;
  changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet';
  timestamp: string;
}

interface GameHeaderProps {
  user?: any;
  balanceUpdates?: BalanceUpdate[];
}

export default function GameHeader({ user, balanceUpdates = [] }: GameHeaderProps) {
  const [, setLocation] = useLocation();
  return (
    <header className="z-50 glass-header">
      <div className="flex items-center justify-between p-4">
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-back">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-1">
          {/* 3XBET Logo Split Across 3 Sections */}
          <div className="flex items-center gap-1">
            {/* Section 1: "3" */}
            <div className="relative w-16 h-16 rounded-lg flex items-center justify-center logo-3d-teal-container group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-300/40 via-green-400/40 to-emerald-500/40 rounded-lg blur-md animate-pulse"></div>
              <div className="relative w-14 h-14 rounded-lg overflow-hidden logo-3d-teal-main">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-200 via-teal-300 to-green-400 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100/60 via-transparent to-green-600/60 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/20 to-transparent rounded-lg"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-teal-400 via-green-500 to-emerald-600 rounded"></div>
                <div className="absolute top-1 left-1 w-4 h-2 bg-gradient-to-br from-white/40 to-transparent rounded-tr blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="relative text-white font-black text-2xl logo-number-3d-teal">3</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-lg shimmer-overlay-teal group-hover:animate-shimmer-teal"></div>
              </div>
            </div>
            
            {/* Section 2: "X" */}
            <div className="relative w-16 h-16 rounded-lg flex items-center justify-center logo-3d-gold-container group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/40 via-orange-400/40 to-red-500/40 rounded-lg blur-md animate-pulse"></div>
              <div className="relative w-14 h-14 rounded-lg overflow-hidden logo-3d-gold-main">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/60 via-transparent to-red-600/60 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/20 to-transparent rounded-lg"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded"></div>
                <div className="absolute top-1 left-1 w-4 h-2 bg-gradient-to-br from-white/40 to-transparent rounded-tr blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="relative text-white font-black text-2xl logo-number-3d-gold">X</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-lg shimmer-overlay-gold group-hover:animate-shimmer-gold"></div>
              </div>
            </div>
            
            {/* Section 3: "BET" */}
            <div className="relative w-20 h-16 rounded-lg flex items-center justify-center logo-3d-blue-container group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/40 via-purple-400/40 to-indigo-500/40 rounded-lg blur-md animate-pulse"></div>
              <div className="relative w-16 h-14 rounded-lg overflow-hidden logo-3d-blue-main">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-purple-300 to-indigo-400 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 via-transparent to-indigo-600/60 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/20 to-transparent rounded-lg"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded"></div>
                <div className="absolute top-1 left-1 w-4 h-2 bg-gradient-to-br from-white/40 to-transparent rounded-tr blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="relative text-white font-black text-2xl logo-number-3d-blue">BET</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-lg shimmer-overlay-blue group-hover:animate-shimmer-blue"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLocation('/deposit')}
            className="p-2 rounded-lg hover:bg-green-600/20 transition-colors group" 
            data-testid="button-deposit"
            title="Deposit"
          >
            <Wallet className="w-5 h-5 text-green-400 group-hover:text-green-300" />
          </button>
          <button 
            onClick={() => setLocation('/withdrawal')}
            className="p-2 rounded-lg hover:bg-orange-600/20 transition-colors group" 
            data-testid="button-withdrawal"
            title="Withdrawal"
          >
            <ArrowUpFromLine className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
          </button>
          {user && <NotificationsBell />}
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-help">
            <HelpCircle className="w-5 h-5 text-white" />
          </button>
          <LiveBalance user={user} balanceUpdates={balanceUpdates} className="flex-shrink-0" />
        </div>
      </div>
      
      <div className="px-4 pb-4">
        <div className="glass-card rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl"></div>
          <div className="relative z-10 overflow-hidden py-2.5 px-4">
            <div className="announcement-scroll">
              <div className="announcement-content">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="text-sm text-white font-medium">Place your bets before the timer runs out!</span>
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0 mr-8"></span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="text-sm text-white font-medium">Place your bets before the timer runs out!</span>
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0 mr-8"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
