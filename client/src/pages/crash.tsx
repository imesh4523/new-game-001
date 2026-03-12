import React, { useState, useEffect, useRef } from "react";
import { useCrashGame } from "@/hooks/useCrashGame";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import CrashGraph from "@/components/CrashGraph";
import LiveBalance from "@/components/live-balance";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Users, Coins, Trophy, Plus, Minus, RotateCcw, History, FileText, Rocket, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { usdToGoldCoins, formatGoldCoinsText } from "@/lib/currency";

const QUICK_BETS = [100, 300, 900, 2000, 8000, 30000];
const MIN_BET = 50;
const MAX_BET = 10000;

const CrashGame: React.FC = () => {
  const { user } = useAuth();
  const { balanceUpdates } = useWebSocket();
  const {
    phase, multiplier, crashPoint, balance, currentBet, betAmount, setBetAmount,
    hasCashedOut, cashOutMultiplier, winAmount, bots, history, graphPoints,
    countdown, autoBet, setAutoBet, lastCrashes,
    placeBet, cashOut, addBalance,
  } = useCrashGame();

  const { playCountdownBeep, playRocketLaunch, playCashOut, playCrashExplosion } = useSoundEffects();
  const [activeTab, setActiveTab] = useState("game");
  const prevPhaseRef = useRef(phase);
  const prevCountdownRef = useRef(countdown);

  const [globalPlayers, setGlobalPlayers] = useState(13004);
  const [globalBetsUSD, setGlobalBetsUSD] = useState(15000);
  const [globalWinsUSD, setGlobalWinsUSD] = useState(0);

  // Sound effects based on game state changes
  useEffect(() => {
    // Countdown beeps
    if (phase === "countdown" && countdown !== prevCountdownRef.current) {
      playCountdownBeep(countdown === 1);
    }
    prevCountdownRef.current = countdown;
  }, [countdown, phase, playCountdownBeep]);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Rocket launch when flying starts
    if (phase === "flying" && prevPhase === "countdown") {
      playRocketLaunch();
    }

    // Crash explosion
    if (phase === "crashed" && prevPhase === "flying") {
      playCrashExplosion();
    }
  }, [phase, playRocketLaunch, playCrashExplosion]);

  useEffect(() => {
    if (phase === "waiting") {
      // Start with small number of players
      const initialPlayers = 200 + Math.floor(Math.random() * 150);
      setGlobalPlayers(initialPlayers);
      setGlobalBetsUSD(initialPlayers * (5 + Math.random() * 15)); // Reasonable average
      setGlobalWinsUSD(0);
      
      // Gradually increase during the 7s countdown
      const interval = setInterval(() => {
        setGlobalPlayers(prev => {
          const newPlayers = prev + Math.floor(Math.random() * 25);
          return Math.min(newPlayers, 1300); // Cap around 1300
        });
        setGlobalBetsUSD(prev => prev + (Math.random() * 400 + 100));
      }, 300); // update every 300ms
      
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "flying" && multiplier > 1) {
      // Simulate live random wins accumulating as multiplier goes up
      let simulatedWins = 0;
      
      if (multiplier < 1.6) {
        // Almost no wins before 1.6x
        simulatedWins = globalBetsUSD * 0.005 * (multiplier - 1);
      } else if (multiplier < 2.0) {
        // Slow ramp up between 1.6x and 2.0x
        const t = (multiplier - 1.6) / 0.4;
        simulatedWins = globalBetsUSD * (0.01 + 0.1 * t);
      } else {
        // After 2.0x, smooth graceful calculation based on total bet amount
        // Models players steadily cashing out
        const cashoutRate = 1 - Math.exp(-0.3 * (multiplier - 1.5));
        simulatedWins = globalBetsUSD * cashoutRate * (multiplier * 0.5);
      }
      
      setGlobalWinsUSD(simulatedWins);
    }
  }, [multiplier, phase, globalBetsUSD]);

  const totalBotsBet = bots.reduce((s, b) => s + b.bet, 0) + currentBet;
  const totalBotsWin = bots.filter(b => b.cashedOut).reduce((s, b) => s + (b.win || 0), 0) + (hasCashedOut ? winAmount : 0);
  const playerCount = bots.length + (currentBet > 0 ? 1 : 0);
  
  const displayTotalBets = globalBetsUSD + totalBotsBet;
  const displayTotalWins = globalWinsUSD + totalBotsWin;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Rocket className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-primary">3XBet</span>
            <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">Crash Game</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LiveBalance user={user} showTrend={false} balanceUpdates={balanceUpdates} className="-my-2" />
          <button
            onClick={addBalance}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-accent-foreground" />
          </button>
        </div>
      </header>

      {/* Last crashes strip */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar">
        {lastCrashes.slice(0, 15).map((c, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 animate-slide-badge ${
              c < 2 ? "bg-crash-red/20 text-crash-red" : "bg-crash-green/15 text-crash-green"
            }`}
          >
            {c.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "game" && (
          <div className="flex-1 flex flex-col px-4 pb-2">
            {/* Graph area */}
            <div className={`relative rounded-2xl overflow-hidden bg-crash-surface border border-border ${phase === "crashed" ? "animate-crash-shake" : ""}`} style={{ height: "320px" }}>
              <CrashGraph graphPoints={graphPoints} multiplier={multiplier} phase={phase} crashPoint={crashPoint} />

              {/* Overlay multiplier */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {phase === "countdown" && (
                  <div className="text-center">
                    <div className="text-6xl font-black tabular-nums text-crash-gold drop-shadow-lg">{countdown}</div>
                    <div className="text-sm mt-2 text-muted-foreground font-medium">Starting soon...</div>
                  </div>
                )}
                {phase === "flying" && (
                  <div className="text-7xl font-black tabular-nums text-crash-green drop-shadow-[0_0_40px_rgba(34,197,94,0.5)]">
                    {multiplier.toFixed(2)}x
                  </div>
                )}
                {phase === "crashed" && (
                  <div className="text-center">
                    <div className="text-6xl font-black tabular-nums text-crash-red drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                      {crashPoint.toFixed(2)}x
                    </div>
                    <div className="text-sm mt-2 font-bold text-crash-red/80 tracking-widest">CRASHED</div>
                  </div>
                )}
                {phase === "waiting" && (
                  <div className="text-base text-muted-foreground font-medium">Waiting for next round...</div>
                )}
              </div>

              {/* Win overlay */}
              {hasCashedOut && phase !== "waiting" && (
                <div className="absolute top-3 right-3 px-4 py-2 rounded-xl bg-crash-green/20 text-crash-green text-sm font-bold border border-crash-green/30 backdrop-blur-sm">
                  🎉 +{formatGoldCoinsText(usdToGoldCoins(winAmount))} @ {cashOutMultiplier.toFixed(2)}x
                </div>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex justify-between mt-3 text-xs px-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{(globalPlayers + playerCount).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="w-3.5 h-3.5" />
                <span>Bets: {formatGoldCoinsText(usdToGoldCoins(displayTotalBets))}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="w-3.5 h-3.5" />
                <span>Wins: {formatGoldCoinsText(usdToGoldCoins(displayTotalWins))}</span>
              </div>
            </div>

            {/* Betting controls */}
            <div className="mt-3 rounded-2xl p-4 bg-crash-surface border border-border">
              {/* Bet amount input */}
              <div className="flex items-center gap-1.5 mb-1">
                <button
                  onClick={() => setBetAmount(Math.max(MIN_BET, betAmount - 100))}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
                  disabled={currentBet > 0}
                >
                  <Minus className="w-4 h-4 text-secondary-foreground" />
                </button>
                <input
                  type="number"
                  value={betAmount}
                  min={MIN_BET}
                  max={MAX_BET}
                  onChange={(e) => setBetAmount(Math.max(MIN_BET, Math.min(MAX_BET, Number(e.target.value))))}
                  className={`flex-1 h-10 text-center font-bold text-lg bg-input rounded-xl border-0 outline-none focus:ring-2 ${
                    betAmount < MIN_BET ? 'text-red-400 focus:ring-red-500/50' : 'text-foreground focus:ring-primary/50'
                  }`}
                  disabled={currentBet > 0}
                />
                <button
                  onClick={() => setBetAmount(Math.min(MAX_BET, betAmount + 100))}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
                  disabled={currentBet > 0}
                >
                  <Plus className="w-4 h-4 text-secondary-foreground" />
                </button>
              </div>
              <div className="flex justify-between text-[10px] px-1 mb-3">
                <span className={betAmount < MIN_BET ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>
                  Min: {MIN_BET} coins
                </span>
                <span className="text-muted-foreground">Max: {MAX_BET.toLocaleString()} coins</span>
              </div>

              {/* x2 / 1/2 / reset */}
              <div className="flex gap-1.5 mb-3">
                <button
                  onClick={() => setBetAmount(Math.max(MIN_BET, Math.floor(betAmount / 2)))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground active:scale-95 transition-transform"
                  disabled={currentBet > 0}
                >
                  ½
                </button>
                <button
                  onClick={() => setBetAmount(Math.min(MAX_BET, betAmount * 2))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground active:scale-95 transition-transform"
                  disabled={currentBet > 0}
                >
                  x2
                </button>
                <button
                  onClick={() => setBetAmount(MIN_BET)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground active:scale-95 transition-transform"
                  disabled={currentBet > 0}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick bets */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {QUICK_BETS.map((qb) => (
                  <button
                    key={qb}
                    onClick={() => setBetAmount(qb)}
                    className="py-2 rounded-xl text-xs font-bold bg-crash-surface-light text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                    disabled={currentBet > 0}
                  >
                    {qb.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Auto bet toggle */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-muted-foreground font-medium">Auto Bet</span>
                <Switch checked={autoBet} onCheckedChange={setAutoBet} />
              </div>

              {/* Action button */}
              {currentBet > 0 && phase === "flying" && !hasCashedOut ? (
                <button
                  onClick={() => { cashOut(); playCashOut(); }}
                  className="w-full py-4 rounded-2xl font-black text-lg bg-accent text-accent-foreground active:scale-[0.97] transition-transform animate-pulse-glow"
                >
                  💰 Cash Out ({formatGoldCoinsText(usdToGoldCoins(currentBet * multiplier))})
                </button>
              ) : (
                <button
                  onClick={placeBet}
                  disabled={currentBet > 0 || betAmount < MIN_BET || betAmount > MAX_BET || betAmount > (user ? usdToGoldCoins(user.balance) : 0) || phase === "crashed"}
                  className="w-full py-4 rounded-2xl font-black text-lg bg-primary text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-40 shadow-lg shadow-primary/25"
                >
                  {currentBet > 0 ? "✓ Bet Placed" : "🎯 Place Bet"}
                </button>
              )}
            </div>

            {/* Leaderboard */}
            <div className="mt-3 rounded-2xl overflow-hidden bg-crash-surface border border-border">
              <div className="grid grid-cols-4 text-[11px] font-bold px-4 py-2.5 text-muted-foreground border-b border-border uppercase tracking-wider">
                <span>Player</span>
                <span className="text-right">Odds</span>
                <span className="text-right">Bet</span>
                <span className="text-right">Win</span>
              </div>
              <ScrollArea className="h-[200px]">
                {currentBet > 0 && (
                  <div className="grid grid-cols-4 text-xs px-4 py-2 font-semibold bg-crash-green/10 border-b border-border">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">Y</span>
                      <span className="text-crash-green">You</span>
                    </span>
                    <span className="text-right">{hasCashedOut ? cashOutMultiplier.toFixed(2) + "x" : "-"}</span>
                    <span className="text-right">{usdToGoldCoins(currentBet).toLocaleString()}</span>
                    <span className="text-right text-crash-green">
                      {hasCashedOut ? "+" + usdToGoldCoins(winAmount).toLocaleString() : "-"}
                    </span>
                  </div>
                )}
                {bots.map((bot) => (
                  <div key={bot.id} className={`grid grid-cols-4 text-xs px-4 py-2 border-b border-border/50 ${bot.cashedOut ? "bg-crash-green/5" : ""}`}>
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                        {bot.username[0]}
                      </span>
                      <span className="truncate text-muted-foreground">{bot.username}</span>
                    </span>
                    <span className="text-right text-muted-foreground">{bot.cashedOut ? bot.cashOutMultiplier?.toFixed(2) + "x" : "-"}</span>
                    <span className="text-right text-muted-foreground">{usdToGoldCoins(bot.bet).toLocaleString()}</span>
                    <span className={`text-right ${bot.cashedOut ? "text-crash-green font-semibold" : "text-muted-foreground/40"}`}>
                      {bot.cashedOut && bot.win ? "+" + usdToGoldCoins(bot.win).toLocaleString() : "-"}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex-1 px-4 pb-2 mt-3">
            <div className="rounded-2xl overflow-hidden bg-crash-surface border border-border">
              <div className="grid grid-cols-4 text-[11px] font-bold px-4 py-2.5 text-muted-foreground border-b border-border uppercase tracking-wider">
                <span>Crash</span>
                <span className="text-right">Bet</span>
                <span className="text-right">Odds</span>
                <span className="text-right">P/L</span>
              </div>
              <ScrollArea className="max-h-[500px]">
                {history.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">No bets yet</div>
                )}
                {history.map((h) => (
                  <div key={h.id} className="grid grid-cols-4 text-xs px-4 py-2.5 border-b border-border/50">
                    <span className={h.crashPoint < 2 ? "text-crash-red font-bold" : "text-crash-green font-bold"}>
                      {h.crashPoint.toFixed(2)}x
                    </span>
                    <span className="text-right text-muted-foreground">{usdToGoldCoins(h.bet).toLocaleString()}</span>
                    <span className="text-right text-muted-foreground">{h.cashedOut ? (h.cashOutMultiplier as number)?.toFixed(2) + "x" : "-"}</span>
                    <span className={`text-right font-semibold ${h.win > 0 ? "text-crash-green" : "text-crash-red"}`}>
                      {h.win > 0 ? "+" + usdToGoldCoins(h.win).toLocaleString() : "-" + usdToGoldCoins(h.bet).toLocaleString()}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        )}

        {activeTab === "tc" && (
          <div className="flex-1 px-4 pb-2 mt-3">
            <div className="rounded-2xl p-5 text-sm leading-relaxed space-y-3 bg-crash-surface border border-border">
              <h2 className="font-black text-lg">Terms & Conditions</h2>
              <p className="text-muted-foreground">This is a <strong className="text-foreground">demo/simulation game</strong> for entertainment purposes only. No real money is involved.</p>
              <p className="text-muted-foreground">• All currency shown is virtual coins with no real-world value.</p>
              <p className="text-muted-foreground">• Starting balance is 100,000 coins. Use the "+" button to reset.</p>
              <p className="text-muted-foreground">• The crash point is randomly generated each round.</p>
              <p className="text-muted-foreground">• Bot players are simulated for demonstration purposes.</p>
              <p className="text-muted-foreground">• Game history is stored locally in your browser.</p>
              <p className="text-muted-foreground">• This game does not promote or encourage real gambling.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="flex border-t border-border bg-crash-surface">
        {[
          { id: "game", icon: TrendingUp, label: "Game" },
          { id: "history", icon: History, label: "History" },
          { id: "tc", icon: FileText, label: "T&C" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[11px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default CrashGame;
