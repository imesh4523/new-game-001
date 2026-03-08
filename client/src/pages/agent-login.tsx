import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, UserCheck, Mail, Lock } from "lucide-react";
import { loginSchema, type LoginUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AgentLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginUser) => {
      const response = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Agent login failed");
      }
      return response.json();
    },
    onSuccess: (loginResponse) => {
      // Transform login response to match profile API structure
      const { agentProfile, ...userData } = loginResponse as any;
      const profileData = {
        user: userData,
        agentProfile: agentProfile
      };
      
      queryClient.setQueryData(["/api/agent/profile"], profileData);
      
      const agentName = userData?.email?.split('@')[0] || userData?.publicId || 'Agent';
      toast({
        title: "Agent login successful",
        description: `Welcome back, ${agentName}!`,
      });
      // Use direct navigation for non-hash routes
      window.location.href = "/agent-dashboard";
    },
    onError: (error: any) => {
      toast({
        title: "Agent login failed",
        description: error.message || "Invalid agent credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginUser) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white relative overflow-hidden flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Agent Portal</CardTitle>
          <CardDescription className="text-white/70">
            Sign in to your agent dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  {...form.register("email")}
                  id="email"
                  type="email"
                  placeholder="Enter your agent email"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500"
                  data-testid="input-agent-email"
                />
              </div>
              {form.formState.errors.email && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {form.formState.errors.email.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  {...form.register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your agent password"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500"
                  data-testid="input-agent-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                  data-testid="button-toggle-agent-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {form.formState.errors.password.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              disabled={loginMutation.isPending}
              data-testid="button-agent-login"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In as Agent"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-white/70">
              <a 
                href="/#/login" 
                className="text-blue-400 hover:text-blue-300 font-semibold"
                data-testid="link-user-login"
              >
                ← Back to User Login
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}