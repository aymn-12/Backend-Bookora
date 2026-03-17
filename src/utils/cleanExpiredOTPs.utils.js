const cron = require("node-cron")
const User = require("../models/user.models")

const cleanExpiredOTPS = () => {
    cron.schedule("0 * * * *" , async () => {
        await User.updateMany(
            { resetOtpExpires: { $lt: new Date() } },
            {$unset: { resetOtp: "", resetOtpExpires: "" }}
        );
        console.log("🧹 Cleaned expired reset OTPs")
    })
}

module.exports = cleanExpiredOTPS