import { useState, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { goldCoinsToUsd, usdToGoldCoins } from "@/lib/currency";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface BettingControlsProps {
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  multiplier: number;
  onMultiplierChange: (multiplier: number) => void;
  selectedColor: string | null;
  selectedNumber: number | null;
  currentGame?: any;
  user?: any;
}

const BettingControls = memo(function BettingControls({ 
  betAmount, 
  onBetAmountChange,
  multiplier,
  onMultiplierChange,
  selectedColor,
  selectedNumber,
  currentGame,
  user
}: BettingControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const placeBetMutation = useMutation({
    mutationFn: async (betData: any) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onMutate: async (newBet) => {
      const betAmount = parseFloat(newBet.amount);
      
      const optimisticBet = {
        id: `temp-${Date.now()}`,
        ...newBet,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const previousBets = queryClient.getQueryData(['/api/bets/user/active']);
      queryClient.setQueryData(['/api/bets/user/active'], (old: any[] = []) => {
        return [...old, optimisticBet];
      });

      const previousUser = queryClient.getQueryData(['/api/user/demo']);
      if (previousUser) {
        const newBalance = (parseFloat((previousUser as any).balance) - betAmount).toFixed(8);
        queryClient.setQueryData(['/api/user/demo'], (old: any) => ({
          ...old,
          balance: newBalance
        }));
      }

      const previousCurrentUser = queryClient.getQueryData(['/api/user/current']);
      if (previousCurrentUser) {
        const newBalance = (parseFloat((previousCurrentUser as any).balance) - betAmount).toFixed(8);
        queryClient.setQueryData(['/api/user/current'], (old: any) => ({
          ...old,
          balance: newBalance
        }));
      }

      return { previousBets, previousUser, previousCurrentUser };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/bets/user/active'], (old: any[] = []) => {
        const withoutTemp = old.filter((bet: any) => !bet.id.startsWith('temp-'));
        return [...withoutTemp, data];
      });

      queryClient.invalidateQueries({ 
        queryKey: ['/api/user/demo'],
        refetchType: 'none'
      });

      toast({
        title: "Bet Placed!",
        description: "Your bet has been placed successfully.",
      });
    },
    onError: (error: any, newBet, context) => {
      if (context?.previousBets) {
        queryClient.setQueryData(['/api/bets/user/active'], context.previousBets);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(['/api/user/demo'], context.previousUser);
      }
      if (context?.previousCurrentUser) {
        queryClient.setQueryData(['/api/user/current'], context.previousCurrentUser);
      }

      let errorMessage = "Failed to place bet";
      
      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        errorMessage = "Server is currently unavailable. Please check your internet connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timed out. The server might be slow or down. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const multipliers = [1, 5, 10, 20, 50, 100];


  const handlePlaceBet = async () => {
    if (authLoading) {
      toast({
        title: "Please Wait",
        description: "Verifying your authentication status...",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated || !user) {
      toast({
        title: "Login Required",
        description: "Please sign in to place a bet",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }
    
    if (!currentGame) {
      toast({
        title: "Error",
        description: "Game not found",
        variant: "destructive",
      });
      return;
    }

    const bets = [];

    // Color bet
    if (selectedColor) {
      bets.push({
        userId: user.id,
        gameId: currentGame.gameId,
        betType: "color",
        betValue: selectedColor,
        amount: goldCoinsToUsd(betAmount * multiplier).toString(),
      });
    }

    // Number bet
    if (selectedNumber !== null) {
      bets.push({
        userId: user.id,
        gameId: currentGame.gameId,
        betType: "number",
        betValue: selectedNumber.toString(),
        amount: goldCoinsToUsd(betAmount * multiplier).toString(),
      });
    }


    if (bets.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one bet option",
        variant: "destructive",
      });
      return;
    }

    // Check if user has sufficient balance (convert gold coins to USD for backend)
    const totalAmountInGoldCoins = bets.length * betAmount * multiplier;
    const totalAmountInUSD = goldCoinsToUsd(totalAmountInGoldCoins);
    if (parseFloat(user.balance) < totalAmountInUSD) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough gold coins for this bet",
        variant: "destructive",
      });
      return;
    }

    // Place all bets
    for (const bet of bets) {
      await placeBetMutation.mutateAsync(bet);
    }
  };

  return (
    <div className="glass-card-dark p-6">
      <h3 className="text-lg font-semibold mb-4 text-center">Betting Amount</h3>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button 
          className="glass-button py-3 px-4 rounded-lg font-medium text-white"
          onClick={() => {}}
          data-testid="button-random"
        >
          Random
        </button>
        {multipliers.map((mult) => (
          <button
            key={mult}
            className={`glass-button py-3 px-4 rounded-lg font-medium text-white ${
              multiplier === mult
                ? "ring-2 ring-blue-400 bg-blue-600/30"
                : ""
            }`}
            onClick={() => onMultiplierChange(mult)}
            data-testid={`button-multiplier-${mult}`}
          >
            X{mult}
          </button>
        ))}
      </div>
      
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Bet Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400">
            <Coins className="w-4 h-4" />
          </span>
          <input 
            type="number" 
            className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent" 
            placeholder="1000" 
            value={betAmount}
            onChange={(e) => onBetAmountChange(parseFloat(e.target.value) || 0)}
            data-testid="input-bet-amount"
          />
        </div>
      </div>
      
      <button 
        className="w-full bg-black hover:bg-gray-800 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg betting-button disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handlePlaceBet}
        disabled={placeBetMutation.isPending || authLoading || !isAuthenticated}
        data-testid="button-place-bet"
      >
        {authLoading ? "Verifying..." : placeBetMutation.isPending ? "Placing Bet..." : "Place Bet"}
      </button>
    </div>
  );
});

export default BettingControls;
