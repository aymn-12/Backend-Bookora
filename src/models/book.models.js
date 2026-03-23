const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
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
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    // ─── تغيير من category واحد إلى categories متعددة
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
    }],
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
    }],
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
    keyTakeaways: {
        type: [String],
        default: [],
    },
    isbn: {
        type: String,
        default: null,
    },
    downloadCount: {
        type: Number,
        default: 0,
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
}, { timestamps: true });

BookSchema.index({ createdBy: 1 });
BookSchema.index({ categories: 1 });
BookSchema.index({ sections: 1 });
BookSchema.index({ series: 1 });

module.exports = mongoose.model("Book", BookSchema);