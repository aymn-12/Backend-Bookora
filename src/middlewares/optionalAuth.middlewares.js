const jwt = require("jsonwebtoken");
const User = require("../models/user.models");

module.exports = async (req, res, next) => {
    try {
        const header = req.headers.authorization;

        // إذا لم يكن هناك توكن، نتركه يمر كزائر (بدون إعطاء خطأ 401)
        if (!header || !header.startsWith("Bearer")) {
            return next();
        }

        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password -refreshToken -otp -resetOtp");
        
        // إذا وجدنا المستخدم، نضعه في req.user
        if (user) {
            req.user = user;
        }
        
        next();
    } catch (error) {
        // في حال كان التوكن منتهياً أو خاطئاً، نتركه يمر كزائر أيضاً في المسارات العامة
        next();
    }
};
