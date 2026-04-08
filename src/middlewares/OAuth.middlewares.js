const jwt = require("jsonwebtoken")
const User = require("../models/user.models")

module.exports = async (req, res, next) =>{
    try{

        const token = req.cookies?.accessToken 
            || req.headers.authorization?.split(" ")[1];

        if(!token) return res.status(401).json({ 
            success: false, 
            message: "يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة." 
        });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decoded.id).select("-password -refreshToken -otp -resetOtp")
        if(!user) return res.status(401).json({ 
            success: false, 
            message: "المستخدم غير موجود، يرجى إعادة تسجيل الدخول." 
        });

        
        req.user = user
        next()

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                code: "TOKEN_EXPIRED",
                message: "انتهت صلاحية الجلسة، جاري تجديدها..."
            });
        }
        return res.status(401).json({
            success: false,
            code: "TOKEN_INVALID",
            message: "جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى."
        });
    }
}