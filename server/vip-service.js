"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vipService = exports.VipService = void 0;
var storage_1 = require("./storage");
var VipService = /** @class */ (function () {
    function VipService() {
        this.vipLevelsCache = null;
        this.lastCacheUpdate = 0;
        this.CACHE_TTL = 30000; // 30 seconds cache
    }
    VipService.prototype.getVipLevels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = Date.now();
                        // Return cached data if still valid
                        if (this.vipLevelsCache && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
                            return [2 /*return*/, this.vipLevelsCache];
                        }
                        // Load from database
                        return [4 /*yield*/, this.refreshCache()];
                    case 1:
                        // Load from database
                        _a.sent();
                        return [2 /*return*/, this.vipLevelsCache];
                }
            });
        });
    };
    VipService.prototype.refreshCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vipSettings, vipLevelsMap, _i, vipSettings_1, setting, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, storage_1.storage.getAllVipSettings()];
                    case 1:
                        vipSettings = _a.sent();
                        vipLevelsMap = {};
                        for (_i = 0, vipSettings_1 = vipSettings; _i < vipSettings_1.length; _i++) {
                            setting = vipSettings_1[_i];
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
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error refreshing VIP cache:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    VipService.prototype.calculateVipLevel = function (teamSize, totalDeposits) {
        if (totalDeposits === void 0) { totalDeposits = 0; }
        if (!this.vipLevelsCache) {
            // Fallback to default if cache not loaded yet
            return this.calculateVipLevelFallback(teamSize, totalDeposits);
        }
        // Sort levels by team requirement in descending order
        var levels = Object.entries(this.vipLevelsCache)
            .sort(function (a, b) { return b[1].teamRequirement - a[1].teamRequirement; });
        for (var _i = 0, levels_1 = levels; _i < levels_1.length; _i++) {
            var _a = levels_1[_i], key = _a[0], config = _a[1];
            // User qualifies if they meet EITHER team requirement OR deposit requirement
            var meetsTeamRequirement = teamSize >= config.teamRequirement;
            var meetsDepositRequirement = totalDeposits >= config.depositRequirement;
            if (meetsTeamRequirement || meetsDepositRequirement) {
                return key;
            }
        }
        return 'lv1'; // Default fallback
    };
    VipService.prototype.calculateVipLevelFallback = function (teamSize, totalDeposits) {
        if (totalDeposits === void 0) { totalDeposits = 0; }
        // Check each level from highest to lowest
        if (teamSize >= 70 || totalDeposits >= 50000)
            return "vip7";
        if (teamSize >= 60 || totalDeposits >= 20000)
            return "vip6";
        if (teamSize >= 50 || totalDeposits >= 10000)
            return "vip5";
        if (teamSize >= 40 || totalDeposits >= 5000)
            return "vip4";
        if (teamSize >= 30 || totalDeposits >= 2000)
            return "vip3";
        if (teamSize >= 20 || totalDeposits >= 1000)
            return "vip2";
        if (teamSize >= 10 || totalDeposits >= 600)
            return "vip1";
        if (teamSize >= 7 || totalDeposits >= 300)
            return "vip";
        if (teamSize >= 1 || totalDeposits >= 30)
            return "lv2";
        return "lv1";
    };
    VipService.prototype.getMaxBetLimit = function (vipLevel) {
        if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
            return this.vipLevelsCache[vipLevel].maxBetLimit;
        }
        // Safe fallback based on VIP level instead of unlimited
        var safeFallbacks = {
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
    };
    VipService.prototype.getVipDisplayName = function (vipLevel) {
        if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
            return this.vipLevelsCache[vipLevel].displayName;
        }
        return vipLevel; // Fallback to key
    };
    VipService.prototype.getCommissionRate = function (vipLevel, teamLevel) {
        if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
            var rates = this.vipLevelsCache[vipLevel].commissionRates;
            var index = teamLevel - 1;
            return rates[index] || 0;
        }
        return 0;
    };
    VipService.prototype.getDailyWagerReward = function (vipLevel) {
        if (this.vipLevelsCache && this.vipLevelsCache[vipLevel]) {
            return this.vipLevelsCache[vipLevel].dailyWagerReward;
        }
        return 0;
    };
    // Force cache refresh (called when admin updates VIP settings)
    VipService.prototype.forceRefresh = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.refreshCache()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Static method for use in storage (avoids circular dependency)
    // Pass storage instance directly to avoid import cycle
    VipService.getVipLevelsFromStorage = function (storage) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, vipLevels, _i, settings_1, setting, commissionRates, parsed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, storage.getAllVipSettings()];
                    case 1:
                        settings = _a.sent();
                        vipLevels = {};
                        for (_i = 0, settings_1 = settings; _i < settings_1.length; _i++) {
                            setting = settings_1[_i];
                            commissionRates = [0, 0, 0];
                            try {
                                if (typeof setting.commissionRates === 'string') {
                                    parsed = JSON.parse(setting.commissionRates);
                                    if (Array.isArray(parsed)) {
                                        commissionRates = parsed;
                                    }
                                    else if (parsed && typeof parsed === 'object') {
                                        // Handle {lv1, lv2, vip} format
                                        commissionRates = [parsed.lv1 || 0, parsed.lv2 || 0, parsed.vip || 0];
                                    }
                                }
                                else if (setting.commissionRates && typeof setting.commissionRates === 'object') {
                                    // Already parsed object
                                    commissionRates = [
                                        setting.commissionRates.lv1 || 0,
                                        setting.commissionRates.lv2 || 0,
                                        setting.commissionRates.vip || 0
                                    ];
                                }
                            }
                            catch (e) {
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
                        return [2 /*return*/, vipLevels];
                }
            });
        });
    };
    VipService.calculateVipLevelStatic = function (teamSize, vipLevels, totalDeposits) {
        if (totalDeposits === void 0) { totalDeposits = 0; }
        var levels = Object.entries(vipLevels).sort(function (a, b) {
            return b[1].teamRequirement - a[1].teamRequirement;
        });
        for (var _i = 0, levels_2 = levels; _i < levels_2.length; _i++) {
            var _a = levels_2[_i], key = _a[0], config = _a[1];
            // User qualifies if they meet EITHER team requirement OR deposit requirement
            var meetsTeamRequirement = teamSize >= config.teamRequirement;
            var meetsDepositRequirement = totalDeposits >= (config.depositRequirement || 0);
            if (meetsTeamRequirement || meetsDepositRequirement) {
                return key;
            }
        }
        return 'lv1'; // Default level
    };
    VipService.getMaxBetLimitStatic = function (vipLevel, vipLevels) {
        var _a;
        return ((_a = vipLevels[vipLevel]) === null || _a === void 0 ? void 0 : _a.maxBetLimit) || 100;
    };
    return VipService;
}());
exports.VipService = VipService;
exports.vipService = new VipService();
// Note: Cache will be initialized after storage is ready
// Call vipService.refreshCache() after storage initialization
