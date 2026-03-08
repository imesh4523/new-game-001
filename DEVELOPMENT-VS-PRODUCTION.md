# Development vs Production - Quick Reference

මෙන්න development සහ production mode එකේ වෙනස්කම් comparison එකක්.

---

## 🔧 Rate Limiting Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **General API Requests** | 10,000 / 15min | 5,000 / 15min |
| **Auth Endpoints** | 100 / 15min | 50 / 15min |
| **Login Attempts** | 15 / 15min | **5 / 15min** |
| **Withdrawal Requests** | 15 / 15min | **3 / 1 hour** |
| **Bet Placement** | 200 / 1min | 100 / 1min |

---

## 🍪 Session & Cookies

| Setting | Development | Production |
|---------|-------------|------------|
| **Cookie Secure** | ❌ HTTP allowed | ✅ HTTPS only |
| **Session Duration** | 24 hours | **12 hours** |
| **Cookie SameSite** | strict | strict |
| **HTTP Only** | ✅ Yes | ✅ Yes |

---

## 📦 Request Size Limits

| Feature | Development | Production |
|---------|-------------|------------|
| **Max Body Size** | 10 MB | **5 MB** |
| **URL Encoded Limit** | 10 MB | **5 MB** |

---

## 🛡️ Security Headers (CSP)

| Feature | Development | Production |
|---------|-------------|------------|
| **Content Security Policy** | ❌ Disabled | ✅ Enabled |
| **XSS Protection** | Basic | **Strict** |
| **Frame Options** | Basic | **Strict (none)** |
| **Object Sources** | Allowed | **Blocked** |

---

## 🌐 CORS Configuration

### Development:
```typescript
origin: true  // සියලු domains allow
```

### Production:
```typescript
origin: [
  /^https:\/\/.*\.replit\.app$/,    // *.replit.app
  /^https:\/\/.*\.replit\.dev$/,    // *.replit.dev
  process.env.CUSTOM_DOMAIN          // Custom domain
]
```

---

## 🔒 Cloudflare WAF

| Feature | Development | Production |
|---------|-------------|------------|
| **WAF Validation** | ⚠️ Warning only | 🚫 **Blocks if not Cloudflare** |
| **Cloudflare Strict** | Disabled | **Enabled** |
| **Country Blocking** | Disabled | Configurable |
| **Bot Detection** | Active | **Strict** |

---

## 🔐 Environment Variables

### Development - කැමති:
```bash
NODE_ENV=development
```

### Production - අනිවාර්ය:
```bash
NODE_ENV=production
SESSION_SECRET=<secure-random-32-char-string>
CLOUDFLARE_ENABLED=true
CLOUDFLARE_STRICT=true
DATABASE_URL=postgresql://...
```

### Production - Optional:
```bash
CUSTOM_DOMAIN=https://yourdomain.com
TELEGRAM_BOT_TOKEN=...
TELEGRAM_SIGNAL_CHAT_ID=...
```

---

## ⚠️ Validation Checks

### Development:
- ✅ Starts even with default SESSION_SECRET
- ⚠️ Warnings logged but doesn't block

### Production:
- ❌ **Exits if SESSION_SECRET is default**
- ❌ **Exits if SESSION_SECRET is not set**
- ⚠️ Warning if CLOUDFLARE_ENABLED not set

---

## 📊 Adaptive Rate Limiting (IP Reputation)

| IP Reputation Score | Capacity | Refill Rate |
|---------------------|----------|-------------|
| **Good (70-100)** | 100 tokens | 10 tokens/sec |
| **Medium (50-69)** | 75 tokens | 7 tokens/sec |
| **Low (30-49)** | 50 tokens | 5 tokens/sec |
| **Very Low (<30)** | 20 tokens | 2 tokens/sec |
| **Score < 20** | 🚫 **Blocked 30min** | - |

---

## 🎯 Quick Comparison Summary

### Development Mode:
- 🔓 Relaxed security for testing
- 🚀 Higher rate limits
- 📝 All origins allowed
- ⏱️ Longer sessions
- 📦 Larger file uploads
- ⚠️ Warnings only

### Production Mode:
- 🔒 Strict security
- 🛡️ Lower rate limits
- 🌐 Restricted domains
- ⏱️ Shorter sessions
- 📦 Smaller file uploads
- ❌ Hard validation checks
- ✅ CSP enabled
- 🔐 HTTPS only
- 🛡️ Cloudflare required

---

## 🚦 Switching Between Modes

### Switch to Development:
```bash
# Replit Secrets එකේ:
NODE_ENV=development

# හෝ terminal එකේ:
npm run dev
```

### Switch to Production:
```bash
# Replit Secrets එකේ:
NODE_ENV=production
SESSION_SECRET=<your-secure-secret>
CLOUDFLARE_ENABLED=true
CLOUDFLARE_STRICT=true

# Then:
npm start
```

---

## 📈 Impact on Users

### Development:
- ✅ Easy testing
- ✅ More forgiving
- ✅ Quick iteration
- ⚠️ Not secure for real users

### Production:
- ✅ Secure for real users
- ✅ Protected from attacks
- ✅ Rate limits prevent abuse
- ✅ HTTPS encryption
- ⚠️ Stricter (may inconvenience testers)

---

**Pro Tip:** Development mode එකේ test කරලා හරි වැඩ කරනවා නම් විතරක් production එකට යන්න!

---

**Last Updated:** October 22, 2025
