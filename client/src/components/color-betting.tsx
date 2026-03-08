import { memo, useCallback } from "react";
import { Leaf, Palette, Heart, Zap, Target, Sparkles } from "lucide-react";

interface ColorBettingProps {
  selectedColor: string | null;
  selectedNumber: number | null;
  onColorSelect: (color: string | null) => void;
  onNumberSelect: (number: number | null) => void;
}

const ColorBetting = memo(function ColorBetting({ 
  selectedColor, 
  selectedNumber, 
  onColorSelect, 
  onNumberSelect 
}: ColorBettingProps) {
  const getCasinoChipColor = useCallback((num: number) => {
    const colorMap = {
      0: { bg: "from-purple-500 via-violet-600 to-purple-700", border: "border-purple-400", accent: "from-purple-300 to-purple-500" },
      1: { bg: "from-emerald-500 via-green-600 to-emerald-700", border: "border-emerald-400", accent: "from-emerald-300 to-emerald-500" },
      2: { bg: "from-red-500 via-red-600 to-red-700", border: "border-red-400", accent: "from-red-300 to-red-500" },
      3: { bg: "from-emerald-500 via-green-600 to-emerald-700", border: "border-emerald-400", accent: "from-emerald-300 to-emerald-500" },
      4: { bg: "from-red-500 via-red-600 to-red-700", border: "border-red-400", accent: "from-red-300 to-red-500" },
      5: { bg: "from-purple-500 via-violet-600 to-purple-700", border: "border-purple-400", accent: "from-purple-300 to-purple-500" },
      6: { bg: "from-red-500 via-red-600 to-red-700", border: "border-red-400", accent: "from-red-300 to-red-500" },
      7: { bg: "from-emerald-500 via-green-600 to-emerald-700", border: "border-emerald-400", accent: "from-emerald-300 to-emerald-500" },
      8: { bg: "from-red-500 via-red-600 to-red-700", border: "border-red-400", accent: "from-red-300 to-red-500" },
      9: { bg: "from-emerald-500 via-green-600 to-emerald-700", border: "border-emerald-400", accent: "from-emerald-300 to-emerald-500" }
    };
    return colorMap[num as keyof typeof colorMap];
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    onColorSelect(color === selectedColor ? null : color);
  }, [selectedColor, onColorSelect]);

  const handleNumberSelect = useCallback((number: number) => {
    onNumberSelect(number === selectedNumber ? null : number);
  }, [selectedNumber, onNumberSelect]);

  return (
    <div className="glass-card-dark p-6">
      <div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button 
            className={`relative overflow-hidden py-8 px-4 rounded-3xl font-bold text-lg transition-transform duration-200 active:scale-95 ${
              selectedColor === "green" ? "ring-4 ring-yellow-400/80 scale-105" : ""
            }`}
            onClick={() => handleColorSelect("green")}
            data-testid="button-color-green"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-emerald-800/95 rounded-3xl"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <Leaf className="w-8 h-8 text-green-200 drop-shadow-lg" />
            </div>
            <div className="relative z-10 text-white pt-8">
              <div className="font-bold text-xl">Green</div>
              <div className="text-sm opacity-90 mt-2 font-semibold bg-green-700/70 rounded-full px-3 py-1">2.00x</div>
            </div>
            {selectedColor === "green" && (
              <div className="absolute inset-0 ring-4 ring-yellow-400/80 rounded-3xl animate-pulse"></div>
            )}
          </button>
          
          <button 
            className={`relative overflow-hidden py-8 px-4 rounded-3xl font-bold text-lg transition-transform duration-200 active:scale-95 ${
              selectedColor === "violet" ? "ring-4 ring-yellow-400/80 scale-105" : ""
            }`}
            onClick={() => handleColorSelect("violet")}
            data-testid="button-color-violet"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/90 to-purple-800/95 rounded-3xl"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <Sparkles className="w-8 h-8 text-violet-200 drop-shadow-lg" />
            </div>
            <div className="relative z-10 text-white pt-8">
              <div className="font-bold text-xl">Violet</div>
              <div className="text-sm opacity-90 mt-2 font-semibold bg-violet-700/70 rounded-full px-3 py-1">4.50x</div>
            </div>
            {selectedColor === "violet" && (
              <div className="absolute inset-0 ring-4 ring-yellow-400/80 rounded-3xl animate-pulse"></div>
            )}
          </button>
          
          <button 
            className={`relative overflow-hidden py-8 px-4 rounded-3xl font-bold text-lg transition-transform duration-200 active:scale-95 ${
              selectedColor === "red" ? "ring-4 ring-yellow-400/80 scale-105" : ""
            }`}
            onClick={() => handleColorSelect("red")}
            data-testid="button-color-red"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/90 to-red-800/95 rounded-3xl"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <Heart className="w-8 h-8 text-red-200 drop-shadow-lg" />
            </div>
            <div className="relative z-10 text-white pt-8">
              <div className="font-bold text-xl">Red</div>
              <div className="text-sm opacity-90 mt-2 font-semibold bg-red-700/70 rounded-full px-3 py-1">2.00x</div>
            </div>
            {selectedColor === "red" && (
              <div className="absolute inset-0 ring-4 ring-yellow-400/80 rounded-3xl animate-pulse"></div>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-4 justify-items-center">
          {Array.from({ length: 10 }, (_, i) => {
            const num = i;
            const chipColor = getCasinoChipColor(num);
            const isSelected = selectedNumber === num;
            return (
              <button
                key={i}
                className={`casino-chip-button relative w-18 h-18 rounded-full transition-transform duration-200 overflow-hidden active:scale-95 ${
                  isSelected ? "selected-casino-chip scale-110" : ""
                }`}
                onClick={() => handleNumberSelect(num)}
                data-testid={`button-number-${num}`}
              >
                <div className={`absolute inset-0 rounded-full border-4 ${chipColor.border} bg-gradient-to-br ${chipColor.bg}`}></div>
                <div className="absolute inset-1 rounded-full border-2 border-white/30"></div>
                <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${chipColor.accent} opacity-80`}></div>
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-gradient-to-b from-white/60 to-transparent rounded-full blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="relative z-20 text-xl font-black text-white casino-number-shadow">{num}</span>
                </div>
                {isSelected && (
                  <div className="absolute -inset-2 rounded-full border-3 border-yellow-400 animate-pulse"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ColorBetting;
