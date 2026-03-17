const Joi = require("joi");

exports.createBookSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    author: Joi.string().min(2).max(50).required(),
    description: Joi.string().min(1).optional(),
    category: Joi.string().hex().length(24).required(),
    format: Joi.string().valid('pdf', 'epub').default('pdf'),
    fileUrl: Joi.string().uri().optional(),
    coverImage: Joi.string().uri().optional(),
    keyTakeaways: Joi.string().optional(),
});


exports.updateBookSchema = Joi.object({
    title: Joi.string().min(2).max(100),
    author: Joi.string().min(2).max(50),
    description: Joi.string().min(10),
    category: Joi.string().hex().length(24),
    format: Joi.string().valid('pdf', 'epub'),
    fileUrl: Joi.string().uri().optional(),
    coverImage: Joi.string().uri().optional(),
    keyTakeaways: Joi.string().optional()
}).min(1);