const express = require("express");
const router = express.Router();
const { drive } = require("../services/drive.service");
const { pipeline } = require("stream");
const protect = require("../middlewares/OAuth.middlewares");
const Book = require("../models/book.models");

// Validate fileId format (Google Drive IDs are alphanumeric with dashes/underscores, typically 20+ chars)
const isValidFileId = (fileId) => /^[a-zA-Z0-9_-]{20,}$/.test(fileId);

// Simple in-memory rate limiter for image requests
const imageRequestCounts = new Map();
const IMAGE_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes
const IMAGE_RATE_MAX = 100; // 100 requests per window

const checkImageRateLimit = (ip) => {
  const now = Date.now();
  const key = `img:${ip}`;
  const current = imageRequestCounts.get(key);

  if (!current || current.resetAt < now) {
    imageRequestCounts.set(key, { count: 1, resetAt: now + IMAGE_RATE_WINDOW });
    return { allowed: true };
  }

  if (current.count >= IMAGE_RATE_MAX) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000)
    };
  }

  current.count++;
  return { allowed: true };
};

// Route to proxy book cover images from Google Drive
// Protected: requires authentication, rate limited, validates file ownership
router.get("/cover/:fileId", protect, async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    // 1. Validate fileId format (sanitization)
    if (!isValidFileId(fileId)) {
      return res.status(400).json({ message: "Invalid file ID format" });
    }

    // 2. Check rate limit
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const rateCheck = checkImageRateLimit(clientIp);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", rateCheck.retryAfter);
      return res.status(429).json({
        success: false,
        message: "Too many image requests, please try again later"
      });
    }

    // 3. Verify file belongs to an approved book
    const book = await Book.findOne({
      "coverImage.driveCoverId": fileId,
      publishStatus: "approved"
    });

    if (!book) {
      // Don't reveal whether fileId exists or just isn't linked
      return res.status(404).json({ message: "Image not found or access denied" });
    }

    // 4. Fetch the thumbnail stream from Google Drive
    // Note: Using 'thumbnailLink' directly often fails due to SameSite cookies.
    // So we use the drive.files.get with alt: 'media' to get the actual content.
    const driveResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // 5. Set Cache Control headers (Cache for 7 days)
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");

    // 6. Set Content-Type (Assuming it's an image)
    const contentType = driveResponse.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", contentType);

    // 7. Pipe the stream to the user
    pipeline(driveResponse.data, res, (err) => {
      if (err) {
        console.error(`[ImageProxy] Pipeline error for ${fileId}:`, err.message);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to stream image" });
        }
      }
    });

  } catch (err) {
    console.error(`[ImageProxy] Error fetching image ${req.params.fileId}:`, err.message);
    if (!res.headersSent) {
      res.status(404).json({ message: "Image not found or access denied" });
    }
  }
});

module.exports = router;
