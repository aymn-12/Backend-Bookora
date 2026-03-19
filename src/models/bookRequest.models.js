const mongoose = require("mongoose");

const BookRequestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        required: true,
        trim: true,
    },
    section: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isSeries: {
        type: Boolean,
        default: false,
    },
    seriesName: {
        type: String,
        trim: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "fulfilled", "rejected"],
        default: "pending",
    },
}, { timestamps: true });

module.exports = mongoose.model("BookRequest", BookRequestSchema);
