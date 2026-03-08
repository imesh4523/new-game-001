import { useEffect, useState, useLayoutEffect } from "react";
import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ChristmasModeWrapper } from "@/components/christmas-mode-wrapper";
import { useAutoPushSubscribe } from "@/hooks/use-auto-push-subscribe";
import { useAuth } from "@/hooks/use-auth";
import TelegramChatWidget from "@/components/telegram-chat-widget";
import HomePage from "@/pages/home";
import ActivityPage from "@/pages/activity";
import GamesPage from "@/pages/games";
import PromotionsPage from "@/pages/promotions";
import AccountPage from "@/pages/account";
import CoinFlipPage from "@/pages/coin-flip";
import WingoPage from "@/pages/wingo";
import CrashPage from "@/pages/crash";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ResetPassword from "@/pages/reset-password";
import AdminPage from "@/pages/admin";
import DepositPage from "@/pages/deposit";
import AgentDepositPage from "@/pages/agent-deposit";
import WithdrawalPage from "@/pages/withdrawal";
import BettingTasksPage from "@/pages/betting-tasks";
import LogoShowcase from "@/pages/logo-showcase";
import ImageEditor from "@/pages/image-editor";
import AgentLogin from "@/pages/agent-login";
import AgentDashboard from "@/pages/agent-dashboard";
import SecuritySettings from "@/pages/security-settings";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import NotFound from "@/pages/not-found";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        initData: string;
        initDataUnsafe: any;
      };
    };
  }
}

function AnimationPreferenceApplier() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && typeof user.enableAnimations === 'boolean') {
      if (user.enableAnimations) {
        document.documentElement.classList.remove('animations-disabled');
      } else {
        document.documentElement.classList.add('animations-disabled');
      }
    }
  }, [user]);

  return null;
}

function AutoPushSubscribeHandler() {
  useAutoPushSubscribe();
  return null;
}

function TelegramWebAppInitializer() {
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      console.log('✅ Telegram WebApp initialized successfully');
    }
  }, []);
  
  return null;
}

function AppRouter() {
  const [isHashInitialized, setIsHashInitialized] = useState(false);

  useLayoutEffect(() => {
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '') {
      window.location.hash = '#/';
    }
    setIsHashInitialized(true);
  }, []);

  if (!isHashInitialized) {
    return null;
  }

  return (
    <Router hook={useHashLocation}>
      <TelegramWebAppInitializer />
      <AnimationPreferenceApplier />
      <AutoPushSubscribeHandler />
      <ChristmasModeWrapper />
      <TelegramChatWidget />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        
        <Route path="/activity">
          <ProtectedRoute>
            <ActivityPage />
          </ProtectedRoute>
        </Route>
        <Route path="/games">
          <ProtectedRoute>
            <GamesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/promotions">
          <ProtectedRoute>
            <PromotionsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/account">
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        </Route>
        <Route path="/game">
          <Redirect to="/" />
        </Route>
        <Route path="/wingo">
          <ProtectedRoute>
            <WingoPage />
          </ProtectedRoute>
        </Route>
        <Route path="/coin-flip">
          <ProtectedRoute>
            <CoinFlipPage />
          </ProtectedRoute>
        </Route>
        <Route path="/crash">
          <ProtectedRoute>
            <CrashPage />
          </ProtectedRoute>
        </Route>
        <Route path="/deposit">
          <ProtectedRoute>
            <DepositPage />
          </ProtectedRoute>
        </Route>
        <Route path="/agent-deposit">
          <ProtectedRoute>
            <AgentDepositPage />
          </ProtectedRoute>
        </Route>
        <Route path="/withdrawal">
          <ProtectedRoute>
            <WithdrawalPage />
          </ProtectedRoute>
        </Route>
        <Route path="/betting-tasks">
          <ProtectedRoute>
            <BettingTasksPage />
          </ProtectedRoute>
        </Route>
        <Route path="/security-settings">
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        </Route>
        
        <Route path="/logo-showcase" component={LogoShowcase} />
        <Route path="/image-editor" component={ImageEditor} />
        <Route path="/main-admin-md" component={AdminPage} />
        <Route path="/agent-login" component={AgentLogin} />
        <Route path="/agent-dashboard" component={AgentDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  // Check if current path is /agent-login or /agent-dashboard (without hash)
  const isAgentLogin = window.location.pathname === '/agent-login';
  const isAgentDashboard = window.location.pathname === '/agent-dashboard';

  if (isAgentLogin) {
    // Render AgentLogin directly without hash routing
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ChristmasModeWrapper />
          <TelegramChatWidget />
          <AgentLogin />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isAgentDashboard) {
    // Render AgentDashboard directly without hash routing
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ChristmasModeWrapper />
          <TelegramChatWidget />
          <AgentDashboard />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Use hash routing for all other routes
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
