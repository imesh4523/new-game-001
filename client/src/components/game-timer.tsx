import React, { useState, memo } from "react";
import { useGameTimer } from "@/hooks/use-game-timer";
import { HelpCircle, X, Target, TrendingUp, Coins, Clock, Trophy, CheckCircle2, Lock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getFullGameId } from "@/lib/utils";
import { useLocation } from "wouter";
import CryptoChartModal from "./crypto-chart-modal";

interface TaskWithProgress {
  id: string;
  taskName: string;
  durationMinutes: number;
  betRequirement: string;
  coinReward: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userProgress: {
    betAccumulated: string;
    isCompleted: boolean;
    claimedAt: Date | null;
  } | null;
}

interface GameTimerProps {
  selectedRound: number;
  onRoundChange: (round: number) => void;
  currentGame?: any;
}

const GameTimer = memo(function GameTimer({ selectedRound, onRoundChange, currentGame }: GameTimerProps) {
  const { timeRemaining, progressPercent, initializeAudio } = useGameTimer(currentGame);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showBettingTasks, setShowBettingTasks] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [showCryptoChart, setShowCryptoChart] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: tasks = [] } = useQuery<TaskWithProgress[]>({
    queryKey: ['/api/betting-tasks'],
    enabled: showBettingTasks,
  });

  const claimMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('POST', `/api/betting-tasks/${taskId}/claim`);
      return await response.json();
    },
    onMutate: (taskId: string) => {
      // Set claiming state synchronously before the mutation starts
      setClaimingTaskId(taskId);
    },
    onSuccess: async (data: any) => {
      setClaimingTaskId(null);
      toast({
        title: "Reward Claimed!",
        description: `You received ${data.reward} coins`,
      });
      // Refetch queries immediately to update balance
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/user/current'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/betting-tasks'] }),
      ]);
    },
    onError: (error: any) => {
      setClaimingTaskId(null);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always clear claiming state when mutation completes
      setClaimingTaskId(null);
    },
  });

  const getDurationLabel = (minutes: number) => {
    if (minutes === 1) return "1Min";
    if (minutes === 3) return "3Min";
    if (minutes === 5) return "5Min";
    if (minutes === 10) return "10Min";
    return `${minutes}Min`;
  };

  const getDurationColor = (minutes: number) => {
    if (minutes === 1) return "from-blue-500 to-blue-600";
    if (minutes === 3) return "from-green-500 to-green-600";
    if (minutes === 5) return "from-purple-500 to-purple-600";
    if (minutes === 10) return "from-orange-500 to-orange-600";
    return "from-gray-500 to-gray-600";
  };

  const getProgress = (task: TaskWithProgress) => {
    if (!task.userProgress) return 0;
    const accumulated = parseFloat(task.userProgress.betAccumulated);
    const requirement = parseFloat(task.betRequirement);
    return Math.min((accumulated / requirement) * 100, 100);
  };

  const canClaim = (task: TaskWithProgress) => {
    if (!task.userProgress) return false;
    if (task.userProgress.isCompleted) return false;
    const accumulated = parseFloat(task.userProgress.betAccumulated);
    const requirement = parseFloat(task.betRequirement);
    return accumulated >= requirement;
  };

  const isClaimed = (task: TaskWithProgress) => {
    return task.userProgress?.isCompleted || false;
  };

  const handleRoundChange = async (round: number) => {
    if (isChanging || selectedRound === round) return;
    
    setIsChanging(true);
    try {
      await initializeAudio();
      onRoundChange(round);
    } finally {
      setTimeout(() => setIsChanging(false), 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, round: number) => {
    handleRoundChange(round);
  };

  const rounds = [1, 3, 5, 10];

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <CryptoChartModal open={showCryptoChart} onClose={() => setShowCryptoChart(false)} />
      
      <div className="space-y-3">
      {/* Game ID Display - Compact */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground">
          Game ID: <span className="font-mono" data-testid="text-game-id">
            {getFullGameId(currentGame?.gameId)}
          </span>
        </div>
      </div>
      

      {/* Game Selection Buttons - Mobile Optimized */}
      <div className="glass-card p-3">
        <div className="grid grid-cols-4 gap-2">
          {rounds.map((round) => (
            <button
              key={round}
              type="button"
              className={`py-3 px-2 rounded-lg font-bold text-xs transition-all transform active:scale-95 ${
                selectedRound === round
                  ? "golden-gradient text-black shadow-lg scale-105"
                  : "bg-muted text-white active:bg-secondary"
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onClick={() => handleRoundChange(round)}
              onTouchStart={(e) => handleTouchStart(e, round)}
              disabled={isChanging}
              data-testid={`button-round-${round}`}
              aria-pressed={selectedRound === round}
              aria-label={`Select ${round} minute game`}
            >
              Win Go<br/>{round}Min
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Timer Display - Prominent */}
      <div className="golden-gradient rounded-xl p-4 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 shimmer-effect opacity-30"></div>
        
        {/* Top Right Icons */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          {/* Betting Tasks Dialog */}
          <Dialog open={showBettingTasks} onOpenChange={setShowBettingTasks}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full bg-amber-500/90 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
                aria-label="View Betting Tasks"
                data-testid="button-betting-tasks"
              >
                <Trophy className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-dark max-w-md mx-auto text-white border-amber-400/30 max-h-[80vh] overflow-y-auto" aria-describedby="betting-tasks-description">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center text-amber-300 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Betting Tasks
                </DialogTitle>
              </DialogHeader>
              <div id="betting-tasks-description" className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No tasks available</p>
                    <p className="text-gray-500 text-sm mt-1">Check back later</p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const progress = getProgress(task);
                    const claimed = isClaimed(task);
                    const canClaimNow = canClaim(task);
                    const accumulated = task.userProgress?.betAccumulated || "0.00";
                    const durationColor = getDurationColor(task.durationMinutes);

                    return (
                      <div 
                        key={task.id} 
                        className={`bg-gray-800/50 border border-gray-700 rounded-lg p-3 ${
                          claimed ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded bg-gradient-to-r ${durationColor}`}>
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-white font-semibold text-sm">{task.taskName}</h4>
                              <p className="text-xs text-gray-400">
                                {getDurationLabel(task.durationMinutes)} • Bet ${task.betRequirement}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                              <Coins className="w-3 h-3 text-yellow-400" />
                              <span className="text-yellow-400 font-bold text-xs">
                                {task.coinReward}
                              </span>
                            </div>
                            {claimed && (
                              <div className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-[10px]">Claimed</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Progress</span>
                              <span className="text-gray-300">
                                ${accumulated} / ${task.betRequirement}
                              </span>
                            </div>
                            <Progress 
                              value={progress} 
                              className="h-1.5 bg-gray-700"
                            />
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {progress.toFixed(1)}% complete
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              if (canClaimNow && !claimed && claimingTaskId !== task.id) {
                                claimMutation.mutate(task.id);
                              }
                            }}
                            disabled={!canClaimNow || claimed || claimingTaskId === task.id}
                            size="sm"
                            className={`w-full text-xs ${
                              claimed 
                                ? 'bg-green-600 hover:bg-green-600 cursor-not-allowed' 
                                : canClaimNow 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                                : 'bg-gray-700 hover:bg-gray-700 cursor-not-allowed'
                            }`}
                          >
                            {claimingTaskId === task.id ? (
                              <span className="flex items-center gap-1">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Claiming...
                              </span>
                            ) : claimed ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Claimed
                              </span>
                            ) : canClaimNow ? (
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                Claim Reward
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Keep Betting
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-blue-300 font-semibold text-xs mb-1">How it works</h4>
                      <ul className="text-[11px] text-gray-300 space-y-0.5">
                        <li>• Bet on games matching task duration</li>
                        <li>• Amounts accumulate to the target</li>
                        <li>• Claim coins when complete</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* How to Play Button */}
          <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white/80 text-black hover:bg-white focus-visible:ring-2 focus-visible:ring-black/40"
                aria-label="How to Play"
                data-testid="button-how-to-play"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-dark max-w-md mx-auto text-white border-blue-400/30" aria-describedby="how-to-play-description">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center text-blue-300">How to Play Win Go</DialogTitle>
              </DialogHeader>
              <div id="how-to-play-description" className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-1">Choose Your Bet</h3>
                    <p className="text-white/80">Select colors (Green, Violet, Red) or numbers (0-9) to predict the next result.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Coins className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-1">Set Amount</h3>
                    <p className="text-white/80">Enter your bet amount and choose a multiplier (1x, 5x, 10x, etc.).</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-1">Wait for Result</h3>
                    <p className="text-white/80">Results are announced when the timer reaches 00:00. Winners are paid automatically.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-1">Winning Odds</h3>
                    <div className="text-white/80 space-y-1">
                      <p>• <span className="text-green-400">Green/Red:</span> 2.00x payout</p>
                      <p>• <span className="text-violet-400">Violet:</span> 4.50x payout</p>
                      <p>• <span className="text-blue-400">Numbers:</span> 9.00x payout</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-400/30">
                  <p className="text-xs text-blue-300 font-medium mb-1">💡 Pro Tip:</p>
                  <p className="text-xs text-white/80">Start with small amounts to learn the game. Good luck!</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="relative z-10">
          <div className="text-center mb-3">
            <span className="text-xs text-black font-medium">Time remaining</span>
          </div>
          <div className="text-black font-bold text-lg mb-2">
            Win Go {selectedRound}Min
          </div>
          <div className="text-5xl font-black text-black mb-3 drop-shadow-lg" data-testid="text-time-remaining">
            {formatTime(timeRemaining)}
          </div>
          <div className="text-xs text-black opacity-70 font-mono">
            {currentGame?.gameId || "----"}
          </div>
        </div>
        
        {/* Crypto Chart Icon - Bottom Left */}
        <div className="absolute bottom-2 left-2 z-20">
          <Button
            size="icon"
            onClick={() => setShowCryptoChart(true)}
            className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
            aria-label="View Live Charts"
            data-testid="button-open-crypto-charts"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
    </>
  );
});

export default GameTimer;
