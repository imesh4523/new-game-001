import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, XCircle, Clock, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentCheckerStatus {
  isRunning: boolean;
  lastCheckTime: string | null;
  lastCheckStats: {
    pending: number;
    completed: number;
    failed: number;
  };
  totalChecks: number;
  totalProcessed: number;
  totalFailed: number;
}

export default function PaymentCheckerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payment checker status
  const { data: status, isLoading, isError, error, refetch } = useQuery<PaymentCheckerStatus>({
    queryKey: ['/api/admin/payment-checker/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual trigger mutation
  const triggerCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/payment-checker/trigger');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-checker/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
      toast({
        title: "✅ Check Triggered",
        description: "Payment check started successfully. Results will update automatically.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Trigger Failed",
        description: error.message || "Failed to trigger payment check",
        variant: "destructive",
      });
    },
  });

  const formatLastCheckTime = (time: string | null) => {
    if (!time) return 'Never';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="border-blue-500/20">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          <span className="ml-2 text-blue-300">Loading payment checker status...</span>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <XCircle className="h-12 w-12 text-red-400 mb-3" />
          <p className="text-red-300 font-semibold">Failed to load payment checker status</p>
          <p className="text-red-400 text-sm mt-1">{(error as any)?.message || 'Unknown error'}</p>
          <Button
            size="sm"
            onClick={() => refetch()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-retry-checker-status"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-200 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Automatic Payment Checker
            </CardTitle>
            <CardDescription className="text-blue-300">
              Auto-checks pending payments every minute
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {status?.isRunning ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1" data-testid="badge-checker-running">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Running
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1" data-testid="badge-checker-stopped">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                Stopped
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => triggerCheckMutation.mutate()}
              disabled={triggerCheckMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-trigger-payment-check"
            >
              {triggerCheckMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Check Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Last Check Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-blue-500/20">
            <Clock className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm text-slate-400">Last Check</p>
              <p className="text-lg font-semibold text-blue-200" data-testid="text-last-check-time">
                {formatLastCheckTime(status?.lastCheckTime || null)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-purple-500/20">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-sm text-slate-400">Total Checks</p>
              <p className="text-lg font-semibold text-purple-200" data-testid="text-total-checks">
                {status?.totalChecks || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Last Check Statistics */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Last Check Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30" data-testid="card-pending-stats">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-200" data-testid="text-pending-count">
                  {status?.lastCheckStats.pending || 0}
                </span>
              </div>
              <p className="text-sm text-yellow-300 mt-2">Still Pending</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30" data-testid="card-completed-stats">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-2xl font-bold text-green-200" data-testid="text-completed-count">
                  {status?.lastCheckStats.completed || 0}
                </span>
              </div>
              <p className="text-sm text-green-300 mt-2">Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30" data-testid="card-failed-stats">
              <div className="flex items-center justify-between">
                <XCircle className="h-5 w-5 text-red-400" />
                <span className="text-2xl font-bold text-red-200" data-testid="text-failed-count">
                  {status?.lastCheckStats.failed || 0}
                </span>
              </div>
              <p className="text-sm text-red-300 mt-2">Failed/Expired</p>
            </div>
          </div>
        </div>

        {/* Lifetime Statistics */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Lifetime Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-green-500/20">
              <span className="text-sm text-slate-300">Total Processed</span>
              <span className="text-lg font-semibold text-green-200" data-testid="text-total-processed">
                {status?.totalProcessed || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-red-500/20">
              <span className="text-sm text-slate-300">Total Failed</span>
              <span className="text-lg font-semibold text-red-200" data-testid="text-total-failed">
                {status?.totalFailed || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-200">
            <strong>ℹ️ How it works:</strong> The system automatically checks all pending crypto deposits every minute. 
            When a payment is confirmed on the blockchain, it's automatically approved and the user balance is credited. 
            You can also manually check anytime using the "Check Now" button above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
