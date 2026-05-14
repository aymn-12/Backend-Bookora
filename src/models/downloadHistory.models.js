const mongoose = require("mongoose");

const DownloadHistorySchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

DownloadHistorySchema.index({ date: 1 });

module.exports = mongoose.model("DownloadHistory", DownloadHistorySchema);
