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
require("dotenv/config");
var db_1 = require("./server/db");
var schema_1 = require("./shared/schema");
var drizzle_orm_1 = require("drizzle-orm");
var bet_validation_service_1 = require("./server/bet-validation-service");
var storage_1 = require("./server/storage");
function runTest() {
    return __awaiter(this, void 0, void 0, function () {
        var userId, recentGames, crashGame, betData, newBet, oldDate, userBefore;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = "ecf09361-2eae-4f8c-aeab-c2ca01b59452";
                    return [4 /*yield*/, storage_1.storage.getGameHistory(50)];
                case 1:
                    recentGames = _a.sent();
                    crashGame = recentGames.find(function (g) { return g.gameId.startsWith('crash_') && g.status === 'completed'; });
                    if (!crashGame) {
                        console.log("No completed crash game found.");
                        process.exit();
                    }
                    betData = {
                        userId: userId,
                        gameId: crashGame.gameId,
                        amount: "5.00000000",
                        potential: "0.00000000", // not known yet
                        betType: "crash",
                        betValue: "1.5"
                    };
                    return [4 /*yield*/, storage_1.storage.createBet(betData)];
                case 2:
                    newBet = _a.sent();
                    console.log("Created test pending bet:", newBet.id);
                    oldDate = new Date(Date.now() - 10 * 60 * 1000);
                    return [4 /*yield*/, db_1.pool.query("UPDATE bets SET created_at = $1 WHERE id = $2", [oldDate, newBet.id])];
                case 3:
                    _a.sent();
                    console.log("Backdated bet to 10 mins ago");
                    return [4 /*yield*/, storage_1.storage.getUser(userId)];
                case 4:
                    userBefore = _a.sent();
                    console.log("Balance before refund:", userBefore === null || userBefore === void 0 ? void 0 : userBefore.balance);
                    // 5. Run validation script manually
                    console.log("Running bet validation service...");
                    // Normally starts via interval, we will just call the private method directly through a wrapper for testing
                    bet_validation_service_1.betValidationService.start();
                    // Wait a few seconds for it to run
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                        var userAfter, updatedBet;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, storage_1.storage.getUser(userId)];
                                case 1:
                                    userAfter = _a.sent();
                                    console.log("Balance after refund:", userAfter === null || userAfter === void 0 ? void 0 : userAfter.balance);
                                    return [4 /*yield*/, db_1.db.select().from(schema_1.bets).where((0, drizzle_orm_1.eq)(schema_1.bets.id, newBet.id))];
                                case 2:
                                    updatedBet = (_a.sent())[0];
                                    console.log("Updated Bet status:", updatedBet === null || updatedBet === void 0 ? void 0 : updatedBet.status);
                                    // cleanup
                                    bet_validation_service_1.betValidationService.stop();
                                    return [4 /*yield*/, db_1.pool.query("DELETE FROM bets WHERE id = $1", [newBet.id])];
                                case 3:
                                    _a.sent();
                                    process.exit();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, 12000); // Wait 12 seconds because it has a 10s default startup delay
                    return [2 /*return*/];
            }
        });
    });
}
runTest();
