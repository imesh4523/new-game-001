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
                  className="grid gap-3 items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(8rem, auto) repeat(2, minmax(4rem, auto))' }}
                  data-testid={`card-bet-${bet.id}`}
                >
                  {/* Period */}
                  <span className="font-mono text-white/90 text-xs tabular-nums" title={bet.periodId || bet.gameId}>
                    {bet.periodId || bet.gameId || '----'}
                  </span>

                  {/* Bet Value */}
                  <div className="justify-self-end">
                    <Badge 
                      variant="outline" 
                      className={`text-xs border w-fit capitalize ${getBetValueColor(bet)}`}
                    >
                      {value}
                    </Badge>
                  </div>

                  {/* Bet Amount */}
                  <div className="text-right">
                    <p className="font-semibold text-white/90 text-sm">
                      {formatGoldCoins(usdToGoldCoins(bet.amount))}
                    </p>
                  </div>

                  {/* Potential Win */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <p className="font-semibold text-green-400 text-sm">
                        {formatGoldCoins(usdToGoldCoins(bet.potential))}
                      </p>
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
