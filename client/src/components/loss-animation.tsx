import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, CloudRain, X } from "lucide-react";
import { formatGoldCoinsText, usdToGoldCoins } from "@/lib/currency";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface LossAnimationProps {
  lossAmount: number;
  onComplete?: () => void;
}

export default function LossAnimation({ lossAmount, onComplete }: LossAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(true);
  const isMobile = useIsMobile();

  const handleSkip = () => {
    setShowAnimation(false);
    if (onComplete) {
      setTimeout(onComplete, 100);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const betAmountWithoutFee = lossAmount / 1.03;
  const goldCoins = usdToGoldCoins(betAmountWithoutFee);

  const raindrops = useMemo(() =>
    Array(isMobile ? 6 : 25).fill(0).map((_, i) => ({
      id: `rain-${i}`,
      x: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth * 0.6 : 600),
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 0.5,
    })), [isMobile]
  );

  const dustParticles = useMemo(() =>
    Array(isMobile ? 5 : 20).fill(0).map((_, i) => ({
      id: `dust-${i}`,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      duration: 2 + Math.random() * 1,
      delay: Math.random() * 0.3,
    })), [isMobile]
  );

  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="loss-animation"
        >
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-[60] pointer-events-auto bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10"
            data-testid="button-skip-loss"
            aria-label="Skip loss animation"
          >
            <X className="w-6 h-6" />
          </Button>
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-red-900/20 via-gray-900/10 to-transparent"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {raindrops.map((drop) => (
            <motion.div
              key={drop.id}
              className="absolute"
              style={{
                left: '50%',
                top: '-5%',
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight * 1.1 : 1000,
                x: drop.x,
                opacity: [0, 0.6, 0.6, 0],
              }}
              transition={{
                duration: drop.duration,
                delay: drop.delay,
                ease: "easeIn",
              }}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-blue-400/80 to-blue-600/40 rounded-full" />
            </motion.div>
          ))}

          {dustParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full bg-gray-400/50"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                x: particle.x,
                y: particle.y,
                opacity: [1, 0.5, 0],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: "easeOut",
              }}
            />
          ))}

          <motion.div
            className="relative z-10 text-center px-8 py-10 rounded-3xl"
            style={isMobile ? {
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(127, 29, 29, 0.9) 50%, rgba(55, 65, 81, 0.9) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            } : {
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(127, 29, 29, 0.25) 50%, rgba(55, 65, 81, 0.25) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.1)',
            }}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: [0, 1.1, 1], 
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <TrendingDown className={`w-20 h-20 mx-auto mb-4 text-red-400 ${isMobile ? '' : 'drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`} />
            </motion.div>

            <motion.h2
              className="text-4xl font-bold mb-3 text-red-300"
              style={isMobile ? {} : {
                textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Better Luck Next Time
            </motion.h2>

            <motion.div
              className="text-5xl font-bold mb-2 text-red-200"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                opacity: 1,
              }}
              transition={{ 
                delay: 0.4,
                duration: 0.5,
              }}
            >
              - {formatGoldCoinsText(goldCoins)}
            </motion.div>

            <motion.p
              className="text-xl text-gray-300 font-medium mt-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={isMobile ? {} : {
                textShadow: '0 0 8px rgba(156, 163, 175, 0.3)',
              }}
            >
              Try again! 💪
            </motion.p>

            <motion.div
              className="absolute -top-4 -right-4"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <CloudRain className="w-10 h-10 text-blue-400/70" />
            </motion.div>

            <motion.div
              className="absolute -bottom-4 -left-4"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <X className="w-10 h-10 text-red-400/70" />
            </motion.div>
          </motion.div>

          {Array(isMobile ? 4 : 15).fill(0).map((_, i) => {
            const randomX = (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth * 0.7 : 700);
            const randomDelay = Math.random() * 2;
            return (
              <motion.div
                key={`falling-coin-${i}`}
                className="absolute w-5 h-5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%)',
                  boxShadow: '0 0 6px rgba(156, 163, 175, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  left: '50%',
                  top: '-10%',
                }}
                initial={{ y: 0, opacity: 0, scale: 0 }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 50 : 800,
                  opacity: [0, 0.8, 0.8, 0],
                  scale: [0, 1, 1, 0.5],
                  x: randomX,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2.5 + Math.random() * 1,
                  delay: randomDelay,
                  ease: "easeIn",
                }}
              >
                <div className="w-full h-full rounded-full flex items-center justify-center text-xs">
                  💔
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
