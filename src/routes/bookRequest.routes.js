const express = require("express");
const router  = express.Router();
const rateLimit = require("express-rate-limit");
const {
    createRequest,
    getAllRequests,
    updateRequestStatus,
    bulkUpdateRequestStatus,
    deleteRequest
} = require("../controllers/bookRequest.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");
const validate      = require("../middlewares/validate.middlewares");
const { createBookRequestSchema } = require("../validations/bookRequest.validation");

// ─── Rate Limiter: max 5 book requests per user per hour
// authMiddleware يعمل أولاً (router.use) لذا req.user دائماً موجود هنا
const createRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    // نستخدم ID المستخدم فقط — لا نلمس IP أبداً
    keyGenerator: (req) => `user:${req.user._id}`,
    message: { success: false, message: "لقد تجاوزت الحد المسموح به من الطلبات (5 طلبات في الساعة). يرجى المحاولة لاحقاً." },
    standardHeaders: true,
    legacyHeaders:   false,
    skip: (req) => ["admin", "superadmin"].includes(req.user?.role),
    // تعطيل تحقق IPv6 لأننا لا نستخدم IP أصلاً
    validate: { xForwardedForHeader: false, trustProxy: false },
});


router.use(authMiddleware);

// ─── User route (rate limited + validated)
router.post("/", createRequestLimiter, validate(createBookRequestSchema), createRequest);

// ─── Admin-only routes
router.get("/",             roleMiddleware(["admin", "superadmin"]), getAllRequests);
router.patch("/bulk-status", roleMiddleware(["admin", "superadmin"]), bulkUpdateRequestStatus);
router.patch("/:id",         roleMiddleware(["admin", "superadmin"]), updateRequestStatus);
router.delete("/:id",        roleMiddleware(["admin", "superadmin"]), deleteRequest);

module.exports = router;

