import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff, Lock, Mail, KeyRound } from "lucide-react";
import { resetPasswordSchema, resetPasswordConfirmSchema, type ResetPassword, type ResetPasswordConfirm } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const token = urlParams.get('token');
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'confirm'>(token ? 'confirm' : 'request');

  // Update step and form when token changes in URL
  useEffect(() => {
    if (token) {
      setStep('confirm');
      confirmForm.setValue('token', token);
    }
  }, [token]);

  // Form for requesting password reset
  const requestForm = useForm<ResetPassword>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  // Form for confirming password reset
  const confirmForm = useForm<ResetPasswordConfirm>({
    resolver: zodResolver(resetPasswordConfirmSchema),
    defaultValues: {
      token: token || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: ResetPassword) => {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions",
      });
      setStep('request');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reset email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const confirmResetMutation = useMutation({
    mutationFn: async (data: ResetPasswordConfirm) => {
      const response = await fetch("/api/auth/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "You can now login with your new password",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Password reset failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onRequestSubmit = (data: ResetPassword) => {
    requestResetMutation.mutate(data);
  };

  const onConfirmSubmit = (data: ResetPasswordConfirm) => {
    confirmResetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-white/70">
            {step === 'request' 
              ? 'Enter your email to receive reset instructions'
              : 'Enter your new password'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    {...requestForm.register("email")}
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                    data-testid="input-reset-email"
                  />
                </div>
                {requestForm.formState.errors.email && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                    <AlertDescription className="text-red-400">
                      {requestForm.formState.errors.email.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                disabled={requestResetMutation.isPending}
                data-testid="button-send-reset"
              >
                {requestResetMutation.isPending ? "Sending..." : "Send Reset Email"}
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white/90">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    {...confirmForm.register("newPassword")}
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                    data-testid="button-toggle-new-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmForm.formState.errors.newPassword && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                    <AlertDescription className="text-red-400">
                      {confirmForm.formState.errors.newPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/90">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    {...confirmForm.register("confirmPassword")}
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                    data-testid="input-confirm-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                    data-testid="button-toggle-confirm-new-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmForm.formState.errors.confirmPassword && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                    <AlertDescription className="text-red-400">
                      {confirmForm.formState.errors.confirmPassword.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                disabled={confirmResetMutation.isPending}
                data-testid="button-reset-password"
              >
                {confirmResetMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          <div className="text-center">
            <p className="text-white/70">
              Remember your password?{" "}
              <Link 
                href="/login" 
                className="text-yellow-500 hover:text-yellow-400 font-semibold"
                data-testid="link-login"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}