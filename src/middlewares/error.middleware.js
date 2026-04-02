const logger = require("../utils/logger.utils");
const errorHandler = (err, req, res, next) => {
    logger.error(err.message, {
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
    });

    const status = err.status || 500;
    let message = err.message || "حدث خطأ غير متوقع في النظام.";

    // ─── Mongoose Validation Error (Precise Field-level messages)
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: Object.values(err.errors).map(val => val.message).join(", ")
        });
    }

    // ─── Mongoose Cast Error (Invalid IDs)
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `قيمة غير صالحة لـ ${err.path}: ${err.value}`
        });
    }

    // ─── MongoDB Duplicate Key Error (Unique Constraint)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const msg = field === "email" ? "هذا البريد الإلكتروني مسجل مسبقاً" : `هذا الـ ${field} موجود مسبقاً`;
        return res.status(400).json({
            success: false,
            message: msg
        });
    }

    // ─── JWT Errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى."
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً."
        });
    }

    // Logic to sanitize technical messages from production users
    const technicalKeywords = [
        'SSL', 'TLS', 'ECONNREFUSED', 'ETIMEDOUT', 'OpenSSL', 'routines',
        'mongodb', 'mongoose', 'database', 'query', 'syntax error', 'unexpected token'
    ];

    const isTechnical = technicalKeywords.some(kw => 
        message.toLowerCase().includes(kw.toLowerCase()) || 
        (err.stack && err.stack.toLowerCase().includes(kw.toLowerCase()))
    );

    let displayMessage = message;
    if (isTechnical && process.env.NODE_ENV !== "development") {
        displayMessage = "عذراً، واجهنا مشكلة تقنية أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.";
    }

    // Specific mapping for common errors
    if (status === 404) displayMessage = "المورد المطلوب غير موجود.";
    if (status === 401) displayMessage = "غير مصرح لك بالوصول. يرجى تسجيل الدخول.";
    if (status === 403) displayMessage = "ليس لديك الصلاحية للقيام بهذا الإجراء.";

    res.status(status).json({
        success: false,
        message: displayMessage,
        technical_error: process.env.NODE_ENV === "development" ? err.message : undefined,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };