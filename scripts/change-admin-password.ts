import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function changeAdminPassword() {
  try {
    console.log('\n🔐 Admin Password Change Utility\n');
    console.log('═'.repeat(50));
    
    // Get admin email
    const adminEmail = await question('\nEnter admin email (default: admin): ');
    const email = adminEmail.trim() || 'admin';
    
    // Check if admin exists
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!admin) {
      console.log(`\n❌ Admin user with email "${email}" not found!`);
      console.log('\nAvailable admin users:');
      const admins = await db
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(eq(users.role, 'admin'));
      
      if (admins.length > 0) {
        admins.forEach(a => console.log(`  - ${a.email}`));
      } else {
        console.log('  No admin users found in database');
      }
      rl.close();
      return;
    }
    
    if (admin.role !== 'admin') {
      console.log(`\n❌ User "${email}" is not an admin (role: ${admin.role})`);
      rl.close();
      return;
    }
    
    console.log(`\n✅ Admin found: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.createdAt}`);
    
    // Get new password
    const newPassword = await question('\nEnter new password (min 6 characters): ');
    
    if (!newPassword || newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters!');
      rl.close();
      return;
    }
    
    // Confirm new password
    const confirmPassword = await question('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.log('\n❌ Passwords do not match!');
      rl.close();
      return;
    }
    
    // Hash new password
    console.log('\n🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    console.log('💾 Updating password in database...');
    await db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));
    
    console.log('\n✅ SUCCESS! Admin password has been changed.');
    console.log('\n📝 New login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  Please save these credentials in a secure location!');
    console.log('═'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
changeAdminPassword();
