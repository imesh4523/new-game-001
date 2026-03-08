import { Home, Activity, Gamepad2, Gift, User } from "lucide-react";
import { useLocation } from "wouter";

interface BottomNavProps {
  user?: any;
}

export default function BottomNav({ user }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home", testId: "nav-home", requiresAuth: false },
    { path: "/activity", icon: Activity, label: "Activity", testId: "nav-activity", requiresAuth: true },
    { path: "/games", icon: Gamepad2, label: "Games", testId: "nav-games", requiresAuth: true },
    { path: "/promotions", icon: Gift, label: "Promotions", testId: "nav-promotions", requiresAuth: true },
    { path: "/account", icon: User, label: "Account", testId: "nav-account", requiresAuth: true },
  ];

  const handleNavClick = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      setLocation('/signup');
    } else {
      setLocation(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/10 via-cyan-500/5 to-transparent backdrop-blur-xl shadow-[0_-10px_40px_-10px_rgba(59,130,246,0.3)] z-50 safe-area-bottom">
      <div className="relative grid grid-cols-5 gap-1 px-2 py-1">
        {navItems.map(({ path, icon: Icon, label, testId, requiresAuth }, index) => {
          const isActive = location === path;
          const isCenterItem = index === 2;

          if (isCenterItem) {
            return (
              <div key={path} className="flex items-end justify-center">
                <button
                  onClick={() => handleNavClick(path, requiresAuth)}
                  className="relative flex flex-col items-center justify-center -mt-[68px]"
                  data-testid={testId}
                >
                  <div className={`
                    relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                    bg-gradient-to-br from-yellow-500/30 via-amber-600/40 to-yellow-700/30
                    backdrop-blur-xl border-2 border-yellow-500/50
                    shadow-[0_0_30px_rgba(234,179,8,0.4),0_0_60px_rgba(234,179,8,0.2),inset_0_0_30px_rgba(234,179,8,0.1)]
                    ${isActive 
                      ? "scale-110 shadow-[0_0_40px_rgba(234,179,8,0.6),0_0_80px_rgba(234,179,8,0.3),inset_0_0_40px_rgba(234,179,8,0.15)]" 
                      : ""
                    }
                    hover:scale-110 hover:shadow-[0_0_50px_rgba(234,179,8,0.7),0_0_100px_rgba(234,179,8,0.4)]
                  `}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-white/10 to-transparent" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-transparent via-transparent to-black/20" />
                    <Icon className={`
                      w-8 h-8 text-yellow-400 transition-all duration-300 relative z-10 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]
                      ${isActive ? "scale-110 text-yellow-300" : ""}
                    `} />
                  </div>
                  
                  <span className={`
                    text-[10px] font-medium mt-1 transition-all duration-300
                    ${isActive ? "text-yellow-500 font-semibold" : "text-gray-400"}
                  `}>
                    {label}
                  </span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={path}
              onClick={() => handleNavClick(path, requiresAuth)}
              className={`
                relative flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-300 ease-out
                ${
                  isActive
                    ? "text-yellow-500 scale-105"
                    : "text-gray-400 hover:text-gray-200 hover:scale-105"
                }
              `}
              data-testid={testId}
            >
              {isActive && (
                <div className="absolute inset-0 bg-yellow-500/10 rounded-xl blur-sm" />
              )}
              
              <div className={`
                relative p-2 rounded-lg transition-all duration-300
                ${isActive 
                  ? "bg-gradient-to-br from-yellow-500/20 to-amber-600/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]" 
                  : "bg-transparent"
                }
              `}>
                <Icon className={`
                  w-6 h-6 transition-all duration-300
                  ${isActive ? "drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" : ""}
                `} />
              </div>

              <span className={`
                text-[10px] font-medium transition-all duration-300
                ${isActive ? "font-semibold" : "font-normal"}
              `}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
