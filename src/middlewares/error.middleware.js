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

    // Logic to sanitize technical messages from production users
    const technicalKeywords = [
        'SSL', 'TLS', 'ECONNREFUSED', 'ETIMEDOUT', 'OpenSSL', 'routines',
        'mongodb', 'mongoose', 'database', 'query', 'syntax error', 'unexpected token'
    ];

    const isTechnical = technicalKeywords.some(kw => 
        message.toLowerCase().includes(kw.toLowerCase()) || 
        (err.stack && err.stack.toLowerCase().includes(kw.toLowerCase()))
    );

    if (isTechnical && process.env.NODE_ENV !== "development") {
        message = "عذراً، واجهنا مشكلة تقنية أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.";
    }

    // Specific mapping for common errors
    if (status === 404) message = "المورد المطلوب غير موجود.";
    if (status === 401) message = "غير مصرح لك بالوصول. يرجى تسجيل الدخول.";
    if (status === 403) message = "ليس لديك الصلاحية للقيام بهذا الإجراء.";

    res.status(status).json({
        success: false,
        message: message,
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