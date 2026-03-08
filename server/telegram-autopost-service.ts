import { storage } from './storage';
import { sendPhotoToChannel, sendMessageToChannel } from './telegram';
import { periodSyncService } from './period-sync-service';

let schedulerInterval: NodeJS.Timeout | null = null;
const periodBasedPostsCache = new Map<string, { id: string; lastSentAt: Date | null }>(); // Track sent period-based posts

function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (e) {
    console.error(`Invalid timezone: ${timezone}, defaulting to UTC`);
    return 0;
  }
}

function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; seconds: number; dayOfWeek: number } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayOfWeek = weekdayMap[weekdayStr] ?? 0;
    
    return { hours, minutes, seconds, dayOfWeek };
  } catch (e) {
    console.error(`Error getting time in timezone ${timezone}:`, e);
    const now = new Date();
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      seconds: now.getUTCSeconds(),
      dayOfWeek: now.getUTCDay()
    };
  }
}

function shouldRunNow(
  scheduleTime: string,
  timezone: string,
  daysOfWeek: string,
  lastSentAt: Date | null
): boolean {
  const { hours, minutes, seconds, dayOfWeek } = getCurrentTimeInTimezone(timezone);
  
  // Parse schedule time - supports both HH:MM:SS and HH:MM format
  const timeParts = scheduleTime.split(':').map(Number);
  const scheduledHours = timeParts[0] || 0;
  const scheduledMinutes = timeParts[1] || 0;
  
  // Check if current time matches scheduled time (Hours and Minutes only)
  if (hours !== scheduledHours || minutes !== scheduledMinutes) {
    return false;
  }
  
  // Extra safety: only run if we're in the first 20 seconds of the minute
  // This helps ensure we don't accidentally skip or multi-run if the interval
  // alignment is slightly off, while still relying on our daily sent check.
  if (seconds > 20) {
    return false;
  }
  
  // Check if today is allowed day
  const allowedDays = daysOfWeek.split(',').map(d => parseInt(d.trim()));
  if (!allowedDays.includes(dayOfWeek)) {
    return false;
  }
  
  // Check if not sent recently (prevent duplicate sends)
  if (lastSentAt) {
    const lastSentDate = new Date(lastSentAt);
    const now = new Date();
    
    // Check if it's the same day in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const nowParts = formatter.formatToParts(now);
    const lastSentParts = formatter.formatToParts(lastSentDate);
    
    const nowDay = nowParts.find(p => p.type === 'day')?.value;
    const nowMonth = nowParts.find(p => p.type === 'month')?.value;
    const nowYear = nowParts.find(p => p.type === 'year')?.value;
    
    const lastDay = lastSentParts.find(p => p.type === 'day')?.value;
    const lastMonth = lastSentParts.find(p => p.type === 'month')?.value;
    const lastYear = lastSentParts.find(p => p.type === 'year')?.value;
    
    if (nowDay === lastDay && nowMonth === lastMonth && nowYear === lastYear) {
      return false;
    }

    const timeDiff = now.getTime() - lastSentDate.getTime();
    const secondsDiff = timeDiff / 1000;
    
    // Only send if at least 60 seconds have passed (extra safety)
    if (secondsDiff < 60) {
      return false;
    }
  }
  
  return true;
}

async function processScheduledPosts(): Promise<void> {
  try {
    const activePosts = await storage.getActiveTelegramScheduledPosts();
    
    if (activePosts.length === 0) {
      return;
    }
    
    // Get all active periods for period-based matching
    const activePeriods = periodSyncService.getAllActivePeriods();
    
    for (const post of activePosts) {
      try {
        let shouldRun = false;
        
        // Check period-based trigger (when periodId is set OR scheduleTime is null/empty)
        if (post.periodId || !post.scheduleTime) {
          let matchingPeriod;
          
          if (post.periodId) {
            // Specific period ID provided - match only that period
            matchingPeriod = activePeriods.find(p => p.periodId === post.periodId && p.status === 'active');
          } else {
            // No period ID provided - match any active period
            matchingPeriod = activePeriods.find(p => p.status === 'active');
          }
          
          if (matchingPeriod) {
            const cacheKey = `${post.id}:${matchingPeriod.periodId}`;
            const cached = periodBasedPostsCache.get(cacheKey);
            
            // Check if we already sent for this period
            if (!cached) {
              shouldRun = true;
              periodBasedPostsCache.set(cacheKey, { id: post.id, lastSentAt: new Date() });
            } else if (cached.lastSentAt && new Date().getTime() - new Date(cached.lastSentAt).getTime() > 600000) {
              // Safety fallback: allow re-sending only after 10 minutes if somehow cache persists
              shouldRun = true;
              periodBasedPostsCache.set(cacheKey, { id: post.id, lastSentAt: new Date() });
            }
          }
        }
        // Check time-based trigger
        else if (post.scheduleTime) {
          shouldRun = shouldRunNow(
            post.scheduleTime,
            post.timezone,
            post.daysOfWeek || '0,1,2,3,4,5,6',
            post.lastSentAt
          );
        }
        
        if (!shouldRun) {
          continue;
        }
        
        const triggerType = post.periodId ? `period ${post.periodId}` : `time ${post.scheduleTime}`;
        console.log(`📤 Sending scheduled post: ${post.title} (trigger: ${triggerType})`);
        
        let success = false;
        if (post.photoPath || post.photoUrl) {
          const photoSource = post.photoPath || post.photoUrl;
          success = await sendPhotoToChannel(post.channelId, photoSource!, post.messageText, post.buttons);
        } else {
          success = await sendMessageToChannel(post.channelId, post.messageText, post.buttons);
        }
        
        if (success) {
          await storage.updateScheduledPostSentStatus(post.id, new Date(), post.repeatDaily);
          console.log(`✅ Scheduled post sent successfully: ${post.title}`);
        } else {
          console.error(`❌ Failed to send scheduled post: ${post.title}`);
        }
      } catch (postError) {
        console.error(`Error processing scheduled post ${post.id}:`, postError);
      }
    }
  } catch (error) {
    console.error('Error in processScheduledPosts:', error);
  }
}

export function startAutoPostScheduler(): void {
  if (schedulerInterval) {
    console.log('⚠️ Auto-post scheduler already running');
    return;
  }
  
  console.log('🚀 Starting Telegram auto-post scheduler...');
  
  processScheduledPosts();
  
  // Checking every 10 seconds for instant period-based triggers
  schedulerInterval = setInterval(processScheduledPosts, 10 * 1000);
  
  console.log('✅ Telegram auto-post scheduler started (checking every 10 seconds)');
}

export function stopAutoPostScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹️ Telegram auto-post scheduler stopped');
  }
}

export function isAutoPostSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
