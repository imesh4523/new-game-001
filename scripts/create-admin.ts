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

async function createAdmin() {
  try {
    console.log('\n👤 Create New Admin User\n');
    console.log('═'.repeat(50));
    
    // Get email
    const email = await question('\nEnter admin email: ');
    
    if (!email || !email.includes('@')) {
      console.log('\n❌ Invalid email address!');
      rl.close();
      return;
    }
    
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser) {
      console.log(`\n❌ User with email "${email}" already exists!`);
      console.log(`   Role: ${existingUser.role}`);
      
      if (existingUser.role !== 'admin') {
        const upgrade = await question('\nUpgrade this user to admin? (yes/no): ');
        if (upgrade.toLowerCase() === 'yes') {
          await db
            .update(users)
            .set({ role: 'admin', updatedAt: new Date() })
            .where(eq(users.email, email));
          console.log('\n✅ User upgraded to admin role!');
        }
      }
      rl.close();
      return;
    }
    
    // Get password
    const password = await question('Enter password (min 6 characters): ');
    
    if (!password || password.length < 6) {
      console.log('\n❌ Password must be at least 6 characters!');
      rl.close();
      return;
    }
    
    // Confirm password
    const confirmPassword = await question('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match!');
      rl.close();
      return;
    }
    
    // Hash password
    console.log('\n🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate referral code
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Create admin user
    console.log('💾 Creating admin user...');
    const [newAdmin] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'admin',
        referralCode,
        isActive: true,
      })
      .returning();
    
    console.log('\n✅ SUCCESS! Admin user created.');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log('\n⚠️  Please save these credentials in a secure location!');
    console.log('═'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

createAdmin();
