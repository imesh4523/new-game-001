# 🚀 Digital Ocean App Platform Deployment Guide - සිංහලෙන්

මෙම guide එක භාවිතා කරලා ඔබේ gaming platform එක Digital Ocean App Platform එකට deploy කරන්න පුළුවන්.

---

## 📋 ඔබට අවශ්‍ය දේවල්:

1. ✅ Digital Ocean account එකක්
2. ✅ GitHub account එකක් (code එක upload කරන්න)
3. ✅ Digital Ocean Managed PostgreSQL database එකක්
4. ✅ සියලු environment variables

---

## පියවර 1️⃣: Digital Ocean Database Setup

### 1.1 Database Create කරන්න:

1. Digital Ocean dashboard එකට login වෙන්න
2. **Databases** → **Create Database** click කරන්න
3. Settings:
   - **Database Engine**: PostgreSQL 16
   - **Plan**: ඔබගේ requirements අනුව select කරන්න (Basic/Professional)
   - **Region**: Singapore (SGP1) - Sri Lanka වලට වඩාත්ම ළඟ
   - **Database Name**: `defaultdb` (default එක හරි)

### 1.2 Connection Details ගන්න:

Database create උන පසු:
1. Database page එකට යන්න
2. **Connection Details** section එක expand කරන්න
3. **Connection String** copy කරන්න
   - Format: `postgresql://username:password@host:port/database?sslmode=require`
4. මේක safe place එකක save කරන්න - මෙන්න example එකක්:
   ```
   postgresql://doadmin:AVNS_xxxxxxxxxxxxx@db-postgresql-sgp1-12345-do-user-xxxxx-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```

### 1.3 Database Tables Create කරන්න:

Terminal එකේ මේ commands run කරන්න:

```bash
# DO_DATABASE_URL set කරන්න
export DO_DATABASE_URL="your-database-url-here"

# Database migration run කරන්න
npm run db:push
```

---

## පියවර 2️⃣: GitHub Repository Setup

### 2.1 GitHub Repository එකක් Create කරන්න:

1. GitHub.com එකට login වෙන්න
2. **New Repository** click කරන්න
3. Repository name එකක් දෙන්න (example: `gaming-platform`)
4. **Private** select කරන්න (security සඳහා)
5. **Create Repository** click කරන්න

### 2.2 Code එක GitHub එකට Upload කරන්න:

Terminal එකේ මේ commands run කරන්න:

```bash
# Git initialize කරන්න (ඔබේ project folder එකේ)
git init

# සියලු files add කරන්න
git add .

# Commit කරන්න
git commit -m "Initial commit for Digital Ocean deployment"

# GitHub repository එක connect කරන්න
git remote add origin https://github.com/your-username/your-repo-name.git

# Push කරන්න
git branch -M main
git push -u origin main
```

---

## පියවර 3️⃣: Digital Ocean App Platform Setup

### 3.1 App Create කරන්න:

1. Digital Ocean dashboard එකේ **Apps** → **Create App** click කරන්න
2. **Source**: GitHub select කරන්න
3. **Authorize GitHub**: ඔබේ GitHub account එක connect කරන්න
4. **Repository**: ඔබ create කළ repository එක select කරන්න
5. **Branch**: `main` select කරන්න
6. **Autodeploy**: Enable කරන්න (GitHub එකට push කරද්දී auto-deploy වෙයි)

### 3.2 Build Settings Configure කරන්න:

**Build Command**:
```bash
npm install && npm run build
```

**Run Command**:
```bash
npm start
```

**HTTP Port**: `8080` ⚠️ **IMPORTANT: Must be 8080, NOT 5000!**

**Environment**: Node.js 20.x

> 🔴 **Critical**: Digital Ocean health checks port 8080 පරීක්ෂා කරනවා. HTTP Port එක `5000` කරොත් deployment fail වෙනවා!

---

## පියවර 4️⃣: Environment Variables Setup

Digital Ocean App Settings → **Environment Variables** යන්න:

### අනිවාර්ය Variables (Required):

```bash
# Production Mode
NODE_ENV=production

# Database Connection
# ⚠️ IMPORTANT: Copy exact URL from Digital Ocean dashboard - NO quotes, NO whitespace!
DO_DATABASE_URL=postgresql://doadmin:your-password@host:port/defaultdb?sslmode=require
DATABASE_URL=${DO_DATABASE_URL}

# Session Security (Generate කරන්න: openssl rand -base64 32)
SESSION_SECRET=your-secure-random-string-here

# Balance Encryption (Generate කරන්න: openssl rand -hex 32)
BALANCE_ENCRYPTION_KEY=your-64-char-hex-key-here
```

### Recommended Variables:

```bash
# Cloudflare Security
CLOUDFLARE_ENABLED=true
CLOUDFLARE_STRICT=true

# Custom Domain (ඔබට තියෙනවා නම්)
CUSTOM_DOMAIN=https://yourdomain.com
```

