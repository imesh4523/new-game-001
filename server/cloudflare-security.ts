import type { Request, Response, NextFunction } from "express";
import { countryBlockingService } from "./country-blocking-service";

// Legacy exports for backward compatibility (deprecated)
export const BLOCKED_COUNTRIES: string[] = [];
export const ALLOWED_COUNTRIES: string[] = [];

// Middleware to block requests from specific countries
export async function blockCountries(req: Request, res: Response, next: NextFunction) {
  // Use the country detected by the earlier middleware which handles real IP extraction
  // This supports Cloudflare, other proxies, and has fallback for development
  const country = (req as any).cloudflare?.country;
  const clientIP = (req as any).clientIP;
  
  if (!country) {
    // No country detected, allow request
    return next();
  }

  try {
    // Refresh settings if needed (checks cache expiry internally)
    await countryBlockingService.refreshIfNeeded();

    // Check if country is blocked
    if (countryBlockingService.isCountryBlocked(country)) {
      console.log(`🚫 Blocked request from country: ${country} (IP: ${clientIP})`);
      return res.status(403).json({ 
        error: 'Access denied from your country',
        code: 'COUNTRY_BLOCKED',
        country: country
      });
    }

    next();
  } catch (error) {
    console.error('Error in country blocking middleware:', error);
    // On error, allow the request to proceed (fail open)
    next();
  }
}

// Middleware to validate Cloudflare requests (optional security layer)
export function validateCloudflareRequest(req: Request, res: Response, next: NextFunction) {
  // Only validate if in production and expecting Cloudflare
  if (process.env.NODE_ENV !== 'production' || !process.env.CLOUDFLARE_ENABLED) {
    return next();
  }

  // Check for Cloudflare headers
  const cfRay = req.headers['cf-ray'];
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  
  if (!cfRay || !cfConnectingIP) {
    // Request might be bypassing Cloudflare
    console.warn('⚠️ SECURITY: Request without Cloudflare headers detected', {
      ip: req.socket.remoteAddress,
      path: req.path,
      method: req.method
    });
    
    // Optional: Block non-Cloudflare requests in production
    if (process.env.CLOUDFLARE_STRICT === 'true') {
      return res.status(403).json({ 
        error: 'Direct access not allowed',
        code: 'CLOUDFLARE_REQUIRED' 
      });
    }
  }

  next();
}

// Enhanced security logging with Cloudflare data
export function logCloudflareRequest(req: Request, res: Response) {
  const cloudflareData = (req as any).cloudflare;
  
  if (cloudflareData?.ray) {
    console.log(`📊 Cloudflare Request: ${req.method} ${req.path}`, {
      ray: cloudflareData.ray,
      country: cloudflareData.country,
      ip: cloudflareData.ip,
      status: res.statusCode
    });
  }
}

// Block known bad user agents
const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /burpsuite/i,
  /havij/i,
  /metasploit/i,
];

export function blockBadUserAgents(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';
  
  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      console.warn('🚨 SECURITY: Blocked malicious user agent:', {
        userAgent,
        ip: (req as any).clientIP,
        path: req.path
      });
      
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'USER_AGENT_BLOCKED' 
      });
    }
  }
  
  next();
}

// Known malicious IP addresses and ranges
const BLOCKED_IPS: string[] = [
  // Tor exit nodes (sample - should be updated regularly)
  '185.220.101.1',
  '185.220.101.2',
  // Known VPN/Proxy abuse IPs (add as needed)
  // You can integrate with services like AbuseIPDB, IPQualityScore, etc.
];

// Suspicious IP patterns (private/reserved IPs that shouldn't access from internet)
const SUSPICIOUS_IP_PATTERNS = [
  /^0\./,           // Current network
  /^127\./,         // Loopback
  /^10\./,          // Private network
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
  /^192\.168\./,    // Private network
  /^169\.254\./,    // Link-local
  /^224\./,         // Multicast
  /^240\./,         // Reserved
];

