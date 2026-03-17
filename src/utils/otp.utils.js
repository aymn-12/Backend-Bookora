const crypto = require("crypto");

const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString()
};

const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

const hashOTP = (otp) => {
    return crypto.createHash("sha256").update(otp).digest('hex')
}

const isOTPExpired = (expiresAt) => {
    return !expiresAt || expiresAt < new Date();
}

module.exports = { generateOTP, hashOTP, isOTPExpired, generateRefreshToken  };