import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Clock, Activity, Target, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

interface RevenueForecastData {
  historical: Array<{ date: string; revenue: number; bets: number; volume: number }>;
  forecast: Array<{ date: string; revenue: number; isForecast: boolean }>;
}

interface PlayerBehaviorData {
  totalPlayers: number;
  activePlayers: number;
  avgBetsPerPlayer: number;
  playerSegments: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  vipDistribution: Record<string, number>;
  winningPlayers: number;
  losingPlayers: number;
  retentionRate: string;
}

interface WinLossData {
  overallRatio: string;
  totalWinnings: string;
  totalLosses: string;
  houseEdge: string;
  resultDistribution: Record<string, number>;
  profitDistribution: {
    highProfit: number;
    smallProfit: number;
    smallLoss: number;
    highLoss: number;
  };
}

interface PeakHoursData {
  hourlyActivity: Array<{ hour: number; bets: number; revenue: number; visitors: number }>;
  peakHours: {
    betting: number;
    revenue: number;
    visitors: number;
  };
}

const COLORS = {
  primary: "#8b5cf6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  violet: "#a855f7",
  green: "#22c55e",
  red: "#dc2626",
};

const SEGMENT_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#6b7280"];
const PROFIT_COLORS = ["#22c55e", "#86efac", "#fca5a5", "#ef4444"];

export default function AdvancedAnalytics() {
  const { data: revenueForecast, isLoading: loadingRevenue } = useQuery<RevenueForecastData>({
    queryKey: ['/api/admin/analytics/revenue-forecast'],
  });

  const { data: playerBehavior, isLoading: loadingBehavior } = useQuery<PlayerBehaviorData>({
    queryKey: ['/api/admin/analytics/player-behavior'],
  });

  const { data: winLossData, isLoading: loadingWinLoss } = useQuery<WinLossData>({
    queryKey: ['/api/admin/analytics/win-loss-ratio'],
  });

  const { data: peakHours, isLoading: loadingPeakHours } = useQuery<PeakHoursData>({
    queryKey: ['/api/admin/analytics/peak-hours'],
  });

  if (loadingRevenue || loadingBehavior || loadingWinLoss || loadingPeakHours) {
    return (
      <div className="flex justify-center items-center py-12">
        <Activity className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const historicalData = revenueForecast?.historical || [];
  const forecastData = revenueForecast?.forecast || [];
  
  // Combine data for chart with separate series for historical and forecast
  const combinedRevenueData = [
    ...historicalData.map(d => ({ ...d, historical: d.revenue, forecast: null })),
    ...forecastData.map(d => ({ ...d, historical: null, forecast: d.revenue }))
  ];

  const playerSegmentData = playerBehavior ? [
    { name: 'High Spenders', value: playerBehavior.playerSegments.high, color: COLORS.primary },
    { name: 'Medium Spenders', value: playerBehavior.playerSegments.medium, color: COLORS.secondary },
    { name: 'Low Spenders', value: playerBehavior.playerSegments.low, color: COLORS.accent },
    { name: 'Inactive', value: playerBehavior.playerSegments.inactive, color: COLORS.danger },
  ] : [];

  const profitDistData = winLossData ? [
    { name: 'High Profit', value: winLossData.profitDistribution.highProfit, color: PROFIT_COLORS[0] },
    { name: 'Small Profit', value: winLossData.profitDistribution.smallProfit, color: PROFIT_COLORS[1] },
    { name: 'Small Loss', value: winLossData.profitDistribution.smallLoss, color: PROFIT_COLORS[2] },
    { name: 'High Loss', value: winLossData.profitDistribution.highLoss, color: PROFIT_COLORS[3] },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Revenue Forecasting */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20" data-testid="card-revenue-forecast">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Revenue Forecasting
          </CardTitle>
          <CardDescription className="text-purple-300">
            Historical revenue trends and 7-day forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          {combinedRevenueData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-purple-500"></div>
                  <span className="text-gray-300">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #22c55e' }}></div>
                  <span className="text-gray-300">Forecast</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#a78bfa' }}
                    formatter={(value: any, name: string) => {
                      if (!value) return null;
                      if (name === 'Forecast') return [`$${value.toFixed(2)}`, 'Forecasted Revenue'];
                      return [`$${value.toFixed(2)}`, 'Historical Revenue'];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="historical" 
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                    name="Historical"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: COLORS.secondary }}
                    name="Forecast"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Behavior Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20" data-testid="card-player-behavior">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Player Behavior Analysis
            </CardTitle>
            <CardDescription className="text-blue-300">
              Player activity and engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playerBehavior && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-blue-300">Total Players</p>
                    <p className="text-2xl font-bold text-white" data-testid="text-total-players">
                      {playerBehavior.totalPlayers.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-300">Active Players</p>
                    <p className="text-2xl font-bold text-white" data-testid="text-active-players">
                      {playerBehavior.activePlayers.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300">Retention Rate</p>
                    <p className="text-2xl font-bold text-white" data-testid="text-retention-rate">
                      {playerBehavior.retentionRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-amber-500/20">
                    <p className="text-sm text-amber-300">Avg Bets/Player</p>
                    <p className="text-2xl font-bold text-white" data-testid="text-avg-bets">
                      {playerBehavior.avgBetsPerPlayer.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="h-[250px]">
                  <p className="text-sm text-gray-400 mb-2">Player Segments by Activity</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={playerSegmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {playerSegmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Ratio Charts */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20" data-testid="card-win-loss">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-green-400" />
              Win/Loss Ratio Analysis
            </CardTitle>
            <CardDescription className="text-green-300">
              Player profit distribution and house edge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {winLossData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-300">Total Winnings</p>
                    <p className="text-xl font-bold text-white" data-testid="text-total-winnings">
                      ${parseFloat(winLossData.totalWinnings).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-red-500/20">
                    <p className="text-sm text-red-300">Total Losses</p>
                    <p className="text-xl font-bold text-white" data-testid="text-total-losses">
                      ${parseFloat(winLossData.totalLosses).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300">Win/Loss Ratio</p>
                    <p className="text-xl font-bold text-white" data-testid="text-win-loss-ratio">
                      {winLossData.overallRatio}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-amber-500/20">
                    <p className="text-sm text-amber-300">House Edge</p>
                    <p className="text-xl font-bold text-white" data-testid="text-house-edge">
                      {winLossData.houseEdge}%
                    </p>
                  </div>
                </div>

                <div className="h-[250px]">
                  <p className="text-sm text-gray-400 mb-2">Player Profit Distribution</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profitDistData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {profitDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Analysis */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20" data-testid="card-peak-hours">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Peak Hours Analysis
          </CardTitle>
          <CardDescription className="text-amber-300">
            Hourly activity patterns and peak performance times
          </CardDescription>
        </CardHeader>
        <CardContent>
          {peakHours && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-purple-300">Peak Betting Hour</p>
                  <p className="text-2xl font-bold text-white" data-testid="text-peak-betting">
                    {peakHours.peakHours.betting}:00
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-green-500/20">
                  <p className="text-sm text-green-300">Peak Revenue Hour</p>
                  <p className="text-2xl font-bold text-white" data-testid="text-peak-revenue">
                    {peakHours.peakHours.revenue}:00
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-300">Peak Visitor Hour</p>
                  <p className="text-2xl font-bold text-white" data-testid="text-peak-visitors">
                    {peakHours.peakHours.visitors}:00
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours.hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="bets" fill={COLORS.primary} name="Bets" />
                  <Bar dataKey="visitors" fill={COLORS.secondary} name="Visitors" />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
