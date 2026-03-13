import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSriLankaTime, getMinutesSinceMidnight, calculatePeriodNumber, parsePeriodId } from "@shared/time";
import { 
  Settings, 
  Users, 
  Gamepad2, 
  DollarSign, 
  BarChart3, 
  LogOut,
  Eye,
  EyeOff,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  User as UserIcon,
  Lock,
  Zap,
  Globe,
  Clock,
  AlertTriangle,
  TrendingUp,
  Crown,
  Wifi,
  Activity,
  Target,
  Hash,
  Fingerprint,
  Percent,
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
  Download,
  Upload,
  FileText,
  Mail,
  Send,
  Copy,
  Coins,
  Ticket,
  Gift,
  Server,
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Trash,
  MessageCircle,
  Wallet,
  Trophy,
  Unlock,
  AlertCircle,
  ListOrdered,
  History as HistoryIcon,
  Brain,
  ShieldCheck
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { usdToGoldCoins } from "@/lib/currency";
import { cleanGameIdForDisplay } from "@/lib/utils";
import { loginSchema, type LoginUser, type AdminDepositResponse, type AdminWithdrawalResponse } from "@shared/schema";
import LiveStatusIndicator from "@/components/live-status-indicator";
import XBetHeader from "@/components/xbet-header";
import IpEmailDetector from "@/components/ip-email-detector";
import IpWhitelistManager from "@/components/ip-whitelist-manager";
import FallingAnimation from "@/components/falling-animation";
import TrafficAnalytics from "@/components/traffic-analytics";
import AdvancedAnalytics from "@/components/advanced-analytics";
import DatabaseManagement from "@/components/database-management";
import DigitalOceanManagement from "@/components/digitalocean-management";
import ServerUsageMonitor from "@/components/server-usage-monitor";
import PeriodSyncValidator from "@/components/period-sync-validator";
import AdminChatInterface from "@/components/admin-chat-interface";
import { GameRecoveryDashboard } from "@/components/game-recovery-dashboard";
import { TelegramSignalsManager } from "@/components/telegram-signals-manager";
import { TelegramScheduledPostsManager } from "@/components/telegram-scheduled-posts-manager";
import PaymentCheckerDashboard from "@/components/payment-checker-dashboard";
import { CrashRefundsTracker } from "@/components/crash-refunds-tracker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { InsertBettingTask, insertBettingTaskSchema } from "@shared/schema";

interface User {
  id: string;
  publicId: string;
  email: string;
  balance: string;
  frozenBalance?: string;
  role: "user" | "admin" | "agent";
  vipLevel: string;
  isActive: boolean;
  referralCode: string;
  totalDeposits: string;
  totalWithdrawals: string;
  totalWinnings: string;
  totalLosses: string;
  totalCommission: string;
  registrationIp?: string;
  registrationCountry?: string;
  lastLoginIp?: string;
  maxBetLimit: string;
  twoFactorEnabled: boolean;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  wingoMode: boolean;
  createdAt: string;
}

interface Game {
  id: string;
  gameId: string;
  roundDuration: number;
  startTime: string;
  endTime: string;
  status: "active" | "completed" | "cancelled";
  result: number | null;
  resultColor: string | null;
  resultSize: string | null;
  isManuallyControlled: boolean;
  manualResult: number | null;
  totalBetsAmount: string;
  totalPayouts: string;
  houseProfit: string;
}

interface GameAnalytics {
  totalGames: number;
  totalBets: number;
  totalVolume: string;
  totalProfit: string;
  averageBetSize: string;
}

interface AlgorithmStats {
  currentProfitPercentage: string;
  targetProfitPercentage: string;
  adjustment: string;
  biasStrength: string;
  shouldBiasHouse: boolean;
  shouldBiasPlayers: boolean;
  currentHouseProfit: string;
  totalBets: string;
}

interface PaymentStatistics {
  totalDepositsAmount: string;
  totalWithdrawalsAmount: string;
  pendingPaymentsCount: number;
  cancelledPaymentsCount: number;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isEncrypted: boolean;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentProfile {
  id: string;
  userId: string;
  commissionRate: string;
  earningsBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Agent extends User {
  agentProfile: AgentProfile;
}

interface Passkey {
  id: string;
  userId: string;
  credentialId: string;
  deviceName: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  counter: number;
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

interface AdminWithdrawalRequest {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  walletAddress: string;
  status: string;
  userEmail: string;
  userPublicId: string;
  userRegistrationIp?: string;
  duplicateIpCount: number;
  duplicateUsers?: Array<{
    id: string;
    publicId: string;
    email: string;
    registrationIp?: string;
  }>;
  eligible?: boolean;
  requiredBetAmount?: string;
  currentBetAmount?: string;
  createdAt: string;
  updatedAt: string;
  fiatAmount?: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
  fiatCurrency?: string;
  paymentAddress?: string;
  userTotalDeposits?: string;
  userTotalBets?: string;
  userBetPercentage?: number;
  commissionAmount?: string;
  winningsAmount?: string;
  userLiveBalance?: string;
  userTotalReferralEarnings?: string;
  userWithdrawalCount?: number;
}

function LiveBettingAmounts() {
  const { liveBettingData } = useWebSocket();
  const { data: apiLiveBets, isLoading, error } = useQuery<LiveBettingData>({
    queryKey: ['/api/admin/live-bets'],
    retry: false,
  });

  // Use WebSocket data if available, otherwise fall back to API data
  const liveBets = liveBettingData || apiLiveBets;
  
  if (import.meta.env.DEV) {
    console.log('🔍 Live Betting Debug:', {
      liveBettingData,
      apiLiveBets,
      liveBets,
      periodsCount: liveBets?.periods?.length
    });
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-amber-300">Unable to load live betting data</p>
        <p className="text-sm text-purple-400 mt-2">Please ensure you are logged in as admin</p>
      </div>
    );
  }

  if (isLoading || !liveBets) {
    return (
      <div className="flex justify-center items-center py-8">
        <Activity className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const colorConfig = {
    green: {
      bgClass: 'from-emerald-500 via-green-600 to-emerald-700',
      borderClass: 'border-emerald-400',
      textClass: 'text-emerald-300'
    },
    red: {
      bgClass: 'from-red-500 via-red-600 to-red-700',
      borderClass: 'border-red-400',
      textClass: 'text-red-300'
    },
    violet: {
      bgClass: 'from-purple-500 via-violet-600 to-purple-700',
      borderClass: 'border-purple-400',
      textClass: 'text-purple-300'
    }
  };

  return (
    <div className="space-y-6">
      {liveBets.periods.map((period) => {
        const hasAnyBets = parseFloat(period.green) > 0 || parseFloat(period.red) > 0 || parseFloat(period.violet) > 0;
        
        return (
          <div key={period.duration} className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <h4 className="text-sm font-semibold text-gray-200">
                {period.duration} Min Period
              </h4>
              {hasAnyBets && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  Active Bets
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['green', 'red', 'violet'] as const).map((color) => {
                const config = colorConfig[color];
                const amount = period[color];
                
                return (
                  <div
                    key={color}
                    className={`relative overflow-hidden p-4 rounded-xl border ${config.borderClass} bg-gradient-to-br ${config.bgClass} shadow-md`}
                    data-testid={`live-bet-${period.duration}m-${color}`}
                  >
                    <div className="relative z-10">
                      <h3 className="text-xs font-semibold uppercase text-white/80 mb-1">
                        {color}
                      </h3>
                      <div className="text-2xl font-bold text-white">
                        ${parseFloat(amount).toFixed(2)}
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// House Profit Display Component
function HouseProfitDisplay() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { data: stats, isLoading, isFetching, dataUpdatedAt } = useQuery<AlgorithmStats>({
    queryKey: ['/api/admin/algorithm-stats'],
    refetchInterval: 2000, // Update every 2 seconds
    staleTime: 1000,
  });

  // Update timestamp when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdate(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  if (isLoading) {
    return (
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Activity className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProfit = parseFloat(stats?.currentProfitPercentage || '0');
  const targetProfit = parseFloat(stats?.targetProfitPercentage || '2');
  const adjustment = parseFloat(stats?.adjustment || '0');
  const isAboveTarget = currentProfit > targetProfit;
  const isBelowTarget = currentProfit < targetProfit;

  return (
    <Card className="admin-card admin-glow border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            House Profit Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            {isFetching && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
            <span className="text-xs text-slate-400">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <CardDescription className="text-blue-300">
          Real-time algorithm monitoring (updates every 2s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current vs Target Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-sm text-blue-300 mb-1">Current Profit</div>
            <div className={`text-3xl font-bold ${isAboveTarget ? 'text-red-400' : isBelowTarget ? 'text-yellow-400' : 'text-green-400'}`}>
              {currentProfit.toFixed(2)}%
            </div>
            <div className="text-xs text-blue-400 mt-2">
              ${stats?.currentHouseProfit} profit
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="text-sm text-green-300 mb-1">Target Profit</div>
            <div className="text-3xl font-bold text-green-400">
              {targetProfit.toFixed(2)}%
            </div>
            <div className="text-xs text-green-400 mt-2">
              Goal per round
            </div>
          </div>
        </div>

        {/* Adjustment Status */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Adjustment Needed</span>
            <span className={`font-bold text-lg ${adjustment > 0 ? 'text-yellow-400' : adjustment < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {adjustment > 0 ? '+' : ''}{adjustment.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Algorithm Status</span>
            {!stats?.shouldBiasHouse && !stats?.shouldBiasPlayers ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500">
                ✅ At Target
              </Badge>
            ) : stats?.shouldBiasHouse ? (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
                📈 Bias House
              </Badge>
            ) : (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
                📉 Bias Players
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Bias Strength</span>
            <span className="font-mono text-purple-400">{stats?.biasStrength}%</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Progress to Target</span>
            <span className="text-slate-400">{currentProfit.toFixed(1)}% / {targetProfit.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                currentProfit >= targetProfit
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-yellow-500 to-green-500'
              }`}
              style={{ width: `${Math.min((currentProfit / (targetProfit * 2)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Bets */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Total Bets (All Time)</div>
          <div className="text-lg font-bold text-white">${stats?.totalBets}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Live Algorithm Monitor Interface
interface AlgorithmMonitorData {
  timestamp: string;
  algorithmStatus: {
    currentProfitPercentage: string;
    targetProfitPercentage: string;
    adjustment: string;
    biasStrength: string;
    biasDirection: 'house' | 'players' | 'balanced';
    currentHouseProfit: string;
    totalBetsAllTime: string;
  };
  activePeriods: Array<{
    duration: number;
    gameId: string;
    startTime: string;
    endTime: string;
    timeRemaining: number;
    status: string;
    totalBets: number;
    totalBetsAmount: string;
    uniqueUsers: number;
    betsByType: {
      red: { count: number; amount: string };
      green: { count: number; amount: string };
      violet: { count: number; amount: string };
      big: { count: number; amount: string };
      small: { count: number; amount: string };
      numbers: Record<string, { count: number; amount: string }>;
    };
    profitAnalysis: Array<{
      result: number;
      color: string;
      size: string;
      totalPayout: string;
      houseProfit: string;
      houseProfitPercentage: string;
      distanceFromTarget: string;
      isOptimal: boolean;
    }>;
    allResultsAnalysis: Array<{
      result: number;
      color: string;
      size: string;
      totalPayout: string;
      houseProfit: string;
      houseProfitPercentage: string;
      distanceFromTarget: string;
      isOptimal: boolean;
    }>;
    recentBets: Array<{
      id: string;
      type: string;
      value: string;
      amount: string;
      potential: string;
      createdAt: string;
    }>;
  }>;
  recentAlgorithmDecisions: Array<{
    gameId: string;
    duration: number;
    result: number;
    resultColor: string;
    resultSize: string;
    totalBets: string;
    totalPayouts: string;
    houseProfit: string;
    completedAt: string;
  }>;
}

// Live Algorithm Monitor Component
function LiveAlgorithmMonitor() {
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: monitorData, isLoading, isFetching, dataUpdatedAt } = useQuery<AlgorithmMonitorData>({
    queryKey: ['/api/admin/algorithm-monitor'],
    refetchInterval: 1000,
    staleTime: 500,
  });

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdate(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  if (isLoading) {
    return (
      <Card className="admin-card admin-glow border-cyan-500/20">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Activity className="h-12 w-12 text-cyan-400 animate-spin" />
              <p className="text-cyan-300">Loading Algorithm Monitor...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = monitorData?.algorithmStatus;
  const periods = monitorData?.activePeriods || [];
  const decisions = monitorData?.recentAlgorithmDecisions || [];

  const getBiasColor = (direction: string) => {
    if (direction === 'house') return 'text-yellow-400';
    if (direction === 'players') return 'text-blue-400';
    return 'text-green-400';
  };

  const getBiasIcon = (direction: string) => {
    if (direction === 'house') return '📈';
    if (direction === 'players') return '📉';
    return '⚖️';
  };

  const getColorClass = (color: string) => {
    if (color === 'red') return 'bg-red-500';
    if (color === 'green') return 'bg-green-500';
    if (color === 'violet') return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <Card className="admin-card admin-glow border-cyan-500/20 bg-gradient-to-r from-slate-900 via-cyan-900/20 to-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="relative">
                <Activity className="h-6 w-6 text-cyan-400" />
                {isFetching && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Live Algorithm Monitor
              </span>
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500">
                LIVE
              </Badge>
              <span className="text-xs text-slate-400">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <CardDescription className="text-cyan-300">
            Real-time algorithm monitoring with profit analysis for all active periods
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Algorithm Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="admin-card border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-xs text-purple-300 mb-1">Current Profit</div>
            <div className="text-2xl font-bold text-purple-400">
              {status?.currentProfitPercentage}%
            </div>
            <div className="text-xs text-slate-400 mt-1">${status?.currentHouseProfit}</div>
          </CardContent>
        </Card>
        <Card className="admin-card border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-xs text-green-300 mb-1">Target Profit</div>
            <div className="text-2xl font-bold text-green-400">
              {status?.targetProfitPercentage}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Goal per round</div>
          </CardContent>
        </Card>
        <Card className="admin-card border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-xs text-yellow-300 mb-1">Bias Direction</div>
            <div className={`text-2xl font-bold ${getBiasColor(status?.biasDirection || 'balanced')}`}>
              {getBiasIcon(status?.biasDirection || 'balanced')} {status?.biasDirection?.toUpperCase()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Strength: {status?.biasStrength}%</div>
          </CardContent>
        </Card>
        <Card className="admin-card border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-xs text-blue-300 mb-1">Adjustment</div>
            <div className={`text-2xl font-bold ${parseFloat(status?.adjustment || '0') > 0 ? 'text-yellow-400' : parseFloat(status?.adjustment || '0') < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {parseFloat(status?.adjustment || '0') > 0 ? '+' : ''}{status?.adjustment}%
            </div>
            <div className="text-xs text-slate-400 mt-1">All-time bets: ${status?.totalBetsAllTime}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Periods */}
      <Card className="admin-card admin-glow border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Active Periods ({periods.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {periods.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active periods</p>
            </div>
          ) : (
            periods.map((period) => (
              <div 
                key={period.duration}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedPeriod === period.duration 
                    ? 'border-cyan-400 bg-cyan-500/10' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50'
                }`}
                onClick={() => setSelectedPeriod(selectedPeriod === period.duration ? null : period.duration)}
                data-testid={`algorithm-period-${period.duration}m`}
              >
                {/* Period Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{period.duration}m</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Period #{period.gameId.slice(-6)}</h3>
                      <p className="text-xs text-slate-400">ID: {period.gameId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-mono font-bold ${period.timeRemaining < 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                      {formatTime(period.timeRemaining)}
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500 mt-1">
                      {period.totalBets} bets | {period.uniqueUsers} users
                    </Badge>
                  </div>
                </div>

                {/* Bet Distribution */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-red-300">RED</div>
                    <div className="text-lg font-bold text-red-400">${period.betsByType.red.amount}</div>
                    <div className="text-xs text-slate-400">{period.betsByType.red.count} bets</div>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-green-300">GREEN</div>
                    <div className="text-lg font-bold text-green-400">${period.betsByType.green.amount}</div>
                    <div className="text-xs text-slate-400">{period.betsByType.green.count} bets</div>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-purple-300">VIOLET</div>
                    <div className="text-lg font-bold text-purple-400">${period.betsByType.violet.amount}</div>
                    <div className="text-xs text-slate-400">{period.betsByType.violet.count} bets</div>
                  </div>
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-orange-300">BIG</div>
                    <div className="text-lg font-bold text-orange-400">${period.betsByType.big.amount}</div>
                    <div className="text-xs text-slate-400">{period.betsByType.big.count} bets</div>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-blue-300">SMALL</div>
                    <div className="text-lg font-bold text-blue-400">${period.betsByType.small.amount}</div>
                    <div className="text-xs text-slate-400">{period.betsByType.small.count} bets</div>
                  </div>
                </div>

                {/* Number Bets */}
                {Object.keys(period.betsByType.numbers).length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Number Bets:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(period.betsByType.numbers).map(([num, data]) => (
                        <Badge key={num} className="bg-slate-700 text-white">
                          #{num}: ${data.amount} ({data.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {selectedPeriod === period.duration && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    {/* Profit Analysis */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Algorithm Profit Analysis
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-cyan-500/50 text-cyan-300"
                          onClick={(e) => { e.stopPropagation(); setShowAllResults(!showAllResults); }}
                        >
                          {showAllResults ? 'Show Top 5' : 'Show All 10'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                        {(showAllResults ? period.allResultsAnalysis : period.profitAnalysis).map((analysis, idx) => (
                          <div
                            key={analysis.result}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              analysis.isOptimal 
                                ? 'border-green-500 bg-green-500/20' 
                                : idx === 0 
                                  ? 'border-cyan-500 bg-cyan-500/10'
                                  : 'border-slate-600 bg-slate-800/50'
                            }`}
                          >
                            <div className={`w-8 h-8 mx-auto rounded-full ${getColorClass(analysis.color)} flex items-center justify-center mb-1`}>
                              <span className="text-white font-bold">{analysis.result}</span>
                            </div>
                            <div className="text-xs text-slate-400">{analysis.color}</div>
                            <div className={`text-sm font-bold ${parseFloat(analysis.houseProfitPercentage) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {analysis.houseProfitPercentage}%
                            </div>
                            <div className="text-xs text-slate-500">
                              {analysis.isOptimal ? '✓ Optimal' : `Δ${analysis.distanceFromTarget}%`}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-400 text-center">
                        Total Bets: ${period.totalBetsAmount} | Algorithm will favor results closest to {status?.targetProfitPercentage}% target
                      </div>
                    </div>

                    {/* Recent Bets */}
                    {period.recentBets.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2">
                          <ListOrdered className="h-4 w-4" />
                          Recent Bets
                        </h4>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {period.recentBets.map((bet) => (
                            <div key={bet.id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded px-2 py-1">
                              <span className="text-slate-400">#{bet.id}</span>
                              <Badge className={`${
                                bet.value === 'red' ? 'bg-red-500/20 text-red-300' :
                                bet.value === 'green' ? 'bg-green-500/20 text-green-300' :
                                bet.value === 'violet' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-slate-500/20 text-slate-300'
                              }`}>
                                {bet.type}: {bet.value}
                              </Badge>
                              <span className="text-white font-medium">${bet.amount}</span>
                              <span className="text-green-400">→ ${bet.potential}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Algorithm Decisions */}
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-purple-400" />
            Recent Algorithm Decisions
          </CardTitle>
          <CardDescription className="text-purple-300">
            Last 10 completed games with their algorithm-selected results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2 text-slate-400">Period</th>
                  <th className="text-center py-2 px-2 text-slate-400">Duration</th>
                  <th className="text-center py-2 px-2 text-slate-400">Result</th>
                  <th className="text-right py-2 px-2 text-slate-400">Bets</th>
                  <th className="text-right py-2 px-2 text-slate-400">Payouts</th>
                  <th className="text-right py-2 px-2 text-slate-400">Profit</th>
                  <th className="text-right py-2 px-2 text-slate-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((decision) => (
                  <tr key={decision.gameId} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-2 px-2 text-slate-300 font-mono">{decision.gameId.slice(-8)}</td>
                    <td className="py-2 px-2 text-center">
                      <Badge className="bg-slate-700">{decision.duration}m</Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${getColorClass(decision.resultColor)} flex items-center justify-center`}>
                          <span className="text-white text-xs font-bold">{decision.result}</span>
                        </div>
                        <span className="text-xs text-slate-400">{decision.resultSize}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-white">${parseFloat(decision.totalBets || '0').toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-yellow-400">${parseFloat(decision.totalPayouts || '0').toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${parseFloat(decision.houseProfit || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${parseFloat(decision.houseProfit || '0').toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400 text-xs">
                      {new Date(decision.completedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Crash Game Algorithm Settings Component
function CrashSettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings using the query client
  const { data: settings, isLoading: isLoadingSettings } = useQuery<any>({
    queryKey: ['/api/admin/crash/settings'],
  });

  const { data: advancedSettings, isLoading: isLoadingAdvanced } = useQuery<any>({
    queryKey: ['/api/admin/advanced-crash/settings'],
  });

  const { data: crashStats } = useQuery<any>({
    queryKey: ['/api/admin/crash/stats'],
    refetchInterval: 4000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { basic: any, advanced: any }) => {
      const p1 = apiRequest('POST', '/api/admin/crash/settings', payload.basic).then(r => r.json());
      const p2 = apiRequest('POST', '/api/admin/advanced-crash/settings', payload.advanced).then(r => r.json());
      return Promise.all([p1, p2]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crash/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advanced-crash/settings'] });
      toast({
        title: "✅ Success",
        description: "Crash game settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const [houseEdge, setHouseEdge] = useState("20");
  const [maxMultiplier, setMaxMultiplier] = useState("50");
  const [minMultiplier, setMinMultiplier] = useState("1.01");
  const [minBetAmount, setMinBetAmount] = useState("50");
  const [maxBetAmount, setMaxBetAmount] = useState("10000");
  const [maxUserPayout, setMaxUserPayout] = useState("0");

  // Advanced settings states
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [whaleTargetMinMultiplier, setWhaleTargetMinMultiplier] = useState("1.01");
  const [whaleTargetMaxMultiplier, setWhaleTargetMaxMultiplier] = useState("1.04");
  const [noBetBaitMinMultiplier, setNoBetBaitMinMultiplier] = useState("7.00");
  const [noBetBaitMaxMultiplier, setNoBetBaitMaxMultiplier] = useState("20.00");
  const [standardLossMaxThreshold, setStandardLossMaxThreshold] = useState("2.00");
  const [playerWinProbability, setPlayerWinProbability] = useState("40.00");

  useEffect(() => {
    if (settings) {
      setHouseEdge(settings.houseEdge || "20");
      setMaxMultiplier(settings.maxMultiplier || "50");
      setMinMultiplier(settings.minMultiplier || settings.minCrashMultiplier || "1.01");
      setMinBetAmount(settings.minBetAmount || "50");
      setMaxBetAmount(settings.maxBetAmount || "10000");
      setMaxUserPayout(settings.maxUserPayout || "0");
    }
  }, [settings]);

  useEffect(() => {
    if (advancedSettings) {
      setDeepThinkingEnabled(advancedSettings.deepThinkingEnabled !== false);
      setWhaleTargetMinMultiplier(advancedSettings.whaleTargetMinMultiplier || "1.01");
      setWhaleTargetMaxMultiplier(advancedSettings.whaleTargetMaxMultiplier || "1.04");
      setNoBetBaitMinMultiplier(advancedSettings.noBetBaitMinMultiplier || "7.00");
      setNoBetBaitMaxMultiplier(advancedSettings.noBetBaitMaxMultiplier || "20.00");
      setStandardLossMaxThreshold(advancedSettings.standardLossMaxThreshold || "2.00");
      setPlayerWinProbability(advancedSettings.playerWinProbability || "40.00");
    }
  }, [advancedSettings]);

  if (isLoadingSettings || isLoadingAdvanced) {
    return (
      <Card className="admin-card border-orange-500/20">
        <CardContent className="pt-6 flex justify-center">
          <Activity className="h-8 w-8 text-orange-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    updateSettingsMutation.mutate({
      basic: { houseEdge, maxMultiplier, minMultiplier, minBetAmount, maxBetAmount, maxUserPayout },
      advanced: {
        deepThinkingEnabled,
        whaleTargetMinMultiplier,
        whaleTargetMaxMultiplier,
        noBetBaitMinMultiplier,
        noBetBaitMaxMultiplier,
        standardLossMaxThreshold,
        playerWinProbability
      }
    });
  };

  return (
    <Card className="admin-card admin-glow border-orange-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-400" />
          Crash Game Global Settings (3XBet)
        </CardTitle>
        <CardDescription className="text-orange-300">
          Configure the core game rules alongside Deep Thinking Artificial Intelligence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crash Stats Summary — Row 1: Core Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-orange-500/20 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Total Rounds</span>
            <span className="text-white text-2xl font-bold">{crashStats?.totalGames ?? '—'}</span>
            <span className="text-slate-400 text-xs">Games played</span>
          </div>
          <div className="bg-slate-800/60 border border-blue-500/20 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Total Bets</span>
            <span className="text-white text-2xl font-bold">{crashStats?.totalBets ?? '—'}</span>
            <span className="text-slate-400 text-xs">All crash wagers</span>
          </div>
          <div className="bg-slate-800/60 border border-green-500/20 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Total Wins</span>
            <span className="text-white text-2xl font-bold">{crashStats?.totalWins ?? '—'}</span>
            <span className="text-slate-400 text-xs">Players cashed out</span>
          </div>
          <div className={`bg-slate-800/60 border rounded-xl p-4 flex flex-col gap-1 ${
            parseFloat(crashStats?.totalHouseProfit || '0') >= 0
              ? 'border-emerald-500/30'
              : 'border-red-500/30'
          }`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              parseFloat(crashStats?.totalHouseProfit || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>House Profit</span>
            <span className={`text-2xl font-bold ${
              parseFloat(crashStats?.totalHouseProfit || '0') >= 0 ? 'text-emerald-300' : 'text-red-300'
            }`}>
              {crashStats ? `${parseFloat(crashStats.totalHouseProfit) >= 0 ? '+' : ''}${crashStats.totalHouseProfit}` : '—'}
            </span>
            <span className="text-slate-400 text-xs">Net earnings (coins)</span>
          </div>
        </div>

        {/* Crash Stats Summary — Row 2: Financial Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 border border-yellow-500/20 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">🪙 Total Wagered</span>
            <span className="text-white text-2xl font-bold">{crashStats?.totalWagered ?? '—'}</span>
            <span className="text-slate-400 text-xs">Total coins bet</span>
          </div>
          <div className="bg-slate-800/60 border border-pink-500/20 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-pink-400 text-xs font-semibold uppercase tracking-wider">💸 Total Payout</span>
            <span className="text-white text-2xl font-bold">{crashStats?.totalPayout ?? '—'}</span>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-slate-400 text-xs">Coins paid to winners</span>
              <span className="text-slate-500 text-xs">
                Expected profit: <span className="text-yellow-300 font-semibold">+{crashStats?.expectedProfit ?? '0.00'}</span> (at 20% edge)
              </span>
            </div>
          </div>
          <div className={`bg-slate-800/60 border rounded-xl p-4 flex flex-col gap-1 ${
            parseFloat(crashStats?.breakEvenNeeded || '0') > 0 ? 'border-amber-500/30' : 'border-indigo-500/20'
          }`}>
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">📊 Win Rate</span>
            <span className="text-white text-2xl font-bold">{crashStats ? `${crashStats.winRate}%` : '—'}</span>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-slate-400 text-xs">
                {crashStats?.totalWins ?? 0} wins / {crashStats?.totalBets ?? 0} bets
              </span>
              {parseFloat(crashStats?.breakEvenNeeded || '0') > 0 && (
                <span className="text-amber-400 text-xs font-medium">
                  ⚠️ Break-even: +{crashStats?.breakEvenNeeded} coins needed
                </span>
              )}
              {parseFloat(crashStats?.breakEvenNeeded || '1') === 0 && crashStats && (
                <span className="text-emerald-400 text-xs font-medium">✅ House is profitable</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="houseEdge" className="text-orange-200">Global House Edge (%)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="houseEdge"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={houseEdge}
                onChange={(e) => setHouseEdge(e.target.value)}
                className="bg-slate-800/50 border-orange-500/30 text-white"
              />
              <Percent className="h-4 w-4 text-orange-400" />
            </div>
            <p className="text-xs text-orange-400/70">Formula baseline edge</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minMultiplier" className="text-orange-200">Algorithmic Min Multiplier (x)</Label>
            <Input
              id="minMultiplier"
              type="number"
              step="0.01"
              min="1"
              value={minMultiplier}
              onChange={(e) => setMinMultiplier(e.target.value)}
              className="bg-slate-800/50 border-orange-500/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMultiplier" className="text-orange-200">Algorithmic Max Multiplier (x)</Label>
            <Input
              id="maxMultiplier"
              type="number"
              step="1"
              min="1"
              value={maxMultiplier}
              onChange={(e) => setMaxMultiplier(e.target.value)}
              className="bg-slate-800/50 border-orange-500/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUserPayout" className="text-orange-200 font-bold">Max User Payout (x) 🎯</Label>
            <Input
              id="maxUserPayout"
              type="number"
              step="0.1"
              min="0"
              value={maxUserPayout}
              onChange={(e) => setMaxUserPayout(e.target.value)}
              className="bg-slate-800/50 border-orange-500/30 text-white border-dashed"
            />
            <p className="text-[10px] text-orange-400 font-medium">0 = No Limit. Stops flight if users bet.</p>
          </div>
        </div>

        {/* 🎰 Bet Limits — Admin Configurable */}
        <div className="mt-4 p-4 rounded-xl border border-orange-500/20 bg-orange-950/10">
          <h4 className="text-sm font-bold text-orange-300 mb-3 flex items-center gap-2">
            🎰 Crash Bet Limits (Coins)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minBetAmount" className="text-orange-200">Minimum Bet Amount (coins)</Label>
              <Input
                id="minBetAmount"
                type="number"
                step="1"
                min="1"
                value={minBetAmount}
                onChange={(e) => setMinBetAmount(e.target.value)}
                className="bg-slate-800/50 border-orange-500/30 text-white"
              />
              <p className="text-xs text-orange-400/70">Users must bet at least this many coins</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxBetAmount" className="text-orange-200">Maximum Bet Amount (coins)</Label>
              <Input
                id="maxBetAmount"
                type="number"
                step="1"
                min="1"
                value={maxBetAmount}
                onChange={(e) => setMaxBetAmount(e.target.value)}
                className="bg-slate-800/50 border-orange-500/30 text-white"
              />
              <p className="text-xs text-orange-400/70">Users cannot bet more than this</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">💡 Changes saved with the main Save button below. Takes effect immediately on next bet.</p>
        </div>


        <div className="mt-8 border-t border-purple-500/20 pt-6">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              Deep Thinking & Personalization Algorithm
            </h3>
            <div className="flex items-center space-x-2">
              <Switch
                checked={deepThinkingEnabled}
                onCheckedChange={setDeepThinkingEnabled}
              />
              <span className="text-white text-sm font-medium">
                {deepThinkingEnabled ? 'Algorithm Active' : 'RNG Only (No Targeting)'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
             <div className="space-y-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
               <h4 className="text-red-300 font-medium">Whale Hunting (High Bets)</h4>
               <p className="text-xs text-red-200/70">When a user wagers {" > "} 100 coins, game limits their personal crash multiplier to force early loss.</p>
               <div className="flex gap-4">
                 <div className="space-y-2 w-full">
                    <Label className="text-red-200">Target Min (x)</Label>
                    <Input type="number" step="0.01" value={whaleTargetMinMultiplier} onChange={(e) => setWhaleTargetMinMultiplier(e.target.value)} className="bg-slate-800/50 border-red-500/30 text-white" />
                 </div>
                 <div className="space-y-2 w-full">
                    <Label className="text-red-200">Target Max (x)</Label>
                    <Input type="number" step="0.01" value={whaleTargetMaxMultiplier} onChange={(e) => setWhaleTargetMaxMultiplier(e.target.value)} className="bg-slate-800/50 border-red-500/30 text-white" />
                 </div>
               </div>
             </div>

             <div className="space-y-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
               <h4 className="text-green-300 font-medium">Bait Mode (No Bets)</h4>
               <p className="text-xs text-green-200/70">When no real user enters a round, algorithm inflates multiplier significantly to entice future bets.</p>
               <div className="flex gap-4">
                 <div className="space-y-2 w-full">
                    <Label className="text-green-200">Bait Min (x)</Label>
                    <Input type="number" step="0.01" value={noBetBaitMinMultiplier} onChange={(e) => setNoBetBaitMinMultiplier(e.target.value)} className="bg-slate-800/50 border-green-500/30 text-white" />
                 </div>
                 <div className="space-y-2 w-full">
                    <Label className="text-green-200">Bait Max (x)</Label>
                    <Input type="number" step="0.01" value={noBetBaitMaxMultiplier} onChange={(e) => setNoBetBaitMaxMultiplier(e.target.value)} className="bg-slate-800/50 border-green-500/30 text-white" />
                 </div>
               </div>
             </div>

             <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
               <h4 className="text-blue-300 font-medium">Standard Target Constraints</h4>
               <p className="text-xs text-blue-200/70">For standard bets, the forced loss will strictly hover between 1.01x and this maximum.</p>
               <div className="space-y-2 max-w-[200px]">
                  <Label className="text-blue-200">Standard Loss Max (x)</Label>
                  <Input type="number" step="0.01" value={standardLossMaxThreshold} onChange={(e) => setStandardLossMaxThreshold(e.target.value)} className="bg-slate-800/50 border-blue-500/30 text-white" />
               </div>
             </div>

             <div className="space-y-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
               <h4 className="text-purple-300 font-medium">Win Probability Rate</h4>
               <p className="text-xs text-purple-200/70">Chance a user skips the trap array and receives the completely fair Global Crash Point calculation.</p>
               <div className="space-y-2 max-w-[200px]">
                  <Label className="text-purple-200">Probability (%)</Label>
                  <Input type="number" step="1" value={playerWinProbability} onChange={(e) => setPlayerWinProbability(e.target.value)} className="bg-slate-800/50 border-purple-500/30 text-white" />
               </div>
             </div>
          </div>
        </div>

        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg mt-4">
          <h4 className="text-orange-300 font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dynamic Personalization Info
          </h4>
          <p className="text-orange-200/80 text-sm">
            Deep thinking overrides the central RNG outcome per user profile. The main physical node loop will stay alive over customized packets so bots can simulate long climbs.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Algorithm Settings"}
          </Button>
        </div>

        <CrashLiveTracker />
        <CrashHouseProfitPanel />
        <CrashPlayerAnalytics />
      </CardContent>
    </Card>
  );
}

// ─── House Profit Breakdown (Main vs Crash) ─────────────────────────────────
function CrashHouseProfitPanel() {
  const { data: profitData } = useQuery<any>({
    queryKey: ['/api/admin/house-profit'],
    refetchInterval: 10000,
  });

  if (!profitData) return null;

  const gameColors: Record<string, string> = {
    crash: 'text-orange-400 border-orange-500/30 bg-orange-950/20',
    color: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
    number: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
    size: 'text-pink-400 border-pink-500/30 bg-pink-950/20',
  };

  const totalProfit = parseFloat(profitData.totalHouseProfit || '0');

  return (
    <Card className="admin-card border-slate-700/50 mt-6 bg-slate-900/50">
      <CardHeader className="pb-3 border-b border-slate-700/30">
        <CardTitle className="text-white flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏦</span>
            Main House Profit vs Crash Profit
          </div>
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            Total: {totalProfit >= 0 ? '+' : ''}{profitData.totalHouseProfit} ({profitData.overallProfitRate}%)
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {profitData.games?.map((game: any) => {
            const profit = parseFloat(game.houseProfit);
            const colorClass = gameColors[game.betType] || 'text-slate-400 border-slate-600 bg-slate-800/40';
            return (
              <div key={game.betType} className={`border rounded-xl p-3 flex flex-col gap-1 ${colorClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{game.betType}</span>
                  <span className="text-[10px] text-slate-400">{game.totalBets} bets</span>
                </div>
                <div className={`text-xl font-bold ${profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {profit >= 0 ? '+' : ''}{game.houseProfit}
                </div>
                <div className="text-xs text-slate-500">
                  Wagered: <span className="text-slate-300">{game.totalWagered}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Paid out: <span className="text-slate-300">{game.totalPayout}</span>
                </div>
                <div className={`text-xs font-semibold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {game.profitRate}% edge
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Per-User Crash Analytics (Targeting Leaderboard) ───────────────────────
function CrashPlayerAnalytics() {
  const { data: players } = useQuery<any[]>({
    queryKey: ['/api/admin/crash/player-analytics'],
    refetchInterval: 8000,
  });

  if (!players || players.length === 0) return null;

  const topWinners = [...players].sort((a, b) => parseFloat(b.totalPayout) - parseFloat(a.totalPayout)).slice(0, 5);
  const topLosers = [...players].sort((a, b) => parseFloat(b.houseProfit) - parseFloat(a.houseProfit)).slice(0, 5);

  return (
    <Card className="admin-card border-slate-700/50 mt-6 bg-slate-900/50">
      <CardHeader className="pb-3 border-b border-slate-700/30">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <span className="text-lg">🎯</span>
          Crash Player Analytics — Win/Loss Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top losers (house earned most from these) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              💰 House Earns Most From
            </h4>
            <div className="space-y-2">
              {topLosers.map((p, i) => (
                <div key={p.userId} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-bold">#{i + 1}</span>
                    <span className="text-slate-300 text-sm font-medium">{p.username}</span>
                    {p.isHotPlayer && <span className="text-[9px] bg-red-500/20 border border-red-500/30 text-red-300 px-1 rounded">🔥 ACTIVE</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{p.roundsPlayed} rounds</span>
                    <span className="text-emerald-400 font-bold">+{p.houseProfit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top winners (watchlist) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              ⚠️ Watchlist — Top Winners
            </h4>
            <div className="space-y-2">
              {topWinners.map((p, i) => {
                const profit = parseFloat(p.houseProfit);
                return (
                  <div key={p.userId} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${profit < 0 ? 'bg-red-950/30 border-red-500/40' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-bold">#{i + 1}</span>
                      <span className="text-slate-300 text-sm font-medium">{p.username}</span>
                      {p.isHotPlayer && <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1 rounded">🎯 TARGET</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{p.winRate}% WR</span>
                      <span className={profit < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {profit >= 0 ? '+' : ''}{p.houseProfit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full table */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">All Crash Players</h4>
          <div className="rounded-md border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700">
                <tr>
                  <th className="text-left text-slate-300 font-semibold py-2 px-3">Player</th>
                  <th className="text-right text-slate-300 font-semibold py-2 px-3">Rounds</th>
                  <th className="text-right text-slate-300 font-semibold py-2 px-3">Wagered</th>
                  <th className="text-right text-slate-300 font-semibold py-2 px-3">Won</th>
                  <th className="text-right text-slate-300 font-semibold py-2 px-3">Win%</th>
                  <th className="text-right text-slate-300 font-semibold py-2 px-3">House P&L</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const profit = parseFloat(p.houseProfit);
                  return (
                    <tr key={p.userId} className="border-slate-800/50 border-b hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">{p.username}</span>
                          {p.isHotPlayer && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded">🎯</span>}
                        </div>
                      </td>
                      <td className="text-right text-slate-400 py-2 px-3">{p.roundsPlayed}</td>
                      <td className="text-right text-white py-2 px-3">{p.totalWagered}</td>
                      <td className="text-right text-slate-400 py-2 px-3">{p.wins}W / {p.losses}L</td>
                      <td className="text-right py-2 px-3">
                        <span className={parseFloat(p.winRate) > 50 ? 'text-amber-400' : 'text-slate-400'}>{p.winRate}%</span>
                      </td>
                      <td className={`text-right font-bold py-2 px-3 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{p.houseProfit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CrashLiveTracker() {
  const { data: liveData } = useQuery<any>({
    queryKey: ['/api/admin/crash/live'],
    refetchInterval: 1000, // Poll every second for live tracking
  });

  if (!liveData) return null;

  const realPlayers = (liveData.players || []).filter((p: any) => !p.isFake);

  return (
    <Card className="admin-card border-orange-500/20 mt-8 bg-slate-900/50">
      <CardHeader className="pb-4 border-b border-orange-500/10">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-orange-400" />
            Live Crash Tracker (Deep Thinking)
          </div>
          <div className="flex items-center gap-4 text-sm font-normal bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <span className={liveData.phase === 'flying' ? 'text-green-400' : 'text-orange-400'}>
              Status: {liveData.phase.toUpperCase()}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-white">
              Multiplier: <span className="text-orange-400 font-bold">{liveData.multiplier}x</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-purple-300 font-semibold">
              {realPlayers.length} Real Player{realPlayers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-md border border-slate-700 overflow-hidden bg-slate-900/80">
          <Table>
            <TableHeader className="bg-slate-800/80 border-b border-slate-700">
              <TableRow>
                <TableHead className="text-slate-300 font-semibold py-3">Player</TableHead>
                <TableHead className="text-slate-300 font-semibold text-right py-3">Wagered</TableHead>
                <TableHead className="text-slate-300 font-semibold text-right py-3 bg-purple-500/5">AI Target (x)</TableHead>
                <TableHead className="text-slate-300 font-semibold text-right py-3">Status</TableHead>
                <TableHead className="text-slate-300 font-semibold text-right py-3">House Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {realPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">👁️</span>
                      <span>No real players in this round yet</span>
                      <span className="text-xs text-slate-600">Watching for bets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                realPlayers.map((p: any, i: number) => (
                  <TableRow key={i} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-medium text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300">{p.username}</span>
                        <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">REAL</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-white">
                      {parseFloat(p.bet || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right bg-purple-500/5">
                      {p.isFake ? (
                        <span className="text-slate-600">-</span>
                      ) : (
                        <span className="text-purple-400 font-bold">{p.personalTarget}x</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.cashedOut ? (
                        <span className="text-green-400 font-medium">Cashed Out (@{p.cashoutMultiplier}x)</span>
                      ) : p.hasCrashed ? (
                        <span className="text-red-400 font-medium flex items-center justify-end gap-1">
                          <AlertTriangle className="h-3 w-3" /> Trapped
                        </span>
                      ) : liveData.phase === 'crashed' ? (
                        <span className="text-red-400 font-medium">Crashed</span>
                      ) : (
                        <span className="text-orange-400 animate-pulse">Flying...</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {p.cashedOut ? (
                         <span className="text-red-400 font-medium">-{((p.bet * p.cashoutMultiplier) - p.bet).toFixed(2)}</span>
                       ) : p.hasCrashed || liveData.phase === 'crashed' ? (
                         <span className="text-green-400 font-medium">+{parseFloat(p.bet).toFixed(2)}</span>
                       ) : (
                         <span className="text-slate-500">Pending</span>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 space-y-3">
          {/* Player counts */}
          <div className="flex justify-between items-center text-sm px-1">
            <span className="text-slate-400 flex items-center gap-2">
              Global Crash Point:
              <span className="text-white font-mono bg-slate-800 px-2 py-0.5 border border-slate-700 rounded">{liveData.globalCrashPoint}x</span>
            </span>
            <span className="text-slate-400">
              Real Players: <span className="text-purple-300 font-bold">{realPlayers.length}</span> |
              Total in round: <span className="text-white">{(liveData.players || []).length}</span>
            </span>
          </div>

          {/* 🏦 Live Session P&L from House Always Wins engine */}
          {liveData.houseSession && (
            <div className={`rounded-lg border p-3 ${
              liveData.houseSession.isPanicMode
                ? 'border-red-500/50 bg-red-950/30'
                : liveData.houseSession.isUnderPressure
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : 'border-emerald-500/20 bg-emerald-950/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  🏦 House Always Wins — Live Session
                </span>
                <div className="flex items-center gap-2">
                  {liveData.houseSession.isPanicMode && (
                    <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">🚨 PANIC MODE</span>
                  )}
                  {!liveData.houseSession.isPanicMode && liveData.houseSession.isUnderPressure && (
                    <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">⚡ PRESSURE</span>
                  )}
                  {!liveData.houseSession.isPanicMode && !liveData.houseSession.isUnderPressure && (
                    <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold">✅ STABLE</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-slate-400 text-xs">Rounds</div>
                  <div className="text-white font-bold">{liveData.houseSession.roundCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-xs">Wagered</div>
                  <div className="text-yellow-300 font-bold">{liveData.houseSession.totalWagered}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-xs">Paid Out</div>
                  <div className="text-pink-300 font-bold">{liveData.houseSession.totalPayout}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-xs">Session P&L</div>
                  <div className={`font-bold ${parseFloat(liveData.houseSession.houseProfit) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {parseFloat(liveData.houseSession.houseProfit) >= 0 ? '+' : ''}{liveData.houseSession.houseProfit}
                    <span className="text-xs ml-1 opacity-70">({liveData.houseSession.profitRate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

// Referrals Tracking Component
function ReferralsTracking() {
  const { toast } = useToast();

  interface ReferralStats {
    totalReferrals: number;
    activeReferrals: number;
    inactiveReferrals: number;
    totalCommissionPaid: number;
    referralsWithDeposits: number;
    referralsWithoutDeposits: number;
  }

  interface ReferralData {
    id: string;
    referrerId: string;
    referredId: string;
    referralLevel: number;
    commissionRate: number;
    totalCommission: number;
    hasDeposited: boolean;
    status: string;
    createdAt: string;
    referrerEmail: string;
    referrerPublicId: string;
    referredEmail: string;
    referredPublicId: string;
  }

  interface ReferralsResponse {
    referrals: ReferralData[];
    stats: ReferralStats;
  }

  const { data: referralsData, isLoading, isError, error } = useQuery<ReferralsResponse>({
    queryKey: ['/api/admin/referrals'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <div className="text-center">
          <h3 className="text-xl font-semibold text-red-400 mb-2">Failed to Load Referrals</h3>
          <p className="text-gray-400">
            {error instanceof Error && error.message.includes('401') 
              ? 'Authentication required. Please login as admin.' 
              : 'An error occurred while fetching referral data.'}
          </p>
        </div>
      </div>
    );
  }

  const stats = referralsData?.stats;
  const referrals = referralsData?.referrals || [];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="admin-card admin-glow border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Total Referrals</CardTitle>
            <Users className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white" data-testid="total-referrals">
              {stats?.totalReferrals || 0}
            </div>
            <p className="text-xs text-purple-300 mt-1">
              All time referrals
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-glow border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-200">Active Referrals</CardTitle>
            <UserCheck className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400" data-testid="active-referrals">
              {stats?.activeReferrals || 0}
            </div>
            <p className="text-xs text-green-300 mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-glow border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-200">Inactive Referrals</CardTitle>
            <UserX className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400" data-testid="inactive-referrals">
              {stats?.inactiveReferrals || 0}
            </div>
            <p className="text-xs text-red-300 mt-1">
              Currently inactive
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-glow border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-200">Total Commission</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400" data-testid="total-commission">
              ${(stats?.totalCommissionPaid || 0).toFixed(2)}
            </div>
            <p className="text-xs text-yellow-300 mt-1">
              Total paid out
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-glow border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">With Deposits</CardTitle>
            <Wallet className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400" data-testid="referrals-with-deposits">
              {stats?.referralsWithDeposits || 0}
            </div>
            <p className="text-xs text-blue-300 mt-1">
              Made deposits
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card admin-glow border-gray-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Without Deposits</CardTitle>
            <Users className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-400" data-testid="referrals-without-deposits">
              {stats?.referralsWithoutDeposits || 0}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              No deposits yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            All Referrals
          </CardTitle>
          <CardDescription className="text-purple-300">
            Complete referral tracking with user details and commission earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-purple-500/20">
                    <TableHead className="text-purple-200">Referrer</TableHead>
                    <TableHead className="text-purple-200">Referred User</TableHead>
                    <TableHead className="text-purple-200">Level</TableHead>
                    <TableHead className="text-purple-200">Commission Rate</TableHead>
                    <TableHead className="text-purple-200">Total Commission</TableHead>
                    <TableHead className="text-purple-200">Has Deposited</TableHead>
                    <TableHead className="text-purple-200">Status</TableHead>
                    <TableHead className="text-purple-200">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id} className="border-purple-500/10 hover:bg-slate-800/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{referral.referrerEmail}</p>
                          <p className="text-sm text-purple-300">{referral.referrerPublicId || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{referral.referredEmail}</p>
                          <p className="text-sm text-purple-300">{referral.referredPublicId || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          Level {referral.referralLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-white font-mono">
                          {(Number(referral.commissionRate) * 100).toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-400 font-mono font-bold">
                          ${Number(referral.totalCommission).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {referral.hasDeposited ? (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.status === 'active' ? (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-purple-300 text-sm">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <p className="text-purple-300 text-lg">No referrals found</p>
              <p className="text-purple-400 text-sm mt-2">Referrals will appear here once users start referring others</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// VIP Bet Limits Configuration Component
function VipBetLimitsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'limit' | 'deposit' | null>(null);
  const [limitValue, setLimitValue] = useState("");
  const [depositValue, setDepositValue] = useState("");

  const vipLevelNames: Record<string, string> = {
    lv1: "Level 1",
    lv2: "Level 2",
    vip: "VIP",
    vip1: "VIP 1",
    vip2: "VIP 2",
    vip3: "VIP 3",
    vip4: "VIP 4",
    vip5: "VIP 5",
    vip6: "VIP 6",
    vip7: "VIP 7"
  };

  // Fetch VIP bet limits
  const { data: vipBetLimits, isLoading: isLoadingLimits } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/vip-bet-limits'],
  });

  // Fetch VIP deposit requirements
  const { data: vipDepositReqs, isLoading: isLoadingDeposits } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/vip-deposit-requirements'],
  });

  // Update bet limit mutation
  const updateLimitMutation = useMutation({
    mutationFn: async ({ vipLevel, limit }: { vipLevel: string; limit: string }) => {
      const res = await apiRequest('PUT', `/api/admin/vip-bet-limits/${vipLevel}`, { limit });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['/api/admin/vip-bet-limits'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/vip-deposit-requirements'] });
      setEditingLevel(null);
      setEditingField(null);
      setLimitValue("");
      toast({
        title: "✅ Bet Limit Updated",
        description: "VIP level bet limit has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update bet limit",
        variant: "destructive",
      });
    },
  });

  // Update deposit requirement mutation
  const updateDepositMutation = useMutation({
    mutationFn: async ({ vipLevel, depositRequirement }: { vipLevel: string; depositRequirement: string }) => {
      const res = await apiRequest('PUT', `/api/admin/vip-deposit-requirements/${vipLevel}`, { depositRequirement });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['/api/admin/vip-bet-limits'] });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/vip-deposit-requirements'] });
      setEditingLevel(null);
      setEditingField(null);
      setDepositValue("");
      toast({
        title: "✅ Deposit Requirement Updated",
        description: "VIP level deposit requirement has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update deposit requirement",
        variant: "destructive",
      });
    },
  });

  // Handle save action
  const handleSave = (level: string) => {
    if (editingField === 'limit' && limitValue) {
      updateLimitMutation.mutate({ vipLevel: level, limit: limitValue });
    } else if (editingField === 'deposit' && depositValue) {
      updateDepositMutation.mutate({ vipLevel: level, depositRequirement: depositValue });
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, level: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(level);
    }
  };

  if (isLoadingLimits || isLoadingDeposits) {
    return <div className="text-white">Loading VIP configuration...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-200 text-sm font-medium mb-1">📊 VIP Level Configuration</p>
        <p className="text-yellow-300 text-sm">
          Configure maximum bet limits (coins per bet) and deposit requirements (USD to reach each level) for all VIP tiers.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-yellow-500/20 bg-yellow-900/20">
              <TableHead className="text-yellow-200 font-semibold">VIP Level</TableHead>
              <TableHead className="text-yellow-200 font-semibold">Max Bet Limit (Coins)</TableHead>
              <TableHead className="text-yellow-200 font-semibold">Deposit Requirement (USD)</TableHead>
              <TableHead className="text-yellow-200 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vipBetLimits && Object.entries(vipBetLimits).map(([level, limit]) => (
              <TableRow 
                key={level} 
                className="border-yellow-500/20 hover:bg-yellow-900/10"
                data-testid={`row-vip-bet-limit-${level}`}
              >
                <TableCell className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    {vipLevelNames[level] || level.toUpperCase()}
                  </div>
                </TableCell>
                <TableCell className="text-white">
                  {editingLevel === level && editingField === 'limit' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={limitValue}
                        onChange={(e) => setLimitValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, level)}
                        placeholder={limit}
                        className="bg-slate-700 border-yellow-500/30 text-white w-40"
                        data-testid={`input-bet-limit-${level}`}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-green-400" data-testid={`text-bet-limit-${level}`}>
                      {parseFloat(limit).toLocaleString()} coins
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-white">
                  {editingLevel === level && editingField === 'deposit' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={depositValue}
                        onChange={(e) => setDepositValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, level)}
                        placeholder={vipDepositReqs?.[level] || '0'}
                        className="bg-slate-700 border-yellow-500/30 text-white w-40"
                        data-testid={`input-deposit-req-${level}`}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-blue-400" data-testid={`text-deposit-req-${level}`}>
                      ${parseFloat(vipDepositReqs?.[level] || '0').toLocaleString()}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {editingLevel === level ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSave(level)}
                          disabled={(editingField === 'limit' ? !limitValue : !depositValue) || updateLimitMutation.isPending || updateDepositMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-save-${level}`}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingLevel(null);
                            setEditingField(null);
                            setLimitValue("");
                            setDepositValue("");
                          }}
                          className="border-gray-500/30"
                          data-testid={`button-cancel-${level}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingLevel(level);
                            setEditingField('limit');
                            setLimitValue(limit);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-edit-limit-${level}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Limit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingLevel(level);
                            setEditingField('deposit');
                            setDepositValue(vipDepositReqs?.[level] || '0');
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid={`button-edit-deposit-${level}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Deposit
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Passkey Access Control Component
function PasskeyAccessControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: passkeySettings, isLoading } = useQuery<{ passkeyEnabled: boolean }>({
    queryKey: ['/api/admin/passkey-settings'],
  });

  const togglePasskeyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/passkey-settings', { passkeyEnabled: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/passkey-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/system-settings/public'] });
      toast({
        title: data.passkeyEnabled ? "✅ Passkey Access Enabled" : "❌ Passkey Access Disabled",
        description: data.passkeyEnabled 
          ? "All users can now access login, game, and withdrawal pages" 
          : "Login, game, and withdrawal pages are now hidden for all users",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update passkey settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading passkey settings...</div>;
  }

  const isEnabled = passkeySettings?.passkeyEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-200 text-sm font-medium mb-1">🔒 Global Access Control</p>
        <p className="text-red-300 text-sm">
          When disabled, this feature will hide the login page, game page, and withdrawal page for all users. Use this to restrict access during maintenance or emergencies.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-red-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Passkey Access: {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-sm text-purple-300">
              {isEnabled 
                ? 'Users can access all pages normally' 
                : 'Login, game, and withdrawal pages are hidden'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => togglePasskeyMutation.mutate(checked)}
          disabled={togglePasskeyMutation.isPending}
          data-testid="switch-passkey-enabled"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users cannot login or access the game</li>
          <li>• Existing logged-in users will be redirected to the home page</li>
          <li>• Admin access is not affected by this setting</li>
          <li>• Use this feature carefully to avoid disrupting user experience</li>
        </ul>
      </div>
    </div>
  );
}

// Coinflip Maintenance Control Component
function CoinflipMaintenanceControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coinflipSettings, isLoading } = useQuery<{ coinflipEnabled: boolean }>({
    queryKey: ['/api/admin/coinflip-settings'],
  });

  const toggleCoinflipMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/coinflip-settings', { coinflipEnabled: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/coinflip-settings'] });
      toast({
        title: data.coinflipEnabled ? "✅ Coinflip Game Enabled" : "🔧 Coinflip Game Under Maintenance",
        description: data.coinflipEnabled 
          ? "Coinflip game is now accessible to all users" 
          : "Coinflip game is now in maintenance mode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coinflip settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading coinflip settings...</div>;
  }

  const isEnabled = coinflipSettings?.coinflipEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <p className="text-orange-200 text-sm font-medium mb-1">🎲 Coinflip Game Control</p>
        <p className="text-orange-300 text-sm">
          Control the availability of the Coinflip game. When disabled, users will see a maintenance message instead of the game.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-orange-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Coinflip Game: {isEnabled ? 'Enabled' : 'Maintenance Mode'}
            </p>
            <p className="text-sm text-purple-300">
              {isEnabled 
                ? 'Users can play the coinflip game normally' 
                : 'Maintenance message is displayed to users'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => toggleCoinflipMutation.mutate(checked)}
          disabled={toggleCoinflipMutation.isPending}
          data-testid="switch-coinflip-enabled"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users will see a "Under Maintenance" message</li>
          <li>• Players cannot place bets while in maintenance mode</li>
          <li>• Use this when performing updates or fixes to the coinflip game</li>
          <li>• The game can be re-enabled at any time</li>
        </ul>
      </div>
    </div>
  );
}

// Wingo Maintenance Control Component
function WingoMaintenanceControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wingoSettings, isLoading } = useQuery<{ wingoEnabled: boolean }>({
    queryKey: ['/api/admin/wingo-settings'],
  });

  const toggleWingoMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/wingo-settings', { wingoEnabled: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/wingo-settings'] });
      toast({
        title: data.wingoEnabled ? "✅ Win Go Game Enabled" : "🔧 Win Go Game Under Maintenance",
        description: data.wingoEnabled 
          ? "Win Go game is now accessible to all users" 
          : "Win Go game is now in maintenance mode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Win Go settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading Win Go settings...</div>;
  }

  const isEnabled = wingoSettings?.wingoEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-purple-200 text-sm font-medium mb-1">🎯 Win Go Game Control</p>
        <p className="text-purple-300 text-sm">
          Control the availability of the Win Go game. When disabled, users will see a maintenance message instead of the game.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-purple-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Win Go Game: {isEnabled ? 'Enabled' : 'Maintenance Mode'}
            </p>
            <p className="text-sm text-purple-300">
              {isEnabled 
                ? 'Users can play the Win Go game normally' 
                : 'Maintenance message is displayed to users'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => toggleWingoMutation.mutate(checked)}
          disabled={toggleWingoMutation.isPending}
          data-testid="switch-wingo-enabled"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users will see a "Under Maintenance" message</li>
          <li>• Players cannot place bets while in maintenance mode</li>
          <li>• Use this when performing updates or fixes to the Win Go game</li>
          <li>• The game can be re-enabled at any time</li>
        </ul>
      </div>
    </div>
  );
}

// Crash Maintenance Control Component
function CrashMaintenanceControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: crashSettings, isLoading } = useQuery<{ crashEnabled: boolean }>({
    queryKey: ['/api/admin/crash-settings'],
  });

  const toggleCrashMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/crash-settings', { crashEnabled: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/crash-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/system-settings/public'] });
      toast({
        title: data.crashEnabled ? "✅ Crash Game Enabled" : "🔧 Crash Game Under Maintenance",
        description: data.crashEnabled 
          ? "Crash game is now accessible to all users" 
          : "Crash game is now in maintenance mode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Crash settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading Crash settings...</div>;
  }

  const isEnabled = crashSettings?.crashEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-200 text-sm font-medium mb-1">🚀 Crash Game Control</p>
        <p className="text-blue-300 text-sm">
          Control the availability of the Crash game. When disabled, users will see a maintenance message instead of the game.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-blue-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Crash Game: {isEnabled ? 'Enabled' : 'Maintenance Mode'}
            </p>
            <p className="text-sm text-purple-300">
              {isEnabled 
                ? 'Users can play the Crash game normally' 
                : 'Maintenance message is displayed to users'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => toggleCrashMutation.mutate(checked)}
          disabled={toggleCrashMutation.isPending}
          data-testid="switch-crash-enabled"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users will see a "Under Maintenance" message</li>
          <li>• Players cannot place bets while in maintenance mode</li>
          <li>• Use this when performing updates or fixes to the Crash game</li>
          <li>• The game can be re-enabled at any time</li>
        </ul>
      </div>
    </div>
  );
}

// Color Betting Maintenance Control Component
function ColorBettingMaintenanceControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: colorBettingSettings, isLoading } = useQuery<{ colorBettingEnabled: boolean }>({
    queryKey: ['/api/admin/color-betting-settings'],
  });

  const toggleColorBettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/color-betting-settings', { colorBettingEnabled: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/color-betting-settings'] });
      toast({
        title: data.colorBettingEnabled ? "✅ Color Betting Enabled" : "🔧 Color Betting Under Maintenance",
        description: data.colorBettingEnabled 
          ? "Color Betting is now accessible to all users" 
          : "Color Betting is now in maintenance mode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Color Betting settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading Color Betting settings...</div>;
  }

  const isEnabled = colorBettingSettings?.colorBettingEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <p className="text-green-200 text-sm font-medium mb-1">🎨 Color Betting Control</p>
        <p className="text-green-300 text-sm">
          Control the availability of the Color Betting game. When disabled, users will see a maintenance message instead of the game.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-green-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Color Betting: {isEnabled ? 'Enabled' : 'Maintenance Mode'}
            </p>
            <p className="text-sm text-purple-300">
              {isEnabled 
                ? 'Users can play the Color Betting game normally' 
                : 'Maintenance message is displayed to users'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => toggleColorBettingMutation.mutate(checked)}
          disabled={toggleColorBettingMutation.isPending}
          data-testid="switch-color-betting-enabled"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users will see a "Under Maintenance" message</li>
          <li>• Players cannot place bets while in maintenance mode</li>
          <li>• Use this when performing updates or fixes to the Color Betting game</li>
          <li>• The game can be re-enabled at any time</li>
        </ul>
      </div>
    </div>
  );
}

// Payment Methods Visibility Configuration Component
function PaymentMethodsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentMethodsSettings, isLoading } = useQuery<{ trx: boolean; usdttrc20: boolean; usdtmatic: boolean }>({
    queryKey: ['/api/admin/payment-methods-settings'],
  });

  const updatePaymentMethodsMutation = useMutation({
    mutationFn: async (settings: { trx: boolean; usdttrc20: boolean; usdtmatic: boolean }) => {
      const res = await apiRequest('PUT', '/api/admin/payment-methods-settings', settings);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-methods-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/payment-methods-settings'] });
      toast({
        title: "✅ Payment Methods Updated",
        description: "Payment method visibility settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment methods settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading payment methods settings...</div>;
  }

  const settings = paymentMethodsSettings || { trx: true, usdttrc20: true, usdtmatic: true };

  const handleToggle = (method: 'trx' | 'usdttrc20' | 'usdtmatic') => {
    const newSettings = {
      ...settings,
      [method]: !settings[method]
    };
    updatePaymentMethodsMutation.mutate(newSettings);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-200 text-sm font-medium mb-1">💳 Payment Methods Control</p>
        <p className="text-blue-300 text-sm">
          Control which crypto payment methods are visible to users on the deposit page. When disabled, the payment method will be hidden from users.
        </p>
      </div>

      <div className="space-y-3">
        {/* TRX Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${settings.trx ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="font-medium text-white">TRX (TRON Network)</p>
              <p className="text-sm text-purple-300">
                {settings.trx ? 'Visible to users' : 'Hidden from users'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.trx}
            onCheckedChange={() => handleToggle('trx')}
            disabled={updatePaymentMethodsMutation.isPending}
            data-testid="switch-payment-trx"
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* USDT TRC20 Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${settings.usdttrc20 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="font-medium text-white">USDT TRC20</p>
              <p className="text-sm text-purple-300">
                {settings.usdttrc20 ? 'Visible to users' : 'Hidden from users'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.usdttrc20}
            onCheckedChange={() => handleToggle('usdttrc20')}
            disabled={updatePaymentMethodsMutation.isPending}
            data-testid="switch-payment-usdttrc20"
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* USDT Polygon Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${settings.usdtmatic ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="font-medium text-white">USDT Polygon (MATIC)</p>
              <p className="text-sm text-purple-300">
                {settings.usdtmatic ? 'Visible to users' : 'Hidden from users'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.usdtmatic}
            onCheckedChange={() => handleToggle('usdtmatic')}
            disabled={updatePaymentMethodsMutation.isPending}
            data-testid="switch-payment-usdtmatic"
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• When disabled, users will not see the payment method on the deposit page</li>
          <li>• This only affects visibility - existing pending deposits are not affected</li>
          <li>• Re-enable at any time to make the payment method visible again</li>
          <li>• At least one payment method should remain enabled for deposits</li>
        </ul>
      </div>
    </div>
  );
}

// Freeze/Unfreeze Balance Control Component
function FreezeUnfreezeControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: freezeSettings, isLoading } = useQuery<{ globalUnfreezeActive: boolean }>({
    queryKey: ['/api/admin/freeze-settings'],
  });

  const toggleFreezeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest('PUT', '/api/admin/freeze-settings', { globalUnfreezeActive: enabled });
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/freeze-settings'] });
      toast({
        title: data.globalUnfreezeActive ? "✅ Global Unfreeze Activated" : "🔄 Frozen Balances Restored",
        description: data.globalUnfreezeActive 
          ? "All frozen balances have been temporarily set to 0" 
          : "All frozen balances have been restored to their original amounts",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update freeze settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading freeze settings...</div>;
  }

  const isUnfreezeActive = freezeSettings?.globalUnfreezeActive ?? false;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-cyan-200 text-sm font-medium mb-1">❄️ Global Freeze/Unfreeze Control</p>
        <p className="text-cyan-300 text-sm">
          Temporarily unfreeze all user balances or restore them to their original frozen amounts. Use this for system-wide balance management.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isUnfreezeActive ? 'bg-green-500' : 'bg-cyan-500'}`}></div>
          <div>
            <p className="font-medium text-white">
              Global Unfreeze: {isUnfreezeActive ? 'ON' : 'OFF'}
            </p>
            <p className="text-sm text-purple-300">
              {isUnfreezeActive 
                ? 'All frozen balances are currently set to 0 (temporarily unfrozen)' 
                : 'Users have their original frozen amounts'}
            </p>
          </div>
        </div>
        <Switch
          checked={isUnfreezeActive}
          onCheckedChange={(checked) => toggleFreezeMutation.mutate(checked)}
          disabled={toggleFreezeMutation.isPending}
          data-testid="switch-global-unfreeze"
          className="data-[state=checked]:bg-green-500"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Important Notes
        </p>
        <ul className="text-yellow-200 text-sm space-y-1 ml-6">
          <li>• <strong>ON</strong>: Temporarily sets all frozen balances to 0 (users can use full balance)</li>
          <li>• <strong>OFF</strong>: Restores all frozen balances to their original amounts</li>
          <li>• Original frozen amounts are saved and can be restored at any time</li>
          <li>• Use this feature carefully as it affects all users simultaneously</li>
        </ul>
      </div>
    </div>
  );
}

// VIP Telegram Links Configuration Component
function VipTelegramLinksConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState("");

  const vipLevelNames: Record<string, string> = {
    lv1: "Level 1",
    lv2: "Level 2",
    vip: "VIP",
    vip1: "VIP 1",
    vip2: "VIP 2",
    vip3: "VIP 3",
    vip4: "VIP 4",
    vip5: "VIP 5",
    vip6: "VIP 6",
    vip7: "VIP 7"
  };

  // Fetch VIP Telegram links
  const { data: vipTelegramLinks, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/vip-telegram-links'],
  });

  // Update Telegram link mutation
  const updateTelegramLinkMutation = useMutation({
    mutationFn: async ({ vipLevel, telegramLink }: { vipLevel: string; telegramLink: string }) => {
      const res = await apiRequest('PUT', `/api/admin/vip-telegram-links/${vipLevel}`, { telegramLink });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['/api/admin/vip-telegram-links'] });
      setEditingLevel(null);
      setTelegramLink("");
      toast({
        title: "✅ Telegram Link Updated",
        description: "VIP level Telegram link has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update Telegram link",
        variant: "destructive",
      });
    },
  });

  // Handle save action
  const handleSave = (level: string) => {
    updateTelegramLinkMutation.mutate({ vipLevel: level, telegramLink });
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, level: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(level);
    }
  };

  if (isLoading) {
    return <div className="text-white">Loading VIP Telegram links...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-200 text-sm font-medium mb-1">📱 VIP Telegram Links Configuration</p>
        <p className="text-blue-300 text-sm">
          Configure exclusive Telegram channel/group links for each VIP level. Users will receive these links via email when they reach the corresponding VIP level.
        </p>
      </div>

      <div className="rounded-lg border border-blue-500/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-blue-500/20 bg-blue-900/20">
              <TableHead className="text-blue-200 font-semibold">VIP Level</TableHead>
              <TableHead className="text-blue-200 font-semibold">Telegram Link</TableHead>
              <TableHead className="text-blue-200 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vipTelegramLinks && Object.entries(vipTelegramLinks).map(([level, link]) => (
              <TableRow 
                key={level} 
                className="border-blue-500/20 hover:bg-blue-900/10"
                data-testid={`row-vip-telegram-${level}`}
              >
                <TableCell className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    {vipLevelNames[level] || level.toUpperCase()}
                  </div>
                </TableCell>
                <TableCell className="text-white">
                  {editingLevel === level ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={telegramLink}
                        onChange={(e) => setTelegramLink(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, level)}
                        placeholder="https://t.me/your_channel"
                        className="bg-slate-700 border-blue-500/30 text-white"
                        data-testid={`input-telegram-link-${level}`}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className={link ? "text-blue-400 break-all" : "text-gray-500 italic"} data-testid={`text-telegram-link-${level}`}>
                      {link || "Not configured"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {editingLevel === level ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSave(level)}
                          disabled={updateTelegramLinkMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-save-telegram-${level}`}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingLevel(null);
                            setTelegramLink("");
                          }}
                          className="border-gray-500/30"
                          data-testid={`button-cancel-telegram-${level}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingLevel(level);
                          setTelegramLink(link || '');
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`button-edit-telegram-${level}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Link
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// VIP Settings Manager Component
function VipSettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    levelName: "",
    levelOrder: 0,
    maxBet: "",
    rechargeAmount: "",
    memberRechargeCount: 0,
    levelKey: "",
    dailyWagerReward: "",
    commissionRates: { lv1: 0, lv2: 0, vip: 0 },
    telegramLink: "",
    supportEmail: "",
  });

  // Fetch VIP settings
  const { data: vipSettings, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/vip-settings'],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/vip-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vip-settings'] });
      toast({ title: "Success", description: "VIP setting created successfully" });
      setIsAdding(false);
      resetForm();
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create VIP setting", 
        variant: "destructive" 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest('PUT', `/api/admin/vip-settings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vip-settings'] });
      toast({ title: "Success", description: "VIP setting updated successfully" });
      setEditingId(null);
      resetForm();
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update VIP setting", 
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/vip-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vip-settings'] });
      toast({ title: "Success", description: "VIP setting deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete VIP setting", 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      levelName: "",
      levelOrder: 0,
      maxBet: "",
      rechargeAmount: "",
      memberRechargeCount: 0,
      levelKey: "",
      dailyWagerReward: "",
      commissionRates: { lv1: 0, lv2: 0, vip: 0 },
      telegramLink: "",
      supportEmail: "",
    });
  };

  const handleEdit = (setting: any) => {
    setEditingId(setting.id);
    setFormData({
      levelName: setting.levelName,
      levelOrder: setting.levelOrder,
      maxBet: setting.maxBet,
      rechargeAmount: setting.rechargeAmount,
      memberRechargeCount: setting.memberRechargeCount,
      levelKey: setting.levelKey || "",
      dailyWagerReward: setting.dailyWagerReward || "",
      commissionRates: setting.commissionRates || { lv1: 0, lv2: 0, vip: 0 },
      telegramLink: setting.telegramLink || "",
      supportEmail: setting.supportEmail || "",
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  if (isLoading) {
    return <div className="text-white">Loading VIP settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-yellow-600 hover:bg-yellow-700"
          data-testid="button-add-vip-level"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add VIP Level
        </Button>
      </div>

      {(isAdding || editingId) && (
        <Card className="border-yellow-500/30 bg-slate-800/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-yellow-200">Level Name</Label>
                <Input
                  value={formData.levelName}
                  onChange={(e) => setFormData({ ...formData, levelName: e.target.value })}
                  placeholder="VIP 0"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-level-name"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Level Order</Label>
                <Input
                  type="number"
                  value={formData.levelOrder}
                  onChange={(e) => setFormData({ ...formData, levelOrder: parseInt(e.target.value) })}
                  placeholder="0"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-level-order"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Maximum Bet</Label>
                <Input
                  value={formData.maxBet}
                  onChange={(e) => setFormData({ ...formData, maxBet: e.target.value })}
                  placeholder="300"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-max-bet"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Recharge Amount (USDT)</Label>
                <Input
                  value={formData.rechargeAmount}
                  onChange={(e) => setFormData({ ...formData, rechargeAmount: e.target.value })}
                  placeholder="1000"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-recharge-amount"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Member Recharge Count</Label>
                <Input
                  type="number"
                  value={formData.memberRechargeCount}
                  onChange={(e) => setFormData({ ...formData, memberRechargeCount: parseInt(e.target.value) })}
                  placeholder="10"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-member-recharge-count"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Level Key</Label>
                <Input
                  value={formData.levelKey}
                  onChange={(e) => setFormData({ ...formData, levelKey: e.target.value })}
                  placeholder="vip1"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-level-key"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Daily Wager Reward</Label>
                <Input
                  value={formData.dailyWagerReward}
                  onChange={(e) => setFormData({ ...formData, dailyWagerReward: e.target.value })}
                  placeholder="100"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-daily-wager-reward"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Telegram Link</Label>
                <Input
                  value={formData.telegramLink}
                  onChange={(e) => setFormData({ ...formData, telegramLink: e.target.value })}
                  placeholder="https://t.me/yourgroup"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-telegram-link"
                />
              </div>
              <div>
                <Label className="text-yellow-200">Support Email</Label>
                <Input
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="support@yourdomain.com"
                  className="bg-slate-700 border-yellow-500/30 text-white"
                  data-testid="input-support-email"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-yellow-200">Commission Rates (%)</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label className="text-yellow-300 text-xs">Level 1</Label>
                  <Input
                    type="number"
                    value={formData.commissionRates.lv1}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      commissionRates: { ...formData.commissionRates, lv1: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0.5"
                    className="bg-slate-700 border-yellow-500/30 text-white"
                    data-testid="input-commission-lv1"
                  />
                </div>
                <div>
                  <Label className="text-yellow-300 text-xs">Level 2</Label>
                  <Input
                    type="number"
                    value={formData.commissionRates.lv2}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      commissionRates: { ...formData.commissionRates, lv2: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0.2"
                    className="bg-slate-700 border-yellow-500/30 text-white"
                    data-testid="input-commission-lv2"
                  />
                </div>
                <div>
                  <Label className="text-yellow-300 text-xs">VIP</Label>
                  <Input
                    type="number"
                    value={formData.commissionRates.vip}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      commissionRates: { ...formData.commissionRates, vip: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0.1"
                    className="bg-slate-700 border-yellow-500/30 text-white"
                    data-testid="input-commission-vip"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-save-vip-setting"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-gray-500/30"
                data-testid="button-cancel-vip-setting"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-yellow-500/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-yellow-500/20">
              <TableHead className="text-yellow-200">Level Name</TableHead>
              <TableHead className="text-yellow-200">Level Key</TableHead>
              <TableHead className="text-yellow-200">Order</TableHead>
              <TableHead className="text-yellow-200">Max Bet</TableHead>
              <TableHead className="text-yellow-200">Recharge (USDT)</TableHead>
              <TableHead className="text-yellow-200">Daily Reward</TableHead>
              <TableHead className="text-yellow-200">Commission %</TableHead>
              <TableHead className="text-yellow-200">Telegram Link</TableHead>
              <TableHead className="text-yellow-200">Support Email</TableHead>
              <TableHead className="text-yellow-200">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vipSettings && vipSettings.length > 0 ? (
              vipSettings.map((setting: any) => (
                <TableRow 
                  key={setting.id} 
                  className="border-yellow-500/20 hover:bg-yellow-900/10"
                  data-testid={`row-vip-setting-${setting.id}`}
                >
                  <TableCell className="text-white font-medium">{setting.levelName}</TableCell>
                  <TableCell className="text-yellow-300 font-mono text-sm">{setting.levelKey || '-'}</TableCell>
                  <TableCell className="text-white">{setting.levelOrder}</TableCell>
                  <TableCell className="text-white">{parseFloat(setting.maxBet).toFixed(0)}</TableCell>
                  <TableCell className="text-white">{parseFloat(setting.rechargeAmount).toFixed(0)}</TableCell>
                  <TableCell className="text-white">{setting.dailyWagerReward ? parseFloat(setting.dailyWagerReward).toFixed(0) : '-'}</TableCell>
                  <TableCell className="text-white text-sm">
                    {setting.commissionRates ? (
                      <div className="flex flex-col gap-0.5">
                        <span>L1: {setting.commissionRates.lv1}%</span>
                        <span>L2: {setting.commissionRates.lv2}%</span>
                        <span>VIP: {setting.commissionRates.vip}%</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[200px]">
                    {setting.telegramLink ? (
                      <a 
                        href={setting.telegramLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline truncate block"
                        data-testid={`link-telegram-${setting.id}`}
                      >
                        {setting.telegramLink}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[200px]">
                    {setting.supportEmail ? (
                      <a 
                        href={`mailto:${setting.supportEmail}`} 
                        className="text-blue-400 hover:text-blue-300 underline truncate block"
                        data-testid={`link-email-${setting.id}`}
                      >
                        {setting.supportEmail}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(setting)}
                        className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                        data-testid={`button-edit-vip-${setting.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(setting.id)}
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        data-testid={`button-delete-vip-${setting.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                  No VIP settings configured. Click "Add VIP Level" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Promo Codes Manager Component
function PromoCodesManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [vipLevelUpgrade, setVipLevelUpgrade] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");

  // Fetch promo codes
  const { data: promoCodesData, isLoading: isLoadingCodes } = useQuery<{ codes: any[]; total: number }>({
    queryKey: ['/api/admin/promo-codes'],
    refetchInterval: 5000,
  });

  // Create promo code mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/promo-codes', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code created successfully",
      });
      // Reset form
      setCode("");
      setAmount("");
      setUsageLimit("");
      setRequireDeposit(false);
      setVipLevelUpgrade("");
      setExpiresAt("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/promo-codes/${id}/status`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code status updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/promo-codes/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!code || !amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be a valid positive number",
        variant: "destructive",
      });
      return;
    }

    // Convert coins to USD (100 coins = 1 USD)
    const usdAmount = (amountVal / 100).toFixed(2);
    const minUsdAmount = (1 / 100).toFixed(2); // 1 coin = 0.01 USD

    const payload: any = {
      code: code.toUpperCase(),
      totalValue: usdAmount,
      minValue: minUsdAmount,
      maxValue: usdAmount,
      requireDeposit,
    };

    if (usageLimit) {
      payload.usageLimit = parseInt(usageLimit);
    }

    if (vipLevelUpgrade && vipLevelUpgrade !== "none") {
      payload.vipLevelUpgrade = vipLevelUpgrade;
    }

    if (expiresAt) {
      payload.expiresAt = new Date(expiresAt).toISOString();
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Create Promo Code Card */}
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Create Promo Code
          </CardTitle>
          <CardDescription className="text-purple-300">
            Generate promotional codes with random reward amounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-code" className="text-purple-200">
                Code <span className="text-red-400">*</span>
              </Label>
              <Input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME100"
                className="bg-slate-800/50 border-purple-500/20 text-white"
                data-testid="input-promo-code-create"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-purple-200">
                Amount <span className="text-red-400">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                className="bg-slate-800/50 border-purple-500/20 text-white"
                data-testid="input-amount"
              />
              <p className="text-xs text-purple-300">
                Users will randomly receive 1 to {amount || "?"} coins
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="usage-limit" className="text-purple-200">
                Usage Limit (Optional)
              </Label>
              <Input
                id="usage-limit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="bg-slate-800/50 border-purple-500/20 text-white"
                data-testid="input-usage-limit"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expires-at" className="text-purple-200">
                Expiration Date (Optional)
              </Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="bg-slate-800/50 border-purple-500/20 text-white"
                data-testid="input-expires-at"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={requireDeposit}
              onCheckedChange={setRequireDeposit}
              data-testid="switch-require-deposit"
            />
            <Label className="text-purple-200">
              Require user to have made a deposit
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vip-level" className="text-purple-200">
              VIP Level Upgrade (Optional)
            </Label>
            <Select value={vipLevelUpgrade} onValueChange={setVipLevelUpgrade}>
              <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" data-testid="select-vip-level">
                <SelectValue placeholder="No VIP upgrade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No VIP upgrade</SelectItem>
                <SelectItem value="lv1">Level 1</SelectItem>
                <SelectItem value="lv2">Level 2</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="vip1">VIP 1</SelectItem>
                <SelectItem value="vip2">VIP 2</SelectItem>
                <SelectItem value="vip3">VIP 3</SelectItem>
                <SelectItem value="vip4">VIP 4</SelectItem>
                <SelectItem value="vip5">VIP 5</SelectItem>
                <SelectItem value="vip6">VIP 6</SelectItem>
                <SelectItem value="vip7">VIP 7</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-purple-300">
              Upgrade user's VIP level when they redeem this code
            </p>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-purple-200 text-sm font-medium mb-2">💡 How it works:</p>
            <ul className="text-purple-300 text-sm space-y-1 ml-4">
              <li>• <span className="font-semibold">Amount:</span> Maximum coins users can receive</li>
              <li>• <span className="font-semibold">Random Reward:</span> Users get between 1 and [Amount] coins</li>
              <li>• <span className="font-semibold">Example:</span> Amount=10 → users randomly get 1-10 coins</li>
              <li>• <span className="font-semibold">VIP Upgrade:</span> Automatically upgrade user's VIP level on redemption</li>
              <li>• Each user can only redeem each code once</li>
            </ul>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-create-promo-code"
          >
            {createMutation.isPending ? "Creating..." : "Create Promo Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Promo Codes List */}
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Promo Codes
          </CardTitle>
          <CardDescription className="text-purple-300">
            Manage all promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCodes ? (
            <div className="text-center py-8" data-testid="loading-promo-codes">
              <Activity className="h-8 w-8 text-purple-400 mx-auto mb-3 animate-spin" />
              <p className="text-purple-300">Loading promo codes...</p>
            </div>
          ) : promoCodesData?.codes && promoCodesData.codes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-purple-500/20">
                    <TableHead className="text-purple-200">Code</TableHead>
                    <TableHead className="text-purple-200">Total Value</TableHead>
                    <TableHead className="text-purple-200">Min-Max</TableHead>
                    <TableHead className="text-purple-200">VIP Upgrade</TableHead>
                    <TableHead className="text-purple-200">Usage</TableHead>
                    <TableHead className="text-purple-200">Status</TableHead>
                    <TableHead className="text-purple-200">Expires</TableHead>
                    <TableHead className="text-purple-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodesData.codes.map((promoCode: any) => (
                    <TableRow key={promoCode.id} className="border-purple-500/10 hover:bg-slate-800/30">
                      <TableCell className="font-mono text-white font-semibold">
                        {promoCode.code}
                      </TableCell>
                      <TableCell className="text-white">
                        {Math.round(parseFloat(promoCode.totalValue) * 100)} coins
                      </TableCell>
                      <TableCell className="text-white">
                        {Math.round(parseFloat(promoCode.minValue) * 100)} - {Math.round(parseFloat(promoCode.maxValue) * 100)} coins
                      </TableCell>
                      <TableCell className="text-white">
                        {promoCode.vipLevelUpgrade ? (
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            <Crown className="w-3 h-3 mr-1" />
                            {promoCode.vipLevelUpgrade.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white">
                        {promoCode.usedCount} {promoCode.usageLimit ? `/ ${promoCode.usageLimit}` : '/ ∞'}
                      </TableCell>
                      <TableCell>
                        <Badge className={promoCode.isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-gray-500/20 text-gray-300 border-gray-500/30"}>
                          {promoCode.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">
                        {promoCode.expiresAt ? new Date(promoCode.expiresAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStatusMutation.mutate({ id: promoCode.id, isActive: !promoCode.isActive })}
                            className={promoCode.isActive ? "border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10" : "border-green-500/30 text-green-300 hover:bg-green-500/10"}
                            data-testid={`button-toggle-${promoCode.id}`}
                          >
                            {promoCode.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(promoCode.id)}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                            data-testid={`button-delete-${promoCode.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8" data-testid="no-promo-codes">
              <Ticket className="h-12 w-12 text-purple-400 mx-auto mb-4 opacity-50" />
              <p className="text-purple-300">No promo codes created yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LiveChatSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isEditingTelegramId, setIsEditingTelegramId] = useState(false);

  const { data: settings, isLoading } = useQuery<{ chatIconVisible: boolean; telegramIntegrationEnabled: boolean; telegramSupportChatId: string }>({
    queryKey: ['/api/admin/live-chat/settings']
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: { chatIconVisible?: boolean; telegramIntegrationEnabled?: boolean; telegramSupportChatId?: string }) => {
      const response = await apiRequest('PATCH', '/api/admin/live-chat/settings', newSettings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/live-chat/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/live-chat/settings'] });
      setIsEditingTelegramId(false);
      toast({
        title: "Settings updated",
        description: "Live chat settings have been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      });
    }
  });

  const handleChatIconToggle = (checked: boolean) => {
    updateSettingsMutation.mutate({ chatIconVisible: checked });
  };

  const handleTelegramToggle = (checked: boolean) => {
    updateSettingsMutation.mutate({ telegramIntegrationEnabled: checked });
  };

  const handleSaveTelegramId = () => {
    updateSettingsMutation.mutate({ telegramSupportChatId: telegramChatId });
  };

  const handleEditTelegramId = () => {
    setTelegramChatId(settings?.telegramSupportChatId || '');
    setIsEditingTelegramId(true);
  };

  return (
    <Card className="admin-card admin-glow border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-400" />
          Live Chat Settings
        </CardTitle>
        <CardDescription className="text-purple-300">
          Control live chat icon visibility and Telegram integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-purple-300">Loading settings...</div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-purple-500/20">
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Live Chat Icon Visibility</h3>
                <p className="text-sm text-purple-300">
                  When enabled, users will see the live chat icon on their screen. When disabled, the icon will be hidden.
                </p>
              </div>
              <Switch
                checked={settings?.chatIconVisible ?? true}
                onCheckedChange={handleChatIconToggle}
                disabled={updateSettingsMutation.isPending}
                data-testid="switch-chat-icon-visible"
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-purple-500/20">
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Telegram Integration</h3>
                <p className="text-sm text-purple-300">
                  When enabled, user messages are forwarded to Telegram bot. When disabled, only dashboard chat works.
                </p>
              </div>
              <Switch
                checked={settings?.telegramIntegrationEnabled ?? true}
                onCheckedChange={handleTelegramToggle}
                disabled={updateSettingsMutation.isPending}
                data-testid="switch-telegram-integration"
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-purple-500/20 space-y-3">
              <div>
                <h3 className="text-white font-medium mb-1">Telegram Support Chat ID</h3>
                <p className="text-sm text-purple-300 mb-3">
                  The Telegram chat ID where live chat messages will be forwarded. Get this from your Telegram bot.
                </p>
              </div>
              
              {isEditingTelegramId ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Enter Telegram Chat ID (e.g., -1001234567890)"
                    className="bg-slate-700 border-purple-500/30 text-white flex-1"
                    data-testid="input-telegram-support-chat-id"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTelegramId}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-save-telegram-id"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingTelegramId(false)}
                    className="border-gray-500/30"
                    data-testid="button-cancel-telegram-id"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-slate-900/50 rounded border border-purple-500/20">
                    <span className="text-white font-mono text-sm" data-testid="text-current-telegram-id">
                      {settings?.telegramSupportChatId || 'Not configured'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleEditTelegramId}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-edit-telegram-id"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Betting Tasks List Component
const BettingTasksList = memo(() => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/betting-tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/betting-tasks');
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest('DELETE', `/api/admin/betting-tasks/${taskId}`);
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "Betting task has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/betting-tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Task",
        description: error.message || "Failed to delete betting task",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-purple-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
        Loading tasks...
      </div>
    );
  }

  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Trophy className="h-5 w-5 text-purple-400" />
        Active Tasks ({tasks.length})
      </h3>
      
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-purple-300 bg-slate-800/30 rounded-lg border border-purple-500/20">
          <Trophy className="h-12 w-12 text-purple-400 mx-auto mb-4 opacity-50" />
          <p>No tasks created yet. Create your first betting task above!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20">
                <TableHead className="text-purple-300">Task Name</TableHead>
                <TableHead className="text-purple-300">Duration</TableHead>
                <TableHead className="text-purple-300">Bet Required</TableHead>
                <TableHead className="text-purple-300">Coin Reward</TableHead>
                <TableHead className="text-purple-300">Status</TableHead>
                <TableHead className="text-purple-300 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task: any) => (
                <TableRow key={task.id} className="border-purple-500/10 hover:bg-purple-500/5 transition-colors">
                  <TableCell className="text-white font-medium">
                    <div>
                      <p>{task.name}</p>
                      {task.description && <p className="text-xs text-purple-300">{task.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-purple-300">{task.durationMinutes} min</TableCell>
                  <TableCell className="text-purple-300">${task.betRequirement}</TableCell>
                  <TableCell className="text-purple-300">${task.coinReward}</TableCell>
                  <TableCell>
                    <Badge 
                      className={task.isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}
                    >
                      {task.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(task.id)}
                      disabled={deleteMutation.isPending}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                      data-testid={`button-delete-task-${task.id}`}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
});

// Create Betting Task Form Component - Module Level
const CreateBettingTaskForm = memo(() => {
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [betRequirement, setBetRequirement] = useState("100.00");
  const [durationMinutes, setDurationMinutes] = useState("1");
  const [coinReward, setCoinReward] = useState("1.00");
  const [isActive, setIsActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: InsertBettingTask) => {
      const response = await apiRequest('POST', '/api/admin/betting-tasks', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Created!",
        description: "Betting task created successfully",
      });
      // Reset form
      setTaskName("");
      setTaskDescription("");
      setBetRequirement("100.00");
      setDurationMinutes("1");
      setCoinReward("1.00");
      setIsActive(true);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/betting-tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Task",
        description: error.message || "Failed to create betting task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim()) {
      toast({
        title: "Validation Error",
        description: "Task name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const data: InsertBettingTask = {
        name: taskName.trim(),
        description: taskDescription.trim() || undefined,
        betRequirement: parseFloat(betRequirement).toFixed(8),
        durationMinutes: parseInt(durationMinutes),
        coinReward: parseFloat(coinReward).toFixed(8),
        isActive: isActive,
      };
      createMutation.mutate(data);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5 text-purple-400" />
        Create New Task
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-purple-200">Task Name</Label>
          <Input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="e.g., Beginner's Challenge"
            className="bg-slate-800 border-purple-500/30 text-white"
            data-testid="input-task-name"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-purple-200">Description (Optional)</Label>
          <Textarea
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Task description"
            className="bg-slate-800 border-purple-500/30 text-white"
            data-testid="textarea-task-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-purple-200">Duration</Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white" data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-purple-500/30">
                <SelectItem value="1">1 Min</SelectItem>
                <SelectItem value="3">3 Min</SelectItem>
                <SelectItem value="5">5 Min</SelectItem>
                <SelectItem value="10">10 Min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-purple-200">Bet Required ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={betRequirement}
              onChange={(e) => setBetRequirement(e.target.value)}
              placeholder="100.00"
              className="bg-slate-800 border-purple-500/30 text-white"
              data-testid="input-bet-requirement"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-purple-200">Reward ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={coinReward}
            onChange={(e) => setCoinReward(e.target.value)}
            placeholder="1.00"
            className="bg-slate-800 border-purple-500/30 text-white"
            data-testid="input-coin-reward"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-purple-500/20">
          <Label className="text-purple-200 mb-0">Active</Label>
          <Switch 
            checked={isActive} 
            onCheckedChange={setIsActive} 
            data-testid="switch-is-active" 
          />
        </div>

        <Button
          type="submit"
          disabled={createMutation.isPending || isCreating}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          data-testid="button-create-task"
        >
          {createMutation.isPending || isCreating ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </span>
          )}
        </Button>
      </form>
    </div>
  );
});

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [editingFrozenBalance, setEditingFrozenBalance] = useState(false);
  const [frozenBalanceValue, setFrozenBalanceValue] = useState("");
  const [manualResult, setManualResult] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [periodId, setPeriodId] = useState("");
  const [customResult, setCustomResult] = useState<number | null>(null);
  const [editingBetLimit, setEditingBetLimit] = useState<string | null>(null);
  const [betLimitValue, setBetLimitValue] = useState("");
  const [twoFAQrCode, setTwoFAQrCode] = useState<string | null>(null);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [settingUp2FA, setSettingUp2FA] = useState<string | null>(null);
  
  // Admin login 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [login2FAUserId, setLogin2FAUserId] = useState("");
  const [login2FACode, setLogin2FACode] = useState("");
  
  // New state for user search and password update
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingWithdrawalPassword, setEditingWithdrawalPassword] = useState<string | null>(null);
  const [newWithdrawalPassword, setNewWithdrawalPassword] = useState("");
  
  // New state for system settings
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [settingValue, setSettingValue] = useState("");
  const [settingDescription, setSettingDescription] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  
  // Local state for house profit percentage to avoid rapid API calls
  const [localProfitPercentage, setLocalProfitPercentage] = useState("");
  
  // Local state for betting fee percentage to avoid rapid API calls
  const [localFeePercentage, setLocalFeePercentage] = useState("");
  
  // Local state for referral bonus amount to avoid rapid API calls
  const [localReferralBonus, setLocalReferralBonus] = useState("");
  
  // Refs to track last saved values to prevent re-triggering on systemSettings updates
  const lastSavedProfitPercentage = useRef("");
  const lastSavedFeePercentage = useRef("");
  
  // New state for agent management
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [agentCommissionRate, setAgentCommissionRate] = useState("0.0500");
  const [editingAgentCommission, setEditingAgentCommission] = useState<string | null>(null);
  const [agentCommissionValue, setAgentCommissionValue] = useState("");

  // State for email functionality
  const [emailRecipientType, setEmailRecipientType] = useState("all");
  const [specificUserEmail, setSpecificUserEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailUserSearch, setEmailUserSearch] = useState("");
  const [editingAgentBalance, setEditingAgentBalance] = useState<string | null>(null);
  const [agentBalanceAdjustment, setAgentBalanceAdjustment] = useState("");
  
  // State for PWA notification functionality
  const [notificationRecipientType, setNotificationRecipientType] = useState("all");
  const [specificUserForNotification, setSpecificUserForNotification] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [notificationImageUrl, setNotificationImageUrl] = useState("");
  const [notificationUserSearch, setNotificationUserSearch] = useState("");
  
  // Telegram signals enabled state (3-minute)
  const [telegramSignalsEnabled, setTelegramSignalsEnabled] = useState(false);
  const [telegramSignalWinPercentage, setTelegramSignalWinPercentage] = useState('80');
  
  // Telegram 1-minute signals state (separate from 3-minute)
  const [telegram1minSignalsEnabled, setTelegram1minSignalsEnabled] = useState(false);
  const [telegram1minSignalChatId, setTelegram1minSignalChatId] = useState('');
  const [telegram1minSignalWinPercentage, setTelegram1minSignalWinPercentage] = useState('80');
  
  // Telegram notification toggles
  const [telegramWithdrawalNotificationsEnabled, setTelegramWithdrawalNotificationsEnabled] = useState(true);
  const [telegramLoginNotificationsEnabled, setTelegramLoginNotificationsEnabled] = useState(true);
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // New state for period scheduling and prediction
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [predictedPeriods, setPredictedPeriods] = useState<string[]>([]);
  const [predictedResults, setPredictedResults] = useState<{id?: string, periodId: string, result: number, timestamp: number}[]>([]);
  const [predictionBetAmount, setPredictionBetAmount] = useState("10");
  
  // New state for passkey management
  const [viewingPasskeys, setViewingPasskeys] = useState<User | null>(null);
  const [userPasskeys, setUserPasskeys] = useState<Passkey[]>([]);
  
  // New state for import/export functionality
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  
  // State for clear all data functionality
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  
  // State for deposit and withdrawal filters
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all');
  
  // State for expanded deposit/withdrawal rows
  const [expandedDeposits, setExpandedDeposits] = useState<Set<string>>(new Set());
  const [expandedWithdrawals, setExpandedWithdrawals] = useState<Set<string>>(new Set());
  
  // State for tracking which deposits are being approved (supports multiple concurrent approvals)
  const [approvingDepositIds, setApprovingDepositIds] = useState<Set<string>>(new Set());
  
  // IP History state
  const [viewingIpHistory, setViewingIpHistory] = useState<User | null>(null);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingIpHistory, setLoadingIpHistory] = useState(false);
  
  // Ban management state
  const [banningUser, setBanningUser] = useState<User | null>(null);
  
  // Commission award state
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionCoins, setCommissionCoins] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("1");
  const [banPermanent, setBanPermanent] = useState(false);
  
  // Country blocking state
  const [countryBlockingMode, setCountryBlockingMode] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [newCountryCode, setNewCountryCode] = useState("");
  
  // Telegram N1Panel settings state
  const [telegramApiKey, setTelegramApiKey] = useState("");
  const [telegramApiUrl, setTelegramApiUrl] = useState("https://n1panel.com/api/v2");
  const [telegramApiActive, setTelegramApiActive] = useState(false);
  const telegramSettingsInitialized = useRef(false);
  
  // Auto-reaction settings state
  const [autoReactionEnabled, setAutoReactionEnabled] = useState(false);
  const [reactionChannelId, setReactionChannelId] = useState("");
  const [reactionChannelUsername, setReactionChannelUsername] = useState("");
  const [reactionServiceId, setReactionServiceId] = useState("");
  const [reactionMinQuantity, setReactionMinQuantity] = useState("20");
  const [reactionMaxQuantity, setReactionMaxQuantity] = useState("50");
  
  // Telegram groups dialog state
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupTelegramId, setGroupTelegramId] = useState("");
  const [groupTelegramLink, setGroupTelegramLink] = useState("");
  const [groupServiceId, setGroupServiceId] = useState("");
  const [groupServiceName, setGroupServiceName] = useState("");
  const [groupAutoReact, setGroupAutoReact] = useState(false);
  const [groupReactionCount, setGroupReactionCount] = useState("100");
  const [groupReactionEmojis, setGroupReactionEmojis] = useState("👍,❤️,🔥");
  
  // Admin dashboard theme state
  const [adminTheme, setAdminTheme] = useState<string>(() => {
    return localStorage.getItem('admin-theme') || 'purple';
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin login form
  const adminLoginForm = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      // Clear cache and reload page for clean state
      queryClient.clear();
      window.location.reload();
    },
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (data: LoginUser) => {
      const res = await apiRequest('POST', '/api/admin/login', data);
      return res.json();
    },
    onSuccess: (data) => {
      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true);
        setLogin2FAUserId(data.userId);
        toast({
          title: "🔐 2FA Required",
          description: data.message || "Please enter your 2FA authentication code",
        });
        // Don't set user data yet, wait for 2FA verification
        return;
      }
      
      // Set user data if no 2FA required
      queryClient.setQueryData(["/api/auth/me"], data);
      
      if (data.role === "admin") {
        toast({
          title: "🔥 Admin Access Granted",
          description: `Welcome to the control center, ${data.email}!`,
        });
        // Re-fetch admin data
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/games/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/games/history'] });
      } else {
        toast({
          title: "⛔ Access Denied",
          description: "This account does not have admin privileges.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "🚫 Login Failed", 
        description: error.message || "Invalid admin credentials",
        variant: "destructive",
      });
    },
  });

  // 2FA verification mutation for admin login
  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/admin/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: login2FAUserId, token: code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "2FA verification failed");
      }
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      setRequires2FA(false);
      setLogin2FACode("");
      setLogin2FAUserId("");
      toast({
        title: "🔥 Admin Access Granted",
        description: `Welcome to the control center, ${user.email}!`,
      });
      // Re-fetch admin data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "2FA Verification Failed",
        description: error.message || "Invalid 2FA code",
        variant: "destructive",
      });
    },
  });

  // Check if user is admin
  const { data: currentUser, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });

  // Show admin login if not authenticated or not admin
  const showAdminLogin = !userLoading && (!currentUser || currentUser.role !== "admin");

  // Fetch users
  const { data: usersData } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?limit=10000', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000,
  });

  // Fetch user activity data for device tracking
  const { data: userActivityData } = useQuery<{ users: any[]; total: number }>({
    queryKey: ['/api/admin/user-activity'],
    enabled: currentUser?.role === "admin",
  });

  // Fetch analytics - with smooth updates to prevent UI flickering
  const { data: analytics } = useQuery<GameAnalytics>({
    queryKey: ['/api/admin/analytics'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 5000, // Refresh every 5 seconds for real-time profit calculation
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    staleTime: 4000, // Consider data stale after 4 seconds
  });

  // Fetch payment statistics
  const { data: paymentStats } = useQuery<PaymentStatistics>({
    queryKey: ['/api/admin/payment-statistics'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch active games - with smooth updates to prevent UI flickering
  const { data: activeGames } = useQuery<Game[]>({
    queryKey: ['/api/admin/games/active'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 5000, // Refresh every 5 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    staleTime: 4000, // Consider data stale after 4 seconds
  });

  // Fetch game history - with smooth updates to prevent UI flickering
  const { data: gameHistory, refetch: refetchGameHistory, isLoading: gameHistoryLoading } = useQuery<Game[]>({
    queryKey: ['/api/admin/games/history'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 5000, // Auto-refresh every 5 seconds for live updates
    placeholderData: (previousData) => previousData, // Keep previous data while fetching to prevent flickering
    staleTime: 4000, // Consider data stale after 4 seconds
  });

  // Fetch user country statistics
  const { data: countryStats, isLoading: countryStatsLoading } = useQuery<Array<{ countryCode: string; count: number }>>({
    queryKey: ['/api/admin/users/country-stats'],
    enabled: currentUser?.role === "admin",
  });

  // Fetch predicted results from API
  const { data: predictedResultsData = [] } = useQuery<{id: string, periodId: string, result: number, createdAt: string}[]>({
    queryKey: ['/api/admin/predicted-results'],
    enabled: currentUser?.role === "admin",
  });

  // Update local state when data changes
  useEffect(() => {
    if (predictedResultsData && predictedResultsData.length > 0) {
      setPredictedResults(predictedResultsData.map(p => ({
        id: p.id,
        periodId: p.periodId,
        result: p.result,
        timestamp: new Date(p.createdAt).getTime()
      })));
    } else {
      setPredictedResults([]);
    }
  }, [predictedResultsData]);

  // Fetch Telegram N1Panel settings
  const { data: telegramReactionSettings } = useQuery<{
    id: string;
    apiKey: string;
    apiUrl: string;
    isActive: boolean;
  } | null>({
    queryKey: ['/api/admin/telegram-reactions/settings'],
    enabled: currentUser?.role === "admin",
  });

  // Fetch Telegram groups
  const { data: telegramGroups = [], isLoading: isLoadingGroups, error: groupsError } = useQuery<any[]>({
    queryKey: ['/api/admin/telegram-reactions/groups'],
    enabled: currentUser?.role === "admin",
  });

  // Fetch N1Panel orders
  const { data: n1panelOrdersData, isLoading: isLoadingOrders } = useQuery<{ orders: any[] }>({
    queryKey: ['/api/admin/n1panel-orders'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000,
  });

  // Fetch N1Panel balance
  const { data: n1panelBalance, isLoading: isLoadingBalance } = useQuery<{ balance?: string; currency?: string; error?: string }>({
    queryKey: ['/api/admin/telegram-reactions/balance'],
    enabled: currentUser?.role === "admin" && telegramApiActive,
    retry: false,
  });

  // Fetch N1Panel services
  const { data: n1panelServices = [], isLoading: isLoadingServices } = useQuery<any[]>({
    queryKey: ['/api/admin/telegram-reactions/services'],
    enabled: currentUser?.role === "admin" && telegramApiActive,
    retry: false,
  });

  // Fetch auto-reaction settings
  const { data: autoReactionSettings } = useQuery<{
    enabled: boolean;
    channelId: string;
    channelUsername: string;
    serviceId: string;
    minQuantity: string;
    maxQuantity: string;
  }>({
    queryKey: ['/api/admin/n1panel-auto-reaction/settings'],
    enabled: currentUser?.role === "admin",
  });

  // Update local state when telegram settings data first loads
  useEffect(() => {
    if (telegramReactionSettings && !telegramSettingsInitialized.current) {
      setTelegramApiKey(telegramReactionSettings.apiKey);
      setTelegramApiUrl(telegramReactionSettings.apiUrl);
      setTelegramApiActive(telegramReactionSettings.isActive);
      telegramSettingsInitialized.current = true;
    }
  }, [telegramReactionSettings]);

  // Update auto-reaction state when settings load
  useEffect(() => {
    if (autoReactionSettings) {
      setAutoReactionEnabled(autoReactionSettings.enabled);
      setReactionChannelId(autoReactionSettings.channelId);
      setReactionChannelUsername(autoReactionSettings.channelUsername);
      setReactionServiceId(autoReactionSettings.serviceId);
      setReactionMinQuantity(autoReactionSettings.minQuantity);
      setReactionMaxQuantity(autoReactionSettings.maxQuantity);
    }
  }, [autoReactionSettings]);

  // Apply admin theme
  useEffect(() => {
    const themeClasses = ['admin-theme-purple', 'admin-theme-ocean', 'admin-theme-emerald', 'admin-theme-sunset', 'admin-theme-midnight', 'admin-theme-royal', 'admin-theme-crimson'];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add(`admin-theme-${adminTheme}`);
    localStorage.setItem('admin-theme', adminTheme);
  }, [adminTheme]);

  // Save predicted result mutation
  const savePredictionMutation = useMutation({
    mutationFn: async ({ periodId, result }: { periodId: string; result: number }) => {
      const res = await apiRequest('POST', '/api/admin/predicted-results', {
        periodId,
        result,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/predicted-results'] });
      toast({
        title: "✅ Prediction Saved",
        description: "Your prediction has been saved to the database.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: `Failed to save prediction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete predicted result mutation
  const deletePredictionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/admin/predicted-results/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/predicted-results'] });
      toast({
        title: "🗑️ Prediction Deleted",
        description: "Your prediction has been removed from the database.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: `Failed to delete prediction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Save Telegram N1Panel settings mutation
  const saveTelegramSettingsMutation = useMutation({
    mutationFn: async (data: { apiKey: string; apiUrl: string; isActive: boolean }) => {
      const res = await apiRequest('POST', '/api/admin/telegram-reactions/settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram-reactions/settings'] });
      toast({
        title: "✅ Settings Saved",
        description: "Telegram N1Panel settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save Telegram settings",
        variant: "destructive",
      });
    },
  });

  // Create/Update Telegram group mutation
  const saveGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingGroup 
        ? `/api/admin/telegram-reactions/groups/${editingGroup.id}`
        : '/api/admin/telegram-reactions/groups';
      const method = editingGroup ? 'PUT' : 'POST';
      const res = await apiRequest(method, url, {
        name: data.name,
        telegramId: data.telegramId,
        telegramLink: data.telegramLink || null,
        serviceId: parseInt(data.serviceId),
        serviceName: data.serviceName || null,
        autoReactEnabled: data.autoReact,
        reactionCount: parseInt(data.reactionCount),
        reactionEmojis: data.reactionEmojis.split(',').map((e: string) => e.trim()).filter((e: string) => e),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram-reactions/groups'] });
      setShowAddGroupDialog(false);
      setEditingGroup(null);
      setGroupName("");
      setGroupTelegramId("");
      setGroupTelegramLink("");
      setGroupServiceId("");
      setGroupServiceName("");
      setGroupAutoReact(false);
      setGroupReactionCount("100");
      setGroupReactionEmojis("👍,❤️,🔥");
      toast({
        title: "✅ Group Saved",
        description: `Telegram group has been ${editingGroup ? 'updated' : 'added'} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save group",
        variant: "destructive",
      });
    },
  });

  // Delete Telegram group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/telegram-reactions/groups/${groupId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/telegram-reactions/groups'] });
      toast({
        title: "🗑️ Group Deleted",
        description: "Telegram group has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  // Save auto-reaction settings mutation
  const saveAutoReactionMutation = useMutation({
    mutationFn: async (data: {
      enabled: boolean;
      channelId: string;
      channelUsername: string;
      serviceId: string;
      minQuantity: string;
      maxQuantity: string;
    }) => {
      const res = await apiRequest('POST', '/api/admin/n1panel-auto-reaction/settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/n1panel-auto-reaction/settings'] });
      toast({
        title: "✅ Auto-Reaction Settings Saved",
        description: "Auto-reaction configuration has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save auto-reaction settings",
        variant: "destructive",
      });
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "✅ User Status Updated",
        description: "User account status has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Adjust balance mutation
  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/adjust-balance`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingBalance(false);
      setBalanceAdjustment("");
      toast({
        title: "💰 Balance Adjusted",
        description: "User balance has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to adjust balance",
        variant: "destructive",
      });
    },
  });

  // Unfreeze balance mutation
  const unfreezeBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/unfreeze-balance`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingFrozenBalance(false);
      setFrozenBalanceValue("");
      toast({
        title: "🔓 Balance Unfrozen",
        description: "User frozen balance has been reduced successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to unfreeze balance",
        variant: "destructive",
      });
    },
  });

  // Award commission mutation
  const awardCommissionMutation = useMutation({
    mutationFn: async ({ userId, coins }: { userId: string; coins: number }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/award-commission`, { coins });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingCommission(false);
      setCommissionCoins("");
      const usdAmount = (variables.coins / 100).toFixed(2);
      toast({
        title: "🎁 Commission Awarded",
        description: `${variables.coins} coins ($${usdAmount}) awarded successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to award commission",
        variant: "destructive",
      });
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason, bannedUntil }: { userId: string; reason: string; bannedUntil?: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/ban`, { reason, bannedUntil });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setBanningUser(null);
      setBanReason("");
      setBanDuration("1");
      setBanPermanent(false);
      toast({
        title: "🚫 User Banned",
        description: "User has been banned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/unban`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "✅ User Unbanned",
        description: "User has been unbanned successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to unban user",
        variant: "destructive",
      });
    },
  });

  // Toggle wingo mode mutation
  const toggleWingoModeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/toggle-wingo-mode`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-search'] });
      toast({
        title: data.wingoMode ? "🎮 Wingo Mode Enabled" : "🎮 Wingo Mode Disabled",
        description: data.wingoMode 
          ? "User will now see only Win Go game interface." 
          : "User will see all games normally.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to toggle wingo mode",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "🗑️ User Deleted",
        description: "User has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Promote user to agent mutation
  const promoteToAgentMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/promote-to-agent`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      toast({
        title: "✅ User Promoted to Agent",
        description: "User has been successfully promoted to agent and can now login via /agent-login.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to promote user to agent",
        variant: "destructive",
      });
    },
  });

  // Set manual game result mutation
  const setManualResultMutation = useMutation({
    mutationFn: async ({ gameId, result, betAmount }: { gameId: string; result: number; betAmount?: number }) => {
      const res = await apiRequest('POST', `/api/admin/games/${gameId}/manual-result`, { result, betAmount });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/active'] });
      setManualResult(null);
      setCustomResult(null);
      setPeriodId("");
      
      // Show success message with bet status if applicable
      if (data.betStatus === 'success') {
        toast({
          title: "✅ Result Scheduled & Bet Placed",
          description: "Result will appear when the timer ends. Your bet has been placed successfully.",
        });
      } else if (data.betStatus === 'failed') {
        toast({
          title: "⚠️ Result Scheduled (Bet Failed)",
          description: `Result will appear when timer ends. Bet failed: ${data.betError || 'Unknown error'}`,
        });
      } else {
        toast({
          title: "⏰ Result Scheduled Successfully",
          description: "Result will appear when the timer naturally ends, not instantly.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to set manual result",
        variant: "destructive",
      });
    },
  });

  // Cancel game mutation
  const cancelGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const res = await apiRequest('POST', `/api/admin/games/${gameId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/history'] });
      toast({
        title: "🚫 Game Cancelled",
        description: "Game has been cancelled and all bets refunded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to cancel game",
        variant: "destructive",
      });
    },
  });

  // Complete game mutation
  const completeGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const res = await apiRequest('POST', `/api/admin/games/${gameId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games/history'] });
      toast({
        title: "✅ Game Completed",
        description: "Game has been completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to complete game",
        variant: "destructive",
      });
    },
  });

  // Update bet limit mutation
  const updateBetLimitMutation = useMutation({
    mutationFn: async ({ userId, limit }: { userId: string; limit: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/bet-limit`, { maxBetLimit: limit });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingBetLimit(null);
      setBetLimitValue("");
      toast({
        title: "🎲 Bet Limit Updated",
        description: "User betting limit has been adjusted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update bet limit",
        variant: "destructive",
      });
    },
  });

  // 2FA setup mutation
  const setup2FAMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', '/api/2fa/setup', { userId });
      return res.json();
    },
    onSuccess: (data) => {
      setTwoFAQrCode(data.qrCode);
      setSettingUp2FA(currentUser?.id || null);
      toast({
        title: "🔐 2FA Setup Ready",
        description: "Scan the QR code with Google Authenticator.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to setup 2FA",
        variant: "destructive",
      });
    },
  });

  // 2FA verify mutation for user setup
  const verifyUser2FAMutation = useMutation({
    mutationFn: async ({ userId, token }: { userId: string; token: string }) => {
      const res = await apiRequest('POST', '/api/2fa/verify', { userId, token });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setTwoFAQrCode(null);
      setTwoFASecret(null);
      setTwoFAToken("");
      setSettingUp2FA(null);
      toast({
        title: "✅ 2FA Enabled",
        description: "Two-factor authentication has been enabled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to verify 2FA token",
        variant: "destructive",
      });
    },
  });

  // 2FA disable mutation
  const disable2FAMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', '/api/2fa/disable', { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "🔓 2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    },
  });

  // User search query
  const { data: searchResults, refetch: searchUsers } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['/api/admin/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], total: 0 };
      const res = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: false, // Only run when triggered
  });

  // System settings query
  const { data: systemSettings } = useQuery<SystemSetting[]>({
    queryKey: ['/api/admin/settings'],
    enabled: currentUser?.role === "admin",
  });

  // Agents query
  const { data: agentsData } = useQuery<{ agents: Agent[]; total: number }>({
    queryKey: ['/api/admin/agents'],
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // User passkeys query
  const { data: passkeysData, refetch: refetchUserPasskeys } = useQuery<Passkey[]>({
    queryKey: ['/api/admin/users', viewingPasskeys?.id, 'passkeys'],
    queryFn: async () => {
      if (!viewingPasskeys?.id) return [];
      const res = await apiRequest('GET', `/api/admin/users/${viewingPasskeys.id}/passkeys`);
      return res.json();
    },
    enabled: !!viewingPasskeys?.id && currentUser?.role === "admin",
  });

  // Deposits query
  const { data: depositsData } = useQuery<AdminDepositResponse>({
    queryKey: ['/api/admin/deposits', depositFilter],
    queryFn: async () => {
      const statusParam = depositFilter && depositFilter !== 'all' ? `?status=${depositFilter}` : '';
      const res = await apiRequest('GET', `/api/admin/deposits${statusParam}`);
      return res.json();
    },
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Approve crypto deposit mutation
  const approveCryptoDepositMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      setApprovingDepositIds(prev => new Set(prev).add(transactionId));
      const res = await apiRequest('POST', `/api/admin/crypto-deposits/${transactionId}/approve`);
      return { transactionId, ...await res.json() };
    },
    onSuccess: (data) => {
      setApprovingDepositIds(prev => {
        const next = new Set(prev);
        next.delete(data.transactionId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
      toast({
        title: "✅ Deposit Approved",
        description: "Crypto deposit approved and user balance updated successfully.",
      });
    },
    onError: (error: any, transactionId: string) => {
      setApprovingDepositIds(prev => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
      toast({
        title: "❌ Approval Failed",
        description: error.message || "Failed to approve deposit. It may not be finished on payment gateway yet.",
        variant: "destructive",
      });
    },
  });

  // Withdrawals query
  const { data: withdrawalsData } = useQuery<{ withdrawals: AdminWithdrawalRequest[]; total: number; page: number; totalPages: number }>({
    queryKey: ['/api/admin/withdrawals', withdrawalFilter],
    queryFn: async () => {
      const statusParam = withdrawalFilter && withdrawalFilter !== 'all' ? `?status=${withdrawalFilter}` : '';
      const res = await apiRequest('GET', `/api/admin/withdrawals${statusParam}`);
      return res.json();
    },
    enabled: currentUser?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Country blocking query
  const { data: countryBlockingData } = useQuery<{ blockedCountries: string[]; allowedCountries: string[]; mode: string }>({
    queryKey: ['/api/admin/country-blocking'],
    enabled: currentUser?.role === "admin",
  });

  // Update local state when country blocking data changes
  useEffect(() => {
    if (countryBlockingData) {
      setBlockedCountries(countryBlockingData.blockedCountries || []);
      setAllowedCountries(countryBlockingData.allowedCountries || []);
      setCountryBlockingMode(countryBlockingData.mode as 'blacklist' | 'whitelist' || 'blacklist');
    }
  }, [countryBlockingData]);

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/update-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      setEditingPassword(null);
      setNewPassword("");
      toast({
        title: "🔐 Password Updated",
        description: "User password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  // Withdrawal password update mutation
  const updateWithdrawalPasswordMutation = useMutation({
    mutationFn: async ({ userId, newWithdrawalPassword }: { userId: string; newWithdrawalPassword: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/update-withdrawal-password`, { newWithdrawalPassword });
      return res.json();
    },
    onSuccess: () => {
      setEditingWithdrawalPassword(null);
      setNewWithdrawalPassword("");
      toast({
        title: "🔐 Withdrawal Password Updated",
        description: "User withdrawal password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update withdrawal password",
        variant: "destructive",
      });
    },
  });

  // System settings update mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description, isEncrypted }: { key: string; value: string; description?: string; isEncrypted?: boolean }) => {
      const res = await apiRequest('PUT', `/api/admin/settings/${key}`, { 
        value, 
        description,
        isEncrypted: isEncrypted || false
      });
      return res.json();
    },
    onSuccess: () => {
      // Force a refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ['/api/admin/settings'] });
      // Also invalidate public settings cache for frontend updates
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings/public'] });
      setEditingSetting(null);
      setSettingValue("");
      setSettingDescription("");
      setIsEncrypted(false);
      toast({
        title: "⚙️ Setting Updated",
        description: "System setting has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  // System settings delete mutation
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest('DELETE', `/api/admin/settings/${key}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "🗑️ Setting Deleted",
        description: "System setting has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete setting",
        variant: "destructive",
      });
    },
  });

  // Country blocking update mutation
  const updateCountryBlockingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/admin/country-blocking', {
        blockedCountries,
        allowedCountries,
        mode: countryBlockingMode
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/country-blocking'] });
      toast({
        title: "🌍 Country Blocking Updated",
        description: "Country blocking settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update country blocking",
        variant: "destructive",
      });
    },
  });

  // Agent mutations
  const createAgentMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; commissionRate?: string }) => {
      const res = await apiRequest('POST', '/api/admin/agents', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      setCreatingAgent(false);
      setAgentEmail("");
      setAgentPassword("");
      setAgentCommissionRate("0.0500");
      toast({
        title: "🤖 Agent Created",
        description: "New agent has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  const toggleAgentStatusMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest('POST', `/api/admin/agents/${agentId}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      toast({
        title: "🔄 Agent Status Updated",
        description: "Agent status has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update agent status",
        variant: "destructive",
      });
    },
  });

  const updateAgentCommissionMutation = useMutation({
    mutationFn: async ({ agentId, commissionRate }: { agentId: string; commissionRate: string }) => {
      const res = await apiRequest('PUT', `/api/admin/agents/${agentId}/commission`, { commissionRate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      setEditingAgentCommission(null);
      setAgentCommissionValue("");
      toast({
        title: "💰 Commission Updated",
        description: "Agent commission rate has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update commission rate",
        variant: "destructive",
      });
    },
  });

  const adjustAgentBalanceMutation = useMutation({
    mutationFn: async ({ agentId, amount }: { agentId: string; amount: string }) => {
      const res = await apiRequest('POST', `/api/admin/agents/${agentId}/adjust-balance`, { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents'] });
      setEditingAgentBalance(null);
      setAgentBalanceAdjustment("");
      setSelectedAgent(null);
      toast({
        title: "💰 Agent Balance Adjusted",
        description: "Agent earnings balance has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to adjust agent balance",
        variant: "destructive",
      });
    },
  });

  // Delete passkey mutation
  const deletePasskeyMutation = useMutation({
    mutationFn: async (passkeyId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/passkeys/${passkeyId}`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchUserPasskeys();
      toast({
        title: "🔐 Passkey Deleted",
        description: `Passkey "${data.deletedPasskey.deviceName}" has been removed successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete passkey",
        variant: "destructive",
      });
    },
  });

  // Process withdrawal mutation
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ transactionId, action, adminNote }: { transactionId: string; action: 'approve' | 'reject'; adminNote?: string }) => {
      const res = await apiRequest('POST', `/api/admin/withdrawals/${transactionId}/process`, { action, adminNote });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      toast({
        title: data.action === 'approve' ? "✅ Withdrawal Approved" : "❌ Withdrawal Rejected",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    },
  });

  // Fetch IP history for a user
  const fetchIpHistory = async (user: User) => {
    setViewingIpHistory(user);
    setLoadingIpHistory(true);
    try {
      const res = await apiRequest('GET', `/api/admin/users/${user.id}/sessions`);
      const sessions = await res.json();
      setUserSessions(sessions || []);
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to load IP history",
        variant: "destructive",
      });
      setUserSessions([]);
    } finally {
      setLoadingIpHistory(false);
    }
  };

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/admin/export');
      return res;
    },
    onSuccess: async (response) => {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `complete-database-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExporting(false);
      
      const stats = data.data?.stats;
      const totalTables = 23;
      const totalRecords = stats ? Object.values(stats).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0) : 0;
      
      toast({
        title: "✅ Complete Backup Successful!",
        description: `All ${totalTables} tables backed up. Total records ${totalRecords.toLocaleString()}. All data is safe!`,
      });
    },
    onError: (error: any) => {
      setIsExporting(false);
      toast({
        title: "❌ Export Failed",
        description: error.message || "Failed to export user data",
        variant: "destructive",
      });
    },
  });

  // Import data mutation
  const importDataMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/import', data);
      return res.json();
    },
    onSuccess: (data) => {
      // Refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games'] });
      setIsImporting(false);
      setImportFile(null);
      setClearBeforeImport(false);
      
      // Build detailed success message with new users and skipped users
      const details = [];
      if (data.newUsersCount > 0) details.push(`${data.newUsersCount} new users created`);
      if (data.skippedCount > 0) details.push(`${data.skippedCount} existing users skipped`);
      if (data.gamesImported > 0) details.push(`${data.gamesImported} games`);
      if (data.betsImported > 0) details.push(`${data.betsImported} bets`);
      if (data.referralsImported > 0) details.push(`${data.referralsImported} referrals`);
      if (data.agentProfilesImported > 0) details.push(`${data.agentProfilesImported} agents`);
      if (data.withdrawalRequestsImported > 0) details.push(`${data.withdrawalRequestsImported} withdrawals`);
      
      let description = `Successfully imported: ${details.join(', ')}`;
      if (data.clearedDemoData) {
        description = `✅ Demo data cleared. ${description}`;
      }
      if (data.errors && data.errors.length > 0) {
        description += `. ⚠️ ${data.errors.length} errors occurred during import.`;
      }
      
      toast({
        title: "✅ Import Complete",
        description,
        duration: 8000,
      });
    },
    onError: (error: any) => {
      setIsImporting(false);
      toast({
        title: "❌ Import Failed",
        description: error.message || "Failed to import user data. Please check the file format and try again.",
        variant: "destructive",
      });
    },
  });

  // Clear all data mutation
  const clearAllDataMutation = useMutation({
    mutationFn: async ({ securityCode, twoFactorCode }: { securityCode: string; twoFactorCode?: string }) => {
      const res = await apiRequest('POST', '/api/admin/clear-all-data', { securityCode, twoFactorCode });
      return res.json();
    },
    onSuccess: (data) => {
      // Refresh all queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-activity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
      setIsClearing(false);
      setShowClearDataDialog(false);
      setSecurityCode('');
      setTwoFactorCode('');
      toast({
        title: "🗑️ Data Cleared",
        description: `Successfully cleared ${data.totalUsersCleared || 0} users and all related data.`,
      });
    },
    onError: (error: any) => {
      setIsClearing(false);
      toast({
        title: "❌ Clear Failed",
        description: error.message || "Failed to clear data. Check your security code and 2FA code.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for import/export
  const handleExportData = () => {
    setIsExporting(true);
    exportDataMutation.mutate();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
    } else {
      toast({
        title: "❌ Invalid File",
        description: "Please select a valid JSON file.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast({
        title: "❌ No File Selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      const data = JSON.parse(fileContent);
      // Add clearBeforeImport flag to the data
      data.clearBeforeImport = clearBeforeImport;
      importDataMutation.mutate(data);
    } catch (error) {
      setIsImporting(false);
      toast({
        title: "❌ Invalid File Format",
        description: "The selected file contains invalid JSON data.",
        variant: "destructive",
      });
    }
  };

  // Handler for clearing all data
  const handleClearAllData = () => {
    if (!securityCode) {
      toast({
        title: "❌ Security Code Required",
        description: "Please enter a valid security code to clear all data.",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    clearAllDataMutation.mutate({ securityCode, twoFactorCode });
  };

  // Helper function to get IP status badge color
  const getIpStatusColor = (users: User[], currentUser: User) => {
    if (!currentUser.registrationIp && !currentUser.lastLoginIp) return "secondary";
    
    const duplicateUsers = users.filter(u => 
      u.id !== currentUser.id && 
      (u.registrationIp === currentUser.registrationIp || 
       u.lastLoginIp === currentUser.lastLoginIp ||
       u.registrationIp === currentUser.lastLoginIp ||
       u.lastLoginIp === currentUser.registrationIp)
    );
    
    return duplicateUsers.length > 0 ? "destructive" : "default";
  };

  // Helper function to convert country code to flag emoji
  const getCountryFlag = (countryCode: string): string => {
    if (!countryCode || countryCode === 'Unknown') return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Helper function to get country name from code
  const getCountryName = (countryCode: string): string => {
    const countryNames: Record<string, string> = {
      'LK': 'Sri Lanka',
      'IN': 'India',
      'US': 'United States',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'CA': 'Canada',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'PK': 'Pakistan',
      'BD': 'Bangladesh',
      'AE': 'UAE',
      'SA': 'Saudi Arabia',
    };
    return countryNames[countryCode] || countryCode;
  };

  // Helper function to detect IP address type
  const detectIpType = (ipAddress: string | null | undefined): 'ipv4' | 'ipv6' | 'unknown' => {
    if (!ipAddress) return 'unknown';
    
    const trimmedIp = ipAddress.trim();
    
    // Check for empty, N/A, or Unknown values
    if (!trimmedIp || trimmedIp === 'N/A' || trimmedIp.toLowerCase() === 'unknown') {
      return 'unknown';
    }
    
    // IPv4 detection - standard dotted decimal notation
    // Also validates that each octet is 0-255
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(trimmedIp)) {
      return 'ipv4';
    }
    
    // IPv6 detection - checks for colon-separated hexadecimal groups
    // Handles standard IPv6, compressed notation (::), and IPv6-mapped IPv4 (::ffff:x.x.x.x)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    // Simple heuristic: if it contains colons and looks like IPv6
    if (trimmedIp.includes(':') && (ipv6Regex.test(trimmedIp) || trimmedIp.split(':').length >= 3)) {
      return 'ipv6';
    }
    
    return 'unknown';
  };

  // Helper function to find duplicate IP users
  const getDuplicateIpUsers = (users: User[], targetUser: User) => {
    return users.filter(u => 
      u.id !== targetUser.id && 
      (u.registrationIp === targetUser.registrationIp || 
       u.lastLoginIp === targetUser.lastLoginIp ||
       u.registrationIp === targetUser.lastLoginIp ||
       u.lastLoginIp === targetUser.registrationIp)
    );
  };

  // Helper function to download user report as PDF
  const handleDownloadUserReport = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/admin/user-report/${userId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `user-report-${userEmail}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "📄 Report Downloaded",
        description: `User report for ${userEmail} has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "❌ Download Failed",
        description: "Failed to download user report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Initialize local profit percentage from system settings (only when empty)
  useEffect(() => {
    if (systemSettings && (!localProfitPercentage || localProfitPercentage === '')) {
      const profitSetting = systemSettings.find(s => s.key === 'house_profit_percentage');
      if (profitSetting && profitSetting.value !== lastSavedProfitPercentage.current) {
        setLocalProfitPercentage(profitSetting.value);
        lastSavedProfitPercentage.current = profitSetting.value;
      }
    }
  }, [systemSettings, localProfitPercentage]);

  // Debounced update for house profit percentage
  useEffect(() => {
    // Only trigger update if we have a valid local value and it differs from the last saved value
    if (localProfitPercentage && 
        localProfitPercentage !== '' && 
        localProfitPercentage !== lastSavedProfitPercentage.current) {
      
      const timer = setTimeout(() => {
        const value = parseInt(localProfitPercentage);
        if (value >= 1 && value <= 100 && !updateSettingMutation.isPending) {
          // Update ref immediately before mutation to prevent re-triggering
          lastSavedProfitPercentage.current = localProfitPercentage;
          updateSettingMutation.mutate({
            key: 'house_profit_percentage',
            value: localProfitPercentage,
            description: 'Percentage of total bets that should result in house profit'
          });
        }
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(timer);
    }
  }, [localProfitPercentage]);

  // Initialize local fee percentage from system settings (only when empty)
  useEffect(() => {
    if (systemSettings && (!localFeePercentage || localFeePercentage === '')) {
      const feeSetting = systemSettings.find(s => s.key === 'betting_fee_percentage');
      if (feeSetting && feeSetting.value !== lastSavedFeePercentage.current) {
        setLocalFeePercentage(feeSetting.value);
        lastSavedFeePercentage.current = feeSetting.value;
      }
    }
  }, [systemSettings, localFeePercentage]);

  // Debounced update for betting fee percentage
  useEffect(() => {
    // Only trigger update if we have a valid local value and it differs from the last saved value
    if (localFeePercentage && 
        localFeePercentage !== '' && 
        localFeePercentage !== lastSavedFeePercentage.current) {
      
      const timer = setTimeout(() => {
        const value = parseFloat(localFeePercentage);
        if (value >= 0 && value <= 20 && !updateSettingMutation.isPending) {
          // Update ref immediately before mutation to prevent re-triggering
          lastSavedFeePercentage.current = localFeePercentage;
          updateSettingMutation.mutate({
            key: 'betting_fee_percentage',
            value: localFeePercentage,
            description: 'Fee percentage deducted from winnings on every bet'
          });
        }
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(timer);
    }
  }, [localFeePercentage]);

  // Initialize telegram signals enabled state from system settings
  useEffect(() => {
    if (systemSettings) {
      // 3-minute signals settings
      const signalsSetting = systemSettings.find(s => s.key === 'telegram_signals_enabled');
      setTelegramSignalsEnabled(signalsSetting?.value === 'true');
      
      const signalWinPercentageSetting = systemSettings.find(s => s.key === 'telegram_signal_win_percentage');
      if (signalWinPercentageSetting?.value) {
        setTelegramSignalWinPercentage(signalWinPercentageSetting.value);
      }
      
      // 1-minute signals settings (separate from 3-minute)
      const signals1minSetting = systemSettings.find(s => s.key === 'telegram_1min_signals_enabled');
      setTelegram1minSignalsEnabled(signals1minSetting?.value === 'true');
      
      const signal1minChatIdSetting = systemSettings.find(s => s.key === 'telegram_1min_signal_chat_id');
      if (signal1minChatIdSetting?.value) {
        setTelegram1minSignalChatId(signal1minChatIdSetting.value);
      }
      
      const signal1minWinPercentageSetting = systemSettings.find(s => s.key === 'telegram_1min_signal_win_percentage');
      if (signal1minWinPercentageSetting?.value) {
        setTelegram1minSignalWinPercentage(signal1minWinPercentageSetting.value);
      }
      
      const withdrawalNotifSetting = systemSettings.find(s => s.key === 'telegram_withdrawal_notifications_enabled');
      setTelegramWithdrawalNotificationsEnabled(withdrawalNotifSetting?.value !== 'false');
      
      const loginNotifSetting = systemSettings.find(s => s.key === 'telegram_login_notifications_enabled');
      setTelegramLoginNotificationsEnabled(loginNotifSetting?.value !== 'false');
    }
  }, [systemSettings]);

  // Toggle handler for telegram signals
  const handleToggleTelegramSignals = () => {
    const newValue = !telegramSignalsEnabled;
    setTelegramSignalsEnabled(newValue);
    updateSettingMutation.mutate({
      key: 'telegram_signals_enabled',
      value: newValue ? 'true' : 'false',
      description: 'Enable/Disable automatic Telegram signals for game periods'
    });
  };

  // Debounced update for signal win percentage
  useEffect(() => {
    if (telegramSignalWinPercentage && telegramSignalWinPercentage !== '') {
      const timer = setTimeout(() => {
        const value = parseFloat(telegramSignalWinPercentage);
        if (value >= 0 && value <= 100 && !updateSettingMutation.isPending) {
          updateSettingMutation.mutate({
            key: 'telegram_signal_win_percentage',
            value: telegramSignalWinPercentage,
            description: 'Win percentage for Telegram signals when users bet on signal color (0-100%)'
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [telegramSignalWinPercentage]);

  // Toggle handler for 1-minute telegram signals
  const handleToggle1minTelegramSignals = () => {
    const newValue = !telegram1minSignalsEnabled;
    setTelegram1minSignalsEnabled(newValue);
    updateSettingMutation.mutate({
      key: 'telegram_1min_signals_enabled',
      value: newValue ? 'true' : 'false',
      description: 'Enable/Disable automatic Telegram signals for 1-minute game periods'
    });
  };

  // Debounced update for 1-minute signal chat ID
  useEffect(() => {
    if (telegram1minSignalChatId !== '') {
      const timer = setTimeout(() => {
        if (!updateSettingMutation.isPending) {
          updateSettingMutation.mutate({
            key: 'telegram_1min_signal_chat_id',
            value: telegram1minSignalChatId,
            description: 'Telegram channel/group ID for 1-minute game signals'
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [telegram1minSignalChatId]);

  // Debounced update for 1-minute signal win percentage
  useEffect(() => {
    if (telegram1minSignalWinPercentage && telegram1minSignalWinPercentage !== '') {
      const timer = setTimeout(() => {
        const value = parseFloat(telegram1minSignalWinPercentage);
        if (value >= 0 && value <= 100 && !updateSettingMutation.isPending) {
          updateSettingMutation.mutate({
            key: 'telegram_1min_signal_win_percentage',
            value: telegram1minSignalWinPercentage,
            description: 'Win percentage for 1-minute Telegram signals when users bet on signal color (0-100%)'
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [telegram1minSignalWinPercentage]);

  // Toggle handler for withdrawal notifications
  const handleToggleWithdrawalNotifications = () => {
    const previousValue = telegramWithdrawalNotificationsEnabled;
    const newValue = !telegramWithdrawalNotificationsEnabled;
    setTelegramWithdrawalNotificationsEnabled(newValue);
    
    updateSettingMutation.mutate(
      {
        key: 'telegram_withdrawal_notifications_enabled',
        value: newValue ? 'true' : 'false',
        description: 'Enable/Disable Telegram notifications for withdrawal requests'
      },
      {
        onError: () => {
          // Rollback on error
          setTelegramWithdrawalNotificationsEnabled(previousValue);
          toast({
            title: "Error",
            description: "Failed to update withdrawal notification settings",
            variant: "destructive"
          });
        },
        onSuccess: async () => {
          // Invalidate system settings query to refresh cache
          await queryClient.invalidateQueries({ queryKey: ['/api/admin/system-settings'] });
          toast({
            title: "Success",
            description: `Withdrawal notifications ${newValue ? 'enabled' : 'disabled'}`
          });
        }
      }
    );
  };

  // Toggle handler for login notifications
  const handleToggleLoginNotifications = () => {
    const previousValue = telegramLoginNotificationsEnabled;
    const newValue = !telegramLoginNotificationsEnabled;
    setTelegramLoginNotificationsEnabled(newValue);
    
    updateSettingMutation.mutate(
      {
        key: 'telegram_login_notifications_enabled',
        value: newValue ? 'true' : 'false',
        description: 'Enable/Disable Telegram notifications for admin logins'
      },
      {
        onError: () => {
          // Rollback on error
          setTelegramLoginNotificationsEnabled(previousValue);
          toast({
            title: "Error",
            description: "Failed to update login notification settings",
            variant: "destructive"
          });
        },
        onSuccess: async () => {
          // Invalidate system settings query to refresh cache
          await queryClient.invalidateQueries({ queryKey: ['/api/admin/system-settings'] });
          toast({
            title: "Success",
            description: `Login notifications ${newValue ? 'enabled' : 'disabled'}`
          });
        }
      }
    );
  };

  // Initialize local referral bonus from system settings
  useEffect(() => {
    if (systemSettings) {
      const bonusSetting = systemSettings.find(s => s.key === 'referral_bonus_amount');
      if (bonusSetting) {
        // Convert USD to coins for display (1 USD = 100 coins)
        const usdValue = parseFloat(bonusSetting.value);
        const coinsValue = Math.round(usdValue * 100);
        // Sync with system setting if local state is empty or if the numerical values differ
        if (!localReferralBonus || localReferralBonus === '' || parseFloat(localReferralBonus) !== coinsValue) {
          setLocalReferralBonus(coinsValue.toString());
        }
      }
    }
  }, [systemSettings]);

  // Debounced update for referral bonus amount
  useEffect(() => {
    // Only trigger update if we have a valid local value and it differs from the system setting
    if (localReferralBonus && 
        localReferralBonus !== '' && 
        systemSettings) {
      
      const currentSetting = systemSettings.find(s => s.key === 'referral_bonus_amount');
      const storedUsdValue = currentSetting ? parseFloat(currentSetting.value) : 2.99;
      const storedCoinsValue = Math.round(storedUsdValue * 100);
      const localCoinsValue = parseFloat(localReferralBonus);
      
      // Only update if the numerical values differ
      if (localCoinsValue !== storedCoinsValue && localCoinsValue >= 0 && !updateSettingMutation.isPending) {
        const timer = setTimeout(() => {
          // Convert coins to USD before saving (100 coins = 1 USD)
          const usdValue = (localCoinsValue / 100).toFixed(8);
          updateSettingMutation.mutate({
            key: 'referral_bonus_amount',
            value: usdValue, // Store as USD with 8 decimal places
            description: 'USD bonus amount awarded to referrer for genuine referrals'
          });
        }, 1000); // Wait 1 second after user stops typing

        return () => clearTimeout(timer);
      }
    }
  }, [localReferralBonus, systemSettings]);

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          }}></div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 text-purple-500 animate-spin" />
          <p className="text-purple-200 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Admin login screen
  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          }}></div>
        </div>
        
        <Card className="w-full max-w-md admin-card admin-glow border-purple-500/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center pulse-glow">
              <Crown className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold admin-gradient bg-clip-text text-transparent">
              Admin Control Center
            </CardTitle>
            <CardDescription className="text-purple-200">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!currentUser ? (
              <>
                {!requires2FA ? (
                  <form onSubmit={adminLoginForm.handleSubmit((data) => adminLoginMutation.mutate(data))} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email" className="text-purple-200 flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Admin Email
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                        <Input
                          {...adminLoginForm.register("email")}
                          id="admin-email"
                          type="email"
                          placeholder="Enter admin email"
                          className="pl-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                          data-testid="input-admin-email"
                        />
                      </div>
                      {adminLoginForm.formState.errors.email && (
                        <p className="text-red-400 text-sm">{adminLoginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="admin-password" className="text-purple-200 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Admin Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                        <Input
                          {...adminLoginForm.register("password")}
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter admin password"
                          className="pl-10 pr-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300 focus:border-purple-400 focus:ring-purple-400"
                          data-testid="input-admin-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-0 h-full px-3 text-purple-400 hover:text-purple-300 hover:bg-transparent"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {adminLoginForm.formState.errors.password && (
                        <p className="text-red-400 text-sm">{adminLoginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={adminLoginMutation.isPending}
                      className="w-full admin-gradient hover:opacity-90 text-white font-semibold h-12 text-lg"
                      data-testid="button-admin-submit"
                    >
                      {adminLoginMutation.isPending ? (
                        <>
                          <Activity className="mr-2 h-5 w-5 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-5 w-5" />
                          Access Control Center
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); verify2FAMutation.mutate(login2FACode); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-2fa-code" className="text-purple-200 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        2FA Authentication Code
                      </Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                        <Input
                          id="admin-2fa-code"
                          type="text"
                          maxLength={6}
                          value={login2FACode}
                          onChange={(e) => setLogin2FACode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="pl-10 bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-300 focus:border-purple-400 text-center text-2xl tracking-widest"
                          data-testid="input-admin-2fa-code"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-purple-300 text-center">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="submit"
                        disabled={verify2FAMutation.isPending || login2FACode.length !== 6}
                        className="w-full admin-gradient hover:opacity-90 text-white font-semibold h-12 text-lg"
                        data-testid="button-verify-admin-2fa"
                      >
                        {verify2FAMutation.isPending ? (
                          <>
                            <Activity className="mr-2 h-5 w-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-5 w-5" />
                            Verify Code
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-transparent border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                        onClick={() => {
                          setRequires2FA(false);
                          setLogin2FAUserId("");
                          setLogin2FACode("");
                        }}
                        data-testid="button-back-to-admin-login"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-300 mb-2">
                    Logged in as: <span className="font-semibold text-white">{currentUser.email}</span>
                  </p>
                  <p className="text-red-400 mb-4">⚠️ This account does not have admin privileges</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    variant="outline"
                    className="w-full bg-transparent border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                    data-testid="button-logout-and-login"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout & Login as Admin
                  </Button>
                  <Button
                    onClick={() => setLocation('/game')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-go-to-game"
                  >
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Go to Game
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }}></div>
      </div>
      
      {/* Falling Animation Effect */}
      <FallingAnimation />
      
      {/* Admin Dashboard Header - positioned in foreground */}
      <div className="relative z-10">
        <div className="flex items-center justify-between p-4 glass-card ios-blur">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-purple-300">{currentUser?.email}</p>
              <p className="text-xs text-purple-400">{currentUser?.role}</p>
            </div>
            <Button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              variant="outline"
              className="bg-transparent border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="relative container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-20 bg-slate-800/50 border-purple-500/20">
            <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="support-chat" data-testid="tab-support-chat" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Send className="h-4 w-4 mr-1" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1" />
              Users
            </TabsTrigger>
            <TabsTrigger value="user-mgmt" data-testid="tab-user-mgmt" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <UserIcon className="h-4 w-4 mr-1" />
              User Mgmt
            </TabsTrigger>
            <TabsTrigger value="games" data-testid="tab-games" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Gamepad2 className="h-4 w-4 mr-1" />
              Games
            </TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Target className="h-4 w-4 mr-1" />
              Period Control
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-1" />
              IP Security
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <UserCheck className="h-4 w-4 mr-1" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="vip-settings" data-testid="tab-vip-settings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Crown className="h-4 w-4 mr-1" />
              VIP Levels
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="traffic" data-testid="tab-traffic" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-1" />
              Traffic
            </TabsTrigger>
            <TabsTrigger value="deposits" data-testid="tab-deposits" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-1" />
              Deposits
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-1" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="import-export" data-testid="tab-import-export" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Download className="h-4 w-4 mr-1" />
              Import & Export
            </TabsTrigger>
            <TabsTrigger value="email" data-testid="tab-email" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Bell className="h-4 w-4 mr-1" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="promo-codes" data-testid="tab-promo-codes" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Ticket className="h-4 w-4 mr-1" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="databases" data-testid="tab-databases" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Server className="h-4 w-4 mr-1" />
              Databases
            </TabsTrigger>
            <TabsTrigger value="digitalocean" data-testid="tab-digitalocean" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Server className="h-4 w-4 mr-1" />
              Digital Ocean
            </TabsTrigger>
            <TabsTrigger value="server-usage" data-testid="tab-server-usage" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-1" />
              Server Usage
            </TabsTrigger>
            <TabsTrigger value="system-health" data-testid="tab-system-health" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-1" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="telegram" data-testid="tab-telegram" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <MessageCircle className="h-4 w-4 mr-1" />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="betting-tasks" data-testid="tab-betting-tasks" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Trophy className="h-4 w-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="algorithm-monitor" data-testid="tab-algorithm-monitor" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-1" />
              Algorithm
            </TabsTrigger>
            <TabsTrigger value="crash-settings" data-testid="tab-crash-settings" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              <Zap className="h-4 w-4 mr-1" />
              Crash
            </TabsTrigger>
            <TabsTrigger value="crash-refunds" data-testid="tab-crash-refunds" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Refunds
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Live Status Indicator */}
            <LiveStatusIndicator />
            
            {/* House Profit Tracker - Real-time Algorithm Stats */}
            <HouseProfitDisplay />
            
            {/* Active Games */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  Active Games
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Currently running game rounds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeGames && activeGames.length > 0 ? (
                  <div className="space-y-4">
                    {activeGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg hover:border-purple-400/40 transition-colors"
                        data-testid={`active-game-${game.roundDuration}`}
                      >
                        <div>
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-400" />
                            {game.roundDuration} Minute Game
                          </h4>
                          <p className="text-sm text-purple-300">
                            Game ID: {cleanGameIdForDisplay(game.gameId)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={game.status === 'active' ? 'default' : 'secondary'} 
                            className="mb-2 bg-green-500/20 text-green-300 border-green-500/30"
                          >
                            {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                          </Badge>
                          <p className="text-sm text-purple-300">
                            Bets: ${parseFloat(game.totalBetsAmount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Gamepad2 className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-300">No active games</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-200">Total Games</CardTitle>
                    <Gamepad2 className="h-5 w-5 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white" data-testid="total-games">
                      {analytics.totalGames}
                    </div>
                    <p className="text-xs text-purple-300 mt-1">
                      Games completed
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-200">Total Bets</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white" data-testid="total-bets">
                      {analytics.totalBets}
                    </div>
                    <p className="text-xs text-purple-300 mt-1">
                      Bets placed
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-200">Total Volume</CardTitle>
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white" data-testid="total-volume">
                      ${parseFloat(analytics.totalVolume).toFixed(2)}
                    </div>
                    <p className="text-xs text-purple-300 mt-1">
                      Total wagered
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-200">House Profit</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-400" data-testid="house-profit">
                      ${parseFloat(analytics.totalProfit).toFixed(2)}
                    </div>
                    <p className="text-xs text-purple-300 mt-1">
                      Net profit
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payment Statistics */}
            {paymentStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <Card className="admin-card admin-glow border-green-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-200">Total Deposits</CardTitle>
                    <Upload className="h-5 w-5 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-400" data-testid="total-deposits">
                      ${paymentStats.totalDepositsAmount || '0.00'}
                    </div>
                    <p className="text-xs text-green-300 mt-1">
                      All user deposits
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-red-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-200">Total Withdrawals</CardTitle>
                    <Download className="h-5 w-5 text-red-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-400" data-testid="total-withdrawals">
                      ${parseFloat(paymentStats.totalWithdrawalsAmount).toFixed(2)}
                    </div>
                    <p className="text-xs text-red-300 mt-1">
                      All user withdrawals
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-yellow-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-200">Pending Payments</CardTitle>
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-400" data-testid="pending-payments">
                      {paymentStats.pendingPaymentsCount}
                    </div>
                    <p className="text-xs text-yellow-300 mt-1">
                      Awaiting approval
                    </p>
                  </CardContent>
                </Card>

                <Card className="admin-card admin-glow border-gray-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-200">Cancelled Payments</CardTitle>
                    <X className="h-5 w-5 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-400" data-testid="cancelled-payments">
                      {paymentStats.cancelledPaymentsCount}
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Rejected requests
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Live Betting Amounts */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-purple-400 animate-pulse" />
                  Live Betting Amounts
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Real-time betting amounts by color for active games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveBettingAmounts />
              </CardContent>
            </Card>

            {/* User Geography */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-400" />
                  User Geography
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Total users by country
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countryStatsLoading ? (
                  <div className="flex justify-center items-center py-8" data-testid="country-stats-loading">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" data-testid="loading-spinner" />
                  </div>
                ) : countryStats && countryStats.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="country-stats-list">
                    {countryStats.map((country) => (
                      <div
                        key={country.countryCode}
                        className="flex items-center justify-between p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg hover:border-purple-400/40 transition-colors"
                        data-testid={`country-stat-${country.countryCode}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl" data-testid={`flag-${country.countryCode}`}>
                            {getCountryFlag(country.countryCode)}
                          </span>
                          <span className="font-medium text-white" data-testid={`country-name-${country.countryCode}`}>
                            {getCountryName(country.countryCode)}
                          </span>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30" data-testid={`country-count-${country.countryCode}`}>
                          {country.count} {country.count === 1 ? 'user' : 'users'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="country-stats-empty">
                    <Globe className="h-12 w-12 text-purple-400 mx-auto mb-4" data-testid="empty-globe-icon" />
                    <p className="text-purple-300" data-testid="empty-message">No country data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Chat Tab */}
          <TabsContent value="support-chat" className="space-y-6">
            <LiveChatSettings />
            <AdminChatInterface />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  User Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Manage user accounts, balances, bet limits, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersData && usersData.users.length > 0 ? (
                  <div className="space-y-4">
                    {/* Search Input */}
                    <div className="flex items-center gap-2">
                      <Input
                        data-testid="input-search-users"
                        placeholder="Search by email, ID, or public ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-300"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          data-testid="button-clear-search"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200">User</TableHead>
                            <TableHead className="text-purple-200">Role</TableHead>
                            <TableHead className="text-purple-200">VIP Level</TableHead>
                            <TableHead className="text-purple-200">Balance</TableHead>
                            <TableHead className="text-purple-200">Bet Limit</TableHead>
                            <TableHead className="text-purple-200">IP Status</TableHead>
                            <TableHead className="text-purple-200">Status</TableHead>
                            <TableHead className="text-purple-200">Ban Status</TableHead>
                            <TableHead className="text-purple-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersData.users
                            .filter((user) => {
                              if (!searchQuery.trim()) return true;
                              const query = searchQuery.toLowerCase();
                              return (
                                user.email.toLowerCase().includes(query) ||
                                user.publicId?.toLowerCase().includes(query) ||
                                user.id.toLowerCase().includes(query)
                              );
                            })
                            .map((user) => (
                          <TableRow key={user.id} className="border-purple-500/10 hover:bg-slate-800/30">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="border-2 border-purple-500/30">
                                  <AvatarImage src={undefined} />
                                  <AvatarFallback className="bg-purple-600 text-white">
                                    {user.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-white">{user.email}</p>
                                  <p className="text-sm text-purple-300">{user.publicId || "No ID"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  user.role === "admin" 
                                    ? "bg-purple-600/20 text-purple-300 border-purple-500/30"
                                    : user.role === "agent"
                                    ? "bg-blue-600/20 text-blue-300 border-blue-500/30"
                                    : "bg-slate-600/20 text-slate-300 border-slate-500/30"
                                }
                              >
                                {user.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
                                {user.vipLevel.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-mono">${parseFloat(user.balance).toFixed(2)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setEditingBalance(true);
                                    }}
                                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                    data-testid={`button-edit-balance-${user.email}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-amber-300">Commission: ${parseFloat(user.totalCommission || "0").toFixed(2)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setEditingCommission(true);
                                    }}
                                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                    data-testid={`button-award-commission-${user.email}`}
                                  >
                                    <Coins className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-red-300">Frozen: ${parseFloat(user.frozenBalance || "0").toFixed(2)}</span>
                                  {parseFloat(user.frozenBalance || "0") > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setEditingFrozenBalance(true);
                                      }}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      data-testid={`button-unfreeze-balance-${user.email}`}
                                    >
                                      <Unlock className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-mono">${parseFloat(user.maxBetLimit).toFixed(2)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingBetLimit(user.id);
                                    setBetLimitValue(user.maxBetLimit);
                                  }}
                                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                  data-testid={`button-edit-bet-limit-${user.email}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={getIpStatusColor(usersData.users, user)}
                                  className={
                                    getIpStatusColor(usersData.users, user) === "destructive"
                                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                                      : "bg-green-500/20 text-green-300 border-green-500/30"
                                  }
                                >
                                  <Wifi className="h-3 w-3 mr-1" />
                                  {getIpStatusColor(usersData.users, user) === "destructive" ? "Duplicate" : "Unique"}
                                </Badge>
                                {getDuplicateIpUsers(usersData.users, user).length > 0 && (
                                  <span className="text-xs text-red-400">
                                    +{getDuplicateIpUsers(usersData.users, user).length} others
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.isActive ? "default" : "secondary"}
                                className={
                                  user.isActive
                                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                }
                              >
                                {user.isActive ? (
                                  <><UserCheck className="h-3 w-3 mr-1" />Active</>
                                ) : (
                                  <><UserX className="h-3 w-3 mr-1" />Inactive</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                {user.isBanned ? (
                                  <>
                                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                      <Shield className="h-3 w-3 mr-1" />
                                      {user.bannedUntil ? 'Temp Banned' : 'Banned'}
                                    </Badge>
                                    {user.bannedUntil && new Date(user.bannedUntil) > new Date() && (
                                      <span className="text-xs text-red-400">
                                        Until: {new Date(user.bannedUntil).toLocaleDateString()}
                                      </span>
                                    )}
                                    {user.banReason && (
                                      <span className="text-xs text-gray-400" title={user.banReason}>
                                        {user.banReason.length > 20 ? user.banReason.substring(0, 20) + '...' : user.banReason}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Not Banned
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleUserStatusMutation.mutate(user.id)}
                                  disabled={toggleUserStatusMutation.isPending}
                                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                  data-testid={`button-toggle-${user.email}`}
                                >
                                  {user.isActive ? (
                                    <><UserX className="h-3 w-3 mr-1" />Disable</>
                                  ) : (
                                    <><UserCheck className="h-3 w-3 mr-1" />Enable</>
                                  )}
                                </Button>
                                {user.role === 'user' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => promoteToAgentMutation.mutate(user.id)}
                                    disabled={promoteToAgentMutation.isPending}
                                    className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                                    data-testid={`button-promote-agent-${user.email}`}
                                  >
                                    <Crown className="h-3 w-3 mr-1" />
                                    Promote to Agent
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingPasskeys(user)}
                                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                                  data-testid={`button-passkeys-${user.email}`}
                                >
                                  <Fingerprint className="h-3 w-3 mr-1" />
                                  Passkeys
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchIpHistory(user)}
                                  className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                                  data-testid={`button-ip-history-${user.email}`}
                                >
                                  <Globe className="h-3 w-3 mr-1" />
                                  IP History
                                </Button>
                                {user.isBanned ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => unbanUserMutation.mutate(user.id)}
                                    disabled={unbanUserMutation.isPending}
                                    className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                                    data-testid={`button-unban-${user.email}`}
                                  >
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Unban
                                  </Button>
                                ) : user.role === 'admin' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="border-gray-500/30 text-gray-400 cursor-not-allowed"
                                    data-testid={`button-ban-disabled-${user.email}`}
                                    title="Admin users cannot be banned"
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Ban (Admin)
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setBanningUser(user);
                                      setBanReason("");
                                      setBanDuration("1");
                                      setBanPermanent(false);
                                    }}
                                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                    data-testid={`button-ban-${user.email}`}
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Ban
                                  </Button>
                                )}
                                {user.role !== 'admin' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to permanently delete user ${user.email}? This action cannot be undone.`)) {
                                        deleteUserMutation.mutate(user.id);
                                      }
                                    }}
                                    disabled={deleteUserMutation.isPending}
                                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                    data-testid={`button-delete-${user.email}`}
                                  >
                                    <Trash className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadUserReport(user.id, user.email)}
                                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                  data-testid={`button-download-report-${user.email}`}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Download PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-300">No users found</p>
                    </div>
                  )}
                </CardContent>
            </Card>

            {/* Balance Adjustment Modal */}
            {editingBalance && selectedUser && (
              <Card className="admin-card admin-glow border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Adjust Balance: {selectedUser.email}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label className="text-purple-200">Current Balance</Label>
                      <p className="text-2xl font-bold text-white">${parseFloat(selectedUser.balance).toFixed(2)}</p>
                    </div>
                    <div className="flex-1">
                      <Label className="text-purple-200">Adjustment Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={balanceAdjustment}
                        onChange={(e) => setBalanceAdjustment(e.target.value)}
                        placeholder="0.00"
                        className="bg-slate-800/50 border-purple-500/30 text-white"
                      />
                      <p className="text-xs text-purple-300 mt-1">
                        Use negative values to deduct balance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        if (balanceAdjustment && selectedUser) {
                          adjustBalanceMutation.mutate({
                            userId: selectedUser.id,
                            amount: balanceAdjustment
                          });
                        }
                      }}
                      disabled={!balanceAdjustment || adjustBalanceMutation.isPending}
                      className="admin-gradient hover:opacity-90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingBalance(false);
                        setSelectedUser(null);
                        setBalanceAdjustment("");
                      }}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commission Award Modal */}
            {editingCommission && selectedUser && (
              <Card className="admin-card admin-glow border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    Award Commission: {selectedUser.email}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label className="text-purple-200">Current Commission</Label>
                      <p className="text-2xl font-bold text-white">${parseFloat(selectedUser.totalCommission || "0").toFixed(2)}</p>
                      <p className="text-sm text-purple-300 mt-1">{usdToGoldCoins(parseFloat(selectedUser.totalCommission || "0"))} coins</p>
                    </div>
                    <div className="flex-1">
                      <Label className="text-purple-200">Award Amount (Coins)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={commissionCoins}
                        onChange={(e) => setCommissionCoins(e.target.value)}
                        placeholder="299"
                        className="bg-slate-800/50 border-amber-500/30 text-white"
                      />
                      <p className="text-xs text-amber-300 mt-1">
                        {commissionCoins && !isNaN(parseInt(commissionCoins)) ? `= $${(parseInt(commissionCoins) / 100).toFixed(2)} USD` : '100 coins = $1.00 USD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        const coins = parseInt(commissionCoins);
                        if (!isNaN(coins) && coins > 0 && selectedUser) {
                          awardCommissionMutation.mutate({
                            userId: selectedUser.id,
                            coins
                          });
                        }
                      }}
                      disabled={!commissionCoins || isNaN(parseInt(commissionCoins)) || parseInt(commissionCoins) <= 0 || awardCommissionMutation.isPending}
                      className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 text-white"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Award Commission
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCommission(false);
                        setSelectedUser(null);
                        setCommissionCoins("");
                      }}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Frozen Balance Unfreeze Modal */}
            {editingFrozenBalance && selectedUser && (
              <Card className="admin-card admin-glow border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Unlock className="h-5 w-5 text-red-400" />
                    Unfreeze Balance: {selectedUser.email}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label className="text-purple-200">Current Frozen Balance</Label>
                      <p className="text-2xl font-bold text-red-400">${parseFloat(selectedUser.frozenBalance || "0").toFixed(2)}</p>
                    </div>
                    <div className="flex-1">
                      <Label className="text-purple-200">Unfreeze Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={frozenBalanceValue}
                        onChange={(e) => setFrozenBalanceValue(e.target.value)}
                        placeholder="0.00"
                        className="bg-slate-800/50 border-red-500/30 text-white"
                        data-testid="input-unfreeze-amount"
                      />
                      <p className="text-xs text-red-300 mt-1">
                        Enter amount to unfreeze (max: ${parseFloat(selectedUser.frozenBalance || "0").toFixed(2)})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        const amount = parseFloat(frozenBalanceValue);
                        if (!isNaN(amount) && amount > 0 && selectedUser) {
                          unfreezeBalanceMutation.mutate({
                            userId: selectedUser.id,
                            amount: frozenBalanceValue
                          });
                        }
                      }}
                      disabled={!frozenBalanceValue || isNaN(parseFloat(frozenBalanceValue)) || parseFloat(frozenBalanceValue) <= 0 || unfreezeBalanceMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 text-white"
                      data-testid="button-confirm-unfreeze"
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unfreeze Balance
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingFrozenBalance(false);
                        setSelectedUser(null);
                        setFrozenBalanceValue("");
                      }}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Balance Adjustment Modal */}
            {editingAgentBalance && selectedAgent && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4 admin-card border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Adjust Agent Balance: {selectedAgent.email}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-purple-200">Current Earnings Balance</Label>
                        <p className="text-2xl font-bold text-green-400">
                          ${parseFloat(selectedAgent.agentProfile.earningsBalance).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-purple-200">Adjustment Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={agentBalanceAdjustment}
                          onChange={(e) => setAgentBalanceAdjustment(e.target.value)}
                          placeholder="0.00"
                          className="bg-slate-800/50 border-purple-500/30 text-white"
                          data-testid="input-agent-balance-adjustment"
                        />
                        <p className="text-xs text-purple-300 mt-1">
                          Use negative values to deduct balance
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingAgentBalance(null);
                          setSelectedAgent(null);
                          setAgentBalanceAdjustment("");
                        }}
                        className="border-purple-500/20"
                        data-testid="button-cancel-agent-balance"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (agentBalanceAdjustment && selectedAgent) {
                            adjustAgentBalanceMutation.mutate({
                              agentId: selectedAgent.id,
                              amount: agentBalanceAdjustment
                            });
                          }
                        }}
                        disabled={!agentBalanceAdjustment || adjustAgentBalanceMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-save-agent-balance"
                      >
                        {adjustAgentBalanceMutation.isPending ? "Updating..." : "Update Balance"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bet Limit Adjustment */}
            {editingBetLimit && (
              <Card className="admin-card admin-glow border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    Adjust Bet Limit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Label className="text-purple-200">New Bet Limit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={betLimitValue}
                        onChange={(e) => setBetLimitValue(e.target.value)}
                        placeholder="1000.00"
                        className="bg-slate-800/50 border-purple-500/30 text-white"
                      />
                      <p className="text-xs text-purple-300 mt-1">
                        Maximum amount user can bet per round
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        if (betLimitValue && editingBetLimit) {
                          updateBetLimitMutation.mutate({
                            userId: editingBetLimit,
                            limit: betLimitValue
                          });
                        }
                      }}
                      disabled={!betLimitValue || updateBetLimitMutation.isPending}
                      className="admin-gradient hover:opacity-90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Update Limit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingBetLimit(null);
                        setBetLimitValue("");
                      }}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Passkey Management Modal */}
            {viewingPasskeys && (
              <Card className="admin-card admin-glow border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-blue-400" />
                    Manage Passkeys: {viewingPasskeys.email}
                  </CardTitle>
                  <CardDescription className="text-blue-300">
                    View and manage user's registered passkeys for secure authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passkeysData && passkeysData.length > 0 ? (
                    <div className="space-y-3">
                      {passkeysData.map((passkey) => (
                        <div
                          key={passkey.id}
                          className="p-4 bg-slate-800/30 rounded-lg border border-blue-500/20 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              passkey.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'
                            }`}>
                              <Fingerprint className={`h-5 w-5 ${
                                passkey.isActive ? 'text-green-400' : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="text-white font-medium">{passkey.deviceName}</p>
                              <p className="text-xs text-blue-300">
                                Created: {new Date(passkey.createdAt).toLocaleDateString()}
                              </p>
                              {passkey.lastUsedAt && (
                                <p className="text-xs text-blue-300">
                                  Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={passkey.isActive ? "default" : "secondary"}
                                  className={passkey.isActive 
                                    ? "bg-green-500/20 text-green-300 border-green-500/30" 
                                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                  }
                                >
                                  {passkey.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <span className="text-xs text-blue-400">
                                  Uses: {passkey.counter}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the passkey "${passkey.deviceName}"? This action cannot be undone.`)) {
                                deletePasskeyMutation.mutate(passkey.id);
                              }
                            }}
                            disabled={deletePasskeyMutation.isPending}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                            data-testid={`button-delete-passkey-${passkey.id}`}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Fingerprint className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                      <p className="text-blue-300">No passkeys registered for this user</p>
                      <p className="text-sm text-blue-400 mt-2">
                        User can register passkeys from the Security Settings page
                      </p>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-4 border-t border-blue-500/20">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewingPasskeys(null);
                        setUserPasskeys([]);
                      }}
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                      data-testid="button-close-passkeys"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => refetchUserPasskeys()}
                      disabled={passkeysData === undefined}
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                      data-testid="button-refresh-passkeys"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-purple-400" />
                  Games Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Monitor and manage all game rounds, durations, betting limits, and game status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Games Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-400 animate-pulse" />
                      Active Games
                    </h3>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      Real-time Monitoring
                    </Badge>
                  </div>
                  
                  {activeGames && activeGames.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeGames.map((game) => (
                        <Card
                          key={game.id}
                          className="border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20 hover:border-green-400/50 transition-all"
                          data-testid={`active-game-card-${game.id}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-white text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-green-400" />
                                {game.roundDuration} Min Game
                              </CardTitle>
                              <Badge className="bg-green-500/30 text-green-200 border-green-400/40">
                                ACTIVE
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Game ID:</span>
                                <span className="text-white font-mono">{cleanGameIdForDisplay(game.gameId)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Bets:</span>
                                <span className="text-green-300 font-semibold">${parseFloat(game.totalBetsAmount).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Potential Payout:</span>
                                <span className="text-yellow-300 font-semibold">${parseFloat(game.totalPayouts).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">House Profit:</span>
                                <span className={`font-semibold ${parseFloat(game.houseProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ${parseFloat(game.houseProfit).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Manual Control:</span>
                                <Badge variant={game.isManuallyControlled ? "destructive" : "secondary"} className={game.isManuallyControlled ? "bg-red-500/20 text-red-300" : ""}>
                                  {game.isManuallyControlled ? "Yes" : "No"}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="pt-3 border-t border-green-500/20">
                              <p className="text-xs text-gray-400 mb-2">Started at:</p>
                              <p className="text-white text-sm">{new Date(game.startTime).toLocaleString()}</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="pt-3 border-t border-green-500/20 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => completeGameMutation.mutate(game.id)}
                                disabled={completeGameMutation.isPending || cancelGameMutation.isPending}
                                className="flex-1 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                                data-testid={`button-complete-game-${game.id}`}
                              >
                                {completeGameMutation.isPending ? (
                                  <Activity className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Target className="h-3 w-3 mr-1" />
                                )}
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to cancel this game? All bets will be refunded.`)) {
                                    cancelGameMutation.mutate(game.id);
                                  }
                                }}
                                disabled={completeGameMutation.isPending || cancelGameMutation.isPending}
                                className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10"
                                data-testid={`button-cancel-game-${game.id}`}
                              >
                                {cancelGameMutation.isPending ? (
                                  <Activity className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3 mr-1" />
                                )}
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-purple-500/20">
                      <Gamepad2 className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-300">No active games at the moment</p>
                    </div>
                  )}
                </div>

                {/* Game History Section */}
                <div className="space-y-4 pt-6 border-t border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      Game History
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchGameHistory()}
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                      data-testid="button-refresh-game-history"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  
                  {gameHistory && gameHistory.length > 0 ? (
                    <div className="rounded-lg border border-purple-500/20 overflow-hidden">
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                            <TableRow className="border-purple-500/20">
                              <TableHead className="text-purple-200">Game ID</TableHead>
                              <TableHead className="text-purple-200">Duration</TableHead>
                              <TableHead className="text-purple-200">Status</TableHead>
                              <TableHead className="text-purple-200">Result</TableHead>
                              <TableHead className="text-purple-200">Total Bets</TableHead>
                              <TableHead className="text-purple-200">Payouts</TableHead>
                              <TableHead className="text-purple-200">Profit</TableHead>
                              <TableHead className="text-purple-200">Manual</TableHead>
                              <TableHead className="text-purple-200">Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gameHistory.map((game) => (
                              <TableRow 
                                key={game.id} 
                                className="border-purple-500/10 hover:bg-slate-800/50"
                                data-testid={`game-history-row-${game.id}`}
                              >
                                <TableCell className="font-mono text-white text-sm">{cleanGameIdForDisplay(game.gameId)}</TableCell>
                                <TableCell className="text-white">
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                    {game.roundDuration}m
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={
                                      game.status === 'completed' 
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                        : game.status === 'cancelled'
                                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                                        : "bg-green-500/20 text-green-300 border-green-500/30"
                                    }
                                  >
                                    {game.status.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {game.result !== null ? (
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                          game.resultColor === 'green' ? 'bg-green-600' :
                                          game.resultColor === 'red' ? 'bg-red-600' :
                                          'bg-purple-600'
                                        }`}
                                      >
                                        {game.result}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        <div>{game.resultColor}</div>
                                        <div>{game.resultSize}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-white font-semibold">
                                  ${parseFloat(game.totalBetsAmount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-yellow-300 font-semibold">
                                  ${parseFloat(game.totalPayouts).toFixed(2)}
                                </TableCell>
                                <TableCell className={`font-bold ${parseFloat(game.houseProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ${parseFloat(game.houseProfit).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {game.isManuallyControlled ? (
                                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                      <Target className="h-3 w-3 mr-1" />
                                      YES
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                      NO
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-400 text-xs">
                                  {new Date(game.startTime).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : gameHistoryLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Activity className="h-8 w-8 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-purple-500/20">
                      <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-300">No game history available</p>
                    </div>
                  )}
                </div>

                {/* Game Analytics Summary */}
                {analytics && (
                  <div className="space-y-4 pt-6 border-t border-purple-500/20">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-400" />
                      Game Analytics Summary
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="border-purple-500/30 bg-purple-900/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-purple-300">Total Games</p>
                              <p className="text-2xl font-bold text-white" data-testid="analytics-total-games">
                                {analytics.totalGames}
                              </p>
                            </div>
                            <Gamepad2 className="h-8 w-8 text-purple-400" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-blue-500/30 bg-blue-900/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-300">Total Bets</p>
                              <p className="text-2xl font-bold text-white" data-testid="analytics-total-bets">
                                {analytics.totalBets}
                              </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-400" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-green-500/30 bg-green-900/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-300">Total Volume</p>
                              <p className="text-2xl font-bold text-white" data-testid="analytics-total-volume">
                                ${parseFloat(analytics.totalVolume).toFixed(2)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-400" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-yellow-500/30 bg-yellow-900/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-yellow-300">Avg Bet Size</p>
                              <p className="text-2xl font-bold text-white" data-testid="analytics-avg-bet">
                                ${parseFloat(analytics.averageBetSize).toFixed(2)}
                              </p>
                            </div>
                            <Coins className="h-8 w-8 text-yellow-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Period Control Tab */}
          <TabsContent value="manual" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-400" />
                  Period Result Control
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Manually control game results by Period ID - Ultimate Admin Power
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Scheduling & Prediction Section */}
                <div className="space-y-6 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Period Scheduling & Prediction</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-blue-200 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Select Date
                      </Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-800/50 border-blue-500/30 text-white"
                        data-testid="input-period-date"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-200 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Select Time (Hour)
                      </Label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger className="bg-slate-800/50 border-blue-500/30 text-white" data-testid="select-period-time">
                          <SelectValue placeholder="Select hour" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')} className="text-white hover:bg-blue-500/20">
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-blue-200 flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        Select Game
                      </Label>
                      <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                        <SelectTrigger className="bg-slate-800/50 border-blue-500/30 text-white" data-testid="select-game-duration">
                          <SelectValue placeholder="Select game type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          <SelectItem value="1" className="text-white hover:bg-blue-500/20">1 min</SelectItem>
                          <SelectItem value="3" className="text-white hover:bg-blue-500/20">3 min</SelectItem>
                          <SelectItem value="5" className="text-white hover:bg-blue-500/20">5 min</SelectItem>
                          <SelectItem value="10" className="text-white hover:bg-blue-500/20">10 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (selectedDate && selectedTime && selectedDuration) {
                            // Generate period predictions that match actual game ID format using shared Sri Lanka time logic
                            // Format: YYYYMMDD + duration(2-digit) + period number(4-digit)
                            
                            // Parse selected date/time as if it were in Sri Lanka timezone
                            // Convert local selected time to Sri Lanka time equivalent
                            const [year, month, day] = selectedDate.split('-').map(Number);
                            const hour = parseInt(selectedTime);
                            
                            // Create a UTC date that represents the selected Sri Lanka time
                            // Sri Lanka is UTC+5:30, so subtract 5.5 hours from the selected time to get UTC
                            const selectedSLTime = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
                            const selectedUTC = new Date(selectedSLTime.getTime() - (5.5 * 60 * 60 * 1000));
                            
                            const periods: string[] = [];
                            const duration = parseInt(selectedDuration);
                            
                            // Calculate how many periods in the hour based on duration
                            const periodsInHour = 60 / duration;
                            
                            // Generate periods for the selected hour using Sri Lanka time
                            for (let i = 0; i < periodsInHour; i++) {
                              // Calculate the Sri Lanka time for this period
                              const periodUTC = new Date(selectedUTC.getTime() + i * duration * 60 * 1000);
                              const periodSLTime = new Date(periodUTC.getTime() + (5.5 * 60 * 60 * 1000));
                              
                              const slYear = periodSLTime.getUTCFullYear();
                              const slMonth = (periodSLTime.getUTCMonth() + 1).toString().padStart(2, '0');
                              const slDay = periodSLTime.getUTCDate().toString().padStart(2, '0');
                              
                              // Calculate period number using Sri Lanka time midnight as base
                              const startOfDay = new Date(periodSLTime);
                              startOfDay.setUTCHours(0, 0, 0, 0);
                              const minutesSinceMidnight = Math.floor((periodSLTime.getTime() - startOfDay.getTime()) / (1000 * 60));
                              const periodNumber = Math.floor(minutesSinceMidnight / duration) + 1;
                              
                              // Format: YYYYMMDD + 2-digit duration + 4-digit period number
                              const dateStr = `${slYear}${slMonth}${slDay}`;
                              const durationPadded = duration.toString().padStart(2, '0');
                              const periodPadded = periodNumber.toString().padStart(4, '0');
                              
                              const periodId = `${dateStr}${durationPadded}${periodPadded}`;
                              periods.push(periodId);
                            }
                            
                            setPredictedPeriods(periods);
                            toast({
                              title: "📅 Period Schedule Generated",
                              description: `Generated ${periods.length} period IDs for ${selectedDate} at ${selectedTime}:00 (${duration}-min games). Click a period to set its result.`,
                            });
                          }
                        }}
                        disabled={!selectedDate || !selectedTime || !selectedDuration}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-generate-periods"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Generate Periods
                      </Button>
                    </div>
                  </div>
                  
                  {/* Predicted Periods Display */}
                  {predictedPeriods.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-blue-400" />
                        Predicted Periods ({predictedPeriods.length})
                      </h4>
                      <div className="max-h-96 overflow-y-auto bg-slate-800/30 rounded-lg p-4 border border-blue-500/20">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {predictedPeriods.map((periodId, index) => {
                            // Use shared helper to parse period ID
                            const parsed = parsePeriodId(periodId);
                            const timeStr = `${parsed.startTime.hours.toString().padStart(2, '0')}:${parsed.startTime.minutes.toString().padStart(2, '0')}`;
                            
                            return (
                              <div
                                key={periodId}
                                className="p-2 bg-blue-900/30 rounded border border-blue-500/20 text-center cursor-pointer hover:bg-blue-800/40 transition-colors"
                                onClick={() => {
                                  setPeriodId(periodId);
                                  toast({
                                    title: "✅ Period Selected",
                                    description: `Period ${periodId} (${timeStr}, ${parsed.duration}min) ready for customization`,
                                  });
                                }}
                                data-testid={`period-${periodId}`}
                              >
                                <span className="text-xs text-blue-200 font-mono">{periodId}</span>
                                <div className="text-xs text-blue-400 mt-1">
                                  {timeStr} ({parsed.duration}min)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Period History */}
                  {periodId && gameHistory && (
                    <div className="mt-4">
                      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-400" />
                        History for Period: {periodId}
                      </h4>
                      {(() => {
                        // Find the game matching the selected period ID
                        const matchingGame = gameHistory.find(game => game.gameId === periodId);
                        
                        if (matchingGame) {
                          const getNumberColor = (num: number) => {
                            if (num === 5) return "bg-gradient-to-br from-violet-500 to-violet-600";
                            if ([1, 3, 7, 9].includes(num)) return "bg-gradient-to-br from-emerald-500 to-emerald-600";
                            if (num === 0) return "bg-gradient-to-br from-violet-500 to-violet-600";
                            return "bg-gradient-to-br from-red-500 to-red-600";
                          };

                          const getColorDot = (color: string) => {
                            switch (color) {
                              case "green": return "bg-emerald-500";
                              case "violet": return "bg-violet-500";
                              case "red": return "bg-red-500";
                              default: return "bg-gray-500";
                            }
                          };
                          
                          return (
                            <div className="bg-slate-800/30 rounded-lg p-4 border border-green-500/20">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Result Number</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-10 h-10 ${getNumberColor(matchingGame.result ?? 0)} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}>
                                      {matchingGame.result}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Color</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 ${getColorDot(matchingGame.resultColor || '')} rounded-full shadow-lg`}></div>
                                    <span className="text-white capitalize">{matchingGame.resultColor}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Size</p>
                                  <p className="text-white font-medium">{matchingGame.resultSize}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Status</p>
                                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                    {matchingGame.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Total Bets</p>
                                  <p className="text-white font-medium">${parseFloat(matchingGame.totalBetsAmount).toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Total Payouts</p>
                                  <p className="text-white font-medium">${parseFloat(matchingGame.totalPayouts).toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">House Profit</p>
                                  <p className={`font-medium ${parseFloat(matchingGame.houseProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${parseFloat(matchingGame.houseProfit).toFixed(2)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-green-300">Duration</p>
                                  <p className="text-white font-medium">{matchingGame.roundDuration} min</p>
                                </div>
                              </div>
                              {matchingGame.isManuallyControlled && (
                                <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300 flex items-center gap-2">
                                  <Zap className="h-3 w-3" />
                                  This game was manually controlled
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-slate-800/30 rounded-lg p-6 border border-yellow-500/20 text-center">
                              <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                              <p className="text-yellow-300">No history found for this period</p>
                              <p className="text-xs text-yellow-400 mt-1">This game may not have been played yet or the period ID format is incorrect</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
                
                {/* Period ID Input */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-purple-200 flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Period ID
                      </Label>
                      <Input
                        value={periodId}
                        onChange={(e) => setPeriodId(e.target.value)}
                        placeholder="Enter Period ID (e.g., 20250927010779)"
                        className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-400"
                        data-testid="input-period-id"
                      />
                      <p className="text-xs text-purple-300 mt-1">
                        Format: YYYYMMDD + Duration(01=1min) + Period(0001-1440)
                      </p>
                    </div>
                    <div>
                      <Label className="text-purple-200 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Custom Result (0-9)
                      </Label>
                      <Select value={customResult?.toString() || ""} onValueChange={(value) => setCustomResult(parseInt(value))}>
                        <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-white" data-testid="select-custom-result">
                          <SelectValue placeholder="Select result number" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <SelectItem key={num} value={num.toString()} className="text-white hover:bg-purple-500/20">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    num === 0 ? 'bg-purple-500 text-white' :
                                    num % 2 === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                  }`}
                                >
                                  {num}
                                </div>
                                <span>
                                  {num === 0 ? 'Violet' : num % 2 === 0 ? 'Red' : 'Green'} - {num >= 5 ? 'Big' : 'Small'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-purple-200 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Bet Amount
                      </Label>
                      <Input
                        type="number"
                        value={predictionBetAmount}
                        onChange={(e) => setPredictionBetAmount(e.target.value)}
                        placeholder="Enter bet amount"
                        className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-400"
                        data-testid="input-bet-amount"
                        min="0"
                        step="1"
                      />
                      <p className="text-xs text-purple-300 mt-1">
                        Amount to bet on this prediction
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (periodId && customResult !== null) {
                        // Save the prediction to the database
                        savePredictionMutation.mutate({ periodId, result: customResult });
                        
                        let targetGame = null;
                        let matchType = 'none';
                        
                        if (activeGames && activeGames.length > 0) {
                          // Try exact match first (full game ID like 20251019010607)
                          targetGame = activeGames.find(g => g.gameId === periodId);
                          if (targetGame) {
                            matchType = 'exact';
                          }
                          
                          // If no exact match, try partial match (date and duration)
                          if (!targetGame && periodId.length >= 10) {
                            const periodDate = periodId.substring(0, 8); // YYYYMMDD
                            const periodDuration = periodId.length >= 10 ? periodId.substring(8, 10) : null; // Duration
                            
                            if (periodDuration) {
                              targetGame = activeGames.find(g => 
                                g.gameId.startsWith(periodDate) && 
                                g.gameId.substring(8, 10) === periodDuration
                              );
                              if (targetGame) {
                                matchType = 'partial';
                              }
                            }
                          }
                          
                          // If still no match, show helpful error
                          if (!targetGame) {
                            const activeGamesList = activeGames.map(g => 
                              `${g.gameId} (${g.roundDuration}min)`
                            ).join(', ');
                            
                            toast({
                              title: "❌ Period Not Found",
                              description: `Period ${periodId} is not currently active. Active periods: ${activeGamesList}`,
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        
                        if (targetGame) {
                          const betAmount = parseFloat(predictionBetAmount) || 0;
                          
                          // Show appropriate message based on match type
                          if (matchType === 'partial') {
                            toast({
                              title: "⚠️ Partial Match Found",
                              description: `Using closest matching game: ${targetGame.gameId} (${targetGame.roundDuration}min)`,
                            });
                          }
                          
                          setManualResultMutation.mutate({
                            gameId: targetGame.id,
                            result: customResult,
                            betAmount: betAmount > 0 ? betAmount : undefined
                          });
                        } else {
                          toast({
                            title: "❌ No Active Games",
                            description: "No games are currently running. Please wait for a game to start.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                    disabled={!periodId || customResult === null || setManualResultMutation.isPending}
                    className="admin-gradient hover:opacity-90 text-white font-semibold h-12 text-lg pulse-glow"
                  >
                    {setManualResultMutation.isPending ? (
                      <>
                        <Activity className="mr-2 h-5 w-5 animate-spin" />
                        Setting Result...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        🎯 Set Period Result
                      </>
                    )}
                  </Button>
                </div>

                {/* Active Games for Manual Control */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-400" />
                    Active Games - Quick Control
                  </h3>
                  {activeGames && activeGames.length > 0 ? (
                    <div className="grid gap-4">
                      {activeGames.map((game) => (
                        <div
                          key={game.id}
                          className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg hover:border-purple-400/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-white">
                                Period: {cleanGameIdForDisplay(game.gameId)} ({game.roundDuration}min)
                              </h4>
                              <p className="text-sm text-purple-300">
                                Status: {game.status} | Bets: ${parseFloat(game.totalBetsAmount).toFixed(2)}
                              </p>
                            </div>
                            {game.result !== null && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                Result: {game.result} ({game.resultColor})
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                              <Button
                                key={num}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Save the quick prediction to the database
                                  savePredictionMutation.mutate({ periodId: game.gameId, result: num });
                                  
                                  const betAmount = parseFloat(predictionBetAmount) || 0;
                                  setManualResultMutation.mutate({
                                    gameId: game.id,
                                    result: num,
                                    betAmount: betAmount > 0 ? betAmount : undefined
                                  });
                                }}
                                disabled={setManualResultMutation.isPending || game.status !== 'active'}
                                className={`h-12 font-bold border-2 ${
                                  num === 0 ? 'border-purple-500 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' :
                                  num % 2 === 0 ? 'border-red-500 bg-red-500/20 text-red-300 hover:bg-red-500/30' : 
                                  'border-green-500 bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                }`}
                              >
                                <div className="text-center">
                                  <div className="text-lg">{num}</div>
                                  <div className="text-xs">
                                    {num === 0 ? 'V' : num % 2 === 0 ? 'R' : 'G'}
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-300">No active games to control</p>
                    </div>
                  )}
                </div>

                {/* All Predicted Results Display */}
                {predictedResults.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      All Predicted Results ({predictedResults.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(() => {
                        // Helper functions
                        const getResultColor = (num: number) => {
                          if (num === 5 || num === 0) return "violet";
                          if ([1, 3, 7, 9].includes(num)) return "green";
                          return "red";
                        };
                        
                        const getResultSize = (num: number) => {
                          return num >= 5 ? "Big" : "Small";
                        };
                        
                        const getNumberColor = (num: number) => {
                          if (num === 5) return "bg-gradient-to-br from-violet-500 to-violet-600";
                          if ([1, 3, 7, 9].includes(num)) return "bg-gradient-to-br from-emerald-500 to-emerald-600";
                          if (num === 0) return "bg-gradient-to-br from-violet-500 to-violet-600";
                          return "bg-gradient-to-br from-red-500 to-red-600";
                        };

                        const getColorDot = (color: string) => {
                          switch (color) {
                            case "green": return "bg-emerald-500";
                            case "violet": return "bg-violet-500";
                            case "red": return "bg-red-500";
                            default: return "bg-gray-500";
                          }
                        };
                        
                        // Sort by timestamp descending (newest first)
                        const sortedResults = [...predictedResults].sort((a, b) => b.timestamp - a.timestamp);
                        
                        return sortedResults.map((prediction) => {
                          const color = getResultColor(prediction.result);
                          const size = getResultSize(prediction.result);
                          
                          // Extract date from period ID (YYYYMMDD...)
                          const year = prediction.periodId.substring(0, 4);
                          const month = prediction.periodId.substring(4, 6);
                          const day = prediction.periodId.substring(6, 8);
                          const dateStr = `${year}-${month}-${day}`;
                          
                          // Check if this is the currently selected period
                          const isSelected = periodId === prediction.periodId;
                          
                          return (
                            <div 
                              key={prediction.periodId}
                              className={`p-4 rounded-lg border transition-all ${
                                isSelected 
                                  ? 'bg-blue-900/40 border-blue-500/60 shadow-lg' 
                                  : 'bg-blue-900/20 border-blue-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-white flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      PREDICTED
                                    </Badge>
                                    {isSelected && (
                                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                        Selected
                                      </Badge>
                                    )}
                                  </h4>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Date: {dateStr}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (prediction.id) {
                                      deletePredictionMutation.mutate(prediction.id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  disabled={!prediction.id || deletePredictionMutation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-blue-300">Period ID</p>
                                  <p className="text-white font-mono text-sm">{prediction.periodId}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-blue-300">Result Number</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-10 h-10 ${getNumberColor(prediction.result)} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}>
                                      {prediction.result}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-blue-300">Color</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 ${getColorDot(color)} rounded-full shadow-lg`}></div>
                                    <span className="text-white capitalize font-medium">{color}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-blue-300">Size</p>
                                  <p className="text-white font-medium">{size}</p>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Passkey Access Control */}
            <Card className="admin-card admin-glow border-red-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-400" />
                  Passkey Access Control
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Control global access to login, game, and withdrawal pages for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PasskeyAccessControl />
              </CardContent>
            </Card>

            {/* Coinflip Game Maintenance Control */}
            <Card className="admin-card admin-glow border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-orange-400" />
                  Coinflip Game Maintenance
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Enable or disable the Coinflip game for maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CoinflipMaintenanceControl />
              </CardContent>
            </Card>

            {/* Win Go Game Maintenance Control */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  Win Go Game Maintenance
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Enable or disable the Win Go game for maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WingoMaintenanceControl />
              </CardContent>
            </Card>

            {/* Crash Game Maintenance Control */}
            <Card className="admin-card admin-glow border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Crash Game Maintenance
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Enable or disable the Crash game for maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CrashMaintenanceControl />
              </CardContent>
            </Card>

            {/* Color Betting Game Maintenance Control */}
            <Card className="admin-card admin-glow border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-green-400" />
                  Color Betting Maintenance
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Enable or disable the Color Betting game for maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ColorBettingMaintenanceControl />
              </CardContent>
            </Card>

            {/* Admin 2FA Security */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Admin 2FA Security
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Setup Google Authenticator for enhanced admin account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentUser && (
                  <div className="space-y-4">
                    {/* Current 2FA Status */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${currentUser.twoFactorEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-medium text-white">
                            2FA Status: {currentUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="text-sm text-purple-300">
                            {currentUser.twoFactorEnabled 
                              ? 'Your account is protected with two-factor authentication' 
                              : 'Enable 2FA to secure your admin account'}
                          </p>
                        </div>
                      </div>
                      {currentUser.twoFactorEnabled ? (
                        <Button
                          onClick={() => disable2FAMutation.mutate(currentUser.id)}
                          disabled={disable2FAMutation.isPending}
                          variant="destructive"
                          size="sm"
                          data-testid="button-disable-2fa"
                        >
                          {disable2FAMutation.isPending ? (
                            <>
                              <Activity className="mr-2 h-4 w-4 animate-spin" />
                              Disabling...
                            </>
                          ) : (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Disable 2FA
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setup2FAMutation.mutate(currentUser.id)}
                          disabled={setup2FAMutation.isPending}
                          className="admin-gradient hover:opacity-90"
                          size="sm"
                          data-testid="button-setup-2fa"
                        >
                          {setup2FAMutation.isPending ? (
                            <>
                              <Activity className="mr-2 h-4 w-4 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Setup 2FA
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* QR Code Display */}
                    {twoFAQrCode && settingUp2FA === currentUser.id && (
                      <div className="p-6 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                        <div className="text-center space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                            <Shield className="h-5 w-5 text-blue-400" />
                            Scan QR Code with Google Authenticator
                          </h3>
                          <div className="flex justify-center">
                            <div className="p-4 bg-white rounded-lg">
                              <img 
                                src={twoFAQrCode} 
                                alt="2FA QR Code" 
                                className="w-48 h-48"
                                data-testid="img-2fa-qr-code"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-purple-300 text-sm">
                              1. Install Google Authenticator on your phone<br/>
                              2. Scan the QR code above<br/>
                              3. Enter the 6-digit code below to verify
                            </p>
                            <div className="max-w-sm mx-auto space-y-2">
                              <Label className="text-purple-200">Enter Verification Code</Label>
                              <Input
                                value={twoFAToken}
                                onChange={(e) => setTwoFAToken(e.target.value)}
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-lg tracking-widest bg-slate-800/50 border-purple-500/30 text-white"
                                data-testid="input-2fa-token"
                              />
                            </div>
                            <div className="flex justify-center space-x-3">
                              <Button
                                onClick={() => {
                                  if (twoFAToken.length === 6 && currentUser) {
                                    verifyUser2FAMutation.mutate({
                                      userId: currentUser.id,
                                      token: twoFAToken
                                    });
                                  }
                                }}
                                disabled={twoFAToken.length !== 6 || verifyUser2FAMutation.isPending}
                                className="admin-gradient hover:opacity-90"
                                data-testid="button-verify-2fa"
                              >
                                {verifyUser2FAMutation.isPending ? (
                                  <>
                                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Verify & Enable
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setTwoFAQrCode(null);
                                  setTwoFASecret(null);
                                  setTwoFAToken("");
                                  setSettingUp2FA(null);
                                }}
                                variant="outline"
                                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                data-testid="button-cancel-2fa"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2FA Security Tips */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security Best Practices
                      </h4>
                      <ul className="text-sm text-blue-200 space-y-1 ml-6">
                        <li>• Keep backup codes in a secure location</li>
                        <li>• Don't share your authenticator device</li>
                        <li>• Update your authenticator app regularly</li>
                        <li>• Consider using multiple backup methods</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WAF / Cloudflare Protection Settings */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  WAF Protection (Cloudflare Integration)
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Web Application Firewall with advanced threat protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Protection Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-300">Cloudflare Validation</p>
                          <p className="text-lg font-bold text-green-400">Active</p>
                        </div>
                        <Shield className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-300">SQL Injection Guard</p>
                          <p className="text-lg font-bold text-blue-400">Enabled</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/10 border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-300">XSS Protection</p>
                          <p className="text-lg font-bold text-purple-400">Enabled</p>
                        </div>
                        <Lock className="h-8 w-8 text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Protections List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    Active Protections
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">Country-based Access Control</span>
                    </div>
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">Malicious User Agent Blocking</span>
                    </div>
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">IP Reputation Checking</span>
                    </div>
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">Path Traversal Prevention</span>
                    </div>
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">Request Size Monitoring</span>
                    </div>
                    <div className="flex items-center p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-purple-200">Suspicious Header Detection</span>
                    </div>
                  </div>
                </div>

                {/* Configuration Guide */}
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <h4 className="font-medium text-orange-300 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuration Guide
                  </h4>
                  <div className="space-y-2 text-sm text-orange-200">
                    <p><strong>Environment Variables:</strong></p>
                    <ul className="ml-6 space-y-1">
                      <li>• <code className="bg-slate-800 px-2 py-0.5 rounded">CLOUDFLARE_ENABLED=true</code> - Enable Cloudflare validation</li>
                      <li>• <code className="bg-slate-800 px-2 py-0.5 rounded">CLOUDFLARE_STRICT=true</code> - Block non-Cloudflare requests</li>
                    </ul>
                    <p className="mt-3"><strong>Country Blocking:</strong></p>
                    <p className="ml-6">Edit <code className="bg-slate-800 px-2 py-0.5 rounded">server/cloudflare-security.ts</code> to configure blocked/allowed countries</p>
                    <p className="mt-3"><strong>Documentation:</strong></p>
                    <p className="ml-6">See <code className="bg-slate-800 px-2 py-0.5 rounded">WAF-SETUP.md</code> for complete setup guide</p>
                  </div>
                </div>

                {/* Security Features */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Features Active
                  </h4>
                  <ul className="text-sm text-blue-200 space-y-1 ml-6">
                    <li>• Rate limiting: 100 req/15min (API), 5 req/15min (Auth)</li>
                    <li>• Helmet HTTP security headers enabled</li>
                    <li>• NoSQL injection sanitization active</li>
                    <li>• Session security with SameSite cookies</li>
                    <li>• CORS configured for production domains</li>
                    <li>• Trust proxy enabled for Cloudflare</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Country Blocking Management */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Country Blocking Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Control access based on geographic location using Cloudflare country detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Selector */}
                <div className="space-y-3">
                  <Label className="text-white">Blocking Mode</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant={countryBlockingMode === 'blacklist' ? 'default' : 'outline'}
                      onClick={() => setCountryBlockingMode('blacklist')}
                      className={countryBlockingMode === 'blacklist' ? 'bg-red-600 hover:bg-red-700' : 'border-red-500/30'}
                      data-testid="button-mode-blacklist"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Blacklist Mode (Block Specific Countries)
                    </Button>
                    <Button
                      variant={countryBlockingMode === 'whitelist' ? 'default' : 'outline'}
                      onClick={() => setCountryBlockingMode('whitelist')}
                      className={countryBlockingMode === 'whitelist' ? 'bg-green-600 hover:bg-green-700' : 'border-green-500/30'}
                      data-testid="button-mode-whitelist"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Whitelist Mode (Allow Only Specific Countries)
                    </Button>
                  </div>
                  <p className="text-sm text-purple-300">
                    {countryBlockingMode === 'blacklist' 
                      ? '🚫 Block access from selected countries, allow all others' 
                      : '✅ Only allow access from selected countries, block all others'}
                  </p>
                </div>

                {/* Add Country Input */}
                <div className="space-y-3">
                  <Label className="text-white">
                    {countryBlockingMode === 'blacklist' ? 'Add Country to Block' : 'Add Allowed Country'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCountryCode}
                      onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                      placeholder="Enter 2-letter country code (e.g., US, GB, CN)"
                      className="bg-slate-700 border-purple-500/30 text-white"
                      maxLength={2}
                      data-testid="input-country-code"
                    />
                    <Button
                      onClick={() => {
                        const code = newCountryCode.trim().toUpperCase();
                        if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
                          if (countryBlockingMode === 'blacklist') {
                            if (!blockedCountries.includes(code)) {
                              setBlockedCountries([...blockedCountries, code]);
                            }
                          } else {
                            if (!allowedCountries.includes(code)) {
                              setAllowedCountries([...allowedCountries, code]);
                            }
                          }
                          setNewCountryCode("");
                        } else {
                          toast({
                            title: "Invalid Country Code",
                            description: "Please enter a valid 2-letter ISO country code",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-add-country"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Blocked Countries List */}
                {countryBlockingMode === 'blacklist' && (
                  <div className="space-y-3">
                    <Label className="text-white flex items-center gap-2">
                      <X className="h-4 w-4 text-red-400" />
                      Blocked Countries ({blockedCountries.length})
                    </Label>
                    {blockedCountries.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {blockedCountries.map(code => (
                          <div
                            key={code}
                            className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                            data-testid={`blocked-country-${code}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getCountryFlag(code)}</span>
                              <div>
                                <p className="text-white font-medium">{getCountryName(code)}</p>
                                <p className="text-red-400 text-sm">{code}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setBlockedCountries(blockedCountries.filter(c => c !== code))}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              data-testid={`button-remove-blocked-${code}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-purple-300 text-sm">No countries blocked</p>
                    )}
                  </div>
                )}

                {/* Allowed Countries List */}
                {countryBlockingMode === 'whitelist' && (
                  <div className="space-y-3">
                    <Label className="text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-400" />
                      Allowed Countries ({allowedCountries.length})
                    </Label>
                    {allowedCountries.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {allowedCountries.map(code => (
                          <div
                            key={code}
                            className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                            data-testid={`allowed-country-${code}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getCountryFlag(code)}</span>
                              <div>
                                <p className="text-white font-medium">{getCountryName(code)}</p>
                                <p className="text-green-400 text-sm">{code}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAllowedCountries(allowedCountries.filter(c => c !== code))}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                              data-testid={`button-remove-allowed-${code}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-purple-300 text-sm">No countries in whitelist (all blocked)</p>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4 border-t border-purple-500/20">
                  <Button
                    onClick={() => updateCountryBlockingMutation.mutate()}
                    disabled={updateCountryBlockingMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-save-country-blocking"
                  >
                    {updateCountryBlockingMutation.isPending ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Country Blocking Settings
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    How It Works
                  </h4>
                  <ul className="text-sm text-blue-200 space-y-1 ml-6">
                    <li>• Uses Cloudflare's country detection from request headers</li>
                    <li>• Blocking happens at the middleware level (before routes)</li>
                    <li>• Changes take effect within 30 seconds (cache refresh)</li>
                    <li>• Requests without country headers are allowed (local development)</li>
                    <li>• Use 2-letter ISO country codes (US, GB, CN, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* IP-Email Detection */}
            {usersData && <IpEmailDetector users={usersData.users} />}
            
            {/* IP Whitelist Manager */}
            <IpWhitelistManager />
            
            {/* Device Sessions Tracking */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-cyan-400" />
                  Device Sessions & Browser Tracking
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Monitor user devices, browsers, and session activity in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userActivityData && (
                  <div className="space-y-6">
                    {/* Device Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Monitor className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-sm text-purple-300">Active Users</p>
                              <p className="text-2xl font-bold text-white">{userActivityData.users.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-5 w-5 text-green-400" />
                            <div>
                              <p className="text-sm text-purple-300">Mobile Users</p>
                              <p className="text-2xl font-bold text-white">
                                {userActivityData.users.filter(u => u.lastBrowserInfo?.deviceType === 'Mobile').length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Laptop className="h-5 w-5 text-purple-400" />
                            <div>
                              <p className="text-sm text-purple-300">Desktop Users</p>
                              <p className="text-2xl font-bold text-white">
                                {userActivityData.users.filter(u => u.lastBrowserInfo?.deviceType === 'Desktop').length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Wifi className="h-5 w-5 text-orange-400" />
                            <div>
                              <p className="text-sm text-purple-300">Unique IPs</p>
                              <p className="text-2xl font-bold text-white">
                                {userActivityData.users.filter(u => u.uniqueIPCount > 0).length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Device Sessions Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200">User</TableHead>
                            <TableHead className="text-purple-200">Device Type</TableHead>
                            <TableHead className="text-purple-200">Browser</TableHead>
                            <TableHead className="text-purple-200">Operating System</TableHead>
                            <TableHead className="text-purple-200">Last IP</TableHead>
                            <TableHead className="text-purple-200">Sessions</TableHead>
                            <TableHead className="text-purple-200">Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userActivityData.users.map((user) => {
                            const deviceIcon = user.lastBrowserInfo?.deviceType === 'Mobile' ? 
                              <Smartphone className="h-4 w-4 text-green-400" /> :
                              user.lastBrowserInfo?.deviceType === 'Tablet' ?
                              <Tablet className="h-4 w-4 text-blue-400" /> :
                              <Monitor className="h-4 w-4 text-purple-400" />;
                            
                            return (
                              <TableRow key={user.id} className="border-purple-500/10 hover:bg-slate-800/30" data-testid={`row-device-${user.id}`}>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="border-2 border-purple-500/30">
                                      <AvatarFallback className="bg-purple-600 text-white">
                                        {user.email.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-white" data-testid={`text-email-${user.id}`}>{user.email}</p>
                                      <p className="text-sm text-purple-300">
                                        ID: {user.publicId || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {deviceIcon}
                                    <Badge className="bg-slate-700 text-purple-200 border-purple-500/30" data-testid={`badge-device-${user.id}`}>
                                      {user.lastBrowserInfo?.deviceType || 'Unknown'}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="text-white font-medium" data-testid={`text-browser-${user.id}`}>
                                      {user.lastBrowserInfo?.browserName || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-purple-300">
                                      v{user.lastBrowserInfo?.browserVersion || 'Unknown'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-slate-700 text-cyan-200 border-cyan-500/30" data-testid={`badge-os-${user.id}`}>
                                    {user.lastBrowserInfo?.operatingSystem || 'Unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <code className="text-sm bg-slate-800 px-2 py-1 rounded text-purple-300" data-testid={`text-ip-${user.id}`}>
                                    {user.lastIP || "N/A"}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30" data-testid={`badge-sessions-${user.id}`}>
                                      {user.sessionCount || 0} sessions
                                    </Badge>
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                      {user.uniqueIPCount || 0} IPs
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="text-white text-sm" data-testid={`text-activity-${user.id}`}>
                                      {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                                    </p>
                                    <p className="text-purple-300 text-xs">
                                      {user.lastActivity ? new Date(user.lastActivity).toLocaleTimeString() : ''}
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  IP Security & Duplicate Detection
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Monitor user IP addresses and detect potential duplicate accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersData && (
                  <div className="space-y-6">
                    {/* IP Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-sm text-purple-300">Total Users</p>
                              <p className="text-2xl font-bold text-white">{usersData.users.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Wifi className="h-5 w-5 text-green-400" />
                            <div>
                              <p className="text-sm text-purple-300">Unique IPs</p>
                              <p className="text-2xl font-bold text-white">
                                {new Set([
                                  ...usersData.users.map(u => u.registrationIp).filter(Boolean),
                                  ...usersData.users.map(u => u.lastLoginIp).filter(Boolean)
                                ]).size}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <div>
                              <p className="text-sm text-purple-300">Suspicious</p>
                              <p className="text-2xl font-bold text-white">
                                {usersData.users.filter(user => 
                                  getDuplicateIpUsers(usersData.users, user).length > 0
                                ).length}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed IP List */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200">User</TableHead>
                            <TableHead className="text-purple-200">Registration IP</TableHead>
                            <TableHead className="text-purple-200">Country</TableHead>
                            <TableHead className="text-purple-200">Last Login IP</TableHead>
                            <TableHead className="text-purple-200">Duplicate Status</TableHead>
                            <TableHead className="text-purple-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersData.users.map((user) => {
                            const duplicates = getDuplicateIpUsers(usersData.users, user);
                            
                            const registrationIp = user.registrationIp || 'N/A';
                            const regIpType = detectIpType(user.registrationIp);
                            
                            const lastLoginIp = user.lastLoginIp || 'N/A';
                            const lastIpType = detectIpType(user.lastLoginIp);
                            
                            return (
                              <TableRow key={user.id} className="border-purple-500/10 hover:bg-slate-800/30">
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="border-2 border-purple-500/30">
                                      <AvatarFallback className="bg-purple-600 text-white">
                                        {user.email.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-white">{user.email}</p>
                                      <p className="text-sm text-purple-300">
                                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1.5">
                                    {regIpType === 'ipv6' && (
                                      <Badge className="w-fit bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs font-semibold">
                                        IPv6
                                      </Badge>
                                    )}
                                    {regIpType === 'ipv4' && (
                                      <Badge className="w-fit bg-green-500/20 text-green-300 border-green-500/30 text-xs font-semibold">
                                        IPv4
                                      </Badge>
                                    )}
                                    {regIpType === 'unknown' && (
                                      <Badge className="w-fit bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs font-semibold">
                                        Unknown
                                      </Badge>
                                    )}
                                    <code className="text-sm bg-slate-800 px-2 py-1 rounded text-purple-300">
                                      {registrationIp}
                                    </code>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                    <Globe className="h-3 w-3 mr-1" />
                                    {user.registrationCountry || "Unknown"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1.5">
                                    {lastIpType === 'ipv6' && (
                                      <Badge className="w-fit bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs font-semibold">
                                        IPv6
                                      </Badge>
                                    )}
                                    {lastIpType === 'ipv4' && (
                                      <Badge className="w-fit bg-green-500/20 text-green-300 border-green-500/30 text-xs font-semibold">
                                        IPv4
                                      </Badge>
                                    )}
                                    {lastIpType === 'unknown' && (
                                      <Badge className="w-fit bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs font-semibold">
                                        Unknown
                                      </Badge>
                                    )}
                                    <code className="text-sm bg-slate-800 px-2 py-1 rounded text-purple-300">
                                      {lastLoginIp}
                                    </code>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {duplicates.length > 0 ? (
                                    <div className="space-y-1">
                                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {duplicates.length} Duplicates
                                      </Badge>
                                      <div className="text-xs text-red-400">
                                        {duplicates.map(d => d.email).join(", ")}
                                      </div>
                                    </div>
                                  ) : (
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                      <Globe className="h-3 w-3 mr-1" />
                                      Unique
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // You can add more specific IP-related actions here
                                        toast({
                                          title: "📊 IP Analysis",
                                          description: `Analyzing IP history for ${user.email}...`,
                                        });
                                      }}
                                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                    >
                                      <Activity className="h-3 w-3 mr-1" />
                                      Analyze
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Advanced Analytics
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Revenue forecasting, player behavior, win/loss ratios, and peak hours analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Agent Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Create and manage agents who can process deposits and withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create Agent Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Create New Agent</h3>
                    <Button
                      onClick={() => setCreatingAgent(!creatingAgent)}
                      variant="outline"
                      className="bg-purple-600/20 border-purple-500/40 text-purple-200 hover:bg-purple-600/30"
                      data-testid="button-toggle-create-agent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {creatingAgent ? "Cancel" : "Create Agent"}
                    </Button>
                  </div>

                  {creatingAgent && (
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agent-email" className="text-purple-200">
                            Agent Email
                          </Label>
                          <Input
                            id="agent-email"
                            type="email"
                            value={agentEmail}
                            onChange={(e) => setAgentEmail(e.target.value)}
                            placeholder="agent@example.com"
                            className="bg-slate-700/50 border-purple-500/30 text-white"
                            data-testid="input-agent-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agent-password" className="text-purple-200">
                            Agent Password
                          </Label>
                          <Input
                            id="agent-password"
                            type="password"
                            value={agentPassword}
                            onChange={(e) => setAgentPassword(e.target.value)}
                            placeholder="Enter secure password"
                            className="bg-slate-700/50 border-purple-500/30 text-white"
                            data-testid="input-agent-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agent-commission" className="text-purple-200">
                            Commission Rate (0-1)
                          </Label>
                          <Input
                            id="agent-commission"
                            type="number"
                            step="0.0001"
                            min="0"
                            max="1"
                            value={agentCommissionRate}
                            onChange={(e) => setAgentCommissionRate(e.target.value)}
                            placeholder="0.0500"
                            className="bg-slate-700/50 border-purple-500/30 text-white"
                            data-testid="input-agent-commission"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (agentEmail && agentPassword) {
                            createAgentMutation.mutate({
                              email: agentEmail,
                              password: agentPassword,
                              commissionRate: agentCommissionRate
                            });
                          }
                        }}
                        disabled={createAgentMutation.isPending || !agentEmail || !agentPassword}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-create-agent"
                      >
                        {createAgentMutation.isPending ? (
                          <>
                            <Activity className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Create Agent
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Agents List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Existing Agents ({agentsData?.total || 0})
                  </h3>
                  
                  {agentsData?.agents && agentsData.agents.length > 0 ? (
                    <div className="rounded-lg border border-purple-500/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20 hover:bg-purple-600/10">
                            <TableHead className="text-purple-200">Agent</TableHead>
                            <TableHead className="text-purple-200">Public ID</TableHead>
                            <TableHead className="text-purple-200">Commission Rate</TableHead>
                            <TableHead className="text-purple-200">Earnings</TableHead>
                            <TableHead className="text-purple-200">Status</TableHead>
                            <TableHead className="text-purple-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentsData.agents.map((agent) => (
                            <TableRow key={agent.id} className="border-purple-500/20 hover:bg-purple-600/5">
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-white">{agent.email}</div>
                                  <div className="text-sm text-purple-300">
                                    Created: {new Date(agent.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-purple-200 border-purple-500/40">
                                  {agent.publicId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {editingAgentCommission === agent.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      max="1"
                                      value={agentCommissionValue}
                                      onChange={(e) => setAgentCommissionValue(e.target.value)}
                                      className="w-24 bg-slate-700/50 border-purple-500/30 text-white"
                                      data-testid={`input-commission-${agent.id}`}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateAgentCommissionMutation.mutate({
                                          agentId: agent.id,
                                          commissionRate: agentCommissionValue
                                        });
                                      }}
                                      className="bg-green-600 hover:bg-green-700"
                                      data-testid={`button-save-commission-${agent.id}`}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingAgentCommission(null);
                                        setAgentCommissionValue("");
                                      }}
                                      className="border-purple-500/40 text-purple-200"
                                      data-testid={`button-cancel-commission-${agent.id}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">
                                      {(parseFloat(agent.agentProfile.commissionRate) * 100).toFixed(2)}%
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingAgentCommission(agent.id);
                                        setAgentCommissionValue(agent.agentProfile.commissionRate);
                                      }}
                                      className="text-purple-400 hover:text-purple-300"
                                      data-testid={`button-edit-commission-${agent.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400 font-medium">
                                    ${parseFloat(agent.agentProfile.earningsBalance).toFixed(2)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingAgentBalance(agent.id);
                                      setSelectedAgent(agent);
                                      setAgentBalanceAdjustment("");
                                    }}
                                    className="text-purple-400 hover:text-purple-300"
                                    data-testid={`button-edit-balance-${agent.id}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={agent.agentProfile.isActive ? "default" : "destructive"}
                                  className={agent.agentProfile.isActive 
                                    ? "bg-green-600/20 text-green-400 border-green-500/40"
                                    : "bg-red-600/20 text-red-400 border-red-500/40"
                                  }
                                >
                                  {agent.agentProfile.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleAgentStatusMutation.mutate(agent.id)}
                                    disabled={toggleAgentStatusMutation.isPending}
                                    className={agent.agentProfile.isActive 
                                      ? "border-red-500/40 text-red-400 hover:bg-red-600/10"
                                      : "border-green-500/40 text-green-400 hover:bg-green-600/10"
                                    }
                                    data-testid={`button-toggle-agent-${agent.id}`}
                                  >
                                    {agent.agentProfile.isActive ? (
                                      <>
                                        <UserX className="h-3 w-3 mr-1" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        Activate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-purple-300">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No agents created yet. Create your first agent to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <div className="grid gap-6">
                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      Financial Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                        <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-purple-300">Average Bet</p>
                        <p className="text-2xl font-bold text-white">${parseFloat(analytics.averageBetSize).toFixed(2)}</p>
                      </div>
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                        <BarChart3 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-purple-300">Total Volume</p>
                        <p className="text-2xl font-bold text-white">${parseFloat(analytics.totalVolume).toFixed(2)}</p>
                      </div>
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                        <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-purple-300">House Edge</p>
                        <p className="text-2xl font-bold text-green-400">
                          {((parseFloat(analytics.totalProfit) / parseFloat(analytics.totalVolume)) * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                        <Gamepad2 className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                        <p className="text-sm text-purple-300">Games/Day</p>
                        <p className="text-2xl font-bold text-white">{Math.round(analytics.totalGames / 7)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Game History */}
                <Card className="admin-card admin-glow border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      Recent Game History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gameHistory && gameHistory.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {gameHistory.slice(0, 10).map((game) => (
                          <div
                            key={game.id}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-purple-500/20"
                          >
                            <div className="flex items-center space-x-3">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  game.result === 0 ? 'bg-purple-500 text-white' :
                                  game.result !== null && game.result % 2 === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                }`}
                              >
                                {game.result}
                              </div>
                              <div>
                                <p className="text-white font-medium">Period {cleanGameIdForDisplay(game.gameId)}</p>
                                <p className="text-sm text-purple-300">
                                  {new Date(game.startTime).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-mono">${parseFloat(game.totalBetsAmount).toFixed(2)}</p>
                              <p className="text-sm text-green-400">+${parseFloat(game.houseProfit).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                        <p className="text-purple-300">No game history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Referrals Tracking Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <ReferralsTracking />
          </TabsContent>

          {/* Traffic Analytics Tab */}
          <TabsContent value="traffic" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Traffic & Visitor Analytics
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Monitor daily visitors, page views, and traffic trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="user-mgmt" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Search users and manage passwords
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User Search */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-user-search"
                      placeholder="Search by email or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-300"
                    />
                    <Button 
                      onClick={() => searchUsers()}
                      disabled={!searchQuery.trim()}
                      data-testid="button-search-users"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Search
                    </Button>
                  </div>
                  
                  {searchResults && searchResults.users.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-purple-200">Search Results ({searchResults.total})</h3>
                      <div className="space-y-2">
                        {searchResults.users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-purple-500/10">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-purple-600">
                                  {user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-white" data-testid={`text-user-email-${user.id}`}>
                                    {user.email}
                                  </p>
                                  {user.isBanned && (
                                    <Badge 
                                      variant="destructive" 
                                      className="bg-red-600/20 text-red-400 border-red-500/40"
                                      data-testid={`badge-banned-${user.id}`}
                                    >
                                      {user.bannedUntil ? 'Temporary Ban' : 'Permanent Ban'}
                                    </Badge>
                                  )}
                                  {user.wingoMode && (
                                    <Badge 
                                      className="bg-green-600/20 text-green-400 border-green-500/40"
                                      data-testid={`badge-wingo-mode-${user.id}`}
                                    >
                                      Wingo Mode ON
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-purple-300">
                                  Balance: ${parseFloat(user.balance).toFixed(2)} • {user.role} • {user.isActive ? 'Active' : 'Inactive'}
                                </p>
                                {user.isBanned && user.banReason && (
                                  <p className="text-xs text-red-400 mt-1">
                                    Reason: {user.banReason}
                                    {user.bannedUntil && ` (Until: ${new Date(user.bannedUntil).toLocaleDateString()})`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPassword(user.id);
                                  setNewPassword("");
                                }}
                                data-testid={`button-edit-password-${user.id}`}
                                className="border-purple-500/20 text-purple-200 hover:bg-purple-600/20"
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                Reset Password
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingWithdrawalPassword(user.id);
                                  setNewWithdrawalPassword("");
                                }}
                                data-testid={`button-edit-withdrawal-password-${user.id}`}
                                className="border-blue-500/20 text-blue-200 hover:bg-blue-600/20"
                              >
                                <Lock className="h-3 w-3 mr-1" />
                                Reset Withdrawal Password
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleWingoModeMutation.mutate(user.id)}
                                disabled={toggleWingoModeMutation.isPending}
                                data-testid={`button-toggle-wingo-mode-${user.id}`}
                                className={`${user.wingoMode ? 'border-orange-500/30 text-orange-300 hover:bg-orange-500/10' : 'border-green-500/30 text-green-300 hover:bg-green-500/10'}`}
                              >
                                <Gamepad2 className="h-3 w-3 mr-1" />
                                {user.wingoMode ? 'Disable Wingo' : 'Enable Wingo'}
                              </Button>
                              {user.isBanned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unbanUserMutation.mutate(user.id)}
                                  disabled={unbanUserMutation.isPending}
                                  className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                                  data-testid={`button-unban-${user.id}`}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Unban
                                </Button>
                              ) : user.role === 'admin' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="border-gray-500/30 text-gray-400 cursor-not-allowed"
                                  data-testid={`button-ban-disabled-${user.id}`}
                                  title="Admin users cannot be banned"
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Ban User (Admin)
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setBanningUser(user);
                                    setBanReason("");
                                    setBanDuration("1");
                                    setBanPermanent(false);
                                  }}
                                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                  data-testid={`button-ban-${user.id}`}
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Ban User
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {searchResults && searchResults.users.length === 0 && searchQuery && (
                    <p className="text-purple-300 text-sm">No users found matching your search.</p>
                  )}
                </div>

                {/* Password Update Modal */}
                {editingPassword && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4 admin-card border-purple-500/20">
                      <CardHeader>
                        <CardTitle className="text-purple-200">Update Password</CardTitle>
                        <CardDescription className="text-purple-300">
                          Enter a new password for this user
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="new-password" className="text-purple-200">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            data-testid="input-new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-slate-800/50 border-purple-500/20 text-white"
                            placeholder="Enter new password (min 8 characters)"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingPassword(null);
                              setNewPassword("");
                            }}
                            data-testid="button-cancel-password"
                            className="border-purple-500/20"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => updatePasswordMutation.mutate({ userId: editingPassword, newPassword })}
                            disabled={newPassword.length < 8 || updatePasswordMutation.isPending}
                            data-testid="button-update-password"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Withdrawal Password Update Modal */}
                {editingWithdrawalPassword && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4 admin-card border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="text-blue-200">Update Withdrawal Password</CardTitle>
                        <CardDescription className="text-blue-300">
                          Enter a new withdrawal password for this user
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="new-withdrawal-password" className="text-blue-200">New Withdrawal Password</Label>
                          <Input
                            id="new-withdrawal-password"
                            type="password"
                            data-testid="input-new-withdrawal-password"
                            value={newWithdrawalPassword}
                            onChange={(e) => setNewWithdrawalPassword(e.target.value)}
                            className="bg-slate-800/50 border-blue-500/20 text-white"
                            placeholder="Enter new withdrawal password (min 6 characters)"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingWithdrawalPassword(null);
                              setNewWithdrawalPassword("");
                            }}
                            data-testid="button-cancel-withdrawal-password"
                            className="border-blue-500/20"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => updateWithdrawalPasswordMutation.mutate({ userId: editingWithdrawalPassword, newWithdrawalPassword })}
                            disabled={newWithdrawalPassword.length < 6 || updateWithdrawalPasswordMutation.isPending}
                            data-testid="button-update-withdrawal-password"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {updateWithdrawalPasswordMutation.isPending ? "Updating..." : "Update Withdrawal Password"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Quick Settings Panel */}
            <Card className="admin-card admin-glow border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-200 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Configuration
                </CardTitle>
                <CardDescription className="text-green-300">
                  Essential system controls for game operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Withdrawal Toggle */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        <h3 className="text-white font-medium">Withdrawal System</h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const currentStatus = systemSettings?.find(s => s.key === 'withdrawals_enabled')?.value || 'true';
                          const newStatus = currentStatus === 'true' ? 'false' : 'true';
                          updateSettingMutation.mutate({
                            key: 'withdrawals_enabled',
                            value: newStatus,
                            description: 'Controls whether users can access withdrawal functionality'
                          });
                        }}
                        disabled={updateSettingMutation.isPending}
                        className={`
                          ${systemSettings?.find(s => s.key === 'withdrawals_enabled')?.value === 'false' 
                            ? 'bg-red-600 hover:bg-red-700 border-red-500' 
                            : 'bg-green-600 hover:bg-green-700 border-green-500'
                          } text-white font-semibold
                        `}
                        data-testid="button-toggle-withdrawals"
                      >
                        {systemSettings?.find(s => s.key === 'withdrawals_enabled')?.value === 'false' ? '⛔ Disabled' : '✅ Enabled'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-300">
                      {systemSettings?.find(s => s.key === 'withdrawals_enabled')?.value === 'false' 
                        ? 'Users cannot see or access withdrawal options' 
                        : 'Users can request withdrawals normally'}
                    </p>
                  </div>
                  
                  {/* Minimum Withdrawal VIP Level */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-purple-400" />
                        <h3 className="text-white font-medium">Minimum Withdrawal Level</h3>
                      </div>
                      <Select
                        value={systemSettings?.find(s => s.key === 'minimum_withdrawal_vip_level')?.value || 'lv1'}
                        onValueChange={(value) => {
                          updateSettingMutation.mutate({
                            key: 'minimum_withdrawal_vip_level',
                            value: value,
                            description: 'Minimum VIP level required for withdrawals (lv1, lv2, vip, vip1-vip7)'
                          });
                        }}
                        disabled={updateSettingMutation.isPending}
                      >
                        <SelectTrigger className="w-32 bg-slate-700 border-purple-500/30 text-white" data-testid="select-min-vip-level">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                          <SelectItem value="lv1">Level 1</SelectItem>
                          <SelectItem value="lv2">Level 2</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="vip1">VIP 1</SelectItem>
                          <SelectItem value="vip2">VIP 2</SelectItem>
                          <SelectItem value="vip3">VIP 3</SelectItem>
                          <SelectItem value="vip4">VIP 4</SelectItem>
                          <SelectItem value="vip5">VIP 5</SelectItem>
                          <SelectItem value="vip6">VIP 6</SelectItem>
                          <SelectItem value="vip7">VIP 7</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-gray-300">
                      {systemSettings ? (
                        systemSettings.find(s => s.key === 'minimum_withdrawal_vip_level')?.value === 'lv1' 
                          ? 'All users can withdraw' 
                          : `Only ${systemSettings.find(s => s.key === 'minimum_withdrawal_vip_level')?.value?.toUpperCase()} and above can withdraw`
                      ) : 'Loading...'}
                    </p>
                  </div>
                  
                  {/* Agent Withdrawal Toggle */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-orange-400" />
                        <h3 className="text-white font-medium">Agent Withdrawals</h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const currentStatus = systemSettings?.find(s => s.key === 'agent_withdrawals_enabled')?.value || 'true';
                          const newStatus = currentStatus === 'true' ? 'false' : 'true';
                          updateSettingMutation.mutate({
                            key: 'agent_withdrawals_enabled',
                            value: newStatus,
                            description: 'Controls whether agents can access withdrawal functionality (deposits remain enabled)'
                          });
                        }}
                        disabled={updateSettingMutation.isPending}
                        className={`
                          ${systemSettings?.find(s => s.key === 'agent_withdrawals_enabled')?.value === 'false' 
                            ? 'bg-red-600 hover:bg-red-700 border-red-500' 
                            : 'bg-green-600 hover:bg-green-700 border-green-500'
                          } text-white font-semibold
                        `}
                        data-testid="button-toggle-agent-withdrawals"
                      >
                        {systemSettings?.find(s => s.key === 'agent_withdrawals_enabled')?.value === 'false' ? '⛔ Suspended' : '✅ Enabled'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-300">
                      {systemSettings?.find(s => s.key === 'agent_withdrawals_enabled')?.value === 'false' 
                        ? 'Agents can only deposit - withdrawals are suspended' 
                        : 'Agents can both deposit and withdraw normally'}
                    </p>
                  </div>
                  
                  {/* Wingo Mode Feature Toggle */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-pink-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="h-5 w-5 text-pink-400" />
                        <h3 className="text-white font-medium">Wingo Mode Feature</h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const currentStatus = systemSettings?.find(s => s.key === 'wingo_mode_enabled')?.value || 'true';
                          const newStatus = currentStatus === 'true' ? 'false' : 'true';
                          updateSettingMutation.mutate({
                            key: 'wingo_mode_enabled',
                            value: newStatus,
                            description: 'Controls whether Wingo Mode feature is available to users'
                          });
                        }}
                        disabled={updateSettingMutation.isPending}
                        className={`
                          ${systemSettings?.find(s => s.key === 'wingo_mode_enabled')?.value === 'false' 
                            ? 'bg-red-600 hover:bg-red-700 border-red-500' 
                            : 'bg-green-600 hover:bg-green-700 border-green-500'
                          } text-white font-semibold
                        `}
                        data-testid="button-toggle-wingo-mode"
                      >
                        {systemSettings?.find(s => s.key === 'wingo_mode_enabled')?.value === 'false' ? '⛔ Disabled' : '✅ Enabled'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-300">
                      {systemSettings?.find(s => s.key === 'wingo_mode_enabled')?.value === 'false' 
                        ? 'Wingo Mode is hidden from all users - feature is disabled globally' 
                        : 'Users can enable/disable Wingo Mode in their account settings'}
                    </p>
                  </div>
                  
                  {/* PWA App Version */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-white font-medium">PWA App Version</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="v2.0.1"
                          value={systemSettings?.find(s => s.key === 'app_version')?.value || 'v2.0.1'}
                          onChange={(e) => {
                            updateSettingMutation.mutate({
                              key: 'app_version',
                              value: e.target.value,
                              description: 'PWA app version number displayed to users'
                            });
                          }}
                          className="w-28 text-center bg-slate-700 border-cyan-500/30 text-white font-mono"
                          data-testid="input-app-version"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Version number shown in PWA app (Account page). Only visible to users in standalone PWA mode.
                    </p>
                  </div>
                  
                  {/* Profit Configuration */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-white font-medium">House Profit Margin</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={localProfitPercentage || systemSettings?.find(s => s.key === 'house_profit_percentage')?.value || '20'}
                          onChange={(e) => {
                            const value = e.target.value;
                            setLocalProfitPercentage(value);
                          }}
                          className="w-20 text-center bg-slate-700 border-yellow-500/30 text-white"
                          data-testid="input-profit-percentage"
                        />
                        <span className="text-yellow-400 font-bold">%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Algorithm ensures {localProfitPercentage || systemSettings?.find(s => s.key === 'house_profit_percentage')?.value || '20'}% profit from total bets.
                      Users lose {localProfitPercentage || systemSettings?.find(s => s.key === 'house_profit_percentage')?.value || '20'}%, win {100 - parseInt(localProfitPercentage || systemSettings?.find(s => s.key === 'house_profit_percentage')?.value || '20')}%.
                    </p>
                  </div>
                  
                  {/* Fee Configuration */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-blue-400" />
                        <h3 className="text-white font-medium">Betting Fee</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={localFeePercentage || systemSettings?.find(s => s.key === 'betting_fee_percentage')?.value || '3'}
                          onChange={(e) => {
                            const value = e.target.value;
                            setLocalFeePercentage(value);
                          }}
                          className="w-20 text-center bg-slate-700 border-blue-500/30 text-white"
                          data-testid="input-fee-percentage"
                        />
                        <span className="text-blue-400 font-bold">%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Fee of {localFeePercentage || systemSettings?.find(s => s.key === 'betting_fee_percentage')?.value || '3'}% is deducted from winnings only.
                      Winners receive {100 - parseFloat(localFeePercentage || systemSettings?.find(s => s.key === 'betting_fee_percentage')?.value || '3')}% of their total payout.
                    </p>
                  </div>
                  
                  {/* Betting Requirement Percentage */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-orange-400" />
                        <h3 className="text-white font-medium">Betting Requirement</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="10"
                          max="100"
                          step="5"
                          value={systemSettings?.find(s => s.key === 'betting_requirement_percentage')?.value || '60'}
                          onChange={(e) => {
                            updateSettingMutation.mutate({
                              key: 'betting_requirement_percentage',
                              value: e.target.value,
                              description: 'Percentage of deposit users must bet before withdrawal'
                            });
                          }}
                          className="w-20 text-center bg-slate-700 border-orange-500/30 text-white"
                          data-testid="input-betting-requirement-percentage"
                        />
                        <span className="text-orange-400 font-bold">%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Users must bet {systemSettings?.find(s => s.key === 'betting_requirement_percentage')?.value || '60'}% of their total deposits before they can withdraw.
                      If user deposits $10, they must bet ${((parseFloat(systemSettings?.find(s => s.key === 'betting_requirement_percentage')?.value || '60') / 100) * 10).toFixed(2)} to unlock withdrawal.
                    </p>
                  </div>
                  
                  {/* Withdrawal Cooldown Period */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-red-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <h3 className="text-white font-medium">Withdrawal Cooldown</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          step="1"
                          value={systemSettings?.find(s => s.key === 'withdrawal_cooldown_hours')?.value || '24'}
                          onChange={(e) => {
                            updateSettingMutation.mutate({
                              key: 'withdrawal_cooldown_hours',
                              value: e.target.value,
                              description: 'Hours users must wait between withdrawal requests'
                            });
                          }}
                          className="w-20 text-center bg-slate-700 border-red-500/30 text-white"
                          data-testid="input-withdrawal-cooldown"
                        />
                        <span className="text-red-400 font-bold">hrs</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Users must wait {systemSettings?.find(s => s.key === 'withdrawal_cooldown_hours')?.value || '24'} hours between withdrawal requests. This applies even if admin cancels the previous request.
                    </p>
                  </div>
                  
                  {/* Algorithm Selection */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-purple-500/20 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-400" />
                        <h3 className="text-white font-medium">Game Algorithm</h3>
                      </div>
                      <Select
                        value={systemSettings?.find(s => s.key === 'game_algorithm')?.value || 'profit_guaranteed'}
                        onValueChange={(value) => {
                          updateSettingMutation.mutate({
                            key: 'game_algorithm',
                            value: value,
                            description: 'Controls how game results are determined'
                          });
                        }}
                        data-testid="select-algorithm"
                      >
                        <SelectTrigger className="w-48 bg-slate-700 border-purple-500/30 text-white">
                          <SelectValue placeholder="Select algorithm" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/20">
                          <SelectItem value="fair_random" className="text-white hover:bg-purple-600/20">
                            🎲 Fair Random
                          </SelectItem>
                          <SelectItem value="profit_guaranteed" className="text-white hover:bg-purple-600/20">
                            💰 Profit Guaranteed
                          </SelectItem>
                          <SelectItem value="player_favored" className="text-white hover:bg-purple-600/20">
                            🎯 Player Favored
                          </SelectItem>
                          <SelectItem value="percentage_control" className="text-white hover:bg-purple-600/20">
                            📊 Percentage Control
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-300">
                      {(() => {
                        const currentAlgorithm = systemSettings?.find(s => s.key === 'game_algorithm')?.value || 'profit_guaranteed';
                        switch (currentAlgorithm) {
                          case 'fair_random':
                            return '🎲 Results are completely random and fair - no bias toward house or players.';
                          case 'player_favored':
                            return '🎯 Results slightly favor players - 60% chance for favorable outcomes.';
                          case 'percentage_control':
                            return '📊 Simple percentage control - House wins X% of rounds, higher bet amounts always lose.';
                          case 'profit_guaranteed':
                          default:
                            return '💰 Results are biased to maintain target profit margin for the house.';
                        }
                      })()}
                    </div>
                    
                    {/* House Win Percentage - Only show for percentage_control algorithm */}
                    {systemSettings?.find(s => s.key === 'game_algorithm')?.value === 'percentage_control' && (
                      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-orange-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-orange-400" />
                            <span className="text-white font-medium">House Win Percentage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={systemSettings?.find(s => s.key === 'house_win_percentage')?.value || '60'}
                              onChange={(e) => {
                                updateSettingMutation.mutate({
                                  key: 'house_win_percentage',
                                  value: e.target.value,
                                  description: 'House win percentage for percentage control algorithm'
                                });
                              }}
                              className="w-20 text-center bg-slate-600 border-orange-500/30 text-white"
                              data-testid="input-house-win-percentage"
                            />
                            <span className="text-orange-400 font-bold">%</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          🏦 House wins: {systemSettings?.find(s => s.key === 'house_win_percentage')?.value || '60'}% | 
                          🎮 Players win: {100 - parseInt(systemSettings?.find(s => s.key === 'house_win_percentage')?.value || '60')}%
                        </p>
                        <p className="text-xs text-orange-400 mt-1">
                          ⚠️ Higher bet amounts will ALWAYS lose when house wins. No profit tracking - each game independent.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Telegram Support Link Configuration */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/20 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-white font-medium">Customer Support Telegram Link</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="https://t.me/your_support"
                          value={systemSettings?.find(s => s.key === 'telegram_support_link')?.value || ''}
                          onChange={(e) => {
                            updateSettingMutation.mutate({
                              key: 'telegram_support_link',
                              value: e.target.value,
                              description: 'Telegram link for customer support'
                            });
                          }}
                          className="w-80 bg-slate-700 border-cyan-500/30 text-white"
                          data-testid="input-telegram-support-link"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = systemSettings?.find(s => s.key === 'telegram_support_link')?.value;
                            if (link) {
                              navigator.clipboard.writeText(link);
                              toast({
                                title: "Copied!",
                                description: "Telegram link copied to clipboard",
                              });
                            }
                          }}
                          className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                          data-testid="button-copy-telegram-link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      This link will be displayed in the Customer Support section on user accounts.
                      Users can click to contact support via Telegram.
                    </p>
                  </div>
                  
                  {/* Coin Flip Win Probability Configuration */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-amber-500/20 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-400" />
                        <h3 className="text-white font-medium">Coin Flip Win Probability</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={systemSettings?.find(s => s.key === 'coin_flip_win_probability')?.value || '50'}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateSettingMutation.mutate({
                              key: 'coin_flip_win_probability',
                              value: value,
                              description: 'Player win probability for coin flip game (percentage)'
                            });
                          }}
                          className="w-20 text-center bg-slate-700 border-amber-500/30 text-white"
                          data-testid="input-coin-flip-win-probability"
                        />
                        <span className="text-amber-400 font-bold">%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      Player win chance: {systemSettings?.find(s => s.key === 'coin_flip_win_probability')?.value || '50'}% | 
                      Loss chance: {100 - parseInt(systemSettings?.find(s => s.key === 'coin_flip_win_probability')?.value || '50')}%
                    </p>
                    <p className="text-xs text-amber-400 mt-1">
                      💡 Set to 25% for 75% loss probability, 50% for fair game
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Bonus Configuration */}
            <Card className="admin-card admin-glow border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-200 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Bonus Settings
                </CardTitle>
                <CardDescription className="text-green-300">
                  Configure coin rewards for genuine referrals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Referral Bonus Amount */}
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-green-500/20 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-green-400" />
                        <h3 className="text-white font-medium">Referral Bonus Amount (Coins)</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={localReferralBonus || (systemSettings?.find(s => s.key === 'referral_bonus_amount')?.value ? parseFloat(systemSettings.find(s => s.key === 'referral_bonus_amount')!.value).toFixed(0) : '299')}
                          onChange={(e) => setLocalReferralBonus(e.target.value)}
                          className="w-32 text-center bg-slate-700 border-green-500/30 text-white"
                          data-testid="input-referral-bonus-amount"
                        />
                        <span className="text-green-400 font-bold">Coins</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">
                      When a referred user makes their first deposit of $10 or more, the referrer will receive {parseFloat(localReferralBonus || systemSettings?.find(s => s.key === 'referral_bonus_amount')?.value || '2.99').toFixed(0)} coins.
                    </p>
                    <p className="text-xs text-green-400 mt-2">
                      💡 This bonus is automatically credited to the referrer's balance AND commission balance (for withdrawal)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* APK Build Configuration */}
            <Card className="admin-card admin-glow border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-200 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile APK Configuration
                </CardTitle>
                <CardDescription className="text-blue-300">
                  Configure backend server URL and rebuild production APK
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-800/30 rounded-lg border border-blue-500/20">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="backend-server-url" className="text-blue-200 mb-2 block">
                        Backend Server URL
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="backend-server-url"
                          type="url"
                          placeholder="https://your-project.example.com"
                          value={systemSettings?.find(s => s.key === 'backend_server_url')?.value || ''}
                          onChange={(e) => {
                            updateSettingMutation.mutate({
                              key: 'backend_server_url',
                              value: e.target.value,
                              description: 'Backend server URL for mobile APK configuration'
                            });
                          }}
                          className="flex-1 bg-slate-700 border-blue-500/30 text-white"
                          data-testid="input-backend-server-url"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const url = systemSettings?.find(s => s.key === 'backend_server_url')?.value;
                            if (url) {
                              navigator.clipboard.writeText(url);
                              toast({
                                title: "Copied!",
                                description: "Server URL copied to clipboard",
                              });
                            }
                          }}
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-300 mt-2">
                        This URL will be embedded in the mobile APK. Mobile app will connect to this server.
                      </p>
                    </div>

                    <div className="border-t border-blue-500/20 pt-4">
                      <Button
                        onClick={async () => {
                          const serverUrl = systemSettings?.find(s => s.key === 'backend_server_url')?.value;
                          
                          if (!serverUrl) {
                            toast({
                              title: "❌ No Server URL",
                              description: "Please set the backend server URL first",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            const res = await apiRequest('POST', '/api/admin/rebuild-apk', { serverUrl });
                            const data = await res.json();
                            
                            toast({
                              title: "🔨 APK Rebuild Started",
                              description: data.message + " This process runs in background.",
                            });
                          } catch (error) {
                            toast({
                              title: "❌ Rebuild Failed",
                              description: "Failed to start APK rebuild. Check server logs.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!systemSettings?.find(s => s.key === 'backend_server_url')?.value}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                        data-testid="button-rebuild-apk"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Rebuild Production APK
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">
                        ⏱️ Build process takes 2-3 minutes. New APK will be available at /downloads/3xbet-release.apk
                      </p>
                    </div>

                    <div className="border-t border-blue-500/20 pt-4">
                      <h4 className="text-sm font-medium text-blue-200 mb-2">ℹ️ How it works:</h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Updates Capacitor config with your server URL</li>
                        <li>• Builds production-optimized frontend</li>
                        <li>• Compiles signed Android APK</li>
                        <li>• APK automatically connects to your backend</li>
                        <li>• Users download pre-configured app</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Admin Dashboard Theme Switcher */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Dashboard Theme
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Customize the look and feel of your admin dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { id: 'purple', name: 'Purple Magic', gradient: 'linear-gradient(135deg, rgb(99 102 241) 0%, rgb(139 92 246) 50%, rgb(168 85 247) 100%)', icon: '🔮' },
                    { id: 'ocean', name: 'Ocean Blue', gradient: 'linear-gradient(135deg, rgb(14 165 233) 0%, rgb(59 130 246) 50%, rgb(96 165 250) 100%)', icon: '🌊' },
                    { id: 'emerald', name: 'Emerald Green', gradient: 'linear-gradient(135deg, rgb(16 185 129) 0%, rgb(34 197 94) 50%, rgb(74 222 128) 100%)', icon: '💎' },
                    { id: 'sunset', name: 'Sunset Orange', gradient: 'linear-gradient(135deg, rgb(249 115 22) 0%, rgb(236 72 153) 50%, rgb(192 132 252) 100%)', icon: '🌅' },
                    { id: 'midnight', name: 'Midnight Dark', gradient: 'linear-gradient(135deg, rgb(30 41 59) 0%, rgb(51 65 85) 50%, rgb(71 85 105) 100%)', icon: '🌙' },
                    { id: 'royal', name: 'Royal Gold', gradient: 'linear-gradient(135deg, rgb(234 179 8) 0%, rgb(202 138 4) 50%, rgb(161 98 7) 100%)', icon: '👑' },
                    { id: 'crimson', name: 'Crimson Red', gradient: 'linear-gradient(135deg, rgb(239 68 68) 0%, rgb(244 63 94) 50%, rgb(236 72 153) 100%)', icon: '🔥' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setAdminTheme(theme.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        adminTheme === theme.id
                          ? 'border-white shadow-lg shadow-purple-500/50 scale-105'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{ background: theme.gradient }}
                      data-testid={`theme-${theme.id}`}
                    >
                      <div className="flex flex-col items-center gap-2 text-white">
                        <span className="text-3xl">{theme.icon}</span>
                        <span className="text-sm font-semibold">{theme.name}</span>
                        {adminTheme === theme.id && (
                          <div className="absolute top-2 right-2 bg-white text-purple-600 rounded-full p-1">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-purple-200 text-sm font-medium mb-2">🎨 Theme Preview</p>
                  <p className="text-purple-300 text-sm">
                    Your selected theme is <span className="font-bold text-white">{
                      adminTheme === 'purple' ? 'Purple Magic' :
                      adminTheme === 'ocean' ? 'Ocean Blue' :
                      adminTheme === 'emerald' ? 'Emerald Green' :
                      adminTheme === 'sunset' ? 'Sunset Orange' :
                      adminTheme === 'midnight' ? 'Midnight Dark' :
                      adminTheme === 'royal' ? 'Royal Gold' :
                      adminTheme === 'crimson' ? 'Crimson Red' : ''
                    }</span>. The theme will automatically save and apply across your admin dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced System Settings
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Manage API keys and detailed system configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Christmas Mode Toggle */}
                <div className="p-4 bg-gradient-to-r from-red-900/20 to-green-900/20 rounded-lg border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🎄</div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Christmas Mode</h3>
                        <p className="text-xs text-gray-300">
                          Enable festive snow animation across the platform
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={systemSettings?.find(s => s.key === 'christmas_mode_enabled')?.value === 'true'}
                      onCheckedChange={(checked) => {
                        updateSettingMutation.mutate({
                          key: 'christmas_mode_enabled',
                          value: checked ? 'true' : 'false',
                          description: 'Enable/Disable Christmas theme with snow animation',
                          isEncrypted: false
                        });
                      }}
                      data-testid="switch-christmas-mode"
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                  {systemSettings?.find(s => s.key === 'christmas_mode_enabled')?.value === 'true' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-green-300 flex items-center gap-2">
                        <span>✨</span>
                        <span>Snow animation is active across all pages</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Valentine Mode Toggle */}
                <div className="p-4 bg-gradient-to-r from-pink-900/20 to-red-900/20 rounded-lg border border-pink-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">💕</div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Valentine Mode</h3>
                        <p className="text-xs text-gray-300">
                          Enable romantic falling hearts animation across the platform
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={systemSettings?.find(s => s.key === 'valentine_mode_enabled')?.value === 'true'}
                      onCheckedChange={(checked) => {
                        updateSettingMutation.mutate({
                          key: 'valentine_mode_enabled',
                          value: checked ? 'true' : 'false',
                          description: 'Enable/Disable Valentine theme with falling hearts animation',
                          isEncrypted: false
                        });
                      }}
                      data-testid="switch-valentine-mode"
                      className="data-[state=checked]:bg-pink-600"
                    />
                  </div>
                  {systemSettings?.find(s => s.key === 'valentine_mode_enabled')?.value === 'true' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-pink-300 flex items-center gap-2">
                        <span>💕</span>
                        <span>Hearts animation is active across all pages</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Telegram Login Toggle */}
                <div className="p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">📱</div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Telegram Login</h3>
                        <p className="text-xs text-gray-300">
                          Enable Telegram login widget on login page and Telegram connect in account section
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={systemSettings?.find(s => s.key === 'telegram_login_enabled')?.value !== 'false'}
                      onCheckedChange={(checked) => {
                        updateSettingMutation.mutate({
                          key: 'telegram_login_enabled',
                          value: checked ? 'true' : 'false',
                          description: 'Enable/Disable Telegram login and connect features',
                          isEncrypted: false
                        });
                      }}
                      data-testid="switch-telegram-login"
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  {systemSettings?.find(s => s.key === 'telegram_login_enabled')?.value !== 'false' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-blue-300 flex items-center gap-2">
                        <span>✅</span>
                        <span>Telegram login is enabled on login page and account section</span>
                      </p>
                    </div>
                  )}
                  {systemSettings?.find(s => s.key === 'telegram_login_enabled')?.value === 'false' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-red-300 flex items-center gap-2">
                        <span>❌</span>
                        <span>Telegram login is hidden from login page and account section</span>
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Add New Setting */}
                <div className="p-4 bg-slate-800/30 rounded-lg border border-purple-500/10">
                  <h3 className="text-sm font-medium text-purple-200 mb-3">Add/Update Setting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="setting-key" className="text-purple-200">Setting Key</Label>
                      <Input
                        id="setting-key"
                        data-testid="input-setting-key"
                        placeholder="e.g., nowpayments_api_key"
                        value={editingSetting || ""}
                        onChange={(e) => setEditingSetting(e.target.value)}
                        className="bg-slate-800/50 border-purple-500/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="setting-value" className="text-purple-200">Setting Value</Label>
                      <Input
                        id="setting-value"
                        type={isEncrypted ? "password" : "text"}
                        data-testid="input-setting-value"
                        placeholder="Enter value"
                        value={settingValue}
                        onChange={(e) => setSettingValue(e.target.value)}
                        className="bg-slate-800/50 border-purple-500/20 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="setting-description" className="text-purple-200">Description (Optional)</Label>
                      <Input
                        id="setting-description"
                        data-testid="input-setting-description"
                        placeholder="Brief description of this setting"
                        value={settingDescription}
                        onChange={(e) => setSettingDescription(e.target.value)}
                        className="bg-slate-800/50 border-purple-500/20 text-white"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is-encrypted"
                        data-testid="checkbox-is-encrypted"
                        checked={isEncrypted}
                        onChange={(e) => setIsEncrypted(e.target.checked)}
                        className="rounded border-purple-500/20"
                      />
                      <Label htmlFor="is-encrypted" className="text-purple-200">Sensitive/Encrypted Setting</Label>
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        onClick={() => {
                          if (editingSetting && settingValue) {
                            updateSettingMutation.mutate({
                              key: editingSetting,
                              value: settingValue,
                              description: settingDescription || undefined,
                              isEncrypted
                            });
                          }
                        }}
                        disabled={!editingSetting || !settingValue || updateSettingMutation.isPending}
                        data-testid="button-save-setting"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {updateSettingMutation.isPending ? "Saving..." : "Save Setting"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Current Settings */}
                <div>
                  <h3 className="text-sm font-medium text-purple-200 mb-3">Current Settings</h3>
                  {systemSettings && systemSettings.length > 0 ? (
                    <div className="space-y-2">
                      {systemSettings.map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-purple-500/10">
                          <div>
                            <p className="text-sm font-medium text-white" data-testid={`text-setting-${setting.key}`}>
                              {setting.key}
                            </p>
                            <p className="text-xs text-purple-300">
                              {setting.description || "No description"}
                            </p>
                            <p className="text-xs text-purple-400">
                              Value: {setting.value} {setting.isEncrypted && "🔒"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSetting(setting.key);
                                setSettingValue("");
                                setSettingDescription(setting.description || "");
                                setIsEncrypted(setting.isEncrypted);
                              }}
                              data-testid={`button-edit-setting-${setting.key}`}
                              className="border-purple-500/20 text-purple-200 hover:bg-purple-600/20"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the setting "${setting.key}"?`)) {
                                  deleteSettingMutation.mutate(setting.key);
                                }
                              }}
                              data-testid={`button-delete-setting-${setting.key}`}
                              className="border-red-500/20 text-red-400 hover:bg-red-600/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-purple-300 text-sm">No system settings configured yet.</p>
                  )}
                </div>

                {/* Quick Setup for NOWPayments */}
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                  <h3 className="text-sm font-medium text-purple-200 mb-2">Quick Setup: NOWPayments</h3>
                  <p className="text-xs text-purple-300 mb-3">
                    Configure NOWPayments API keys for cryptocurrency payments
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("nowpayments_api_key");
                        setSettingDescription("NOWPayments API key for processing crypto payments");
                        setIsEncrypted(true);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-nowpayments-api"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Setup API Key
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("nowpayments_ipn_secret");
                        setSettingDescription("NOWPayments IPN secret for webhook verification");
                        setIsEncrypted(true);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-nowpayments-ipn"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Setup IPN Secret
                    </Button>
                  </div>
                </div>

                {/* Quick Setup for SMTP Email */}
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <h3 className="text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Quick Setup: SMTP Email Configuration
                  </h3>
                  <p className="text-xs text-blue-300 mb-3">
                    Configure SMTP email server for password resets and deposit confirmations
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("smtp_host");
                        setSettingDescription("SMTP server hostname (e.g., smtp.gmail.com)");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-smtp-host"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup SMTP Host
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("smtp_port");
                        setSettingDescription("SMTP port (465 for SSL, 587 for TLS)");
                        setIsEncrypted(false);
                        setSettingValue("587");
                      }}
                      data-testid="button-setup-smtp-port"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup SMTP Port
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("smtp_user");
                        setSettingDescription("SMTP username (usually your full email address)");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-smtp-user"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup SMTP User
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("smtp_pass");
                        setSettingDescription("SMTP password or app-specific password");
                        setIsEncrypted(true);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-smtp-pass"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup SMTP Password
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("from_email");
                        setSettingDescription("Email address to display as sender");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-from-email"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup From Email
                    </Button>
                  </div>
                  <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Note: After setting up SMTP, emails will be sent using your configured email server
                  </p>
                </div>

                {/* Quick Setup for SendGrid Email */}
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                  <h3 className="text-sm font-medium text-emerald-200 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Quick Setup: SendGrid Email Service
                  </h3>
                  <p className="text-xs text-emerald-300 mb-3">
                    Professional email service with delivery tracking and analytics
                  </p>
                  
                  {/* Status Indicator */}
                  <div className="mb-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {systemSettings?.find(s => s.key === 'sendgrid_api_key') ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-emerald-300">SendGrid Configured</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm text-yellow-300">Not Configured</span>
                          </>
                        )}
                      </div>
                      {systemSettings?.find(s => s.key === 'sendgrid_email_count') && (
                        <div className="text-xs text-emerald-200">
                          Emails Sent: {systemSettings.find(s => s.key === 'sendgrid_email_count')?.value || '0'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("sendgrid_api_key");
                        setSettingDescription("SendGrid API key for sending emails");
                        setIsEncrypted(true);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-sendgrid-api-key"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Setup API Key
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("sendgrid_from_email");
                        setSettingDescription("Default sender email address for SendGrid");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-sendgrid-from-email"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Setup From Email
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const testEmail = prompt('Enter email address to send test email:');
                          if (!testEmail) return;
                          
                          const response = await apiRequest('POST', '/api/admin/sendgrid/test', { 
                            email: testEmail 
                          });
                          const data = await response.json();
                          
                          if (response.ok) {
                            toast({ 
                              title: "✅ Success", 
                              description: data.message || "Test email sent successfully!" 
                            });
                            // Refresh system settings to update email count
                            queryClient.invalidateQueries({ queryKey: ['/api/admin/system-settings'] });
                          } else {
                            toast({ 
                              title: "❌ Error", 
                              description: data.message || "Failed to send test email", 
                              variant: "destructive" 
                            });
                          }
                        } catch (error) {
                          toast({ 
                            title: "❌ Error", 
                            description: "Failed to send test email", 
                            variant: "destructive" 
                          });
                        }
                      }}
                      data-testid="button-test-sendgrid"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!systemSettings?.find(s => s.key === 'sendgrid_api_key')}
                    >
                      Send Test Email
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await apiRequest('GET', '/api/admin/sendgrid/stats');
                          const data = await response.json();
                          
                          toast({ 
                            title: "📊 SendGrid Statistics", 
                            description: `Total emails sent: ${data.emailCount || 0}`,
                          });
                        } catch (error) {
                          toast({ 
                            title: "❌ Error", 
                            description: "Failed to fetch statistics", 
                            variant: "destructive" 
                          });
                        }
                      }}
                      data-testid="button-sendgrid-stats"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!systemSettings?.find(s => s.key === 'sendgrid_api_key')}
                    >
                      View Statistics
                    </Button>
                  </div>
                  
                  <div className="mt-3 p-3 bg-emerald-900/20 rounded border border-emerald-500/20">
                    <p className="text-xs text-emerald-200 font-medium mb-2">📌 How to get SendGrid API Key:</p>
                    <ol className="text-xs text-emerald-300 space-y-1 list-decimal list-inside">
                      <li>Sign up at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">sendgrid.com</a></li>
                      <li>Go to Settings → API Keys</li>
                      <li>Create API Key → Full Access</li>
                      <li>Copy the API key and paste above</li>
                    </ol>
                  </div>
                  
                  <p className="text-xs text-emerald-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    SendGrid provides reliable email delivery with detailed analytics. Free tier: 100 emails/day
                  </p>
                </div>

                {/* Quick Setup for Telegram Notifications */}
                <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <h3 className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Quick Setup: Telegram Notifications
                  </h3>
                  <p className="text-xs text-cyan-300 mb-3">
                    Get instant withdrawal notifications on Telegram
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("telegram_bot_token");
                        setSettingDescription("Telegram Bot Token from @BotFather");
                        setIsEncrypted(true);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-telegram-token"
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      Setup Bot Token
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("telegram_chat_id");
                        setSettingDescription("Your Telegram Chat ID");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-telegram-chat-id"
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      Setup Chat ID
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const chatIdSetting = systemSettings?.find(s => s.key === 'telegram_chat_id');
                          const chatId = chatIdSetting?.value;
                          
                          if (!chatId) {
                            toast({ title: "Error", description: "Please setup Chat ID first", variant: "destructive" });
                            return;
                          }

                          const response = await fetch('/api/admin/telegram/verify-chat', { 
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chatId })
                          });
                          const data = await response.json();
                          
                          if (response.ok) {
                            const chatInfo = data.chatInfo;
                            toast({ 
                              title: "✅ Chat Access Verified!", 
                              description: `Bot has access to: ${chatInfo?.title || chatInfo?.id}\nType: ${chatInfo?.type}` 
                            });
                          } else {
                            toast({ 
                              title: "❌ Chat Access Failed", 
                              description: data.error || "Bot doesn't have access to this chat. Please add the bot to your channel/group as admin.",
                              variant: "destructive" 
                            });
                          }
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to verify chat access", variant: "destructive" });
                        }
                      }}
                      data-testid="button-verify-telegram-chat"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Verify Chat Access
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/telegram/test', { method: 'POST' });
                          const data = await response.json();
                          if (response.ok) {
                            toast({ title: "Success", description: "Test notification sent to Telegram!" });
                          } else {
                            toast({ title: "Error", description: data.message || "Failed to send test notification", variant: "destructive" });
                          }
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to send test notification", variant: "destructive" });
                        }
                      }}
                      data-testid="button-test-telegram"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Test Notification
                    </Button>
                  </div>
                  <p className="text-xs text-cyan-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Get your bot token from @BotFather on Telegram. Send a message to your bot, then use the Chat ID.
                  </p>
                  
                  {/* Notification Type Toggles */}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-cyan-200 mb-2">Notification Types:</p>
                    
                    <div className="flex items-center justify-between p-3 bg-cyan-900/30 rounded-lg border border-cyan-500/30">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="withdrawal-notifications-toggle" className="text-sm font-medium text-cyan-200 cursor-pointer">
                          {telegramWithdrawalNotificationsEnabled ? '🔔 Withdrawal Notifications' : '🔕 Withdrawal Notifications'}
                        </Label>
                        {updateSettingMutation.isPending && (
                          <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" />
                        )}
                      </div>
                      <Switch
                        id="withdrawal-notifications-toggle"
                        checked={telegramWithdrawalNotificationsEnabled}
                        onCheckedChange={handleToggleWithdrawalNotifications}
                        disabled={updateSettingMutation.isPending}
                        data-testid="switch-withdrawal-notifications"
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-cyan-900/30 rounded-lg border border-cyan-500/30">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="login-notifications-toggle" className="text-sm font-medium text-cyan-200 cursor-pointer">
                          {telegramLoginNotificationsEnabled ? '🔔 Login Notifications' : '🔕 Login Notifications'}
                        </Label>
                        {updateSettingMutation.isPending && (
                          <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" />
                        )}
                      </div>
                      <Switch
                        id="login-notifications-toggle"
                        checked={telegramLoginNotificationsEnabled}
                        onCheckedChange={handleToggleLoginNotifications}
                        disabled={updateSettingMutation.isPending}
                        data-testid="switch-login-notifications"
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Telegram Forwarding Setup */}
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20 mt-4">
                  <h3 className="text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Telegram Message Forwarding
                  </h3>
                  <p className="text-xs text-blue-300 mb-3">
                    Forward all notifications to another Telegram account/group automatically
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("telegram_forward_chat_id");
                        setSettingDescription("Secondary Telegram Chat ID for forwarding notifications");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-forward-chat-id"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Setup Forward Chat ID
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const forwardChatIdSetting = systemSettings?.find(s => s.key === 'telegram_forward_chat_id');
                          const chatId = forwardChatIdSetting?.value;
                          
                          if (!chatId) {
                            toast({ title: "Error", description: "Please setup Forward Chat ID first", variant: "destructive" });
                            return;
                          }

                          const response = await fetch('/api/admin/telegram/verify-chat', { 
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chatId })
                          });
                          const data = await response.json();
                          
                          if (response.ok) {
                            const chatInfo = data.chatInfo;
                            toast({ 
                              title: "✅ Forward Chat Verified!", 
                              description: `Bot can forward to: ${chatInfo?.title || chatInfo?.id}\nType: ${chatInfo?.type}` 
                            });
                          } else {
                            toast({ 
                              title: "❌ Forward Chat Failed", 
                              description: data.error || "Bot doesn't have access to this chat. Please add the bot to your channel/group as admin.",
                              variant: "destructive" 
                            });
                          }
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to verify forward chat access", variant: "destructive" });
                        }
                      }}
                      data-testid="button-verify-forward-chat"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Verify Forward Chat
                    </Button>
                  </div>
                  <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    All withdrawal and login notifications will be automatically forwarded to this chat when configured.
                  </p>
                  
                  <div className="mt-3 p-3 bg-blue-900/30 rounded border border-blue-500/20">
                    <p className="text-xs text-blue-200 font-medium mb-2">📱 Current Status:</p>
                    <p className="text-xs text-blue-300">
                      {systemSettings?.find(s => s.key === 'telegram_forward_chat_id')?.value 
                        ? `Forwarding to: ${systemSettings.find(s => s.key === 'telegram_forward_chat_id')?.value}` 
                        : 'Forwarding not configured'}
                    </p>
                  </div>
                </div>

                {/* Quick Setup for Telegram Game Signals */}
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20 mt-4">
                  <h3 className="text-sm font-medium text-purple-200 mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Quick Setup: Telegram Game Signals
                  </h3>
                  <p className="text-xs text-purple-300 mb-3">
                    Automatically send game signals to your Telegram channel
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingSetting("telegram_signal_chat_id");
                          setSettingDescription("Telegram Channel/Group Chat ID for signals");
                          setIsEncrypted(false);
                          setSettingValue("");
                        }}
                        data-testid="button-setup-signal-chat-id"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Setup Signal Chat ID
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const chatIdSetting = systemSettings?.find(s => s.key === 'telegram_signal_chat_id');
                            const chatId = chatIdSetting?.value;
                            
                            if (!chatId) {
                              toast({ title: "Error", description: "Please setup Signal Chat ID first", variant: "destructive" });
                              return;
                            }

                            const response = await fetch('/api/admin/telegram/verify-chat', { 
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chatId })
                            });
                            const data = await response.json();
                            
                            if (response.ok) {
                              const chatInfo = data.chatInfo;
                              toast({ 
                                title: "✅ Signal Chat Access Verified!", 
                                description: `Bot has access to: ${chatInfo?.title || chatInfo?.id}\nType: ${chatInfo?.type}` 
                              });
                            } else {
                              toast({ 
                                title: "❌ Signal Chat Access Failed", 
                                description: data.error || "Bot doesn't have access to this chat. Please add the bot as admin to your channel/group.",
                                variant: "destructive" 
                              });
                            }
                          } catch (error) {
                            toast({ title: "Error", description: "Failed to verify signal chat access", variant: "destructive" });
                          }
                        }}
                        data-testid="button-verify-signal-chat"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Verify Signal Chat
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="telegram-signals-toggle" className="text-sm font-medium text-purple-200 cursor-pointer">
                          {telegramSignalsEnabled ? '🟢 Signals Enabled' : '🔴 Signals Disabled'}
                        </Label>
                      </div>
                      <Switch
                        id="telegram-signals-toggle"
                        checked={telegramSignalsEnabled}
                        onCheckedChange={handleToggleTelegramSignals}
                        data-testid="switch-telegram-signals"
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signal-win-percentage" className="text-xs text-purple-200 flex items-center gap-2">
                        Signal Win Percentage (when users bet)
                        <span className="text-purple-400 text-[10px]">
                          {telegramSignalWinPercentage}% WIN | {100 - parseFloat(telegramSignalWinPercentage || '0')}% LOSS
                        </span>
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="signal-win-percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={telegramSignalWinPercentage}
                          onChange={(e) => setTelegramSignalWinPercentage(e.target.value)}
                          className="bg-purple-900/30 border-purple-500/30 text-purple-100"
                          data-testid="input-signal-win-percentage"
                        />
                        <span className="text-purple-300 text-sm">%</span>
                      </div>
                      <p className="text-xs text-purple-300 mt-1">
                        📊 Set to 100% for guaranteed wins when users bet on signal color. Set to 0% for natural results (no manipulation). 
                        Note: When NO users bet on signal color, it's always 100% WIN.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photo-url" className="text-xs text-purple-200">
                        Send Photo to Signal Channel
                      </Label>
                      <div className="flex gap-2">
                        <input
                          id="photo-url"
                          type="text"
                          placeholder="Enter photo URL or file ID"
                          className="flex-1 px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-md text-sm text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          data-testid="input-photo-url"
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            const photoInput = document.getElementById('photo-url') as HTMLInputElement;
                            const photoUrl = photoInput?.value.trim();
                            
                            if (!photoUrl) {
                              toast({ title: "Error", description: "Please enter a photo URL", variant: "destructive" });
                              return;
                            }
                            
                            try {
                              const response = await fetch('/api/admin/telegram/send-photo', { 
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ photoUrl, caption: 'Test photo from admin panel' })
                              });
                              const data = await response.json();
                              if (response.ok) {
                                toast({ title: "Success", description: "Photo sent to Telegram signal channel!" });
                                photoInput.value = '';
                              } else {
                                toast({ title: "Error", description: data.message || "Failed to send photo", variant: "destructive" });
                              }
                            } catch (error) {
                              toast({ title: "Error", description: "Failed to send photo", variant: "destructive" });
                            }
                          }}
                          data-testid="button-send-photo"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Send Photo
                        </Button>
                      </div>
                      <p className="text-xs text-purple-300 mt-1">
                        You can use a direct photo URL (https://...) or a Telegram file_id
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-purple-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    3-minute signals are sent automatically when a new 3min game starts. Format: 🪙 [GameID] ( random 0-9 ) join [🟢🔴🟣]
                  </p>
                </div>

                {/* 1-Minute Signals Configuration (Separate from 3-minute) */}
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20 mt-4">
                  <h3 className="text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    1-Minute Signals Configuration
                  </h3>
                  <p className="text-xs text-blue-300 mb-3">
                    Configure Telegram signals for 1-minute game periods (separate from 3-minute signals)
                  </p>
                  <div className="space-y-4">
                    {/* 1min Signal Enable Toggle */}
                    <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="telegram-1min-signals-toggle" className="text-sm font-medium text-blue-200 cursor-pointer">
                          {telegram1minSignalsEnabled ? '🟢 1min Signals Enabled' : '🔴 1min Signals Disabled'}
                        </Label>
                      </div>
                      <Switch
                        id="telegram-1min-signals-toggle"
                        checked={telegram1minSignalsEnabled}
                        onCheckedChange={handleToggle1minTelegramSignals}
                        data-testid="switch-telegram-1min-signals"
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>

                    {/* 1min Signal Channel ID */}
                    <div className="space-y-2">
                      <Label htmlFor="telegram-1min-signal-chat-id" className="text-xs text-blue-200">
                        1-Minute Signal Channel ID
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="telegram-1min-signal-chat-id"
                          type="text"
                          placeholder="Enter channel/group ID (e.g. -1001234567890)"
                          value={telegram1minSignalChatId}
                          onChange={(e) => setTelegram1minSignalChatId(e.target.value)}
                          className="bg-blue-900/30 border-blue-500/30 text-blue-100 placeholder:text-blue-400/50"
                          data-testid="input-telegram-1min-signal-chat-id"
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            const chatId = telegram1minSignalChatId.trim();
                            if (!chatId) {
                              toast({ title: "Error", description: "Please enter a chat ID first", variant: "destructive" });
                              return;
                            }
                            
                            try {
                              const response = await fetch('/api/admin/telegram/verify-chat-access', { 
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chatId })
                              });
                              const data = await response.json();
                              
                              if (response.ok) {
                                const chatInfo = data.chatInfo;
                                toast({ 
                                  title: "✅ 1min Signal Chat Access Verified!", 
                                  description: `Bot has access to: ${chatInfo?.title || chatInfo?.id}\nType: ${chatInfo?.type}` 
                                });
                              } else {
                                toast({ 
                                  title: "❌ 1min Signal Chat Access Failed", 
                                  description: data.error || "Bot doesn't have access to this chat. Please add the bot as admin to your channel/group.",
                                  variant: "destructive" 
                                });
                              }
                            } catch (error) {
                              toast({ title: "Error", description: "Failed to verify 1min signal chat access", variant: "destructive" });
                            }
                          }}
                          data-testid="button-verify-1min-signal-chat"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Verify
                        </Button>
                      </div>
                      <p className="text-xs text-blue-300 mt-1">
                        💡 This is a separate channel for 1-minute signals. Can be the same or different from 3-minute signal channel.
                      </p>
                    </div>

                    {/* 1min Signal Win Percentage */}
                    <div className="space-y-2">
                      <Label htmlFor="1min-signal-win-percentage" className="text-xs text-blue-200 flex items-center gap-2">
                        1-Min Signal Win Percentage
                        <span className="text-blue-400 text-[10px]">
                          {telegram1minSignalWinPercentage}% WIN | {100 - parseFloat(telegram1minSignalWinPercentage || '0')}% LOSS
                        </span>
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="1min-signal-win-percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={telegram1minSignalWinPercentage}
                          onChange={(e) => setTelegram1minSignalWinPercentage(e.target.value)}
                          className="bg-blue-900/30 border-blue-500/30 text-blue-100"
                          data-testid="input-1min-signal-win-percentage"
                        />
                        <span className="text-blue-300 text-sm">%</span>
                      </div>
                      <p className="text-xs text-blue-300 mt-1">
                        📊 Set to 100% for guaranteed wins on 1-min signals. Set to 0% for natural results.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    1-minute signals are sent automatically when a new 1min game starts. Independent from 3-minute signals.
                  </p>
                </div>

                {/* Quick Setup for Telegram Login */}
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/20 mt-4">
                  <h3 className="text-sm font-medium text-green-200 mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Quick Setup: Telegram Login Widget
                  </h3>
                  <p className="text-xs text-green-300 mb-3">
                    Enable users to login with their Telegram account
                  </p>
                  <div className="space-y-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingSetting("telegram_bot_username");
                        setSettingDescription("Your Telegram bot username (without @). Get from @BotFather");
                        setIsEncrypted(false);
                        setSettingValue("");
                      }}
                      data-testid="button-setup-telegram-bot-username"
                      className="bg-green-600 hover:bg-green-700 w-full"
                    >
                      Setup Telegram Bot Username
                    </Button>
                  </div>
                  <p className="text-xs text-green-200 mt-3 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Create a bot with @BotFather, enable login in bot settings (/setdomain), then enter bot username here (e.g., "MyGameBot" without @)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Visibility Configuration */}
            <Card className="admin-card admin-glow border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-200 flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Payment Methods Visibility
                </CardTitle>
                <CardDescription className="text-blue-300">
                  Control which crypto payment methods are visible to users on the deposit page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsConfig />
              </CardContent>
            </Card>

            {/* Freeze/Unfreeze Balance Control */}
            <Card className="admin-card admin-glow border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-cyan-200 flex items-center gap-2">
                  <Unlock className="h-5 w-5" />
                  Global Freeze/Unfreeze Control
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Temporarily unfreeze all user balances or restore them to original frozen amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FreezeUnfreezeControl />
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIP Settings Tab */}
          <TabsContent value="vip-settings" className="space-y-6">
            <Card className="admin-card admin-glow border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-200 flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  VIP Bet Limits Configuration
                </CardTitle>
                <CardDescription className="text-yellow-300">
                  Configure maximum bet limits (coins per bet) for each VIP level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VipBetLimitsConfig />
              </CardContent>
            </Card>

            <Card className="admin-card admin-glow border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-200 flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  VIP Telegram Links Configuration
                </CardTitle>
                <CardDescription className="text-blue-300">
                  Configure exclusive Telegram channel links that users receive when reaching each VIP level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VipTelegramLinksConfig />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-6">
            {/* Deposit History */}
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Deposit History
                </CardTitle>
                <CardDescription className="text-purple-300">
                  View all user deposits and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4">
                  <Label className="text-purple-200">Filter by Status:</Label>
                  <Select value={depositFilter} onValueChange={setDepositFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-purple-500/30 text-white" data-testid="select-deposit-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Deposits</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 text-right">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                      Total: {depositsData?.deposits.length || 0} deposits
                    </Badge>
                  </div>
                </div>
                {depositsData && depositsData.deposits.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-purple-500/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200 w-12"></TableHead>
                            <TableHead className="text-purple-200">User</TableHead>
                            <TableHead className="text-purple-200">Amount</TableHead>
                            <TableHead className="text-purple-200">Currency</TableHead>
                            <TableHead className="text-purple-200">Method</TableHead>
                            <TableHead className="text-purple-200">Status</TableHead>
                            <TableHead className="text-purple-200">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depositsData.deposits.map((deposit) => {
                            const isExpanded = expandedDeposits.has(deposit.id);
                            return (
                              <>
                                <TableRow key={deposit.id} className="border-purple-500/20 hover:bg-purple-900/10" data-testid={`row-deposit-${deposit.id}`}>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedDeposits);
                                        if (isExpanded) {
                                          newExpanded.delete(deposit.id);
                                        } else {
                                          newExpanded.add(deposit.id);
                                        }
                                        setExpandedDeposits(newExpanded);
                                      }}
                                      className="h-8 w-8 p-0 text-purple-400 hover:text-purple-200"
                                      data-testid={`button-expand-deposit-${deposit.id}`}
                                    >
                                      {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="text-white font-medium">{deposit.userEmail}</p>
                                      <p className="text-purple-300 text-sm">ID: {deposit.userPublicId}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="text-white font-medium">
                                        {deposit.fiatAmount ? `$${parseFloat(deposit.fiatAmount).toFixed(2)}` : 'N/A'}
                                      </p>
                                      {deposit.cryptoAmount && (
                                        <p className="text-purple-300 text-sm">
                                          {parseFloat(deposit.cryptoAmount).toFixed(6)} {deposit.cryptoCurrency}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-purple-200">
                                      {deposit.fiatCurrency || deposit.cryptoCurrency || 'USD'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-purple-200 capitalize">
                                      {deposit.paymentMethod}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        deposit.status === 'completed' ? 'default' :
                                        deposit.status === 'pending' ? 'secondary' :
                                        deposit.status === 'failed' ? 'destructive' : 'secondary'
                                      }
                                      className={
                                        deposit.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                        deposit.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                        deposit.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                      }
                                      data-testid={`badge-deposit-status-${deposit.status}`}
                                    >
                                      {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-purple-300">
                                    {new Date(deposit.createdAt).toLocaleDateString()} {new Date(deposit.createdAt).toLocaleTimeString()}
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow key={`${deposit.id}-details`} className="border-purple-500/20 bg-purple-900/5">
                                    <TableCell colSpan={7}>
                                      <div className="p-4 space-y-3">
                                        <h4 className="text-purple-200 font-semibold mb-3 flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          Complete Deposit Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <span className="text-purple-400">Transaction ID:</span>
                                            <p className="text-white font-mono text-xs mt-1" data-testid={`text-full-deposit-id-${deposit.id}`}>{deposit.id}</p>
                                          </div>
                                          {deposit.externalId && (
                                            <div>
                                              <span className="text-purple-400">External ID:</span>
                                              <p className="text-white font-mono text-xs mt-1">{deposit.externalId}</p>
                                            </div>
                                          )}
                                          {deposit.paymentAddress && (
                                            <div>
                                              <span className="text-purple-400">Payment Address:</span>
                                              <p className="text-white font-mono text-xs mt-1 break-all">{deposit.paymentAddress}</p>
                                            </div>
                                          )}
                                          {deposit.txHash && (
                                            <div>
                                              <span className="text-purple-400">Transaction Hash:</span>
                                              <p className="text-white font-mono text-xs mt-1 break-all">{deposit.txHash}</p>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-purple-400">Fee:</span>
                                            <p className="text-white mt-1">${parseFloat(deposit.fee).toFixed(8)}</p>
                                          </div>
                                          {deposit.agentId && (
                                            <div>
                                              <span className="text-purple-400">Agent ID:</span>
                                              <p className="text-white font-mono text-xs mt-1">{deposit.agentId}</p>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-purple-400">Created At:</span>
                                            <p className="text-white mt-1">{new Date(deposit.createdAt).toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <span className="text-purple-400">Updated At:</span>
                                            <p className="text-white mt-1">{new Date(deposit.updatedAt).toLocaleString()}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between text-purple-300 text-sm">
                      <span>Total deposits: {depositsData.total}</span>
                      <span>Page {depositsData.page} of {depositsData.totalPages}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-300">No deposits found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Crypto Deposits Card */}
            <Card className="admin-card admin-glow border-green-500/20">
              <CardHeader>
                <CardTitle className="text-green-200 flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Pending Crypto Deposits - Manual Approval
                </CardTitle>
                <CardDescription className="text-green-300">
                  Crypto deposits awaiting confirmation. Auto-checker runs every minute, or approve manually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {depositsData && depositsData.deposits.filter(d => d.status === 'pending' && d.paymentMethod === 'crypto').length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-200 text-sm">
                        💡 <strong>{depositsData.deposits.filter(d => d.status === 'pending' && d.paymentMethod === 'crypto').length}</strong> pending crypto deposit(s). 
                        Auto-checker will process them automatically, or you can approve manually now.
                      </p>
                    </div>
                    <div className="rounded-lg border border-green-500/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-green-500/20 bg-green-900/10">
                            <TableHead className="text-green-200">User</TableHead>
                            <TableHead className="text-green-200">Amount</TableHead>
                            <TableHead className="text-green-200">Currency</TableHead>
                            <TableHead className="text-green-200">Payment ID</TableHead>
                            <TableHead className="text-green-200">Date</TableHead>
                            <TableHead className="text-green-200 text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depositsData.deposits
                            .filter(d => d.status === 'pending' && d.paymentMethod === 'crypto')
                            .map((deposit) => (
                              <TableRow key={deposit.id} className="border-green-500/20 hover:bg-green-900/5" data-testid={`row-pending-crypto-${deposit.id}`}>
                                <TableCell>
                                  <div>
                                    <p className="text-white font-medium">{deposit.userEmail}</p>
                                    <p className="text-green-300 text-sm">ID: {deposit.userPublicId}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-white font-medium">
                                      ${parseFloat(deposit.fiatAmount || '0').toFixed(2)}
                                    </p>
                                    {deposit.cryptoAmount && (
                                      <p className="text-green-300 text-sm">
                                        {parseFloat(deposit.cryptoAmount).toFixed(6)} {deposit.cryptoCurrency}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-green-200">
                                    {deposit.cryptoCurrency || 'CRYPTO'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-green-300 text-xs font-mono">
                                    {deposit.externalId || 'N/A'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-green-300 text-sm">
                                  {new Date(deposit.createdAt).toLocaleDateString()} {new Date(deposit.createdAt).toLocaleTimeString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!window.confirm(`Approve this ${deposit.fiatAmount ? `$${parseFloat(deposit.fiatAmount).toFixed(2)}` : ''} crypto deposit for ${deposit.userEmail}?`)) {
                                        return;
                                      }
                                      approveCryptoDepositMutation.mutate(deposit.id);
                                    }}
                                    disabled={approvingDepositIds.has(deposit.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    data-testid={`button-approve-crypto-${deposit.id}`}
                                  >
                                    {approvingDepositIds.has(deposit.id) ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                        Approving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve Now
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="text-green-300">No pending crypto deposits</p>
                    <p className="text-sm text-green-400 mt-2">All crypto payments are up to date!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Checker Dashboard */}
            <PaymentCheckerDashboard />

            {/* Info Banner for Payment Checker */}
            <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-200 mb-2">🚀 Automatic Payment Verification System</h3>
                  <p className="text-blue-100 mb-2">
                    This system automatically checks NOWPayments API and updates the status for pending crypto deposits.
                  </p>
                  <ul className="space-y-1 text-sm text-blue-300">
                    <li>⏰ <strong>Auto Check:</strong> Automatically checks pending payments every 1 minute</li>
                    <li>✅ <strong>Auto Approve:</strong> Adds to user balance as soon as payment is complete</li>
                    <li>🔴 <strong>Manual Control:</strong> Manual check button is available whenever you need it</li>
                    <li>📊 <strong>Real-time Stats:</strong> Shows how many are pending, complete, or failed</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Withdrawal Requests
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Manage user withdrawal requests - approve or reject manually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4">
                  <Label className="text-purple-200">Filter by Status:</Label>
                  <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                    <SelectTrigger className="w-48 bg-slate-700 border-purple-500/30 text-white" data-testid="select-withdrawal-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Withdrawals</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 text-right">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                      Total: {withdrawalsData?.withdrawals.length || 0} requests
                    </Badge>
                  </div>
                </div>
                {withdrawalsData && withdrawalsData.withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-purple-500/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200 w-12"></TableHead>
                            <TableHead className="text-purple-200">User</TableHead>
                            <TableHead className="text-purple-200">Amount (Coins)</TableHead>
                            <TableHead className="text-purple-200">Status</TableHead>
                            <TableHead className="text-purple-200">Wallet Address</TableHead>
                            <TableHead className="text-purple-200">Date</TableHead>
                            <TableHead className="text-purple-200">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawalsData.withdrawals.map((withdrawal) => {
                            const isExpanded = expandedWithdrawals.has(withdrawal.id);
                            return (
                              <>
                            <TableRow key={withdrawal.id} className="border-purple-500/20 hover:bg-purple-900/10" data-testid={`row-withdrawal-${withdrawal.id}`}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedWithdrawals);
                                    if (isExpanded) {
                                      newExpanded.delete(withdrawal.id);
                                    } else {
                                      newExpanded.add(withdrawal.id);
                                    }
                                    setExpandedWithdrawals(newExpanded);
                                  }}
                                  className="h-8 w-8 p-0 text-purple-400 hover:text-purple-200"
                                  data-testid={`button-expand-withdrawal-${withdrawal.id}`}
                                >
                                  {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-white font-medium">{withdrawal.userEmail}</p>
                                  <p className="text-purple-300 text-sm">ID: {withdrawal.userPublicId}</p>
                                  {withdrawal.userRegistrationIp && (
                                    <p className="text-purple-400 text-xs font-mono">IP: {withdrawal.userRegistrationIp}</p>
                                  )}
                                  {withdrawal.duplicateIpCount > 0 && (
                                    <div className="mt-2">
                                      <Badge
                                        variant="outline"
                                        className="bg-red-500/20 text-red-300 border-red-500/30 text-xs"
                                        data-testid={`badge-duplicate-ip-${withdrawal.id}`}
                                      >
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {withdrawal.duplicateIpCount} Duplicate IP{withdrawal.duplicateIpCount > 1 ? 's' : ''}
                                      </Badge>
                                      {withdrawal.duplicateUsers && withdrawal.duplicateUsers.length > 0 && (
                                        <div className="mt-1 text-xs text-red-300 space-y-0.5">
                                          {withdrawal.duplicateUsers.map((dupUser: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-1">
                                              <span>→ {dupUser.email} ({dupUser.publicId})</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-white font-medium">
                                    {withdrawal.amount ? `🪙 ${usdToGoldCoins(withdrawal.amount).toLocaleString()} coins` : 'N/A'}
                                  </p>
                                  <p className="text-purple-300 text-sm">
                                    ${parseFloat(withdrawal.amount || '0').toFixed(2)} {withdrawal.currency || 'USD'}
                                  </p>
                                  {(withdrawal.commissionAmount || withdrawal.winningsAmount) && (
                                    <div className="mt-2 space-y-1">
                                      {withdrawal.commissionAmount && parseFloat(withdrawal.commissionAmount) > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                                            💰 Referral: ${parseFloat(withdrawal.commissionAmount).toFixed(2)}
                                          </Badge>
                                        </div>
                                      )}
                                      {withdrawal.winningsAmount && parseFloat(withdrawal.winningsAmount) > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                                            🎲 Bet Wins: ${parseFloat(withdrawal.winningsAmount).toFixed(2)}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        (withdrawal.userBetPercentage || 0) >= 60
                                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                                      }
                                      data-testid={`badge-bet-percentage-${withdrawal.id}`}
                                    >
                                      {withdrawal.userBetPercentage?.toFixed(1) || '0.0'}%
                                    </Badge>
                                    <Badge
                                      variant={
                                        withdrawal.status === 'completed' ? 'default' :
                                        withdrawal.status === 'pending' ? 'secondary' :
                                        withdrawal.status === 'failed' ? 'destructive' : 'secondary'
                                      }
                                      className={
                                        withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                        withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                        withdrawal.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                      }
                                      data-testid={`badge-withdrawal-status-${withdrawal.status}`}
                                    >
                                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-purple-400">
                                    ${parseFloat(withdrawal.userTotalBets || '0').toFixed(2)} / ${parseFloat(withdrawal.userTotalDeposits || '0').toFixed(2)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {withdrawal.walletAddress ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-sm font-mono truncate max-w-[200px]" title={withdrawal.walletAddress}>
                                      {withdrawal.walletAddress}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        navigator.clipboard.writeText(withdrawal.walletAddress || '');
                                        toast({
                                          title: "✅ Copied!",
                                          description: "Wallet address copied to clipboard",
                                        });
                                      }}
                                      className="h-7 w-7 p-0 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20"
                                      data-testid={`button-copy-address-${withdrawal.id}`}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-purple-400 text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-purple-300">
                                {new Date(withdrawal.createdAt).toLocaleDateString()} {new Date(withdrawal.createdAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell>
                                {withdrawal.status === 'pending' ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        processWithdrawalMutation.mutate({
                                          transactionId: withdrawal.id,
                                          action: 'approve',
                                          adminNote: 'Approved by admin'
                                        });
                                      }}
                                      disabled={processWithdrawalMutation.isPending}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      data-testid={`button-approve-withdrawal-${withdrawal.id}`}
                                    >
                                      ✅ Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        processWithdrawalMutation.mutate({
                                          transactionId: withdrawal.id,
                                          action: 'reject',
                                          adminNote: 'Rejected by admin'
                                        });
                                      }}
                                      disabled={processWithdrawalMutation.isPending}
                                      data-testid={`button-reject-withdrawal-${withdrawal.id}`}
                                    >
                                      ❌ Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-purple-400 text-sm">Processed</span>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${withdrawal.id}-details`} className="border-purple-500/20 bg-purple-900/5">
                                <TableCell colSpan={7}>
                                  <div className="p-4 space-y-3">
                                    <h4 className="text-purple-200 font-semibold mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Complete Withdrawal Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-purple-400">Withdrawal Request ID:</span>
                                        <p className="text-white font-mono text-xs mt-1" data-testid={`text-full-withdrawal-id-${withdrawal.id}`}>{withdrawal.id}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">User Public ID:</span>
                                        <p className="text-white mt-1">{withdrawal.userPublicId}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Wallet Address:</span>
                                        <p className="text-white font-mono text-xs mt-1 break-all">{withdrawal.walletAddress}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Amount:</span>
                                        <p className="text-white mt-1">{withdrawal.amount} (${withdrawal.fiatAmount})</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Currency:</span>
                                        <p className="text-white mt-1">{withdrawal.currency || 'USD'}</p>
                                      </div>
                                      {withdrawal.commissionAmount && (
                                        <div>
                                          <span className="text-purple-400">Commission Amount:</span>
                                          <p className="text-white mt-1">${parseFloat(withdrawal.commissionAmount).toFixed(2)}</p>
                                        </div>
                                      )}
                                      {withdrawal.winningsAmount && (
                                        <div>
                                          <span className="text-purple-400">Winnings Amount:</span>
                                          <p className="text-white mt-1">${parseFloat(withdrawal.winningsAmount).toFixed(2)}</p>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-purple-400">Eligible:</span>
                                        <p className="text-white mt-1">{withdrawal.eligible ? 'Yes' : 'No'}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Required Bet Amount:</span>
                                        <p className="text-white mt-1">${parseFloat(withdrawal.requiredBetAmount || '0').toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Current Bet Amount:</span>
                                        <p className="text-white mt-1">${parseFloat(withdrawal.currentBetAmount || '0').toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Live Balance:</span>
                                        <p className="text-white mt-1 font-semibold text-green-400" data-testid={`text-live-balance-${withdrawal.id}`}>
                                          🪙 {usdToGoldCoins(withdrawal.userLiveBalance || '0').toLocaleString()} coins (${parseFloat(withdrawal.userLiveBalance || '0').toFixed(2)})
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Total Referral Earnings:</span>
                                        <p className="text-white mt-1 font-semibold text-blue-400" data-testid={`text-referral-earnings-${withdrawal.id}`}>
                                          💰 ${parseFloat(withdrawal.userTotalReferralEarnings || '0').toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Total Lifetime Withdrawals:</span>
                                        <p className="text-white mt-1 font-semibold text-yellow-400" data-testid={`text-withdrawal-count-${withdrawal.id}`}>
                                          {withdrawal.userWithdrawalCount || 0} completed withdrawal{(withdrawal.userWithdrawalCount || 0) !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Created At:</span>
                                        <p className="text-white mt-1">{new Date(withdrawal.createdAt).toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <span className="text-purple-400">Updated At:</span>
                                        <p className="text-white mt-1">{new Date(withdrawal.updatedAt).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between text-purple-300 text-sm">
                      <span>Total withdrawals: {withdrawalsData.total}</span>
                      <span>Page {withdrawalsData.page} of {withdrawalsData.totalPages}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-300">No withdrawal requests found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import & Export Tab */}
          <TabsContent value="import-export" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export & Import
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Export all user data for backup or import previously exported data to restore users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Export Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-400" />
                    Export User Data
                  </h3>
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <p className="text-purple-200 mb-4">
                      Export all user data including emails, passwords, balances, withdrawal history, 
                      activity history, IP addresses, and device information.
                    </p>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleExportData}
                        disabled={isExporting || exportDataMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-export-data"
                      >
                        {isExporting || exportDataMutation.isPending ? (
                          <>
                            <Activity className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export All Data
                          </>
                        )}
                      </Button>
                      <div className="text-sm text-purple-300">
                        <p>⚠️ This will export sensitive data including password hashes</p>
                        <p>📁 File will be saved as: user-data-export-{new Date().toISOString().split('T')[0]}.json</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-400" />
                    Import User Data
                  </h3>
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <p className="text-purple-200 mb-4">
                      Import previously exported user data to restore all user accounts, 
                      balances, and activity history.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-purple-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                          data-testid="input-import-file"
                        />
                        {importFile && (
                          <div className="text-sm text-green-300 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {importFile.name}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <Switch
                          checked={clearBeforeImport}
                          onCheckedChange={setClearBeforeImport}
                          data-testid="switch-clear-before-import"
                        />
                        <div className="flex-1">
                          <Label className="text-amber-200 font-medium cursor-pointer" onClick={() => setClearBeforeImport(!clearBeforeImport)}>
                            🗑️ Clear all demo data before import (Admin users preserved)
                          </Label>
                          <p className="text-amber-300 text-xs mt-1">
                            Recommended for monthly database resets. Deletes all non-admin users, games, bets, and transactions before importing new data. Your admin account will not be affected.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Button
                          onClick={handleImportData}
                          disabled={!importFile || isImporting || importDataMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          data-testid="button-import-data"
                        >
                          {isImporting || importDataMutation.isPending ? (
                            <>
                              <Activity className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Import Data
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-blue-300 text-sm font-medium mb-2">ℹ️ Import Information:</p>
                        <ul className="text-blue-200 text-sm space-y-1 ml-4">
                          <li>✅ <strong>Duplicate Detection:</strong> Users are checked by email address</li>
                          <li>⏭️ <strong>Skip Existing:</strong> Users already in system are skipped (no data overwrite)</li>
                          <li>➕ <strong>New Users Only:</strong> Only non-existing users are created with full data</li>
                          <li>📦 <strong>Complete Data:</strong> Imports all user data including admin users, transactions, sessions, bets</li>
                          <li>🔒 <strong>No Overwrites:</strong> Existing user data is never modified or updated</li>
                          <li>👑 <strong>Admin Users:</strong> Admin users are also imported if they don't exist</li>
                          <li>📊 <strong>Import Summary:</strong> Shows count of new users created and existing users skipped</li>
                          <li>⚠️ <strong>File Format:</strong> Only import files exported from this system</li>
                        </ul>
                        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
                          <p className="text-green-300 text-xs font-medium">
                            💡 Example: Export from Account 1 (A,B,C,D + admin users) → Import to Account 2 (A,B exist) = Skips A,B and creates C,D + all admin users with full data
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear All Data Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Clear All Data (Danger Zone)
                  </h3>
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-red-500/30">
                    <p className="text-red-200 mb-4 font-medium">
                      ⚠️ DANGER: This will permanently delete ALL user data, games, bets, and transactions!
                    </p>
                    <p className="text-purple-200 mb-4 text-sm">
                      To prevent accidental deletion, you must provide both the security code AND your 2FA code (if enabled):
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="security-code" className="text-purple-200">Security Code</Label>
                        <Input
                          id="security-code"
                          type="text"
                          placeholder="Enter security code..."
                          value={securityCode}
                          onChange={(e) => setSecurityCode(e.target.value)}
                          className="bg-slate-900/50 border-red-500/30 text-white placeholder:text-purple-400"
                          data-testid="input-security-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="two-factor-code" className="text-purple-200">
                          2FA Code (Required if 2FA is enabled on your account)
                        </Label>
                        <Input
                          id="two-factor-code"
                          type="text"
                          placeholder="Enter 6-digit 2FA code..."
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          maxLength={6}
                          className="bg-slate-900/50 border-red-500/30 text-white placeholder:text-purple-400"
                          data-testid="input-two-factor-code"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={handleClearAllData}
                          disabled={!securityCode || isClearing || clearAllDataMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          data-testid="button-clear-all-data"
                        >
                          {isClearing || clearAllDataMutation.isPending ? (
                            <>
                              <Activity className="mr-2 h-4 w-4 animate-spin" />
                              Clearing All Data...
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Clear All Data
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-red-200 text-sm font-medium mb-2">🔒 Security Information:</p>
                        <ul className="text-red-200 text-sm space-y-1 ml-4">
                          <li>• Requires a valid security code to execute</li>
                          <li>• <strong>If 2FA is enabled</strong>, you must also provide your 2FA code</li>
                          <li>• Admin accounts and system settings are preserved</li>
                          <li>• All other data will be permanently deleted</li>
                          <li>• Action is logged in admin activity for audit</li>
                          <li>• Make sure to export data before clearing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Current Data Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-800/50 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm text-purple-300">Total Users</p>
                            <p className="text-2xl font-bold text-white">
                              {usersData?.users.length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="text-sm text-purple-300">Active Sessions</p>
                            <p className="text-2xl font-bold text-white">
                              {userActivityData?.users.filter(u => u.sessionCount > 0).length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5 text-yellow-400" />
                          <div>
                            <p className="text-sm text-purple-300">Total Balance</p>
                            <p className="text-2xl font-bold text-white">
                              ${usersData?.users.reduce((sum, user) => sum + parseFloat(user.balance || '0'), 0).toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email to Users
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Send custom email messages to all users or a specific user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-recipient-type" className="text-purple-200">Recipients</Label>
                    <Select 
                      value={emailRecipientType} 
                      onValueChange={setEmailRecipientType}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" id="email-recipient-type" data-testid="select-recipient-type">
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-purple-500/20">
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="single">Single User</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-purple-300">
                      {emailRecipientType === 'all' 
                        ? (usersData?.users.length ? `Will send to ${usersData.users.length} users` : 'No users found')
                        : 'Will send to one specific user'}
                    </p>
                  </div>

                  {emailRecipientType === 'single' && (
                    <div className="space-y-2">
                      <Label htmlFor="email-user-search" className="text-purple-200">Search User</Label>
                      <Input
                        id="email-user-search"
                        placeholder="Search by email, public ID, or ID..."
                        className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-400"
                        data-testid="input-email-user-search"
                        value={emailUserSearch}
                        onChange={(e) => {
                          setEmailUserSearch(e.target.value);
                          setSpecificUserEmail("");
                        }}
                      />
                      
                      <Label htmlFor="specific-user-email" className="text-purple-200 mt-4">Select User</Label>
                      <Select 
                        value={specificUserEmail} 
                        onValueChange={setSpecificUserEmail}
                      >
                        <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" id="specific-user-email" data-testid="select-specific-user">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/20 max-h-[300px]">
                          {usersData?.users
                            .filter((user) => {
                              const query = emailUserSearch.toLowerCase().trim();
                              if (!query) return true;
                              return (
                                user.email.toLowerCase().includes(query) ||
                                user.publicId.toLowerCase().includes(query) ||
                                user.id.toLowerCase().includes(query)
                              );
                            })
                            .map((user) => (
                              <SelectItem key={user.id} value={user.email}>
                                {user.email} ({user.publicId})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      
                      {emailUserSearch && (
                        <p className="text-sm text-green-400">
                          Found {usersData?.users.filter((user) => {
                            const query = emailUserSearch.toLowerCase().trim();
                            return (
                              user.email.toLowerCase().includes(query) ||
                              user.publicId.toLowerCase().includes(query) ||
                              user.id.toLowerCase().includes(query)
                            );
                          }).length || 0} user(s)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email-subject" className="text-purple-200">Subject</Label>
                    <Input
                      id="email-subject"
                      placeholder="Enter email subject..."
                      className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-400"
                      data-testid="input-email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-message" className="text-purple-200">Message</Label>
                    <textarea
                      id="email-message"
                      placeholder="Enter your message here..."
                      rows={8}
                      className="w-full bg-slate-800/50 border border-purple-500/20 rounded-md p-3 text-white placeholder:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      data-testid="textarea-email-message"
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                    />
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-purple-200 text-sm font-medium mb-2">📧 Email Configuration Status:</p>
                    <p className="text-purple-300 text-sm">
                      {systemSettings?.find(s => s.key === 'smtp_host' || s.key === 'sendgrid_api_key') ? 
                        '✅ Email service is configured and ready to send emails' : 
                        '⚠️ Email service not configured. Please set up SMTP or SendGrid credentials.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      onClick={async () => {
                        if (!emailSubject || !emailMessage) {
                          toast({
                            title: "Validation Error",
                            description: "Please fill in both subject and message fields",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (emailRecipientType === 'single' && !specificUserEmail) {
                          toast({
                            title: "Validation Error",
                            description: "Please select a user to send the email to",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          let requestBody: any = {
                            recipientType: emailRecipientType === 'all' ? 'all' : 'specific',
                            subject: emailSubject,
                            message: emailMessage
                          };

                          if (emailRecipientType === 'single') {
                            const selectedUser = usersData?.users.find(u => u.email === specificUserEmail);
                            if (selectedUser) {
                              requestBody.userIds = [selectedUser.id];
                            }
                          }

                          const res = await apiRequest('POST', '/api/admin/send-email', requestBody);
                          const data = await res.json();
                          
                          toast({
                            title: "✅ Email Sent Successfully",
                            description: data.message || `Email sent to ${data.recipientCount} user(s)`,
                          });
                          
                          setEmailSubject('');
                          setEmailMessage('');
                          setSpecificUserEmail('');
                          setEmailUserSearch('');
                        } catch (error: any) {
                          toast({
                            title: "Failed to Send Email",
                            description: error.message || "An error occurred while sending the email",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-testid="button-send-email"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                  </div>

                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-300 text-sm font-medium mb-2">⚠️ Important Notes:</p>
                    <ul className="text-yellow-200 text-sm space-y-1 ml-4">
                      <li>• {emailRecipientType === 'all' ? 'Emails will be sent to all registered users' : 'Email will be sent to the selected user only'}</li>
                      <li>• Make sure your message is clear and professional</li>
                      <li>• This action cannot be undone</li>
                      <li>• Email delivery depends on SMTP/SendGrid configuration</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PWA Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Send PWA Push Notifications
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Send push notifications to users who have enabled notifications in their browsers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notification-recipient-type" className="text-purple-200">Recipients</Label>
                    <Select 
                      value={notificationRecipientType} 
                      onValueChange={setNotificationRecipientType}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" id="notification-recipient-type" data-testid="select-notification-recipient-type">
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-purple-500/20">
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="single">Single User</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-purple-300">
                      {notificationRecipientType === 'all' 
                        ? (usersData?.users.length ? `Will send to ${usersData.users.length} users (who have enabled notifications)` : 'No users found')
                        : 'Will send to one specific user (if they have enabled notifications)'}
                    </p>
                  </div>

                  {notificationRecipientType === 'single' && (
                    <div className="space-y-2">
                      <Label htmlFor="notification-user-search" className="text-purple-200">Search User</Label>
                      <Input
                        id="notification-user-search"
                        placeholder="Search by email, public ID, or ID..."
                        className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-400"
                        data-testid="input-notification-user-search"
                        value={notificationUserSearch}
                        onChange={(e) => {
                          setNotificationUserSearch(e.target.value);
                          setSpecificUserForNotification("");
                        }}
                      />
                      
                      <Label htmlFor="specific-user-notification" className="text-purple-200 mt-4">Select User</Label>
                      <Select 
                        value={specificUserForNotification} 
                        onValueChange={setSpecificUserForNotification}
                      >
                        <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" id="specific-user-notification" data-testid="select-specific-user-notification">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/20 max-h-[300px]">
                          {usersData?.users
                            .filter((user) => {
                              const query = notificationUserSearch.toLowerCase().trim();
                              if (!query) return true;
                              return (
                                user.email.toLowerCase().includes(query) ||
                                user.publicId.toLowerCase().includes(query) ||
                                user.id.toLowerCase().includes(query)
                              );
                            })
                            .map((user) => (
                              <SelectItem key={user.id} value={user.email}>
                                {user.email} ({user.publicId})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      
                      {notificationUserSearch && (
                        <p className="text-sm text-green-400">
                          Found {usersData?.users.filter((user) => {
                            const query = notificationUserSearch.toLowerCase().trim();
                            return (
                              user.email.toLowerCase().includes(query) ||
                              user.publicId.toLowerCase().includes(query) ||
                              user.id.toLowerCase().includes(query)
                            );
                          }).length || 0} user(s)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notification-title" className="text-purple-200">
                      Title <span className="text-purple-400 text-xs font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="notification-title"
                      placeholder="Enter notification title (optional, max 100 characters)..."
                      className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-400"
                      data-testid="input-notification-title"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-purple-400">
                      Leave empty to show message only without title
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-message" className="text-purple-200">
                      Message <span className="text-red-400 text-xs">*</span>
                    </Label>
                    <textarea
                      id="notification-message"
                      placeholder="Enter your message here (required, max 500 characters)..."
                      rows={6}
                      className="w-full bg-slate-800/50 border border-purple-500/20 rounded-md p-3 text-white placeholder:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      data-testid="textarea-notification-message"
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      maxLength={500}
                    />
                    <p className="text-xs text-purple-400">
                      {notificationMessage.length}/500 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-type" className="text-purple-200">Notification Type</Label>
                    <Select 
                      value={notificationType} 
                      onValueChange={setNotificationType}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-purple-500/20 text-white" id="notification-type" data-testid="select-notification-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-purple-500/20">
                        <SelectItem value="info">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400">●</span> Info
                          </div>
                        </SelectItem>
                        <SelectItem value="success">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400">●</span> Success
                          </div>
                        </SelectItem>
                        <SelectItem value="warning">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">●</span> Warning
                          </div>
                        </SelectItem>
                        <SelectItem value="error">
                          <div className="flex items-center gap-2">
                            <span className="text-red-400">●</span> Error
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-image-url" className="text-purple-200">Image URL (Optional)</Label>
                    <Input
                      id="notification-image-url"
                      placeholder="https://example.com/image.png"
                      className="bg-slate-800/50 border-purple-500/20 text-white placeholder:text-purple-400"
                      data-testid="input-notification-image-url"
                      value={notificationImageUrl}
                      onChange={(e) => setNotificationImageUrl(e.target.value)}
                    />
                    <p className="text-xs text-purple-400">
                      Add an image to make your notification more engaging (optional)
                    </p>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-purple-200 text-sm font-medium mb-2">🔔 PWA Push Notifications:</p>
                    <ul className="text-purple-300 text-sm space-y-1 ml-4">
                      <li>• Notifications will only be sent to users who have enabled push notifications</li>
                      <li>• Users receive notifications on their desktop or mobile browser</li>
                      <li>• Notifications appear even when the browser is closed (if supported)</li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      onClick={async () => {
                        if (!notificationMessage || notificationMessage.trim() === '') {
                          toast({
                            title: "Validation Error",
                            description: "Please enter a message (message is required)",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (notificationRecipientType === 'single' && !specificUserForNotification) {
                          toast({
                            title: "Validation Error",
                            description: "Please select a user to send the notification to",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          let requestBody: any = {
                            title: notificationTitle,
                            message: notificationMessage,
                            type: notificationType,
                          };

                          if (notificationImageUrl) {
                            requestBody.imageUrl = notificationImageUrl;
                          }

                          if (notificationRecipientType === 'single') {
                            const selectedUser = usersData?.users.find(u => u.email === specificUserForNotification);
                            if (selectedUser) {
                              requestBody.userId = selectedUser.email;
                            }
                          }

                          const res = await apiRequest('POST', '/api/notifications/send', requestBody);
                          const data = await res.json();
                          
                          toast({
                            title: "✅ Notification Sent Successfully",
                            description: data.message || (notificationRecipientType === 'all' ? 
                              `Notification sent to all users` : 
                              `Notification sent to ${data.targetUser?.email || 'user'}`
                            ),
                          });
                          
                          setNotificationTitle('');
                          setNotificationMessage('');
                          setNotificationType('info');
                          setNotificationImageUrl('');
                          setSpecificUserForNotification('');
                          setNotificationUserSearch('');
                        } catch (error: any) {
                          toast({
                            title: "Failed to Send Notification",
                            description: error.message || "An error occurred while sending the notification",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-testid="button-send-notification"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Send Notification
                    </Button>
                  </div>

                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-300 text-sm font-medium mb-2">⚠️ Important Notes:</p>
                    <ul className="text-yellow-200 text-sm space-y-1 ml-4">
                      <li>• {notificationRecipientType === 'all' ? 'Notifications will be sent to all users who have enabled push notifications' : 'Notification will be sent to the selected user only'}</li>
                      <li>• Users must have granted notification permissions in their browser</li>
                      <li>• This action cannot be undone</li>
                      <li>• Keep messages clear, concise, and professional</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promo-codes" className="space-y-6">
            <PromoCodesManager />
          </TabsContent>

          {/* Database Management Tab */}
          <TabsContent value="databases" className="space-y-6">
            <DatabaseManagement />
          </TabsContent>

          {/* Digital Ocean Management Tab */}
          <TabsContent value="digitalocean" className="space-y-6">
            <DigitalOceanManagement />
          </TabsContent>

          {/* Server Usage Monitor Tab */}
          <TabsContent value="server-usage" className="space-y-6">
            <ServerUsageMonitor />
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system-health" className="space-y-6">
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  System Health & Monitoring
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Real-time period synchronization and calculation validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodSyncValidator />
              </CardContent>
            </Card>

            <GameRecoveryDashboard />
          </TabsContent>

          {/* Telegram Reactions Tab */}
          <TabsContent value="telegram" className="space-y-6">
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-400" />
                  Telegram Auto-Reactions (N1Panel Integration)
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Automatically add reactions to Telegram group posts using N1Panel SMM services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* API Configuration Section */}
                <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-400" />
                    N1Panel API Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-purple-200">API Key</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="Enter your N1Panel API key"
                          value={telegramApiKey}
                          onChange={(e) => setTelegramApiKey(e.target.value)}
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-telegram-api-key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apiUrl" className="text-purple-200">API URL</Label>
                        <Input
                          id="apiUrl"
                          type="url"
                          value={telegramApiUrl}
                          onChange={(e) => setTelegramApiUrl(e.target.value)}
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-telegram-api-url"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={telegramApiActive}
                          onCheckedChange={setTelegramApiActive}
                          data-testid="switch-telegram-active" 
                        />
                        <Label className="text-purple-200">Active</Label>
                      </div>
                      <Button 
                        onClick={() => saveTelegramSettingsMutation.mutate({
                          apiKey: telegramApiKey,
                          apiUrl: telegramApiUrl,
                          isActive: telegramApiActive,
                        })}
                        disabled={saveTelegramSettingsMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700" 
                        data-testid="button-save-telegram-settings"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveTelegramSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-300 text-sm">
                        💡 Get your API key from <a href="https://n1panel.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">N1Panel.com</a>. 
                        After registration, navigate to API section to generate your key.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-Reaction Configuration Section */}
                <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                    Auto-Reaction Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-300 text-sm">
                        💡 Configure automatic Telegram reactions on new channel posts. When enabled, the system will automatically place orders on N1Panel for each new post in the monitored channel.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={autoReactionEnabled}
                          onCheckedChange={setAutoReactionEnabled}
                          data-testid="switch-auto-reaction-enabled" 
                        />
                        <Label className="text-purple-200">
                          {autoReactionEnabled ? '✅ Auto-Reaction Enabled' : '⏸️ Auto-Reaction Disabled'}
                        </Label>
                      </div>
                      <Badge 
                        className={autoReactionEnabled ? 'bg-green-600/20 text-green-300 border-green-500/20' : 'bg-gray-600/20 text-gray-300 border-gray-500/20'}
                      >
                        {autoReactionEnabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reactionChannelId" className="text-purple-200">
                          Channel ID to Monitor *
                        </Label>
                        <Input
                          id="reactionChannelId"
                          value={reactionChannelId}
                          onChange={(e) => setReactionChannelId(e.target.value)}
                          placeholder="@yourchannel or -1001234567890"
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-reaction-channel-id"
                        />
                        <p className="text-xs text-purple-400">
                          Username (@channel) or numeric ID
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reactionChannelUsername" className="text-purple-200">
                          Channel Username
                        </Label>
                        <Input
                          id="reactionChannelUsername"
                          value={reactionChannelUsername}
                          onChange={(e) => setReactionChannelUsername(e.target.value)}
                          placeholder="e.g., mychannel"
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-reaction-channel-username"
                        />
                        <p className="text-xs text-purple-400">
                          Channel username without @ symbol
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reactionServiceId" className="text-purple-200">
                          N1Panel Service ID *
                        </Label>
                        <Input
                          id="reactionServiceId"
                          type="number"
                          value={reactionServiceId}
                          onChange={(e) => setReactionServiceId(e.target.value)}
                          placeholder="e.g., 3232"
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-reaction-service-id"
                        />
                        <p className="text-xs text-purple-400">
                          From N1Panel services list
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reactionMinQuantity" className="text-purple-200">
                          Min Quantity per Order
                        </Label>
                        <Input
                          id="reactionMinQuantity"
                          type="number"
                          value={reactionMinQuantity}
                          onChange={(e) => setReactionMinQuantity(e.target.value)}
                          placeholder="20"
                          min="1"
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-reaction-min-quantity"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reactionMaxQuantity" className="text-purple-200">
                          Max Quantity per Order
                        </Label>
                        <Input
                          id="reactionMaxQuantity"
                          type="number"
                          value={reactionMaxQuantity}
                          onChange={(e) => setReactionMaxQuantity(e.target.value)}
                          placeholder="50"
                          min="1"
                          className="bg-slate-900/50 border-purple-500/20 text-white"
                          data-testid="input-reaction-max-quantity"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        ⚡ Random Quantity: Each new post will receive a random number of reactions between {reactionMinQuantity || 20} and {reactionMaxQuantity || 50}.
                      </p>
                    </div>

                    {/* Critical Setup Instructions */}
                    <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-red-300 font-semibold mb-2">
                            ⚠️ IMPORTANT: Bot Must Be Channel Administrator
                          </h4>
                          <p className="text-red-200 text-sm mb-3">
                            For auto-reactions to work, your Telegram bot MUST be added as an administrator to the channel. Otherwise, the bot cannot detect new posts.
                          </p>
                          <div className="bg-white/5 rounded-lg p-3 space-y-2">
                            <p className="text-white/90 font-medium text-sm mb-2">Setup Steps:</p>
                            <ol className="text-white/80 text-sm space-y-1.5 list-decimal list-inside">
                              <li>Go to your Telegram channel settings</li>
                              <li>Navigate to "Administrators" section</li>
                              <li>Click "Add Administrator"</li>
                              <li>Search for your bot by username</li>
                              <li>Add the bot with at least "Post Messages" permission</li>
                              <li>Save and post a test message in the channel</li>
                              <li>Check the server logs below to verify detection</li>
                            </ol>
                          </div>
                          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                            <p className="text-blue-200 text-xs">
                              💡 <strong>Debugging Tip:</strong> If you post a message to the channel and see "📢 New channel post detected" in the server logs, your bot is properly configured. If not, the bot is not an admin or polling is disabled.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={() => saveAutoReactionMutation.mutate({
                          enabled: autoReactionEnabled,
                          channelId: reactionChannelId,
                          channelUsername: reactionChannelUsername,
                          serviceId: reactionServiceId,
                          minQuantity: reactionMinQuantity,
                          maxQuantity: reactionMaxQuantity,
                        })}
                        disabled={saveAutoReactionMutation.isPending || !reactionChannelId || !reactionServiceId}
                        className="bg-purple-600 hover:bg-purple-700" 
                        data-testid="button-save-auto-reaction"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveAutoReactionMutation.isPending ? "Saving..." : "Save Auto-Reaction Settings"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Telegram Groups Section */}
                <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-400" />
                      Telegram Groups ({telegramGroups.length})
                    </h3>
                    <Button 
                      onClick={() => setShowAddGroupDialog(true)} 
                      className="bg-purple-600 hover:bg-purple-700" 
                      data-testid="button-add-telegram-group"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Group
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {isLoadingGroups ? (
                      <div className="text-center py-8">
                        <Activity className="h-8 w-8 text-purple-400 mx-auto mb-3 animate-spin" />
                        <p className="text-purple-300">Loading telegram groups...</p>
                      </div>
                    ) : groupsError ? (
                      <div className="text-center py-8 text-red-300">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Failed to load telegram groups</p>
                        <p className="text-sm mt-1">{(groupsError as Error).message}</p>
                      </div>
                    ) : telegramGroups.length > 0 ? (
                      telegramGroups.map((group: any) => (
                        <div key={group.id} className="p-4 bg-slate-900/50 border border-purple-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{group.name}</h4>
                              <p className="text-sm text-purple-300">{group.telegramId}</p>
                              {group.telegramLink && (
                                <a 
                                  href={group.telegramLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline"
                                >
                                  {group.telegramLink}
                                </a>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <Badge className={group.autoReactEnabled ? "bg-green-600/20 text-green-300 border-green-500/20" : "bg-gray-600/20 text-gray-300 border-gray-500/20"}>
                                  Auto-React: {group.autoReactEnabled ? 'ON' : 'OFF'}
                                </Badge>
                                <span className="text-sm text-purple-300">{group.reactionCount} reactions per post</span>
                                <span className="text-xs text-purple-400">Service ID: {group.serviceId}</span>
                              </div>
                              {group.reactionEmojis && group.reactionEmojis.length > 0 && (
                                <div className="text-sm text-purple-300 mt-1">
                                  Emojis: {group.reactionEmojis.join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-purple-500/30"
                                onClick={() => {
                                  setEditingGroup(group);
                                  setGroupName(group.name);
                                  setGroupTelegramId(group.telegramId);
                                  setGroupTelegramLink(group.telegramLink || "");
                                  setGroupServiceId(group.serviceId.toString());
                                  setGroupServiceName(group.serviceName || "");
                                  setGroupAutoReact(group.autoReactEnabled);
                                  setGroupReactionCount(group.reactionCount.toString());
                                  setGroupReactionEmojis(group.reactionEmojis?.join(', ') || "👍,❤️,🔥");
                                  setShowAddGroupDialog(true);
                                }}
                                disabled={deleteGroupMutation.isPending}
                                data-testid={`button-edit-group-${group.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-500/30 text-red-400"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
                                    deleteGroupMutation.mutate(group.id);
                                  }
                                }}
                                disabled={deleteGroupMutation.isPending}
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                {deleteGroupMutation.isPending ? <Activity className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-purple-300">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No Telegram groups configured yet.</p>
                        <p className="text-sm mt-1">Click "Add Group" to get started.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Balance and Services */}
                {telegramApiActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Balance Card */}
                    <div className="p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Account Balance
                      </h3>
                      {isLoadingBalance ? (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-400 animate-spin" />
                          <span className="text-green-200 text-sm">Loading...</span>
                        </div>
                      ) : n1panelBalance?.error ? (
                        <p className="text-red-300 text-sm">{n1panelBalance.error}</p>
                      ) : (
                        <div className="text-2xl font-bold text-white">
                          ${n1panelBalance?.balance || '0.00'} {n1panelBalance?.currency || 'USD'}
                        </div>
                      )}
                    </div>

                    {/* Available Services */}
                    <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Available Services
                      </h3>
                      {isLoadingServices ? (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-400 animate-spin" />
                          <span className="text-blue-200 text-sm">Loading...</span>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-white">
                          {n1panelServices.length} Services
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Orders Section */}
                <div className="p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-400" />
                      Order Tracking ({n1panelOrdersData?.orders?.length || 0})
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/n1panel-orders'] })}
                      disabled={isLoadingOrders}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-refresh-orders"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  {isLoadingOrders ? (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-purple-400 mx-auto mb-3 animate-spin" />
                      <p className="text-purple-300">Loading orders...</p>
                    </div>
                  ) : !n1panelOrdersData?.orders || n1panelOrdersData.orders.length === 0 ? (
                    <div className="text-center py-8 text-purple-300">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No orders yet.</p>
                      <p className="text-sm mt-1">Orders will appear here when reactions are placed.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead className="text-purple-200">Order ID</TableHead>
                            <TableHead className="text-purple-200">Message</TableHead>
                            <TableHead className="text-purple-200">Service</TableHead>
                            <TableHead className="text-purple-200">Quantity</TableHead>
                            <TableHead className="text-purple-200">Status</TableHead>
                            <TableHead className="text-purple-200">Charge</TableHead>
                            <TableHead className="text-purple-200">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {n1panelOrdersData.orders.map((order: any) => (
                            <TableRow 
                              key={order.id} 
                              className="border-purple-500/20 hover:bg-purple-900/10"
                              data-testid={`row-order-${order.id}`}
                            >
                              <TableCell className="text-white font-mono text-xs">
                                {order.n1PanelOrderId || 'N/A'}
                              </TableCell>
                              <TableCell className="text-white max-w-xs">
                                <a 
                                  href={order.messageLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline text-sm truncate block"
                                >
                                  Message #{order.telegramMessageId}
                                </a>
                                <span className="text-xs text-purple-400">{order.telegramChannelId}</span>
                              </TableCell>
                              <TableCell className="text-white text-sm">
                                #{order.serviceId}
                              </TableCell>
                              <TableCell className="text-white font-semibold">
                                {order.quantity}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    order.status === 'completed' 
                                      ? 'bg-green-600/20 text-green-300 border-green-500/20'
                                      : order.status === 'processing'
                                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/20'
                                      : order.status === 'failed'
                                      ? 'bg-red-600/20 text-red-300 border-red-500/20'
                                      : 'bg-gray-600/20 text-gray-300 border-gray-500/20'
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white font-semibold">
                                {order.charge ? `$${parseFloat(order.charge).toFixed(4)}` : '-'}
                              </TableCell>
                              <TableCell className="text-purple-300 text-xs">
                                {new Date(order.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Help Section */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    How It Works
                  </h3>
                  <ul className="text-yellow-200 text-sm space-y-2 ml-4">
                    <li>• Configure your N1Panel API credentials above</li>
                    <li>• Add your Telegram groups/channels to monitor</li>
                    <li>• Enable auto-reactions for each group</li>
                    <li>• Set the number of reactions per post</li>
                    <li>• New posts will automatically receive reactions from N1Panel</li>
                    <li>• Monitor order status and history in the Recent Orders section</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <TelegramSignalsManager />
            
            {/* Telegram Scheduled Posts */}
            <TelegramScheduledPostsManager />
          </TabsContent>

          {/* Betting Tasks Tab */}
          <TabsContent value="betting-tasks" className="space-y-6">
            <Card className="admin-card admin-glow border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-400" />
                  Betting Tasks Management
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Create and manage betting challenges for users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Create New Task Form */}
                  <CreateBettingTaskForm />

                  {/* Existing Tasks List */}
                  <BettingTasksList />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Algorithm Monitor Tab */}
          <TabsContent value="algorithm-monitor" className="space-y-6">
            <LiveAlgorithmMonitor />
          </TabsContent>

          {/* Crash Game Settings Tab */}
          <TabsContent value="crash-settings" className="space-y-6">
            <CrashSettingsManager />
          </TabsContent>
          <TabsContent value="crash-refunds" className="space-y-6">
            <CrashRefundsTracker />
          </TabsContent>
        </Tabs>
      </main>

      {/* Ban User Dialog */}
      <Dialog open={!!banningUser} onOpenChange={() => {
        setBanningUser(null);
        setBanReason("");
        setBanDuration("1");
        setBanPermanent(false);
      }}>
        <DialogContent className="max-w-md bg-slate-900 border-purple-500/30 backdrop-blur-xl bg-opacity-90">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              Ban User - {banningUser?.email}
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              Temporarily or permanently ban this user from accessing the platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-purple-200">Ban Type</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={banPermanent}
                  onCheckedChange={setBanPermanent}
                  data-testid="switch-ban-permanent"
                />
                <span className="text-white">
                  {banPermanent ? 'Permanent Ban' : 'Temporary Ban'}
                </span>
              </div>
            </div>

            {!banPermanent && (
              <div className="space-y-2">
                <Label htmlFor="banDuration" className="text-purple-200">
                  Ban Duration (days)
                </Label>
                <Input
                  id="banDuration"
                  type="number"
                  min="1"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-white"
                  data-testid="input-ban-duration"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="banReason" className="text-purple-200">
                Ban Reason *
              </Label>
              <Input
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for ban..."
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-ban-reason"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setBanningUser(null);
                  setBanReason("");
                  setBanDuration("1");
                  setBanPermanent(false);
                }}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                data-testid="button-cancel-ban"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!banReason.trim()) {
                    toast({
                      title: "❌ Error",
                      description: "Ban reason is required",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const bannedUntil = banPermanent 
                    ? undefined 
                    : new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString();
                  
                  banUserMutation.mutate({
                    userId: banningUser!.id,
                    reason: banReason,
                    bannedUntil
                  });
                }}
                disabled={banUserMutation.isPending || !banReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-confirm-ban"
              >
                {banUserMutation.isPending ? 'Banning...' : 'Ban User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Telegram Group Dialog */}
      <Dialog open={showAddGroupDialog} onOpenChange={() => {
        setShowAddGroupDialog(false);
        setEditingGroup(null);
        setGroupName("");
        setGroupTelegramId("");
        setGroupTelegramLink("");
        setGroupServiceId("");
        setGroupServiceName("");
        setGroupAutoReact(false);
        setGroupReactionCount("100");
        setGroupReactionEmojis("👍,❤️,🔥");
      }}>
        <DialogContent className="max-w-2xl bg-slate-900 border-purple-500/30 backdrop-blur-xl bg-opacity-90 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              {editingGroup ? 'Edit' : 'Add'} Telegram Group
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              {editingGroup ? 'Update' : 'Add a new'} Telegram group/channel for auto-reactions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="groupName" className="text-purple-200">Group/Channel Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., My Telegram Channel"
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupTelegramId" className="text-purple-200">Telegram ID *</Label>
              <Input
                id="groupTelegramId"
                value={groupTelegramId}
                onChange={(e) => setGroupTelegramId(e.target.value)}
                placeholder="e.g., @mychannel or -1001234567890"
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-group-telegram-id"
              />
              <p className="text-xs text-purple-400">Channel username (@mychannel) or numeric ID (-1001234567890)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupTelegramLink" className="text-purple-200">Telegram Link (Optional)</Label>
              <Input
                id="groupTelegramLink"
                value={groupTelegramLink}
                onChange={(e) => setGroupTelegramLink(e.target.value)}
                placeholder="https://t.me/mychannel"
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-group-telegram-link"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupServiceId" className="text-purple-200">N1Panel Service ID *</Label>
                <Input
                  id="groupServiceId"
                  type="number"
                  value={groupServiceId}
                  onChange={(e) => setGroupServiceId(e.target.value)}
                  placeholder="e.g., 1234"
                  className="bg-slate-800 border-purple-500/30 text-white"
                  data-testid="input-group-service-id"
                />
                <p className="text-xs text-purple-400">From N1Panel.com Services page</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupServiceName" className="text-purple-200">Service Name (Optional)</Label>
                <Input
                  id="groupServiceName"
                  value={groupServiceName}
                  onChange={(e) => setGroupServiceName(e.target.value)}
                  placeholder="e.g., Telegram Reactions"
                  className="bg-slate-800 border-purple-500/30 text-white"
                  data-testid="input-group-service-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupReactionCount" className="text-purple-200">Reactions Per Post *</Label>
              <Input
                id="groupReactionCount"
                type="number"
                value={groupReactionCount}
                onChange={(e) => setGroupReactionCount(e.target.value)}
                placeholder="100"
                min="1"
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-group-reaction-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupReactionEmojis" className="text-purple-200">Reaction Emojis *</Label>
              <Input
                id="groupReactionEmojis"
                value={groupReactionEmojis}
                onChange={(e) => setGroupReactionEmojis(e.target.value)}
                placeholder="👍,❤️,🔥"
                className="bg-slate-800 border-purple-500/30 text-white"
                data-testid="input-group-reaction-emojis"
              />
              <p className="text-xs text-purple-400">Comma-separated emojis (e.g., 👍,❤️,🔥,😍)</p>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Switch
                checked={groupAutoReact}
                onCheckedChange={setGroupAutoReact}
                data-testid="switch-group-auto-react"
              />
              <Label className="text-purple-200 cursor-pointer">
                Enable Auto-Reactions (automatically react to new posts)
              </Label>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-sm font-semibold mb-2">How to find Service ID:</p>
              <ol className="text-blue-300 text-xs space-y-1 ml-4 list-decimal">
                <li>Login to <a href="https://n1panel.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">N1Panel.com</a></li>
                <li>Navigate to Services or Products section</li>
                <li>Find "Telegram Reactions" or similar service</li>
                <li>Copy the Service ID number displayed</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddGroupDialog(false);
                  setEditingGroup(null);
                  setGroupName("");
                  setGroupTelegramId("");
                  setGroupTelegramLink("");
                  setGroupServiceId("");
                  setGroupServiceName("");
                  setGroupAutoReact(false);
                  setGroupReactionCount("100");
                  setGroupReactionEmojis("👍,❤️,🔥");
                }}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                data-testid="button-cancel-group"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Validate required text fields
                  if (!groupName.trim() || !groupTelegramId.trim() || !groupReactionEmojis.trim()) {
                    toast({
                      title: "❌ Error",
                      description: "Please fill in all required fields (Name, Telegram ID, Service ID, Reaction Emojis)",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Validate numeric fields
                  const serviceId = parseInt(groupServiceId);
                  const reactionCount = parseInt(groupReactionCount);
                  
                  if (!groupServiceId.trim() || isNaN(serviceId) || serviceId <= 0) {
                    toast({
                      title: "❌ Error",
                      description: "Service ID must be a valid positive number",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (!groupReactionCount.trim() || isNaN(reactionCount) || reactionCount <= 0) {
                    toast({
                      title: "❌ Error",
                      description: "Reaction count must be a valid positive number",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  saveGroupMutation.mutate({
                    name: groupName,
                    telegramId: groupTelegramId,
                    telegramLink: groupTelegramLink,
                    serviceId: groupServiceId,
                    serviceName: groupServiceName,
                    autoReact: groupAutoReact,
                    reactionCount: groupReactionCount,
                    reactionEmojis: groupReactionEmojis,
                  });
                }}
                disabled={saveGroupMutation.isPending || !groupName.trim() || !groupTelegramId.trim() || !groupServiceId.trim() || !groupReactionCount.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-save-group"
              >
                {saveGroupMutation.isPending ? 'Saving...' : (editingGroup ? 'Update Group' : 'Add Group')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* IP History Dialog */}
      <Dialog open={!!viewingIpHistory} onOpenChange={() => {
        setViewingIpHistory(null);
        setUserSessions([]);
      }}>
        <DialogContent className="max-w-4xl bg-slate-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-400" />
              IP History - {viewingIpHistory?.email}
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              Complete login history with IP addresses, devices, and browsers
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {loadingIpHistory ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="text-purple-300">Loading IP history...</p>
              </div>
            ) : userSessions.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <p className="text-purple-300">No login history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/20">
                      <TableHead className="text-purple-200">IP Address</TableHead>
                      <TableHead className="text-purple-200">Device</TableHead>
                      <TableHead className="text-purple-200">Browser</TableHead>
                      <TableHead className="text-purple-200">OS</TableHead>
                      <TableHead className="text-purple-200">Login Time</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.map((session: any) => {
                      const ipAddress = session.ipAddress || 'Unknown';
                      const ipType = detectIpType(session.ipAddress);
                      
                      return (
                      <TableRow key={session.id} className="border-purple-500/10 hover:bg-slate-800/30">
                        <TableCell className="text-white">
                          <div className="flex flex-col gap-1.5">
                            {ipType === 'ipv6' && (
                              <Badge className="w-fit bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs font-semibold">
                                IPv6
                              </Badge>
                            )}
                            {ipType === 'ipv4' && (
                              <Badge className="w-fit bg-green-500/20 text-green-300 border-green-500/30 text-xs font-semibold">
                                IPv4
                              </Badge>
                            )}
                            {ipType === 'unknown' && (
                              <Badge className="w-fit bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs font-semibold">
                                Unknown
                              </Badge>
                            )}
                            <span className="font-mono text-sm text-white">{ipAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            {session.deviceType === 'mobile' ? (
                              <Smartphone className="h-4 w-4 text-blue-400" />
                            ) : session.deviceType === 'tablet' ? (
                              <Tablet className="h-4 w-4 text-purple-400" />
                            ) : (
                              <Monitor className="h-4 w-4 text-green-400" />
                            )}
                            <div className="flex flex-col">
                              <span className="capitalize">{session.deviceType || 'Unknown'}</span>
                              {session.deviceModel && session.deviceModel !== 'Unknown' && (
                                <span className="text-xs text-purple-300">{session.deviceModel}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          {session.browserName || 'Unknown'}
                          {session.browserVersion && ` ${session.browserVersion}`}
                        </TableCell>
                        <TableCell className="text-white">
                          {session.operatingSystem || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-white">
                          {new Date(session.loginTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              session.isActive
                                ? "bg-green-500/20 text-green-300 border-green-500/30"
                                : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                            }
                          >
                            {session.isActive ? 'Active' : 'Logged Out'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}