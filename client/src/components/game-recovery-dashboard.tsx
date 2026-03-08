import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Activity,
  Settings,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RecoveryStats {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  lastRecoveryTime: string | null;
  isRunning: boolean;
  monitoredDurations: number[];
  recoveryHistory: Array<{
    duration: number;
    timestamp: string;
    success: boolean;
    reason: string;
  }>;
}

interface MonitoringStatus {
  duration: number;
  maxInactiveTime: number;
  lastCheckTime: string | null;
  lastGameEndTime: string | null;
}

export function GameRecoveryDashboard() {
  const { toast } = useToast();
  const [configDuration, setConfigDuration] = useState<number>(1);
  const [maxInactiveSeconds, setMaxInactiveSeconds] = useState<number>(60);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const { data: statusData, isLoading } = useQuery<{ 
    success: boolean; 
    stats: RecoveryStats;
    monitoring: MonitoringStatus[];
  }>({
    queryKey: ["/api/admin/game-recovery/status"],
    refetchInterval: 5000,
  });

  const recoverMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest("POST", `/api/admin/game-recovery/recover/${duration}`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-recovery/status"] });
      if (data.success) {
        toast({
          title: "✅ Recovery Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "⚠️ Recovery Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "❌ Recovery Failed",
        description: "Failed to trigger game recovery",
        variant: "destructive",
      });
    },
  });

  const configureMutation = useMutation({
    mutationFn: async ({ duration, maxInactiveSeconds }: { duration: number; maxInactiveSeconds: number }) => {
      const response = await apiRequest("POST", "/api/admin/game-recovery/configure", {
        duration,
        maxInactiveSeconds
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-recovery/status"] });
      setConfigDialogOpen(false);
      toast({
        title: "✅ Configuration Updated",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "❌ Configuration Failed",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/game-recovery/clear-history", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-recovery/status"] });
      toast({
        title: "✅ History Cleared",
        description: "Recovery history cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "❌ Clear Failed",
        description: "Failed to clear recovery history",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">Game Auto-Recovery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = statusData?.stats;
  const monitoring = statusData?.monitoring || [];

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-200 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Game Auto-Recovery System
              </CardTitle>
              <CardDescription className="text-slate-400">
                Automatically detects and recovers inactive games
              </CardDescription>
            </div>
            <Badge 
              variant={stats?.isRunning ? "default" : "secondary"}
              className={stats?.isRunning ? "bg-green-500/20 text-green-400" : ""}
            >
              {stats?.isRunning ? "🟢 Running" : "⚪ Stopped"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Total Recoveries</p>
              <p className="text-2xl font-bold text-purple-200">{stats?.totalRecoveries || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Successful</p>
              <p className="text-2xl font-bold text-green-400">{stats?.successfulRecoveries || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Failed</p>
              <p className="text-2xl font-bold text-red-400">{stats?.failedRecoveries || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Success Rate</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats?.totalRecoveries 
                  ? `${Math.round((stats.successfulRecoveries / stats.totalRecoveries) * 100)}%` 
                  : "N/A"}
              </p>
            </div>
          </div>

          {stats?.lastRecoveryTime && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Last Recovery:</p>
              <p className="text-sm text-purple-200">
                {new Date(stats.lastRecoveryTime).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Status */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-200 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Monitoring Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Inactive time thresholds for each game duration
              </CardDescription>
            </div>
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                  data-testid="button-configure-recovery"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="text-purple-200">Configure Recovery Settings</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Set the maximum inactive time before auto-recovery triggers
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="duration" className="text-purple-200">Game Duration (minutes)</Label>
                    <select
                      id="duration"
                      value={configDuration}
                      onChange={(e) => setConfigDuration(parseInt(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-purple-500/30 bg-slate-800 px-3 py-2 text-sm text-purple-200"
                      data-testid="select-duration"
                    >
                      <option value={1}>1 Minute</option>
                      <option value={3}>3 Minutes</option>
                      <option value={5}>5 Minutes</option>
                      <option value={10}>10 Minutes</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxInactive" className="text-purple-200">
                      Max Inactive Time (seconds)
                    </Label>
                    <Input
                      id="maxInactive"
                      type="number"
                      value={maxInactiveSeconds}
                      onChange={(e) => setMaxInactiveSeconds(parseInt(e.target.value))}
                      min={10}
                      max={300}
                      className="border-purple-500/30 bg-slate-800 text-purple-200"
                      data-testid="input-max-inactive"
                    />
                    <p className="text-xs text-slate-400">
                      Time in seconds (10-300). If a game is inactive longer than this, it will be auto-recovered.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => configureMutation.mutate({ duration: configDuration, maxInactiveSeconds })}
                    disabled={configureMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-save-config"
                  >
                    {configureMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {monitoring.map((config) => (
              <Card key={config.duration} className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-purple-200">{config.duration} Min</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recoverMutation.mutate(config.duration)}
                        disabled={recoverMutation.isPending}
                        className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                        data-testid={`button-recover-${config.duration}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Recover
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Max Inactive Time</p>
                      <p className="text-sm font-semibold text-purple-200">
                        {config.maxInactiveTime}s
                      </p>
                    </div>
                    {config.lastCheckTime && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400">Last Checked</p>
                        <p className="text-xs text-purple-200">
                          {new Date(config.lastCheckTime).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recovery History */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-200">Recovery History</CardTitle>
              <CardDescription className="text-slate-400">
                Recent auto-recovery events
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
              className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
              data-testid="button-clear-history"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.recoveryHistory && stats.recoveryHistory.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-purple-200">Duration</TableHead>
                    <TableHead className="text-purple-200">Timestamp</TableHead>
                    <TableHead className="text-purple-200">Status</TableHead>
                    <TableHead className="text-purple-200">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recoveryHistory.map((event, index) => (
                    <TableRow key={index} className="border-slate-700">
                      <TableCell className="text-purple-200 font-medium">
                        {event.duration} min
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {event.success ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {event.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No recovery events recorded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
