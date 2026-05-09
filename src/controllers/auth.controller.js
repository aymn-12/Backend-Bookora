const User = require("../models/user.models");
const PendingUser = require("../models/pendingUser.models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendEmail, verifyEmailTemplate, resetPasswordTemplate } = require("../services/email.service");
const { generateOTP, hashOTP, isOTPExpired, generateRefreshToken } = require("../utils/otp.utils");
const logger = require("../utils/logger.utils");
const { generateCsrfToken, setCsrfCookie, clearCsrfCookie } = require("../utils/csrf.utils");

const generateToken = (id, role) => { //accessToken
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};
const attachAccessToken = (req, res, token) => {
  const isLocalhost = req.hostname === "localhost" || req.hostname === "127.0.0.1";
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: isLocalhost ? "lax" : "none",
    path: "/",
    ...(isLocalhost ? {} : { domain: ".bkora.online" }),
    maxAge: 15 * 60 * 1000
  });
};

const attachTokens = async (req, user, res) => {
  const accessToken = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken();

  user.refreshToken = hashOTP(refreshToken);

  await user.save();

  const isLocalhost = req.hostname === "localhost" || req.hostname === "127.0.0.1";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: isLocalhost ? "lax" : "none",
    ...(isLocalhost ? {} : { domain: ".bkora.online" }),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const csrfToken = generateCsrfToken();
  setCsrfCookie(req, res, csrfToken);

  attachAccessToken(req, res, accessToken);
};


// ─── Register (MODIFIED: Generates User ID)
exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body; // Removed 'name' from req.body
    const userExists = await User.findOne({ email });
    const pendingExists = await PendingUser.findOne({ email });
    if (userExists || pendingExists)
      return res.status(400).json({ success: false, message: "هذا البريد الإلكتروني مسجل مسبقاً" });

    // Generate a random User ID for the name field
    const generatedName = "BKR-" + crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    await PendingUser.create({
      name: generatedName, // Save generated ID
      email,
      password: hashedPassword,
      otp: hashOTP(otp),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    logger.info("New registration attempt", { email, generatedName });
    const template = verifyEmailTemplate(otp);
    await sendEmail({ to: email, ...template });

    res.status(201).json({
      success: true,
      message: "تم إرسال رمز التحقق، يرجى مراجعة بريدك الإلكتروني.",
    });

  } catch (error) { next(error); }
}

// ─── Verify Email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const pending = await PendingUser.findOne({ email });

    if (!pending)
      return res.status(404).json({ message: "طلب التحقق منتهي الصلاحية أو غير موجود" });
    if (isOTPExpired(pending.otpExpires))
      return res.status(400).json({ message: "رمز التحقق منتهي الصلاحية" });

    if (hashOTP(otp) !== pending.otp) {
      pending.attempts += 1;

      if (pending.attempts >= 5) {
        await PendingUser.deleteOne({ email });
        logger.warn("Too many OTP attempts — registration deleted", { email });
        return res.status(400).json({ message: "محاولات كثيرة خاطئة. يرجى التسجيل من جديد." });
      }

      await pending.save();
      logger.warn("Invalid OTP attempt", { email, attempts: pending.attempts });
      return res.status(400).json({
        message: "رمز التحقق غير صحيح",
        remainingAttempts: 5 - pending.attempts,
      });
    }


    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      isVerified: true,
    });

    logger.info("Email verified", { email: pending.email });
    await PendingUser.deleteOne({ email });

    await attachTokens(req, user, res);

    res.status(201).json({
      success: true,
      message: "تم التحقق من البريد الإلكتروني بنجاح. تم إنشاء الحساب.",
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        savedBooks: user.savedBooks || [],
        downloadedBooks: user.downloadedBooks || [],
      },
    });

  } catch (error) { next(error); }
};

// ─── Resend Verification OTP
exports.resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const pending = await PendingUser.findOne({ email });

    if (!pending)
      return res.status(404).json({ message: "طلب التحقق منتهي الصلاحية أو غير موجود" });

    const otp = generateOTP();
    pending.otp = hashOTP(otp);
    pending.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();


    logger.info("OTP resent", { email });

    const template = verifyEmailTemplate(otp);
    await sendEmail({ to: email, ...template });
    res.json({ success: true, message: "تم إعادة إرسال الرمز بنجاح" });

  } catch (error) { next(error); }
};

// ─── Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Login attempt with unknown email", { email });
      return res.status(401).json({ success: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      logger.warn("Login attempt with wrong password", { email });
      return res.status(401).json({ success: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    if (!user.isVerified) {
      logger.warn("Unverified login attempt", { email });
      return res.status(403).json({
        success: false,
        message: "يرجى التحقق من بريدك الإلكتروني أولاً",
        action: "VERIFY_EMAIL",
      });
    }


    await attachTokens(req, user, res);
    logger.info("User logged in", { email, userId: user._id });

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        savedBooks: user.savedBooks || [],
        downloadedBooks: user.downloadedBooks || [],
      },
    });
  } catch (error) { next(error); }
};

