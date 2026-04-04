const express = require("express");
const router = express.Router();
const { drive } = require("../services/drive.service");
const { pipeline } = require("stream");

// Route to proxy book cover images from Google Drive
router.get("/cover/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        if (!fileId) {
            return res.status(400).json({ message: "File ID is required" });
        }

        // 1. Get file metadata (optional, but good for Content-Type)
        // Alternatively, we can just jump to the stream.
        // Google Drive thumbnails are usually images, so we can default to image/jpeg or similar.
        
        // 2. Fetch the thumbnail stream from Google Drive
        // Note: Using 'thumbnailLink' directly often fails due to SameSite cookies.
        // So we use the drive.files.get with alt: 'media' to get the actual content.
        // But for thumbnails, Google provides a specific endpoint or we can use sz parameter.
        
        const driveResponse = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "stream" }
        );

        // 3. Set Cache Control headers (Cache for 7 days)
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        
        // 4. Set Content-Type (Assuming it's an image)
        const contentType = driveResponse.headers["content-type"] || "image/jpeg";
        res.setHeader("Content-Type", contentType);

        // 5. Pipe the stream to the user
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
