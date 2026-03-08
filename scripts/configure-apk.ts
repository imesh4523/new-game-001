import { storage } from '../server/storage';
import { rebuildAPK } from './rebuild-apk';

const SERVER_URL = 'https://4b5c0bc7-4952-4811-870c-0016fab8d3a6-00-rsffqut69im6.sisko.replit.dev';

async function configureAndRebuildAPK() {
  try {
    console.log('🔧 Configuring backend server URL...');
    
    // Get any admin user or create a temporary one for this operation
    let adminUser = await storage.getUserByEmail('pursuer.ail-4d@icloud.com');
    
    if (!adminUser) {
      // Try alternative admin emails
      adminUser = await storage.getUserByEmail('admin@betting.com');
    }
    
    if (!adminUser) {
      // Get all users and find first admin
      const allUsers = await storage.getAllUsers(1, 100);
      adminUser = allUsers.users.find(u => u.role === 'admin');
    }
    
    if (!adminUser) {
      console.error('❌ No admin user found. Using system user ID.');
      // Use a system user ID for configuration
      await storage.upsertSystemSetting({
        key: 'backend_server_url',
        value: SERVER_URL,
        description: 'Backend server URL for mobile APK configuration'
      }, 'system');
    } else {
      // Update backend server URL setting
      await storage.upsertSystemSetting({
        key: 'backend_server_url',
        value: SERVER_URL,
        description: 'Backend server URL for mobile APK configuration'
      }, adminUser.id);
    }
    
    console.log('✅ Backend server URL updated to:', SERVER_URL);
    
    // Start APK rebuild
    console.log('🔨 Starting APK rebuild...');
    const result = await rebuildAPK({ serverUrl: SERVER_URL });
    
    if (result.success) {
      console.log('✅ APK rebuild completed successfully!');
      console.log('📱 APK Path:', result.apkPath);
      console.log('🌐 Download URL:', `${SERVER_URL}/downloads/3xbet-release.apk`);
    } else {
      console.error('❌ APK rebuild failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Configuration failed:', error);
    process.exit(1);
  }
}

configureAndRebuildAPK();
