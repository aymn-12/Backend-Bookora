const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "عنوان الكتاب مطلوب"],
        unique: true,
        trim: true,
    },
    normalizedTitle: {
        type: String,
        unique: true,
        trim: true,
    },
    fileHash: {
        type: String,
        unique: true,
    },
    author: {
        type: String,
        required: [true, "اسم المؤلف مطلوب"],
    },
    description: {
        type: String,
        required: [true, "وصف الكتاب مطلوب"],
    },
    // ─── تغيير من category واحد إلى categories متعددة
    categories: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        }],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: "يجب اختيار تصنيف واحد على الأقل للملف"
        }
    },
    sections: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Section",
        }],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: "يجب اختيار قسم واحد على الأقل للملف"
        }
    },
    status: {
        type: String,
        enum: ["published", "draft", "archived"],
        default: "published",
        index: true
    },
    fileUrl: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
        required: true,
    },
    driveFileId: {
        type: String,
        required: true,
    },
    driveCoverId: {
        type: String,
        required: true,
    },
    format: {
        type: String,
        enum: ["pdf", "epub"],
        default: "pdf",
    },
    isbn: {
        type: String,
        default: null,
    },
    downloadCount: {
        type: Number,
        default: 0,
        index: true
    },
    // ─── السلسلة (اختياري)
    series: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Series",
        default: null,
    },
    seriesOrder: {
        type: Number,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    // ─── ميزة التقييمات (لتحسين الأداء)
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        index: true
    },
    reviewCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true }); 

BookSchema.index({ title: "text", author: "text" });
BookSchema.index({ createdBy: 1 });
BookSchema.index({ categories: 1 });
BookSchema.index({ sections: 1 });
BookSchema.index({ series: 1 });
BookSchema.index({ status: 1, createdAt: -1 });
BookSchema.index({ status: 1, downloadCount: -1 });

module.exports = mongoose.model("Book", BookSchema);