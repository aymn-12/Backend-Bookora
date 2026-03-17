module.exports = (req, res, next) => {
    if(!req.user.isVerified) {
        return res.status(403).json({
            success : false,
            message : "Please verify your email.",
            action : "VERIFY_EMAIL"
        })
    }
    next()
}