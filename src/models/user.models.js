const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // 'name' سيخزن الآن معرف النظام التلقائي مثل (BKR-123456)
    name: { 
        type: String, 
        required: [true, "يرجى توفير اسم المستخدم"] 
    },
    email: { 
        type: String, 
        required: [true, "يرجى إدخال البريد الإلكتروني"], 
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "يرجى إدخال بريد إلكتروني صحيح"]
    },
    password: { 
        type: String, 
        required: [true, "يرجى إدخال كلمة المرور"],
        minlength: [8, "كلمة المرور يجب ألا تقل عن 8 أحرف"]
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
    interestScores: {
        type: Map,
        of: Number,
        default: {}
    },
    authorSubscription: {
        status: {
            type: String,
            enum: ["none", "trial", "active", "expired"],
            default: "none"
        },
        trialEndsAt: {
            type: Date,
            default: null
        },
        trialBooksUsed: {
            type: Number,
            default: 0
        },
        monthlyUploadCount: {
            type: Number,
            default: 0
        },
        subscriptionStartsAt: {
            type: Date,
            default: null
        },
        subscriptionEndsAt: {
            type: Date,
            default: null
        }
    },
}, { 
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.resetOtp;
            delete ret.resetOtpExpires;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.resetOtp;
            delete ret.resetOtpExpires;
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model("User", UserSchema);
