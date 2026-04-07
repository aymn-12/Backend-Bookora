const router         = require('express').Router();
const authorCtrl     = require('../controllers/author.controller');
const authMiddleware = require('../middlewares/OAuth.middlewares');
const { checkAuthorAccess, checkUploadQuota } = require('../middlewares/author.middleware');
const { upload, validateFileSizes } = require('../middlewares/upload.middleware');

// ── All routes require authentication ──────────────────────────────────────
router.use(authMiddleware);

// ── Trial activation (no author access required yet) ───────────────────────
router.post('/trial', authorCtrl.startTrial);

// ── Public author info (for non-authors to see their status) ───────────────
router.get('/dashboard', authorCtrl.getDashboard);
router.get('/books',     authorCtrl.getMyBooks);

// ── All routes below require active trial/subscription ─────────────────────
router.use(checkAuthorAccess);

// Wrapper to catch Multer errors (like size limit)
const submitBookUpload = upload.fields([
    { name: 'bookFile',   maxCount: 1 }, 
    { name: 'coverImage', maxCount: 1 }
]);

router.post('/submit', 
    checkUploadQuota, 
    (req, res, next) => {
        submitBookUpload(req, res, (err) => {
            if (err) {
                console.error('[Multer Error]', err.message);
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    },
    validateFileSizes, 
    authorCtrl.submitBook
);

module.exports = router;
