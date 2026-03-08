import { useRef, useCallback } from "react";

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playBeep = useCallback((frequency: number, duration: number, volume = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [getCtx]);

  // Countdown beep - short high-pitched beep
  const playCountdownBeep = useCallback((isLast: boolean) => {
    playBeep(isLast ? 880 : 600, isLast ? 0.3 : 0.15, isLast ? 0.2 : 0.12);
  }, [playBeep]);

  // Rocket launch whoosh - noise-based
  const playRocketLaunch = useCallback(() => {
    try {
      const ctx = getCtx();
      const duration = 0.6;

      // White noise for whoosh
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for whoosh character
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + duration);
      filter.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + duration);

      // Rising tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration);
      oscGain.gain.setValueAtTime(0.06, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [getCtx]);

  // Cash out "ching" sound - coin/bell sound
  const playCashOut = useCallback(() => {
    try {
      const ctx = getCtx();
      
      // High metallic ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 1200;
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Second harmonic for "ching" character
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 2400;
      gain2.gain.setValueAtTime(0.1, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);

      // Third harmonic
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.value = 3600;
      gain3.gain.setValueAtTime(0.05, ctx.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start();
      osc3.stop(ctx.currentTime + 0.2);

      // Second ching delayed
      setTimeout(() => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 1500;
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.3);
      }, 120);
    } catch {}
  }, [getCtx]);

  // Crash explosion sound - low rumble + noise burst
  const playCrashExplosion = useCallback(() => {
    try {
      const ctx = getCtx();
      const duration = 0.8;

      // Low frequency rumble
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);
      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      // Noise burst for explosion
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (ctx.sampleRate * 0.15));
        data[i] = (Math.random() * 2 - 1) * decay;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + duration);

      // Impact thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(150, ctx.currentTime);
      thud.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      thudGain.gain.setValueAtTime(0.3, ctx.currentTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start();
      thud.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [getCtx]);

  return {
    playCountdownBeep,
    playRocketLaunch,
    playCashOut,
    playCrashExplosion,
  };
}
