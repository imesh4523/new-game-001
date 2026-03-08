import nodemailer from 'nodemailer';
import { db } from '../server/db';
import { systemSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testSmtp() {
  try {
    console.log('\n📧 SMTP Configuration Test\n');
    console.log('═'.repeat(60));
    
    // Get SMTP settings from database
    console.log('\n🔍 Fetching SMTP settings from database...');
    
    const smtpHost = await db.select().from(systemSettings).where(eq(systemSettings.key, 'smtp_host')).limit(1);
    const smtpPort = await db.select().from(systemSettings).where(eq(systemSettings.key, 'smtp_port')).limit(1);
    const smtpUser = await db.select().from(systemSettings).where(eq(systemSettings.key, 'smtp_user')).limit(1);
    const smtpPass = await db.select().from(systemSettings).where(eq(systemSettings.key, 'smtp_pass')).limit(1);
    const fromEmail = await db.select().from(systemSettings).where(eq(systemSettings.key, 'from_email')).limit(1);
    
    if (!smtpHost[0] || !smtpUser[0] || !smtpPass[0]) {
      console.log('\n❌ SMTP settings not found in database!');
      process.exit(1);
    }
    
    const host = smtpHost[0].value;
    const port = parseInt(smtpPort[0]?.value || '465');
    const user = smtpUser[0].value;
    const pass = smtpPass[0].value;
    const from = fromEmail[0]?.value || user;
    
    console.log('\n✅ SMTP Settings Found:');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   User: ${user}`);
    console.log(`   From: ${from}`);
    console.log(`   Password: ${'*'.repeat(pass.length)}`);
    
    // Create transporter
    console.log('\n🔌 Creating SMTP connection...');
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });
    
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Send test email
    console.log('\n📤 Sending test email...');
    const testEmail = user; // Send to self for testing
    
    const info = await transporter.sendMail({
      from: `"3xbet Test" <${from}>`,
      to: testEmail,
      subject: '✅ SMTP Test - 3xbet',
      text: 'This is a test email from your 3xbet application. If you receive this, SMTP is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #10b981;">✅ SMTP Test Successful!</h2>
            <p>This is a test email from your 3xbet application.</p>
            <p>If you receive this, your SMTP configuration is working correctly!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
            <p style="color: #666; font-size: 12px;">Sent from: ${host}:${port}</p>
          </div>
        </div>
      `,
    });
    
    console.log('\n✅ SUCCESS! Test email sent!');
    console.log(`\n📬 Message ID: ${info.messageId}`);
    console.log(`📧 Email sent to: ${testEmail}`);
    console.log(`📨 Check the inbox at: ${testEmail}`);
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ SMTP is configured correctly and working!');
    console.log('📧 Welcome emails should be sent to new users automatically.');
    console.log('\n' + '═'.repeat(60));
    
  } catch (error: any) {
    console.log('\n' + '═'.repeat(60));
    console.log('\n❌ SMTP TEST FAILED!\n');
    
    if (error.code === 'EAUTH') {
      console.log('🔒 Authentication Error');
      console.log('   ❌ SMTP username or password is INCORRECT');
      console.log('   📝 Please update SMTP credentials in Admin Panel → Settings');
    } else if (error.code === 'ECONNECTION' || error.code === 'ECONNREFUSED') {
      console.log('🔌 Connection Error');
      console.log('   ❌ Cannot connect to SMTP server');
      console.log('   📝 Check SMTP host and port settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏱️  Timeout Error');
      console.log('   ❌ Connection to SMTP server timed out');
      console.log('   📝 Check internet connection and SMTP server status');
    } else if (error.code === 'ESOCKET') {
      console.log('🔌 Socket Error');
      console.log('   ❌ SSL/TLS connection failed');
      console.log('   📝 Try changing port from 465 to 587');
    } else {
      console.log('💥 Unknown Error');
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Response:', error.response);
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    process.exit(1);
  }
}

testSmtp();
