/**
 * Helper to determine if a request should bypass the rate limiter.
 * This checks for a secure header so that load tests from a single machine
 * can bypass limits without exposing the API to actual abuse.
 * 
 * @param {import('express').Request} req 
 * @returns {boolean} true if the request should bypass the rate limit
 */
exports.skipLoadTest = (req) => {
    // Only skip if the header exactly matches the secret from environment variables
    // and the environment variable actually exists.
    if (!process.env.LOAD_TEST_SECRET) return false;
    return req.headers['x-load-test-secret'] === process.env.LOAD_TEST_SECRET;
};
