const jwt = require("jsonwebtoken");
const User = require("../models/user.models");

module.exports = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken 
            || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password -refreshToken -otp -resetOtp");
        
        if (user) {
            req.user = user;
        }
        
        next();
    } catch (error) {
        next();
    }
};
