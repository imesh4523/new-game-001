import { db } from '../server/db';
import { systemSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkN1PanelSettings() {
  try {
    console.log('\n🔍 N1Panel Auto-Reaction Settings Check\n');
    console.log('═'.repeat(80));
    
    const settingsKeys = [
      'n1panel_auto_reaction_enabled',
      'n1panel_reaction_channel_id',
      'n1panel_reaction_service_id',
      'n1panel_reaction_min_quantity',
      'n1panel_reaction_max_quantity',
      'telegram_bot_token'
    ];
    
    let allSettingsOK = true;
    
    for (const key of settingsKeys) {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);
      
      if (!setting) {
        console.log(`❌ ${key}: NOT SET`);
        allSettingsOK = false;
      } else {
        const maskedValue = key.includes('token') || key.includes('key') 
          ? setting.value.substring(0, 10) + '...' 
          : setting.value;
        console.log(`✅ ${key}: ${maskedValue}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    
    // Check Telegram Reaction API settings
    console.log('\n📡 N1Panel API Settings:\n');
    
    const [apiUrlSetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'n1panel_api_url'))
      .limit(1);
    
    const [apiKeySetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'n1panel_api_key'))
      .limit(1);
    
    if (!apiUrlSetting) {
      console.log('❌ n1panel_api_url: NOT SET');
      allSettingsOK = false;
    } else {
      console.log(`✅ n1panel_api_url: ${apiUrlSetting.value}`);
    }
    
    if (!apiKeySetting) {
      console.log('❌ n1panel_api_key: NOT SET');
      allSettingsOK = false;
    } else {
      console.log(`✅ n1panel_api_key: ${apiKeySetting.value.substring(0, 10)}...`);
    }
    
    console.log('\n' + '═'.repeat(80));
    
    if (allSettingsOK) {
      console.log('\n✅ All N1Panel settings are configured!');
      console.log('\n💡 If auto-reactions still not working, check:');
      console.log('   1. Telegram bot is added as ADMIN to your channel');
      console.log('   2. Channel ID matches the configured channel');
      console.log('   3. Server logs for any errors');
    } else {
      console.log('\n❌ Some settings are missing!');
      console.log('\n💡 To fix, update settings in Admin Dashboard:');
      console.log('   Settings > N1Panel Auto-Reaction Configuration');
    }
    
    console.log('\n' + '═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

checkN1PanelSettings();
