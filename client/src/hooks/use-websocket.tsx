import { useState, useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

interface GameState {
  [duration: number]: any;
}

interface GameResult {
  game: any;
  result: {
    number: number;
    color: string;
    size: string;
  };
}

interface BalanceUpdate {
  id: string;
  userId: string;
  oldBalance: string;
  newBalance: string;
  changeAmount: string;
  changeType: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bet';
  timestamp: string;
  isBackfill?: boolean;
}

interface AgentActivity {
  id: string;
  agentId: string;
  action: string;
  targetUserId?: string;
  amount: string;
  commissionAmount: string;
  transactionId?: string;
  createdAt: string;
}

interface PeriodBettingData {
  duration: number;
  green: string;
  red: string;
  violet: string;
}

interface LiveBettingData {
  periods: PeriodBettingData[];
}

interface ServerMetrics {
  cpu: {
    count: number;
    model?: string;
    usage: number;
    cores: Array<{ core: number; usage: number }>;
    loadAverage?: {
      '1min': number;
      '5min': number;
      '15min': number;
    };
  };
  memory: {
    total?: number;
    used?: number;
    free?: number;
    usagePercent: number;
    totalFormatted: string;
    usedFormatted: string;
    freeFormatted: string;
  };
  system?: {
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    uptimeFormatted: string;
  };
  timestamp: string;
}

interface PeriodSyncStatus {
  lastSync: Date;
  activePeriods: Array<{
    duration: number;
    periodId: string;
    gameId: string;
    startTime: Date;
    endTime: Date;
    timeRemaining: number;
    status: 'active' | 'completed' | 'cancelled';
  }>;
  syncErrors: string[];
  isHealthy: boolean;
}

interface ValidationReport {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  errors: Array<{
    timestamp: Date;
    type: 'bet' | 'payout' | 'commission' | 'balance' | 'game_result';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    expectedValue: string | number;
    actualValue: string | number;
    entityId: string;
    autoFixed: boolean;
  }>;
  lastValidation: Date;
  isHealthy: boolean;
}

interface CrashState {
  phase: 'waiting' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint?: number;
  startTime?: number;
  gameId?: string;
  players: any[];
  totalPlayers: number;
}

export function useWebSocket() {
  const [gameStates, setGameStates] = useState<GameState>({});
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [balanceUpdates, setBalanceUpdates] = useState<BalanceUpdate[]>([]);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [liveBettingData, setLiveBettingData] = useState<LiveBettingData | null>(null);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [periodSyncStatus, setPeriodSyncStatus] = useState<PeriodSyncStatus | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [crashState, setCrashState] = useState<CrashState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef<number>(0);
  const intentionalCloseRef = useRef<boolean>(false);
  const lastServerMetricsUpdateRef = useRef<number>(0);
  const lastLiveBettingUpdateRef = useRef<number>(0);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      setConnectionStatus('connecting');

      wsRef.current.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (import.meta.env.DEV) {
          console.log('✅ WebSocket connected successfully');
        }
        // Send a ping immediately to verify connection is alive
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const user = queryClient.getQueryData<any>(['/api/auth/me']);
            if (user && user.id) {
              wsRef.current.send(JSON.stringify({ type: 'auth', userId: user.id }));
            } else {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
          } catch (e) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'gameState':
            case 'gameStarted':
              setGameStates(prev => ({
                ...prev,
                [data.duration || data.game.roundDuration]: data.game
              }));
              break;
              
            case 'gameEnded':
              setGameResults(prev => [...prev, data]);
              // Update the game state to completed
              setGameStates(prev => ({
                ...prev,
                [data.game.roundDuration]: data.game
              }));
              // Only invalidate essential queries - reduce lag on Android
              queryClient.invalidateQueries({ queryKey: ['/api/bets/user'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets/user/all'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets/my-history'] });
              queryClient.invalidateQueries({ queryKey: ['/api/games/history'] });
              break;

            case 'balanceUpdate':
              setBalanceUpdates(prev => [data.balanceUpdate, ...prev.slice(0, 9)]);
              // Always invalidate user profile for balance changes to keep PWA in sync
              // This refreshes balance, totalDeposits, totalWithdrawals, totalWinnings, totalLosses
              queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
              queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
              break;

            case 'agentActivity':
              setAgentActivities(prev => [data.activity, ...prev.slice(0, 19)]);
              // Only invalidate essential agent queries - removed refetchQueries to reduce lag
              queryClient.invalidateQueries({ queryKey: ['/api/agent/profile'] });
              break;

            case 'vipSettingsUpdated':
              // VIP settings updated - only invalidate essential queries to prevent lag
              queryClient.invalidateQueries({ queryKey: ['/api/vip/levels'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/vip-settings'] });
              if (import.meta.env.DEV) console.log('✅ VIP settings updated - caches invalidated');
              break;

            case 'liveBettingUpdate':
              // Throttle live betting updates to max once per second to reduce re-renders
              const nowBetting = Date.now();
              if (nowBetting - lastLiveBettingUpdateRef.current >= 1000) {
                if (import.meta.env.DEV) console.log('📡 WebSocket liveBettingUpdate received:', data.liveBets);
                setLiveBettingData(data.liveBets);
                lastLiveBettingUpdateRef.current = nowBetting;
              }
              break;

            case 'serverMetrics':
              // Throttle server metrics updates to max once per 2 seconds to reduce re-renders on Android
              const nowMetrics = Date.now();
              if (nowMetrics - lastServerMetricsUpdateRef.current >= 2000) {
                setServerMetrics(data.metrics);
                lastServerMetricsUpdateRef.current = nowMetrics;
              }
              break;

            case 'adminDashboardUpdate':
              // Admin dashboard data changed - invalidate all admin queries for real-time updates
              queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/games'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/game-analytics'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-statistics'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/user-device-check'] });
              if (import.meta.env.DEV) console.log('📊 Admin dashboard data updated - queries invalidated');
              break;

            case 'gameResult':
              // Instant game result broadcast - update UI immediately
              console.log(`🎯 [InstantResult] Game ${data.gameId} result: ${data.result} (${data.resultColor}, ${data.resultSize})`);
              // Invalidate game history to show new result immediately
              queryClient.invalidateQueries({ queryKey: ['/api/games/history'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets/user'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets/user/all'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bets/my-history'] });
              break;

            case 'periodSync':
              // Period synchronization status update
              if (import.meta.env.DEV) console.log('📍 Period sync update received:', data.status);
              setPeriodSyncStatus(data.status);
              break;

            case 'validationReport':
              // Calculation validation report update
              if (import.meta.env.DEV) console.log('✅ Validation report received:', data.report);
              setValidationReport(data.report);
              break;

            case 'bettingTaskUpdate':
              // Betting task progress updated - invalidate query for real-time updates
              queryClient.invalidateQueries({ queryKey: ['/api/betting-tasks'] });
              if (import.meta.env.DEV) console.log('📊 Betting task progress updated - cache invalidated');
              break;

            case 'crashGameStarted':
            case 'crashGameUpdate':
            case 'crashGameCrashed':
            case 'crashGameWaiting':
              setCrashState(data.state);
              if (data.type === 'crashGameCrashed') {
                queryClient.invalidateQueries({ queryKey: ['/api/crash/history'] });
              }
              break;
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        
        if (intentionalCloseRef.current) {
          return;
        }
        
        // More aggressive reconnection for mobile devices
        const maxQuickAttempts = 10; // Increased from 5 to 10
        let delay;
        
        // Faster reconnection for the first few attempts (critical for mobile)
        if (reconnectAttemptsRef.current < maxQuickAttempts) {
          // Exponential backoff: 500ms, 1s, 2s, 4s, 8s, then cap at 10s
          delay = Math.min(500 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current++;
        } else {
          // After max attempts, retry every 30 seconds (reduced from 60s for mobile)
          delay = 30000;
        }
        
        if (import.meta.env.DEV) {
          console.log(`🔌 WebSocket closed (code: ${event.code}). Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current})`);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      wsRef.current.onerror = (error) => {
        if (import.meta.env.DEV) console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();

    // Handle page visibility changes (critical for mobile PWA)
    // Reconnect when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (import.meta.env.DEV) {
          console.log('📱 App became visible - checking WebSocket connection...');
        }
        // If WebSocket is disconnected or connecting, try to reconnect
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          if (import.meta.env.DEV) {
            console.log('🔄 Reconnecting WebSocket after app became visible...');
          }
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      intentionalCloseRef.current = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    gameStates,
    gameResults,
    balanceUpdates,
    agentActivities,
    liveBettingData,
    serverMetrics,
    periodSyncStatus,
    validationReport,
    crashState,
    connectionStatus,
  };
}
