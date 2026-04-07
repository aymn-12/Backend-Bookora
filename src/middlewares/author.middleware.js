const { checkUploadQuota: checkQuota } = require('../services/author.service');

/**
 * Verify user has an active trial or paid subscription before accessing author routes.
 * Blocks users with status: 'none' or 'expired'.
 */
const checkAuthorAccess = (req, res, next) => {
    const status = req.user?.authorSubscription?.status;

    if (status === 'trial' || status === 'active') {
        return next();
    }

    const message = status === 'expired'
        ? 'انتهت فترة التجربة أو اشتراكك. يرجى تفعيل الاشتراك للمتابعة.'
        : 'يجب تفعيل حساب المؤلف أولاً. ابدأ بفترة التجربة المجانية.';

    return res.status(403).json({ success: false, message });
};

/**
 * Verify user has not exceeded their upload quota before proceeding.
 * Calls authorService.checkUploadQuota and blocks if limit reached.
 */
const checkUploadQuota = async (req, res, next) => {
    try {
        const { allowed, reason } = await checkQuota(req.user._id);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: reason || 'تم الوصول إلى الحد الأقصى للرفع.',
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { checkAuthorAccess, checkUploadQuota };
