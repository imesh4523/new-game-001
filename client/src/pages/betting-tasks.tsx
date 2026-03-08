import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Coins, CheckCircle2, Lock, Zap, Target, Star, X, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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

const USDTIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 339.43 295.27" className={className} aria-label="USDT" width="20" height="20">
    <g>
      <path fill="#50AF95" d="M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,293.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z"/>
      <path fill="white" d="M191.19,144.8c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z"/>
    </g>
  </svg>
);

export default function BettingTasksPage() {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<TaskWithProgress | null>(null);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery<TaskWithProgress[]>({
    queryKey: ['/api/betting-tasks'],
  });

  const claimMutation = useMutation({
    mutationFn: async (taskId: string) => {
      console.log('[BettingTasks] Starting claim for task:', taskId);
      const response = await apiRequest('POST', `/api/betting-tasks/${taskId}/claim`);
      const result = await response.json();
      console.log('[BettingTasks] Claim response:', result);
      return result;
    },
    onMutate: (taskId: string) => {
      // Set claiming state synchronously before the mutation starts
      console.log('[BettingTasks] Setting claiming state for task:', taskId);
      setClaimingTaskId(taskId);
    },
    onSuccess: async (data: any) => {
      console.log('[BettingTasks] Claim successful, clearing state before refetch...');
      setClaimingTaskId(null);
      setSelectedTask(null);
      
      toast({
        title: "Reward Claimed!",
        description: `You received ${Math.floor(parseFloat(data.reward))} coins`,
      });
      
      // Refetch queries immediately to update balance
      console.log('[BettingTasks] Refetching queries to update balance...');
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/user/current'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/betting-tasks'] }),
      ]);
      console.log('[BettingTasks] Queries refetched, balance should be updated');
    },
    onError: (error: any) => {
      console.error('[BettingTasks] Claim failed:', error);
      setClaimingTaskId(null);
      
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always clear claiming state when mutation completes (success or error)
      console.log('[BettingTasks] Mutation settled, ensuring state is cleared');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div 
            className="rounded-full h-16 w-16 border-4 border-transparent border-t-yellow-400 border-r-purple-500 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <p className="text-purple-300 mt-4 font-semibold">Loading tasks...</p>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 pb-20 overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <motion.div 
          className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl"
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        ></motion.div>
        <motion.div 
          className="absolute top-40 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl"
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        ></motion.div>
        <motion.div 
          className="absolute bottom-20 left-1/3 w-96 h-96 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl"
          animate={{ 
            x: [0, 80, 0],
            y: [0, -80, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        ></motion.div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="mb-6"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur-lg opacity-60"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              ></motion.div>
              <div className="relative p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-2xl">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 text-transparent bg-clip-text drop-shadow-lg">
                Betting Tasks
              </h1>
              <p className="text-purple-300/80 text-sm mt-1 font-medium">Complete & earn rewards</p>
            </div>
          </div>
        </motion.div>

        {/* Tasks Cards */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-3xl blur-xl"></div>
                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-12 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Trophy className="w-20 h-20 text-purple-400/50 mx-auto mb-4" />
                  </motion.div>
                  <p className="text-white text-xl font-bold">No tasks available</p>
                  <p className="text-purple-300 text-sm mt-2">Check back soon for new challenges</p>
                </div>
              </div>
            </motion.div>
          ) : (
            tasks.map((task, index) => {
              const progress = getProgress(task);
              const claimed = isClaimed(task);
              const canClaimNow = canClaim(task);
              const accumulated = task.userProgress?.betAccumulated || "0.00";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedTask(task)}
                  data-testid={`task-card-${task.id}`}
                  className="cursor-pointer"
                >
                  <div className="relative group">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-purple-600/40 to-pink-600/40 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      animate={{ 
                        background: [
                          "linear-gradient(to right, rgb(37, 99, 235, 0.4), rgb(147, 51, 234, 0.4), rgb(219, 39, 119, 0.4))",
                          "linear-gradient(to right, rgb(219, 39, 119, 0.4), rgb(37, 99, 235, 0.4), rgb(147, 51, 234, 0.4))",
                          "linear-gradient(to right, rgb(147, 51, 234, 0.4), rgb(219, 39, 119, 0.4), rgb(37, 99, 235, 0.4))",
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    ></motion.div>
                    <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-purple-500/40 rounded-3xl p-6 shadow-2xl hover:border-purple-400/60 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <motion.div 
                            className="relative"
                            whileHover={{ scale: 1.15, rotate: 15 }}
                            animate={{ 
                              rotateY: [0, 360],
                            }}
                            transition={{ 
                              rotateY: { duration: 8, repeat: Infinity, ease: "linear" }
                            }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-2xl blur-lg opacity-60"
                              animate={{ 
                                scale: [1, 1.2, 1],
                                rotate: [0, 180, 360]
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            ></motion.div>
                            <div className="relative p-3 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-2xl shadow-2xl shadow-blue-500/50 border-2 border-white/20">
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              >
                                <Clock className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
                              </motion.div>
                            </div>
                          </motion.div>
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {getDurationLabel(task.durationMinutes)} • Bet ${parseFloat(task.betRequirement).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <motion.div 
                          className="relative"
                          whileHover={{ scale: 1.1 }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-md opacity-70"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          ></motion.div>
                          <div className="relative flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 rounded-full shadow-xl">
                            <USDTIcon className="w-5 h-5" />
                            <span className="text-white font-black text-lg">{Math.floor(parseFloat(task.coinReward))}</span>
                          </div>
                        </motion.div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-purple-300 font-semibold">Progress</span>
                            <span className="text-white font-bold">${parseFloat(accumulated).toFixed(2)} / ${parseFloat(task.betRequirement).toFixed(2)}</span>
                          </div>
                          <div className="relative h-2.5 bg-slate-700/60 rounded-full overflow-hidden shadow-inner">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                            >
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              ></motion.div>
                            </motion.div>
                          </div>
                          <p className="text-xs text-purple-300/80 mt-1 font-semibold">{progress.toFixed(1)}% complete</p>
                        </div>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canClaimNow && !claimed && claimingTaskId !== task.id) {
                              claimMutation.mutate(task.id);
                            }
                          }}
                          disabled={!canClaimNow || claimed || claimingTaskId === task.id}
                          className={`w-full py-6 font-bold text-base rounded-2xl transition-all duration-300 shadow-xl ${
                            claimed 
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white cursor-not-allowed' 
                              : canClaimNow 
                              ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-600 hover:via-orange-600 hover:to-pink-600 text-white shadow-orange-500/50' 
                              : 'bg-slate-700/80 text-slate-400 cursor-not-allowed'
                          }`}
                          data-testid={`button-claim-${task.id}`}
                        >
                          {claimingTaskId === task.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <motion.div
                                className="rounded-full h-5 w-5 border-2 border-transparent border-t-white"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              ></motion.div>
                              Claiming...
                            </span>
                          ) : claimed ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              Claimed
                            </span>
                          ) : canClaimNow ? (
                            <span className="flex items-center justify-center gap-2">
                              <TrendingUp className="w-5 h-5" />
                              Claim Reward
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Lock className="w-5 h-5" />
                              Keep Betting
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-xl"></div>
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Trophy className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg mb-3">How it works</h4>
                  <ul className="text-sm text-blue-200/90 space-y-2.5">
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      Bet on games matching task duration
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                      Amounts accumulate to the target
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div>
                      Claim coins when complete
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-purple-600/40 to-pink-600/40 rounded-3xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/50 rounded-3xl p-6 shadow-2xl">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-colors"
                  data-testid="button-close-modal"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Trophy className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-yellow-300">Betting Tasks</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-800/60 rounded-2xl p-5 border border-purple-500/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="relative"
                          animate={{ 
                            rotateY: [0, 360],
                          }}
                          transition={{ 
                            rotateY: { duration: 8, repeat: Infinity, ease: "linear" }
                          }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-xl blur-md opacity-50"
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 180, 360]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                          ></motion.div>
                          <div className="relative p-2.5 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-xl shadow-xl shadow-blue-500/40 border-2 border-white/20">
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            >
                              <Clock className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
                            </motion.div>
                          </div>
                        </motion.div>
                        <div>
                          <p className="text-white font-semibold">{getDurationLabel(selectedTask.durationMinutes)} • Bet ${parseFloat(selectedTask.betRequirement).toFixed(2)}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 rounded-full">
                          <USDTIcon className="w-5 h-5" />
                          <span className="text-white font-black">{Math.floor(parseFloat(selectedTask.coinReward))}</span>
                        </div>
                      </motion.div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-purple-300 font-semibold">Progress</span>
                          <span className="text-white font-bold">
                            ${parseFloat(selectedTask.userProgress?.betAccumulated || "0").toFixed(2)} / ${parseFloat(selectedTask.betRequirement).toFixed(2)}
                          </span>
                        </div>
                        <div className="relative h-3 bg-slate-700/60 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgress(selectedTask)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            ></motion.div>
                          </motion.div>
                        </div>
                        <p className="text-xs text-purple-300 mt-2 font-semibold">{getProgress(selectedTask).toFixed(1)}% complete</p>
                      </div>

                      <Button
                        onClick={() => {
                          if (canClaim(selectedTask) && !isClaimed(selectedTask) && claimingTaskId !== selectedTask.id) {
                            claimMutation.mutate(selectedTask.id);
                          }
                        }}
                        disabled={!canClaim(selectedTask) || isClaimed(selectedTask) || claimingTaskId === selectedTask.id}
                        className={`w-full py-6 font-bold text-lg rounded-2xl transition-all duration-300 ${
                          isClaimed(selectedTask)
                            ? 'bg-gradient-to-r from-green-600 to-green-700 cursor-not-allowed'
                            : canClaim(selectedTask)
                            ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-600 hover:via-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/50'
                            : 'bg-slate-700/80 cursor-not-allowed'
                        }`}
                        data-testid="button-modal-claim"
                      >
                        {claimingTaskId === selectedTask.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <motion.div
                              className="rounded-full h-5 w-5 border-2 border-transparent border-t-white"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            ></motion.div>
                            Claiming...
                          </span>
                        ) : isClaimed(selectedTask) ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-6 h-6" />
                            Claimed
                          </span>
                        ) : canClaim(selectedTask) ? (
                          <span className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-6 h-6" />
                            Claim Now
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Lock className="w-5 h-5" />
                            Keep Betting
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 rounded-2xl p-5 border border-blue-500/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Trophy className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">How it works</h4>
                        <ul className="text-sm text-blue-200 space-y-1.5">
                          <li>• Bet on games matching task duration</li>
                          <li>• Amounts accumulate to the target</li>
                          <li>• Claim coins when complete</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
