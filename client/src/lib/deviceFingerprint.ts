/**
 * Device Fingerprinting Utility
 * Generates unique device fingerprints using browser APIs
 */

export interface DeviceFingerprint {
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  timezone: string;
  language: string;
  deviceId?: string;
}

/**
 * Generate a unique device fingerprint
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  const screen = window.screen;
  
  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

/**
 * Generate a unique device ID based on browser fingerprint
 * This creates a pseudo-unique identifier for the device
 */
export async function generateDeviceId(): Promise<string> {
  const fingerprint = generateDeviceFingerprint();
  
  // Collect additional browser characteristics
  const data = {
    screen: `${fingerprint.screenWidth}x${fingerprint.screenHeight}@${fingerprint.pixelRatio}`,
    timezone: fingerprint.timezone,
    language: fingerprint.language,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    colorDepth: screen.colorDepth,
    orientation: screen.orientation?.type || 'unknown',
  };
  
  // Create a fingerprint string
  const fingerprintString = JSON.stringify(data);
  
  // Generate hash using SubtleCrypto API
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Get or create a persistent device ID
 * Stores in localStorage for consistency across sessions
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const STORAGE_KEY = 'device_fingerprint_id';
  
  // Try to get existing ID from localStorage
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate new ID if not exists
    deviceId = await generateDeviceId();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Get complete device information including fingerprint and ID
 */
export async function getDeviceInfo(): Promise<DeviceFingerprint & { deviceId: string }> {
  const fingerprint = generateDeviceFingerprint();
  const deviceId = await getOrCreateDeviceId();
  
  return {
    ...fingerprint,
    deviceId,
  };
}

/**
 * Clear device ID (useful for logout or debugging)
 */
export function clearDeviceId(): void {
  localStorage.removeItem('device_fingerprint_id');
}
