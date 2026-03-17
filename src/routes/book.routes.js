const router = require("express").Router();
const bookCtrl = require("../controllers/book.controller");
const { upload , validateFileSizes  } = require("../middlewares/upload.middleware");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");
const optionalAuth = require("../middlewares/optionalAuth.middlewares");
const validateMiddleware = require("../middlewares/validate.middlewares");
const { updateBookSchema } = require("../validations/book.validation");

// ─── إعداد رفع الملفين معاً
const bookUpload = upload.fields([
    { name: "bookFile",   maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]);

// ─── Public Routes
router.get("/",    optionalAuth, bookCtrl.getAllBook);
router.get("/:id", bookCtrl.getBookById);
router.get("/:id/download",              optionalAuth, bookCtrl.downloadBook);
router.post("/:id/confirm-download",     optionalAuth, bookCtrl.confirmDownload);

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