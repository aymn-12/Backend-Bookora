const crypto = require("crypto");
const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require("../utils/csrf.utils");
const logger = require("../utils/logger.utils");

/**
 * CSRF Protection Middleware — Double Submit Cookie Pattern
 *
 * How it works:
 *  1. On login/register, the server sets a `csrf-token` cookie (readable by JS).
 *  2. The frontend reads this cookie and sends it back as `X-CSRF-Token` header
 *     on every state-changing request.
 *  3. This middleware verifies that the header value matches the cookie value.
 *
 * Why this works:
 *  - A cross-origin attacker's page CAN trigger requests with cookies (CSRF).
 *  - But it CANNOT read the `csrf-token` cookie (Same-Origin Policy).
 *  - Therefore it cannot set the correct `X-CSRF-Token` header → blocked.
 *
 * Apply this middleware ONLY to routes that rely on httpOnly cookies
 * (i.e., refresh-token and logout). Routes using Bearer tokens are already
 * protected because an attacker cannot set the Authorization header.
 */
module.exports = (req, res, next) => {
    const tokenFromCookie  = req.cookies[CSRF_COOKIE_NAME];
    const tokenFromHeader  = req.headers[CSRF_HEADER_NAME];

    // If no CSRF cookie exists yet (e.g., first request), block
    if (!tokenFromCookie) {
        logger.warn("CSRF: missing csrf-token cookie", {
            ip:     req.ip,
            method: req.method,
            path:   req.path,
        });
        return res.status(403).json({
            success: false,
            message: "رفض الطلب: رمز الحماية مفقود. يرجى تسجيل الدخول مجدداً.",
        });
    }

    // Compare cookie value vs header value (constant-time to prevent timing attacks)
    const cookieBuf = Buffer.from(tokenFromCookie  || "", "utf8");
    const headerBuf = Buffer.from(tokenFromHeader || "", "utf8");

    const isValid =
        cookieBuf.length === headerBuf.length &&
        crypto.timingSafeEqual(cookieBuf, headerBuf);

    if (!isValid) {
        logger.warn("CSRF: token mismatch — possible CSRF attack blocked", {
            ip:     req.ip,
            method: req.method,
            path:   req.path,
        });
        return res.status(403).json({
            success: false,
            message: "رفض الطلب: رمز الحماية غير صحيح.",
        });
    }

    next();
};

