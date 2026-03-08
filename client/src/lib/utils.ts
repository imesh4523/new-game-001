import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanGameIdForDisplay(gameId?: string): string {
  if (!gameId) return "----";
  
  // Remove duration suffix (-1m, -3m, -5m, -10m) for display
  const cleanId = gameId.split('-')[0];
  
  // Show only last 4 digits with "..." prefix (for history)
  if (cleanId.length > 4) {
    return `...${cleanId.slice(-4)}`;
  }
  
  return cleanId;
}

export function getFullGameId(gameId?: string): string {
  if (!gameId) return "----";
  
  // Remove duration suffix (-1m, -3m, -5m, -10m) for display
  const cleanId = gameId.split('-')[0];
  
  // Show full game ID (for current game display)
  return cleanId;
}
