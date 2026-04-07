const Joi = require("joi");

// ── Reusable helpers ──────────────────────────────────────────────────────────
const objectId = () => Joi.string().hex().length(24);

// ── POST /api/author/upload-request ──────────────────────────────────────────
// Validates basic book metadata BEFORE generating signed upload URLs
exports.uploadRequestSchema = Joi.object({
    title: Joi.string().min(2).max(200).required().messages({
        "string.min":  "عنوان الكتاب يجب أن يحتوي على حرفين على الأقل",
        "string.max":  "عنوان الكتاب يجب ألا يتجاوز 200 حرف",
        "any.required": "عنوان الكتاب مطلوب",
    }),
    author: Joi.string().min(2).max(100).required().messages({
        "string.min":  "اسم المؤلف يجب أن يحتوي على حرفين على الأقل",
        "string.max":  "اسم المؤلف يجب ألا يتجاوز 100 حرف",
        "any.required": "اسم المؤلف مطلوب",
    }),
    description: Joi.string().min(20).max(2000).required().messages({
        "string.min":  "وصف الكتاب يجب أن يحتوي على 20 حرفاً على الأقل",
        "string.max":  "وصف الكتاب يجب ألا يتجاوز 2000 حرف",
        "any.required": "وصف الكتاب مطلوب",
    }),
    categories: Joi.alternatives()
        .try(
            Joi.array().items(objectId()).min(1).max(5),
            objectId()
        )
        .required()
        .messages({ "any.required": "يجب اختيار تصنيف واحد على الأقل" }),
    sections: Joi.alternatives()
        .try(
            Joi.array().items(objectId()).min(1).max(3),
            objectId()
        )
        .required()
        .messages({ "any.required": "يجب اختيار قسم واحد على الأقل" }),
    format: Joi.string().valid("pdf", "epub").default("pdf"),
    isbn:   Joi.string().allow("", null).optional(),
});

// ── POST /api/author/upload-confirm ──────────────────────────────────────────
// Validates the final confirmation payload after the user uploads to Supabase
exports.uploadConfirmSchema = Joi.object({
    uploadId:    Joi.string().uuid().required().messages({
        "string.guid":  "معرف الرفع غير صحيح",
        "any.required": "معرف الرفع (uploadId) مطلوب",
    }),
    pdfPath:   Joi.string().min(5).required().messages({
        "any.required": "مسار ملف PDF مطلوب",
    }),
    coverPath: Joi.string().min(5).required().messages({
        "any.required": "مسار صورة الغلاف مطلوب",
    }),
    // Book metadata (same rules as upload-request)
    title: Joi.string().min(2).max(200).required(),
    author: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(20).max(2000).required(),
    categories: Joi.alternatives()
        .try(
            Joi.array().items(objectId()).min(1).max(5),
            objectId()
        )
        .required(),
    sections: Joi.alternatives()
        .try(
            Joi.array().items(objectId()).min(1).max(3),
            objectId()
        )
        .required(),
    format: Joi.string().valid("pdf", "epub").default("pdf"),
    isbn:   Joi.string().allow("", null).optional(),
});
