const router      = require("express").Router();
const searchCtrl  = require("../controllers/search.controller");
const rateLimit   = require("express-rate-limit");
const { skipLoadTest } = require("../utils/rateLimitBypass.utils");
const cacheMiddleware = require("../middlewares/cache.middleware");

const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { success: false, message: "طلبات كثيرة، حاول بعد قليل" },
    skip: skipLoadTest, // Bypass for load testing
});

// GET /api/search?q=هاري
router.get("/",             searchLimiter, cacheMiddleware(60), searchCtrl.globalSearch);

// GET /api/search/autocomplete?q=ها
router.get("/autocomplete", searchLimiter, cacheMiddleware(60), searchCtrl.autocomplete);

// GET /api/search/popular
router.get("/popular",                    searchCtrl.getPopularSearches);

module.exports = router;