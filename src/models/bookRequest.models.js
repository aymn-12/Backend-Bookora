const mongoose = require("mongoose");

const BookRequestSchema = new mongoose.Schema({
    title: {
        type:      String,
        required:  true,
        trim:      true,
        maxlength: [120, "عنوان الكتاب لا يتجاوز 120 حرفاً"],
    },
    author: {
        type:      String,
        required:  true,
        trim:      true,
        maxlength: [100, "اسم المؤلف لا يتجاوز 100 حرف"],
    },
    section: {
        type:      String,
        required:  true,
        trim:      true,
        maxlength: [80, "اسم القسم لا يتجاوز 80 حرفاً"],
    },
    description: {
        type:      String,
        trim:      true,
        maxlength: [600, "الوصف لا يتجاوز 600 حرف"],
    },
    isSeries: {
        type:    Boolean,
        default: false,
    },
    seriesName: {
        type:      String,
        trim:      true,
        maxlength: [100, "اسم السلسلة لا يتجاوز 100 حرف"],
    },
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
    },
    status: {
        type:    String,
        enum:    ["pending", "approved", "fulfilled", "rejected"],
        default: "pending",
    },
}, { timestamps: true });

// ─── Prevent duplicate pending requests (same user + same title + same author)
// This stops spam submissions of identical requests.
BookRequestSchema.index(
    { userId: 1, title: 1, author: 1 },
    {
        unique:              true,
        partialFilterExpression: { status: "pending" },
        collation:           { locale: "ar", strength: 2 }, // case/accent insensitive
    }
);

module.exports = mongoose.model("BookRequest", BookRequestSchema);

