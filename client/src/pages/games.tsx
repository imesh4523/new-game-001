import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Home, 
  Activity, 
  Gift, 
  User,
  Gamepad2,
  Play,
  Trophy,
  Zap,
  Star,
  Coins,
  ArrowLeft,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Enhanced3XBetLogo from "@/components/enhanced-3xbet-logo";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

export default function GamesPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Get user data
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: demoUser } = useQuery<any>({
    queryKey: ['/api/user/demo'],
    enabled: !user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Get public settings to check if Wingo Mode is globally enabled
  const { data: publicSettings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ['/api/system-settings/public'],
  });

  const currentUser = user || demoUser;

  // Redirect to Wingo Mode if enabled (both globally and by user)
  useEffect(() => {
    if (!publicSettings || !user) return;
    const wingoModeGloballyEnabled = publicSettings.find(s => s.key === 'wingo_mode_enabled')?.value !== 'false';
    if (user.wingoMode && wingoModeGloballyEnabled) {
      setLocation('/wingo?modeon');
    }
  }, [user, publicSettings, setLocation]);

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/signup');
    }
  }, [user, setLocation]);

  // Games data - some are available, some coming soon
  const games = [
    {
      id: 1,
      title: "Wingo",
      description: "Predict the next color and win big rewards",
      icon: <Zap className="w-6 h-6" />,
      route: "/",
      difficulty: "Easy",
      minBet: 10,
      maxWin: "10x",
      comingSoon: false,
      requiresDeposit: false
    },
    {
      id: 2,
      title: "Head & Tail",
      description: "Flip the coin and predict head or tail",
      icon: <Coins className="w-6 h-6" />,
      route: "/coin-flip",
      difficulty: "Easy",
      minBet: 10,
      maxWin: "2x",
      comingSoon: false,
      requiresDeposit: false
    },
    {
      id: 3,
      title: "Number Guess",
      description: "Guess the lucky number for instant wins",
      icon: <Trophy className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 20,
      maxWin: "50x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 4,
      title: "Wheel of Fortune",
      description: "Spin the wheel and test your luck",
      icon: <Star className="w-6 h-6" />,
      route: "/game",
      difficulty: "Hard",
      minBet: 50,
      maxWin: "100x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 5,
      title: "Card Master",
      description: "Master the cards and claim victory",
      icon: <Coins className="w-6 h-6" />,
      route: "/game",
      difficulty: "Expert",
      minBet: 100,
      maxWin: "500x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 6,
      title: "Lucky Dice",
      description: "Roll the dice and multiply your rewards",
      icon: <Gamepad2 className="w-6 h-6" />,
      route: "/game",
      difficulty: "Easy",
      minBet: 10,
      maxWin: "6x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 7,
      title: "Dragon Tiger",
      description: "Bet on dragon or tiger and win instantly",
      icon: <TrendingUp className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 25,
      maxWin: "20x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 8,
      title: "Andar Bahar",
      description: "Classic Indian card game with big payouts",
      icon: <Star className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 30,
      maxWin: "25x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 9,
      title: "Teen Patti",
      description: "Popular 3-card poker game",
      icon: <Trophy className="w-6 h-6" />,
      route: "/game",
      difficulty: "Hard",
      minBet: 50,
      maxWin: "100x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 10,
      title: "Crash Game",
      description: "Cash out before the multiplier crashes",
      icon: <Zap className="w-6 h-6" />,
      route: "/crash",
      difficulty: "Expert",
      minBet: 100,
      maxWin: "1000x",
      comingSoon: false,
      requiresDeposit: false
    },
    {
      id: 11,
      title: "Mines",
      description: "Find gems and avoid the mines",
      icon: <Star className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 20,
      maxWin: "150x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 12,
      title: "Plinko",
      description: "Drop the ball and watch it bounce",
      icon: <Play className="w-6 h-6" />,
      route: "/game",
      difficulty: "Easy",
      minBet: 15,
      maxWin: "30x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 13,
      title: "Limbo",
      description: "Pick a target and test your luck",
      icon: <TrendingUp className="w-6 h-6" />,
      route: "/game",
      difficulty: "Hard",
      minBet: 40,
      maxWin: "500x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 14,
      title: "Aviator",
      description: "Fly high and cash out at the right time",
      icon: <Zap className="w-6 h-6" />,
      route: "/game",
      difficulty: "Expert",
      minBet: 75,
      maxWin: "2000x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 15,
      title: "Hi-Lo",
      description: "Guess if next card is higher or lower",
      icon: <Trophy className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 25,
      maxWin: "40x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 16,
      title: "Keno",
      description: "Pick your lucky numbers and win big",
      icon: <Star className="w-6 h-6" />,
      route: "/game",
      difficulty: "Medium",
      minBet: 30,
      maxWin: "200x",
      comingSoon: true,
      requiresDeposit: true
    },
    {
      id: 17,
      title: "Rocket Launch",
      description: "Ride the rocket to massive multipliers",
      icon: <Gamepad2 className="w-6 h-6" />,
      route: "/game",
      difficulty: "Hard",
      minBet: 60,
      maxWin: "1500x",
      comingSoon: true,
      requiresDeposit: true
    }
  ];

  const handleGameClick = (game: any) => {
    // Check if user has made first deposit
    const hasDeposited = currentUser && parseFloat(currentUser.totalDeposits || "0") > 0;
    
    // If game requires deposit and user hasn't deposited yet
    if (game.requiresDeposit && !hasDeposited) {
      toast({
        title: "Please Recharge",
        description: "Make your first deposit",
      });
      return;
    }
    
    // If game is coming soon (and user has deposited or it doesn't require deposit)
    if (game.comingSoon) {
      toast({
        title: "Coming Soon",
        description: `${game.title} will be available soon. Stay tuned!`,
      });
    } else {
      setLocation(game.route);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign up to view games.
          </p>
          <Button onClick={() => setLocation('/signup')}>
            Sign Up
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-4">
        <div className="flex flex-col items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="text-white hover:bg-white/10 self-start mb-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Enhanced3XBetLogo />
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Games
            </h1>
          </div>
          <p className="text-white/70">Choose your game and start winning!</p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-2">
          {games.map((game) => (
            <Card 
              key={game.id} 
              className="bg-black/30 backdrop-blur-md border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => handleGameClick(game)}
              data-testid={`game-card-${game.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                      {game.icon}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{game.title}</CardTitle>
                      <CardDescription className="text-white/60 text-sm">
                        {game.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-white/40" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-white/60">
                      Min Bet: <span className="text-white font-semibold">{game.minBet}</span>
                    </span>
                    <span className="text-white/60">
                      Max Win: <span className="text-green-400 font-semibold">{game.maxWin}</span>
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    game.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                    game.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    game.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {game.difficulty}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Message */}
        <div className="px-2 mb-6">
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm">
              More games will be available in the next update
            </p>
          </div>
        </div>
      </div>

      <BottomNav user={user} />
    </div>
  );
}