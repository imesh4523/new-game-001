import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WhitelistedIp {
  id: string;
  ipAddress: string;
  accountCountAtWhitelist: number;
  currentAccountCount: number;
  isActive: boolean;
  exceededThreshold: boolean;
  thresholdExceededAt: Date | null;
  whitelistedReason: string | null;
  createdAt: Date;
}

export default function IpWhitelistManager() {
  const { toast } = useToast();

  const { data: whitelistedIps = [], isLoading } = useQuery<WhitelistedIp[]>({
    queryKey: ['/api/admin/whitelisted-ips'],
    refetchInterval: 30000,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/whitelisted-ips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whitelisted-ips'] });
      toast({
        title: "✅ IP Removed",
        description: "The IP has been removed from the whitelist",
      });
    },
    onError: () => {
      toast({
        title: "❌ Failed to Remove",
        description: "There was an error removing the IP from whitelist",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardContent className="pt-6">
          <div className="text-center text-purple-300">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (whitelistedIps.length === 0) {
    return (
      <Card className="admin-card admin-glow border-purple-500/20" data-testid="ip-whitelist-empty">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Whitelisted IPs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Shield className="h-12 w-12 text-purple-400 mx-auto mb-2" />
            <p className="text-purple-300">No whitelisted IPs</p>
            <p className="text-sm text-gray-400 mt-1">Whitelist IPs from the risk detection to exclude them</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="admin-card admin-glow border-purple-500/20" data-testid="ip-whitelist-manager">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-400" />
          Whitelisted IPs ({whitelistedIps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20">
                <TableHead className="text-purple-200">IP Address</TableHead>
                <TableHead className="text-purple-200">Accounts (Whitelist → Current)</TableHead>
                <TableHead className="text-purple-200">Status</TableHead>
                <TableHead className="text-purple-200">Reason</TableHead>
                <TableHead className="text-purple-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {whitelistedIps.map((ip) => {
                const isExceeded = ip.exceededThreshold;
                return (
                  <TableRow key={ip.id} className="border-purple-500/10 hover:bg-slate-800/30">
                    <TableCell>
                      <code className="text-sm bg-slate-800 px-2 py-1 rounded text-purple-300">
                        {ip.ipAddress}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{ip.accountCountAtWhitelist}</span>
                        <span className="text-purple-400">→</span>
                        <span className={`font-semibold ${isExceeded ? 'text-red-400' : 'text-green-400'}`}>
                          {ip.currentAccountCount}
                        </span>
                        {isExceeded && (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExceeded ? (
                        <Badge className="bg-red-500 text-white font-semibold">
                          ⚠️ THRESHOLD EXCEEDED
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white font-semibold">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          SAFE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-400">
                        {ip.whitelistedReason || 'No reason provided'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMutation.mutate(ip.id)}
                        disabled={removeMutation.isPending}
                        data-testid={`remove-whitelist-${ip.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {whitelistedIps.some(ip => ip.exceededThreshold) && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold">Threshold Exceeded Alert</p>
                <p className="text-sm text-red-200 mt-1">
                  Some whitelisted IPs have more accounts now than when they were whitelisted. 
                  This could indicate abuse - review and remove if suspicious.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
