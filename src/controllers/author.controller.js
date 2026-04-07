const Book    = require('../models/book.models');
const User    = require('../models/user.models');
const { uploadToDrive, deleteFromDrive } = require('../services/drive.service');
const { uploadToSupabase }              = require('../services/supabase.service');
const { normalizeArabic, generateFileHash } = require('../utils/string.utils');
const { suggestSection }               = require('../utils/smartMapper.utils');
const sharp                            = require('sharp');
const authorService                    = require('../services/author.service');

// ─── POST /api/author/trial ────────────────────────────────────────────────
exports.startTrial = async (req, res) => {
    try {
        const sub = req.user.authorSubscription;
        if (sub?.status === 'trial' || sub?.status === 'active') {
            return res.status(400).json({ success: false, message: 'لديك اشتراك نشط بالفعل.' });
        }
        const updated = await authorService.startTrial(req.user._id);
        res.status(200).json({
            success: true,
            message: 'تم تفعيل فترة التجربة المجانية لمدة 15 يوماً.',
            data: updated,
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── GET /api/author/dashboard ────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        const [user, bookStats] = await Promise.all([
            User.findById(userId).select('authorSubscription name email'),
            Book.aggregate([
                { $match: { authorId: userId } },
                { $group: { _id: '$publishStatus', count: { $sum: 1 } } },
            ]),
        ]);
        const statsMap = { pending_review: 0, approved: 0, rejected: 0 };
        bookStats.forEach(({ _id, count }) => { if (_id in statsMap) statsMap[_id] = count; });
        res.status(200).json({
            success: true,
            data: {
                subscription: user.authorSubscription,
                totalBooks:    Object.values(statsMap).reduce((a, b) => a + b, 0),
                approvedCount: statsMap.approved,
                pendingCount:  statsMap.pending_review,
                rejectedCount: statsMap.rejected,
            },
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── GET /api/author/books ────────────────────────────────────────────────
exports.getMyBooks = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(20, parseInt(req.query.limit) || 10);
        const skip  = (page - 1) * limit;
        const filter = { authorId: req.user._id };
        const [books, total] = await Promise.all([
            Book.find(filter)
                .select('title author coverImage publishStatus reviewNotes createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Book.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            data: books,
            meta: { total, page, pages: Math.ceil(total / limit) },
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── POST /api/author/submit ──────────────────────────────────────────────
// Same logic as admin createBook — PDF → Drive, Cover → Supabase
// but with publishStatus: 'pending_review' and authorId set.
exports.submitBook = async (req, res, next) => {
    let uploadedBookId = null;

    try {
        const { title, author, description, categories, sections, format, series, seriesOrder } = req.body;

        if (!req.files?.bookFile?.[0]) {
            return res.status(400).json({ success: false, message: 'ملف الكتاب مطلوب (bookFile)' });
        }
        if (!req.files?.coverImage?.[0]) {
            return res.status(400).json({ success: false, message: 'صورة الغلاف مطلوبة (coverImage)' });
        }

        const bookFile  = req.files.bookFile[0];
        const coverFile = req.files.coverImage[0];

        // ── Duplicate check ───────────────────────────────────────────────
        const fileHash       = generateFileHash(bookFile.buffer);
        const normalizedTitle = normalizeArabic(title);

        const existingBook = await Book.findOne({
            $or: [{ fileHash }, { normalizedTitle }],
        });
        if (existingBook) {
            const reason = existingBook.fileHash === fileHash
                ? 'هذا الملف موجود بالفعل في المكتبة'
                : 'يوجد كتاب بعنوان مشابه جداً';
            return res.status(400).json({ success: false, message: reason });
        }

        // ── Normalize inputs ──────────────────────────────────────────────
        const categoriesArray = Array.isArray(categories) ? categories : categories ? [categories] : [];
        let sectionsArray     = Array.isArray(sections)   ? sections   : sections   ? [sections]   : [];
        if (sectionsArray.length === 0) {
            sectionsArray = [suggestSection(title)];
        }

        // ── Prepare filenames ─────────────────────────────────────────────
        const bookExt        = bookFile.originalname.split('.').pop();
        const cleanBookName  = `${title}.${bookExt}`;
        const cleanCoverName = `cover-${fileHash}-${Date.now()}.jpg`;

        // ── Optimize cover ────────────────────────────────────────────────
        let coverBuffer = coverFile.buffer;
        try {
            coverBuffer = await sharp(coverFile.buffer)
                .resize(600, 900, { fit: 'cover' })
                .jpeg({ quality: 90 })
                .toBuffer();
        } catch (e) {
            console.error('[submitBook] Sharp failed, using original:', e.message);
        }

        // ── Upload: PDF → Drive, Cover → Supabase (parallel) ─────────────
        const [bookDrive, supabaseCoverUrl] = await Promise.all([
            uploadToDrive({
                buffer:       bookFile.buffer,
                mimetype:     bookFile.mimetype,
                originalname: cleanBookName,
                folderId:     process.env.GOOGLE_BOOKS_FOLDER_ID,
            }),
            uploadToSupabase(coverBuffer, cleanCoverName, 'image/jpeg'),
        ]);

        uploadedBookId = bookDrive.fileId;

        // ── Create book record with pending_review status ─────────────────
        const newBook = await Book.create({
            title,
            author,
            description,
            categories:    categoriesArray,
            sections:      sectionsArray,
            format:        format || 'pdf',
            fileUrl:       bookDrive.fileUrl,
            coverImage:    supabaseCoverUrl,
            driveFileId:   bookDrive.fileId,
            driveCoverId:  'SUPABASE_' + cleanCoverName,
            fileHash,
            normalizedTitle,
            series:        series      || null,
            seriesOrder:   seriesOrder || null,
            status:        'published',         // visibility status
            publishStatus: 'pending_review',    // review workflow
            authorId:      req.user._id,
            createdBy:     req.user._id,
        });

        // ── Increment upload quota counters ───────────────────────────────
        await authorService.incrementUploadCount(req.user._id);

        res.status(201).json({
            success: true,
            message: 'تم إرسال كتابك بنجاح! سيتم مراجعته من قِبل فريقنا قريباً.',
            data: { bookId: newBook._id },
        });

    } catch (err) {
        if (uploadedBookId) {
            const { deleteFromDrive } = require('../services/drive.service');
            await deleteFromDrive(uploadedBookId).catch(() => {});
        }
        next(err);
    }
};
