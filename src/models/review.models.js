const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    book: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book', 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    comment: { 
        type: String, 
        required: true 
    }
}, { timestamps: true });

ReviewSchema.index({ book: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);