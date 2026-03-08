import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Star, X } from "lucide-react";
import { formatGoldCoinsText, usdToGoldCoins } from "@/lib/currency";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface WinCelebrationProps {
  winAmount: number;
  onComplete?: () => void;
}

export default function WinCelebration({ winAmount, onComplete }: WinCelebrationProps) {
  const [showFireworks, setShowFireworks] = useState(true);
  const isMobile = useIsMobile();

  const handleSkip = () => {
    setShowFireworks(false);
    if (onComplete) {
      setTimeout(onComplete, 100);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFireworks(false);
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const goldCoins = usdToGoldCoins(winAmount);

  const confettiParticles = useMemo(() => 
    Array(isMobile ? 8 : 30).fill(0).map((_, i) => ({
      id: `confetti-${i}`,
      color: ['#fbbf24', '#f59e0b', '#a855f7', '#ec4899', '#3b82f6'][i % 5],
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      rotate: Math.random() * 360,
      duration: 2 + Math.random() * 1,
    })), [isMobile]
  );

  const sparkParticles = useMemo(() =>
    Array(isMobile ? 5 : 20).fill(0).map((_, i) => ({
      id: `spark-${i}`,
      x: Math.cos((i / (isMobile ? 5 : 20)) * Math.PI * 2) * (200 + Math.random() * 200),
      y: Math.sin((i / (isMobile ? 5 : 20)) * Math.PI * 2) * (200 + Math.random() * 200),
      duration: 1.5 + Math.random() * 0.5,
      delay: Math.random() * 0.3,
    })), [isMobile]
  );

  const sparkleParticles = useMemo(() =>
    Array(isMobile ? 4 : 15).fill(0).map((_, i) => ({
      id: `sparkle-${i}`,
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 600,
      duration: 2 + Math.random() * 1,
      delay: Math.random() * 0.5,
    })), [isMobile]
  );

  const coinParticles = useMemo(() =>
    Array(isMobile ? 10 : 50).fill(0).map((_, i) => ({
      id: `coin-${i}`,
      x: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth * 0.8 : 800),
      rotate: Math.random() * 720,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    })), [isMobile]
  );

  return (
    <AnimatePresence>
      {showFireworks && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="win-celebration"
        >
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-[60] pointer-events-auto bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10"
            data-testid="button-skip-celebration"
            aria-label="Skip celebration animation"
          >
            <X className="w-6 h-6" />
          </Button>
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-purple-500/10 to-transparent"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: particle.color,
                left: `${50}%`,
                top: `${50}%`,
              }}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0.5],
                x: particle.x,
                y: particle.y,
                opacity: [1, 1, 0],
                rotate: particle.rotate,
              }}
              transition={{
                duration: particle.duration,
                ease: "easeOut",
              }}
            />
          ))}

          {sparkParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${50}%`,
                top: `${50}%`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                x: particle.x,
                y: particle.y,
                opacity: [1, 0.8, 0],
              }}
              transition={{
                duration: particle.duration,
                ease: "easeOut",
                delay: particle.delay,
              }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}

          {sparkleParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${50}%`,
                top: `${50}%`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                x: particle.x,
                y: particle.y,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                ease: "easeOut",
                delay: particle.delay,
              }}
            >
              <Sparkles className="w-6 h-6 text-purple-400 fill-purple-400" />
            </motion.div>
          ))}

          <motion.div
            className="relative z-10 text-center px-8 py-12 rounded-3xl"
            style={isMobile ? {
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.9) 50%, rgba(168, 85, 247, 0.9) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.8)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            } : {
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.3) 50%, rgba(168, 85, 247, 0.3) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(251, 191, 36, 0.5)',
              boxShadow: '0 0 60px rgba(251, 191, 36, 0.4), inset 0 0 40px rgba(255, 255, 255, 0.1)',
            }}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1], 
              rotate: [- 180, 10, 0],
              opacity: 1,
            }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Trophy className={`w-24 h-24 mx-auto mb-4 text-yellow-400 fill-yellow-400 ${isMobile ? '' : 'drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]'}`} />
            </motion.div>

            <motion.h2
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent"
              style={isMobile ? {} : {
                textShadow: '0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.4)',
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              🎉 YOU WON! 🎉
            </motion.h2>

            <motion.div
              className="text-6xl font-extrabold mb-2"
              style={isMobile ? {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              } : {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(251, 191, 36, 0.6)',
                filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.3, 1],
                opacity: 1,
              }}
              transition={{ 
                delay: 0.5,
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {formatGoldCoinsText(goldCoins)}
            </motion.div>

            <motion.p
              className="text-2xl text-yellow-200 font-semibold"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={isMobile ? {} : {
                textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              }}
            >
              Congratulations! 🎊
            </motion.p>

            <motion.div
              className="absolute -top-6 -right-6"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Sparkles className="w-12 h-12 text-purple-400 fill-purple-400" />
            </motion.div>

            <motion.div
              className="absolute -bottom-6 -left-6"
              animate={{
                rotate: [360, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Sparkles className="w-12 h-12 text-pink-400 fill-pink-400" />
            </motion.div>
          </motion.div>

          {coinParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-6 h-6 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #b45309 100%)',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                left: '50%',
                top: '-20%',
              }}
              initial={{ y: 0, opacity: 0, scale: 0 }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5],
                x: particle.x,
                rotate: particle.rotate,
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: "easeIn",
              }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-amber-900">
                🪙
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
