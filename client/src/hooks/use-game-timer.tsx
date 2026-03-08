import { useState, useEffect, useRef } from "react";
import { useAudioNotifications } from "./use-audio-notifications";

export function useGameTimer(game?: any) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const gameRef = useRef(game);
  const previousTimeRef = useRef<number>(0);
  const sevenSecondAlertTriggeredRef = useRef<string>("");
  
  const { playCountdownWarning, initializeAudio } = useAudioNotifications();

  // Keep a ref to the latest game data and reset state on game change
  useEffect(() => {
    gameRef.current = game;
    
    // Reset alert state when game changes
    const currentGameId = game?.gameId || game?.id;
    if (currentGameId && sevenSecondAlertTriggeredRef.current !== currentGameId) {
      previousTimeRef.current = 999; // Reset to high value to enable trigger detection
      sevenSecondAlertTriggeredRef.current = ""; // Clear previous game alert state
    }
    
    // Always reset on any game change (handles missing gameId cases)
    previousTimeRef.current = 999;
  }, [game]);

  useEffect(() => {
    if (!game) {
      setTimeRemaining(0);
      setProgressPercent(0);
      return;
    }

    const updateTimer = () => {
      const currentGame = gameRef.current;
      if (!currentGame) {
        setTimeRemaining(0);
        setProgressPercent(0);
        return;
      }

      // Validate roundDuration to prevent NaN
      const totalDuration = Number(currentGame.roundDuration) * 60;
      if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        if (import.meta.env.DEV) console.warn('Invalid roundDuration:', currentGame.roundDuration);
        setTimeRemaining(0);
        setProgressPercent(0);
        return;
      }

      let currentRemaining = 0;

      // Always calculate time from endTime for live updates
      if (currentGame.endTime) {
        const now = Date.now();
        const endTime = new Date(currentGame.endTime).getTime();
        currentRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        setTimeRemaining(currentRemaining);
        
        // Ensure progress calculation doesn't exceed bounds
        const elapsed = Math.min(totalDuration, Math.max(0, totalDuration - currentRemaining));
        setProgressPercent((elapsed / totalDuration) * 100);
      } else if (currentGame.timeRemaining !== undefined) {
        // Use WebSocket real-time value with validation
        currentRemaining = Math.max(0, Number(currentGame.timeRemaining));
        setTimeRemaining(currentRemaining);
        
        const elapsed = Math.min(totalDuration, Math.max(0, totalDuration - currentRemaining));
        setProgressPercent((elapsed / totalDuration) * 100);
      } else {
        // If no time data available, show default countdown
        currentRemaining = totalDuration;
        setTimeRemaining(currentRemaining);
        setProgressPercent(0);
      }

      // Check for 7-second countdown warning using threshold crossing (only trigger once per game)
      const gameId = currentGame.gameId || currentGame.id;
      if (gameId && previousTimeRef.current > 7 && currentRemaining <= 7 && currentRemaining > 0) {
        if (sevenSecondAlertTriggeredRef.current !== gameId) {
          sevenSecondAlertTriggeredRef.current = gameId;
          playCountdownWarning().catch(err => { if (import.meta.env.DEV) console.warn(err); });
        }
      }
      
      previousTimeRef.current = currentRemaining;
    };

    // Update immediately
    updateTimer();
    
    // Set up interval for live updates every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [game?.gameId, game?.endTime, game?.status]); // Only depend on key identifiers

  return {
    timeRemaining,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    initializeAudio,
  };
}
