import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/hooks/use-websocket";
import { Server, Cpu, HardDrive, Activity, Clock, Zap } from "lucide-react";

interface ServerMetrics {
  cpu: {
    count: number;
    model?: string;
    usage: number;
    cores: Array<{
      core: number;
      usage: number;
    }>;
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

export default function ServerUsageMonitor() {
  const { serverMetrics: liveMetrics } = useWebSocket();

  const { data: apiMetrics, isLoading } = useQuery<{ success: boolean; metrics: ServerMetrics }>({
    queryKey: ['/api/admin/server-metrics'],
    refetchInterval: 10000,
  });

  const metrics = liveMetrics || apiMetrics?.metrics;

  if (isLoading && !metrics) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Server Usage Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Activity className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Server Usage Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-300 text-center py-4">No server metrics available</p>
        </CardContent>
      </Card>
    );
  }

  const getCpuColor = (usage: number) => {
    if (usage < 50) return "text-green-400";
    if (usage < 80) return "text-yellow-400";
    return "text-red-400";
  };

  const getMemoryColor = (usage: number) => {
    if (usage < 60) return "text-green-400";
    if (usage < 85) return "text-yellow-400";
    return "text-red-400";
  };

  const getProgressColor = (usage: number) => {
    if (usage < 50) return "bg-green-500";
    if (usage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Server Usage Monitor
            {liveMetrics && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 ml-auto">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Live
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-gray-400">
            Real-time server performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-200">CPU Usage</h3>
                </div>
                <span className={`text-2xl font-bold ${getCpuColor(metrics.cpu.usage)}`} data-testid="text-cpu-usage">
                  {metrics.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-700" data-testid="progress-cpu-usage">
                <div 
                  className={`h-full transition-all ${getProgressColor(metrics.cpu.usage)}`}
                  style={{ width: `${metrics.cpu.usage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{metrics.cpu.count} vCPU{metrics.cpu.count > 1 ? 's' : ''}</span>
                {metrics.cpu.model && metrics.cpu.model.length > 30 && (
                  <span className="text-right truncate ml-2" title={metrics.cpu.model}>
                    {metrics.cpu.model.substring(0, 30)}...
                  </span>
                )}
                {metrics.cpu.model && metrics.cpu.model.length <= 30 && (
                  <span className="text-right truncate ml-2" title={metrics.cpu.model}>
                    {metrics.cpu.model}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Memory Usage</h3>
                </div>
                <span className={`text-2xl font-bold ${getMemoryColor(metrics.memory.usagePercent)}`} data-testid="text-memory-usage">
                  {metrics.memory.usagePercent.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-700" data-testid="progress-memory-usage">
                <div 
                  className={`h-full transition-all ${getProgressColor(metrics.memory.usagePercent)}`}
                  style={{ width: `${metrics.memory.usagePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{metrics.memory.usedFormatted} / {metrics.memory.totalFormatted}</span>
                <span>{metrics.memory.freeFormatted} free</span>
              </div>
            </div>
          </div>

          {metrics.cpu.cores && metrics.cpu.cores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                CPU Core Usage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.cpu.cores.map((core) => (
                  <div 
                    key={core.core} 
                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                    data-testid={`core-usage-${core.core}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Core {core.core}</span>
                      <span className={`text-sm font-bold ${getCpuColor(core.usage)}`}>
                        {core.usage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div 
                        className={`h-full transition-all ${getProgressColor(core.usage)}`}
                        style={{ width: `${core.usage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metrics.cpu.loadAverage && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="text-xs text-gray-400 mb-1">Load Avg (1m)</div>
                <div className="text-lg font-bold text-blue-400" data-testid="text-load-1min">
                  {metrics.cpu.loadAverage?.['1min'] ?? 0}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="text-xs text-gray-400 mb-1">Load Avg (5m)</div>
                <div className="text-lg font-bold text-blue-400" data-testid="text-load-5min">
                  {metrics.cpu.loadAverage?.['5min'] ?? 0}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="text-xs text-gray-400 mb-1">Load Avg (15m)</div>
                <div className="text-lg font-bold text-blue-400" data-testid="text-load-15min">
                  {metrics.cpu.loadAverage?.['15min'] ?? 0}
                </div>
              </div>
            </div>
          )}

          {metrics.system && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/50">
              <div className="space-y-1">
                <div className="text-xs text-gray-400">Platform</div>
                <div className="text-sm font-medium text-white capitalize" data-testid="text-platform">
                  {metrics.system?.platform ?? 'Unknown'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400">Architecture</div>
                <div className="text-sm font-medium text-white" data-testid="text-arch">
                  {metrics.system?.arch ?? 'Unknown'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Uptime
                </div>
                <div className="text-sm font-medium text-green-400" data-testid="text-uptime">
                  {metrics.system?.uptimeFormatted ?? '0s'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400">Hostname</div>
                <div className="text-sm font-medium text-white truncate" title={metrics.system?.hostname ?? 'Unknown'} data-testid="text-hostname">
                  {metrics.system?.hostname ?? 'Unknown'}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 text-xs text-gray-500 pt-2 border-t border-slate-700/50">
            <Activity className="h-3 w-3" />
            <span>
              Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
