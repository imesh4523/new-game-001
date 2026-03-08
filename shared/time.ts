// Shared Sri Lanka timezone utilities
// Sri Lanka is UTC+5:30

export function getSriLankaTime(): Date {
  const now = new Date();
  // Sri Lanka is UTC+5:30 (5.5 hours ahead of UTC)
  const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return sriLankaTime;
}

export function getTodayDateString(): string {
  const now = getSriLankaTime();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

export function getMinutesSinceMidnight(date: Date): number {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0); // Midnight in UTC (which represents Sri Lanka time)
  return Math.floor((date.getTime() - startOfDay.getTime()) / (1000 * 60));
}

export function calculatePeriodNumber(date: Date, duration: number): number {
  const minutesSinceMidnight = getMinutesSinceMidnight(date);
  return Math.floor(minutesSinceMidnight / duration) + 1;
}

export function generatePeriodId(date: Date, duration: number): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const periodNumber = calculatePeriodNumber(date, duration);
  const durationPadded = duration.toString().padStart(2, '0');
  const periodPadded = periodNumber.toString().padStart(4, '0');
  
  return `${dateStr}${durationPadded}${periodPadded}`;
}

export function parsePeriodId(periodId: string): {
  date: string;
  duration: number;
  periodNumber: number;
  startTime: { hours: number; minutes: number };
} {
  // Format: YYYYMMDD + DD + PPPP
  const date = periodId.slice(0, 8);
  const duration = parseInt(periodId.slice(8, 10));
  const periodNumber = parseInt(periodId.slice(-4));
  
  // Calculate start time from period number
  const totalMinutes = (periodNumber - 1) * duration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    date,
    duration,
    periodNumber,
    startTime: { hours, minutes }
  };
}
