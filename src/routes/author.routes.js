const router         = require('express').Router();
const authorCtrl     = require('../controllers/author.controller');
const authMiddleware = require('../middlewares/OAuth.middlewares');
const { checkAuthorAccess, checkUploadQuota } = require('../middlewares/author.middleware');
const { upload, validateFileSizes } = require('../middlewares/upload.middleware');

// ── All routes require authentication ──────────────────────────────────────
router.use(authMiddleware);

// ── Trial activation (no author access required yet) ───────────────────────
router.post('/trial', authorCtrl.startTrial);

// ── All routes below require active trial/subscription ─────────────────────
router.use(checkAuthorAccess);

router.get('/dashboard', authorCtrl.getDashboard);
router.get('/books',     authorCtrl.getMyBooks);

// Submit book — same multipart upload as admin: PDF → Drive, Cover → Supabase
router.post('/submit', checkUploadQuota, upload.fields([{ name: 'bookFile', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), validateFileSizes, authorCtrl.submitBook);

module.exports = router;
