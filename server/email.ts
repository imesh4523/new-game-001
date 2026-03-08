import { MailService } from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import type { IStorage } from './storage';

// Email configuration - will be loaded dynamically
let cachedSmtpSettings: {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  lastFetch?: number;
} = {};

const CACHE_TTL = 60000; // Cache SMTP settings for 1 minute

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Cache for SendGrid settings
let cachedSendGridSettings: {
  apiKey?: string;
  fromEmail?: string;
  lastFetch?: number;
} = {};

async function getSendGridSettings(storage?: IStorage) {
  const now = Date.now();
  
  // Check cache first
  if (cachedSendGridSettings.lastFetch && (now - cachedSendGridSettings.lastFetch) < CACHE_TTL) {
    return cachedSendGridSettings;
  }

  // Try to get settings from database if storage is provided
  if (storage) {
    try {
      const apiKeySetting = await storage.getSystemSetting('sendgrid_api_key');
      const fromEmailSetting = await storage.getSystemSetting('sendgrid_from_email');

      if (apiKeySetting?.value) {
        cachedSendGridSettings = {
          apiKey: apiKeySetting.value,
          fromEmail: fromEmailSetting?.value,
          lastFetch: now
        };
        return cachedSendGridSettings;
      }
    } catch (error) {
      console.error('Failed to fetch SendGrid settings from database:', error);
    }
  }

  // Fallback to environment variables
  const envSendGrid = {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL,
    lastFetch: now
  };

  if (envSendGrid.apiKey) {
    cachedSendGridSettings = envSendGrid;
    return cachedSendGridSettings;
  }

  return {};
}

async function getSmtpSettings(storage?: IStorage) {
  // Check cache first
  const now = Date.now();
  if (cachedSmtpSettings.lastFetch && (now - cachedSmtpSettings.lastFetch) < CACHE_TTL) {
    return cachedSmtpSettings;
  }

  // Try to get settings from database if storage is provided
  if (storage) {
    try {
      const smtpHost = await storage.getSystemSetting('smtp_host');
      const smtpPort = await storage.getSystemSetting('smtp_port');
      const smtpUser = await storage.getSystemSetting('smtp_user');
      const smtpPass = await storage.getSystemSetting('smtp_pass');
      const fromEmail = await storage.getSystemSetting('from_email');

      if (smtpHost?.value && smtpUser?.value && smtpPass?.value) {
        cachedSmtpSettings = {
          host: smtpHost.value,
          port: smtpPort?.value ? parseInt(smtpPort.value) : 587,
          user: smtpUser.value,
          pass: smtpPass.value,
          from: fromEmail?.value,
          lastFetch: now
        };
        return cachedSmtpSettings;
      }
    } catch (error) {
      console.error('Failed to fetch SMTP settings from database:', error);
    }
  }

  // Fallback to environment variables
  const envSmtp = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL,
    lastFetch: now
  };

  if (envSmtp.host && envSmtp.user && envSmtp.pass) {
    cachedSmtpSettings = envSmtp;
    return cachedSmtpSettings;
  }

  return {};
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  storage?: IStorage;
}

