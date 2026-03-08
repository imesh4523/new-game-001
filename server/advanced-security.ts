import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ============================================================================
// ADVANCED BOT DETECTION & REQUEST FINGERPRINTING
// ============================================================================

interface RequestFingerprint {
  hash: string;
  timestamp: number;
  suspicionScore: number;
  indicators: string[];
}

const fingerprintCache = new Map<string, RequestFingerprint>();
const FINGERPRINT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Advanced bot detection using multiple indicators:
 * - Missing/inconsistent headers
 * - Suspicious header patterns
 * - Request timing analysis
 * - Browser fingerprinting
 */
export function advancedBotDetection(req: Request, res: Response, next: NextFunction) {
  const suspicionScore = calculateSuspicionScore(req);
  const indicators: string[] = [];

  // Check for missing common browser headers
  if (!req.headers['accept-language']) {
    suspicionScore.score += 20;
    indicators.push('missing_accept_language');
  }

  if (!req.headers['accept']) {
    suspicionScore.score += 15;
    indicators.push('missing_accept');
  }

  if (!req.headers['accept-encoding']) {
    suspicionScore.score += 10;
    indicators.push('missing_accept_encoding');
  }

  // Check for suspicious header combinations
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('HeadlessChrome') || userAgent.includes('PhantomJS')) {
    suspicionScore.score += 50;
    indicators.push('headless_browser');
  }

  // Check for automation indicators
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' && !req.headers['referer']) {
    suspicionScore.score += 25;
    indicators.push('suspicious_ajax');
  }

  // Check for sequential request patterns (fingerprinting)
  const fingerprint = generateRequestFingerprint(req);
  const cachedFingerprint = fingerprintCache.get(fingerprint.hash);
  
  if (cachedFingerprint) {
    const timeDiff = Date.now() - cachedFingerprint.timestamp;
    
    // Extremely fast sequential requests (< 50ms) indicate automation
    if (timeDiff < 50) {
      suspicionScore.score += 30;
      indicators.push('rapid_sequential_requests');
    }
  }

  fingerprintCache.set(fingerprint.hash, {
    hash: fingerprint.hash,
    timestamp: Date.now(),
    suspicionScore: suspicionScore.score + suspicionScore.indicators.reduce((sum, i) => sum + i.score, 0),
    indicators
  });

  // Clean old fingerprints
  if (fingerprintCache.size > 10000) {
    const now = Date.now();
    for (const [key, value] of Array.from(fingerprintCache.entries())) {
      if (now - value.timestamp > FINGERPRINT_CACHE_TTL) {
        fingerprintCache.delete(key);
      }
    }
  }

  // Store suspicion data for logging and analysis
  (req as any).securityFingerprint = {
    score: suspicionScore.score + suspicionScore.indicators.reduce((sum, i) => sum + i.score, 0),
    indicators: [...indicators, ...suspicionScore.indicators.map(i => i.name)],
    hash: fingerprint.hash
  };

  // Block if suspicion score is too high
  const totalScore = suspicionScore.score + suspicionScore.indicators.reduce((sum, i) => sum + i.score, 0);
  if (totalScore > 100) {
    console.warn('🤖 SECURITY: High suspicion score - potential bot detected:', {
      score: totalScore,
      indicators: [...indicators, ...suspicionScore.indicators.map(i => i.name)],
      ip: (req as any).clientIP,
      path: req.path,
      userAgent: req.headers['user-agent']
    });

    // Challenge instead of immediate block for scores 100-150
    if (totalScore < 150) {
      return res.status(403).json({
        error: 'Security verification required',
        code: 'BOT_SUSPECTED',
        challenge: true
      });
    }

    // Hard block for very high scores
    return res.status(403).json({
      error: 'Access denied',
      code: 'BOT_DETECTED'
    });
  }

  next();
}

function calculateSuspicionScore(req: Request): { score: number; indicators: Array<{ name: string; score: number }> } {
  let score = 0;
  const indicators: Array<{ name: string; score: number }> = [];

  // Check for automation frameworks
  const userAgent = req.headers['user-agent'] || '';
  const automationIndicators = [
    { pattern: /selenium/i, name: 'selenium', score: 50 },
    { pattern: /webdriver/i, name: 'webdriver', score: 50 },
    { pattern: /playwright/i, name: 'playwright', score: 50 },
    { pattern: /puppeteer/i, name: 'puppeteer', score: 50 },
    { pattern: /bot/i, name: 'bot_in_ua', score: 30 },
    { pattern: /crawler/i, name: 'crawler', score: 30 },
    { pattern: /spider/i, name: 'spider', score: 30 },
  ];

  for (const indicator of automationIndicators) {
    if (indicator.pattern.test(userAgent)) {
      indicators.push({ name: indicator.name, score: indicator.score });
    }
  }

  // Check for webdriver properties (common in automation)
  const hasWebDriverHeader = req.headers['webdriver'] === 'true';
  if (hasWebDriverHeader) {
    indicators.push({ name: 'webdriver_header', score: 60 });
  }

  // Check for CDP (Chrome DevTools Protocol) indicators
  if (req.headers['chrome-target'] || req.headers['devtools-request-id']) {
    indicators.push({ name: 'cdp_detected', score: 40 });
  }

  return { score, indicators };
}

