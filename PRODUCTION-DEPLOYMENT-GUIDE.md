# 🚀 Production Deployment Guide

මෙම ගයිඩ් එකෙන් ඔබේ gaming platform එක production mode එකට deploy කරන්න අවශ්‍ය සියලු තොරතුරු තියෙනවා.

---

## ✅ දැනට කරලා තියෙන Updates

### 1. **Production Security Validation** ✅
දැන් production mode එකේදී application එක start වෙද්දී critical environment variables validate කරනවා:
- ❌ `SESSION_SECRET` default value එකක් තියෙනවා නම් application එක start වෙන්නේ නැහැ
- ⚠️ `CLOUDFLARE_ENABLED` set කරලා නැත්නම් warning එකක් පෙන්වනවා

### 2. **Content Security Policy (CSP)** ✅
Production එකේදී දැන් enable කරලා තියෙනවා:
```typescript
// Development: Disabled
// Production: Strict CSP headers enabled
```

**Protected against:**
- XSS (Cross-Site Scripting)
- Code injection
- Unauthorized script execution
- Data theft

### 3. **Enhanced CORS Configuration** ✅
දැන් wildcard domain support සහ custom domains support කරනවා:
```typescript
// Production allowed origins:
- *.replit.app (all subdomains)
- *.replit.dev (all subdomains)
- Custom domain (CUSTOM_DOMAIN env variable එකෙන්)
```

### 4. **Stricter Rate Limiting** ✅

| Endpoint | Development | Production |
|----------|-------------|------------|
| **General API** | 10,000 req/15min | 5,000 req/15min |
| **Auth endpoints** | 100 req/15min | 50 req/15min |
| **Login attempts** | 15/15min | 5/15min |
| **Withdrawals** | 15/15min | 3/hour |
| **Place bets** | 200/min | 100/min |

### 5. **Request Body Size Limits** ✅
```
Development: 10MB max
Production:  5MB max
```

### 6. **Session Cookie Settings** ✅
Production එකේදී වඩා secure:
```typescript
cookie: {
  secure: true,           // HTTPS only
  httpOnly: true,         // No JavaScript access
  maxAge: 12 hours,       // Shorter session time
  sameSite: 'strict'      // CSRF protection
}
```

---

## 🔧 Production Deployment Steps

### Step 1: Set Environment Variables in Replit Secrets

**අනිවාර්ය (Required):**
```bash
NODE_ENV=production
SESSION_SECRET=<generate-secure-random-string>
BALANCE_ENCRYPTION_KEY=<generate-secure-hex-key>
```

**Session Secret Generate කරන්නේ කොහොමද:**
```bash
# Terminal එකේ run කරන්න:
openssl rand -base64 32

# එතකොට මෙහෙම එකක් එනවා:
# XyZ9mN2kP8qR4tV6wH3jL5fG7bC1dE0aS8uI6oK4m=
```

**Balance Encryption Key Generate කරන්නේ කොහොමද:**
```bash
# Terminal එකේ run කරන්න:
openssl rand -hex 32

# එතකොට මෙහෙම එකක් එනවා (64 hex characters):
# 3f2a1b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
```

⚠️ **IMPORTANT:** Balance encryption key එක නැතිව production application එක start වෙන්නේ නැහැ!

**Highly Recommended:**
```bash
CLOUDFLARE_ENABLED=true
CLOUDFLARE_STRICT=true
```

**Optional but useful:**
```bash
# Custom domain එකක් තියෙනවා නම්
CUSTOM_DOMAIN=https://yourdomain.com

# Database
DATABASE_URL=postgresql://...

# Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_SIGNAL_CHAT_ID=your_chat_id
```

---

### Step 2: Cloudflare Setup (Recommended)

#### 2.1 Cloudflare Dashboard Settings:

1. **Proxy Status:**
   - ✅ Enable proxy (orange cloud icon)
   - Cloudflare හරහා සියලු traffic එකක් යන්න ඕනේ

2. **SSL/TLS Settings:**
   - Navigate: SSL/TLS → Overview
   - Select: **"Full (strict)"**

3. **WAF (Web Application Firewall):**
   - Navigate: Security → WAF
   - Enable: **Managed Rules**
   - Enable: **OWASP Core Ruleset**

4. **Bot Fight Mode:**
   - Navigate: Security → Bots
   - Enable: **Bot Fight Mode**

5. **Rate Limiting:**
   - Navigate: Security → Rate Limiting
   - Add rules for extra protection (optional)

#### 2.2 Why Cloudflare?

- 🛡️ DDoS Protection
- 🚀 CDN & Caching
- 🔒 SSL/TLS
- 🤖 Bot Protection
- 📊 Analytics
- 🌍 Global Performance

---

### Step 3: Country Blocking (Optional)

ඔබට specific countries block කරන්න අවශ්‍ය නම්:

**File:** `server/cloudflare-security.ts`

**Option A - Blacklist Mode:**
```typescript
// මේ countries block කරනවා
export const BLOCKED_COUNTRIES = ['CN', 'RU', 'KP', 'IR'];
```

**Option B - Whitelist Mode:**
```typescript
// මේ countries විතරක් allow කරනවා
export const ALLOWED_COUNTRIES = ['LK', 'IN', 'US', 'GB', 'AU', 'SG'];
```

