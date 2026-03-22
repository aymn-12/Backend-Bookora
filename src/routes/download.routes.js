// routes/download.route.js
const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { pipeline } = require("stream");
const Book = require("../models/book.models");
const rateLimit = require("express-rate-limit");
const optionalAuth = require("../middlewares/optionalAuth.middlewares");

const { drive } = require("../services/drive.service");

// إضافة حد للتحميل لتجنب إساءة الاستخدام
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 minutes
    message: { success: false, message: "Too many requests, please try again later" }
});

router.get("/:bookId", downloadLimiter, optionalAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: "كتاب غير موجود" });

    const fileId = book.driveFileId;
    if (!fileId || fileId.startsWith("api_")) {
      return res.redirect(book.fileUrl);
    }

    // جلب معلومات الملف
    const fileMeta = await drive.files.get({
      fileId,
      fields: "name, mimeType, size",
    });

    const fileName = fileMeta.data.name || `${book.title}.pdf`;
    const mimeType = fileMeta.data.mimeType || "application/pdf";
    const fileSize = fileMeta.data.size;

    // headers التحميل المباشر — تشتغل على كل المتصفحات بما فيها Safari
    res.setHeader("Content-Type", mimeType);
    if (fileSize) {
      res.setHeader("Content-Length", fileSize);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Stream الملف مباشرة للمتصفح
    const driveStream = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // استخدام pipeline للحماية من Memory Leaks في حال قيام المستخدم بإلغاء التحميل
    pipeline(
      driveStream.data,
      res,
      (err) => {
        if (err) {
          console.error("Pipeline Download error:", err.message);
          if (!res.headersSent) {
            res.status(500).json({ message: "انقطع الاتصال أو حدث خطأ أثناء التحميل" });
          }
        }
      }
    );

  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) res.status(500).json({ message: "خطأ في الخادم" });
  }
});

module.exports = router;