import { cn } from "@/lib/utils";

interface Enhanced3XBetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
}

export default function Enhanced3XBetLogo({ 
  size = 'md', 
  className,
  interactive = true 
}: Enhanced3XBetLogoProps) {
  const sizeClasses = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-9xl'
  };

  const containerSizeClasses = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8',
    xl: 'p-10'
  };

  return (
    <div 
      className={cn(
        "group relative inline-flex items-center justify-center",
        containerSizeClasses[size],
        interactive && "cursor-pointer",
        className
      )}
      role="img"
      aria-label="3XBET Logo"
      data-testid="enhanced-3xbet-logo"
    >
      {/* Main Logo Container with dark green background similar to reference */}
      <div className={cn(
        "relative flex items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-green-900 via-green-800 to-green-900",
        "shadow-2xl border border-green-700/30",
        interactive && "logo-3d-teal-container logo-3d-teal-main",
        containerSizeClasses[size]
      )}>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-green-700/20 to-transparent" />
        
        {/* Shimmer overlay */}
        <div className={cn(
          "absolute inset-0 rounded-2xl overflow-hidden",
          interactive && "shimmer-overlay-teal"
        )} />

        {/* Logo Text */}
        <div className="relative flex items-center gap-0.5">
          {/* "3X" with golden styling to match reference */}
          <div className="flex items-center">
            <span className={cn(
              sizeClasses[size],
              "font-black tracking-tight",
              "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600",
              "bg-clip-text text-transparent",
              "logo-text-3d-teal",
              "drop-shadow-lg",
              "relative z-10"
            )}>
              3
            </span>
            
            {/* Decorative golden "X" element similar to reference */}
            <div className="relative mx-0.5">
              <span className={cn(
                sizeClasses[size],
                "font-black tracking-tight",
                "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600",
                "bg-clip-text text-transparent", 
                "logo-text-3d-teal",
                "drop-shadow-lg",
                "relative z-10"
              )}>
                X
              </span>
              
            </div>
          </div>

          {/* "bet" in white to match reference */}
          <span className={cn(
            sizeClasses[size],
            "font-black tracking-tight",
            "text-white",
            "drop-shadow-lg",
            "relative z-10"
          )}>
            bet
          </span>
        </div>

        {/* Ambient glow effects */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-400/5 via-transparent to-yellow-400/5 pointer-events-none" />
        
        {/* Pulse effect when interactive */}
        {interactive && (
          <div className="absolute inset-0 rounded-2xl bg-green-400/10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Outer glow */}
      {interactive && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/20 to-yellow-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      )}
    </div>
  );
}

// Compact horizontal version for headers
export function Compact3XBetLogo({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-0.5 px-4 py-2.5",
        className
      )}
      role="img"
      aria-label="3XBET Logo - Compact"
      data-testid="compact-3xbet-logo"
    >
      {/* "3X" */}
      <span className="text-3xl font-black bg-gradient-to-br from-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
        3X
      </span>
      
      {/* "bet" */}
      <span className="text-3xl font-black text-white drop-shadow-sm">
        bet
      </span>
    </div>
  );
}