### Optional Variables:

```bash
# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_SIGNAL_CHAT_ID=your-chat-id

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## පියවර 5️⃣: Deploy කරන්න!

1. සියලු settings check කරලා ඉවර උනාම **Create Resources** click කරන්න
2. Digital Ocean මගින් app එක build කරයි සහ deploy කරයි (මෙයට minutes 5-10ක් යනවා)
3. Build logs බලන්න පුළුවන් **Runtime Logs** tab එකෙන්

---

## පියවර 6️⃣: Custom Domain Setup (Optional)

### 6.1 Digital Ocean App Domain:

Deploy උන පසු, ඔබට default domain එකක් ලැබෙනවා:
- Format: `your-app-name-xxxxx.ondigitalocean.app`

### 6.2 Custom Domain Add කරන්න:

ඔබට custom domain එකක් තියෙනවා නම්:

1. Digital Ocean App Settings → **Domains** → **Add Domain**
2. ඔබගේ domain name එක enter කරන්න
3. DNS records ඔබගේ domain registrar එකේ add කරන්න:
   - Type: `CNAME`
   - Name: `@` හෝ `www`
   - Value: Digital Ocean දෙන URL එක

---

## පියවර 7️⃣: SSL/TLS Certificate

Digital Ocean මගින් automatically SSL certificate එකක් generate කරනවා:
- ✅ Let's Encrypt free SSL
- ✅ Auto-renewal
- ✅ HTTPS enabled by default

---

## පියවර 8️⃣: Verify Deployment

### 8.1 Check Application:

Browser එකේ ඔබගේ app URL එකට යන්න:
- `https://your-app-name-xxxxx.ondigitalocean.app`

### 8.2 Test Features:

- ✅ Login/Register වැඩ කරනවාද
- ✅ Games load වෙනවාද
- ✅ Bets place කරන්න පුළුවන්ද
- ✅ Transactions save වෙනවාද
- ✅ Admin panel access කරන්න පුළුවන්ද

### 8.3 Check Logs:

Digital Ocean App → **Runtime Logs** බලන්න:
- ✅ `Database connection established using PostgreSQL (Digital Ocean)`
- ✅ `✅ DatabaseStorage initialized successfully`
- ✅ `serving on port 8080` (PORT must be 8080, NOT 5000!)

---

## 🔧 Troubleshooting

### Issue 1: Port Binding Failure (Health Check Failed)

**Error**: `The application did not bind to the specified port 8080`

**වැරදි පිළිතුර:**
```
HTTP Port setting: 5000 ❌
```

**හරි පිළිතුර:**
```
HTTP Port setting: 8080 ✅
```

**Fix**:
1. Digital Ocean App Settings → **Settings** → **Component** යන්න
2. **HTTP Port** එක `8080` කරන්න (NOT 5000!)
3. Environment Variables වල **PORT** variable එකක් manually add කරලා තිබ්බොත් **DELETE** කරන්න
4. **Save** කරලා **Redeploy** කරන්න

### Issue 2: Invalid Database URL Format

**Error**: `Invalid URL format in the database connection string, TypeError`

**වැරදි formats:**
```bash
# ❌ Quotation marks තිබුණොත්
DO_DATABASE_URL="postgresql://..."

# ❌ Extra whitespace තිබුණොත්
DO_DATABASE_URL= postgresql://...

# ❌ Scheme එක නැත්නම්
DO_DATABASE_URL=//doadmin:password@host:port/db
```

