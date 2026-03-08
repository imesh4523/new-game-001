import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SUBSCRIPTION_SUCCESS_SHOWN_KEY = "push-subscription-success-shown";
const BANNER_DISMISSED_KEY = "push-notification-banner-dismissed";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIOSNonPWA, setIsIOSNonPWA] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    // Safari iOS doesn't expose PushManager on window, only through ServiceWorkerRegistration
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        setIsSupported(false);
        return;
      }

      // Check for iOS Safari specific requirements
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                 (window.navigator as any).standalone === true;

      // iOS requires PWA to be installed (standalone mode) for push notifications
      if (isIOS && !isInStandaloneMode) {
        console.log('[Push] iOS detected but not in standalone mode - push not supported');
        setIsSupported(false);
        setIsIOSNonPWA(true);
        return;
      } else {
        setIsIOSNonPWA(false);
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const supported = !!registration.pushManager;
        setIsSupported(supported);
        
        if (supported) {
          setPermission(Notification.permission);
          await checkSubscription();
        }
      } catch (error) {
        console.error('[Push] Error checking support:', error);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive"
      });
      return false;
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission if not already granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast({
            title: "Permission Denied",
            description: "Please allow notifications to receive updates",
            variant: "destructive"
          });
          setIsLoading(false);
          return false;
        }
      }

      console.log('[Push] Fetching VAPID public key...');
      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-public-key');
      if (!response.ok) {
        throw new Error('Failed to fetch VAPID public key');
      }
      const { publicKey } = await response.json();
      console.log('[Push] VAPID key received');

      console.log('[Push] Waiting for service worker...');
      // Subscribe to push notifications with longer timeout (30 seconds)
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker timeout')), 30000)
        )
      ]);
      console.log('[Push] Service worker ready');

      console.log('[Push] Creating push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      console.log('[Push] Push subscription created');

      // Send subscription to server
      console.log('[Push] Sending subscription to server...');
      const subscriptionObject = subscription.toJSON();
      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionObject.keys!.p256dh,
          auth: subscriptionObject.keys!.auth
        }
      });
      console.log('[Push] Subscription saved to server');

      setIsSubscribed(true);
      
      try {
        const hasShownSuccess = localStorage.getItem(SUBSCRIPTION_SUCCESS_SHOWN_KEY);
        if (!hasShownSuccess) {
          toast({
            title: "Subscribed",
            description: "You will now receive push notifications",
          });
          localStorage.setItem(SUBSCRIPTION_SUCCESS_SHOWN_KEY, "true");
        }
      } catch (error) {
        console.error("Failed to check/save subscription success flag:", error);
      }
      
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('[Push] Error subscribing to push notifications:', error);
      console.error('[Push] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = "Failed to subscribe to push notifications";
      let shouldRetry = false;
      
      if (error.message === 'Service worker timeout') {
        errorMessage = "Service worker took too long to start. Try refreshing the page.";
        shouldRetry = true;
      } else if (error.message?.includes('VAPID') || error.message?.includes('fetch')) {
        errorMessage = "Network issue. Check your connection and try again.";
        shouldRetry = true;
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Notifications are blocked. Allow them in your browser settings.";
        shouldRetry = false;
      } else if (error.name === 'AbortError' || error.message?.includes('abort')) {
        errorMessage = "Subscription was cancelled. Please try again.";
        shouldRetry = true;
      } else if (error.message?.includes('subscribe') || error.message?.includes('registration')) {
        errorMessage = "Browser couldn't register for notifications. Try again later.";
        shouldRetry = true;
      }
      
      toast({
        title: "Subscription Error",
        description: errorMessage + (shouldRetry ? " (Auto-retry in 1 minute)" : ""),
        variant: "destructive"
      });
      setIsLoading(false);
      return false;
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await apiRequest('POST', '/api/push/unsubscribe', {
          endpoint: subscription.endpoint
        });
        
        setIsSubscribed(false);
        
        try {
          localStorage.removeItem(SUBSCRIPTION_SUCCESS_SHOWN_KEY);
          localStorage.removeItem(BANNER_DISMISSED_KEY);
        } catch (error) {
          console.error("Failed to remove subscription flags:", error);
        }
        
        toast({
          title: "Unsubscribed",
          description: "You will no longer receive push notifications",
        });
      }
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Unsubscribe Error",
        description: "Failed to unsubscribe from push notifications",
        variant: "destructive"
      });
      setIsLoading(false);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    isIOSNonPWA,
    requestPermission,
    subscribe,
    unsubscribe
  };
}
