// routes/download.route.js
const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const Book = require("../models/book.model");

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

router.get("/download/:bookId", async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: "كتاب غير موجود" });

    const fileId = book.driveFileId;
    if (!fileId || fileId.startsWith("api_")) {
      return res.redirect(book.fileUrl);
    }

    const drive = google.drive({ version: "v3", auth });

    // جلب معلومات الملف
    const fileMeta = await drive.files.get({
      fileId,
      fields: "name, mimeType, size",
    });

    const fileName = fileMeta.data.name || `${book.title}.pdf`;
    const mimeType = fileMeta.data.mimeType || "application/pdf";

    // headers التحميل المباشر — تشتغل على كل المتصفحات بما فيها Safari
    res.setHeader("Content-Type", mimeType);
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

    driveStream.data
      .on("error", (err) => {
        console.error("Drive stream error:", err);
        if (!res.headersSent) res.status(500).json({ message: "خطأ في التحميل" });
      })
      .pipe(res);

  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) res.status(500).json({ message: "خطأ في الخادم" });
  }
});

module.exports = router;