const { getCache, setCache } = require("../utils/cache.utils");

/**
 * Server-Side Cache Middleware
 * Skips caching if the user is authenticated (to preserve personalization)
 * Intercepts the response JSON and caches it.
 * @param {number} durationSeconds Time to live in seconds
 */
const cacheMiddleware = (durationSeconds = 60) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== "GET") return next();
        
        // Skip caching entirely for authenticated users (personalization matters)
        // Note: optionalAuth middleware might attach req.user
        if (req.user || req.headers.authorization) return next();

        // Ensure we only cache common searches to avoid memory bloat
        // Generate a cache key based on URL and purely primitive queries
        const key = "__api_cache_" + req.originalUrl || req.url;

        // Try to get from cache
        const cachedBody = getCache(key);
        if (cachedBody) {
            // Serve directly from fast RAM
            res.setHeader("X-Cache", "HIT");
            return res.json(cachedBody);
        }

        // If not cached, intercept the response by wrapping res.json
        res.setHeader("X-Cache", "MISS");
        
        const originalJson = res.json;
        res.json = function (body) {
            // Avoid caching error responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setCache(key, body, durationSeconds);
            }
            // Execute the original res.json
            originalJson.call(this, body);
        };

        next();
    };
};

module.exports = cacheMiddleware;
