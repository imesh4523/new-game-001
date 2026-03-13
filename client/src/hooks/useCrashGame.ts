import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useWebSocket } from "./use-websocket";
import { useAuth } from "./use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { goldCoinsToUsd } from "@/lib/currency";




export type GamePhase = "waiting" | "countdown" | "flying" | "crashed";

export interface BotPlayer {
  id: string;
  username: string;
  bet: number;
  cashedOut: boolean;
  cashOutMultiplier: number | null;
  win: number | null;
}

export interface HistoryEntry {
  id: string;
  gameId: string;
  crashPoint: number;
  bet: number;
  cashedOut: boolean;
  cashOutMultiplier: number | null;
  win: number;
  timestamp: number;
}

export function useCrashGame() {
  const { crashState } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [localMultiplier, setLocalMultiplier] = useState(1.0);
  const [currentBet, setCurrentBet] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [autoBet, setAutoBet] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [cashOutMultiplier, setCashOutMultiplier] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [graphPoints, setGraphPoints] = useState<{ x: number; y: number }[]>([]);
  const [countdown, setCountdown] = useState(0);

  const animRef = useRef<number>(0);

  // Fetch global crash history from API
  const { data: historyData = [] } = useQuery<{ gameId: string, crashPoint: number }[]>({
    queryKey: ['/api/crash/history'],
    enabled: !!user,
  });

  // Fetch personal bet history
  const { data: betHistoryData = [] } = useQuery<HistoryEntry[]>({
    queryKey: ['/api/crash/bet-history'],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10s to keep it updated
  });

  // Fetch active bet on mount or user change
  const { data: myBetData } = useQuery<{
    hasBet: boolean;
    amount: number;
    cashedOut: boolean;
    multiplier: number;
    autoCashout?: number;
  }>({
    queryKey: ['/api/crash/my-bet'],
    enabled: !!user,
    staleTime: 0, // Always check on load
  });

  // Re-sync local state with server state on load
  useEffect(() => {
    if (myBetData?.hasBet) {
      setCurrentBet(myBetData.amount);
      setHasCashedOut(myBetData.cashedOut);
      setCashOutMultiplier(myBetData.multiplier);
      if (myBetData.cashedOut) {
        setWinAmount(myBetData.amount * myBetData.multiplier);
      }
    }
  }, [myBetData]);

  // Merge histories for the UI
  const history = useMemo(() => {
    return historyData.map((h) => {
      // Find if we have a bet record for this crash round
      const bet = betHistoryData.find(b => b.gameId === h.gameId);
      if (bet) return bet;
      
      return {
        id: `hist-${h.gameId}`,
        gameId: h.gameId,
        crashPoint: h.crashPoint,
        bet: 0,
        cashedOut: false,
        cashOutMultiplier: null,
        win: 0,
        timestamp: Date.now(),
      };
    });
  }, [historyData, betHistoryData]);

  const lastCrashes = useMemo(() => historyData.map(h => h.crashPoint), [historyData]);

  // Local multiplier animation
  useEffect(() => {
    if (!crashState || crashState.phase !== 'flying' || !crashState.startTime) {
      if (crashState?.phase === 'crashed') {
        setLocalMultiplier(crashState.crashPoint || 1.0);
      } else {
        setLocalMultiplier(1.0);
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = (now - crashState.startTime!) / 1000;
      
      if (elapsed < 0) {
        setLocalMultiplier(1.0);
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      // Formula must match backend: e^(0.1 * elapsed)
      const m = Math.exp(0.1 * elapsed);
      const currentMultiplier = Math.floor(m * 100) / 100;
      
      setLocalMultiplier(currentMultiplier);
      setGraphPoints((prev) => {
          // If x is too close to previous, skip to avoid huge arrays
          if (prev.length > 0 && elapsed - prev[prev.length-1].x < 0.05) return prev;
          return [...prev, { x: elapsed, y: currentMultiplier }];
      });

      animRef.current = requestAnimationFrame(tick);
    };

    setGraphPoints([{ x: 0, y: 1 }]);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [crashState?.phase, crashState?.startTime, crashState?.crashPoint]);

  // Countdown logic
  useEffect(() => {
    if (crashState?.phase === 'waiting' && crashState.startTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((crashState.startTime! - Date.now()) / 1000));
        setCountdown(remaining);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setCountdown(0);
    }
  }, [crashState?.phase, crashState?.startTime]);

  // Reset local state when a new game starts
  useEffect(() => {
    if (crashState?.phase === 'waiting') {
      setCurrentBet(0);
      setHasCashedOut(false);
      setCashOutMultiplier(0);
      setWinAmount(0);
      setGraphPoints([{ x: 0, y: 1 }]);
      setLocalMultiplier(1.0);
    }
  }, [crashState?.gameId, crashState?.phase]);

  // Refetch balance when game crashes — this is when win/loss is settled
  useEffect(() => {
    if (crashState?.phase === 'crashed') {
      // Small delay so server has time to settle the bet
      const t = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [crashState?.phase, queryClient]);

  // Also refetch when phase changes back to waiting (new round ready)
  useEffect(() => {
    if (crashState?.phase === 'waiting') {
      queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
    }
  }, [crashState?.phase, queryClient]);

  // Mutations
  const betMutation = useMutation({
    mutationFn: async ({ amount, autoCashout }: { amount: number, autoCashout?: number }) => {
      const res = await fetch('/api/crash/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, autoCashout }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to place bet');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: "✅ Bet placed!", description: `${Math.round(variables.amount * 100)} coins wagered` });
      setCurrentBet(variables.amount);
      // Invalidate both query keys that LiveBalance might use
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const cashoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crash/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to cash out');
      }
      return res.json();
    },
    onSuccess: (data) => {
      const coinsWon = Math.round(data.winAmount * 100);
      toast({ title: `💰 Cashed out at ${data.multiplier}x!`, description: `+${coinsWon} coins won!` });
      setHasCashedOut(true);
      setCashOutMultiplier(data.multiplier);
      setWinAmount(data.winAmount);
      // Refetch balance immediately after cashout
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/current'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const placeBet = useCallback(() => {
    if (!user) return;
    if (currentBet > 0) return;
    betMutation.mutate({ amount: goldCoinsToUsd(betAmount) }); // Convert coins → USD for server (balance stored in USD)

  }, [user, betAmount, currentBet, betMutation]);

  const cashOut = useCallback(() => {
    if (hasCashedOut) return;
    cashoutMutation.mutate();
  }, [hasCashedOut, cashoutMutation]);

  const addBalance = useCallback(() => {
    toast({ title: "Deposit", description: "Please use the deposit page to add balance." });
  }, [toast]);

  // Map backend players to UI players
  const bots = useMemo(() => {
    if (!crashState) return [];
    return crashState.players
      .filter(p => p.username !== 'You') // Filter out "You" if it ever leaks into broadcast
      .map((p, i) => ({
        id: p.userId || `p-${i}`,
        username: p.username,
        bet: p.bet,
        cashedOut: p.cashedOut,
        cashOutMultiplier: p.cashoutMultiplier || null,
        win: p.cashedOut ? p.bet * (p.cashoutMultiplier || 0) : null,
      }));
  }, [crashState]);

  return {
    phase: crashState?.phase === 'waiting' && countdown > 0 ? 'countdown' as const : (crashState?.phase || "waiting"),
    multiplier: localMultiplier,
    crashPoint: crashState?.crashPoint || 0,
    balance: user ? parseFloat(user.balance) : 0,
    currentBet,
    betAmount,
    setBetAmount,
    hasCashedOut,
    cashOutMultiplier,
    winAmount,
    bots,
    history,
    graphPoints,
    countdown,
    autoBet,
    setAutoBet,
    lastCrashes,
    placeBet,
    cashOut,
    addBalance,
  };
}
