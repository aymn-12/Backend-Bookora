const mongoose = require("mongoose");

const SeriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    type: {
        type: String,
        enum: ["linear", "thematic", "standalone"],
        default: "linear"
    },
    status: {
        type: String,
        enum: ["published", "draft"],
        default: "published"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("Series", SeriesSchema);