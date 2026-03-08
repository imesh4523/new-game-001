import { Coins } from "lucide-react";

// Gold coin system: 100 gold coins = 1 USD
export const USD_TO_GOLD_RATE = 100;

/**
 * Convert USD amount to gold coins
 * @param usdAmount Amount in USD
 * @returns Amount in gold coins (whole numbers only)
 */
export function usdToGoldCoins(usdAmount: number | string): number {
  const amount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
  return Math.floor(amount * USD_TO_GOLD_RATE);
}

/**
 * Convert gold coins to USD
 * @param goldCoins Amount in gold coins
 * @returns Amount in USD
 */
export function goldCoinsToUsd(goldCoins: number | string): number {
  const amount = typeof goldCoins === 'string' ? parseFloat(goldCoins) : goldCoins;
  return Number((amount / USD_TO_GOLD_RATE).toFixed(2));
}

/**
 * Format gold coins with dollar sign for display (whole numbers only)
 * @param goldCoins Amount in gold coins
 * @param showIcon Whether to show the dollar icon
 * @returns JSX element with formatted gold coins
 */
export function formatGoldCoins(goldCoins: number | string, showIcon: boolean = true) {
  const amount = typeof goldCoins === 'string' ? parseFloat(goldCoins) : goldCoins;
  const wholeAmount = Math.floor(amount);
  const formattedAmount = wholeAmount.toLocaleString();
  
  if (showIcon) {
    return (
      <span className="inline-flex items-center gap-1 justify-center">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span>{formattedAmount}</span>
      </span>
    );
  }
  
  return <span>{formattedAmount}</span>;
}

/**
 * Format gold coins as text with coin symbol (whole numbers only)
 * @param goldCoins Amount in gold coins
 * @returns Formatted string with coin symbol
 */
export function formatGoldCoinsText(goldCoins: number | string): string {
  const amount = typeof goldCoins === 'string' ? parseFloat(goldCoins) : goldCoins;
  const wholeAmount = Math.floor(amount);
  return `🪙 ${wholeAmount.toLocaleString()}`;
}