// Calculate email size in bytes
function calculateEmailSize(params: EmailParams): { bytes: number; kb: number; mb: number } {
  const encoder = new TextEncoder();
  
  let totalBytes = 0;
  
  // Calculate size of each field
  totalBytes += encoder.encode(params.to).length;
  totalBytes += encoder.encode(params.from).length;
  totalBytes += encoder.encode(params.subject).length;
  if (params.text) totalBytes += encoder.encode(params.text).length;
  if (params.html) totalBytes += encoder.encode(params.html).length;
  
  const kb = totalBytes / 1024;
  const mb = kb / 1024;
  
  return {
    bytes: totalBytes,
    kb: parseFloat(kb.toFixed(2)),
    mb: parseFloat(mb.toFixed(4))
  };
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(params.storage);
  const sendGridSettings = await getSendGridSettings(params.storage);
  
  const IS_SMTP_CONFIGURED = !!(smtpSettings.host && smtpSettings.user && smtpSettings.pass);
  const IS_SENDGRID_CONFIGURED = !!sendGridSettings.apiKey;
  const IS_MOCK_EMAIL = !IS_SMTP_CONFIGURED && !IS_SENDGRID_CONFIGURED;

  // Calculate and log email size
  const emailSize = calculateEmailSize(params);
  const sizeDisplay = emailSize.mb >= 1 
    ? `${emailSize.mb} MB` 
    : `${emailSize.kb} KB`;
  
  console.log(`📊 Email size: ${sizeDisplay} (${emailSize.bytes} bytes)`);

  if (IS_MOCK_EMAIL) {
    console.log('📧 Mock email sent:', {
      to: params.to,
      subject: params.subject,
      preview: params.text?.substring(0, 100),
      size: sizeDisplay
    });
    return true;
  }

  try {
    if (IS_SMTP_CONFIGURED) {
      console.log(`📧 Attempting to send email via SMTP: ${smtpSettings.host}:${smtpSettings.port} (SSL: ${smtpSettings.port === 465})`);
      const smtpTransporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port || 587,
        secure: smtpSettings.port === 465,
        auth: {
          user: smtpSettings.user!,
          pass: smtpSettings.pass!,
        },
      });

      // Preserve the display name from params.from if it exists
      // Extract display name and email parts if params.from has format: "Display Name" <email@domain.com>
      let fromAddress = params.from;
      const displayNameMatch = params.from.match(/^"([^"]+)"\s*<(.+)>$/);
      
      if (displayNameMatch && smtpSettings.from) {
        // params.from has a display name - preserve it but use SMTP email address
        const displayName = displayNameMatch[1];
        fromAddress = `"${displayName}" <${smtpSettings.from}>`;
      } else if (smtpSettings.from) {
        // No display name in params.from, just use SMTP settings
        fromAddress = smtpSettings.from;
      }
      
      await smtpTransporter.sendMail({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      console.log(`✅ Email sent successfully to ${params.to} via SMTP (${smtpSettings.host}) - Size: ${sizeDisplay}`);
      
      // Increment email count
      if (params.storage) {
        await incrementSendGridEmailCount(params.storage);
      }
      
      return true;
    } else if (IS_SENDGRID_CONFIGURED) {
      console.log(`📧 Attempting to send email via SendGrid`);
      
      // Set API key dynamically
      const tempMailService = new MailService();
      tempMailService.setApiKey(sendGridSettings.apiKey!);
      
      // Determine from address
      let fromAddress = params.from;
      if (sendGridSettings.fromEmail) {
        const displayNameMatch = params.from.match(/^"([^"]+)"\s*<(.+)>$/);
        if (displayNameMatch) {
          const displayName = displayNameMatch[1];
          fromAddress = `"${displayName}" <${sendGridSettings.fromEmail}>`;
        } else {
          fromAddress = sendGridSettings.fromEmail;
        }
      }
      
      const sendGridParams: any = {
        to: params.to,
        from: fromAddress,
        subject: params.subject,
      };
      
      if (params.text) sendGridParams.text = params.text;
      if (params.html) sendGridParams.html = params.html;
      
      await tempMailService.send(sendGridParams);
      console.log(`✅ Email sent successfully to ${params.to} via SendGrid - Size: ${sizeDisplay}`);
      
      // Increment email count
      if (params.storage) {
        await incrementSendGridEmailCount(params.storage);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Helper function to increment email count
async function incrementSendGridEmailCount(storage: IStorage): Promise<void> {
  try {
    const emailCountSetting = await storage.getSystemSetting('sendgrid_email_count');
    const currentCount = emailCountSetting?.value ? parseInt(emailCountSetting.value) : 0;
    const newCount = currentCount + 1;
    
    await storage.upsertSystemSetting({
      key: 'sendgrid_email_count',
      value: newCount.toString(),
      description: 'Total number of emails sent via SendGrid or SMTP',
      isEncrypted: false
    }, 'system');
  } catch (error) {
    console.error('Failed to increment email count:', error);
  }
}

// Get base URL based on environment
function getBaseUrl(): string {
  // Priority order:
  // 1. APP_URL - For production deployments (DigitalOcean, VPS, etc.)
  // 2. PRODUCTION_URL - Alternative production URL env var
  // 3. CUSTOM_DOMAIN - Custom user domain
  // 4. REPLIT_DEV_DOMAIN - For Replit development
  // 5. localhost - For local development
  
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL.replace(/\/$/, '');
  }
  
  if (process.env.CUSTOM_DOMAIN) {
    return process.env.CUSTOM_DOMAIN.replace(/\/$/, '');
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  return 'http://localhost:5000';
}

// Get logo URL based on environment
function getLogoUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/icon-192.png`;
}

// Get app URL
function getAppUrl(): string {
  return getBaseUrl();
}

// Common email header with logo
function getEmailHeader(title: string): string {
  const logoUrl = getLogoUrl();
  return `
    <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <img src="${logoUrl}" alt="3xbet" style="width: 80px; height: 80px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
      <h1 style="color: white; margin: 15px 0 0 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">3xbet</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">${title}</p>
    </div>
  `;
}

// Common email footer
function getEmailFooter(): string {
  const appUrl = getAppUrl();
  return `
    <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
        © ${new Date().getFullYear()} 3xbet. All rights reserved.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
        <a href="${appUrl}" style="color: #10b981; text-decoration: none;">Visit Website</a> • 
        <a href="${appUrl}/account" style="color: #10b981; text-decoration: none;">My Account</a>
      </p>
    </div>
  `;
}

// Password Reset Email
export async function sendPasswordResetEmail(email: string, resetToken: string, storage?: IStorage): Promise<boolean> {
  const baseUrl = getAppUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const smtpSettings = await getSmtpSettings(storage);
  const fromAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'Password Reset Request - 3xbet',
    text: `You requested a password reset. Click this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Password Reset')}
          
          <div style="padding: 40px 30px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; color: #92400e; font-size: 15px;">
                <strong>⚠️ Security Notice:</strong> Someone requested a password reset for your account.
              </p>
            </div>

            <h2 style="color: #111827; font-size: 22px; margin: 0 0 20px 0; font-weight: 600;">
              Reset Your Password
            </h2>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
              Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600;">
                Or copy this link:
              </p>
              <p style="margin: 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #10b981; font-size: 13px; text-decoration: none;">${resetUrl}</a>
              </p>
            </div>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin-top: 30px;">
              <p style="margin: 0; color: #991b1b; font-size: 13px;">
                <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change.
              </p>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Deposit Confirmation Email
export async function sendDepositConfirmationEmail(
  email: string, 
  amount: string, 
  currency: string,
  transactionId: string,
  newBalance: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const emailAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  const fromAddress = `"founds-3xbet" <${emailAddress}>`;
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'Deposit Confirmed - Your Funds Have Been Added',
    text: `Your deposit of ${amount} ${currency} has been confirmed!\n\nNew Balance: ${newBalance} ${currency}\nTransaction ID: ${transactionId}\n\nThank you for your deposit!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Deposit Confirmed')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                <span style="font-size: 40px;">✅</span>
              </div>
              <h2 style="color: #10b981; font-size: 26px; margin: 0; font-weight: 700;">
                Deposit Successful!
              </h2>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #10b981;">
              <div style="text-align: center;">
                <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Amount Deposited
                </p>
                <p style="margin: 0; color: #10b981; font-size: 36px; font-weight: 800;">
                  ${amount} <span style="font-size: 20px; font-weight: 600;">${currency}</span>
                </p>
              </div>
              
              <div style="margin-top: 25px; padding-top: 25px; border-top: 2px dashed rgba(16, 185, 129, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="color: #065f46; font-size: 15px; font-weight: 600;">New Balance:</span>
                  <span style="color: #047857; font-size: 20px; font-weight: 700;">${newBalance} ${currency}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <span style="color: #065f46; font-size: 13px; font-weight: 600;">Transaction ID:</span>
                  <span style="color: #6b7280; font-size: 12px; text-align: right; max-width: 60%; word-break: break-all;">${transactionId}</span>
                </div>
              </div>
            </div>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center; margin: 30px 0;">
              Your funds have been successfully added to your account. Start playing now!
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${getAppUrl()}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Start Playing
              </a>
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 30px;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>Security:</strong> If you didn't make this deposit, please contact our support team immediately.
              </p>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// VIP Level Upgrade Email
export async function sendVipLevelUpgradeEmail(
  email: string,
  userName: string,
  oldLevel: string,
  newLevel: string,
  benefits: string[],
  storage?: IStorage,
  telegramLink?: string
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const emailAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  const fromAddress = `"Join -Vip telegaram" <${emailAddress}>`;

  const levelDisplayNames: Record<string, string> = {
    'lv1': 'Level 1',
    'lv2': 'Level 2',
    'vip': 'VIP',
    'vip1': 'VIP 1',
    'vip2': 'VIP 2',
    'vip3': 'VIP 3',
    'vip4': 'VIP 4',
    'vip5': 'VIP 5',
    'vip6': 'VIP 6',
    'vip7': 'VIP 7'
  };

  const benefitsList = benefits.map(b => `
    <li style="color: #4b5563; margin: 10px 0; font-size: 15px;">
      <span style="color: #10b981; font-weight: 600;">✓</span> ${b}
    </li>
  `).join('');
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'Join - Vip telegram link',
    text: `Congratulations ${userName}!\n\nYou've been upgraded from ${levelDisplayNames[oldLevel] || oldLevel} to ${levelDisplayNames[newLevel] || newLevel}!\n\nNew Benefits:\n${benefits.map(b => `• ${b}`).join('\n')}\n\nThank you for being a valued member!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('VIP Upgrade')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);">
                <span style="font-size: 50px;">👑</span>
              </div>
              <h2 style="color: #f59e0b; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                Congratulations!
              </h2>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">
                You've been upgraded to a new VIP level
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #f59e0b; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Your New Level
              </p>
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <div style="background: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; font-weight: 600;">From</p>
                  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 18px; font-weight: 700;">${levelDisplayNames[oldLevel] || oldLevel}</p>
                </div>
                <span style="font-size: 24px; color: #10b981;">→</span>
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                  <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600;">To</p>
                  <p style="margin: 5px 0 0 0; color: white; font-size: 20px; font-weight: 800;">${levelDisplayNames[newLevel] || newLevel}</p>
                </div>
              </div>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #111827; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">
                🎁 Your New Benefits
              </h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${benefitsList}
              </ul>
            </div>

            ${telegramLink ? `
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
              <a href="${telegramLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Join Telegram Channel
              </a>
            </div>
            ` : ''}

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                <strong>Thank you for being a valued member!</strong><br>
                Continue playing to unlock even more exclusive rewards.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${getAppUrl()}/account" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                View My Account
              </a>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Level Up Email (Team/Referral Level)
export async function sendLevelUpEmail(
  email: string,
  userName: string,
  newTeamSize: number,
  achievement: string,
  reward: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const fromAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'support',
    text: `Congratulations ${userName}!\n\n${achievement}\n\nYour team has grown to ${newTeamSize} members!\n\nReward: ${reward}\n\nKeep building your team!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Achievement Unlocked')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);">
                <span style="font-size: 50px;">🎯</span>
              </div>
              <h2 style="color: #3b82f6; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                Achievement Unlocked!
              </h2>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">
                You've reached a new milestone
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #3b82f6; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px; font-weight: 700;">
                ${achievement}
              </p>
              <div style="margin: 20px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Team Size</p>
                <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 32px; font-weight: 800;">${newTeamSize}</p>
              </div>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px; font-weight: 600;">
                🎁 Your Reward
              </p>
              <p style="margin: 0; color: #047857; font-size: 18px; font-weight: 700;">
                ${reward}
              </p>
            </div>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center; margin: 30px 0;">
              Keep growing your team to unlock even more rewards and benefits!
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${getAppUrl()}/account?tab=team" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                View My Team
              </a>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Welcome Email
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  referralCode: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const emailAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  const fromAddress = `"3xbet" <${emailAddress}>`;
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: '🎉 Welcome to 3xbet - Start Winning Today!',
    text: `Welcome ${userName}!\n\nThank you for joining 3xbet.\n\nYour Referral Code: ${referralCode}\n\nShare this code with friends and earn rewards!\n\nStart playing now and good luck!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Welcome')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #111827; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                Welcome, ${userName}!
              </h2>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">
                We're excited to have you on board
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #10b981; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Your Referral Code
              </p>
              <p style="margin: 0; color: #10b981; font-size: 36px; font-weight: 800; letter-spacing: 2px;">
                ${referralCode}
              </p>
              <p style="margin: 15px 0 0 0; color: #047857; font-size: 14px;">
                Share this code and earn rewards!
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #111827; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">
                🚀 Getting Started
              </h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="color: #4b5563; margin: 15px 0; font-size: 15px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 10px;">1️⃣</span>
                  <span>Make your first deposit to start playing</span>
                </li>
                <li style="color: #4b5563; margin: 15px 0; font-size: 15px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 10px;">2️⃣</span>
                  <span>Choose your favorite game and place bets</span>
                </li>
                <li style="color: #4b5563; margin: 15px 0; font-size: 15px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 10px;">3️⃣</span>
                  <span>Invite friends with your referral code</span>
                </li>
                <li style="color: #4b5563; margin: 15px 0; font-size: 15px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 10px;">4️⃣</span>
                  <span>Climb VIP levels for exclusive benefits</span>
                </li>
              </ul>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${getAppUrl()}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Start Playing Now
              </a>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Agent Approval Email
export async function sendAgentApprovalEmail(
  email: string,
  userName: string,
  commissionRate: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const emailAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  const fromAddress = `"3xbet Agent Program" <${emailAddress}>`;
  const agentLoginUrl = `${getAppUrl()}/agent-login`;
  
  // Format commission rate as percentage
  const commissionPercentage = (parseFloat(commissionRate) * 100).toFixed(2);
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'Agent Application Approved - Welcome to 3xbet Agent Program',
    text: `Congratulations ${userName}!\n\nYour agent application has been approved!\n\nCommission Rate: ${commissionPercentage}%\n\nAgent Login: ${agentLoginUrl}\n\nImportant Rules:\n- Creating multiple accounts for deposits will result in permanent suspension of all your accounts\n- All accounts linked to the same IP address will be monitored\n- Violations of our terms will result in immediate termination\n\nThank you for joining the 3xbet Agent Program!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Agent Program')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);">
                <span style="font-size: 50px;">✅</span>
              </div>
              <h2 style="color: #10b981; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
                Application Approved!
              </h2>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">
                Welcome to the 3xbet Agent Program
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px solid #3b82f6;">
              <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 700;">
                Dear ${userName},
              </p>
              <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                Congratulations! Your application to become an agent has been approved. You can now manage deposits and withdrawals for your customers and earn commissions on all transactions.
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #10b981; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Your Commission Rate
              </p>
              <p style="margin: 0; color: #10b981; font-size: 48px; font-weight: 800;">
                ${commissionPercentage}%
              </p>
              <p style="margin: 15px 0 0 0; color: #047857; font-size: 14px;">
                Earn on every deposit and withdrawal transaction
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; font-weight: 600;">
                Access your agent dashboard:
              </p>
              <a href="${agentLoginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Agent Login
              </a>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600;">
                Agent Login URL:
              </p>
              <p style="margin: 0; word-break: break-all;">
                <a href="${agentLoginUrl}" style="color: #10b981; font-size: 13px; text-decoration: none;">${agentLoginUrl}</a>
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #111827; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">
                📋 Agent Responsibilities
              </h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="color: #4b5563; margin: 12px 0; font-size: 14px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-weight: 600; margin-right: 10px;">✓</span>
                  <span>Process customer deposits and withdrawals securely</span>
                </li>
                <li style="color: #4b5563; margin: 12px 0; font-size: 14px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-weight: 600; margin-right: 10px;">✓</span>
                  <span>Maintain accurate transaction records</span>
                </li>
                <li style="color: #4b5563; margin: 12px 0; font-size: 14px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-weight: 600; margin-right: 10px;">✓</span>
                  <span>Provide excellent customer service to your clients</span>
                </li>
                <li style="color: #4b5563; margin: 12px 0; font-size: 14px; display: flex; align-items: start;">
                  <span style="color: #10b981; font-weight: 600; margin-right: 10px;">✓</span>
                  <span>Earn ${commissionPercentage}% commission on every transaction</span>
                </li>
              </ul>
            </div>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px; margin: 30px 0;">
              <h4 style="margin: 0 0 15px 0; color: #991b1b; font-size: 16px; font-weight: 700;">
                ⚠️ Important Rules & Regulations
              </h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="color: #991b1b; margin: 10px 0; font-size: 13px; display: flex; align-items: start;">
                  <span style="color: #ef4444; font-weight: 600; margin-right: 8px;">•</span>
                  <span><strong>Multiple Account Prohibition:</strong> Creating or using multiple accounts to deposit funds is strictly prohibited and will result in permanent suspension of all associated accounts.</span>
                </li>
                <li style="color: #991b1b; margin: 10px 0; font-size: 13px; display: flex; align-items: start;">
                  <span style="color: #ef4444; font-weight: 600; margin-right: 8px;">•</span>
                  <span><strong>IP Monitoring:</strong> All accounts sharing the same registration IP address will be monitored for suspicious activity.</span>
                </li>
                <li style="color: #991b1b; margin: 10px 0; font-size: 13px; display: flex; align-items: start;">
                  <span style="color: #ef4444; font-weight: 600; margin-right: 8px;">•</span>
                  <span><strong>Zero Tolerance Policy:</strong> Any violation of our terms and conditions will result in immediate termination of your agent account and forfeiture of all commissions.</span>
                </li>
                <li style="color: #991b1b; margin: 10px 0; font-size: 13px; display: flex; align-items: start;">
                  <span style="color: #ef4444; font-weight: 600; margin-right: 8px;">•</span>
                  <span><strong>Fair Play:</strong> All transactions must be legitimate. Fraudulent activities will be reported to relevant authorities.</span>
                </li>
                <li style="color: #991b1b; margin: 10px 0; font-size: 13px; display: flex; align-items: start;">
                  <span style="color: #ef4444; font-weight: 600; margin-right: 8px;">•</span>
                  <span><strong>Compliance Required:</strong> You must comply with all local laws and regulations regarding financial transactions.</span>
                </li>
              </ul>
            </div>

            <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                <strong>💡 Pro Tip:</strong> Build trust with your customers through reliable service and transparent transactions. Your reputation directly impacts your success as an agent.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">
                Welcome aboard! We look forward to a successful partnership.
              </p>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Custom Email (Admin to User)
export async function sendCustomEmail(
  to: string | string[],
  subject: string,
  message: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const fromAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  
  // If sending to multiple recipients, send individual emails to each
  if (Array.isArray(to)) {
    let allSuccess = true;
    for (const recipient of to) {
      const success = await sendCustomEmail(recipient, subject, message, storage);
      if (!success) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }
  
  const emailContent = {
    to,
    from: fromAddress,
    subject: 'support',
    text: message,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Notification')}
          
          <div style="padding: 40px 30px;">
            <div style="white-space: pre-wrap; line-height: 1.8; color: #374151; font-size: 15px;">
              ${message.replace(/\n/g, '<br>')}
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}

// Withdrawal Request Email
export async function sendWithdrawalRequestEmail(
  email: string,
  amount: string,
  currency: string,
  walletAddress: string,
  storage?: IStorage
): Promise<boolean> {
  const smtpSettings = await getSmtpSettings(storage);
  const emailAddress = smtpSettings.from || process.env.FROM_EMAIL || 'noreply@3xbet.com';
  const fromAddress = `"founds-3xbet" <${emailAddress}>`;
  
  const emailContent = {
    to: email,
    from: fromAddress,
    subject: 'founds - 3xbet',
    text: `Your withdrawal request has been received.\n\nAmount: ${amount} ${currency}\nWallet Address: ${walletAddress}\n\nYour request will be processed by our team shortly.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${getEmailHeader('Withdrawal Request')}
          
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);">
                <span style="font-size: 40px;">🔔</span>
              </div>
              <h2 style="color: #3b82f6; font-size: 26px; margin: 0; font-weight: 700;">
                Withdrawal Request Received
              </h2>
            </div>

            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #3b82f6;">
              <div style="text-align: center;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Withdrawal Amount
                </p>
                <p style="margin: 0; color: #3b82f6; font-size: 36px; font-weight: 800;">
                  ${amount} <span style="font-size: 20px; font-weight: 600;">${currency}</span>
                </p>
              </div>
              
              <div style="margin-top: 25px; padding-top: 25px; border-top: 2px dashed rgba(59, 130, 246, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <span style="color: #1e40af; font-size: 13px; font-weight: 600;">Wallet Address:</span>
                  <span style="color: #6b7280; font-size: 12px; text-align: right; max-width: 60%; word-break: break-all;">${walletAddress}</span>
                </div>
              </div>
            </div>

            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center; margin: 30px 0;">
              Your withdrawal request is being processed by our team. You will receive another notification once it's approved.
            </p>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 30px;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>Note:</strong> Processing time may vary depending on the payment method and verification requirements.
              </p>
            </div>

            ${getEmailFooter()}
          </div>
        </div>
      </body>
      </html>
    `,
    storage
  };

  return await sendEmail(emailContent);
}
