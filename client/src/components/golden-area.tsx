import { useState, useEffect } from "react";
import { TrendingUp, Sparkles, Users, UserCheck, Clock, Trophy, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import CryptoChartModal from "./crypto-chart-modal";

interface GoldenLiveStats {
  id: string;
  totalPlayers: number;
  activePlayers: number;
  lastHourlyIncrease: string;
  createdAt: string;
  updatedAt: string;
}

interface GoldenNumber {
  id: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface GoldenAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function GoldenArea(props: GoldenAreaProps) {
  const [stats, setStats] = useState<GoldenLiveStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dynamicTotalPlayers, setDynamicTotalPlayers] = useState<number>(0);
  const [dynamicActivePlayers, setDynamicActivePlayers] = useState<number>(0);
  const [showChartModal, setShowChartModal] = useState(false);

  // Fetch Golden Live stats
  const { data: goldenLiveStats, isLoading } = useQuery({
    queryKey: ['/api/golden-live/stats'],
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // WebSocket for real-time updates
  useWebSocket();

  // Update stats when data changes - always use latest backend values
  useEffect(() => {
    if (goldenLiveStats) {
      setStats(goldenLiveStats as GoldenLiveStats);
      setLastUpdate(new Date());
      // Always update with latest backend values (backend auto-increments now)
      setDynamicTotalPlayers((goldenLiveStats as GoldenLiveStats).totalPlayers);
      
      // Initialize active players only on first load
      if (dynamicActivePlayers === 0) {
        const randomActive = Math.floor(Math.random() * (18000 - 1200 + 1)) + 1200;
        setDynamicActivePlayers(randomActive);
      }
    }
  }, [goldenLiveStats, dynamicActivePlayers]);

  // Dynamic active players update: fluctuate within 1200-18000 range every 5 seconds
  useEffect(() => {
    if (!stats) return;
    
    const interval = setInterval(() => {
      setDynamicActivePlayers(prev => {
        const variation = Math.floor(Math.random() * 201) - 100; // Random -100 to +100
        const newValue = prev + variation;
        // Keep it within 1200-18000 bounds
        return Math.max(1200, Math.min(newValue, 18000));
      });
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(interval);
  }, [stats]);

  // Calculate time since last hourly increase
  const getTimeSinceLastIncrease = () => {
    if (!stats?.lastHourlyIncrease) return "N/A";
    const lastIncrease = new Date(stats.lastHourlyIncrease);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastIncrease.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours}h ago`;
    }
  };

  // Calculate hours active - set to around 260 as requested
  const getHoursActive = () => {
    if (!stats?.createdAt) return 260;
    const created = new Date(stats.createdAt);
    const now = new Date();
    const actualHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    // Add 260 to the actual hours to get around 260+ hours
    return Math.max(260 + actualHours, 260);
  };

  // Prepare golden numbers display
  const goldenNumbers: GoldenNumber[] = stats ? [
    { 
      id: "1", 
      value: dynamicTotalPlayers, 
      label: "Total Players", 
      icon: <Users className="w-4 h-4" />,
      color: "from-yellow-300 to-amber-500"
    },
    { 
      id: "2", 
      value: dynamicActivePlayers, 
      label: "Active Now", 
      icon: <UserCheck className="w-4 h-4" />,
      color: "from-green-400 to-emerald-500"
    },
    { 
      id: "3", 
      value: 280, 
      label: "Hourly +280", 
      icon: <TrendingUp className="w-4 h-4" />,
      color: "from-blue-400 to-cyan-500"
    },
    { 
      id: "4", 
      value: getHoursActive(), 
      label: "Hours Active", 
      icon: (
        <div className="relative">
          <Clock className="w-4 h-4" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500/60 rounded-full animate-pulse"></div>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400/40 rounded-full animate-ping"></div>
        </div>
      ),
      color: "from-purple-400 to-violet-500"
    }
  ] : [];

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (isLoading && !stats) {
    return (
      <div 
        {...props}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-600/20 backdrop-blur-md border border-yellow-400/30 shadow-xl ${props.className || ''}`}
      >
        <div className="relative p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CryptoChartModal open={showChartModal} onClose={() => setShowChartModal(false)} />
      
      <div 
        {...props}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-600/20 backdrop-blur-md border border-yellow-400/30 shadow-xl ${props.className || ''}`}
        data-testid="golden-live-area"
      >
      {/* Golden glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/[0.08] to-amber-500/[0.05]"></div>
      
      {/* Animated golden sparkles */}
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
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
            <Trophy className="w-5 h-5 text-yellow-400" />
            Golden Live Area
          </h3>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400 animate-bounce" />
            <span className="text-xs text-yellow-400/80 font-medium">LIVE</span>
          </div>
        </div>
        
        {/* Golden numbers grid */}
        <div className="grid grid-cols-2 gap-4">
          {goldenNumbers.map((item) => (
            <div 
              key={item.id}
              className="relative group p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-yellow-600/10 backdrop-blur-sm border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 hover:scale-105"
              data-testid={`golden-number-${item.id}`}
            >
              {/* Golden shimmer effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Number display */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`text-transparent bg-gradient-to-r ${item.color} bg-clip-text`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-medium text-yellow-400/70 uppercase tracking-wide">
                    {item.label}
                  </div>
                </div>
                <div className={`text-2xl font-bold text-transparent bg-gradient-to-br ${item.color} bg-clip-text animate-pulse`}>
                  {formatNumber(item.value)}
                </div>
                
                {/* Live indicator */}
                <div className="absolute top-0 right-0 w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-ping"></div>
                <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom status bar */}
        <div className="mt-6 p-3 rounded-lg bg-gradient-to-r from-yellow-500/5 via-amber-500/10 to-yellow-600/5 border border-yellow-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-yellow-400/90">
                Golden Live Active
              </span>
              {stats && (
                <span className="text-xs text-yellow-400/60">
                  • Last increase: {getTimeSinceLastIncrease()}
                </span>
              )}
            </div>
            <div className="text-xs text-yellow-400/70 font-mono" data-testid="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        {/* Crypto Chart Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowChartModal(true)}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-blue-500/30"
            data-testid="button-open-crypto-charts"
          >
            <BarChart3 className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
              View Live BTC & TRX Charts
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}