import { useState, useEffect } from "react";
import { Bell, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQuery } from "@tanstack/react-query";

const DISMISSED_KEY = "push-notification-banner-dismissed";

export default function PushNotificationBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  
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

  useEffect(() => {
    if (isSubscribed && !isDismissed) {
      handleDismiss();
    }
  }, [isSubscribed]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch (error) {
      console.error("Failed to save dismissed state:", error);
    }
    setIsDismissed(true);
  };

  if (!user || !isSupported || isSubscribed || isDismissed) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 shadow-lg">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                🔕 Notifications are blocked
              </p>
              <p className="text-xs opacity-90">
                Allow in browser settings: Address bar lock/info icon → Notifications → Allow
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="hover:bg-white/20"
              data-testid="button-dismiss-banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Bell className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              🔔 Not getting notifications? Click to enable!
            </p>
            <p className="text-xs opacity-90">
              Get win alerts, promotions and important updates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={subscribe}
            disabled={isLoading}
            size="sm"
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold whitespace-nowrap"
            data-testid="button-enable-notifications-banner"
          >
            {isLoading ? "Enabling..." : "Enable"}
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="hover:bg-white/20"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
