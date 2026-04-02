const mongoose = require('mongoose')
const PendingUserSchema = new mongoose.Schema({
    name:       { type: String, required: [true, "اسم المستخدم مطلوب"] },
    email:      { 
        type: String, 
        required: [true, "يرجى إدخال البريد الإلكتروني"], 
        unique: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "يرجى إدخال بريد إلكتروني صحيح"]
    },
    password:   { type: String, required: [true, "كلمة المرور مطلوبة"] },
    otp:        { type: String, required: [true, "رمز التحقق مطلوب"] },
    otpExpires: { type: Date, required: true },
    attempts: { type: Number, default: 0 }
}, { timestamps: true });

// يُحذف تلقائياً بعد 10 دقائق ✅
PendingUserSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingUser", PendingUserSchema);