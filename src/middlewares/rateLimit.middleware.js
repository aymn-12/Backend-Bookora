const rateLimit = require("express-rate-limit");
const { skipLoadTest } = require("../utils/rateLimitBypass.utils");

// Limiter for failed login attempts
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 attempts per windowMs
    message: { 
        success: false, 
        message: "محاولات كثيرة خاطئة، يرجى المحاولة مرة أخرى بعد 15 دقيقة." 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts towards the limit
    skip: skipLoadTest, // Bypass for load testing
});

// Limiter for new account registrations to prevent spam
exports.registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: { 
        success: false, 
        message: "تم الوصول للحد الأقصى لطلبات التسجيل، يرجى المحاولة لاحقاً." 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipLoadTest, // Bypass for load testing
});
