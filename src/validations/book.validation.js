const Joi = require("joi");

exports.createBookSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    author: Joi.string().min(2).max(50).required(),
    description: Joi.string().allow('', null).optional(),
    categories: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    sections: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    format: Joi.string().valid('pdf', 'epub').default('pdf'),
    keyTakeaways: Joi.string().allow('', null).optional(),
    isbn: Joi.string().allow('', null).optional(),
    series: Joi.string().hex().length(24).allow(null).optional(),
    seriesOrder: Joi.number().allow(null).optional()
}).unknown(true);

exports.submitBookSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    author: Joi.string().min(2).max(50).required(),
    description: Joi.string().allow("", null).optional(),
    categories: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    sections: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    format: Joi.string().valid("pdf", "epub").default("pdf"),
    keyTakeaways: Joi.string().allow("", null).optional(),
    isbn: Joi.string().allow("", null).optional(),
    series: Joi.string().hex().length(24).allow(null).optional(),
    seriesOrder: Joi.number().allow(null).optional(),
    status: Joi.string().valid("draft", "published").default("draft"),
}).unknown(true);

exports.updateBookSchema = Joi.object({
    title: Joi.string().min(2).max(100),
    author: Joi.string().min(2).max(50),
    description: Joi.string().allow("", null).optional(),
    categories: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    sections: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    format: Joi.string().valid("pdf", "epub"),
    keyTakeaways: Joi.string().allow("", null).optional(),
    isbn: Joi.string().allow("", null).optional(),
    series: Joi.string().hex().length(24).allow(null).optional(),
    seriesOrder: Joi.number().allow(null).optional(),
}).min(1).unknown(true);