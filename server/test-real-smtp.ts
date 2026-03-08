import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@threexbet.com',
    pass: 'cheakbet345#'
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Testing SMTP Connection');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Host: mail.privateemail.com');
console.log('Port: 465 (SSL)');
console.log('User: support@threexbet.com');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

transporter.verify()
  .then(() => {
    console.log('✅ SMTP Connection Successful!');
    console.log('📧 Server is ready to send emails\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 Sending Test VIP Upgrade Email');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Send test email with Telegram link
    return transporter.sendMail({
      from: '"3X Bet VIP" <support@threexbet.com>',
      to: 'test@example.com',
      subject: '🎉 VIP Level Upgrade - Join Exclusive Telegram Channel',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">🎉 Congratulations! VIP Upgrade</h2>
            <p>You've been upgraded from <strong>Level 1</strong> to <strong>VIP</strong>!</p>
            
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px solid #3b82f6; text-align: center;">
              <div style="margin-bottom: 15px;">
                <span style="font-size: 40px;">📱</span>
              </div>
              <h3 style="color: #1e40af; font-size: 20px; margin: 0 0 15px 0; font-weight: 700;">
                Join Your Exclusive VIP Telegram Channel
              </h3>
              <p style="margin: 0 0 20px 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                Get access to exclusive signals, premium tips, and VIP-only content!
              </p>
              <a href="https://t.me/hopp778" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Join Telegram Channel
              </a>
            </div>
            
            <h3>🎁 Your New Benefits:</h3>
            <ul>
              <li>👑 Higher betting limits up to $10,000</li>
              <li>💰 Daily wager reward of 0.5%</li>
              <li>📊 Premium commission rates</li>
              <li>📱 Access to exclusive VIP Telegram channel</li>
            </ul>
            
            <p style="color: #065f46; background: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <strong>Thank you for being a valued member!</strong><br>
              Continue playing to unlock even more exclusive rewards.
            </p>
          </div>
        </body>
        </html>
      `
    });
  })
  .then((info) => {
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Message ID:', info.messageId);
    console.log('To: test@example.com');
    console.log('Subject: VIP Level Upgrade with Telegram Link');
    console.log('Includes: Beautiful blue Telegram join button');
    console.log('Link: https://t.me/hopp778');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ SMTP Error:', error.message);
    console.error('Full error:', error);
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication failed. Check username/password.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n⚠️  Connection failed. Check host/port or firewall settings.');
    }
    process.exit(1);
  });
