const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const verifiedMiddleware = require("../middlewares/verified.middleware");
const validate = require("../middlewares/validate.middlewares");
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many attempts, try again later" }
});

const {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("../validations/auth.validation");

// ─── Public Routes
router.post("/register",        validate(registerSchema),                   authController.register);
router.post("/verify-email",    otpLimiter, validate(verifyEmailSchema),    authController.verifyEmail);
router.post("/resend-otp",      otpLimiter,                                 authController.resendVerificationOTP);
router.post("/login",           validate(loginSchema),                      authController.login);
router.post("/forgot-password", otpLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password",  otpLimiter, validate(resetPasswordSchema),  authController.resetPassword);
router.post("/refresh-token",                                               authController.refreshToken);
router.post("/change-password/request", authMiddleware, authController.requestChangePasswordOTP);
router.post("/change-password/verify", authMiddleware, authController.verifyChangePassword);

// ─── Protected Routes
router.get("/profile",  authMiddleware, verifiedMiddleware, authController.profile);
router.post("/logout",  authMiddleware,                     authController.logout);

module.exports = router;