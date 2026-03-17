const jwt = require("jsonwebtoken")
const User = require("../models/user.models")

module.exports = async (req, res, next) =>{
    try{

        const header = req.headers.authorization;

        if(!header || !header.startsWith("Bearer")) return res.status(401).json({ 
            success: false, 
            message: "يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة." 
        });
        
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decoded.id).select("-password -refreshToken -otp -resetOtp")
        if(!user) return res.status(401).json({ 
            success: false, 
            message: "المستخدم غير موجود، يرجى إعادة تسجيل الدخول." 
        });

        
        req.user = user
        next()

    }catch(error){
        return res.status(401).json({ 
            success: false,
            message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى." 
        });
    }
}