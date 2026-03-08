import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function listAdmins() {
  try {
    console.log('\n👥 Admin Users List\n');
    console.log('═'.repeat(80));
    
    const admins = await db
      .select({
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        twoFactorEnabled: users.twoFactorEnabled,
        createdAt: users.createdAt,
        lastLoginIp: users.lastLoginIp
      })
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (admins.length === 0) {
      console.log('No admin users found in database');
      return;
    }
    
    console.log(`\nTotal admin users: ${admins.length}\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}`);
      console.log(`   Status: ${admin.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   2FA: ${admin.twoFactorEnabled ? '🔒 Enabled' : '⚠️  Disabled'}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log(`   Last IP: ${admin.lastLoginIp || 'Never logged in'}`);
      console.log('');
    });
    
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

listAdmins();