function generateRequestFingerprint(req: Request): { hash: string } {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    (req as any).clientIP || '',
    req.headers['sec-ch-ua'] || '',
    req.headers['sec-ch-ua-mobile'] || '',
    req.headers['sec-ch-ua-platform'] || '',
  ];

  const fingerprint = components.join('|');
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');

  return { hash };
}

// ============================================================================
// BEHAVIORAL ANALYSIS & ANOMALY DETECTION
// ============================================================================

interface UserBehavior {
  requestCount: number;
  failedAttempts: number;
  lastRequest: number;
  paths: Map<string, number>;
  methods: Map<string, number>;
  anomalyScore: number;
}

const behaviorTracking = new Map<string, UserBehavior>();

/**
 * Track user behavior patterns to detect anomalies:
 * - Unusual request patterns
 * - Failed authentication attempts
 * - Rapid endpoint scanning
 * - Abnormal navigation flows
 */
export function behavioralAnalysis(req: Request, res: Response, next: NextFunction) {
  const identifier = (req as any).clientIP || 'unknown';
  const currentTime = Date.now();
  
  // Be more lenient with 'unknown' IPs in both development and production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isUnknownIP = identifier === 'unknown';
  // Skip blocking in development mode OR for unknown IPs to prevent false positives
  // Unknown IPs can occur in legitimate load balancer/proxy scenarios
  const shouldSkipBlocking = isDevelopment || isUnknownIP;

  let behavior = behaviorTracking.get(identifier);
  if (!behavior) {
    behavior = {
      requestCount: 0,
      failedAttempts: 0,
      lastRequest: currentTime,
      paths: new Map(),
      methods: new Map(),
      anomalyScore: 0
    };
    behaviorTracking.set(identifier, behavior);
  }

  // Update request count
  behavior.requestCount++;

  // Track path access
  const pathCount = behavior.paths.get(req.path) || 0;
  behavior.paths.set(req.path, pathCount + 1);

  // Track method usage
  const methodCount = behavior.methods.get(req.method) || 0;
  behavior.methods.set(req.method, methodCount + 1);

  // Detect rapid requests (potential scanning)
  const timeSinceLastRequest = currentTime - behavior.lastRequest;
  if (timeSinceLastRequest < 100) { // Less than 100ms
    behavior.anomalyScore += 10;
  }

  // Detect endpoint scanning (accessing many different paths rapidly)
  if (behavior.paths.size > 20 && behavior.requestCount < 50) {
    behavior.anomalyScore += 20;
  }

  // Detect unusual method usage (too many non-GET requests)
  const nonGetRatio = ((behavior.methods.get('POST') || 0) + 
                       (behavior.methods.get('PUT') || 0) + 
                       (behavior.methods.get('DELETE') || 0)) / behavior.requestCount;
  if (nonGetRatio > 0.7) {
    behavior.anomalyScore += 15;
  }

  behavior.lastRequest = currentTime;

  // Store for response tracking
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    // Track failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      behavior!.failedAttempts++;
      behavior!.anomalyScore += 5;
    }
    return originalJson(data);
  };

  // Block if anomaly score is too high (unless in development)
  // Increased threshold to 150 to reduce false positives
  if (behavior.anomalyScore > 150 && !shouldSkipBlocking) {
    console.warn('🚨 SECURITY: High anomaly score detected:', {
      ip: identifier,
      score: behavior.anomalyScore,
      requestCount: behavior.requestCount,
      failedAttempts: behavior.failedAttempts,
      uniquePaths: behavior.paths.size
    });

    return res.status(403).json({
      error: 'Suspicious activity detected',
      code: 'ANOMALY_DETECTED'
    });
  }

  // Decay anomaly score over time (every 30 seconds)
  if (timeSinceLastRequest > 30000) {
    behavior.anomalyScore = Math.max(0, behavior.anomalyScore - 5);
  }

  // Clean up old behavior data
  if (behaviorTracking.size > 5000) {
    const cutoffTime = currentTime - (15 * 60 * 1000); // 15 minutes
    for (const [key, value] of Array.from(behaviorTracking.entries())) {
      if (value.lastRequest < cutoffTime) {
        behaviorTracking.delete(key);
      }
    }
  }

  next();
}

// ============================================================================
// ADVANCED ENCRYPTION & DATA INTEGRITY
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data in responses
 */
export function encryptSensitiveData(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  });
}

/**
 * Decrypt encrypted data
 */
