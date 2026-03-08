import type { Request, Response, NextFunction } from "express";

// ============================================================================
// ADVANCED RATE LIMITING WITH TOKEN BUCKET ALGORITHM
// ============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  violations: number;
}

interface IPReputation {
  score: number; // 0-100, lower is worse
  violations: number;
  lastViolation: number;
  blocked: boolean;
  blockedUntil?: number;
}

const tokenBuckets = new Map<string, TokenBucket>();
const ipReputations = new Map<string, IPReputation>();

const BUCKET_CAPACITY = 500; // Max tokens (increased for normal usage)
const REFILL_RATE = 50; // Tokens per second (increased for normal usage)
const REFILL_INTERVAL = 1000; // 1 second

/**
 * Token bucket rate limiter
 * More sophisticated than simple rate limiting - allows burst traffic while maintaining average rate
 */
export function tokenBucketRateLimiter(
  capacity: number = BUCKET_CAPACITY,
  refillRate: number = REFILL_RATE
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = (req as any).clientIP || 'unknown';
    const now = Date.now();

    let bucket = tokenBuckets.get(identifier);
    
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        violations: 0
      };
      tokenBuckets.set(identifier, bucket);
    }

    // Refill tokens based on time elapsed
    const timeElapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timeElapsed / REFILL_INTERVAL) * refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      next();
    } else {
      // Rate limit exceeded
      bucket.violations++;
      
      // Update IP reputation
      updateIPReputation(identifier, 'rate_limit_exceeded');

      console.warn('🚨 SECURITY: Rate limit exceeded (token bucket):', {
        ip: identifier,
        path: req.path,
        violations: bucket.violations
      });

      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(REFILL_INTERVAL / 1000)
      });
    }
  };
}

/**
 * IP Reputation scoring system
 * Tracks bad behavior and progressively restricts access
 */
function updateIPReputation(ip: string, violation: string) {
  let reputation = ipReputations.get(ip);
  
  if (!reputation) {
    reputation = {
      score: 100, // Start with perfect score
      violations: 0,
      lastViolation: Date.now(),
      blocked: false
    };
    ipReputations.set(ip, reputation);
  }

  reputation.violations++;
  reputation.lastViolation = Date.now();

  // Decrease score based on violation type
  const scoreDecrements: Record<string, number> = {
    'rate_limit_exceeded': 1, // Very lenient for normal usage
    'failed_auth': 5, // Reduced for normal login attempts
    'suspicious_activity': 8, // More lenient
    'bot_detected': 15, // More lenient
    'attack_attempt': 25 // More lenient
  };

  reputation.score = Math.max(0, reputation.score - (scoreDecrements[violation] || 2));

  // Block only at extremely low scores (very aggressive behavior only)
  if (reputation.score < 5) { // Changed from 10 to 5 - only block truly malicious IPs
    reputation.blocked = true;
    reputation.blockedUntil = Date.now() + (10 * 60 * 1000); // Block for 10 minutes (reduced from 15)
  }

  // Gradually restore reputation over time (if no recent violations)
  const timeSinceLastViolation = Date.now() - reputation.lastViolation;
  if (timeSinceLastViolation > 60 * 60 * 1000) { // 1 hour
    reputation.score = Math.min(100, reputation.score + 1);
    if (reputation.score > 50) {
      reputation.blocked = false;
      reputation.blockedUntil = undefined;
    }
  }
}

/**
 * Get IP reputation score
 */
export function getIPReputation(ip: string): IPReputation {
  const reputation = ipReputations.get(ip);
  if (!reputation) {
    return {
      score: 100,
      violations: 0,
      lastViolation: 0,
      blocked: false
    };
  }
  return reputation;
}

/**
 * Middleware to check IP reputation
 */
export function checkReputationScore(req: Request, res: Response, next: NextFunction) {
  const ip = (req as any).clientIP || 'unknown';
  
  // In development mode or when IP is unknown, skip blocking
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment && ip === 'unknown') {
    return next();
  }
  
  const reputation = getIPReputation(ip);

  // Check if IP is currently blocked
  if (reputation.blocked) {
    if (reputation.blockedUntil && Date.now() < reputation.blockedUntil) {
      console.warn('🚨 SECURITY: Blocked IP attempted access:', {
        ip,
        score: reputation.score,
        violations: reputation.violations,
        path: req.path
      });

      const minutesRemaining = Math.ceil((reputation.blockedUntil - Date.now()) / (60 * 1000));

      return res.status(403).json({
        error: 'Access temporarily blocked due to suspicious activity',
        code: 'IP_BLOCKED',
        retryAfter: minutesRemaining
      });
    } else {
      // Block period expired
      reputation.blocked = false;
      reputation.blockedUntil = undefined;
    }
  }

  // Warn if reputation is low but not blocked
  if (reputation.score < 50) {
    console.warn('⚠️ SECURITY: Low reputation IP accessing:', {
      ip,
      score: reputation.score,
      violations: reputation.violations,
      path: req.path
    });
  }

  next();
}

/**
 * Adaptive rate limiting based on IP reputation
 * Good IPs get higher limits, suspicious IPs get lower limits
 */
export function adaptiveRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req as any).clientIP || 'unknown';
  const reputation = getIPReputation(ip);

  // Adjust capacity based on reputation score
  let capacity = BUCKET_CAPACITY;
  let refillRate = REFILL_RATE;

  if (reputation.score < 20) {
    capacity = 50; // More lenient for low reputation
    refillRate = 5;
  } else if (reputation.score < 40) {
    capacity = 100; // More lenient
    refillRate = 10;
  } else if (reputation.score < 60) {
    capacity = 200; // Slightly reduced
    refillRate = 20;
  }
  // Else use default values for good reputation

  return tokenBucketRateLimiter(capacity, refillRate)(req, res, next);
}

/**
 * Endpoint-specific rate limiting
 */
export function endpointRateLimiter(config: {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
}) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.includes(config.endpoint)) {
      return next();
    }

    const identifier = (req as any).clientIP || 'unknown';
    const now = Date.now();

    let tracking = requestCounts.get(identifier);
    
    if (!tracking || now > tracking.resetAt) {
      tracking = {
        count: 0,
        resetAt: now + config.windowMs
      };
      requestCounts.set(identifier, tracking);
    }

    tracking.count++;

    if (tracking.count > config.maxRequests) {
      updateIPReputation(identifier, 'rate_limit_exceeded');

      console.warn('🚨 SECURITY: Endpoint rate limit exceeded:', {
        ip: identifier,
        endpoint: config.endpoint,
        count: tracking.count,
        limit: config.maxRequests
      });

      return res.status(429).json({
        error: 'Too many requests to this endpoint',
        code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((tracking.resetAt - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Clean up old data periodically
 */
setInterval(() => {
  const now = Date.now();
  const cutoffTime = now - (2 * 60 * 60 * 1000); // 2 hours

  // Clean token buckets
  for (const [key, bucket] of Array.from(tokenBuckets.entries())) {
    if (now - bucket.lastRefill > cutoffTime) {
      tokenBuckets.delete(key);
    }
  }

  // Clean IP reputations (keep blocked ones)
  for (const [key, reputation] of Array.from(ipReputations.entries())) {
    if (!reputation.blocked && now - reputation.lastViolation > cutoffTime) {
      ipReputations.delete(key);
    }
  }
}, 15 * 60 * 1000); // Clean every 15 minutes

/**
 * Report violation to reputation system (exported for use in other middleware)
 */
export function reportViolation(ip: string, violationType: string) {
  updateIPReputation(ip, violationType);
}
