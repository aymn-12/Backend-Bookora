const crypto = require("crypto");

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32; // 256-bit entropy

const COOKIE_DOMAIN = ".bkora.online";

/**
 * Generates a cryptographically secure random CSRF token.
 * @returns {string} hex-encoded random token
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
};

/**
 * Sets the CSRF token as a readable (non-httpOnly) cookie so the frontend
 * can read it and send it back in the X-CSRF-Token header.
 *
 * Security note: The cookie is intentionally readable by JS (no httpOnly)
 * because the Double Submit Cookie pattern requires the client to read it.
 * The protection comes from Same-Origin Policy — a cross-origin attacker
 * cannot read the cookie value.
 *
 * @param {import("express").Response} res
 * @param {string} token
 */
const setCsrfCookie = (res, token) => {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JS for Double Submit pattern
    secure: true,
    sameSite: "none",
    domain: COOKIE_DOMAIN, // Shared across all subdomains (api.bkora.online ↔ bkora.online)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — same as refreshToken
  });
};

/**
 * Clears the CSRF cookie on logout.
 * @param {import("express").Response} res
 */
const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    secure: true,
    sameSite: "none",
    domain: COOKIE_DOMAIN, // Must match the cookie's domain to clear it properly
  });
};

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
};
