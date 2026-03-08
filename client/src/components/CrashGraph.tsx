import React, { useRef, useEffect } from "react";
import type { GamePhase } from "@/hooks/useCrashGame";

interface CrashGraphProps {
  graphPoints: { x: number; y: number }[];
  multiplier: number;
  phase: GamePhase;
  crashPoint: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const PARTICLE_COLORS = ["#ef4444", "#f97316", "#eab308", "#fb923c", "#fbbf24", "#ff6b6b"];

const CrashGraph: React.FC<CrashGraphProps> = ({ graphPoints, multiplier, phase, crashPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const explosionTriggeredRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const rippleRef = useRef(0);

  // Reset explosion trigger when phase changes away from crashed
  useEffect(() => {
    if (phase !== "crashed") {
      explosionTriggeredRef.current = false;
      particlesRef.current = [];
      rippleRef.current = 0;
    }
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 30, right: 50, bottom: 35, left: 55 };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Starry background - more stars with twinkle
      const time = Date.now() * 0.001;
      for (let i = 0; i < 80; i++) {
        const sx = (Math.sin(i * 73.7) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 91.1) * 0.5 + 0.5) * h;
        const twinkle = Math.sin(time * 2 + i * 1.7) * 0.5 + 0.5;
        const alpha = 0.02 + twinkle * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.abs(Math.sin(i * 3.3) * 1.2) + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (graphPoints.length < 2) return;

      const maxX = Math.max(graphPoints[graphPoints.length - 1].x, 5);
      const maxY = Math.max(multiplier, 2) * 1.15;

      const toX = (x: number) => padding.left + (x / maxX) * (w - padding.left - padding.right);
      const toY = (y: number) => h - padding.bottom - ((y - 1) / (maxY - 1)) * (h - padding.top - padding.bottom);

      // Draw grid labels OUTSIDE clip area first
      // Y-axis labels
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const val = 1 + ((maxY - 1) / ySteps) * i;
        const y = toY(val);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "600 11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(1) + "x", padding.left - 8, y + 4);
      }

      // X-axis labels
      const xSteps = Math.max(3, Math.floor(maxX / 2));
      for (let i = 1; i <= xSteps; i++) {
        const val = (maxX / xSteps) * i;
        const x = toX(val);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "600 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(val.toFixed(0) + "s", x, h - padding.bottom + 14);
      }

      // Now clip the graph drawing area for lines, curve, rocket
      ctx.save();
      ctx.beginPath();
      ctx.rect(padding.left, padding.top, w - padding.left - padding.right, h - padding.top - padding.bottom);
      ctx.clip();

      // Grid lines (drawn inside clip)
      ctx.lineWidth = 1;
      for (let i = 0; i <= ySteps; i++) {
        const val = 1 + ((maxY - 1) / ySteps) * i;
        const y = toY(val);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (let i = 1; i <= xSteps; i++) {
        const val = (maxX / xSteps) * i;
        const x = toX(val);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, h - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const lineColor = phase === "crashed" ? "#ef4444" : "#22c55e";
      const glowColor = phase === "crashed" ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)";

      // Gradient fill under curve
      const gradient = ctx.createLinearGradient(0, toY(maxY), 0, toY(1));
      if (phase === "crashed") {
        gradient.addColorStop(0, "rgba(239,68,68,0.3)");
        gradient.addColorStop(1, "rgba(239,68,68,0.01)");
      } else {
        gradient.addColorStop(0, "rgba(34,197,94,0.35)");
        gradient.addColorStop(1, "rgba(34,197,94,0.01)");
      }

      ctx.beginPath();
      ctx.moveTo(toX(graphPoints[0].x), toY(graphPoints[0].y));
      for (let i = 1; i < graphPoints.length; i++) {
        ctx.lineTo(toX(graphPoints[i].x), toY(graphPoints[i].y));
      }
      const lastP = graphPoints[graphPoints.length - 1];
      ctx.lineTo(toX(lastP.x), toY(1));
      ctx.lineTo(toX(graphPoints[0].x), toY(1));
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Wider glow line
      ctx.beginPath();
      ctx.moveTo(toX(graphPoints[0].x), toY(graphPoints[0].y));
      for (let i = 1; i < graphPoints.length; i++) {
        ctx.lineTo(toX(graphPoints[i].x), toY(graphPoints[i].y));
      }
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(toX(graphPoints[0].x), toY(graphPoints[0].y));
      for (let i = 1; i < graphPoints.length; i++) {
        ctx.lineTo(toX(graphPoints[i].x), toY(graphPoints[i].y));
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Restore clip before drawing rocket/explosion so they can extend beyond graph edge
      ctx.restore();

      // Rocket / endpoint
      const px = Math.min(toX(lastP.x), w - padding.right);
      const py = toY(lastP.y);

      if (phase === "flying") {
        // Outer pulse ring
        const pulseSize = 20 + Math.sin(time * 4) * 6;
        ctx.beginPath();
        ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.1)";
        ctx.fill();

        // Middle glow
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.2)";
        ctx.fill();

        // Inner glow
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.35)";
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.fill();

        // BIG rocket emoji with float effect
        const floatY = Math.sin(time * 3) * 4;
        ctx.font = "34px serif";
        ctx.textAlign = "center";
        ctx.fillText("🚀", px + 22, py - 18 + floatY);

        // Trail particles behind rocket
        for (let i = 0; i < 3; i++) {
          const trailX = px - 8 + Math.random() * 16;
          const trailY = py + 10 + Math.random() * 12;
          const trailAlpha = 0.15 + Math.random() * 0.2;
          ctx.beginPath();
          ctx.arc(trailX, trailY, 2 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34,197,94,${trailAlpha})`;
          ctx.fill();
        }
      }

      // CRASH EXPLOSION
      if (phase === "crashed") {
        // Spawn particles once
        if (!explosionTriggeredRef.current) {
          explosionTriggeredRef.current = true;
          rippleRef.current = 0;
          const particles: Particle[] = [];
          for (let i = 0; i < 18; i++) {
            const angle = (Math.PI * 2 / 18) * i + Math.random() * 0.3;
            const speed = 2 + Math.random() * 4;
            particles.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              maxLife: 40 + Math.random() * 20,
              color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
              size: 2 + Math.random() * 4,
            });
          }
          particlesRef.current = particles;
        }

        // Update & draw particles
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= 1 / p.maxLife;

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();

          // Spark glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace(")", ",0.15)").replace("rgb(", "rgba(");
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Ripple rings
        rippleRef.current += 0.8;
        const ripple = rippleRef.current;
        if (ripple < 60) {
          for (let r = 0; r < 3; r++) {
            const ringSize = ripple * (1 + r * 0.5);
            const ringAlpha = Math.max(0, 0.4 - ringSize * 0.008);
            ctx.beginPath();
            ctx.arc(px, py, ringSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239,68,68,${ringAlpha})`;
            ctx.lineWidth = 2.5 - r * 0.5;
            ctx.stroke();
          }
        }

        // Central explosion glow
        const glowAlpha = Math.max(0, 0.3 - ripple * 0.005);
        ctx.beginPath();
        ctx.arc(px, py, 25, 0, Math.PI * 2);
        const explosionGrad = ctx.createRadialGradient(px, py, 0, px, py, 25);
        explosionGrad.addColorStop(0, `rgba(239,68,68,${glowAlpha})`);
        explosionGrad.addColorStop(1, "rgba(239,68,68,0)");
        ctx.fillStyle = explosionGrad;
        ctx.fill();

        // Big explosion emoji
        ctx.font = "42px serif";
        ctx.textAlign = "center";
        const emojiAlpha = Math.max(0, 1 - ripple * 0.015);
        ctx.globalAlpha = emojiAlpha;
        ctx.fillText("💥", px, py + 12);
        ctx.globalAlpha = 1;
      }

      // (clip already restored above before rocket/explosion drawing)

      // Continue animating if particles exist or phase is flying/crashed
      if (phase === "flying" || (phase === "crashed" && (particlesRef.current.length > 0 || rippleRef.current < 60))) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [graphPoints, multiplier, phase]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
};

export default CrashGraph;
