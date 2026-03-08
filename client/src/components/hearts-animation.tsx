import { useEffect, useState } from 'react';

interface Heart {
  id: number;
  left: number;
  animationDuration: number;
  size: number;
  delay: number;
  opacity: number;
  swayAmount: number;
  rotateDirection: number;
}

const HeartSVG = ({ size, opacity }: { size: number; opacity: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ opacity, filter: `drop-shadow(0 0 ${size/3}px rgba(255, 105, 180, 0.8)) drop-shadow(0 0 ${size/2}px rgba(255, 20, 147, 0.5))` }}
  >
    <defs>
      <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF6B9D" />
        <stop offset="30%" stopColor="#FF1493" />
        <stop offset="60%" stopColor="#E91E63" />
        <stop offset="100%" stopColor="#C2185B" />
      </linearGradient>
      <linearGradient id="heartShine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB6C1" stopOpacity="0.9" />
        <stop offset="40%" stopColor="#FF69B4" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FF1493" stopOpacity="0" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="url(#heartGradient)"
      filter="url(#glow)"
    />
    <path
      d="M7.5 5C5.5 5 4 6.5 4 8.5c0 1 .3 1.9.8 2.6C6 9 8 7.5 10 7c.5-.1 1-.2 1.5-.2-.8-1.1-2.2-1.8-4-1.8z"
      fill="url(#heartShine)"
      opacity="0.7"
    />
  </svg>
);

export function HeartsAnimation() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const heartElements: Heart[] = [];
    const heartCount = 25;

    for (let i = 0; i < heartCount; i++) {
      heartElements.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: Math.random() * 8 + 10,
        size: Math.random() * 8 + 8,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.4 + 0.5,
        swayAmount: Math.random() * 60 + 40,
        rotateDirection: Math.random() > 0.5 ? 1 : -1
      });
    }

    setHearts(heartElements);
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute top-0"
          style={{
            left: `${heart.left}%`,
            animation: `heartfall-${heart.id} ${heart.animationDuration}s ease-in-out infinite`,
            animationDelay: `${heart.delay}s`,
          }}
        >
          <HeartSVG size={heart.size} opacity={heart.opacity} />
        </div>
      ))}
      <style>{`
        ${hearts.map((heart) => `
          @keyframes heartfall-${heart.id} {
            0% {
              transform: translateY(-30px) translateX(0) scale(0.9) rotate(${-20 * heart.rotateDirection}deg);
              opacity: 0;
            }
            5% {
              opacity: 1;
            }
            15% {
              transform: translateY(12vh) translateX(${heart.swayAmount * heart.rotateDirection}px) scale(1) rotate(${25 * heart.rotateDirection}deg);
            }
            30% {
              transform: translateY(27vh) translateX(${-heart.swayAmount * 0.8 * heart.rotateDirection}px) scale(0.95) rotate(${-20 * heart.rotateDirection}deg);
            }
            45% {
              transform: translateY(42vh) translateX(${heart.swayAmount * 0.9 * heart.rotateDirection}px) scale(1) rotate(${18 * heart.rotateDirection}deg);
            }
            60% {
              transform: translateY(57vh) translateX(${-heart.swayAmount * 0.7 * heart.rotateDirection}px) scale(0.95) rotate(${-15 * heart.rotateDirection}deg);
            }
            75% {
              transform: translateY(72vh) translateX(${heart.swayAmount * 0.6 * heart.rotateDirection}px) scale(0.9) rotate(${12 * heart.rotateDirection}deg);
            }
            90% {
              transform: translateY(87vh) translateX(${-heart.swayAmount * 0.4 * heart.rotateDirection}px) scale(0.85) rotate(${-8 * heart.rotateDirection}deg);
              opacity: 0.7;
            }
            100% {
              transform: translateY(105vh) translateX(${heart.swayAmount * 0.2 * heart.rotateDirection}px) scale(0.8) rotate(${5 * heart.rotateDirection}deg);
              opacity: 0;
            }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
