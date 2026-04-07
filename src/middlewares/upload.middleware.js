const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ─── Ensure temp directory exists
const tempDir = path.join(process.cwd(), "uploads", "tmp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// ─── Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

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

// ─── Multer Instance with Disk Storage
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