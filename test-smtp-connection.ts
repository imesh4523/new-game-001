import nodemailer from 'nodemailer';
import { storage } from './server/storage';

async function testSmtpConnection() {
  console.log('🧪 Testing SMTP Connection...\n');
  
  // Get SMTP settings from database
  const smtpHost = await storage.getSystemSetting('smtp_host');
  const smtpPort = await storage.getSystemSetting('smtp_port');
  const smtpUser = await storage.getSystemSetting('smtp_user');
  const smtpPass = await storage.getSystemSetting('smtp_pass');
  const fromEmail = await storage.getSystemSetting('from_email');
  
  console.log('📊 SMTP Settings from database:');
  console.log('   Host:', smtpHost?.value || 'NOT SET');
  console.log('   Port:', smtpPort?.value || 'NOT SET');
  console.log('   User:', smtpUser?.value || 'NOT SET');
  console.log('   Pass:', smtpPass?.value ? '***' + smtpPass.value.slice(-4) : 'NOT SET');
  console.log('   From:', fromEmail?.value || 'NOT SET');
  console.log('');
  
  if (!smtpHost?.value || !smtpUser?.value || !smtpPass?.value) {
    console.log('❌ SMTP settings incomplete!');
    process.exit(1);
  }
  
  // Create transporter
  const port = parseInt(smtpPort?.value || '587');
  console.log('🔧 Creating SMTP transporter...');
  console.log('   Secure:', port === 465);
  
  const transporter = nodemailer.createTransport({
    host: smtpHost.value,
    port: port,
    secure: port === 465,
    auth: {
      user: smtpUser.value,
      pass: smtpPass.value,
    },
  });
  
  // Verify connection
  console.log('\n🔍 Verifying SMTP connection...\n');
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    console.log('📧 Email server is ready to send messages');
    
    // Send test email
    console.log('\n📧 Sending test email to test@example.com...\n');
    
    const info = await transporter.sendMail({
      from: fromEmail?.value || smtpUser.value,
      to: 'test@example.com',
      subject: '🧪 Test Email - VIP Telegram Link',
      text: 'This is a test email to verify SMTP is working correctly.',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #10b981;">🎉 SMTP Test Successful!</h2>
          <p>Your email configuration is working correctly.</p>
          <p><strong>🔗 Telegram Link:</strong> <a href="https://t.me/hopp778">https://t.me/hopp778</a></p>
          <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated test email.</p>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    console.log('\n📬 Check your inbox: test@example.com');
    console.log('📬 Also check SPAM folder!');
    
  } catch (error: any) {
    console.error('❌ SMTP connection failed!');
    console.error('   Error:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('   - Wrong username/password');
    console.error('   - SMTP server blocking connection');
    console.error('   - Firewall/port blocked');
    console.error('   - Need to enable "Less secure app access"');
  }
  
  process.exit(0);
}

testSmtpConnection();
