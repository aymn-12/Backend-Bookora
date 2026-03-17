const mongoose = require('mongoose')
const PendingUserSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true },
    password:   { type: String, required: true },
    otp:        { type: String, required: true },
    otpExpires: { type: Date, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

// يُحذف تلقائياً بعد 10 دقائق ✅
PendingUserSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingUser", PendingUserSchema);