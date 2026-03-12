import { useState, useEffect, useRef, memo } from "react";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";

interface BalanceUpdate {
  id?: string;
  userId: string;
  oldBalance: string;
  newBalance: string;
  changeAmount: string;
  changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet';
  timestamp: string;
  isBackfill?: boolean;
}

interface LiveBalanceProps {
  user?: any;
  className?: string;
  showTrend?: boolean;
  balanceUpdates?: BalanceUpdate[];
  blockUpdate?: boolean;
}

const LiveBalance = memo(function LiveBalance({ user, className = "", showTrend = true, balanceUpdates = [], blockUpdate = false }: LiveBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [balanceTrend, setBalanceTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdateSource, setLastUpdateSource] = useState<'server' | 'websocket'>('server');
  const processedUpdateIdsRef = useRef<Set<string>>(new Set());
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const bufferedUpdateRef = useRef<BalanceUpdate | null>(null);
  const previousBlockStateRef = useRef<boolean>(blockUpdate);

  // Check if user is authenticated (not demo)
  // Use a more defensive check to avoid triggering queries with stale cached data
  const isAuthenticated = Boolean(
    user?.id && 
    user?.email && 
    user?.email !== 'demo@example.com' &&
    typeof user.id === 'string' && 
    user.id.length > 0
  );

  // Fetch user data - poll every 3s so crash game balance stays live
  const { data: liveUser, refetch: refetchUser } = useQuery({
    queryKey: ['/api/user/current'], 
    refetchInterval: 3000,           // Poll every 3s for live balance
    enabled: isAuthenticated,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });


  // Use live user data for authenticated users, original user data for demo users
  const currentUser = isAuthenticated ? (liveUser || user) : user;
  const serverBalance = parseFloat(currentUser?.balance || "0");

  // Sync display balance to server data only when appropriate
  useEffect(() => {
    // Only sync from server if:
    // 1. Updates not blocked AND
    // 2. Server balance is different from display AND
    // 3. Server balance is valid (>= 0) AND
    // 4. Either we're in server mode OR server has caught up with websocket updates OR significant change detected (manual refetch)
    const serverCaughtUp = lastUpdateSource === 'websocket' && Math.abs(serverBalance - displayBalance) < 0.001;
    const significantChange = Math.abs(serverBalance - displayBalance) > 0.01; // Manual refetch likely occurred
    const shouldSync = lastUpdateSource === 'server' || serverCaughtUp || significantChange;
    
    if (!blockUpdate && serverBalance !== displayBalance && serverBalance >= 0 && shouldSync) {
      setDisplayBalance(serverBalance);
      setPreviousBalance(serverBalance);
      // Reset to server mode when syncing due to significant change
      if (serverCaughtUp || significantChange) {
        setLastUpdateSource('server');
      }
    }
  }, [serverBalance, displayBalance, lastUpdateSource, blockUpdate]);

  // Track balance changes from WebSocket updates and update display immediately
  useEffect(() => {
    if (balanceUpdates.length > 0 && currentUser) {
      // Filter updates to find the latest non-backfill update for current user
      let latestValidUpdate: BalanceUpdate | null = null;
      
      for (const update of balanceUpdates) {
        // Skip if no ID (shouldn't happen but be safe)
        if (!update.id) continue;
        
        // Skip if already processed
        if (processedUpdateIdsRef.current.has(update.id)) continue;
        
        // Skip backfill updates
        if (update.isBackfill) {
          // Mark as processed so we don't check it again
          processedUpdateIdsRef.current.add(update.id);
          // Keep set size manageable
          if (processedUpdateIdsRef.current.size > 100) {
            const arr = Array.from(processedUpdateIdsRef.current);
            processedUpdateIdsRef.current = new Set(arr.slice(arr.length - 100));
          }
          continue;
        }
        
        // Check if this update is for current user
        const userMatches = update && (
          update.userId === currentUser?.id || 
          update.userId === currentUser?.publicId ||
          (currentUser?.email === 'demo@example.com' && update.userId === 'user-1')
        );
        
        if (userMatches) {
          // Found a valid update, use it
          latestValidUpdate = update;
          break; // Use the first (latest) valid update we find
        }
      }
      
      if (latestValidUpdate) {
        // Mark this update as processed
        processedUpdateIdsRef.current.add(latestValidUpdate.id!);
        // Keep set size manageable
        if (processedUpdateIdsRef.current.size > 100) {
          const arr = Array.from(processedUpdateIdsRef.current);
          processedUpdateIdsRef.current = new Set(arr.slice(arr.length - 100));
        }
        
        if (blockUpdate) {
          // Buffer the update for later when unblocking
          bufferedUpdateRef.current = latestValidUpdate;
        } else {
          // Apply update immediately
          const newBalance = parseFloat(latestValidUpdate.newBalance);
          const currentPrevious = previousBalance;
          
          // Update display balance immediately
          setDisplayBalance(newBalance);
          setLastUpdateSource('websocket');
          
          // Animate for any balance change (including to/from zero)
          if (Math.abs(newBalance - currentPrevious) > 0.001) {
            setBalanceTrend(newBalance > currentPrevious ? 'up' : 'down');
            setIsAnimating(true);
            
            // Clear any existing animation timeout
            if (animationTimeoutRef.current) {
              clearTimeout(animationTimeoutRef.current);
            }
            
            // Reset animation after 2 seconds using ref to prevent cleanup issues
            animationTimeoutRef.current = setTimeout(() => {
              setIsAnimating(false);
              setBalanceTrend('neutral');
              setPreviousBalance(newBalance);
            }, 2000);
          } else {
            // No animation needed, update previous balance immediately
            setPreviousBalance(newBalance);
          }
        }
      }
    }
  }, [balanceUpdates, currentUser?.id, currentUser?.publicId, currentUser?.email, previousBalance, blockUpdate]);

  // Detect when blockUpdate changes from true to false and apply buffered updates
  useEffect(() => {
    const wasBlocked = previousBlockStateRef.current;
    const isNowUnblocked = wasBlocked && !blockUpdate;
    
    if (isNowUnblocked) {
      // Refetch from server to get authoritative balance
      // Server balance takes priority over buffered WebSocket updates
      refetchUser().then(() => {
        // After refetch completes, set source to server so sync effect trusts it
        setLastUpdateSource('server');
      });
      
      // Apply any buffered update temporarily (will be overridden by server if different)
      if (bufferedUpdateRef.current) {
        const bufferedUpdate = bufferedUpdateRef.current;
        const newBalance = parseFloat(bufferedUpdate.newBalance);
        const currentPrevious = previousBalance;
        
        // Update display balance immediately (temporary, until server refetch completes)
        setDisplayBalance(newBalance);
        
        // Animate for any balance change
        if (Math.abs(newBalance - currentPrevious) > 0.001) {
          setBalanceTrend(newBalance > currentPrevious ? 'up' : 'down');
          setIsAnimating(true);
          
          if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
          }
          
          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
            setBalanceTrend('neutral');
            setPreviousBalance(newBalance);
          }, 2000);
        } else {
          setPreviousBalance(newBalance);
        }
        
        // Clear the buffered update
        bufferedUpdateRef.current = null;
      }
    }
    
    // Update previous block state
    previousBlockStateRef.current = blockUpdate;
  }, [blockUpdate, refetchUser, previousBalance]);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const goldCoinsBalance = usdToGoldCoins(displayBalance);

  const getTrendIcon = () => {
    if (!showTrend || balanceTrend === 'neutral') return null;
    
    return balanceTrend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-400 animate-bounce" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-400 animate-bounce" />
    );
  };

  const getTrendColor = () => {
    if (!isAnimating) return "";
    return balanceTrend === 'up' ? "text-green-400" : "text-red-400";
  };

  return (
    <div 
      className={`live-balance-container ${className}`}
      data-testid="live-balance"
    >
      {/* Live Balance Display */}
      <div className="glass-card rounded-lg px-2 py-2 relative overflow-hidden group hover:scale-105 transition-all duration-300 max-w-fit">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 rounded-xl"></div>
        
        {/* Live indicator */}
        <div className="absolute top-2 right-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-white/90 font-medium">Balance</p>
            {getTrendIcon()}
          </div>
          
          <div 
            className={`text-xs font-bold text-white transition-all duration-500 ${
              isAnimating ? `${getTrendColor()} scale-110` : ""
            }`} 
            data-testid="text-live-balance"
          >
            {formatGoldCoins(goldCoinsBalance)}
          </div>
          
          {/* USD equivalent */}
          <div className="text-xs text-white/70">
            ${displayBalance.toFixed(2)} USD
          </div>
        </div>

        {/* Shimmer effect for live updates */}
        {isAnimating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl animate-shimmer"></div>
        )}
      </div>

    </div>
  );
});

export default LiveBalance;