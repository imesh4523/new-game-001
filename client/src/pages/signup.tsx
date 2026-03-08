import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, UserPlus, Lock, Mail, Users, Shield } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo } from "@/lib/deviceFingerprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Compact3XBetLogo } from "@/components/enhanced-3xbet-logo";

export default function Signup() {
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showWithdrawalPassword, setShowWithdrawalPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract referral code from URL parameters
  const getReferralCodeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ref') || "";
    }
    return "";
  };

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      withdrawalPassword: "",
      acceptedTerms: false,
      referralCode: getReferralCodeFromUrl(),
    },
  });

  // Update referral code field when URL changes or component mounts
  useEffect(() => {
    const referralCode = getReferralCodeFromUrl();
    if (referralCode) {
      form.setValue("referralCode", referralCode);
      toast({
        title: "Referral code applied",
        description: `Referral code "${referralCode}" has been automatically applied to your signup.`,
        variant: "default",
      });
    }
  }, [form, toast]);


  const signupMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const deviceFingerprint = await getDeviceInfo();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, deviceFingerprint }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Signup failed");
      }
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Account created successfully",
        description: `Welcome to the gaming platform!`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Compact3XBetLogo />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
          <CardDescription className="text-white/70">
            Join the gaming platform and start playing
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
                  placeholder="Enter your email"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                  data-testid="input-email"
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
                  placeholder="Create a password"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                  data-testid="button-toggle-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/90">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  {...form.register("confirmPassword")}
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {form.formState.errors.confirmPassword.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawalPassword" className="text-white/90">Withdrawal Password</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  {...form.register("withdrawalPassword")}
                  id="withdrawalPassword"
                  type={showWithdrawalPassword ? "text" : "password"}
                  placeholder="Create withdrawal password"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                  data-testid="input-withdrawal-password"
                />
                <button
                  type="button"
                  onClick={() => setShowWithdrawalPassword(!showWithdrawalPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-white/50 hover:text-white"
                  data-testid="button-toggle-withdrawal-password"
                >
                  {showWithdrawalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.withdrawalPassword && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {form.formState.errors.withdrawalPassword.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-white/90">Referral Code (Optional)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                <Input
                  {...form.register("referralCode")}
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code (optional)"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-yellow-500"
                  data-testid="input-referral-code"
                />
              </div>
              {form.formState.errors.referralCode && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400">
                    {form.formState.errors.referralCode.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptedTerms"
                checked={form.watch("acceptedTerms")}
                onCheckedChange={(checked) => form.setValue("acceptedTerms", checked as boolean)}
                className="mt-1 border-white/20 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                data-testid="checkbox-terms"
              />
              <Label htmlFor="acceptedTerms" className="text-white/90 text-sm cursor-pointer">
                I agree to the{" "}
                <Link href="/terms-of-service" className="text-yellow-500 hover:text-yellow-400 underline" data-testid="link-terms">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy-policy" className="text-yellow-500 hover:text-yellow-400 underline" data-testid="link-privacy">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {form.formState.errors.acceptedTerms && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertDescription className="text-red-400">
                  {form.formState.errors.acceptedTerms.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
              disabled={signupMutation.isPending}
              data-testid="button-signup"
            >
              {signupMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/70 text-sm">
              Already have an account?{" "}
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