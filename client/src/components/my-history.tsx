import { useQuery } from "@tanstack/react-query";
import { Trophy, X, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyHistory() {
  // Get user data
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: demoUser } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user,
  });

  const currentUser = user || demoUser;

  // Fetch user's betting history - only for authenticated users, not demo users
  const { data: bets = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bets/my-history'],
    enabled: !!user, // Only enabled for authenticated users, not demo users
    retry: false, // Prevent infinite retries
    refetchOnWindowFocus: false, // Prevent refetch when window regains focus
  });

  // Calculate user statistics - only for authenticated users
  const calculateUserStats = () => {
    if (!user) return null;

    const winningBets = bets.filter(bet => bet.status === 'won');
    const losingBets = bets.filter(bet => bet.status === 'lost');
    const totalBets = bets.length;
    
    const totalWinnings = parseFloat(user.totalWinnings || '0');
    const totalLosses = parseFloat(user.totalLosses || '0');
    const winRate = totalBets > 0 ? (winningBets.length / totalBets) * 100 : 0;
    const profitLoss = totalWinnings - totalLosses;
    
    return {
      totalBets,
      winningBets: winningBets.length,
      losingBets: losingBets.length,
      winRate: winRate.toFixed(1),
      totalWinnings,
      totalLosses,
      profitLoss,
      isProfitable: profitLoss > 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'lost': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <Trophy className="w-4 h-4" />;
      case 'lost': return <X className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getBetTypeDisplay = (betType: string, betValue: string) => {
    if (betType === 'color') {
      return {
        type: 'Color',
        value: betValue.charAt(0).toUpperCase() + betValue.slice(1),
        color: betValue === 'green' ? 'text-emerald-400' : 
               betValue === 'red' ? 'text-red-400' : 
               betValue === 'violet' ? 'text-violet-400' : 'text-white'
      };
    } else if (betType === 'number') {
      return {
        type: 'Number',
        value: betValue,
        color: 'text-blue-400'
      };
    } else if (betType === 'size') {
      return {
        type: 'Size',
        value: betValue.charAt(0).toUpperCase() + betValue.slice(1),
        color: 'text-cyan-400'
      };
    }
    return {
      type: betType.charAt(0).toUpperCase() + betType.slice(1),
      value: betValue,
      color: 'text-white'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = calculateUserStats();

  // Show sign in required for demo users or unauthenticated users
  if (!user) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-xl">
        <div className="relative p-6">
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
            <p className="text-white/60">Please sign in to view your betting history</p>
            <p className="text-white/40 text-sm mt-2">Demo users don't have betting history</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-xl">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent"></div>
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            My History
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Total: {stats?.totalBets || 0} bets</span>
          </div>
        </div>

        {/* User Statistics */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/60">Win Rate</span>
                {parseFloat(stats.winRate) > 50 ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
              </div>
              <div className="text-lg font-bold text-white">{stats.winRate}%</div>
              <div className="text-xs text-white/40">{stats.winningBets}W / {stats.losingBets}L</div>
            </div>

            <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/60">Total Winnings</span>
                <DollarSign className="w-3 h-3 text-green-400" />
              </div>
              <div className="text-lg font-bold text-green-400">${stats.totalWinnings.toFixed(2)}</div>
            </div>


            <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/60">Net P&L</span>
                {stats.isProfitable ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
              </div>
              <div className={`text-lg font-bold ${stats.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {stats.isProfitable ? '+' : ''}${stats.profitLoss.toFixed(2)}
              </div>
            </div>
          </div>
        )}
        
        {/* Recent Bets */}
        <div>
          <h4 className="text-sm font-semibold text-white/80 mb-4">Recent Bets</h4>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="h-4 bg-white/20 rounded w-24"></div>
                      <div className="h-3 bg-white/20 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-white/20 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : bets.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-8 h-8 mx-auto mb-3 text-white/30" />
              <p className="text-white/60 text-sm">No betting history yet</p>
              <p className="text-white/40 text-xs mt-1">Start playing to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {bets.slice(0, 20).map((bet, index) => {
                const betDisplay = getBetTypeDisplay(bet.betType, bet.betValue);
                return (
                  <div 
                    key={bet.id || index} 
                    className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200"
                    data-testid={`bet-history-${index}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-white/80">
                            {betDisplay.type}: 
                          </span>
                          <span className={`text-sm font-bold ${betDisplay.color}`}>
                            {betDisplay.value}
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(bet.status)}`}>
                            {getStatusIcon(bet.status)}
                            <span className="capitalize">{bet.status}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Amount: ${parseFloat(bet.amount).toFixed(2)}</span>
                          {bet.status === 'won' && (
                            <span className="text-green-400">
                              Won: ${parseFloat(bet.potential || bet.amount).toFixed(2)}
                            </span>
                          )}
                          <span>{formatDate(bet.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View More Button */}
        {bets.length > 20 && (
          <div className="mt-4 text-center">
            <button 
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/20"
              data-testid="button-view-more-history"
            >
              View More History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}