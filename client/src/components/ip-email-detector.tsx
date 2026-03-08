import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Mail, Wifi, Eye, Clock, UserCheck, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  registrationIp?: string;
  lastLoginIp?: string;
  createdAt: string;
  isActive: boolean;
}

interface IpEmailGroup {
  ipAddress: string;
  users: User[];
  emails: (string | null)[];
  isSignificant: boolean; // has multiple emails
  isProxyIP: boolean; // whether this is a known proxy/CDN IP
}

interface IpEmailDetectorProps {
  users: User[];
}

export default function IpEmailDetector({ users }: IpEmailDetectorProps) {
  const [suspiciousGroups, setSuspiciousGroups] = useState<IpEmailGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<IpEmailGroup | null>(null);
  const { toast } = useToast();

  // Fetch whitelisted IPs from new API
  const { data: whitelistedIPs = [] } = useQuery<Array<{
    id: string;
    ipAddress: string;
    accountCountAtWhitelist: number;
    currentAccountCount: number;
    isActive: boolean;
    exceededThreshold: boolean;
  }>>({
    queryKey: ['/api/admin/whitelisted-ips'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Helper function to check if IP is whitelisted by admin
  const isWhitelistedIP = (ip: string): boolean => {
    return whitelistedIPs.some(w => w.ipAddress === ip && w.isActive);
  };

  // Helper function to check if IP is a known proxy/CDN (should be excluded from analysis)
  const isKnownProxyIP = (ip: string): boolean => {
    if (!ip || ip === 'unknown') return true;
    
    // Cloudflare IP ranges (including 172.69.x.x which is the common issue)
    const cloudflarePatterns = [
      /^173\.245\.(4[89]|[5-6]\d|7[0-1])\./,
      /^103\.21\.24[4-7]\./,
      /^103\.22\.20[0-3]\./,
      /^141\.101\.(64|65|66|67|68|69|70|71)\./,
      /^108\.162\./,
      /^162\.158\./,
      /^104\.(1[6-9]|2[0-9]|3[01])\./,
      /^172\.(6[4-9]|7[0-1])\./,              // 172.64-71.x.x - Cloudflare range
      /^131\.0\.72\./,
    ];
    
    // DigitalOcean & other cloud provider IPs
    const cloudProviderPatterns = [
      /^104\.131\./,
      /^159\.89\./,
      /^165\.227\./,
      /^167\.99\./,
    ];
    
    // Private/Local IP ranges
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
    ];
    
    const allPatterns = [...cloudflarePatterns, ...cloudProviderPatterns, ...privatePatterns];
    return allPatterns.some(pattern => pattern.test(ip));
  };

  // Update account counts for whitelisted IPs
  useEffect(() => {
    if (!users || users.length === 0 || whitelistedIPs.length === 0) return;

    // For each whitelisted IP, count current accounts and update if changed
    whitelistedIPs.forEach(async (whitelistedIp) => {
      const currentCount = users.filter(u => 
        u.registrationIp === whitelistedIp.ipAddress || 
        u.lastLoginIp === whitelistedIp.ipAddress
      ).length;

      // Only update if count has changed
      if (currentCount !== whitelistedIp.currentAccountCount) {
        try {
          await apiRequest('PATCH', `/api/admin/whitelisted-ips/${whitelistedIp.id}`, {
            currentAccountCount: currentCount
          });
          // Silently update - no need to invalidate on every change
        } catch (error) {
          console.error(`Failed to update account count for ${whitelistedIp.ipAddress}:`, error);
        }
      }
    });
  }, [users, whitelistedIPs]);

  // Analyze IP patterns - check BOTH registration and login IPs
  useEffect(() => {
    if (!users || users.length === 0) return;

    // Group users by IP addresses - check BOTH registration and login IPs
    const ipGroups = new Map<string, Set<string>>(); // IP -> Set of user IDs
    const whitelistedButExceeded: IpEmailGroup[] = []; // Whitelisted IPs that exceeded threshold

    users.forEach(user => {
      // Check registration IP
      if (user.registrationIp && user.registrationIp !== 'unknown') {
        if (!isKnownProxyIP(user.registrationIp)) {
          const whitelisted = whitelistedIPs.find(w => w.ipAddress === user.registrationIp);
          
          // If whitelisted and exceeded, track separately
          if (whitelisted && whitelisted.exceededThreshold) {
            if (!ipGroups.has(user.registrationIp)) {
              ipGroups.set(user.registrationIp, new Set());
            }
            ipGroups.get(user.registrationIp)!.add(user.id);
          } else if (!whitelisted) {
            // Not whitelisted at all - track normally
            if (!ipGroups.has(user.registrationIp)) {
              ipGroups.set(user.registrationIp, new Set());
            }
            ipGroups.get(user.registrationIp)!.add(user.id);
          }
        }
      }
      
      // ALSO check login IP (to catch account sharing)
      if (user.lastLoginIp && user.lastLoginIp !== 'unknown' && user.lastLoginIp !== user.registrationIp) {
        if (!isKnownProxyIP(user.lastLoginIp)) {
          const whitelisted = whitelistedIPs.find(w => w.ipAddress === user.lastLoginIp);
          
          if (whitelisted && whitelisted.exceededThreshold) {
            if (!ipGroups.has(user.lastLoginIp)) {
              ipGroups.set(user.lastLoginIp, new Set());
            }
            ipGroups.get(user.lastLoginIp)!.add(user.id);
          } else if (!whitelisted) {
            if (!ipGroups.has(user.lastLoginIp)) {
              ipGroups.set(user.lastLoginIp, new Set());
            }
            ipGroups.get(user.lastLoginIp)!.add(user.id);
          }
        }
      }
    });

    // Flag ANY IP with 2 or more accounts (no time window, no email restrictions)
    const suspicious: IpEmailGroup[] = [];
    
    ipGroups.forEach((userIds, ipAddress) => {
      if (userIds.size >= 2) {
        // Get all users for this IP
        const ipUsers = users.filter(u => userIds.has(u.id));
        
        // Get unique emails
        const emails = Array.from(new Set(ipUsers.map(u => u.email).filter(email => email !== null)));
        const nullEmails = ipUsers.filter(u => u.email === null).length;
        
        suspicious.push({
          ipAddress,
          users: ipUsers,
          emails: [...emails, ...(nullEmails > 0 ? [null] : [])],
          isSignificant: true,
          isProxyIP: false
        });
      }
    });

    // Sort by risk level (more users = higher risk)
    suspicious.sort((a, b) => b.users.length - a.users.length);
    setSuspiciousGroups(suspicious);
  }, [users, whitelistedIPs]);

  const getRiskLevel = (group: IpEmailGroup): "high" | "medium" | "low" => {
    if (group.users.length >= 5 || group.emails.length >= 4) return "high";
    if (group.users.length >= 3 || group.emails.length >= 3) return "medium";
    return "low";
  };

  const getRiskColor = (risk: "high" | "medium" | "low") => {
    switch (risk) {
      case "high": return "bg-red-500 text-white";
      case "medium": return "bg-orange-500 text-white";
      case "low": return "bg-yellow-500 text-black";
      default: return "bg-gray-500 text-white";
    }
  };

  const handleWhitelistIP = async (ipAddress: string) => {
    try {
      // Count how many users currently have this IP (both registration and login)
      const usersWithThisIP = users.filter(u => 
        u.registrationIp === ipAddress || u.lastLoginIp === ipAddress
      );
      const accountCount = usersWithThisIP.length;

      await apiRequest('POST', '/api/admin/whitelisted-ips', {
        ipAddress,
        accountCountAtWhitelist: accountCount,
        whitelistedReason: `Whitelisted from IP risk detection (${accountCount} accounts at whitelist time)`
      });
      
      // Invalidate the query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whitelisted-ips'] });
      
      toast({
        title: "✅ IP Whitelisted",
        description: `${ipAddress} has been whitelisted (${accountCount} accounts tracked). Will be re-flagged if more accounts are added.`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Failed to Whitelist IP",
        description: error.message || "There was an error updating the whitelist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeGroup = (group: IpEmailGroup) => {
    setSelectedGroup(group);
    toast({
      title: "🔍 IP Analysis",
      description: `Analyzing ${group.users.length} accounts from IP ${group.ipAddress}`,
    });
  };

  const handleCloseAnalysis = () => {
    setSelectedGroup(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (suspiciousGroups.length === 0) {
    return (
      <Card className="admin-card admin-glow border-green-500/20" data-testid="ip-email-detector-clean">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-400" />
            IP-Email Analysis: Clean
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <UserCheck className="h-12 w-12 text-green-400 mx-auto mb-2" />
            <p className="text-green-300">No suspicious IP-email patterns detected</p>
            <p className="text-sm text-purple-300 mt-1">All users appear to be using unique IP-email combinations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="ip-email-detector">
      {/* Summary Card */}
      <Card className="admin-card admin-glow border-red-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            IP-Email Detection: {suspiciousGroups.length} Suspicious Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{suspiciousGroups.length}</div>
              <div className="text-sm text-purple-300">Suspicious IPs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {suspiciousGroups.reduce((sum, group) => sum + group.users.length, 0)}
              </div>
              <div className="text-sm text-purple-300">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {suspiciousGroups.filter(g => getRiskLevel(g) === "high").length}
              </div>
              <div className="text-sm text-purple-300">High Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suspicious Groups Table */}
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wifi className="h-5 w-5 text-purple-400" />
            Multiple Accounts from Same IP (Registration or Login)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20">
                  <TableHead className="text-purple-200">IP Address</TableHead>
                  <TableHead className="text-purple-200">Risk Level</TableHead>
                  <TableHead className="text-purple-200">Users</TableHead>
                  <TableHead className="text-purple-200">Different Emails</TableHead>
                  <TableHead className="text-purple-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousGroups.map((group, index) => {
                  const risk = getRiskLevel(group);
                  return (
                    <TableRow key={group.ipAddress} className="border-purple-500/10 hover:bg-slate-800/30">
                      <TableCell>
                        <code className="text-sm bg-slate-800 px-2 py-1 rounded text-purple-300">
                          {group.ipAddress}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRiskColor(risk)} font-semibold`}>
                          {risk.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">{group.users.length}</span>
                          <div className="flex -space-x-1">
                            {group.users.slice(0, 3).map((user, i) => (
                              <Avatar key={user.id} className="w-6 h-6 border-2 border-purple-500/30">
                                <AvatarFallback className="bg-purple-600 text-white text-xs">
                                  {user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {group.users.length > 3 && (
                              <div className="w-6 h-6 bg-purple-700 border-2 border-purple-500/30 rounded-full flex items-center justify-center text-xs text-white">
                                +{group.users.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {group.emails.map((email, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-purple-400" />
                              <span className="text-sm text-white">
                                {email || "No email"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAnalyzeGroup(group)}
                            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                            data-testid={`analyze-group-${index}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Analyze
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhitelistIP(group.ipAddress)}
                            className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                            data-testid={`whitelist-ip-${index}`}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Whitelist
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Modal */}
      {selectedGroup && (
        <Card className="admin-card admin-glow border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-yellow-400" />
                Detailed Analysis: {selectedGroup.ipAddress}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseAnalysis}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300">Risk Level</p>
                  <Badge className={`${getRiskColor(getRiskLevel(selectedGroup))} font-semibold`}>
                    {getRiskLevel(selectedGroup).toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-purple-300">Total Users</p>
                  <p className="text-white font-semibold">{selectedGroup.users.length}</p>
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Users from this IP:</h4>
                <div className="space-y-2">
                  {selectedGroup.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="border-2 border-purple-500/30">
                          <AvatarFallback className="bg-purple-600 text-white">
                            {user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{user.email}</p>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-purple-400" />
                            <p className="text-sm text-purple-300">
                              {user.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-purple-300">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(user.createdAt)}
                        </div>
                        <Badge variant={user.isActive ? "default" : "destructive"} className="text-xs">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}