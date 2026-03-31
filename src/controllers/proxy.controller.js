const axios = require("axios");
const logger = require("../utils/logger.utils");

const proxyImage = async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ success: false, message: "URL is required" });
    }

    try {
        // Validate that the URL is from a safe domain (Google Drive)
        if (!url.startsWith("https://drive.google.com")) {
            return res.status(403).json({ success: false, message: "Only Google Drive URLs are allowed for proxying" });
        }

        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 10000, // 10s timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Set response headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Pipe the image data
        response.data.pipe(res);

    } catch (error) {
        logger.error(`[Proxy] Failed to fetch image: ${url} - ${error.message}`);
        res.status(error.response?.status || 500).json({ 
            success: false, 
            message: "Failed to proxy image" 
        });
    }
};

module.exports = {
    proxyImage
};
