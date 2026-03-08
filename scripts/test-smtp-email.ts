import { sendWelcomeEmail } from '../server/email';
import { db } from '../server/db';
import { MemStorage } from '../server/storage';

async function testSmtpEmail() {
  try {
    console.log('\n📧 SMTP Email Test\n');
    console.log('═'.repeat(50));
    
    // Initialize storage to get SMTP settings from database
    const storage = new MemStorage(db);
    await storage.init();
    
    console.log('\n✅ Storage initialized');
    console.log('📤 Attempting to send test welcome email...\n');
    
    // Test email address - Replace with your email
    const testEmail = 'test@example.com';
    
    const result = await sendWelcomeEmail(
      testEmail,
      'Test User',
      'TEST123',
      storage
    );
    
    if (result) {
      console.log('\n✅ SUCCESS! Email sent successfully!');
      console.log(`\n📬 Test email sent to: ${testEmail}`);
      console.log('📝 Check the email inbox to verify delivery');
    } else {
      console.log('\n❌ FAILED! Email could not be sent');
      console.log('\n⚠️  Possible issues:');
      console.log('   1. SMTP credentials are incorrect');
      console.log('   2. SMTP server is blocking the connection');
      console.log('   3. Email provider account is suspended');
      console.log('   4. Port/SSL settings are wrong');
    }
    
    console.log('\n═'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error during email test:', error);
    
    if (error instanceof Error) {
      console.error('\n📋 Error details:');
      console.error('   Message:', error.message);
      
      if (error.message.includes('EAUTH')) {
        console.error('\n⚠️  Authentication failed - SMTP username or password is incorrect');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('\n⚠️  Connection refused - SMTP server is not reachable');
      } else if (error.message.includes('ETIMEDOUT')) {
        console.error('\n⚠️  Connection timeout - Check SMTP host and port');
      }
    }
  }
}

testSmtpEmail();
