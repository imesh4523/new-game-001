import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useWebSocket } from "@/hooks/use-websocket";

// Utility functions for game result mapping
const getResultColor = (result: number): string => {
  if (result === 5) return 'violet';
  if ([1, 3, 7, 9].includes(result)) return 'green';
  if (result === 0) return 'violet';
  return 'red';
};

const getResultSize = (result: number): string => {
  return result >= 5 ? 'big' : 'small';
};

export default function LiveTrendsChart() {
  // WebSocket connection for real-time updates
  const { gameResults } = useWebSocket();
  
  // Fetch game history for trend analysis
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/games/history'],
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });

  // Sort history to ensure newest first (most recent games)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.createdAt || b.endTime).getTime() - new Date(a.createdAt || a.endTime).getTime()
  );

  // Calculate trend statistics with proper percentages
  const calculateTrends = () => {
    if (sortedHistory.length === 0) return null;
    
    const last10Games = sortedHistory.slice(0, 10);
    const last20Games = sortedHistory.slice(0, 20);
    
    // Count colors in last 10 games
    const colorCounts = {
      green: last10Games.filter(g => getResultColor(g.result) === 'green').length,
      red: last10Games.filter(g => getResultColor(g.result) === 'red').length,
      violet: last10Games.filter(g => getResultColor(g.result) === 'violet').length,
    };
    
    // Count sizes in last 10 games
    const sizeCounts = {
      big: last10Games.filter(g => getResultSize(g.result) === 'big').length,
      small: last10Games.filter(g => getResultSize(g.result) === 'small').length,
    };
    
    // Calculate color percentages for last 10 vs last 20 games
    const recentGreenPercent = (colorCounts.green / last10Games.length) * 100;
    const recentRedPercent = (colorCounts.red / last10Games.length) * 100;
    const recentVioletPercent = (colorCounts.violet / last10Games.length) * 100;
    
    const overallGreenPercent = (last20Games.filter(g => getResultColor(g.result) === 'green').length / last20Games.length) * 100;
    const overallRedPercent = (last20Games.filter(g => getResultColor(g.result) === 'red').length / last20Games.length) * 100;
    const overallVioletPercent = (last20Games.filter(g => getResultColor(g.result) === 'violet').length / last20Games.length) * 100;
    
    return {
      colorCounts,
      sizeCounts,
      recentGreenPercent: recentGreenPercent.toFixed(1),
      recentRedPercent: recentRedPercent.toFixed(1),
      recentVioletPercent: recentVioletPercent.toFixed(1),
      overallGreenPercent: overallGreenPercent.toFixed(1),
      overallRedPercent: overallRedPercent.toFixed(1),
      overallVioletPercent: overallVioletPercent.toFixed(1),
      greenTrend: recentGreenPercent > overallGreenPercent ? 'up' : 'down',
      redTrend: recentRedPercent > overallRedPercent ? 'up' : 'down',
      violetTrend: recentVioletPercent > overallVioletPercent ? 'up' : 'down'
    };
  };

  // Prepare chart data for the last 10 games (oldest to newest for timeline)
  const chartData = sortedHistory.slice(0, 10).reverse().map((game, index) => {
    const color = getResultColor(game.result);
    return {
      game: `${index + 1}`,
      result: game.result,
      color: color,
      size: getResultSize(game.result),
      dotColor: color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : '#8b5cf6'
    };
  });

  // Color distribution chart data
  const trends = calculateTrends();
  const colorDistributionData = trends ? [
    { name: 'Green', value: trends.colorCounts.green, fill: '#10b981', percentage: trends.recentGreenPercent },
    { name: 'Red', value: trends.colorCounts.red, fill: '#ef4444', percentage: trends.recentRedPercent },
    { name: 'Violet', value: trends.colorCounts.violet, fill: '#8b5cf6', percentage: trends.recentVioletPercent },
  ] : [];

  const chartConfig = {
    result: {
      label: "Result",
      color: "hsl(var(--chart-1))",
    },
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-xl">
        <div className="relative p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
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
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Live Trends Chart
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/60">Live</span>
          </div>
        </div>
        
        {sortedHistory.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/60">No game data available yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Color Trend Statistics */}
            {trends && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-emerald-400">Green</span>
                    {trends.greenTrend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{trends.recentGreenPercent}%</div>
                  <div className="text-xs text-white/40">vs {trends.overallGreenPercent}% avg</div>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-red-400">Red</span>
                    {trends.redTrend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-red-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{trends.recentRedPercent}%</div>
                  <div className="text-xs text-white/40">vs {trends.overallRedPercent}% avg</div>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-violet-400">Violet</span>
                    {trends.violetTrend === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-violet-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{trends.recentVioletPercent}%</div>
                  <div className="text-xs text-white/40">vs {trends.overallVioletPercent}% avg</div>
                </div>
              </div>
            )}
            
            {/* Color Distribution Chart */}
            {trends && (
              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-3">Color Distribution (Last 10 Games)</h4>
                <ChartContainer config={chartConfig} className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={colorDistributionData}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                      />
                      <YAxis hide />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-black/80 text-white p-2 rounded border border-white/20">
                                <p className="text-sm">{`${label}: ${data.value} games`}</p>
                                <p className="text-xs text-white/60">{`${data.percentage}% of last 10`}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {colorDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
            
            {/* Recent Results Line Chart */}
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-3">Recent Results Trend</h4>
              <ChartContainer config={chartConfig} className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="game" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 9]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                    />
                    <ChartTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-black/80 text-white p-2 rounded border border-white/20">
                              <p className="text-sm">{`Game ${label}: ${data.result}`}</p>
                              <p className="text-xs" style={{ color: data.dotColor }}>
                                {data.color.charAt(0).toUpperCase() + data.color.slice(1)} • {data.size.charAt(0).toUpperCase() + data.size.slice(1)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="result" 
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={({ cx, cy, payload }) => (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={4} 
                          fill={payload.dotColor} 
                          strokeWidth={2} 
                          stroke="white"
                        />
                      )}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-lg font-bold text-emerald-400">{trends?.colorCounts.green || 0}</div>
                <div className="text-xs text-white/60">Green</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-lg font-bold text-red-400">{trends?.colorCounts.red || 0}</div>
                <div className="text-xs text-white/60">Red</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="text-lg font-bold text-violet-400">{trends?.colorCounts.violet || 0}</div>
                <div className="text-xs text-white/60">Violet</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}