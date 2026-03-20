const Joi = require("joi");

exports.createBookSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    author: Joi.string().min(2).max(50).required(),
    description: Joi.string().min(1).optional(),
    categories: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    sections: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    format: Joi.string().valid('pdf', 'epub').default('pdf'),
    keyTakeaways: Joi.string().optional(),
    series: Joi.string().hex().length(24).allow(null).optional(),
    seriesOrder: Joi.number().allow(null).optional()
});

exports.updateBookSchema = Joi.object({
    title: Joi.string().min(2).max(100),
    author: Joi.string().min(2).max(50),
    description: Joi.string().min(1),
    categories: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    sections: Joi.alternatives().try(
        Joi.array().items(Joi.string().hex().length(24)),
        Joi.string().hex().length(24)
    ),
    format: Joi.string().valid('pdf', 'epub'),
    keyTakeaways: Joi.string().optional(),
    series: Joi.string().hex().length(24).allow(null).optional(),
    seriesOrder: Joi.number().allow(null).optional()
}).min(1);