**හරි format:**
```bash
# ✅ හරි format - Digital Ocean dashboard එකේන් copy paste කරන්න
DO_DATABASE_URL=postgresql://doadmin:AVNS_xxxxxxxxxxxxx@db-postgresql-sgp1-12345-do-user-xxxxx-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Fix**:
1. Digital Ocean Databases → ඔබේ database → **Connection Details** click කරන්න
2. **Connection String** එක copy කරන්න
3. Digital Ocean App Settings → **Environment Variables** → `DO_DATABASE_URL` edit කරන්න
4. Copy කළ URL එක **directly paste** කරන්න - quotation marks හෝ spaces add කරන්න එපා!
5. **Save** කරලා **Redeploy** කරන්න

### Issue 3: Build Failed

**Error**: `Build failed` හෝ `npm install failed`

**Fix**:
1. `package.json` file එක හරි format එකේ තියෙනවාද check කරන්න
2. GitHub repository එකේ සියලු files correctly upload වෙලාද බලන්න
3. Build logs එකේ specific error එක බලන්න

### Issue 3: App Crashes on Startup

**Error**: App starts but crashes immediately

**Fix**:
1. Runtime logs check කරන්න
2. Environment variables සියල්ල set වෙලාද බලන්න
3. `SESSION_SECRET` සහ `BALANCE_ENCRYPTION_KEY` set වෙලාද verify කරන්න

### Issue 4: 502 Bad Gateway

**Error**: Cannot access app, shows 502 error

**Fix**:
1. App running වෙනවාද check කරන්න
2. Port `8080` හරියටද configure වෙලාද බලන්න (NOT 5000!)
3. Runtime Logs එකේ `serving on port 8080` message එක තියෙනවාද verify කරන්න
4. App restart කරන්න try කරන්න

---

## 🚀 Performance Optimization

### Database Performance:

1. **Connection Pooling**: දැනටමත් configured (max: 20 connections)
2. **SSL Mode**: Required for security
3. **Indexes**: Important queries සඳහා indexes add කරන්න

### App Performance:

1. **Auto-scaling**: Digital Ocean App Platform එකේ enable කරන්න
2. **CDN**: Static assets සඳහා
3. **Caching**: Redis add කරන්න if needed

---

## 📊 Monitoring

### Digital Ocean Built-in Monitoring:

1. **Insights** tab එකේ:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

2. **Runtime Logs**:
   - Application errors
   - Database queries
   - Security events

3. **Alerts**:
   - Email alerts setup කරන්න
   - Slack notifications (optional)

---

## 🔄 Update & Redeploy

### Automatic Deployment:

GitHub repository එකට push කරද්දී automatically deploy වෙනවා:

```bash
# Changes කරන්න
git add .
git commit -m "Update feature"
git push origin main

# Digital Ocean automatically:
# 1. Build කරයි
# 2. Test කරයි
# 3. Deploy කරයි
```

### Manual Deployment:

Digital Ocean App dashboard එකේ:
- **Actions** → **Force Rebuild and Deploy**

---

## 💰 Cost Estimation

### Basic Setup (Small/Medium Traffic):

- **App Platform**: $12/month (Basic tier)
- **Database**: $15/month (1GB RAM, 10GB storage)
- **Total**: ~$27/month

### Production Setup (High Traffic):

- **App Platform**: $50/month (Professional tier, auto-scaling)
- **Database**: $55/month (4GB RAM, 80GB storage)
- **Total**: ~$105/month

---

## 🔐 Security Best Practices

### ✅ Already Configured:

1. ✅ SSL/TLS encryption
2. ✅ Secure session cookies
3. ✅ Rate limiting
4. ✅ SQL injection prevention
5. ✅ XSS protection
6. ✅ CSRF protection
7. ✅ Helmet security headers

### 🎯 Additional Security (Recommended):

1. **Cloudflare**: App එක Cloudflare පිටින් run කරන්න
2. **Firewall**: Database එක app එක විතරක් access කරන්න allow කරන්න
3. **Backups**: Database daily backups enable කරන්න
4. **2FA**: Admin accounts සඳහා 2FA enable කරන්න

---

## 📞 Support & Resources

### Digital Ocean Documentation:
- [App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Managed Databases](https://docs.digitalocean.com/products/databases/)

### Application Documentation:
- `PRODUCTION-DEPLOYMENT-GUIDE.md` - Production settings
- `SECURITY-SUMMARY.md` - Security features
- `DATABASE_DOCUMENTATION.md` - Database schema

---

## ✅ Pre-Deployment Checklist

Deploy කරන්න කලින් check කරන්න:

- [ ] GitHub repository create කරලා code එක upload කරලාද?
- [ ] Digital Ocean database create කරලා connection string එක copy කරලාද?
- [ ] Database migration run කරලා tables create කරලාද?
- [ ] `SESSION_SECRET` generate කරලා set කරලාද?
- [ ] `BALANCE_ENCRYPTION_KEY` generate කරලා set කරලාද?
- [ ] `NODE_ENV=production` set කරලාද?
- [ ] `DO_DATABASE_URL` set කරලාද (NO quotes, NO whitespace)?
- [ ] Build command සහ Run command හරියටද configure කරලාද?
- [ ] HTTP port `8080` set කරලාද (NOT 5000!)?
- [ ] Auto-deploy enable කරලාද?

---

## 🎉 Deployment Complete!

Deploy කරලා ඉවර වුණාම:

1. ✅ Application live සහ accessible
2. ✅ Database connected සහ working
3. ✅ SSL/TLS enabled
4. ✅ Auto-scaling configured
5. ✅ Monitoring active
6. ✅ Auto-deploy enabled

**සාර්ථකව Digital Ocean එකට Deploy කරන්න පුළුවන්!** 🚀

---

**දැනුම් දීම**: මෙම application එක production-ready වෙලා තියෙන්නේ:
- ✅ Enterprise-grade security
- ✅ Scalable architecture
- ✅ Database connection pooling
- ✅ Error handling
- ✅ Logging & monitoring
- ✅ Auto-recovery mechanisms

**Last Updated**: November 09, 2025  
**Version**: 1.0  
**Platform**: Digital Ocean App Platform
