import { db } from "./db";
import { systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

class CountryBlockingService {
  private blockedCountries: string[] = [];
  private allowedCountries: string[] = [];
  private blockingMode: 'blacklist' | 'whitelist' = 'blacklist';
  private lastUpdate: Date = new Date(0);
  private updateInterval: number = 30000; // 30 seconds

  async loadSettings(): Promise<void> {
    try {
      if (!db) {
        console.log('Database not available, using default country blocking settings');
        return;
      }
      
      const [blockedSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'blocked_countries'))
        .limit(1);
      
      const [allowedSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'allowed_countries'))
        .limit(1);
      
      const [modeSetting] = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'country_blocking_mode'))
        .limit(1);

      if (blockedSetting) {
        try {
          this.blockedCountries = JSON.parse(blockedSetting.value);
        } catch (e) {
          console.error('Error parsing blocked countries:', e);
          this.blockedCountries = [];
        }
      }

      if (allowedSetting) {
        try {
          this.allowedCountries = JSON.parse(allowedSetting.value);
        } catch (e) {
          console.error('Error parsing allowed countries:', e);
          this.allowedCountries = [];
        }
      }

      if (modeSetting) {
        this.blockingMode = modeSetting.value === 'whitelist' ? 'whitelist' : 'blacklist';
      }

      this.lastUpdate = new Date();
      console.log('Country blocking settings loaded:', {
        mode: this.blockingMode,
        blocked: this.blockedCountries,
        allowed: this.allowedCountries
      });
    } catch (error) {
      console.error('Error loading country blocking settings:', error);
    }
  }

  async refreshIfNeeded(): Promise<void> {
    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime();
    if (timeSinceUpdate > this.updateInterval) {
      await this.loadSettings();
    }
  }

  getBlockedCountries(): string[] {
    return this.blockedCountries;
  }

  getAllowedCountries(): string[] {
    return this.allowedCountries;
  }

  getBlockingMode(): 'blacklist' | 'whitelist' {
    return this.blockingMode;
  }

  isCountryBlocked(countryCode: string): boolean {
    if (!countryCode) {
      return false;
    }

    if (this.blockingMode === 'whitelist') {
      // Whitelist mode: block if not in allowed list
      if (this.allowedCountries.length === 0) {
        return false; // No whitelist configured, allow all
      }
      return !this.allowedCountries.includes(countryCode);
    } else {
      // Blacklist mode: block if in blocked list
      return this.blockedCountries.includes(countryCode);
    }
  }
}

export const countryBlockingService = new CountryBlockingService();
