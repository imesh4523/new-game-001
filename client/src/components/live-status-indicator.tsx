import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Activity, Target, Radio } from "lucide-react";

interface LiveStatusIndicatorProps {
  compact?: boolean;
}

export default function LiveStatusIndicator({ compact = false }: LiveStatusIndicatorProps) {
  const { gameStates, connectionStatus } = useWebSocket();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for accurate remaining time calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const gameDurations = [1, 3, 5, 10]; // Order by priority for display

  const getGameStatus = (game: any) => {
    if (!game) return { status: "inactive", color: "secondary", timeRemaining: 0 };
    
    const now = currentTime.getTime();
    const endTime = new Date(game.endTime).getTime();
    const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
    
    if (game.status === "completed") {
      return { status: "completed", color: "destructive", timeRemaining: 0 };
    }
    
    if (game.status === "active" && timeRemaining > 0) {
      // Color coding based on time remaining
      if (timeRemaining > 60) {
        return { status: "active", color: "default", timeRemaining }; // Green for plenty of time
      } else if (timeRemaining > 30) {
        return { status: "ending", color: "warning", timeRemaining }; // Purple/violet for ending soon
      } else {
        return { status: "critical", color: "destructive", timeRemaining }; // Red for critical
      }
    }
    
    return { status: "inactive", color: "secondary", timeRemaining: 0 };
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeVariant = (color: string) => {
    switch (color) {
      case "default": return "default"; // Green
      case "warning": return "default"; // Purple - use default and override with custom class
      case "destructive": return "destructive"; // Red
      default: return "secondary";
    }
  };

  const getBadgeClassName = (color: string) => {
    switch (color) {
      case "default": return "bg-green-500 text-white hover:bg-green-600"; // Green styling
      case "warning": return "bg-purple-500 text-white hover:bg-purple-600"; // Purple styling
      case "destructive": return "bg-red-500 text-white hover:bg-red-600"; // Red styling
      default: return "bg-gray-500 text-white"; // Default gray for inactive
    }
  };

  const getStatusColor = (color: string) => {
    switch (color) {
      case "default": return "bg-green-500"; // Green
      case "warning": return "bg-purple-500"; // Purple
      case "destructive": return "bg-red-500"; // Red
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "ending": return "Ending";
      case "critical": return "Critical";
      case "completed": return "Completed";
      default: return "Inactive";
    }
  };

  if (compact) {
    // Live status indicator exactly like in the image
    return (
      <div className="glass-card px-4 py-2" data-testid="live-status-compact">
        <div className="flex items-center gap-1">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="text-white text-sm font-medium">Live:</span>
          
          {/* Game status indicators in exact format from image */}
          <div className="flex items-center gap-1 ml-2">
            {gameDurations.map((duration, index) => {
              const game = gameStates[duration];
              const { status, color, timeRemaining } = getGameStatus(game);
              
              return (
                <div key={duration} className="flex items-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${getStatusColor(color)}`}
                    data-testid={`status-dot-${duration}`}
                  />
                  <span className="text-white text-sm" data-testid={`status-text-${duration}`}>
                    {duration}m
                    {timeRemaining > 0 && status !== 'inactive' && (
                      <span className="ml-1">
                        {formatTime(timeRemaining)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Full view - card with detailed status
  return (
    <Card className="w-full" data-testid="live-status-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Active Games
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="ml-auto">
            {connectionStatus === 'connected' ? 'Live' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {gameDurations.map((duration) => {
          const game = gameStates[duration];
          const { status, color, timeRemaining } = getGameStatus(game);
          
          return (
            <div 
              key={duration} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              data-testid={`game-status-${duration}`}
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium" data-testid={`game-title-${duration}`}>
                    {duration} Minute Game
                  </p>
                  {game?.gameId && (
                    <p className="text-xs text-muted-foreground font-mono" data-testid={`game-id-${duration}`}>
                      Game ID: ...{game.gameId.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {timeRemaining > 0 && (
                  <span className="text-sm font-mono text-muted-foreground" data-testid={`time-remaining-${duration}`}>
                    {formatTime(timeRemaining)}
                  </span>
                )}
                <Badge 
                  variant={getStatusBadgeVariant(color)}
                  className={`min-w-[70px] justify-center ${getBadgeClassName(color)}`}
                  data-testid={`status-badge-${duration}`}
                >
                  {getStatusText(status)}
                </Badge>
              </div>
            </div>
          );
        })}
        
        {gameDurations.every(duration => !gameStates[duration] || gameStates[duration].status !== 'active') && (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active games currently running</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}