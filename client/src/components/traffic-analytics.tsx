import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, TrendingUp, Monitor, Smartphone, Tablet, Laptop, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface DailyVisitors {
  uniqueVisitors: number;
  totalPageViews: number;
}

interface TrafficStats {
  totalPageViews: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number }>;
  deviceBreakdown: Array<{ deviceType: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  dailyStats: Array<{ date: string; pageViews: number; uniqueVisitors: number }>;
}

const DEVICE_COLORS: Record<string, string> = {
  Desktop: "#8b5cf6",
  Mobile: "#10b981",
  Tablet: "#f59e0b",
  Unknown: "#6b7280",
};

const DEVICE_ICONS: Record<string, any> = {
  Desktop: Laptop,
  Mobile: Smartphone,
  Tablet: Tablet,
  Unknown: Monitor,
};

interface User {
  id: string;
  email: string;
  role: "user" | "admin" | "agent";
}

export default function TrafficAnalytics() {
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const isAdmin = currentUser?.role === "admin";

  const { data: dailyVisitors, isLoading: loadingDaily, error: dailyError } = useQuery<DailyVisitors>({
    queryKey: ['/api/admin/traffic/daily'],
    enabled: isAdmin,
  });

  const { data: trafficStats, isLoading: loadingStats, error: statsError } = useQuery<TrafficStats>({
    queryKey: [`/api/admin/traffic/stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`],
    enabled: isAdmin,
  });

  if (loadingDaily || loadingStats) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (dailyError || statsError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold">Failed to load traffic analytics</p>
          <p className="text-sm text-gray-400 mt-2">
            {dailyError ? 'Daily visitor data unavailable' : 'Traffic statistics unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20" data-testid="card-daily-visitors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Daily Visitors (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white" data-testid="text-daily-visitors">
              {(dailyVisitors?.uniqueVisitors ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20" data-testid="card-daily-pageviews">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-400" />
              Daily Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white" data-testid="text-daily-pageviews">
              {(dailyVisitors?.totalPageViews ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20" data-testid="card-total-visitors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-400" />
              Total Visitors (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white" data-testid="text-total-visitors">
              {(trafficStats?.uniqueVisitors ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20" data-testid="card-total-pageviews">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              Total Page Views (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white" data-testid="text-total-pageviews">
              {(trafficStats?.totalPageViews ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends Chart */}
        <Card className="bg-gray-900/50 border-gray-800" data-testid="card-daily-trends">
          <CardHeader>
            <CardTitle className="text-white">Daily Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trafficStats?.dailyStats && trafficStats.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trafficStats.dailyStats}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pageViews" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Page Views"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueVisitors" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Unique Visitors"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="bg-gray-900/50 border-gray-800" data-testid="card-device-breakdown">
          <CardHeader>
            <CardTitle className="text-white">Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {trafficStats?.deviceBreakdown && trafficStats.deviceBreakdown.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={trafficStats.deviceBreakdown}
                      dataKey="count"
                      nameKey="deviceType"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.deviceType}: ${entry.count}`}
                    >
                      {trafficStats.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[entry.deviceType] || DEVICE_COLORS.Unknown} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-3">
                  {trafficStats.deviceBreakdown.map((device) => {
                    const Icon = DEVICE_ICONS[device.deviceType] || DEVICE_ICONS.Unknown;
                    const total = trafficStats.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
                    const percentage = total > 0 ? ((device.count / total) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div
                        key={device.deviceType}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                        data-testid={`device-${device.deviceType.toLowerCase()}`}
                      >
                        <Icon className="h-5 w-5" style={{ color: DEVICE_COLORS[device.deviceType] || DEVICE_COLORS.Unknown }} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{device.deviceType}</div>
                          <div className="text-xs text-gray-400">
                            {device.count} ({percentage}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No device data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Country Breakdown & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Breakdown */}
        <Card className="bg-gray-900/50 border-gray-800" data-testid="card-country-breakdown">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Top Countries (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trafficStats?.countryBreakdown && trafficStats.countryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficStats.countryBreakdown.slice(0, 10)} layout="vertical">
                  <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                  <YAxis 
                    dataKey="country" 
                    type="category"
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af' }}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="Visitors" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No country data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Country Users */}
        <Card className="bg-gray-900/50 border-gray-800" data-testid="card-active-country-users">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-400" />
              Active Country Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trafficStats?.countryBreakdown && trafficStats.countryBreakdown.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-400 font-medium mb-4">Total Users</div>
                {trafficStats.countryBreakdown.slice(0, 10).map((country) => (
                  <div
                    key={country.country}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-green-500/50 transition-colors"
                    data-testid={`country-user-${country.country.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-white font-medium">{country.country}</span>
                    </div>
                    <span className="text-green-400 font-bold text-lg">{country.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No country data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-gray-900/50 border-gray-800" data-testid="card-top-pages">
          <CardHeader>
            <CardTitle className="text-white">Top Pages (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trafficStats?.topPages && trafficStats.topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficStats.topPages}>
                  <XAxis 
                    dataKey="path" 
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="views" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No page view data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
