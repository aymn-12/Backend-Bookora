const router = require("express").Router();
const bookCtrl = require("../controllers/book.controller");
const { upload , validateFileSizes  } = require("../middlewares/upload.middleware");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");
const optionalAuth = require("../middlewares/optionalAuth.middlewares");
const validateMiddleware = require("../middlewares/validate.middlewares");
const rateLimit = require("express-rate-limit");
const { updateBookSchema } = require("../validations/book.validation");

const bookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 minutes per IP for book operations
    message: { success: false, message: "Too many requests, please try again later" }
});

// ─── إعداد رفع الملفين معاً
const bookUpload = upload.fields([
    { name: "bookFile",   maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]);

// ─── Public Routes
router.get("/",    bookLimiter, optionalAuth, bookCtrl.getAllBook);
router.get("/:id", bookLimiter, bookCtrl.getBookById);
router.get("/:id/download",              bookLimiter, optionalAuth, bookCtrl.downloadBook);
router.post("/:id/confirm-download",     bookLimiter, optionalAuth, bookCtrl.confirmDownload);

// ─── Admin Routes — رفع الكتاب مع الملفات
router.post("/",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    bookUpload,
    validateFileSizes,   // ← أضف هذا
    bookCtrl.createBook
);

// ─── تعديل البيانات النصية فقط (بدون ملفات)
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    validateMiddleware(updateBookSchema),
    bookCtrl.updateBook
);

// ─── حذف الكتاب + ملفاته من Drive
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    bookCtrl.deleteBook
);

module.exports = router;