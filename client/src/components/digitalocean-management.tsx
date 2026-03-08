import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Server, 
  RefreshCw,
  Play,
  Globe,
  Cpu,
  HardDrive,
  Zap,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  Rocket,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Code,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Droplet {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  region: {
    name: string;
    slug: string;
  };
  image: {
    name: string;
    distribution: string;
  };
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
    price_monthly: number;
  };
  status: string;
  networks: {
    v4: Array<{
      ip_address: string;
      type: string;
    }>;
  };
  created_at: string;
}

interface DeploymentStatus {
  serverId: number;
  serverName: string;
  status: 'deploying' | 'success' | 'failed';
  message: string;
  progress: number;
}

type LoadBalancingMethod = 'round_robin' | 'least_conn' | 'ip_hash';

export default function DigitalOceanManagement() {
  const [deployingAll, setDeployingAll] = useState(false);
  const [deploymentStatuses, setDeploymentStatuses] = useState<DeploymentStatus[]>([]);
  const [lbMethod, setLbMethod] = useState<LoadBalancingMethod>('least_conn');
  const [serverWeights, setServerWeights] = useState<Record<number, number>>({});
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showConfigPreview, setShowConfigPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropletsData, isLoading, error } = useQuery<{ droplets: Droplet[]; total: number; hasApiKey: boolean }>({
    queryKey: ["/api/admin/digitalocean/droplets"],
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/digitalocean/refresh");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/digitalocean/droplets"] });
      toast({
        title: "Success",
        description: "Droplet list refreshed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh droplets",
        variant: "destructive",
      });
    },
  });

  const deployToServerMutation = useMutation({
    mutationFn: async (dropletId: number) => {
      const response = await apiRequest("POST", `/api/admin/digitalocean/deploy/${dropletId}`);
      return response.json();
    },
    onSuccess: (data, dropletId) => {
      toast({
        title: "Deployment Started",
        description: data.message || `Deployment initiated for droplet ${dropletId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to start deployment",
        variant: "destructive",
      });
    },
  });

  const setupLoadBalancerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/digitalocean/setup-loadbalancer", {
        method: lbMethod,
        serverWeights: serverWeights
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Load Balancer Configured",
        description: data.message || "Nginx load balancer setup complete",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup load balancer",
        variant: "destructive",
      });
    },
  });

  const deployToAllServers = async () => {
    if (!dropletsData?.droplets || dropletsData.droplets.length === 0) {
      toast({
        title: "No Servers",
        description: "No active servers found to deploy to",
        variant: "destructive",
      });
      return;
    }

    setDeployingAll(true);
    const activeDroplets = dropletsData.droplets.filter(d => d.status === 'active');
    
    const statuses: DeploymentStatus[] = activeDroplets.map(d => ({
      serverId: d.id,
      serverName: d.name,
      status: 'deploying',
      message: 'Starting deployment...',
      progress: 0
    }));
    
    setDeploymentStatuses(statuses);

    for (let i = 0; i < activeDroplets.length; i++) {
      const droplet = activeDroplets[i];
      
      try {
        setDeploymentStatuses(prev => prev.map(s => 
          s.serverId === droplet.id 
            ? { ...s, progress: 30, message: 'Connecting to server...' }
            : s
        ));

        await deployToServerMutation.mutateAsync(droplet.id);

        setDeploymentStatuses(prev => prev.map(s => 
          s.serverId === droplet.id 
            ? { ...s, status: 'success', progress: 100, message: 'Deployment successful' }
            : s
        ));
      } catch (error: any) {
        setDeploymentStatuses(prev => prev.map(s => 
          s.serverId === droplet.id 
            ? { ...s, status: 'failed', progress: 100, message: error.message || 'Deployment failed' }
            : s
        ));
      }
    }

    setTimeout(() => {
      setDeployingAll(false);
      setDeploymentStatuses([]);
    }, 5000);

    toast({
      title: "Deployment Complete",
      description: `Deployed to ${activeDroplets.length} server(s)`,
    });
  };

  const formatMemory = (mb: number) => {
    return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
  };

  const formatDisk = (gb: number) => {
    return `${gb} GB`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      active: { variant: "default", icon: CheckCircle, label: "Active" },
      off: { variant: "secondary", icon: XCircle, label: "Off" },
      new: { variant: "outline", icon: Activity, label: "New" },
    };

    const config = statusConfig[status] || statusConfig.off;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (!isLoading && !dropletsData?.hasApiKey) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Server className="h-6 w-6 text-blue-400" />
            Digital Ocean Integration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage and deploy to your Digital Ocean VPS servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">API Key Required</h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">
              Digital Ocean API key is not configured. You need to add an API key to manage servers from the admin dashboard.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-lg mx-auto text-left">
              <p className="text-blue-200 text-sm font-medium mb-2">🔑 How to add API Key:</p>
              <ol className="text-blue-300 text-sm space-y-1 list-decimal list-inside">
                <li>Go to Digital Ocean dashboard</li>
                <li>Generate a new token in the API Tokens section</li>
                <li>Add it to Environment Secrets as DIGITALOCEAN_API_KEY</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-purple-500/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-300">Failed to load Digital Ocean droplets</p>
            <p className="text-sm text-gray-400 mt-2">{(error as Error).message}</p>
            <Button
              onClick={() => refreshMutation.mutate()}
              className="mt-4"
              disabled={refreshMutation.isPending}
              data-testid="button-retry-droplets"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Server className="h-6 w-6 text-blue-400" />
              Digital Ocean Servers
              {dropletsData && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {dropletsData.total} Server{dropletsData.total !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Manage your VPS servers and deploy applications automatically
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending || isLoading}
              variant="outline"
              className="border-blue-500/30 hover:bg-blue-500/10"
              data-testid="button-refresh-droplets"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={deployToAllServers}
              disabled={deployingAll || isLoading || !dropletsData?.droplets || dropletsData.droplets.length === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              data-testid="button-deploy-all"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deploy to All Servers
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deployingAll && deploymentStatuses.length > 0 && (
          <div className="mb-6 space-y-3 p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 animate-pulse text-green-400" />
              Deployment Progress
            </h4>
            {deploymentStatuses.map((status) => (
              <div key={status.serverId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{status.serverName}</span>
                  <span className={`font-medium ${
                    status.status === 'success' ? 'text-green-400' : 
                    status.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {status.message}
                  </span>
                </div>
                <Progress value={status.progress} className="h-2" />
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
        ) : dropletsData?.droplets && dropletsData.droplets.length > 0 ? (
          <div className="rounded-lg border border-purple-500/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20 bg-purple-900/20 hover:bg-purple-900/20">
                  <TableHead className="text-purple-200 font-semibold">Server Name</TableHead>
                  <TableHead className="text-purple-200 font-semibold">Status</TableHead>
                  <TableHead className="text-purple-200 font-semibold">IP Address</TableHead>
                  <TableHead className="text-purple-200 font-semibold">Resources</TableHead>
                  <TableHead className="text-purple-200 font-semibold">Region</TableHead>
                  <TableHead className="text-purple-200 font-semibold">Price</TableHead>
                  <TableHead className="text-purple-200 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dropletsData.droplets.map((droplet) => {
                  const publicIp = droplet.networks.v4.find(n => n.type === 'public');
                  
                  return (
                    <TableRow 
                      key={droplet.id} 
                      className="border-purple-500/20 hover:bg-purple-900/10"
                      data-testid={`row-droplet-${droplet.id}`}
                    >
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-blue-400" />
                          {droplet.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {droplet.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(droplet.status)}
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm">
                            {publicIp?.ip_address || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Cpu className="h-3 w-3 text-green-400" />
                            <span>{droplet.vcpus} vCPU</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="h-3 w-3 text-blue-400" />
                            <span>{formatMemory(droplet.memory)} RAM</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <HardDrive className="h-3 w-3 text-purple-400" />
                            <span>{formatDisk(droplet.disk)} SSD</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-400" />
                          <div>
                            <div className="text-sm">{droplet.region.name}</div>
                            <div className="text-xs text-gray-400">{droplet.region.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="font-semibold text-green-400">
                          ${droplet.size.price_monthly}/mo
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => deployToServerMutation.mutate(droplet.id)}
                          disabled={deployToServerMutation.isPending || droplet.status !== 'active'}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          data-testid={`button-deploy-${droplet.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Deploy
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Server className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Servers Found</h3>
            <p className="text-gray-400">
              No active droplets found in your Digital Ocean account.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">⚡ Combined Computing Power</p>
              <p className="text-blue-300 text-sm">
                Total Resources: {dropletsData?.droplets ? (
                  <>
                    <span className="font-bold text-green-400">
                      {dropletsData.droplets.reduce((sum, d) => sum + d.vcpus, 0)} vCPUs
                    </span>
                    {' • '}
                    <span className="font-bold text-blue-400">
                      {formatMemory(dropletsData.droplets.reduce((sum, d) => sum + d.memory, 0))} RAM
                    </span>
                    {' • '}
                    <span className="font-bold text-purple-400">
                      {formatDisk(dropletsData.droplets.reduce((sum, d) => sum + d.disk, 0))} Storage
                    </span>
                  </>
                ) : 'N/A'}
              </p>
              <p className="text-blue-300 text-xs mt-2">
                Once deployed, the application automatically replicates across all servers - maximum speed and redundancy!
              </p>
            </div>
          </div>
        </div>

        {/* Nginx Load Balancer Section */}
        {dropletsData?.droplets && dropletsData.droplets.length > 1 && (
          <div className="mt-6 p-6 bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-purple-900/40 border border-purple-500/30 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    Nginx Load Balancer
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                      Traffic Director
                    </Badge>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Distribute traffic across multiple servers for high availability
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setupLoadBalancerMutation.mutate()}
                disabled={setupLoadBalancerMutation.isPending || dropletsData.droplets.length < 2}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                data-testid="button-setup-loadbalancer"
              >
                <Zap className={`h-4 w-4 mr-2 ${setupLoadBalancerMutation.isPending ? 'animate-pulse' : ''}`} />
                {setupLoadBalancerMutation.isPending ? 'Setting Up...' : 'Setup Load Balancer'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-semibold text-green-300 uppercase">Active Servers</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {dropletsData.droplets.filter(d => d.status === 'active').length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Ready for load balancing</div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-300 uppercase">Health Checks</span>
                </div>
                <div className="text-lg font-bold text-white">Enabled</div>
                <div className="text-xs text-gray-400 mt-1">Auto failover ready</div>
              </div>
            </div>

            {/* Load Balancing Configuration */}
            <div className="mb-4 p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lb-method" className="text-white flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Load Balancing Method
                  </Label>
                  <Select value={lbMethod} onValueChange={(value) => setLbMethod(value as LoadBalancingMethod)}>
                    <SelectTrigger 
                      id="lb-method"
                      className="bg-slate-700 border-purple-500/30 text-white"
                      data-testid="select-lb-method"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="round_robin" className="text-white hover:bg-purple-900/50">
                        Round Robin - Equal distribution
                      </SelectItem>
                      <SelectItem value="least_conn" className="text-white hover:bg-purple-900/50">
                        Least Connections - Smart routing
                      </SelectItem>
                      <SelectItem value="ip_hash" className="text-white hover:bg-purple-900/50">
                        IP Hash - Session persistence
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {lbMethod === 'round_robin' && 'Distributes requests equally across all servers'}
                    {lbMethod === 'least_conn' && 'Routes to server with fewest active connections'}
                    {lbMethod === 'ip_hash' && 'Same client always goes to same server'}
                  </p>
                </div>

                <div className="flex items-end">
                  <Dialog open={showConfigPreview} onOpenChange={setShowConfigPreview}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-blue-500/30 hover:bg-blue-500/10"
                        data-testid="button-preview-config"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Configuration
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl bg-slate-900 border-purple-500/30">
                      <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                          <Code className="h-5 w-5 text-purple-400" />
                          Nginx Configuration Preview
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                          This configuration will be deployed to your load balancer server
                        </DialogDescription>
                      </DialogHeader>
                      <div className="bg-slate-950 p-4 rounded-lg border border-purple-500/20 overflow-auto max-h-96">
                        <pre className="text-xs text-green-400 font-mono">
{`upstream gaming_app_backend {
    ${lbMethod === 'least_conn' ? 'least_conn;' : lbMethod === 'ip_hash' ? 'ip_hash;' : '# round_robin (default)'}
    
    # Backend servers${
  dropletsData?.droplets
    .filter(d => d.status === 'active')
    .map((droplet, idx) => {
      const ip = droplet.networks.v4.find(n => n.type === 'public')?.ip_address;
      const weight = serverWeights[droplet.id] || (idx === 0 ? 1 : 3);
      return `\n    server ${ip}:5000 weight=${weight} max_fails=3 fail_timeout=30s;`;
    })
    .join('')
}
    
    keepalive 32;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://gaming_app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`}
                        </pre>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Advanced Server Weight Configuration */}
              <Collapsible open={showAdvancedConfig} onOpenChange={setShowAdvancedConfig}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-purple-300 hover:text-purple-200 hover:bg-purple-900/20"
                    data-testid="button-toggle-advanced-config"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Server Weights
                    {showAdvancedConfig ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">
                      Configure individual server weights. Higher weight = more requests. Default is 3 (1 for primary).
                    </p>
                    {dropletsData?.droplets
                      .filter(d => d.status === 'active')
                      .map((droplet, idx) => (
                        <div key={droplet.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                          <Server className="h-4 w-4 text-blue-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{droplet.name}</p>
                            <p className="text-xs text-gray-400">
                              {droplet.networks.v4.find(n => n.type === 'public')?.ip_address}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`weight-${droplet.id}`} className="text-gray-300 text-sm">
                              Weight:
                            </Label>
                            <Input
                              id={`weight-${droplet.id}`}
                              type="number"
                              min="1"
                              max="10"
                              value={serverWeights[droplet.id] || (idx === 0 ? 1 : 3)}
                              onChange={(e) => setServerWeights(prev => ({
                                ...prev,
                                [droplet.id]: parseInt(e.target.value) || 1
                              }))}
                              className="w-20 bg-slate-600 border-purple-500/30 text-white"
                              data-testid={`input-weight-${droplet.id}`}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-indigo-200 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Load Balancer Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Automatic Traffic Distribution</p>
                    <p className="text-xs text-gray-400">Smart routing to available servers</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Health Monitoring</p>
                    <p className="text-xs text-gray-400">Auto-detect and bypass failed servers</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">WebSocket Support</p>
                    <p className="text-xs text-gray-400">Full real-time communication support</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Zero Downtime</p>
                    <p className="text-xs text-gray-400">Seamless server maintenance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-xs font-medium">Setup Instructions</p>
                  <p className="text-yellow-300 text-xs mt-1">
                    Load balancer first droplet එකේ configure වෙනවා. සියලුම active servers automatically backend servers ලෙස add වෙනවා. Setup complete වෙලා නැවුම්තාම traffic distribution ආරම්භ වෙනවා.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
