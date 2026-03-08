# Web Application Firewall (WAF) Integration - Cloudflare Protection

## 🛡️ Overview
This application now has comprehensive WAF protection integrated with Cloudflare to defend against various web attacks and threats.

## ✅ Activated Security Features

### 1. **Cloudflare Request Validation**
- Ensures all requests come through Cloudflare proxy
- Validates CF-Ray and CF-Connecting-IP headers
- Blocks direct access attempts when enabled

**Environment Variables:**
```bash
CLOUDFLARE_ENABLED=true          # Enable Cloudflare validation (production only)
CLOUDFLARE_STRICT=true           # Block non-Cloudflare requests
```

### 2. **Country-based Access Control**
- Block or allow specific countries
- Supports both blacklist and whitelist modes

**Configuration:**
Edit `server/cloudflare-security.ts`:
```typescript
// Blacklist mode - Block specific countries
export const BLOCKED_COUNTRIES = ['CN', 'RU', 'KP'];

// Whitelist mode - Only allow specific countries
export const ALLOWED_COUNTRIES = ['US', 'GB', 'LK'];
```

### 3. **Malicious User Agent Blocking**
Automatically blocks known scanning and hacking tools:
- SQLMap (SQL injection scanner)
- Nikto (web vulnerability scanner)
- Nmap (port scanner)
- Acunetix, Burp Suite, Havij, Metasploit

### 4. **IP Reputation Checking**
- Blocks known malicious IP addresses
- Logs suspicious activity
- Ready for IP reputation service integration

### 5. **SQL Injection Detection**
Detects and blocks:
- UNION-based injections
- Time-based blind injections
- Error-based injections
- Boolean-based blind injections
- Stacked queries

### 6. **XSS Attack Detection**
Blocks:
- Script tag injections
- Event handler injections
- iFrame injections
- JavaScript protocol handlers
- Embed/Object tag attacks

### 7. **Path Traversal Prevention**
Prevents:
- Directory traversal attempts (../)
- Encoded path traversal (%2e%2e)
- Windows-style path traversal (..\\)

### 8. **Request Size Monitoring**
- Limits request size to 10MB
- Prevents DDoS attacks via large payloads
- Protects against memory exhaustion

### 9. **Suspicious Header Detection**
Logs suspicious headers:
- X-Scanner
- X-Forwarded-Host
- X-Original-URL
- X-Rewrite-URL

## 🔧 Configuration

### Production Setup
1. Set environment variables in Replit Secrets:
```bash
CLOUDFLARE_ENABLED=true
CLOUDFLARE_STRICT=true
NODE_ENV=production
```

2. Configure country blocking in `server/cloudflare-security.ts`

3. Add blocked IPs to the BLOCKED_IPS array

### Development Mode
WAF features are active in development, but Cloudflare validation is disabled to allow local testing.

## 📊 Security Monitoring

All security events are logged with:
- Client IP address
- Request path
- Attack type
- Timestamp

Example log:
```
🚨 SECURITY: SQL Injection attempt detected in query: {
  ip: '192.168.1.1',
  path: '/api/users',
  param: 'id'
}
```

## 🚀 Additional Security Layers

### Rate Limiting
- API endpoints: 100 requests per 15 minutes
- Auth endpoints: 5 attempts per 15 minutes

### Request Sanitization
- MongoDB injection prevention
- Input sanitization on all requests

### HTTP Security Headers (Helmet)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

## 📝 Cloudflare Dashboard Setup

1. **DNS Settings:**
   - Enable Cloudflare proxy (orange cloud) for your domain
   - Ensure DNS records point to your Replit deployment

2. **SSL/TLS Settings:**
   - Set to "Full (strict)" mode
   - Enable "Always Use HTTPS"

3. **Firewall Rules (Cloudflare Dashboard):**
   - Create custom rules for additional protection
   - Enable Bot Fight Mode
   - Configure rate limiting rules

4. **Security Level:**
   - Set to "High" or "I'm Under Attack" if needed

5. **WAF Managed Rules:**
   - Enable OWASP Core Ruleset
   - Enable Cloudflare Managed Ruleset
   - Enable Cloudflare Specials

## 🔍 Testing WAF Protection

### Test SQL Injection Detection:
```bash
curl "http://your-app.com/api/users?id=1' OR '1'='1"
# Should return: 403 Forbidden
```

### Test XSS Detection:
```bash
curl -X POST http://your-app.com/api/data \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'
# Should return: 403 Forbidden
```

### Test Path Traversal:
```bash
curl "http://your-app.com/../../../etc/passwd"
# Should return: 403 Forbidden
```

## ⚠️ Important Notes

1. **Cloudflare Proxy Required**: For country blocking and some features to work, traffic must go through Cloudflare.

2. **False Positives**: Monitor logs for legitimate requests being blocked and adjust patterns if needed.

3. **Performance**: WAF checks add minimal latency (< 1ms per request).

4. **Custom Rules**: Modify patterns in `server/cloudflare-security.ts` based on your needs.

## 🔐 Best Practices

1. Always use HTTPS in production
2. Regularly update blocked country/IP lists
3. Monitor security logs daily
4. Keep WAF patterns updated
5. Test changes in development first
6. Enable Cloudflare's additional WAF features
7. Set up alerts for security events

## 📞 Support

For security incidents:
1. Check application logs
2. Review Cloudflare Analytics
3. Enable "I'm Under Attack" mode if needed
4. Contact your security team