දැන් default එකක් නෑ - කිසිම රටක් block වෙන්නේ නැහැ.

---

### Step 4: Database Setup

**Development:** In-memory storage (data නැති වෙනවා restart එකෙන්)
**Production:** PostgreSQL database use කරන්න ඕනේ

```bash
# Replit Secrets එකේ:
DATABASE_URL=postgresql://username:password@host:port/database
```

---

### Step 5: Pre-Deployment Checklist

Production එකට යන්න කලින් check කරන්න:

- [ ] `NODE_ENV=production` set කරලාද?
- [ ] `SESSION_SECRET` unique secure value එකක් set කරලාද?
- [ ] `CLOUDFLARE_ENABLED=true` set කරලාද?
- [ ] `CLOUDFLARE_STRICT=true` set කරලාද?
- [ ] Cloudflare proxy enable කරලාද?
- [ ] SSL/TLS "Full (strict)" mode එකේද?
- [ ] WAF Managed Rules enable කරලාද?
- [ ] Bot Fight Mode enable කරලාද?
- [ ] Database URL set කරලාද?
- [ ] Custom domain තියෙනවා නම් `CUSTOM_DOMAIN` set කරලාද?
- [ ] Country blocking අවශ්‍ය නම් configure කරලාද?

---

## 🔒 Production Security Features

### Multi-Layer Protection:

1. **Cloudflare WAF** - First line of defense
2. **Advanced Rate Limiting** - Token bucket algorithm
3. **IP Reputation System** - Track & block bad actors
4. **Bot Detection** - Advanced fingerprinting
5. **Attack Prevention:**
   - SQL Injection
   - XSS (Cross-Site Scripting)
   - CSRF (Cross-Site Request Forgery)
   - Path Traversal
   - NoSQL Injection
   - Data Exfiltration
6. **Behavioral Analysis** - Detect suspicious patterns
7. **Request Integrity** - Signature verification
8. **Session Security** - Secure cookies, HTTPS only

---

## 📊 Monitoring & Logs

### Security Events Logged:

```typescript
// Console එකේ මේ වගේ logs දකින්න පුළුවන්:
🚨 SECURITY: SQL Injection attempt detected
🚨 SECURITY: Rate limit exceeded
🚨 SECURITY: Blocked IP attempted access
⚠️  SECURITY: Low reputation IP accessing
⚠️  CORS: Blocked request from unauthorized origin
```

### What to Monitor:

1. **Rate limit violations** - Unusual traffic patterns
2. **Failed authentication attempts** - Brute force attacks
3. **Blocked IPs** - Security threats
4. **CORS errors** - Unauthorized domain access
5. **Server errors** - Application issues

---

## 🔥 Critical Warnings

### ❌ DO NOT:

1. **Use default SESSION_SECRET in production**
   - Application එක start වෙන්නේ නැහැ
   
2. **Disable HTTPS in production**
   - Cookies secure නෑ

3. **Ignore CLOUDFLARE_ENABLED warning**
   - WAF protection නැති වෙනවා

4. **Use in-memory storage in production**
   - Data නැති වෙනවා restart එකෙන්

5. **Expose sensitive credentials**
   - Always use Replit Secrets

---

## 🎯 Performance Optimization

### Production Optimizations:

1. **Shorter session duration** (12h vs 24h)
2. **Stricter rate limits** (prevent abuse)
3. **Smaller request body limits** (5MB vs 10MB)
4. **Content Security Policy** (block XSS)
5. **CORS restrictions** (authorized domains only)

---

## 🧪 Testing Production Setup

### Local Testing:

```bash
# Terminal එකේ:
NODE_ENV=production npm run dev
```

මේක run කරද්දී:
- SESSION_SECRET error එකක් එනවා නම් හරි (validate වෙනවා)
- CLOUDFLARE_ENABLED warning එනවා නම් හරි (expected)

### Production Testing:

1. **Login attempts:** 5 වතාවට වඩා try කරන්න - rate limit එනවාද බලන්න
2. **CORS:** වෙනත් domain එකක් ඉඳන් access කරන්න try කරන්න - block වෙනවාද බලන්න
3. **HTTPS:** http:// එකෙන් access කරන්න try කරන්න - redirect වෙනවාද බලන්න
4. **Session:** 12 පැයකට පස්සේ session expire වෙනවාද බලන්න

---

## 📞 Support & Documentation

- **WAF Setup:** `WAF-SETUP.md`
- **Security Summary:** `SECURITY-SUMMARY.md`
- **Advanced Security:** `ADVANCED-SECURITY-LAYER.md`

---

## 🎉 Deployment Complete!

Production එකට deploy කරලා ඉවර වුණාම:

1. ✅ Application secure ✓
2. ✅ Rate limiting active ✓
3. ✅ WAF protection active ✓
4. ✅ Bot detection active ✓
5. ✅ Attack prevention active ✓

**සාර්ථකව Production Deployment කරන්න පුළුවන්!** 🚀

---

**Last Updated:** October 22, 2025
**Version:** 2.0
**Security Level:** Enterprise-grade
