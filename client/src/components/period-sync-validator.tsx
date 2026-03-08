import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Activity,
  Shield,
  Database,
  TrendingUp
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PeriodSyncValidator() {
  const { periodSyncStatus, validationReport } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define types for API responses
  interface PeriodSyncStatusAPI {
    lastSync: string;
    activePeriods: Array<{
      duration: number;
      periodId: string;
      gameId: string;
      startTime: string;
      endTime: string;
      timeRemaining: number;
      status: 'active' | 'completed' | 'cancelled';
    }>;
    syncErrors: string[];
    isHealthy: boolean;
  }

  interface ValidationReportAPI {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    errors: Array<{
      timestamp: string;
      type: 'bet' | 'payout' | 'commission' | 'balance' | 'game_result';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      expectedValue: string | number;
      actualValue: string | number;
      entityId: string;
      autoFixed: boolean;
    }>;
    lastValidation: string;
    isHealthy: boolean;
  }

  // Fetch period sync status from API (fallback if WebSocket not available)
  const { data: apiSyncStatus } = useQuery<PeriodSyncStatusAPI>({
    queryKey: ['/api/admin/period-sync/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch validation report from API (fallback if WebSocket not available)
  const { data: apiValidationReport } = useQuery<ValidationReportAPI>({
    queryKey: ['/api/admin/validation/report'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Use WebSocket data if available, otherwise use API data
  const syncStatus = periodSyncStatus || apiSyncStatus;
  const validation = validationReport || apiValidationReport;

  // Auto-fix periods mutation
  const autoFixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/period-sync/fix', {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Auto-fix Complete",
        description: `Fixed ${data.fixed} period(s). ${data.errors.length} error(s) encountered.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/period-sync/status'] });
    },
    onError: () => {
      toast({
        title: "❌ Auto-fix Failed",
        description: "Failed to auto-fix period synchronization.",
        variant: "destructive",
      });
    },
  });

  // Run validation mutation
  const runValidationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/validation/run', {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Validation Complete",
        description: `${data.passedChecks}/${data.totalChecks} checks passed. ${data.failedChecks} failure(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation/report'] });
    },
    onError: () => {
      toast({
        title: "❌ Validation Failed",
        description: "Failed to run validation.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Period Synchronization Status */}
      <Card className="bg-slate-900/50 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Period Synchronization</CardTitle>
            </div>
            {syncStatus?.isHealthy ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <XCircle className="h-3 w-3 mr-1" />
                Issues Detected
              </Badge>
            )}
          </div>
          <CardDescription className="text-purple-300">
            Automatic period ID tracking and synchronization across all game systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncStatus ? (
            <>
              {/* Active Periods */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  Active Periods ({syncStatus.activePeriods?.length || 0})
                </h4>
                {syncStatus.activePeriods && syncStatus.activePeriods.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {syncStatus.activePeriods.map((period: any) => (
                      <div
                        key={period.duration}
                        className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                        data-testid={`period-sync-${period.duration}m`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{period.duration} Min Period</span>
                          <Badge
                            variant="outline"
                            className={
                              period.status === 'active'
                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                            }
                          >
                            {period.status}
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="text-purple-300 font-mono text-xs">
                            Period ID: {period.periodId}
                          </div>
                          <div className="flex items-center gap-1 text-blue-300">
                            <Clock className="h-3 w-3" />
                            {Math.floor(period.timeRemaining / 60)}:{(period.timeRemaining % 60).toString().padStart(2, '0')} remaining
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    No active periods
                  </div>
                )}
              </div>

              {/* Sync Errors */}
              {syncStatus.syncErrors && syncStatus.syncErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Recent Sync Errors ({syncStatus.syncErrors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {syncStatus.syncErrors.slice(0, 5).map((error: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 font-mono"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => autoFixMutation.mutate()}
                disabled={autoFixMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="button-autofix-periods"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoFixMutation.isPending ? 'animate-spin' : ''}`} />
                {autoFixMutation.isPending ? 'Fixing...' : 'Auto-Fix Periods'}
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p>Loading sync status...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Validation */}
      <Card className="bg-slate-900/50 border-green-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Calculation Validation</CardTitle>
            </div>
            {validation?.isHealthy ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Validation Issues
              </Badge>
            )}
          </div>
          <CardDescription className="text-green-300">
            Automatic validation of bets, payouts, commissions, and game results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validation ? (
            <>
              {/* Validation Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400" data-testid="text-total-checks">
                    {validation.totalChecks}
                  </div>
                  <div className="text-xs text-blue-300">Total Checks</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400" data-testid="text-passed-checks">
                    {validation.passedChecks}
                  </div>
                  <div className="text-xs text-green-300">Passed</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400" data-testid="text-failed-checks">
                    {validation.failedChecks}
                  </div>
                  <div className="text-xs text-red-300">Failed</div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Success Rate</span>
                  <span className="text-white font-semibold">
                    {validation.totalChecks > 0
                      ? Math.round((validation.passedChecks / validation.totalChecks) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                    style={{
                      width: `${validation.totalChecks > 0 ? (validation.passedChecks / validation.totalChecks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Validation Errors */}
              {validation.errors && validation.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Recent Validation Errors ({validation.errors.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-amber-500/20">
                          <TableHead className="text-amber-200">Severity</TableHead>
                          <TableHead className="text-amber-200">Type</TableHead>
                          <TableHead className="text-amber-200">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validation.errors.slice(0, 10).map((error: any, idx: number) => (
                          <TableRow key={idx} className="border-amber-500/10">
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  error.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : error.severity === 'high'
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : error.severity === 'medium'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }
                              >
                                {error.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300 text-xs">{error.type}</TableCell>
                            <TableCell className="text-gray-300 text-xs">{error.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button
                onClick={() => runValidationMutation.mutate()}
                disabled={runValidationMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="button-run-validation"
              >
                <TrendingUp className={`h-4 w-4 mr-2 ${runValidationMutation.isPending ? 'animate-pulse' : ''}`} />
                {runValidationMutation.isPending ? 'Running...' : 'Run Comprehensive Validation'}
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Shield className="h-12 w-12 mx-auto mb-2 animate-pulse" />
              <p>Loading validation report...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
