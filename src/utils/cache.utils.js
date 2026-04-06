const cache = new Map();

/**
 * Get item from cache
 * @param {string} key 
 * @returns {any|null} The cached value or null if expired/not found
 */
exports.getCache = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }
    return entry.value;
};

/**
 * Set item into cache with TTL
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
exports.setCache = (key, value, ttlSeconds = 60) => {
    cache.set(key, { 
        value, 
        expiry: Date.now() + (ttlSeconds * 1000) 
    });
};

/**
 * Clear a specific key
 * @param {string} key 
 */
exports.clearCache = (key) => {
    cache.delete(key);
};

// Background task to clean up expired cache entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiry) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000); // 5 minutes
