import { useQuery } from "@tanstack/react-query";
import { cleanGameIdForDisplay } from "@/lib/utils";

export default function GameHistory() {
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ['/api/games/history'],
  });

  const getNumberColor = (num: number) => {
    if (num === 5) return "from-violet-500 to-violet-600";
    if ([1, 3, 7, 9].includes(num)) return "from-emerald-500 to-emerald-600";
    if (num === 0) return "from-violet-500 to-violet-600";
    return "from-red-500 to-red-600";
  };

  const getColorDot = (color: string) => {
    switch (color) {
      case "green": return "bg-emerald-500";
      case "violet": return "bg-violet-500";
      case "red": return "bg-red-500";
      default: return "bg-red-500"; // Default to red instead of gray
    }
  };

  const getResultColor = (num: number) => {
    if (num === 5) return "violet";
    if ([1, 3, 7, 9].includes(num)) return "green";
    if (num === 0) return "violet";
    return "red"; // 2, 4, 6, 8
  };

  const getNumberSize = (num: number) => {
    return num >= 5 ? "Big" : "Small";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-xl">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent"></div>
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Game History
          </h3>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/20" data-testid="button-view-all">
            View All
          </button>
        </div>
        
        {/* Header with glass effect */}
        <div className="grid grid-cols-4 gap-4 mb-4 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
          <span className="text-sm font-semibold text-white/80">Period</span>
          <span className="text-sm font-semibold text-white/80">Number</span>
          <span className="text-sm font-semibold text-white/80">Size</span>
          <span className="text-sm font-semibold text-white/80">Color</span>
        </div>
        
        {/* History items */}
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center text-white/60 py-8 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10" data-testid="text-no-history">
              <div className="text-4xl mb-2">📊</div>
              <p>No game history available</p>
            </div>
          ) : (
            history.map((game: any, index: number) => (
              <div 
                key={game.id} 
                className="grid grid-cols-4 gap-4 items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm border border-white/10 group" 
                data-testid={`row-history-${game.id}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="font-mono text-white/90 text-xs font-medium">
                  {cleanGameIdForDisplay(game.gameId) || "----"}
                </span>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getNumberColor(game.result)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/20 group-hover:scale-110 transition-transform duration-200`}>
                    {game.result}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white capitalize px-3 py-1 rounded-full bg-white/10 text-sm">
                    {game.resultSize || getNumberSize(game.result)}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className={`w-6 h-6 ${getColorDot(game.resultColor || getResultColor(game.result))} rounded-full shadow-lg ring-2 ring-white/30 group-hover:scale-110 transition-transform duration-200`}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
