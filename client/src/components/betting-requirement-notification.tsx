import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Coins, TrendingUp, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";

interface BettingRequirementData {
  totalDeposits: string;
  totalBetsAmount: string;
  requiredBetAmount: string;
  remainingBetAmount: string;
  betPercentage: string;
  requiredPercentage: number;
  canWithdraw: boolean;
  withdrawableCommission: string;
  notificationIntervalHours: number;
  hoursSinceLastNotification: string;
  shouldShowNotification: boolean;
}

export default function BettingRequirementNotification() {
  const queryClient = useQueryClient();

  const { data: requirementData } = useQuery<BettingRequirementData>({
    queryKey: ['/api/auth/betting-requirement'],
    retry: false,
  });

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/dismiss-betting-notification", {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the betting requirement query to get updated shouldShowNotification status
      queryClient.invalidateQueries({ queryKey: ['/api/auth/betting-requirement'] });
    },
  });

  const handleDismiss = () => {
    dismissMutation.mutate();
  };

  // Don't show if user is not authenticated, requirement is met, or notification should not be shown
  if (!user || !requirementData || requirementData.canWithdraw || !requirementData.shouldShowNotification) {
    return null;
  }

  const totalDeposits = parseFloat(requirementData.totalDeposits);
  const totalBets = parseFloat(requirementData.totalBetsAmount);
  const remainingBet = parseFloat(requirementData.remainingBetAmount);
  const percentage = parseFloat(requirementData.betPercentage);
  const requiredPercentage = requirementData.requiredPercentage;

  return (
    <Card className="bg-gradient-to-br from-orange-900/30 via-red-900/20 to-orange-900/30 backdrop-blur-md border-orange-500/30 mb-4" data-testid="card-betting-requirement">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-white font-semibold">Betting Requirement</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
            className="text-white/60 hover:text-white hover:bg-white/10 h-6 w-6 p-0"
            data-testid="button-dismiss-notification"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-white/80">
            You must bet <span className="font-bold text-orange-400">{requiredPercentage}%</span> of your total deposits before you can withdraw.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Progress:</span>
              <span className="text-white font-medium">
                {percentage.toFixed(1)}% / {requiredPercentage}%
              </span>
            </div>
            <Progress value={percentage > 100 ? 100 : percentage} className="h-2 bg-white/10" data-testid="progress-betting" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-white/5 rounded border border-white/10">
              <div className="flex items-center gap-1 text-white/60 mb-1">
                <Coins className="w-3 h-3" />
                <span>Total Deposits</span>
              </div>
              <div className="text-white font-medium" data-testid="text-total-deposits">
                {formatGoldCoins(usdToGoldCoins(totalDeposits))}
              </div>
            </div>
            
            <div className="p-2 bg-white/5 rounded border border-white/10">
              <div className="flex items-center gap-1 text-white/60 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>Total Bets</span>
              </div>
              <div className="text-white font-medium" data-testid="text-total-bets">
                {formatGoldCoins(usdToGoldCoins(totalBets))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Remaining to bet:</span>
              <span className="text-base font-bold text-orange-400" data-testid="text-remaining-bet">
                {formatGoldCoins(usdToGoldCoins(remainingBet))}
              </span>
            </div>
          </div>

          {parseFloat(requirementData.withdrawableCommission) > 0 && (
            <p className="text-xs text-white/60 bg-white/5 p-2 rounded border border-white/10">
              💡 Note: You can withdraw up to {formatGoldCoins(usdToGoldCoins(parseFloat(requirementData.withdrawableCommission)))} from commission earnings without meeting this requirement.
            </p>
          )}

          <p className="text-xs text-white/50 text-center mt-2">
            This reminder appears every {requirementData.notificationIntervalHours} hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
