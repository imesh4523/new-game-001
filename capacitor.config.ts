import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.threeexbet.app',
  appName: '3xbet',
  webDir: 'dist/public',
  server: {
    url: 'https://workspace-kickerslicers9v.replit.dev',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