// ─── Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.json({ success: true, message: "إذا كان هذا البريد موجوداً لدينا، فقد أرسلنا الرمز إليه" });

    const otp = generateOTP();
    user.resetOtp = hashOTP(otp);
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    logger.info("Password reset requested", { email });

    const template = resetPasswordTemplate(otp);
    await sendEmail({ to: email, ...template });

    res.json({ success: true, message: "إذا كان هذا البريد موجوداً لدينا، فقد أرسلنا الرمز إليه" });

  } catch (error) { next(error); }
};

// ─── Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "المستخدم غير موجود" });

    if (isOTPExpired(user.resetOtpExpires)) {
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: "رمز التحقق منتهي الصلاحية" });
    }

    if (hashOTP(otp) !== user.resetOtp) {
      user.attempts += 1;

      if (user.attempts >= 5) {
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        user.attempts = 0;
        await user.save();
        logger.warn("Too many reset attempts", { email });
        return res.status(400).json({ message: "محاولات كثيرة خاطئة. يرجى طلب رمز جديد." });
      }

      await user.save();
      return res.status(400).json({
        message: "رمز التحقق غير صحيح",
        remainingAttempts: 5 - user.attempts,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.attempts = 0;
    await user.save();

    logger.info("Password reset successful", { email });

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });

  } catch (error) { next(error); }
};

// ─── Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token)
      return res.status(401).json({ message: "No refresh token" });

    const hashedToken = hashOTP(token);
    const user = await User.findOne({ refreshToken: hashedToken });

    if (!user) {
      logger.warn("Invalid refresh token attempt");
      return res.status(401).json({ message: "جلسة التحديث غير صالحة" });
    }

    const newRefreshToken = generateRefreshToken();
    user.refreshToken = hashOTP(newRefreshToken);
    await user.save();

    const isLocalhost = req.hostname === "localhost" || req.hostname === "127.0.0.1";
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: isLocalhost ? "lax" : "none",
      ...(isLocalhost ? {} : { domain: ".bkora.online" }),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (synchronized with attachTokens)
    });

    // ─── CSRF: rotate CSRF token on each refresh (token rotation)
    const newCsrfToken = generateCsrfToken();
    setCsrfCookie(req, res, newCsrfToken);

    const accessToken = generateToken(user._id, user.role);
    attachAccessToken(req, res, accessToken);

    res.json({ success: true, csrfToken: newCsrfToken });
  } catch (error) { next(error); }
};

// ─── Profile
exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password -__v -refreshToken -resetOtp -resetOtpExpires");

    if (!user)
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });

    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// ─── Change Password (For Logged In Users)
exports.requestChangePasswordOTP = async (req, res, next) => {
  try {
    const { oldPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    // التأكد من كلمة المرور القديمة أولاً
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "كلمة المرور الحالية غير صحيحة" });
    }

    // إنشاء OTP جديد
    const otp = generateOTP();

    user.resetOtp = hashOTP(otp); // سنستخدم نفس حقل الـ resetOtp
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // صالح لـ 10 دقائق
    await user.save();

    logger.info("Change Password OTP requested", { email: user.email });

    // إرسال الإيميل (استخدمت قالب الـ verify مؤقتاً، يمكنك إنشاء قالب مخصص لاحقاً)
    const template = resetPasswordTemplate(otp);
    await sendEmail({ to: user.email, ...template });

    res.json({ success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
  } catch (error) { next(error); }
};

exports.verifyChangePassword = async (req, res, next) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    // التأكد من صلاحية הـ OTP
    if (isOTPExpired(user.resetOtpExpires)) {
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: "رمز التحقق منتهي الصلاحية" });
    }

    // التأكد من مطابقة הـ OTP
    if (hashOTP(otp) !== user.resetOtp) {
      user.attempts += 1;

      if (user.attempts >= 5) {
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        user.attempts = 0;
        await user.save();
        logger.warn("Too many reset attempts", { email: user.email });
        return res.status(400).json({ message: "محاولات كثيرة خاطئة. يرجى طلب رمز جديد." });
      }

      await user.save();
      return res.status(400).json({
        message: "رمز التحقق غير صحيح",
        remainingAttempts: 5 - user.attempts,
      });
    }

    // تحديث كلمة المرور
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.attempts = 0;
    await user.save();

    logger.info("Password changed successfully", { userId: user._id });

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) { next(error); }
};

// ─── Logout
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await User.findOneAndUpdate(
        { refreshToken: hashOTP(token) },
        { $unset: { refreshToken: "" } }
      );
    }

    logger.info("User logged out", { userId: req.user?._id });

    const isLocalhost = req.hostname === "localhost" || req.hostname === "127.0.0.1";
    
    res.clearCookie("refreshToken", { 
      secure: !isLocalhost, 
      sameSite: isLocalhost ? "lax" : "none", 
      ...(isLocalhost ? {} : { domain: ".bkora.online" }) 
    });
    
    res.clearCookie("accessToken", { 
      path: "/", 
      secure: !isLocalhost, 
      sameSite: isLocalhost ? "lax" : "none", 
      ...(isLocalhost ? {} : { domain: ".bkora.online" }) 
    });

    // ─── CSRF: clear the CSRF cookie on logout
    clearCsrfCookie(req, res);

    res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
  } catch (error) { next(error); }
};
