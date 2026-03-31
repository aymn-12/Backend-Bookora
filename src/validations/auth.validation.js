const Joi = require("joi");

exports.registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "يرجى إدخال بريد إلكتروني صحيح",
        "string.empty": "البريد الإلكتروني مطلوب",
        "any.required": "البريد الإلكتروني مطلوب"
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/).required().messages({
        "string.min": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base": "كلمة المرور يجب أن تحتوي على حرف ورقم واحد على الأقل",
        "string.empty": "كلمة المرور مطلوبة",
        "any.required": "كلمة المرور مطلوبة"
    }),
});

exports.loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "يرجى إدخال بريد إلكتروني صحيح",
        "string.empty": "البريد الإلكتروني مطلوب",
        "any.required": "البريد الإلكتروني مطلوب"
    }),
    password: Joi.string().required().messages({
        "string.empty": "كلمة المرور مطلوبة",
        "any.required": "كلمة المرور مطلوبة"
    }),
});

exports.verifyEmailSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "يرجى إدخال بريد إلكتروني صحيح",
        "any.required": "البريد الإلكتروني مطلوب"
    }),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
        "string.length": "رمز التحقق يجب أن يتكون من 6 أرقام",
        "string.pattern.base": "رمز التحقق يجب أن يحتوي على أرقام فقط",
        "any.required": "رمز التحقق مطلوب"
    }),
});

exports.forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "يرجى إدخال بريد إلكتروني صحيح",
        "any.required": "البريد الإلكتروني مطلوب"
    }),
});

exports.resetPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "يرجى إدخال بريد إلكتروني صحيح",
        "any.required": "البريد الإلكتروني مطلوب"
    }),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
        "string.length": "رمز التحقق يجب أن يتكون من 6 أرقام",
        "string.pattern.base": "رمز التحقق يجب أن يحتوي على أرقام فقط",
        "any.required": "رمز التحقق مطلوب"
    }),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/).required().messages({
        "string.min": "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
        "string.pattern.base": "كلمة المرور الجديدة يجب أن تحتوي على حرف ورقم واحد على الأقل",
        "any.required": "كلمة المرور الجديدة مطلوبة"
    }),
});