import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePushNotifications } from "./use-push-notifications";

const AUTO_SUBSCRIBE_ATTEMPTED_KEY = "push-auto-subscribe-attempted";
const AUTO_SUBSCRIBE_LAST_ATTEMPT_KEY = "push-auto-subscribe-last-attempt";

export function useAutoPushSubscribe() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscribe
  } = usePushNotifications();

  const getInitialAttempted = () => {
    try {
      return localStorage.getItem(AUTO_SUBSCRIBE_ATTEMPTED_KEY) === "true";
    } catch {
      return false;
    }
  };
  
  const getInitialLastAttempt = () => {
    try {
      const stored = localStorage.getItem(AUTO_SUBSCRIBE_LAST_ATTEMPT_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  const subscribeAttemptedRef = useRef(getInitialAttempted());
  const lastAttemptRef = useRef(getInitialLastAttempt());

  useEffect(() => {
    if (!user || !isSupported || isLoading || isSubscribed) {
      if (isSubscribed) {
        try {
          localStorage.setItem(AUTO_SUBSCRIBE_ATTEMPTED_KEY, "true");
        } catch (error) {
          console.error("Failed to save auto-subscribe attempted flag:", error);
        }
      }
      return;
    }

    const hasAttempted = subscribeAttemptedRef.current;
    const lastAttempt = lastAttemptRef.current;

    if (permission === 'granted' && !isSubscribed && !hasAttempted) {
      const now = Date.now();
      const timeSinceLastAttempt = now - lastAttempt;
      
      if (timeSinceLastAttempt < 60000) {
        console.log('[Push] Auto-subscribe rate limited - waiting 1 minute between attempts');
        return;
      }

      const attemptSubscribe = async () => {
        const attemptTime = Date.now();
        subscribeAttemptedRef.current = true;
        lastAttemptRef.current = attemptTime;
        
        try {
          localStorage.setItem(AUTO_SUBSCRIBE_ATTEMPTED_KEY, "true");
          localStorage.setItem(AUTO_SUBSCRIBE_LAST_ATTEMPT_KEY, attemptTime.toString());
        } catch (error) {
          console.error("Failed to save auto-subscribe attempt:", error);
        }
        
        try {
          const success = await subscribe();
          if (!success) {
            subscribeAttemptedRef.current = false;
            try {
              localStorage.setItem(AUTO_SUBSCRIBE_ATTEMPTED_KEY, "false");
            } catch (error) {
              console.error("Failed to reset auto-subscribe attempted flag:", error);
            }
          }
        } catch (error) {
          console.log('[Push] Auto-subscribe to already-granted push notifications failed:', error);
          subscribeAttemptedRef.current = false;
          try {
            localStorage.setItem(AUTO_SUBSCRIBE_ATTEMPTED_KEY, "false");
          } catch (storageError) {
            console.error("Failed to reset auto-subscribe attempted flag:", storageError);
          }
        }
      };

      const timer = setTimeout(() => {
        attemptSubscribe();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isLoading, isSubscribed, permission, subscribe]);

  return {
    isSubscribed,
    permission,
    isSupported
  };
}
