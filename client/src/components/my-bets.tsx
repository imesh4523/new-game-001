import { useQuery } from "@tanstack/react-query";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";
import { cleanGameIdForDisplay } from "@/lib/utils";
import { Gamepad2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MyBets() {
  const { data: activeBets = [] } = useQuery<any[]>({
    queryKey: ['/api/bets/user/active'],
  });

  const getBetTypeDisplay = (bet: any) => {
    if (bet.betType === "color") {
      return { type: "Color", value: bet.betValue };
    } else if (bet.betType === "number") {
      return { type: "Number", value: bet.betValue };
    } else if (bet.betType === "size") {
      return { type: "Size", value: bet.betValue };
    }
    return { type: "Unknown", value: "-" };
  };

  const getBetValueColor = (bet: any) => {
    if (bet.betType === "color") {
      if (bet.betValue === "green") return "text-green-400 border-green-400/30 bg-green-400/10";
      if (bet.betValue === "red") return "text-red-400 border-red-400/30 bg-red-400/10";
      if (bet.betValue === "violet") return "text-purple-400 border-purple-400/30 bg-purple-400/10";
    } else if (bet.betType === "size") {
      if (bet.betValue === "big") return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      if (bet.betValue === "small") return "text-orange-400 border-orange-400/30 bg-orange-400/10";
    } else if (bet.betType === "number") {
      const num = parseInt(bet.betValue);
      if ([0, 5].includes(num)) return "text-purple-400 border-purple-400/30 bg-purple-400/10";
      if ([1, 3, 7, 9].includes(num)) return "text-green-400 border-green-400/30 bg-green-400/10";
      return "text-red-400 border-red-400/30 bg-red-400/10";
    }
    return "text-white/80 border-white/20 bg-white/10";
  };

  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Gamepad2 className="w-5 h-5" />
          My Active Bets
        </CardTitle>
        <CardDescription className="text-white/60">
          Current pending bets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeBets.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active bets</p>
            <p className="text-sm mt-1">Place a bet to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="grid gap-3 mb-3 p-2 rounded-lg bg-white/5 text-xs font-semibold text-white/70" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(8rem, auto) repeat(2, minmax(4rem, auto))' }}>
              <span>Period</span>
              <span className="justify-self-end pr-3">Value</span>
              <span className="text-right">Bet</span>
              <span className="text-right">Win</span>
            </div>

            {/* Bet Rows */}
            {activeBets.map((bet: any) => {
              const { value } = getBetTypeDisplay(bet);
              return (
                <div 
                  key={bet.id}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group relative overflow-hidden"
                  data-testid={`card-bet-${bet.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 font-mono mb-1 uppercase tracking-wider">
                        Period ID
                      </span>
                      <span className="font-mono text-white/90 text-sm tabular-nums">
                        {bet.periodId || bet.gameId || '----'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 font-mono mb-1 uppercase tracking-wider block">
                        Prediction
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs border px-3 py-1 capitalize font-bold ${getBetValueColor(bet)} shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        {value}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/50 mb-1">Bet Amount</span>
                      <p className="font-bold text-white text-sm">
                        {formatGoldCoins(usdToGoldCoins(bet.amount))}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-white/50 mb-1">Potential Win</span>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                        <p className="font-bold text-green-400 text-sm">
                          {formatGoldCoins(usdToGoldCoins(bet.potential))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activeBets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
              <Clock className="w-4 h-4 animate-pulse" />
              <p>Results will be announced when the timer ends</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
