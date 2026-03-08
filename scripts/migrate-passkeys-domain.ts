import { db } from "../server/db";
import { passkeys } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const getCurrentRpID = () => {
  if (process.env.CUSTOM_DOMAIN) {
    return new URL(process.env.CUSTOM_DOMAIN).hostname;
  }
  if (process.env.DIGITAL_OCEAN_APP_URL) {
    return new URL(process.env.DIGITAL_OCEAN_APP_URL).hostname;
  }
  if (process.env.APP_URL) {
    return new URL(process.env.APP_URL).hostname;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN;
  }
  return 'localhost';
};

const getCurrentOrigin = () => {
  if (process.env.CUSTOM_DOMAIN) {
    return process.env.CUSTOM_DOMAIN;
  }
  if (process.env.DIGITAL_OCEAN_APP_URL) {
    return process.env.DIGITAL_OCEAN_APP_URL;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
};

async function migratePasskeysDomain() {
  console.log('🔧 Starting passkey domain migration...');
  
  const currentRpId = getCurrentRpID();
  const currentOrigin = getCurrentOrigin();
  
  console.log(`📍 Current domain: ${currentRpId} (${currentOrigin})`);
  
  try {
    // Get all passkeys that don't have rpId set (old passkeys)
    const oldPasskeys = await db
      .select()
      .from(passkeys)
      .where(sql`${passkeys.rpId} IS NULL OR ${passkeys.rpId} = ''`);
    
    console.log(`Found ${oldPasskeys.length} passkey(s) without domain information`);
    
    if (oldPasskeys.length === 0) {
      console.log('✅ No passkeys to migrate');
      return;
    }
    
    // Prompt user for what to do with old passkeys
    console.log('\n⚠️  Options for handling old passkeys:');
    console.log('1. Assume they were registered on current domain (set rpId to current domain)');
    console.log('2. Mark all as domain mismatch (assume registered on different domain)');
    console.log('3. Deactivate all old passkeys');
    
    // For automated migration, we'll assume option 2 (most conservative)
    // You can change this based on your needs
    
    console.log('\n🔧 Applying migration strategy: Mark as potentially incompatible...');
    
    for (const passkey of oldPasskeys) {
      await db
        .update(passkeys)
        .set({
          rpId: 'unknown',
          origin: 'unknown',
          isDomainMismatch: true,
          updatedAt: new Date()
        })
        .where(eq(passkeys.id, passkey.id));
      
      console.log(`✓ Migrated passkey ${passkey.id} (${passkey.deviceName})`);
    }
    
    console.log(`\n✅ Migration complete! ${oldPasskeys.length} passkey(s) marked as potentially incompatible`);
    console.log('ℹ️  Users will need to re-register their passkeys on this domain');
    
    // Show summary
    const allPasskeysAfter = await db.select().from(passkeys);
    const mismatchedCount = allPasskeysAfter.filter(pk => pk.isDomainMismatch).length;
    const activeCount = allPasskeysAfter.filter(pk => pk.rpId === currentRpId && pk.isActive).length;
    
    console.log('\n📊 Summary:');
    console.log(`   Total passkeys: ${allPasskeysAfter.length}`);
    console.log(`   Active on current domain: ${activeCount}`);
    console.log(`   Domain mismatch: ${mismatchedCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePasskeysDomain()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migratePasskeysDomain };
