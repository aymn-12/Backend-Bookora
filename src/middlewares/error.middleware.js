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

    // تحويل الرسائل الشائعة للعربية
    if (status === 500 && !err.message) {
        message = "عذراً، واجهنا مشكلة تقنية. يرجى المحاولة لاحقاً.";
    }

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