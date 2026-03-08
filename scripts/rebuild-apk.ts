import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface RebuildOptions {
  serverUrl: string;
}

export async function rebuildAPK(options: RebuildOptions): Promise<{ success: boolean; message: string; apkPath?: string }> {
  try {
    const { serverUrl } = options;
    
    console.log('🚀 Starting APK rebuild process...');
    console.log(`📡 Server URL: ${serverUrl}`);
    
    // Step 1: Update capacitor.config.ts with server URL
    const capacitorConfigPath = path.join(process.cwd(), 'capacitor.config.ts');
    const capacitorConfig = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.threeexbet.app',
  appName: '3xbet',
  webDir: 'dist/public',
  server: {
    url: '${serverUrl}',
    cleartext: true
  }
};

export default config;
`;
    
    fs.writeFileSync(capacitorConfigPath, capacitorConfig);
    console.log('✅ Updated capacitor.config.ts with server URL');
    
    // Step 2: Build production frontend
    console.log('📦 Building production frontend...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Frontend build complete');
    
    // Step 3: Sync Capacitor
    console.log('🔄 Syncing Capacitor...');
    execSync('npx cap sync android', { stdio: 'inherit' });
    console.log('✅ Capacitor sync complete');
    
    // Step 4: Build release APK
    console.log('🔨 Building release APK...');
    const androidHome = process.env.ANDROID_HOME || '/home/runner/android-sdk';
    process.env.ANDROID_HOME = androidHome;
    process.env.PATH = `${process.env.PATH}:${androidHome}/cmdline-tools/latest/bin:${androidHome}/platform-tools`;
    
    execSync('cd android && ./gradlew assembleRelease --no-daemon', { 
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Release APK built successfully');
    
    // Step 5: Copy APK to downloads folder
    const apkSource = 'android/app/build/outputs/apk/release/app-release.apk';
    const apkDest = 'client/public/downloads/3xbet-release.apk';
    
    fs.copyFileSync(apkSource, apkDest);
    console.log(`✅ APK copied to ${apkDest}`);
    
    // Get APK size
    const stats = fs.statSync(apkDest);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    return {
      success: true,
      message: `APK rebuilt successfully! Size: ${fileSizeMB} MB`,
      apkPath: apkDest
    };
    
  } catch (error) {
    console.error('❌ APK rebuild failed:', error);
    return {
      success: false,
      message: `Failed to rebuild APK: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// CLI usage - ES module compatibility
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const serverUrl = process.argv[2] || 'https://your-project.replit.app';
  rebuildAPK({ serverUrl }).then(result => {
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  });
}
