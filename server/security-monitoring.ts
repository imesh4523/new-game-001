import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ============================================================================
// SECURITY EVENT MONITORING & THREAT DETECTION
// ============================================================================

export enum SecurityEventType {
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  PATH_TRAVERSAL = 'path_traversal',
  BOT_DETECTED = 'bot_detected',
  BRUTE_FORCE = 'brute_force',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  IP_BLOCKED = 'ip_blocked',
  ANOMALY_DETECTED = 'anomaly_detected',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_EXFILTRATION = 'data_exfiltration'
}

export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  level: ThreatLevel;
  timestamp: number;
  ip: string;
  path: string;
  method: string;
  userAgent?: string;
  userId?: string;
  details: Record<string, any>;
  blocked: boolean;
}

interface ThreatIndicator {
  type: string;
  severity: number; // 1-10
  description: string;
}

const securityEvents: SecurityEvent[] = [];
const MAX_EVENTS_STORED = 10000;

const ipThreatScores = new Map<string, number>();
const globalThreatLevel = { level: ThreatLevel.LOW, score: 0 };

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  level: ThreatLevel,
  req: Request,
  details: Record<string, any> = {},
  blocked: boolean = false
) {
  const event: SecurityEvent = {
    id: crypto.randomBytes(16).toString('hex'),
    type,
    level,
    timestamp: Date.now(),
    ip: (req as any).clientIP || 'unknown',
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    userId: (req as any).session?.userId,
    details,
    blocked
  };

  securityEvents.push(event);

  // Keep only recent events
  if (securityEvents.length > MAX_EVENTS_STORED) {
    securityEvents.shift();
  }

  // Update threat scores
  updateThreatScores(event);

  // Log to console with appropriate severity
  const logSymbol = getThreatSymbol(level);
  console.warn(`${logSymbol} SECURITY EVENT [${type}]:`, {
    level,
    ip: event.ip,
    path: event.path,
    blocked,
    details
  });

  // Check if we should trigger alerts
  checkForAlerts(event);
}

/**
 * Update threat scores based on event
 */
function updateThreatScores(event: SecurityEvent) {
  const levelScores = {
    [ThreatLevel.LOW]: 1,
    [ThreatLevel.MEDIUM]: 5,
    [ThreatLevel.HIGH]: 15,
    [ThreatLevel.CRITICAL]: 30
  };

  const score = levelScores[event.level] || 1;

  // Update IP-specific threat score
  const currentIPScore = ipThreatScores.get(event.ip) || 0;
  ipThreatScores.set(event.ip, currentIPScore + score);

  // Update global threat level
  globalThreatLevel.score += score;

  // Determine global threat level based on recent activity
  const recentEvents = getRecentEvents(5 * 60 * 1000); // Last 5 minutes
  const criticalCount = recentEvents.filter(e => e.level === ThreatLevel.CRITICAL).length;
  const highCount = recentEvents.filter(e => e.level === ThreatLevel.HIGH).length;

  if (criticalCount >= 5 || globalThreatLevel.score > 200) {
    globalThreatLevel.level = ThreatLevel.CRITICAL;
  } else if (criticalCount >= 2 || highCount >= 10 || globalThreatLevel.score > 100) {
    globalThreatLevel.level = ThreatLevel.HIGH;
  } else if (highCount >= 5 || globalThreatLevel.score > 50) {
    globalThreatLevel.level = ThreatLevel.MEDIUM;
  } else {
    globalThreatLevel.level = ThreatLevel.LOW;
  }

  // Decay global threat score over time
  setTimeout(() => {
    globalThreatLevel.score = Math.max(0, globalThreatLevel.score - score);
  }, 30 * 60 * 1000); // Decay after 30 minutes
}

/**
 * Get events from a time window
 */
function getRecentEvents(timeWindowMs: number): SecurityEvent[] {
  const cutoff = Date.now() - timeWindowMs;
  return securityEvents.filter(event => event.timestamp > cutoff);
}

/**
 * Check for alert conditions
 */
function checkForAlerts(event: SecurityEvent) {
  // Alert on critical events
  if (event.level === ThreatLevel.CRITICAL) {
    console.error('🚨🚨🚨 CRITICAL SECURITY ALERT 🚨🚨🚨');
    console.error(`Type: ${event.type}`);
    console.error(`IP: ${event.ip}`);
    console.error(`Path: ${event.path}`);
    console.error(`Details:`, event.details);
  }

  // Alert on coordinated attacks (multiple IPs, same attack type)
  const recentSameType = getRecentEvents(60 * 1000).filter(e => e.type === event.type);
  const uniqueIPs = new Set(recentSameType.map(e => e.ip));
  
  if (uniqueIPs.size >= 5) {
    console.error('🚨 COORDINATED ATTACK DETECTED 🚨');
    console.error(`Attack type: ${event.type}`);
    console.error(`Unique IPs: ${uniqueIPs.size}`);
    console.error(`Events in last minute: ${recentSameType.length}`);
  }

  // Alert on global threat level changes
  if (globalThreatLevel.level === ThreatLevel.CRITICAL) {
    console.error('🚨 GLOBAL THREAT LEVEL: CRITICAL 🚨');
    console.error(`Score: ${globalThreatLevel.score}`);
  }
}

/**
 * Get threat symbol based on level
 */
function getThreatSymbol(level: ThreatLevel): string {
  const symbols = {
    [ThreatLevel.LOW]: '⚠️',
    [ThreatLevel.MEDIUM]: '🔶',
    [ThreatLevel.HIGH]: '🔴',
    [ThreatLevel.CRITICAL]: '🚨'
  };
  return symbols[level] || '⚠️';
}

