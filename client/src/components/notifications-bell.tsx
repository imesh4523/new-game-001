import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";

export default function NotificationsBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: allNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", "/api/notifications/mark-read", { notificationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  const unreadCount = unreadNotifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
              data-testid="badge-unread-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-900 border-purple-500/20" align="end">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {allNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {allNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    !notification.isRead
                      ? "bg-purple-500/10 hover:bg-purple-500/20"
                      : "hover:bg-slate-800"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-white text-sm truncate">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.imageUrl && (
                        <img
                          src={notification.imageUrl}
                          alt="Notification"
                          className="mt-2 rounded-lg max-w-full h-auto"
                        />
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
