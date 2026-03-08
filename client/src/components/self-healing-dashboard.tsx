import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Wrench,
  Bug,
  Zap,
  Database,
  Clock
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

interface SelfHealingStatus {
  isRunning: boolean;
  stats: {
    totalHeals: number;
    successfulHeals: number;
    failedHeals: number;
    lastHealTime: string | null;
  };
  errorMonitor: {
    total: number;
    fixed: number;
    unfixed: number;
    types: Record<string, number>;
  };
  lspAutoFix: {
    totalAttempts: number;
    successful: number;
    failed: number;
  };
}

interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  fixed: boolean;
}

export function SelfHealingDashboard() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<{ success: boolean; status: SelfHealingStatus }>({
    queryKey: ["/api/admin/self-healing/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: errorsData } = useQuery<{ success: boolean; errors: ErrorLog[] }>({
    queryKey: ["/api/admin/error-monitor/errors"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: stalenessData } = useQuery<{ success: boolean; stats: any }>({
    queryKey: ["/api/admin/data-staleness/stats"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const forceHealMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/self-healing/force-heal", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/self-healing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/error-monitor/errors"] });
      toast({
        title: "✅ Healing Complete",
        description: "System healing cycle completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "❌ Healing Failed",
        description: "Failed to run healing cycle",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">Self-Healing System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const healingStatus = status?.status;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-200 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Self-Healing System
              </CardTitle>
              <CardDescription className="text-purple-400">
                Automatic CSRF & LSP error detection and fixing
              </CardDescription>
            </div>
            <Badge 
              className={
                healingStatus?.isRunning 
                  ? "bg-green-600 text-white" 
                  : "bg-red-600 text-white"
              }
            >
              {healingStatus?.isRunning ? (
                <>
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  ACTIVE
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  INACTIVE
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-200">Total Heals</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {healingStatus?.stats.totalHeals || 0}
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-200">Successful</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {healingStatus?.stats.successfulHeals || 0}
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-200">Failed</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {healingStatus?.stats.failedHeals || 0}
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-purple-200">Last Heal</span>
              </div>
              <div className="text-sm font-medium text-white">
                {healingStatus?.stats.lastHealTime 
                  ? new Date(healingStatus.stats.lastHealTime).toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>

          <Button
            onClick={() => forceHealMutation.mutate()}
            disabled={forceHealMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="button-force-heal"
          >
            {forceHealMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Healing System...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Force Healing Cycle
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Monitor Stats */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Monitor
          </CardTitle>
          <CardDescription className="text-purple-400">
            Real-time error detection and auto-fixing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-purple-200 mb-1">Total Errors</div>
              <div className="text-xl font-bold text-white">
                {healingStatus?.errorMonitor.total || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-green-200 mb-1">Auto-Fixed</div>
              <div className="text-xl font-bold text-green-400">
                {healingStatus?.errorMonitor.fixed || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-red-200 mb-1">Unfixed</div>
              <div className="text-xl font-bold text-red-400">
                {healingStatus?.errorMonitor.unfixed || 0}
              </div>
            </div>
          </div>

          {/* Recent Errors Table */}
          {errorsData?.errors && errorsData.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-purple-200 mb-2">Recent Errors</h4>
              <ScrollArea className="h-[300px] rounded-lg border border-purple-500/30">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/20">
                      <TableHead className="text-purple-200">Time</TableHead>
                      <TableHead className="text-purple-200">Type</TableHead>
                      <TableHead className="text-purple-200">Message</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorsData.errors.slice(0, 10).map((error, idx) => (
                      <TableRow key={idx} className="border-purple-500/20">
                        <TableCell className="text-purple-300 text-xs">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                            {error.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-purple-200 text-sm max-w-md truncate">
                          {error.message}
                        </TableCell>
                        <TableCell>
                          {error.fixed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LSP Auto-Fix Stats */}
      <Card className="bg-slate-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            LSP Auto-Fix
          </CardTitle>
          <CardDescription className="text-purple-400">
            Automatic TypeScript error fixing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-purple-200 mb-1">Total Attempts</div>
              <div className="text-xl font-bold text-white">
                {healingStatus?.lspAutoFix.totalAttempts || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-green-200 mb-1">Successful</div>
              <div className="text-xl font-bold text-green-400">
                {healingStatus?.lspAutoFix.successful || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <div className="text-sm text-red-200 mb-1">Failed</div>
              <div className="text-xl font-bold text-red-400">
                {healingStatus?.lspAutoFix.failed || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Staleness Monitor */}
      <Card className="bg-slate-900/50 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-200 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Staleness Monitor
              </CardTitle>
              <CardDescription className="text-blue-400">
                Auto-detecting and fixing stale data every 5 seconds
              </CardDescription>
            </div>
            <Badge className="bg-blue-600 text-white">
              <Clock className="h-3 w-3 mr-1 animate-pulse" />
              ACTIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-blue-500/30">
              <div className="text-sm text-blue-200 mb-1">Total Checks</div>
              <div className="text-xl font-bold text-white">
                {stalenessData?.stats.totalChecks || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-500/30">
              <div className="text-sm text-yellow-200 mb-1">Stale Data Detected</div>
              <div className="text-xl font-bold text-yellow-400">
                {stalenessData?.stats.staleDataDetected || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-green-500/30">
              <div className="text-sm text-green-200 mb-1">Auto-Fixes Applied</div>
              <div className="text-xl font-bold text-green-400">
                {stalenessData?.stats.autoFixesApplied || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-purple-500/30">
              <div className="text-sm text-purple-200 mb-1">Last Check</div>
              <div className="text-sm font-medium text-white">
                {stalenessData?.stats.lastCheck 
                  ? new Date(stalenessData.stats.lastCheck).toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {/* Recent Issues Table */}
          {stalenessData?.stats.recentIssues && stalenessData.stats.recentIssues.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-blue-200 mb-2">Recent Staleness Issues</h4>
              <ScrollArea className="h-[200px] rounded-lg border border-blue-500/30">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/20">
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">User ID</TableHead>
                      <TableHead className="text-blue-200">Old Value</TableHead>
                      <TableHead className="text-blue-200">New Value</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stalenessData.stats.recentIssues.slice(0, 10).map((issue: any, idx: number) => (
                      <TableRow key={idx} className="border-blue-500/20">
                        <TableCell>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs">
                            {issue.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-blue-300 text-xs">
                          {issue.userId ? issue.userId.substring(0, 8) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-blue-200 text-xs">
                          {issue.oldValue !== null && issue.oldValue !== undefined 
                            ? (typeof issue.oldValue === 'string' ? issue.oldValue : JSON.stringify(issue.oldValue))
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-blue-200 text-xs">
                          {issue.newValue !== null && issue.newValue !== undefined 
                            ? (typeof issue.newValue === 'string' ? issue.newValue : JSON.stringify(issue.newValue))
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {issue.fixed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
