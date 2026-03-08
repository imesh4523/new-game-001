import { db } from '../server/db';
import { users, userSessions, deviceLogins, adminActions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function clearUserIpHistory() {
  try {
    console.log('\n🔒 Clear User IP History\n');
    console.log('═'.repeat(80));
    
    // Get user email
    const email = await question('\n📧 Enter user email: ');
    
    if (!email || email.trim() === '') {
      console.log('❌ Email is required!');
      rl.close();
      return;
    }
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim()))
      .limit(1);
    
    if (!user) {
      console.log(`\n❌ User not found with email: ${email}`);
      rl.close();
      return;
    }
    
    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Last Login IP: ${user.lastLoginIp || 'None'}`);
    
    // Confirm
    const confirm = await question('\n⚠️  Are you sure you want to clear ALL IP history for this user? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n🔄 Clearing IP history...');
    
    // Count before deletion
    const sessionsBefore = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id));
    
    const deviceLoginsBefore = await db
      .select()
      .from(deviceLogins)
      .where(eq(deviceLogins.userId, user.id));
    
    console.log(`\n📊 Found:`);
    console.log(`   ${sessionsBefore.length} user sessions`);
    console.log(`   ${deviceLoginsBefore.length} device logins`);
    
    // Clear user sessions
    await db
      .delete(userSessions)
      .where(eq(userSessions.userId, user.id));
    
    // Clear device logins
    await db
      .delete(deviceLogins)
      .where(eq(deviceLogins.userId, user.id));
    
    // Update user record to clear IP fields
    await db
      .update(users)
      .set({
        lastLoginIp: null,
        lastLoginDeviceModel: null,
        lastLoginDeviceType: null,
        lastLoginDeviceOs: null,
        lastLoginBrowser: null
      })
      .where(eq(users.id, user.id));
    
    // Log admin action (use system user ID if available)
    await db.insert(adminActions).values({
      adminId: 'system',
      action: 'clear_ip_history',
      targetId: user.id,
      details: {
        userEmail: user.email,
        sessionsCleared: sessionsBefore.length,
        deviceLoginsCleared: deviceLoginsBefore.length,
        clearedVia: 'console_script'
      }
    });
    
    console.log('\n✅ IP history cleared successfully!');
    console.log(`\n📝 Summary:`);
    console.log(`   ✓ Cleared ${sessionsBefore.length} user sessions`);
    console.log(`   ✓ Cleared ${deviceLoginsBefore.length} device logins`);
    console.log(`   ✓ Cleared last login IP from user record`);
    console.log(`   ✓ Admin action logged`);
    console.log('\n═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

clearUserIpHistory();
