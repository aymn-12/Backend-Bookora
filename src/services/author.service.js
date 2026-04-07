const User = require('../models/user.models');

const TRIAL_DAYS        = 15;
const TRIAL_BOOK_LIMIT  = 3;
const MONTHLY_BOOK_LIMIT = 10;

/**
 * Activate a 15-day trial for a user.
 * Resets trialBooksUsed to 0 on each call (allows re-trial if needed by admin).
 * @param {string} userId - MongoDB user ID
 * @returns {Promise<Object>} Updated authorSubscription subdocument
 */
const startTrial = async (userId) => {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const user = await User.findByIdAndUpdate(
        userId,
        {
            'authorSubscription.status':        'trial',
            'authorSubscription.trialEndsAt':   trialEndsAt,
            'authorSubscription.trialBooksUsed': 0,
        },
        { new: true }
    );

    return user.authorSubscription;
};

/**
 * Check if user is allowed to upload based on subscription quota.
 * Also auto-expires stale trial records in the DB.
 * @param {string} userId - MongoDB user ID
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
const checkUploadQuota = async (userId) => {
    const user = await User.findById(userId).select('authorSubscription');
    if (!user) return { allowed: false, reason: 'User not found' };

    const sub = user.authorSubscription;

    // ── Trial expired: update DB status and block ──────────────────────────
    if (sub.status === 'trial' && sub.trialEndsAt < new Date()) {
        await User.updateOne(
            { _id: userId },
            { 'authorSubscription.status': 'expired' }
        );
        return { allowed: false, reason: 'Trial expired' };
    }

    // ── Active trial: check book limit ─────────────────────────────────────
    if (sub.status === 'trial') {
        if (sub.trialBooksUsed >= TRIAL_BOOK_LIMIT) {
            return { allowed: false, reason: `Trial book limit reached (${TRIAL_BOOK_LIMIT} books)` };
        }
        return { allowed: true };
    }

    // ── Active subscription: check monthly limit ───────────────────────────
    if (sub.status === 'active') {
        if (sub.monthlyUploadCount >= MONTHLY_BOOK_LIMIT) {
            return { allowed: false, reason: `Monthly upload limit reached (${MONTHLY_BOOK_LIMIT} books)` };
        }
        return { allowed: true };
    }

    // ── No subscription ────────────────────────────────────────────────────
    return { allowed: false, reason: 'No active trial or subscription' };
};

/**
 * Increment upload counters after a successful book submission.
 * Increments both trialBooksUsed and monthlyUploadCount.
 * @param {string} userId - MongoDB user ID
 */
const incrementUploadCount = async (userId) => {
    await User.updateOne(
        { _id: userId },
        {
            $inc: {
                'authorSubscription.trialBooksUsed':    1,
                'authorSubscription.monthlyUploadCount': 1,
            },
        }
    );
};

module.exports = { startTrial, checkUploadQuota, incrementUploadCount };
