import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  size: number;
  delay: number;
  opacity: number;
}

export function SnowAnimation() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const flakes: Snowflake[] = [];
    const flakeCount = 50;

    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: Math.random() * 3 + 5,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.6 + 0.4
      });
    }

    setSnowflakes(flakes);
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 text-white dark:text-blue-100"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.delay}s`
          }}
        >
          ❄
        </div>
      ))}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
