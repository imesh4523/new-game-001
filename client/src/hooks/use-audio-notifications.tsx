import { useRef, useCallback, useEffect } from "react";

interface AudioNotificationOptions {
  volume?: number;
  frequency?: number;
  duration?: number;
  type?: 'beep' | 'warning' | 'alert';
}

export function useAudioNotifications() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef(false);
  const globalListenerAddedRef = useRef(false);

  // Initialize audio context on first user interaction
  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Only set enabled if audio context is actually running
      const isRunning = audioContextRef.current.state === 'running';
      isEnabledRef.current = isRunning;
      return isRunning;
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to initialize audio context:', error);
      return false;
    }
  }, []);

  // Generate notification sound using Web Audio API
  const playNotification = useCallback(async (options: AudioNotificationOptions = {}) => {
    const {
      volume = 0.3,
      frequency = 800,
      duration = 200,
      type = 'alert'
    } = options;

    if (!audioContextRef.current || !isEnabledRef.current) {
      const initialized = await initializeAudio();
      if (!initialized) return;
    }

    try {
      const audioContext = audioContextRef.current!;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound based on type
      switch (type) {
        case 'warning':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + duration / 1000);
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          break;
        case 'beep':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          break;
      }

      oscillator.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);

    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to play notification sound:', error);
    }
  }, [initializeAudio]);

  // Play countdown warning (7 second alert)
  const playCountdownWarning = useCallback(async () => {
    if (!audioContextRef.current || !isEnabledRef.current) {
      return;
    }

    try {
      // Create a more pleasant bell-like sound
      const audioContext = audioContextRef.current;
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect oscillators with different frequencies for a richer sound
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Main tone
      oscillator1.frequency.setValueAtTime(660, audioContext.currentTime); // E note
      oscillator1.type = 'sine';
      
      // Harmonic for richness
      oscillator2.frequency.setValueAtTime(880, audioContext.currentTime); // A note (harmony)
      oscillator2.type = 'sine';
      
      // Volume envelope for smooth sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

      // Start and stop both oscillators
      const startTime = audioContext.currentTime;
      const stopTime = startTime + 0.8;
      
      oscillator1.start(startTime);
      oscillator2.start(startTime);
      oscillator1.stop(stopTime);
      oscillator2.stop(stopTime);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to play 7-second countdown warning:', error);
    }
  }, []);

  // Play urgent warning (final seconds)
  const playUrgentWarning = useCallback(async () => {
    await playNotification({
      volume: 0.5,
      frequency: 1200,
      duration: 400,
      type: 'alert'
    });
  }, [playNotification]);

  // Add global interaction listeners for audio initialization
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (!globalListenerAddedRef.current) {
      const handleUserInteraction = async () => {
        try {
          const success = await initializeAudio();
          if (success && audioContextRef.current?.state === 'running') {
            // Only remove listeners after successful initialization
            const events = ['click', 'touchstart', 'pointerdown', 'keydown'];
            events.forEach(event => {
              document.removeEventListener(event, handleUserInteraction);
            });
            globalListenerAddedRef.current = false;
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn('Failed to initialize audio on user interaction:', error);
        }
      };
      
      const events = ['click', 'touchstart', 'pointerdown', 'keydown'];
      events.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { passive: true });
      });
      globalListenerAddedRef.current = true;
      
      // Set up cleanup function
      cleanup = () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
        globalListenerAddedRef.current = false;
      };
    }
    
    return cleanup;
  }, [initializeAudio]);

  return {
    initializeAudio,
    playNotification,
    playCountdownWarning,
    playUrgentWarning,
    isEnabled: isEnabledRef.current
  };
}