export function decryptSensitiveData(encryptedData: string): string {
  const { encrypted, iv, authTag } = JSON.parse(encryptedData);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// REQUEST INTEGRITY VERIFICATION
// ============================================================================

/**
 * Generate HMAC signature for request verification
 */
export function generateRequestSignature(data: any, timestamp: number): string {
  const secret = process.env.REQUEST_SECRET || ENCRYPTION_KEY;
  const payload = JSON.stringify(data) + timestamp.toString();
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify request hasn't been tampered with
 */
export function verifyRequestIntegrity(req: Request, res: Response, next: NextFunction) {
  // Only verify POST, PUT, DELETE requests
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  const signature = req.headers['x-request-signature'] as string;
  const timestamp = req.headers['x-request-timestamp'] as string;

  // Skip verification for requests without signature (backward compatibility)
  if (!signature || !timestamp) {
    return next();
  }

  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();

  // Reject requests older than 5 minutes (replay attack prevention)
  if (currentTime - requestTime > 5 * 60 * 1000) {
    console.warn('🚨 SECURITY: Request timestamp too old (replay attack?):', {
      ip: (req as any).clientIP,
      path: req.path,
      age: currentTime - requestTime
    });

    return res.status(403).json({
      error: 'Request expired',
      code: 'REPLAY_ATTACK_DETECTED'
    });
  }

  // Verify signature
  const expectedSignature = generateRequestSignature(req.body, requestTime);
  if (signature !== expectedSignature) {
    console.warn('🚨 SECURITY: Invalid request signature (tampering detected):', {
      ip: (req as any).clientIP,
      path: req.path
    });

    return res.status(403).json({
      error: 'Invalid request signature',
      code: 'TAMPER_DETECTED'
    });
  }

  next();
}

// ============================================================================
// HONEYPOT FIELD DETECTION
// ============================================================================

/**
 * Detect honeypot fields in form submissions
 * Honeypots are hidden fields that legitimate users won't fill but bots will
 */
export function detectHoneypot(req: Request, res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  // Skip honeypot detection for withdrawal endpoints where 'address' is a legitimate field
  const isWithdrawalEndpoint = req.path.includes('/withdraw') || req.path.includes('/payments/withdraw');
  
  // Common honeypot field names
  const honeypotFields = [
    'website',
    'url',
    'company',
    'fax',
    'phone_number',
    'honeypot',
    'bot_field'
  ];
  
  // Only add 'address' to honeypot fields if NOT a withdrawal endpoint
  if (!isWithdrawalEndpoint) {
    honeypotFields.push('address');
  }

  for (const field of honeypotFields) {
    if (req.body[field] && req.body[field].toString().trim() !== '') {
      console.warn('🚨 SECURITY: Honeypot field filled (bot detected):', {
        ip: (req as any).clientIP,
        path: req.path,
        field: field
      });

      return res.status(403).json({
        error: 'Invalid submission',
        code: 'BOT_DETECTED'
      });
    }
  }

  next();
}

// ============================================================================
// ANTI-SCRAPING PROTECTION
// ============================================================================

const scrapeTracking = new Map<string, { count: number; lastReset: number }>();

/**
 * Detect and prevent data scraping attempts
 */
export function antiScraping(req: Request, res: Response, next: NextFunction) {
  const identifier = (req as any).clientIP || 'unknown';
  const currentTime = Date.now();

  let tracking = scrapeTracking.get(identifier);
  if (!tracking) {
    tracking = { count: 0, lastReset: currentTime };
    scrapeTracking.set(identifier, tracking);
  }

  // Reset counter every hour
  if (currentTime - tracking.lastReset > 60 * 60 * 1000) {
    tracking.count = 0;
    tracking.lastReset = currentTime;
  }

  tracking.count++;

  // Block if too many requests in an hour (adjust threshold as needed)
  if (tracking.count > 50000) {
    console.warn('🚨 SECURITY: Possible scraping attempt detected:', {
      ip: identifier,
      requestCount: tracking.count,
      path: req.path
    });

    return res.status(429).json({
      error: 'Too many requests',
      code: 'SCRAPING_DETECTED'
    });
  }

  next();
}

// ============================================================================
// CLEAN UP FUNCTIONS
// ============================================================================

/**
 * Periodic cleanup of tracking data to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  
  // Clean fingerprint cache
  for (const [key, value] of Array.from(fingerprintCache.entries())) {
    if (now - value.timestamp > FINGERPRINT_CACHE_TTL) {
      fingerprintCache.delete(key);
    }
  }

  // Clean behavior tracking
  const behaviorCutoff = now - (15 * 60 * 1000);
  for (const [key, value] of Array.from(behaviorTracking.entries())) {
    if (value.lastRequest < behaviorCutoff) {
      behaviorTracking.delete(key);
    }
  }

  // Clean scrape tracking
  const scrapeCutoff = now - (2 * 60 * 60 * 1000);
  for (const [key, value] of Array.from(scrapeTracking.entries())) {
    if (value.lastReset < scrapeCutoff) {
      scrapeTracking.delete(key);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes
