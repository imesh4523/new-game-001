"use strict";
/**
 * Bet Validation Service
 *
 * Automatically detects and fixes incorrectly settled bets
 * Runs periodically to ensure all bets are settled correctly
 */
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
exports.betValidationService = void 0;
var storage_1 = require("./storage");
var BetValidationService = /** @class */ (function () {
    function BetValidationService() {
        this.isRunning = false;
        this.intervalId = null;
    }
    BetValidationService.prototype.setBroadcastCallback = function (callback) {
        this.broadcastBalanceUpdate = callback;
    };
    BetValidationService.prototype.start = function () {
        var _this = this;
        if (this.isRunning) {
            console.log('⚠️  Bet validation service is already running');
            return;
        }
        this.isRunning = true;
        console.log('✅ Starting automatic bet validation service (runs every 5 minutes)');
        // Run every 5 minutes
        this.intervalId = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.validateRecentBets()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 300000); // 5 minutes
        // Run immediately on startup
        setTimeout(function () {
            _this.validateRecentBets();
        }, 10000); // Wait 10 seconds after startup
    };
    BetValidationService.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️  Bet validation service stopped');
        }
    };
    BetValidationService.prototype.validateRecentBets = function () {
        return __awaiter(this, void 0, void 0, function () {
            var recentGames, completedGames, fixedCount, validatedCount, _i, completedGames_1, game, correctColor, correctSize, bets, settledBets, _a, settledBets_1, bet, shouldWin, cashOutMultiplier, gameCrashPoint, isCurrentlyWon, stuckBets, refundedCount, _b, stuckBets_1, bet, game;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, , 19, 20]);
                        console.log('🔍 [BetValidation] Checking recently settled bets for errors...');
                        return [4 /*yield*/, storage_1.storage.getGameHistory(50)];
                    case 1:
                        recentGames = _c.sent();
                        completedGames = recentGames.filter(function (game) {
                            return game.status === 'completed' &&
                                game.result !== null &&
                                game.result !== undefined &&
                                game.resultColor;
                        });
                        fixedCount = 0;
                        validatedCount = 0;
                        if (!(completedGames.length === 0)) return [3 /*break*/, 2];
                        console.log('✓ [BetValidation] No completed games found for standard validation');
                        return [3 /*break*/, 18];
                    case 2:
                        _i = 0, completedGames_1 = completedGames;
                        _c.label = 3;
                    case 3:
                        if (!(_i < completedGames_1.length)) return [3 /*break*/, 11];
                        game = completedGames_1[_i];
                        correctColor = this.getNumberColor(game.result);
                        correctSize = this.getNumberSize(game.result);
                        if (!(game.resultColor !== correctColor || game.resultSize !== correctSize)) return [3 /*break*/, 5];
                        console.error("\u274C [BetValidation] CRITICAL: Game ".concat(game.gameId, " has incorrect result attributes!"));
                        console.error("   Result number: ".concat(game.result));
                        console.error("   Stored color: ".concat(game.resultColor, ", Correct: ").concat(correctColor));
                        console.error("   Stored size: ".concat(game.resultSize, ", Correct: ").concat(correctSize));
                        console.log("\uD83D\uDD27 [BetValidation] Auto-fixing game result attributes...");
                        // Fix the game record
                        return [4 /*yield*/, storage_1.storage.updateGameResult(game.gameId, game.result, correctColor, correctSize)];
                    case 4:
                        // Fix the game record
                        _c.sent();
                        console.log("\u2705 [BetValidation] Game ".concat(game.gameId, " result attributes fixed"));
                        _c.label = 5;
                    case 5: return [4 /*yield*/, storage_1.storage.getBetsByGame(game.gameId)];
                    case 6:
                        bets = _c.sent();
                        settledBets = bets.filter(function (bet) { return bet.status === 'won' || bet.status === 'lost'; });
                        _a = 0, settledBets_1 = settledBets;
                        _c.label = 7;
                    case 7:
                        if (!(_a < settledBets_1.length)) return [3 /*break*/, 10];
                        bet = settledBets_1[_a];
                        validatedCount++;
                        shouldWin = false;
                        switch (bet.betType) {
                            case "color":
                                shouldWin = bet.betValue === correctColor;
                                break;
                            case "number":
                                shouldWin = parseInt(bet.betValue) === game.result;
                                break;
                            case "size":
                                shouldWin = bet.betValue === correctSize;
                                break;
                            case "crash":
                                // For crash games, the result stored in the game record is the crash point
                                // A bet should win if it was cashed out before or at the crash point
                                if (bet.status === 'cashed_out' || bet.status === 'won') {
                                    cashOutMultiplier = parseFloat(bet.cashOutMultiplier || "0");
                                    gameCrashPoint = parseFloat(game.crashPoint || "0");
                                    shouldWin = cashOutMultiplier > 0 && cashOutMultiplier <= gameCrashPoint;
                                }
                                else {
                                    // If it wasn't cashed out, it's a loss
                                    shouldWin = false;
                                }
                                break;
                        }
                        isCurrentlyWon = bet.status === 'won';
                        if (!(shouldWin !== isCurrentlyWon)) return [3 /*break*/, 9];
                        // BUG DETECTED! Bet was settled incorrectly
                        console.error("\u274C [BetValidation] CRITICAL BUG DETECTED!");
                        console.error("   Bet ID: ".concat(bet.id));
                        console.error("   Game ID: ".concat(game.gameId));
                        console.error("   Bet Type: ".concat(bet.betType));
                        console.error("   Bet Value: ".concat(bet.betValue));
                        console.error("   Current Status: ".concat(bet.status));
                        console.error("   Should Be: ".concat(shouldWin ? 'won' : 'lost'));
                        console.error("   Game Result: ".concat(game.result, " (").concat(game.resultColor, ", ").concat(game.resultSize, ")"));
                        // Fix the bet
                        return [4 /*yield*/, this.fixIncorrectBet(bet, shouldWin, game)];
                    case 8:
                        // Fix the bet
                        _c.sent();
                        fixedCount++;
                        _c.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 7];
                    case 10:
                        _i++;
                        return [3 /*break*/, 3];
                    case 11: return [4 /*yield*/, storage_1.storage.getStuckPendingBets(5)];
                    case 12:
                        stuckBets = _c.sent();
                        refundedCount = 0;
                        _b = 0, stuckBets_1 = stuckBets;
                        _c.label = 13;
                    case 13:
                        if (!(_b < stuckBets_1.length)) return [3 /*break*/, 17];
                        bet = stuckBets_1[_b];
                        return [4 /*yield*/, storage_1.storage.getGameByGameId(bet.gameId)];
                    case 14:
                        game = _c.sent();
                        if (!(!game || game.status === 'completed' || game.status === 'cancelled')) return [3 /*break*/, 16];
                        console.error("\u274C [BetValidation] FOUND STUCK PENDING BET!");
                        console.error("   Bet ID: ".concat(bet.id));
                        console.error("   Game ID: ".concat(bet.gameId));
                        console.error("   Amount wagered: ".concat(bet.amount));
                        console.log("\uD83D\uDD27 [BetValidation] Auto-refunding stuck bet to user ".concat(bet.userId, "..."));
                        return [4 /*yield*/, this.refundStuckBet(bet)];
                    case 15:
                        _c.sent();
                        refundedCount++;
                        _c.label = 16;
                    case 16:
                        _b++;
                        return [3 /*break*/, 13];
                    case 17:
                        if (validatedCount > 0) {
                            console.log("\u2705 [BetValidation] Validated ".concat(validatedCount, " settled bets"));
                        }
                        if (fixedCount > 0 || refundedCount > 0) {
                            console.log("\uD83D\uDD27 [BetValidation] Fixed ".concat(fixedCount, " incorrectly settled bet(s) and refunded ").concat(refundedCount, " stuck bet(s)"));
                        }
                        _c.label = 18;
                    case 18:
                        try { }
                        catch (error) {
                            console.error('❌ [BetValidation] Error in bet validation service:', error);
                        }
                        return [3 /*break*/, 20];
                    case 19: return [7 /*endfinally*/];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    BetValidationService.prototype.refundStuckBet = function (bet) {
        return __awaiter(this, void 0, void 0, function () {
            var user, oldBalance, betAmount, newBalance, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, storage_1.storage.getUser(bet.userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            console.error("\u274C [BetValidation] User ".concat(bet.userId, " not found for refund"));
                            return [2 /*return*/];
                        }
                        oldBalance = user.balance;
                        betAmount = parseFloat(bet.amount);
                        // Mark bet as cancelled/refunded
                        return [4 /*yield*/, storage_1.storage.updateBetStatus(bet.id, "cancelled", bet.amount)];
                    case 2:
                        // Mark bet as cancelled/refunded
                        _a.sent();
                        newBalance = (parseFloat(oldBalance) + betAmount).toFixed(8);
                        return [4 /*yield*/, storage_1.storage.updateUserBalance(bet.userId, newBalance)];
                    case 3:
                        _a.sent();
                        console.log("\u2705 [BetValidation] Refunded stuck bet ".concat(bet.id, ": added ").concat(betAmount.toFixed(2), " to balance"));
                        if (this.broadcastBalanceUpdate) {
                            this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win'); // treat refund as positive balance change
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error("\u274C [BetValidation] Error refunding stuck bet ".concat(bet.id, ":"), error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    BetValidationService.prototype.fixIncorrectBet = function (bet, shouldWin, game) {
        return __awaiter(this, void 0, void 0, function () {
            var user, oldBalance, betAmount, potential, feeSetting, feePercentage, winnings, feeAmount, actualPayout, newBalance, actualPayout, newBalance, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        return [4 /*yield*/, storage_1.storage.getUser(bet.userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            console.error("\u274C [BetValidation] User ".concat(bet.userId, " not found"));
                            return [2 /*return*/];
                        }
                        oldBalance = user.balance;
                        betAmount = parseFloat(bet.amount);
                        potential = parseFloat(bet.potential);
                        if (!shouldWin) return [3 /*break*/, 5];
                        return [4 /*yield*/, storage_1.storage.getSystemSetting('betting_fee_percentage')];
                    case 2:
                        feeSetting = _a.sent();
                        feePercentage = (feeSetting === null || feeSetting === void 0 ? void 0 : feeSetting.value) ? parseFloat(feeSetting.value) : 3;
                        if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
                            feePercentage = 3;
                        }
                        winnings = potential - betAmount;
                        feeAmount = winnings * (feePercentage / 100);
                        actualPayout = betAmount + (winnings - feeAmount);
                        // Update bet status to won
                        return [4 /*yield*/, storage_1.storage.updateBetStatus(bet.id, "won", actualPayout.toFixed(8))];
                    case 3:
                        // Update bet status to won
                        _a.sent();
                        newBalance = (parseFloat(oldBalance) + actualPayout).toFixed(8);
                        return [4 /*yield*/, storage_1.storage.updateUserBalance(bet.userId, newBalance)];
                    case 4:
                        _a.sent();
                        console.log("\u2705 [BetValidation] Fixed bet ".concat(bet.id, ": lost \u2192 won (payout: ").concat(actualPayout.toFixed(2), ")"));
                        if (this.broadcastBalanceUpdate) {
                            this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'win');
                        }
                        return [3 /*break*/, 8];
                    case 5:
                        actualPayout = parseFloat(bet.actualPayout || bet.potential);
                        // Update bet status to lost
                        return [4 /*yield*/, storage_1.storage.updateBetStatus(bet.id, "lost")];
                    case 6:
                        // Update bet status to lost
                        _a.sent();
                        newBalance = (parseFloat(oldBalance) - actualPayout).toFixed(8);
                        return [4 /*yield*/, storage_1.storage.updateUserBalance(bet.userId, newBalance)];
                    case 7:
                        _a.sent();
                        console.log("\u2705 [BetValidation] Fixed bet ".concat(bet.id, ": won \u2192 lost (deducted: ").concat(actualPayout.toFixed(2), ")"));
                        if (this.broadcastBalanceUpdate) {
                            this.broadcastBalanceUpdate(bet.userId, oldBalance, newBalance, 'loss');
                        }
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_2 = _a.sent();
                        console.error("\u274C [BetValidation] Error fixing bet ".concat(bet.id, ":"), error_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    BetValidationService.prototype.getNumberColor = function (num) {
        if (num === 5)
            return "violet";
        if ([1, 3, 7, 9].includes(num))
            return "green";
        if (num === 0)
            return "violet";
        return "red";
    };
    BetValidationService.prototype.getNumberSize = function (num) {
        return num >= 5 ? "big" : "small";
    };
    return BetValidationService;
}());
exports.betValidationService = new BetValidationService();