// IP reputation check with enhanced detection
export function checkIPReputation(req: Request, res: Response, next: NextFunction) {
  const clientIP = (req as any).clientIP;
  
  if (!clientIP || clientIP === 'unknown') {
    // Auto-fix: Assign a default IP for development/testing
    if (!clientIP) {
      (req as any).clientIP = 'unknown';
    }
    return next();
  }
  
  // Check against blocked IPs list
  if (BLOCKED_IPS.includes(clientIP)) {
    console.warn('🚨 SECURITY: Blocked IP from reputation list:', {
      ip: clientIP,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    return res.status(403).json({ 
      error: 'Access denied',
      code: 'IP_BLOCKED' 
    });
  }
  
  // Check for suspicious IP patterns (when not behind proxy)
  const isCloudflareProxy = req.headers['cf-connecting-ip'];
  if (!isCloudflareProxy) {
    for (const pattern of SUSPICIOUS_IP_PATTERNS) {
      if (pattern.test(clientIP)) {
        console.warn('🚨 SECURITY: Suspicious IP pattern detected:', {
          ip: clientIP,
          path: req.path,
          pattern: pattern.source
        });
        // Log but don't block - might be legitimate local/proxy traffic
        break;
      }
    }
  }
  
  // Rate limit tracking per IP (basic implementation)
  const requestKey = `ip_requests_${clientIP}`;
  if (!(req as any).session) {
    (req as any).session = {};
  }
  
  next();
}

// Advanced SQL Injection Detection
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION.*SELECT/i,
  /SELECT.*FROM/i,
  /INSERT.*INTO/i,
  /DELETE.*FROM/i,
  /DROP.*TABLE/i,
  /UPDATE.*SET/i,
];

// Whitelisted field names that can contain special characters (passwords, API keys, etc.)
const WHITELISTED_FIELDS = [
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'withdrawalPassword',
  'currentWithdrawalPassword',
  'newWithdrawalPassword',
  'smtp_pass',
  'api_key',
  'secret',
  'token',
  'key',
  'value', // Allow 'value' field for system settings (which may contain passwords)
];

// Routes that should skip SQL injection detection (authenticated admin routes using parameterized queries)
const WHITELISTED_ROUTES = [
  '/api/admin/settings',
  '/api/admin/import',
  '/api/admin/export',
  '/api/auth/change-password',
  '/api/auth/change-withdrawal-password',
  '/api/auth/confirm-reset',
  '/api/auth/signup',
  '/api/auth/login',
];

export function detectSQLInjection(req: Request, res: Response, next: NextFunction) {
  // Skip SQL injection check for whitelisted routes
  if (WHITELISTED_ROUTES.some(route => req.path.startsWith(route))) {
    return next();
  }

  const checkValue = (value: string): boolean => {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
  };

  // Check if a field name should be whitelisted
  const isWhitelistedField = (fieldName: string): boolean => {
    return WHITELISTED_FIELDS.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  };

  // Check query parameters
  for (const key in req.query) {
    if (!isWhitelistedField(key) && typeof req.query[key] === 'string' && checkValue(req.query[key] as string)) {
      console.warn('🚨 SECURITY: SQL Injection attempt detected in query:', {
        ip: (req as any).clientIP,
        path: req.path,
        param: key
      });
      return res.status(403).json({ 
        error: 'Invalid request',
        code: 'SQL_INJECTION_DETECTED' 
      });
    }
  }

  // Check request body
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: any, parentKey?: string): boolean => {
      for (const key in obj) {
        // Skip whitelisted fields
        if (isWhitelistedField(key) || isWhitelistedField(parentKey || '')) {
          continue;
        }
        
        if (typeof obj[key] === 'string' && checkValue(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && checkObject(obj[key], key)) {
          return true;
        }
      }
      return false;
    };

    if (checkObject(req.body)) {
      console.warn('🚨 SECURITY: SQL Injection attempt detected in body:', {
        ip: (req as any).clientIP,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Invalid request',
        code: 'SQL_INJECTION_DETECTED' 
      });
    }
  }

  next();
}

// XSS Attack Detection
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
];

export function detectXSS(req: Request, res: Response, next: NextFunction) {
  const checkValue = (value: string): boolean => {
    return XSS_PATTERNS.some(pattern => pattern.test(value));
  };

  // Check query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string' && checkValue(req.query[key] as string)) {
      console.warn('🚨 SECURITY: XSS attempt detected in query:', {
        ip: (req as any).clientIP,
        path: req.path,
        param: key
      });
      return res.status(403).json({ 
        error: 'Invalid request',
        code: 'XSS_DETECTED' 
      });
    }
  }

  // Check request body
  if (req.body && typeof req.body === 'object') {
    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && checkValue(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && checkObject(obj[key])) {
          return true;
        }
      }
      return false;
    };

    if (checkObject(req.body)) {
      console.warn('🚨 SECURITY: XSS attempt detected in body:', {
        ip: (req as any).clientIP,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Invalid request',
        code: 'XSS_DETECTED' 
      });
    }
  }

  next();
}

// Path Traversal Detection
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./,
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e/i,
  /%252e%252e/i,
];

export function detectPathTraversal(req: Request, res: Response, next: NextFunction) {
  const urlPath = req.path;
  
  if (PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(urlPath))) {
    console.warn('🚨 SECURITY: Path traversal attempt detected:', {
      ip: (req as any).clientIP,
      path: req.path
    });
    return res.status(403).json({ 
      error: 'Invalid path',
      code: 'PATH_TRAVERSAL_DETECTED' 
    });
  }

  next();
}

// Request size monitoring and DDoS protection
export function monitorRequestSize(req: Request, res: Response, next: NextFunction) {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB max

  if (contentLength > maxSize) {
    console.warn('🚨 SECURITY: Oversized request detected:', {
      ip: (req as any).clientIP,
      path: req.path,
      size: contentLength
    });
    return res.status(413).json({ 
      error: 'Request too large',
      code: 'REQUEST_TOO_LARGE' 
    });
  }

  next();
}

// Suspicious header detection
export function detectSuspiciousHeaders(req: Request, res: Response, next: NextFunction) {
  const suspiciousHeaders = [
    'x-scanner',
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      console.warn('🚨 SECURITY: Suspicious header detected:', {
        ip: (req as any).clientIP,
        path: req.path,
        header: header
      });
      
      // Just log for now, don't block
    }
  }

  next();
}
