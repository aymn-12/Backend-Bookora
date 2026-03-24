// routes/download.route.js
const express = require("express");
const router = express.Router();
const { pipeline } = require("stream");
const Book = require("../models/book.models");
const rateLimit = require("express-rate-limit");
const optionalAuth = require("../middlewares/optionalAuth.middlewares");
const { drive } = require("../services/drive.service");

const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
    const fileSize = parseInt(fileMeta.data.size);

    // دعم Range requests
    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0]);
      const end = parts[1] ? parseInt(parts[1]) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206); // Partial Content
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunkSize);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      const driveStream = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        {
          responseType: "stream",
          headers: { Range: `bytes=${start}-${end}` },
        }
      );

      pipeline(driveStream.data, res, (err) => {
        if (err && !res.headersSent) {
          console.error("Pipeline Range error:", err.message);
        }
      });

    } else {
      // تحميل كامل بدون Range
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Accept-Ranges", "bytes");
      if (fileSize) res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");

      const driveStream = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      pipeline(driveStream.data, res, (err) => {
        if (err) {
          console.error("Pipeline Download error:", err.message);
          if (!res.headersSent) {
            res.status(500).json({ message: "انقطع الاتصال أو حدث خطأ أثناء التحميل" });
          }
        }
      });
    }

  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) res.status(500).json({ message: "خطأ في الخادم" });
  }
});

module.exports = router;