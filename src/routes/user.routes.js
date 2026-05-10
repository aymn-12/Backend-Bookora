const router = require("express").Router();
const userCtrl = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const rateLimit = require("express-rate-limit");
const verifiedMiddleware = require("../middlewares/verified.middleware");
const optionalAuth = require("../middlewares/optionalAuth.middlewares");

const libraryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 minutes
    message: { success: false, message: "Too many library requests, try again later" }
});

router.get("/profile/:id", optionalAuth, userCtrl.getUserProfile);
router.patch("/profile/name", authMiddleware, verifiedMiddleware, userCtrl.updateName);
router.get("/library",          libraryLimiter, authMiddleware, verifiedMiddleware, userCtrl.getLibrary);
router.post("/library/:bookId", libraryLimiter, authMiddleware, verifiedMiddleware, userCtrl.addToLibrary);
router.post("/library-sync",   libraryLimiter, authMiddleware, verifiedMiddleware, userCtrl.syncLibrary);
router.delete("/library/:bookId", libraryLimiter, authMiddleware, verifiedMiddleware, userCtrl.removeFromLibrary);

module.exports = router;