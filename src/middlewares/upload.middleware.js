const multer = require("multer");

// ─── Memory Storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.fieldname === "bookFile") {
        const allowed = ["application/pdf", "application/epub+zip"];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        return cb(new Error("الكتاب يجب أن يكون PDF أو EPUB فقط"));
    }
    if (file.fieldname === "coverImage") {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        return cb(new Error("الغلاف يجب أن يكون JPG أو PNG أو WEBP فقط"));
    }
    cb(new Error("حقل غير معروف: " + file.fieldname));
};

// ─── تحسين 3: حدود مختلفة لكل نوع ملف
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB للكتاب
        files: 2,                     // ملفين فقط لكل request
    },
});

// ─── Middleware إضافي للتحقق من حجم الغلاف بشكل منفصل
const validateFileSizes = (req, res, next) => {
    if (req.files?.coverImage?.[0]) {
        const coverSize = req.files.coverImage[0].size;
        if (coverSize > 5 * 1024 * 1024) { // 5MB للغلاف
            return res.status(400).json({
                success: false,
                message: "حجم الغلاف يجب أن يكون أقل من 5MB",
            });
        }
    }
    next();
};

module.exports = { upload, validateFileSizes };