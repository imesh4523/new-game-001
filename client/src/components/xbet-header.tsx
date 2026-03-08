import { Compact3XBetLogo } from "@/components/enhanced-3xbet-logo";
import { Button } from "@/components/ui/button";
import { usdToGoldCoins, formatGoldCoins } from "@/lib/currency";

interface XBetHeaderProps {
  user?: any;
}

export default function XBetHeader({ user }: XBetHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 glass-card ios-blur">
      {/* Left side - 3XBET Logo - Compact */}
      <div className="flex items-center">
        <Compact3XBetLogo className="scale-90" />
      </div>
      
      {/* Center - Compact Action Icons */}
      <div className="flex items-center gap-2">
        {/* Deposit Icon */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white p-2 icon-3d glass-button rounded-full transform-gpu ml-2" 
          data-testid="deposit-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2v10m0 0l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
        
        {/* Network Icon */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white p-2 icon-3d glass-button rounded-full transform-gpu" 
          data-testid="network-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
      </div>
      
      {/* Right side - Compact Balance Display */}
      <div className="flex items-center">
        <div className="glass-card rounded-full px-4 py-2 border border-yellow-400/40">
          <div className="flex items-center gap-2">
            {/* Coin Icon */}
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 rounded-full flex items-center justify-center">
              <span className="text-yellow-400 text-xs font-bold">🪙</span>
            </div>
            
            {/* Balance Amount */}
            <span className="text-white font-bold text-lg" data-testid="balance-amount">
              {user ? formatGoldCoins(usdToGoldCoins(user.balance || "0")) : "0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}