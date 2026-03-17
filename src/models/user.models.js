const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // 'name' سيخزن الآن معرف النظام التلقائي مثل (BKR-123456)
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: "user", 
        enum: ["user", "admin", "superadmin"] 
    },
    
    // الكتب التي قام المستخدم بحفظها (المفضلة/المكتبة الخاصة)
    savedBooks: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Book" 
    }],

    
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    downloadedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    attempts: { type: Number, default: 0 },
    resetOtp: String,
    resetOtpExpires: Date,
    refreshToken: String,
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
