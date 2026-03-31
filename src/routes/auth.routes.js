const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const verifiedMiddleware = require("../middlewares/verified.middleware");
const validate = require("../middlewares/validate.middlewares");
const csrfMiddleware = require("../middlewares/csrf.middleware");
const { generateCsrfToken, setCsrfCookie } = require("../utils/csrf.utils");
const { authLimiter, registerLimiter } = require("../middlewares/rateLimit.middleware");

const {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("../validations/auth.validation");

// ─── Public Routes
router.post("/register",        registerLimiter, validate(registerSchema),                   authController.register);
router.post("/verify-email",    authLimiter,     validate(verifyEmailSchema),    authController.verifyEmail);
router.post("/resend-otp",      authLimiter,                                 authController.resendVerificationOTP);
router.post("/login",           authLimiter,     validate(loginSchema),                      authController.login);
router.post("/forgot-password", authLimiter,     validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password",  authLimiter,     validate(resetPasswordSchema),  authController.resetPassword);

// ─── CSRF Token Endpoint
// Returns a fresh CSRF token. Call this once on app load if no token exists.
router.get("/csrf-token", (req, res) => {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    res.json({ success: true, csrfToken: token });
});

// ─── Cookie-dependent Routes (CSRF Protected)
router.post("/refresh-token", csrfMiddleware,                               authController.refreshToken);
router.post("/change-password/request", authMiddleware, authController.requestChangePasswordOTP);
router.post("/change-password/verify", authMiddleware, authController.verifyChangePassword);

// ─── Protected Routes
router.get("/profile",  authMiddleware, verifiedMiddleware, authController.profile);
router.post("/logout",  authMiddleware, csrfMiddleware,     authController.logout);

module.exports = router;