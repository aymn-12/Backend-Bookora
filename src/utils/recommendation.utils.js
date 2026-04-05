const User = require("../models/user.models");

exports.updateUserInterests = async (userId, categoryIds, points) => {
    try {
        if (!userId || !categoryIds || categoryIds.length === 0) return;
        
        const user = await User.findById(userId);
        if (!user) return;

        if (!user.interestScores) {
            user.interestScores = new Map();
        }

        categoryIds.forEach(catId => {
            if (!catId) return;
            const strId = catId.toString();
            const currentScore = user.interestScores.get(strId) || 0;
            user.interestScores.set(strId, currentScore + points);
        });

        await user.save();
    } catch (error) {
        console.error("[updateUserInterests] Error:", error.message);
    }
};