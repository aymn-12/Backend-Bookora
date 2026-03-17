const router      = require("express").Router();
const searchCtrl  = require("../controllers/search.controller");
const rateLimit   = require("express-rate-limit");

const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { success: false, message: "طلبات كثيرة، حاول بعد قليل" },
});

// GET /api/search?q=هاري
router.get("/",             searchLimiter, searchCtrl.globalSearch);

// GET /api/search/autocomplete?q=ها
router.get("/autocomplete", searchLimiter, searchCtrl.autocomplete);

// GET /api/search/popular
router.get("/popular",                    searchCtrl.getPopularSearches);

module.exports = router;