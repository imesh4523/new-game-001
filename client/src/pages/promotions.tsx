import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  Home, 
  Activity, 
  Gift, 
  User, 
  ArrowLeft,
  Crown,
  Star,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  CheckCircle,
  ArrowRight,
  Gamepad2,
  Share2,
  Copy,
  QrCode,
  Users,
  Trophy,
  Ticket
} from "lucide-react";
import { SiFacebook, SiWhatsapp, SiYoutube, SiTelegram, SiInstagram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { VIP_LEVELS, getVipDisplayName } from "@shared/schema";
import FallingAnimation from "@/components/falling-animation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalCommission: string;
  referrals: Array<{
    id: string;
    referredId: string;
    commissionRate: string;
    totalCommission: string;
    status: string;
    createdAt: string;
  }>;
}

interface QrData {
  qrCode: string;
  referralLink: string;
  referralCode: string;
}

// Confetti Celebration Component
function ConfettiCelebration({ trigger, vipUpgrade }: { trigger: boolean; vipUpgrade?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), vipUpgrade ? 4000 : 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger, vipUpgrade]);

  if (!show) return null;

  const confettiCount = vipUpgrade ? 100 : 50;
  const colors = vipUpgrade 
    ? ['#ffd700', '#ffed4e', '#ffa500', '#ff6347', '#ff1493', '#9370db'] 
    : ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti particles */}
      {Array.from({ length: confettiCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      
      {/* VIP Upgrade Crown Animation */}
      {vipUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-slow">
            <Crown className="w-32 h-32 text-yellow-400 drop-shadow-2xl" style={{
              filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
              animation: 'pulse 1s ease-in-out infinite'
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Promo Code Redemption Component
function PromoCodeRedemption() {
  const [promoCode, setPromoCode] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [vipUpgrade, setVipUpgrade] = useState(false);
  const { toast } = useToast();

  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/promo-codes/redeem', { code });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        const isVipUpgrade = data.vipLevelUpgraded && data.newVipLevel;
        setCelebrate(true);
        setVipUpgrade(isVipUpgrade);
        
        let description = `You received ${parseFloat(data.amountAwarded).toFixed(2)} coins!`;
        if (isVipUpgrade) {
          description += ` 🎉 VIP Level upgraded to ${getVipDisplayName(data.newVipLevel)}!`;
        }
        
        toast({
          title: isVipUpgrade ? "👑 VIP Upgrade!" : "🎊 Success!",
          description,
        });
        setPromoCode("");
        // Invalidate user data to refresh balance
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        
        // Reset celebration after animation
        setTimeout(() => {
          setCelebrate(false);
          setVipUpgrade(false);
        }, isVipUpgrade ? 4000 : 3000);
      } else {
        toast({
          title: "Redemption Failed",
          description: data.reason || "Invalid promo code",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem promo code",
        variant: "destructive",
      });
    },
  });

  const handleRedeem = () => {
    if (!promoCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }
    redeemMutation.mutate(promoCode.trim().toUpperCase());
  };

  return (
    <>
      <ConfettiCelebration trigger={celebrate} vipUpgrade={vipUpgrade} />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-purple-400" />
          <p className="text-white/90 text-sm font-medium">Enter Promo Code</p>
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter your code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 bg-black/20 border-white/10 text-white placeholder:text-white/40"
            disabled={redeemMutation.isPending}
            data-testid="input-promo-code"
          />
          <Button
            onClick={handleRedeem}
            disabled={redeemMutation.isPending || !promoCode.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            data-testid="button-redeem-promo"
          >
            {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
          </Button>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-purple-300 text-xs">i</span>
            </div>
            <p className="text-white/60 text-xs">
              Promo codes can be redeemed once per user. You'll receive a random bonus amount between the code's minimum and maximum value.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PromotionsPage() {
  const [location, setLocation] = useLocation();

  // Get user data
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: demoUser } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user,
  });

  // Get public settings to check if Wingo Mode is globally enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const currentUser = user || demoUser;

  // Redirect to Wingo Mode if enabled (both globally and by user)
  useEffect(() => {
    if (!publicSettings || !user) return;
    const wingoModeGloballyEnabled = publicSettings.find(s => s.key === 'wingo_mode_enabled')?.value !== 'false';
    if (user.wingoMode && wingoModeGloballyEnabled) {
      setLocation('/wingo?modeon');
    }
  }, [user, publicSettings, setLocation]);

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/signup');
    }
  }, [user, setLocation]);

  // State management for referral section
  const [showQrCode, setShowQrCode] = useState(false);
  const { toast } = useToast();

  // Get referral data
  const { data: referralData, isLoading: isLoadingReferral } = useQuery<ReferralData>({  
    queryKey: ['/api/user/referral'],
    enabled: !!user, // Only fetch when user is authenticated
    retry: false,
  });

  // Get QR code data
  const { data: qrData, refetch: refetchQr, isLoading: isLoadingQr, isError: isQrError } = useQuery<QrData>({
    queryKey: ['/api/user/referral/qr'],
    enabled: false, // Only fetch when explicitly requested
    retry: false,
  });

  // Get user's VIP level Telegram link
  const { data: vipTelegramLink } = useQuery<{ telegramLink: string | null; description?: string; vipLevel: string }>({
    queryKey: ['/api/user/vip-telegram-link'],
    enabled: !!user, // Only fetch when user is authenticated
    retry: false,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS environments
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleShowQrCode = async () => {
    setShowQrCode(true);
    try {
      await refetchQr();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign up to view promotions.
          </p>
          <Button onClick={() => setLocation('/signup')}>
            Sign Up
          </Button>
        </div>
      </div>
    );
  }

  const currentVipLevel = currentUser.vipLevel || 'lv1';
  const totalReferrals = referralData?.totalReferrals || 0;
  const qualifiedReferrals = currentUser.teamSize || 0;
  const totalDeposits = parseFloat(currentUser.totalDeposits || '0');
  
  // Calculate progress to next level
  const vipLevels = Object.keys(VIP_LEVELS) as (keyof typeof VIP_LEVELS)[];
  const currentLevelIndex = vipLevels.indexOf(currentVipLevel);
  const nextLevel = currentLevelIndex < vipLevels.length - 1 ? vipLevels[currentLevelIndex + 1] : null;
  const nextLevelTeamSize = nextLevel ? VIP_LEVELS[nextLevel].teamRequirement : null;
  const nextLevelDeposit = nextLevel ? VIP_LEVELS[nextLevel].depositRequirement : null;
  const progressPercent = nextLevelTeamSize ? Math.min((qualifiedReferrals / nextLevelTeamSize) * 100, 100) : 100;
  const depositProgressPercent = nextLevelDeposit ? Math.min((totalDeposits / nextLevelDeposit) * 100, 100) : 100;

  const getVipLevelColor = (level: string) => {
    switch (level) {
      case 'lv1':
        return 'from-gray-500 to-gray-600';
      case 'vip':
        return 'from-green-500 to-green-600';
      case 'vip1':
        return 'from-blue-500 to-blue-600';
      case 'vip2':
        return 'from-purple-500 to-purple-600';
      case 'vip3':
        return 'from-pink-500 to-pink-600';
      case 'vip4':
        return 'from-orange-500 to-orange-600';
      case 'vip5':
        return 'from-yellow-400 to-yellow-500';
      case 'vip6':
        return 'from-amber-400 to-amber-500';
      case 'vip7':
        return 'from-rose-400 to-rose-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'lv1':
        return 'bg-gray-600/20 text-gray-300 border-gray-400/30';
      case 'vip':
        return 'bg-green-600/20 text-green-300 border-green-400/30';
      case 'vip1':
        return 'bg-blue-600/20 text-blue-300 border-blue-400/30';
      case 'vip2':
        return 'bg-purple-600/20 text-purple-300 border-purple-400/30';
      case 'vip3':
        return 'bg-pink-600/20 text-pink-300 border-pink-400/30';
      case 'vip4':
        return 'bg-orange-600/20 text-orange-300 border-orange-400/30';
      case 'vip5':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-400/30';
      case 'vip6':
        return 'bg-amber-600/20 text-amber-300 border-amber-400/30';
      case 'vip7':
        return 'bg-rose-600/20 text-rose-300 border-rose-400/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      <FallingAnimation />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-white text-lg font-semibold">Promotions</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 p-4 space-y-6">
        {/* Current VIP Status */}
        <Card className={`bg-gradient-to-r ${getVipLevelColor(currentVipLevel)}/20 border-white/20`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Crown className="w-5 h-5 text-yellow-400" />
              Your VIP Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className={getBadgeColor(currentVipLevel)}>
                  <Crown className="w-3 h-3 mr-1" />
                  {getVipDisplayName(currentVipLevel)}
                </Badge>
                <p className="text-white/60 text-sm mt-1">Current Level</p>
              </div>
              <div className="text-right">
                <p className="text-white text-lg font-bold">{qualifiedReferrals}</p>
                <p className="text-white/60 text-sm">Total Team Members</p>
              </div>
            </div>

            {nextLevel && (
              <div className="space-y-3">
                <p className="text-white/90 text-sm font-medium">Progress to {getVipDisplayName(nextLevel)}</p>
                
                {/* Referral Progress */}
                {nextLevelTeamSize && nextLevelTeamSize > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-xs">Referrals Option</span>
                      <span className="text-white/70 text-xs">
                        {qualifiedReferrals} / {nextLevelTeamSize}
                      </span>
                    </div>
                    <Progress 
                      value={progressPercent} 
                      className="h-2 bg-white/10"
                      data-testid="progress-referrals"
                    />
                  </div>
                )}

                {/* Deposit Progress */}
                {nextLevelDeposit && nextLevelDeposit > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-xs">Deposit Option</span>
                      <span className="text-white/70 text-xs">
                        ${totalDeposits.toFixed(0)} / ${nextLevelDeposit}
                      </span>
                    </div>
                    <Progress 
                      value={depositProgressPercent} 
                      className="h-2 bg-white/10"
                      data-testid="progress-deposits"
                    />
                  </div>
                )}

                {/* Requirements Message */}
                {(qualifiedReferrals < (nextLevelTeamSize || 0) && totalDeposits < (nextLevelDeposit || 0)) && (
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-white/80 text-xs">
                      <span className="font-medium">{Math.max(0, (nextLevelTeamSize || 0) - qualifiedReferrals)} more referrals</span>
                      <span className="text-white/50 mx-2">OR</span>
                      <span className="font-medium">${Math.max(0, (nextLevelDeposit || 0) - totalDeposits)} deposit</span>
                      <span className="block mt-1 text-white/50">to reach {getVipDisplayName(nextLevel)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentVipLevel === 'vip7' && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">Maximum VIP Level Achieved!</span>
                  <Star className="w-5 h-5" />
                </div>
                <p className="text-white/60 text-sm mt-1">You have unlocked all VIP benefits</p>
              </div>
            )}

            {/* VIP Telegram Group Link */}
            {vipTelegramLink && vipTelegramLink.telegramLink && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button
                  onClick={() => window.open(vipTelegramLink.telegramLink!, '_blank')}
                  className="w-full bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#0088cc] hover:to-[#229ED9] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                  data-testid="button-join-telegram"
                >
                  <SiTelegram className="w-6 h-6" />
                  <span>Join VIP {getVipDisplayName(currentVipLevel)} Telegram Group</span>
                </Button>
                {vipTelegramLink.description && (
                  <p className="text-white/50 text-xs text-center mt-2" data-testid="text-telegram-description">
                    {vipTelegramLink.description}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Program */}
        {user && (
          <Card className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-300/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5" />
                Referral Program
              </CardTitle>
              <CardDescription className="text-white/60">
                Invite friends and earn{' '}
                <div className="relative w-5 h-5 inline-block align-middle usdt-icon-animate">
                  <svg viewBox="0 0 339.43 295.27" className="w-full h-full" style={{ filter: 'drop-shadow(0 2px 6px rgba(38, 161, 123, 0.8))' }}>
                    <g>
                      <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,293.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z"/>
                      <path fill="white" d="M191.19,144.8c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z"/>
                    </g>
                  </svg>
                </div>
                {' '}when they make their first deposit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingReferral ? (
                <div className="text-center py-8" data-testid="loading-referral">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="text-white/60 text-sm mt-2">Loading referral data...</p>
                </div>
              ) : referralData ? (
                <>
                  {/* Referral Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 text-center" data-testid="stat-total-referrals">
                      <p className="text-2xl font-bold text-white">{referralData.totalReferrals}</p>
                      <p className="text-white/60 text-sm">Total Referrals</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center" data-testid="stat-total-commission">
                      <p className="text-2xl font-bold text-white">{Math.round(parseFloat(referralData.totalCommission || '0') * 100)} coins</p>
                      <p className="text-white/60 text-sm">Total Earned</p>
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-white/70">Your Referral Code</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(referralData.referralCode, "Referral code")}
                        className="text-white/60 hover:text-white h-8 px-2"
                        data-testid="button-copy-code"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                      <p className="text-white font-mono text-center" data-testid="text-referral-code">
                        {referralData.referralCode}
                      </p>
                    </div>
                  </div>

                  {/* Referral Link */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-white/70">Share Your Link</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(referralData.referralLink, "Referral link")}
                          className="text-white/60 hover:text-white h-8 px-2"
                          data-testid="button-copy-link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowQrCode(!showQrCode)}
                          className="text-white/60 hover:text-white h-8 px-2"
                          data-testid="button-show-qr"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                      <p className="text-white text-sm break-all" data-testid="text-referral-link">
                        {referralData.referralLink}
                      </p>
                    </div>

                    {/* QR Code Display */}
                    {showQrCode && (
                      <div className="bg-white/5 rounded-lg p-4 text-center mt-4" data-testid="section-qr-code">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-white/70">QR Code</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowQrCode(false)}
                            className="text-white/60 hover:text-white h-8 px-2"
                            data-testid="button-hide-qr"
                          >
                            ×
                          </Button>
                        </div>
                        <div className="flex justify-center">
                          {isLoadingQr ? (
                            <div className="w-32 h-32 bg-white/10 rounded-lg p-2 flex items-center justify-center" data-testid="loading-qr">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                          ) : isQrError ? (
                            <div className="w-32 h-32 bg-red-500/10 rounded-lg p-2 flex items-center justify-center text-red-400 text-sm" data-testid="error-qr">
                              Failed to load QR code
                            </div>
                          ) : qrData ? (
                            <img 
                              src={qrData.qrCode} 
                              alt="Referral QR Code"
                              className="w-32 h-32 bg-white rounded-lg p-2"
                              data-testid="img-qr-code"
                            />
                          ) : null}
                        </div>
                        <p className="text-xs text-white/60 mt-2" data-testid="text-qr-description">
                          Scan this QR code to share your referral link
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Social Media Icons */}
                  <div className="flex gap-3 justify-center py-3 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = encodeURIComponent(`Join me on our gaming platform! Use my referral code: ${referralData.referralCode}`);
                        const url = encodeURIComponent(referralData.referralLink);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
                      }}
                      className="h-12 w-12 p-0 rounded-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/40 transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1"
                      data-testid="button-facebook"
                    >
                      <SiFacebook className="w-6 h-6 text-blue-500 hover:text-blue-400 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = encodeURIComponent(`Join me on our gaming platform! Use my referral code: ${referralData.referralCode}`);
                        const url = encodeURIComponent(referralData.referralLink);
                        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                      }}
                      className="h-12 w-12 p-0 rounded-full bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-green-500/50 hover:-translate-y-1"
                      data-testid="button-whatsapp"
                    >
                      <SiWhatsapp className="w-6 h-6 text-green-400 hover:text-green-300 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open('https://www.youtube.com', '_blank');
                      }}
                      className="h-12 w-12 p-0 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-red-500/50 hover:-translate-y-1"
                      data-testid="button-youtube"
                    >
                      <SiYoutube className="w-6 h-6 text-red-400 hover:text-red-300 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const text = encodeURIComponent(`Join me on our gaming platform! Use my referral code: ${referralData.referralCode}\n${referralData.referralLink}`);
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.referralLink)}&text=${text}`, '_blank');
                      }}
                      className="h-12 w-12 p-0 rounded-full bg-blue-400/20 hover:bg-blue-400/40 border border-blue-400/40 transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-blue-400/50 hover:-translate-y-1"
                      data-testid="button-telegram"
                    >
                      <SiTelegram className="w-6 h-6 text-blue-400 hover:text-blue-300 transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.open('https://www.instagram.com', '_blank');
                      }}
                      className="h-12 w-12 p-0 rounded-full bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/40 transition-all duration-300 hover:scale-125 hover:shadow-lg hover:shadow-pink-500/50 hover:-translate-y-1"
                      data-testid="button-instagram"
                    >
                      <SiInstagram className="w-6 h-6 text-pink-400 hover:text-pink-300 transition-colors" />
                    </Button>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(referralData.referralLink, "Referral link")}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                      data-testid="button-copy"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShowQrCode}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                      data-testid="button-qr-code"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-white/60" data-testid="error-referral">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Unable to load referral data</p>
                  <p className="text-sm">Please try again later</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* VIP Levels Overview */}
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Star className="w-5 h-5" />
              VIP Levels & Benefits
            </CardTitle>
            <CardDescription className="text-white/60">
              Unlock higher betting limits and exclusive rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Special Promotions - Promo Code Redemption */}
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-300/20">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">Special Promotions</h3>
                </div>
                <p className="text-white/60 text-sm">
                  Redeem promo codes to get bonus coins
                </p>
              </div>
              <PromoCodeRedemption />
            </div>
            {vipLevels.map((level, index) => {
              const levelInfo = VIP_LEVELS[level];
              const isCurrentLevel = level === currentVipLevel;
              const isUnlocked = totalReferrals >= levelInfo.teamRequirement;
              
              return (
                <div
                  key={level}
                  className={`p-4 rounded-lg border transition-all ${
                    isCurrentLevel 
                      ? 'bg-blue-600/20 border-blue-400/40' 
                      : isUnlocked
                      ? 'bg-green-600/10 border-green-400/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                  data-testid={`vip-level-${level}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isUnlocked ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getBadgeColor(level)}>
                            {getVipDisplayName(level)}
                          </Badge>
                          {isCurrentLevel && (
                            <Badge variant="outline" className="border-blue-400/40 text-blue-300 text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/60 text-sm mt-1">
                          {levelInfo.teamRequirement === 0 ? 'No team required' : `Invite ${levelInfo.teamRequirement} friends`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-semibold">{levelInfo.teamRequirement}</p>
                      <p className="text-white/60 text-sm">Total Referrals</p>
                    </div>
                  </div>
                  
                  {level === 'vip7' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="text-sm font-medium">Exclusive VIP 7 Benefits</span>
                      </div>
                      <ul className="text-white/60 text-sm mt-2 space-y-1">
                        <li>• Priority customer support</li>
                        <li>• Exclusive promotions and bonuses</li>
                        <li>• Higher withdrawal limits</li>
                        <li>• Personal account manager</li>
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Detailed VIP Rules & Rewards */}
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-yellow-400" />
              VIP Rules & Rewards
            </CardTitle>
            <CardDescription className="text-white/60">
              Detailed commission structure and daily rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Level 1 Rules */}
            <div className="p-4 rounded-lg bg-gray-600/10 border border-gray-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-gray-600/20 text-gray-300 border-gray-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Level 1
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    Invite registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100 one day, you can get 0.0% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.lv1.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Rules */}
            <div className="p-4 rounded-lg bg-green-600/10 border border-green-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600/20 text-green-300 border-green-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 7 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.1% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 1 Rules */}
            <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600/20 text-blue-300 border-blue-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 1
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 10 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.2% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip1.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 2 Rules */}
            <div className="p-4 rounded-lg bg-purple-600/10 border border-purple-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-purple-600/20 text-purple-300 border-purple-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 2
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 20 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.3% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip2.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 3 Rules */}
            <div className="p-4 rounded-lg bg-pink-600/10 border border-pink-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-pink-600/20 text-pink-300 border-pink-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 3
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 30 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.4% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip3.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 4 Rules */}
            <div className="p-4 rounded-lg bg-orange-600/10 border border-orange-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-600/20 text-orange-300 border-orange-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 4
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 40 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.5% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip4.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 5 Rules */}
            <div className="p-4 rounded-lg bg-yellow-600/10 border border-yellow-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 5
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 50 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.6% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip5.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 6 Rules */}
            <div className="p-4 rounded-lg bg-amber-600/10 border border-amber-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 6
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 60 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.7% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip6.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VIP 7 Rules */}
            <div className="p-4 rounded-lg bg-rose-600/10 border border-rose-400/20">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-rose-600/20 text-rose-300 border-rose-400/30">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP 7
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rules:</h4>
                  <p className="text-white/70 text-sm">
                    You need to invite 70 registered friends and have them top up to meet the conditions.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 1:</h4>
                  <p className="text-white/70 text-sm">
                    Bet more than 100, you can get 0.8% rewards of your wager amount on the following day
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white text-sm font-medium mb-1">Rights 2 - Commission from Betting:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {VIP_LEVELS.vip7.commissionRates.map((rate, index) => (
                      <div key={index} className="bg-black/20 rounded p-2 text-center">
                        <p className="text-xs text-white/60">Lv{index + 1} Friends</p>
                        <p className="text-white font-semibold">{(rate * 100).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-600/10 border border-blue-400/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-300 text-xs">i</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-1">Grow Your Team, Boost Your Income</p>
                  <p className="text-white/70 text-sm">
                    Automatic commission from every bet your friends place. The more active your team is, the more you earn!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Upgrade */}
        <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-300/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5" />
              How to Upgrade Your VIP Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white font-semibold text-sm">
                  1
                </div>
                <div>
                  <h4 className="text-white font-medium">Invite Friends</h4>
                  <p className="text-white/60 text-sm">
                    Share your referral link and invite friends to join the platform
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white font-semibold text-sm">
                  2
                </div>
                <div>
                  <h4 className="text-white font-medium">Friends Make Deposit</h4>
                  <p className="text-white/60 text-sm">
                    Your friends must register and make a deposit to count toward your team
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white font-semibold text-sm">
                  3
                </div>
                <div>
                  <h4 className="text-white font-medium">Automatic Upgrade</h4>
                  <p className="text-white/60 text-sm">
                    VIP level upgrades automatically when team size requirements are met
                  </p>
                </div>
              </div>
            </div>

            {nextLevel && nextLevelTeamSize && nextLevelTeamSize > 0 && qualifiedReferrals < nextLevelTeamSize && (
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-white/60 text-sm">
                  Invite {Math.max(0, nextLevelTeamSize - qualifiedReferrals)} more {(nextLevelTeamSize - qualifiedReferrals) === 1 ? 'friend' : 'friends'} to reach {getVipDisplayName(nextLevel)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav user={user} />
    </div>
  );
}