/**
 * Middleware to detect data exfiltration attempts
 */
export function detectDataExfiltration(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  const startTime = Date.now();

  res.json = function (data: any) {
    const responseSize = JSON.stringify(data).length;
    const responseTime = Date.now() - startTime;

    // Detect unusually large responses (potential data dump)
    if (responseSize > 500000) { // 500KB
      logSecurityEvent(
        SecurityEventType.DATA_EXFILTRATION,
        ThreatLevel.HIGH,
        req,
        {
          responseSize,
          endpoint: req.path,
          suspicion: 'large_response'
        },
        false
      );
    }

    // Detect rapid sequential data requests
    const recentDataRequests = getRecentEvents(60 * 1000).filter(
      e => e.type === SecurityEventType.DATA_EXFILTRATION && e.ip === (req as any).clientIP
    );

    if (recentDataRequests.length >= 10) {
      logSecurityEvent(
        SecurityEventType.DATA_EXFILTRATION,
        ThreatLevel.CRITICAL,
        req,
        {
          requestCount: recentDataRequests.length,
          suspicion: 'rapid_data_access'
        },
        true
      );

      return res.status(403).json({
        error: 'Suspicious data access pattern detected',
        code: 'DATA_EXFILTRATION_SUSPECTED'
      });
    }

    return originalJson(data);
  };

  next();
}

/**
 * Middleware to detect brute force attacks
 */
export function detectBruteForce(req: Request, res: Response, next: NextFunction) {
  // Only monitor authentication endpoints
  if (!req.path.includes('/login') && !req.path.includes('/auth')) {
    return next();
  }

  const ip = (req as any).clientIP || 'unknown';
  const recentAuthFailures = getRecentEvents(15 * 60 * 1000).filter(
    e => e.type === SecurityEventType.AUTHENTICATION_FAILURE && e.ip === ip
  );

  // If too many failures, block
  if (recentAuthFailures.length >= 5) {
    logSecurityEvent(
      SecurityEventType.BRUTE_FORCE,
      ThreatLevel.CRITICAL,
      req,
      {
        failureCount: recentAuthFailures.length,
        timeWindow: '15min'
      },
      true
    );

    return res.status(403).json({
      error: 'Too many failed authentication attempts',
      code: 'BRUTE_FORCE_DETECTED'
    });
  }

  // Track the response to log failures
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent(
        SecurityEventType.AUTHENTICATION_FAILURE,
        ThreatLevel.MEDIUM,
        req,
        { reason: 'invalid_credentials' },
        false
      );
    }
    return originalJson(data);
  };

  next();
}

/**
 * Get security statistics
 */
export function getSecurityStatistics(timeWindowMs?: number) {
  const events = timeWindowMs ? getRecentEvents(timeWindowMs) : securityEvents;

  const stats = {
    totalEvents: events.length,
    eventsByType: {} as Record<string, number>,
    eventsByLevel: {} as Record<string, number>,
    topAttackingIPs: [] as Array<{ ip: string; count: number }>,
    blockedEvents: events.filter(e => e.blocked).length,
    globalThreatLevel: globalThreatLevel.level,
    globalThreatScore: globalThreatLevel.score
  };

  // Count by type
  for (const event of events) {
    stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    stats.eventsByLevel[event.level] = (stats.eventsByLevel[event.level] || 0) + 1;
  }

  // Top attacking IPs
  const ipCounts = new Map<string, number>();
  for (const event of events) {
    ipCounts.set(event.ip, (ipCounts.get(event.ip) || 0) + 1);
  }

  stats.topAttackingIPs = Array.from(ipCounts.entries())
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}

/**
 * Get threat indicators for an IP
 */
export function getIPThreatIndicators(ip: string): ThreatIndicator[] {
  const ipEvents = securityEvents.filter(e => e.ip === ip);
  const indicators: ThreatIndicator[] = [];

  // Check for various threat patterns
  const recentEvents = ipEvents.filter(e => Date.now() - e.timestamp < 60 * 60 * 1000);

  if (recentEvents.length > 50) {
    indicators.push({
      type: 'high_request_volume',
      severity: 7,
      description: `${recentEvents.length} security events in last hour`
    });
  }

  const criticalEvents = recentEvents.filter(e => e.level === ThreatLevel.CRITICAL);
  if (criticalEvents.length > 0) {
    indicators.push({
      type: 'critical_events',
      severity: 9,
      description: `${criticalEvents.length} critical security events`
    });
  }

  const blockedEvents = recentEvents.filter(e => e.blocked);
  if (blockedEvents.length > 5) {
    indicators.push({
      type: 'multiple_blocks',
      severity: 8,
      description: `${blockedEvents.length} blocked attempts`
    });
  }

  const threatScore = ipThreatScores.get(ip) || 0;
  if (threatScore > 50) {
    indicators.push({
      type: 'high_threat_score',
      severity: Math.min(10, Math.floor(threatScore / 10)),
      description: `Threat score: ${threatScore}`
    });
  }

  return indicators;
}

/**
 * Clean up old events periodically
 */
setInterval(() => {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
  const oldLength = securityEvents.length;
  
  while (securityEvents.length > 0 && securityEvents[0].timestamp < cutoff) {
    securityEvents.shift();
  }

  if (securityEvents.length < oldLength) {
    console.log(`🧹 Cleaned ${oldLength - securityEvents.length} old security events`);
  }

  // Clean old IP threat scores
  for (const [ip, score] of Array.from(ipThreatScores.entries())) {
    if (score < 5) {
      ipThreatScores.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

// Export functions for use in other modules
export { securityEvents, globalThreatLevel };
