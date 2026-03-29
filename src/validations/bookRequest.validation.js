const Joi = require("joi");

/**
 * Validation schema for creating a book request.
 *
 * Security rules enforced:
 *  - title:       required, string, 2–120 chars, stripped of extra whitespace
 *  - author:      required, string, 2–100 chars
 *  - section:     required, string, 2–80 chars
 *  - description: optional, string, max 600 chars
 *  - isSeries:    optional boolean (default false)
 *  - seriesName:  required ONLY when isSeries is true, max 100 chars
 *
 * The when() rule enforces seriesName conditionally to prevent invalid states.
 */
const createBookRequestSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(2)
        .max(120)
        .required()
        .messages({
            "string.min": "عنوان الكتاب يجب أن يكون حرفين على الأقل",
            "string.max": "عنوان الكتاب لا يتجاوز 120 حرفاً",
            "any.required": "عنوان الكتاب مطلوب",
        }),

    author: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.min": "اسم المؤلف يجب أن يكون حرفين على الأقل",
            "string.max": "اسم المؤلف لا يتجاوز 100 حرف",
            "any.required": "اسم المؤلف مطلوب",
        }),

    section: Joi.string()
        .trim()
        .min(2)
        .max(80)
        .required()
        .messages({
            "string.min": "اسم القسم يجب أن يكون حرفين على الأقل",
            "string.max": "اسم القسم لا يتجاوز 80 حرفاً",
            "any.required": "القسم مطلوب",
        }),

    description: Joi.string()
        .trim()
        .max(600)
        .allow("")
        .optional()
        .messages({
            "string.max": "الوصف لا يتجاوز 600 حرف",
        }),

    isSeries: Joi.boolean()
        .optional()
        .default(false),

    seriesName: Joi.when("isSeries", {
        is: true,
        then: Joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                "string.min": "اسم السلسلة يجب أن يكون حرفين على الأقل",
                "string.max": "اسم السلسلة لا يتجاوز 100 حرف",
                "any.required": "اسم السلسلة مطلوب عند اختيار سلسلة",
            }),
        otherwise: Joi.string().allow("").optional(),
    }),
}).options({ allowUnknown: false, stripUnknown: true }); // strip any extra fields

module.exports = { createBookRequestSchema };
