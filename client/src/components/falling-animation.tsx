import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Particle {
  id: number;
  type: 'coin' | 'diamond' | 'gem' | 'star';
  left: number;
  animationDuration: number;
  animationDelay: number;
}

export default function FallingAnimation() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Skip creating particles on mobile to improve Android performance
    if (isMobile) {
      return;
    }

    const particleTypes: Particle['type'][] = ['coin', 'diamond', 'gem', 'star'];
    const initialParticles: Particle[] = [];

    const particleCount = 25;

    for (let i = 0; i < particleCount; i++) {
      initialParticles.push({
        id: i,
        type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 6,
        animationDelay: Math.random() * 10,
      });
    }

    setParticles(initialParticles);

    const interval = setInterval(() => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: Date.now() + i,
          type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
          left: Math.random() * 100,
          animationDuration: 8 + Math.random() * 6,
          animationDelay: Math.random() * 2,
        });
      }
      setParticles(newParticles);
    }, 15000);

    return () => clearInterval(interval);
  }, [isMobile]);

  // Disable on mobile/Android to improve performance - render null instead of early return to avoid hooks violation
  return !isMobile ? (
    <div className="falling-animation" data-testid="falling-animation">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`falling-particle falling-${particle.type}`}
          style={{
            left: `${particle.left}%`,
            animationDuration: `${particle.animationDuration}s`,
            animationDelay: `${particle.animationDelay}s`,
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
          }}
          data-testid={`particle-${particle.type}-${particle.id}`}
        />
      ))}
    </div>
  ) : null;
}