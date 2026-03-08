import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Server, 
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Play,
  Download,
  Info,
  Zap,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const databaseConnectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  databaseType: z.enum(["postgresql", "mysql", "mongodb"]),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  ssl: z.boolean().default(true),
  status: z.enum(["active", "inactive", "testing"]).default("inactive"),
  isActive: z.boolean().default(false),
  setAsPrimary: z.boolean().default(false),
  enableRealtimeSync: z.boolean().default(true)
});

type DatabaseConnectionForm = z.infer<typeof databaseConnectionSchema>;

interface DatabaseConnection {
  id: string;
  name: string;
  databaseType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  status: string;
  isActive: boolean;
  isPrimary: boolean;
  lastSyncAt?: string;
  lastTestAt?: string;
  connectionStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DatabaseManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUrlImportOpen, setIsUrlImportOpen] = useState(false);
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DatabaseConnectionForm>({
    resolver: zodResolver(databaseConnectionSchema),
    defaultValues: {
      name: "",
      databaseType: "postgresql",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
      ssl: true,
      status: "inactive",
      isActive: false,
      setAsPrimary: false,
      enableRealtimeSync: true
    }
  });

  const { data: connections, isLoading } = useQuery<{ connections: DatabaseConnection[]; total: number }>({
    queryKey: ["/api/admin/database-connections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DatabaseConnectionForm) => {
      toast({
        title: "Setting up database...",
        description: "Testing connection and syncing data. This may take a few moments.",
      });
      const response = await apiRequest("POST", "/api/admin/database-connections", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      
      if (data.success && data.syncResult?.success) {
        let description = `${data.connection.name} is ready! All tables created and data synced successfully.`;
        
        if (data.setAsPrimary) {
          description += ` 🎯 Now set as PRIMARY database.`;
        }
        if (data.enableRealtimeSync) {
          description += ` ⚡ Real-time sync enabled - changes will sync instantly!`;
        }
        
        toast({
          title: "✅ Database Setup Complete!",
          description,
        });
      } else if (data.success && !data.syncResult?.success) {
        toast({
          title: "⚠️ Partial Success",
          description: data.message || "Connection created but data sync failed. You can manually sync later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Connection Test Failed",
          description: data.message || "Please verify your database credentials and try again.",
          variant: "destructive",
        });
      }
      
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create database connection",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/database-connections/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      setTestingConnectionId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
      setTestingConnectionId(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncProgress(0);
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      try {
        const response = await apiRequest("POST", `/api/admin/database-connections/${id}/sync`);
        clearInterval(progressInterval);
        setSyncProgress(100);
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      
      if (data.success && data.stats) {
        const totalRecords = Object.values(data.stats).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
        const tableCount = Object.keys(data.stats).length;
        toast({
          title: "✅ සම්පූර්ණ Backup සාර්ථකයි!",
          description: `Tables ${tableCount}ක් backup වුණා. මුළු records ${totalRecords.toLocaleString()}. සියලු data සුරක්ෂිතයි!`,
        });
      } else {
        toast({
          title: data.success ? "Sync Successful" : "Sync Failed",
          description: data.message,
          variant: data.success ? "default" : "destructive",
        });
      }
      
      setTimeout(() => {
        setSyncingConnectionId(null);
        setSyncProgress(0);
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync data",
        variant: "destructive",
      });
      setSyncingConnectionId(null);
      setSyncProgress(0);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/database-connections/${id}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      toast({
        title: "Success",
        description: "Database connection activated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate connection",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/database-connections/${id}/set-primary`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      toast({
        title: "🎯 Primary Database Updated",
        description: data.message || "Database is now set as primary",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set as primary",
        variant: "destructive",
      });
    },
  });

  const revertToReplitPrimaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/database-connections/revert-to-replit-primary");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      toast({
        title: "🎯 Replit Database is Now Primary",
        description: data.message || "Replit managed database is now the primary database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revert to Replit database",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/database-connections/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database-connections"] });
      toast({
        title: "Success",
        description: "Database connection deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete connection",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = (id: string) => {
    setTestingConnectionId(id);
    testConnectionMutation.mutate(id);
  };

  const handleSync = (id: string) => {
    setSyncingConnectionId(id);
    syncMutation.mutate(id);
  };

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleSetPrimary = (id: string, name: string) => {
    if (confirm(`Set "${name}" as the PRIMARY database for the application?\n\nThis will make it the main database used by the application.`)) {
      setPrimaryMutation.mutate(id);
    }
  };

  const handleDelete = (id: string, connection: DatabaseConnection) => {
    if (connection.isActive) {
      toast({
        title: "Error",
        description: "Cannot delete active database connection",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${connection.name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: DatabaseConnectionForm) => {
    createMutation.mutate(data);
  };

  const parseConnectionUrl = (url: string) => {
    try {
      const dbUrl = new URL(url);
      const hostname = dbUrl.hostname;
      const port = dbUrl.port ? parseInt(dbUrl.port) : 5432;
      const username = dbUrl.username || '';
      const password = dbUrl.password || '';
      const database = dbUrl.pathname.replace('/', '');
      
      // Check if it's a Digital Ocean database
      const isDigitalOcean = hostname.includes('db.ondigitalocean.com');
      const name = isDigitalOcean ? 'Digital Ocean Production' : `External Database - ${hostname}`;
      
      form.setValue('name', name);
      form.setValue('host', hostname);
      form.setValue('port', port);
      form.setValue('database', database);
      form.setValue('username', username);
      form.setValue('password', password);
      form.setValue('ssl', true);
      form.setValue('databaseType', 'postgresql');
      
      setIsUrlImportOpen(false);
      setIsAddDialogOpen(true);
      setDatabaseUrl("");
      
      toast({
        title: "✅ URL Parsed Successfully",
        description: "Database details have been filled in. Review and submit to connect.",
      });
    } catch (error) {
      toast({
        title: "❌ Invalid URL",
        description: "Please enter a valid database connection URL (e.g., postgresql://user:pass@host:port/database)",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Database Management
              </CardTitle>
              <CardDescription className="text-purple-300">
                Manage external database connections and data synchronization
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isUrlImportOpen} onOpenChange={setIsUrlImportOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                    data-testid="button-import-from-url"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Import from URL
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-slate-900 border-purple-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-white">Quick Import from Database URL</DialogTitle>
                    <DialogDescription className="text-purple-300">
                      Paste your database connection URL to automatically fill in the connection details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-purple-200">Database URL</Label>
                      <Input
                        value={databaseUrl}
                        onChange={(e) => setDatabaseUrl(e.target.value)}
                        placeholder="postgresql://username:password@host:port/database"
                        className="bg-slate-800 border-purple-500/30 text-white font-mono text-sm"
                        data-testid="input-database-url"
                      />
                      <p className="text-xs text-gray-400">
                        Example: postgresql://user:pass@db.ondigitalocean.com:25060/mydb
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsUrlImportOpen(false);
                          setDatabaseUrl("");
                        }}
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => parseConnectionUrl(databaseUrl)}
                        disabled={!databaseUrl}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-parse-url"
                      >
                        Parse & Fill Form
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-add-database"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Database
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[85vh] bg-slate-900 border-purple-500/30 overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="text-white">Add Database Connection</DialogTitle>
                  <DialogDescription className="text-purple-300">
                    Configure a new external database connection. The system will automatically test the connection, create all tables, and sync data from your primary database.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 overflow-y-auto flex-1 pr-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-200">Connection Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., Digital Ocean Production" 
                              className="bg-slate-800 border-purple-500/30 text-white"
                              data-testid="input-db-name"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="databaseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-200">Database Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white" data-testid="select-db-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="postgresql">PostgreSQL</SelectItem>
                              <SelectItem value="mysql">MySQL (Coming Soon)</SelectItem>
                              <SelectItem value="mongodb">MongoDB (Coming Soon)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-purple-200">Host</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="db.example.com" 
                                className="bg-slate-800 border-purple-500/30 text-white"
                                data-testid="input-db-host"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-purple-200">Port</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                className="bg-slate-800 border-purple-500/30 text-white"
                                data-testid="input-db-port"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="database"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-200">Database Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="my_database" 
                              className="bg-slate-800 border-purple-500/30 text-white"
                              data-testid="input-db-database"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-200">Username</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="database_user" 
                              className="bg-slate-800 border-purple-500/30 text-white"
                              data-testid="input-db-username"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-purple-200">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder="••••••••" 
                              className="bg-slate-800 border-purple-500/30 text-white"
                              data-testid="input-db-password"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ssl"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border border-purple-500/30 p-2 bg-slate-800/50">
                          <div>
                            <FormLabel className="text-purple-200 text-sm">Use SSL</FormLabel>
                            <p className="text-xs text-purple-400">Enable SSL/TLS encryption</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-db-ssl"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="setAsPrimary"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border border-green-500/30 p-2 bg-green-900/10">
                          <div>
                            <FormLabel className="text-green-200 text-sm font-semibold">Make as Primary Database</FormLabel>
                            <p className="text-xs text-green-400">Use this database as the active primary database</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-db-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enableRealtimeSync"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border border-blue-500/30 p-2 bg-blue-900/10">
                          <div>
                            <FormLabel className="text-blue-200 text-sm font-semibold">Enable Real-time Sync</FormLabel>
                            <p className="text-xs text-blue-400">Automatically sync data changes to this database instantly</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-db-realtime-sync"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                  </form>
                </Form>
                <div className="flex justify-end gap-2 pt-3 border-t border-purple-500/20 flex-shrink-0 mt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-purple-500/30 text-purple-200"
                    data-testid="button-cancel-add-db"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    onClick={form.handleSubmit(onSubmit)}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-add-db"
                  >
                    {createMutation.isPending ? "Setting up..." : "Add & Sync Database"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
              <p className="text-purple-300 mt-2">Loading connections...</p>
            </div>
          ) : !connections?.connections?.length ? (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-purple-400 mx-auto mb-4 opacity-50" />
              <p className="text-purple-300 mb-2">No database connections yet</p>
              <p className="text-purple-400 text-sm">Add your first external database to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-purple-500/20 hover:bg-slate-800/50">
                    <TableHead className="text-purple-200">Name</TableHead>
                    <TableHead className="text-purple-200">Type</TableHead>
                    <TableHead className="text-purple-200">Host</TableHead>
                    <TableHead className="text-purple-200">Status</TableHead>
                    <TableHead className="text-purple-200">Last Sync</TableHead>
                    <TableHead className="text-purple-200 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.connections.map((conn) => (
                    <TableRow 
                      key={conn.id} 
                      className={`border-purple-500/20 hover:bg-slate-800/50 ${
                        conn.isPrimary ? 'bg-yellow-900/20 border-yellow-500/40' :
                        conn.isActive ? 'bg-green-900/10 border-green-500/30' : ''
                      }`}
                    >
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          {conn.isActive && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              ACTIVE
                            </Badge>
                          )}
                          {conn.isPrimary && (
                            <Badge className="bg-yellow-600 text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              PRIMARY
                            </Badge>
                          )}
                          {conn.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-purple-200">
                        <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                          {conn.databaseType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-purple-200">
                        {conn.host}:{conn.port}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${conn.status === 'active' ? 'border-green-500/30 text-green-300' : ''}
                            ${conn.status === 'inactive' ? 'border-gray-500/30 text-gray-300' : ''}
                            ${conn.status === 'testing' ? 'border-yellow-500/30 text-yellow-300' : ''}
                          `}
                        >
                          {conn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-purple-200">
                        {conn.lastSyncAt 
                          ? new Date(conn.lastSyncAt).toLocaleString() 
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                  onClick={() => handleTestConnection(conn.id)}
                                  disabled={testingConnectionId === conn.id}
                                  data-testid={`button-test-connection-${conn.id}`}
                                >
                                  {testingConnectionId === conn.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Test Connection</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                                  onClick={() => handleSync(conn.id)}
                                  disabled={syncingConnectionId === conn.id}
                                  data-testid={`button-sync-connection-${conn.id}`}
                                >
                                  {syncingConnectionId === conn.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sync Data from Primary to this Database</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            {syncingConnectionId === conn.id && syncProgress > 0 && (
                              <div className="absolute -bottom-1 left-0 right-0">
                                <Progress value={syncProgress} className="h-1" />
                              </div>
                            )}
                            
                            {conn.isActive && !conn.isPrimary && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                                    onClick={() => handleSetPrimary(conn.id, conn.name)}
                                    disabled={setPrimaryMutation.isPending}
                                    data-testid={`button-set-primary-${conn.id}`}
                                  >
                                    <Crown className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Set as Primary Database</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            
                            {!conn.isActive && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                                    onClick={() => handleActivate(conn.id)}
                                    data-testid={`button-activate-connection-${conn.id}`}
                                  >
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Set as Active Database</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!conn.isActive && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                                    onClick={() => handleDelete(conn.id, conn)}
                                    data-testid={`button-delete-connection-${conn.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Connection</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="admin-card admin-glow border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-purple-400" />
            Active Database Connections
          </CardTitle>
          <CardDescription className="text-purple-300">
            Currently active database for your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const primaryConnection = connections?.connections?.find(conn => conn.isPrimary);
            const activeConnection = connections?.connections?.find(conn => conn.isActive);
            const hasPrimaryExternal = primaryConnection !== undefined;
            
            return (
              <>
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  hasPrimaryExternal 
                    ? 'bg-slate-800/50 border border-purple-500/20' 
                    : 'bg-yellow-900/20 border border-yellow-500/30'
                }`}>
                  <div>
                    <p className="text-white font-medium">Primary Managed Database</p>
                    <p className={hasPrimaryExternal ? 'text-purple-300 text-sm' : 'text-yellow-300 text-sm'}>
                      PostgreSQL • {hasPrimaryExternal ? 'Backup' : 'Primary'} • Always Active
                    </p>
                  </div>
                  {!hasPrimaryExternal && (
                    <Badge className="bg-yellow-600 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      PRIMARY
                    </Badge>
                  )}
                </div>
                
                {activeConnection && (
                  <div className={`flex items-center justify-between p-4 rounded-lg ${
                    activeConnection.isPrimary 
                      ? 'bg-yellow-900/20 border border-yellow-500/30' 
                      : 'bg-green-900/20 border border-green-500/30'
                  }`}>
                    <div>
                      <p className="text-white font-medium">
                        {activeConnection.name}
                      </p>
                      <p className={activeConnection.isPrimary ? 'text-yellow-300 text-sm' : 'text-green-300 text-sm'}>
                        {activeConnection.databaseType} • 
                        {activeConnection.host}:
                        {activeConnection.port}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {!activeConnection.isPrimary && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                                onClick={() => handleSetPrimary(activeConnection.id, activeConnection.name)}
                                disabled={setPrimaryMutation.isPending}
                                data-testid={`button-set-primary-active-${activeConnection.id}`}
                              >
                                <Crown className="h-4 w-4 mr-1" />
                                Set as Primary
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Make this the primary database for your application</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        ACTIVE
                      </Badge>
                      {activeConnection.isPrimary && (
                        <Badge className="bg-yellow-600 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          PRIMARY
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {!activeConnection && (
                  <div className="p-4 bg-slate-800/30 border border-purple-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-300">
                      <Info className="h-4 w-4" />
                      <p className="text-sm">No external database is currently active. Primary database is handling all data.</p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
