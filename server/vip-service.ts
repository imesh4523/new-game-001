import { storage } from './storage';
import { VipSetting } from '../shared/schema';

interface VipLevelConfig {
  teamRequirement: number;
  depositRequirement: number;
  maxBetLimit: number;
  displayName: string;
  dailyWagerReward: number;
  commissionRates: number[];
}

type VipLevelsMap = Record<string, VipLevelConfig>;

class VipService {
  private vipLevelsCache: VipLevelsMap | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  async getVipLevels(): Promise<VipLevelsMap> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.vipLevelsCache && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      return this.vipLevelsCache;
    }

    // Load from database
    await this.refreshCache();
    return this.vipLevelsCache!;
  }

  async refreshCache(): Promise<void> {
    try {
      const vipSettings = await storage.getAllVipSettings();
      const vipLevelsMap: VipLevelsMap = {};

      for (const setting of vipSettings) {
        if (setting.isActive) {
          vipLevelsMap[setting.levelKey] = {
            teamRequirement: setting.teamRequirement,
            depositRequirement: parseFloat(setting.rechargeAmount),
            maxBetLimit: parseFloat(setting.maxBet),
            displayName: setting.levelName,
            dailyWagerReward: parseFloat(setting.dailyWagerReward),
            commissionRates: JSON.parse(setting.commissionRates)
          };
        }
      }

      this.vipLevelsCache = vipLevelsMap;
      this.lastCacheUpdate = Date.now();
      console.log('✅ VIP levels cache refreshed');
    } catch (error) {
      console.error('Error refreshing VIP cache:', error);
      // Keep using old cache if refresh fails
    }
  }

  calculateVipLevel(teamSize: number, totalDeposits: number = 0): string {
    if (!this.vipLevelsCache) {
      // Fallback to default if cache not loaded yet
      return this.calculateVipLevelFallback(teamSize, totalDeposits);
    }

    // Sort levels by team requirement in descending order
    const levels = Object.entries(this.vipLevelsCache)
      .sort((a, b) => b[1].teamRequirement - a[1].teamRequirement);

    for (const [key, config] of levels) {
      // User qualifies if they meet EITHER team requirement OR deposit requirement
      const meetsTeamRequirement = teamSize >= config.teamRequirement;
      const meetsDepositRequirement = totalDeposits >= config.depositRequirement;
      
      if (meetsTeamRequirement || meetsDepositRequirement) {
        return key;
      }
    }

    return 'lv1'; // Default fallback
  }

  private calculateVipLevelFallback(teamSize: number, totalDeposits: number = 0): string {
    // Check each level from highest to lowest
    if (teamSize >= 70 || totalDeposits >= 50000) return "vip7";
    if (teamSize >= 60 || totalDeposits >= 20000) return "vip6";
    if (teamSize >= 50 || totalDeposits >= 10000) return "vip5";
    if (teamSize >= 40 || totalDeposits >= 5000) return "vip4";
    if (teamSize >= 30 || totalDeposits >= 2000) return "vip3";
    if (teamSize >= 20 || totalDeposits >= 1000) return "vip2";
    if (teamSize >= 10 || totalDeposits >= 600) return "vip1";
    if (teamSize >= 7 || totalDeposits >= 300) return "vip";
    if (teamSize >= 1 || totalDeposits >= 30) return "lv2";
    return "lv1";
  }

  getMaxBetLimit(vipLevel: string): number {
    if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
      return this.vipLevelsCache[vipLevel].maxBetLimit;
    }
    // Safe fallback based on VIP level instead of unlimited
    const safeFallbacks: Record<string, number> = {
      'lv1': 100,
      'lv2': 500,
      'vip': 1000,
      'vip1': 2000,
      'vip2': 5000,
      'vip3': 10000,
      'vip4': 20000,
      'vip5': 50000,
      'vip6': 100000,
      'vip7': 200000
    };
    return safeFallbacks[vipLevel] || 100; // Default to minimum if unknown level
  }

  getVipDisplayName(vipLevel: string): string {
    if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
      return this.vipLevelsCache[vipLevel].displayName;
    }
    return vipLevel; // Fallback to key
  }

  getCommissionRate(vipLevel: string, teamLevel: number): number {
    if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
      const rates = this.vipLevelsCache[vipLevel].commissionRates;
      const index = teamLevel - 1;
      return rates[index] || 0;
    }
    return 0;
  }

  getDailyWagerReward(vipLevel: string): number {
    if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
      return this.vipLevelsCache[vipLevel].dailyWagerReward;
    }
    return 0;
  }

  // Force cache refresh (called when admin updates VIP settings)
  async forceRefresh(): Promise<void> {
    await this.refreshCache();
  }

  // Static method for use in storage (avoids circular dependency)
  // Pass storage instance directly to avoid import cycle
  static async getVipLevelsFromStorage(storage: any): Promise<Record<string, VipLevelConfig>> {
    const settings = await storage.getAllVipSettings();
    const vipLevels: Record<string, VipLevelConfig> = {};
    
    for (const setting of settings) {
      // Parse commission rates from JSON string
      let commissionRates = [0, 0, 0];
      try {
        if (typeof setting.commissionRates === 'string') {
          const parsed = JSON.parse(setting.commissionRates);
          if (Array.isArray(parsed)) {
            commissionRates = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Handle {lv1, lv2, vip} format
            commissionRates = [parsed.lv1 || 0, parsed.lv2 || 0, parsed.vip || 0];
          }
        } else if (setting.commissionRates && typeof setting.commissionRates === 'object') {
          // Already parsed object
          commissionRates = [
            setting.commissionRates.lv1 || 0, 
            setting.commissionRates.lv2 || 0, 
            setting.commissionRates.vip || 0
          ];
        }
      } catch (e) {
        console.error('Error parsing commission rates:', e);
      }
      
      vipLevels[setting.levelKey || setting.levelName.toLowerCase()] = {
        displayName: setting.levelName,
        teamRequirement: setting.teamRequirement || 0,
        depositRequirement: parseFloat(setting.rechargeAmount || '0'),
        maxBetLimit: parseFloat(setting.maxBet),
        dailyWagerReward: parseFloat(setting.dailyWagerReward || '0'),
        commissionRates: commissionRates
      };
    }
    
    return vipLevels;
  }

  static calculateVipLevelStatic(teamSize: number, vipLevels: Record<string, VipLevelConfig>, totalDeposits: number = 0): string {
    const levels = Object.entries(vipLevels).sort((a, b) => 
      b[1].teamRequirement - a[1].teamRequirement
    );
    
    for (const [key, config] of levels) {
      // User qualifies if they meet EITHER team requirement OR deposit requirement
      const meetsTeamRequirement = teamSize >= config.teamRequirement;
      const meetsDepositRequirement = totalDeposits >= (config.depositRequirement || 0);
      
      if (meetsTeamRequirement || meetsDepositRequirement) {
        return key;
      }
    }
    
    return 'lv1'; // Default level
  }

  static getMaxBetLimitStatic(vipLevel: string, vipLevels: Record<string, VipLevelConfig>): number {
    return vipLevels[vipLevel]?.maxBetLimit || 100;
  }
}

// Export class and singleton instance
export { VipService };
export const vipService = new VipService();

// Note: Cache will be initialized after storage is ready
// Call vipService.refreshCache() after storage initialization
