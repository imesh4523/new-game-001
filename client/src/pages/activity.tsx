import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Home, 
  Activity, 
  Gift, 
  User, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Gamepad2,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatGoldCoins, usdToGoldCoins } from "@/lib/currency";
import FallingAnimation from "@/components/falling-animation";
import BottomNav from "@/components/BottomNav";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import LiveBalance from "@/components/live-balance";

interface ActivityItem {
  id: string;
  type: 'bet' | 'win' | 'loss' | 'deposit' | 'withdrawal';
  amount: string;
  description: string;
  timestamp: string;
  gameId?: string;
  status: 'completed' | 'pending' | 'failed';
  betAmount?: string;
  fee?: string;
  totalDeducted?: string;
}

// Helper function to get display value for bets
const getDisplayValue = (betType: string, betValue: string): string => {
  // For number bets, show the actual number (not the color)
  // For color and size bets, return as-is
  return betValue;
};

// Transform bet data into activity items
const transformBetsToActivity = (bets: any[]): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  const FEE_PERCENTAGE = 3;
  
  bets.forEach((bet: any) => {
    const getTypeName = (type: string) => {
      switch(type) {
        case 'color': return 'Color';
        case 'number': return 'Number';
        case 'size': return 'Size';
        case 'crash': return 'Crash';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
      }
    };

    const displayValue = getDisplayValue(bet.betType, bet.betValue);
    const betAmount = parseFloat(bet.amount);
    
    if (bet.status === 'won' || bet.status === 'cashed_out') {
      const actualPayout = parseFloat(bet.actualPayout || bet.potential || bet.amount);
      const potentialPayout = parseFloat(bet.potential || actualPayout);
      const feeDeducted = Math.max(0, potentialPayout - actualPayout);
      
      activities.push({
        id: `win-${bet.id}`,
        type: 'win',
        amount: String(actualPayout),
        description: `${bet.status === 'cashed_out' ? 'Cashed Out' : 'Won'} ${getTypeName(bet.betType)} Bet ${bet.cashOutMultiplier ? `(${bet.cashOutMultiplier}x)` : ''} - ${displayValue}`,
        timestamp: bet.updatedAt || bet.createdAt,
        gameId: bet.gameId,
        status: 'completed',
        betAmount: bet.amount,
        fee: String(feeDeducted),
        totalDeducted: bet.amount,
      });
    } else if (bet.status === 'lost') {
      activities.push({
        id: `loss-${bet.id}`,
        type: 'loss',
        amount: bet.amount,
        description: `Lost ${getTypeName(bet.betType)} Bet - ${displayValue}`,
        timestamp: bet.updatedAt || bet.createdAt,
        gameId: bet.gameId,
        status: 'completed',
        betAmount: bet.amount,
        fee: '0',
        totalDeducted: bet.amount,
      });
    } else if (bet.status === 'pending') {
      activities.push({
        id: `bet-${bet.id}`,
        type: 'bet',
        amount: bet.amount,
        description: `Pending ${getTypeName(bet.betType)} Bet - ${displayValue}`,
        timestamp: bet.createdAt,
        gameId: bet.gameId,
        status: 'pending',
        betAmount: bet.amount,
        fee: '0',
        totalDeducted: bet.amount,
      });
    }
  });
  
  // Sort by timestamp (newest first)
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Game History Section Component
function GameHistorySection() {
  const [location, setLocation] = useLocation();
  
  const { data: gameHistory = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/games/history'],
  });

  const getNumberColor = (num: number) => {
    if ([0, 5].includes(num)) return 'from-purple-500 to-red-500';
    if ([1, 3, 7, 9].includes(num)) return 'from-green-400 to-green-600';
    return 'from-red-400 to-red-600';
  };

  const getSizeLabel = (num: number) => {
    return num >= 5 ? 'Big' : 'Small';
  };

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
            <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/game')}
              className="mt-3 border-white/20 text-white/80 hover:bg-white/10"
              data-testid="button-start-playing"
            >
              Start Playing
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 mb-3 p-2 rounded-lg bg-white/5 text-xs font-semibold text-white/70">
              <span>Period</span>
              <span>Number</span>
              <span>Size</span>
              <span>Color</span>
            </div>
            {gameHistory.slice(0, 10).map((game: any) => (
              <div 
                key={game.id}
                className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
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
                  className={`text-xs border-white/20 w-fit ${
                    [1, 3, 7, 9].includes(game.result) ? 'text-green-400' : 
                    [0, 5].includes(game.result) ? 'text-purple-400' : 
                    'text-red-400'
                  }`}
                >
                  {[1, 3, 7, 9].includes(game.result) ? 'Green' : 
                   [0, 5].includes(game.result) ? 'Purple' : 'Red'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  const [location, setLocation] = useLocation();
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7d');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const { toast } = useToast();

  // Enable WebSocket for real-time updates
  const { balanceUpdates } = useWebSocket();

  // Get user data
  const { data: user, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keeps user data in cache
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: demoUser } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user && !isLoadingUser,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Get public settings to check if Wingo Mode is globally enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const currentUser = user || demoUser;

  // Redirect to Wingo Mode if enabled (both globally and by user)
  useEffect(() => {
    if (!publicSettings || !user) return;
    const wingoModeGloballyEnabled = publicSettings.find(s => s.key === 'wingo_mode_enabled')?.value !== 'false';
    if (user.wingoMode && wingoModeGloballyEnabled) {
      setLocation('/wingo?modeon');
    }
  }, [user, publicSettings, setLocation]);

  // Redirect to signup if not authenticated (only after loading completes)
  useEffect(() => {
    if (!isLoadingUser && !user) {
      setLocation('/signup');
    }
  }, [user, isLoadingUser, setLocation]);

  // Get user bets for activity history - using my-history endpoint
  const { data: userBets = [], refetch: refetchBets } = useQuery<any[]>({
    queryKey: ['/api/bets/my-history'],
    enabled: !!user,
    staleTime: 5 * 1000, // 5 seconds - very fresh data for real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchInterval: 5000, // Auto-refetch every 5 seconds for instant updates
    refetchOnWindowFocus: true, // Refetch when user comes back to the page
  });

  // Auto-refresh bet data when balance updates occur (bet settled)
  useEffect(() => {
    if (balanceUpdates.length > 0 && user) {
      const latestUpdate = balanceUpdates[0];
      // If the balance update is for this user and it's a win/loss, refetch bets immediately
      if (latestUpdate.userId === user.id && (latestUpdate.changeType === 'win' || latestUpdate.changeType === 'loss')) {
        refetchBets();
      }
    }
  }, [balanceUpdates, user, refetchBets]);

  // Refetch data when modal is opened to ensure fresh timestamps
  useEffect(() => {
    if (selectedActivityId && user) {
      refetchBets();
    }
  }, [selectedActivityId, user, refetchBets]);

  // Transform bets to activity items
  const allActivity = transformBetsToActivity(userBets);

  // Derive selected activity from fresh query data to avoid stale state
  const selectedActivity = selectedActivityId 
    ? allActivity.find(activity => activity.id === selectedActivityId) || null
    : null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'win':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'loss':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'bet':
        return <Gamepad2 className="w-4 h-4 text-blue-500" />;
      case 'deposit':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'withdrawal':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'win':
        return 'text-green-400';
      case 'loss':
        return 'text-red-400';
      case 'bet':
        return 'text-blue-400';
      case 'deposit':
        return 'text-blue-400';
      case 'withdrawal':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'completed': 'default',
      'pending': 'secondary',
      'failed': 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const filteredActivity = allActivity.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  // Pagination calculations
  const totalItems = filteredActivity.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivity = filteredActivity.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (newDateFilter: string) => {
    setDateFilter(newDateFilter);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      <FallingAnimation />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-white text-lg font-semibold">Activity</h1>
          </div>
          <LiveBalance user={currentUser} balanceUpdates={balanceUpdates} showTrend={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 p-4 space-y-6">
        {/* Filters */}
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Activity Type</label>
                <Select value={filterType} onValueChange={handleFilterChange}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-activity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="bet">Bets</SelectItem>
                    <SelectItem value="win">Wins</SelectItem>
                    <SelectItem value="loss">Losses</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-white/70 text-sm mb-2 block">Time Period</label>
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-date-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-white/60">
              Your gaming and transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalItems === 0 ? (
              <div className="text-center py-8 text-white/60">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedActivity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivityId(item.id)}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    data-testid={`activity-item-${item.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getActivityIcon(item.type)}
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.description}</p>
                        {item.gameId && (
                          <p className="text-white/80 text-sm font-mono">{item.gameId}</p>
                        )}
                        <p className="text-white/60 text-sm">{formatDate(item.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      {item.betAmount && (
                        <p className="text-[10px] text-white/40 mb-0.5">
                          Bet: {formatGoldCoins(usdToGoldCoins(item.betAmount))}
                        </p>
                      )}
                      {item.type === 'loss' ? (
                        <p className="font-bold text-red-400 text-sm">
                          Result: -{formatGoldCoins(usdToGoldCoins(item.amount))}
                        </p>
                      ) : (
                        <p className={`font-bold text-sm ${getActivityColor(item.type)}`}>
                          {item.type === 'win' ? 'Result: +' : item.type === 'deposit' ? '+' : item.type === 'bet' || item.type === 'withdrawal' ? '-' : ''}
                          {formatGoldCoins(usdToGoldCoins(item.amount))}
                        </p>
                      )}
                      <Badge 
                        variant={item.status === 'completed' ? 'default' : item.status === 'pending' ? 'secondary' : 'destructive'}
                        className="text-xs mt-1"
                      >
                        {item.status}
                      </Badge>
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                        <span>Click for details</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <div className="text-white/60 text-sm">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={
                              page === currentPage
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "border-white/20 text-white/80 hover:bg-white/10"
                            }
                            data-testid={`button-page-${page}`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Game History Section */}
        <GameHistorySection />
      </main>

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivityId(null)}>
        <DialogContent className="bg-gradient-to-b from-black/50 via-black/40 to-black/50 backdrop-blur-xl border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Activity Details</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              {/* Header with Icon and Amount */}
              <div className="text-center space-y-3 py-2">
                <div className="flex items-center justify-center">
                  {selectedActivity.type === 'win' ? (
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                  ) : selectedActivity.type === 'loss' ? (
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Gamepad2 className="w-6 h-6 text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <p className={`text-3xl font-bold ${
                    selectedActivity.type === 'win' ? 'text-green-400' : 
                    selectedActivity.type === 'loss' ? 'text-red-400' : 
                    'text-blue-400'
                  }`}>
                    {Math.floor(usdToGoldCoins(selectedActivity.amount)).toLocaleString()}
                  </p>
                </div>
                <Badge className={`${
                  selectedActivity.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  selectedActivity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30'
                } border px-3 py-1`}>
                  {selectedActivity.status.charAt(0).toUpperCase() + selectedActivity.status.slice(1)}
                </Badge>
              </div>

              {/* Activity Details - Two Column Layout */}
              <div className="space-y-2">
                {/* Bet Type */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white/60">Bet Type</span>
                  <span className="text-xs text-white/90 font-semibold text-right">
                    {selectedActivity.description}
                  </span>
                </div>

                {/* Activity ID */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white/60">Activity ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/90 font-mono" data-testid="text-activity-id">
                      {selectedActivity.id.slice(0, 6)}...{selectedActivity.id.slice(-6)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedActivity.id, "Activity ID")}
                      className="h-5 w-5 p-0 hover:bg-white/10"
                      data-testid="button-copy-activity-id"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Period ID */}
                {selectedActivity.gameId && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                    <span className="text-xs text-white/60">Period ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/90 font-mono" data-testid="text-game-id">
                        {selectedActivity.gameId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedActivity.gameId!, "Period ID")}
                        className="h-5 w-5 p-0 hover:bg-white/10"
                        data-testid="button-copy-game-id"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bet Amount */}
                {selectedActivity.betAmount && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                    <span className="text-xs text-white/60">Bet Amount</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-white/90">
                        {Math.floor(usdToGoldCoins(selectedActivity.betAmount)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Fee */}
                {selectedActivity.fee && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                    <span className="text-xs text-white/60">Fee (3%)</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-red-400">
                        {Math.floor(usdToGoldCoins(selectedActivity.fee)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total Deducted */}
                {selectedActivity.totalDeducted && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                    <span className="text-xs text-white/60">Total Deducted</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-red-400">
                        {Math.floor(usdToGoldCoins(selectedActivity.totalDeducted)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Net Profit or Amount */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white/60">
                    {selectedActivity.type === 'win' ? 'Net Profit' : 'Amount'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className={`text-xs font-semibold ${
                      selectedActivity.type === 'win' ? 'text-green-400' : 
                      selectedActivity.type === 'loss' ? 'text-red-400' : 
                      'text-blue-400'
                    }`}>
                      {Math.floor(usdToGoldCoins(selectedActivity.amount)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white/60">
                    {selectedActivity.status === 'pending' ? 'Bet Placed' : 'Settled At'}
                  </span>
                  <span className="text-xs text-white/90" data-testid="text-date-detail">
                    {formatFullDate(selectedActivity.timestamp)}
                  </span>
                </div>

                {/* Status with live indicator */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-white/5 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white/60">Status</span>
                  <div className="flex items-center gap-2">
                    {selectedActivity.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        <span className="text-xs text-yellow-400">Live</span>
                      </div>
                    )}
                    {getStatusBadge(selectedActivity.status)}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setSelectedActivityId(null)}
                className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border-0"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav user={user} />
    </div>
  );
}