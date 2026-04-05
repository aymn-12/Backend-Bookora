const mongoose = require("mongoose");
const Book = require("../models/book.models");
const { uploadToDrive, deleteFromDrive, drive } = require("../services/drive.service");
const { uploadToSupabase, deleteFromSupabase } = require("../services/supabase.service");
const Category = require("../models/category.models");
const Section = require("../models/section.models");
const ReadingProgress = require("../models/readingProgress.model");
const { normalizeArabic, generateFileHash, slugify } = require("../utils/string.utils");
const { suggestSection } = require("../utils/smartMapper.utils");
const sharp = require("sharp");
const { updateUserInterests } = require("../utils/recommendation.utils");

// ─── إنشاء كتاب جديد
exports.createBook = async (req, res, next) => {
    let uploadedBookId  = null;
    let uploadedCoverId = null;

    try {
        const { title, author, description, categories, sections, format, series, seriesOrder, status } = req.body;

        if (!req.files?.bookFile?.[0]) {
            return res.status(400).json({ success: false, message: "ملف الكتاب مطلوب (bookFile)" });
        }
        if (!req.files?.coverImage?.[0]) {
            return res.status(400).json({ success: false, message: "صورة الغلاف مطلوبة (coverImage)" });
        }

        const bookFile  = req.files.bookFile[0];
        const coverFile = req.files.coverImage[0];

        // ─── التحقق الذكي من التكرار (Smarter Duplication Check)
        const fileHash = generateFileHash(bookFile.buffer);
        const normalizedTitle = normalizeArabic(title);

        const existingBook = await Book.findOne({
            $or: [
                { fileHash },
                { normalizedTitle }
            ]
        });

        if (existingBook) {
            const reason = existingBook.fileHash === fileHash ? "هذا الملف موجود بالفعل" : "هذا الكتاب موجود بالفعل تحت عنوان مشابه";
            return res.status(400).json({
                success: false,
                message: reason,
                data: { existingBookId: existingBook._id }
            });
        }

        const categoriesArray = Array.isArray(categories) ? categories : categories ? [categories] : [];
        let   sectionsArray   = Array.isArray(sections) ? sections : sections ? [sections] : [];

        // ─── التوزيع الذكي إذا لم يتم اختيار قسم
        if (sectionsArray.length === 0) {
            const suggestedId = suggestSection(title);
            sectionsArray = [suggestedId];
        }

        const bookExt        = bookFile.originalname.split('.').pop();
        const cleanBookName  = `${title}.${bookExt}`;
        const cleanCoverName = `cover-${fileHash}-${Date.now()}.jpg`;

        let coverBuffer = coverFile.buffer;
        try {
            coverBuffer = await sharp(coverFile.buffer)
                .resize(600, 900, { fit: "cover" })
                .jpeg({ quality: 90 })
                .toBuffer();
        } catch (error) {
            console.error("❌ Sharp optimization failed:", error);
            coverBuffer = coverFile.buffer;
        }

        const [bookDrive, supabaseCoverUrl] = await Promise.all([
            uploadToDrive({
                buffer:       bookFile.buffer,
                mimetype:     bookFile.mimetype,
                originalname: cleanBookName,
                folderId:     process.env.GOOGLE_BOOKS_FOLDER_ID,
            }),
            uploadToSupabase(coverBuffer, cleanCoverName, "image/jpeg")
        ]);

        uploadedBookId  = bookDrive.fileId;
        const supabaseCoverPath = cleanCoverName; // The filename is our path in the bucket

        const newBook = await Book.create({
            title,
            author,
            description,
            categories:   categoriesArray,
            sections:     sectionsArray,
            format:       format || "pdf",
            fileUrl:      bookDrive.fileUrl,
            coverImage:   supabaseCoverUrl,
            driveFileId:  bookDrive.fileId,
            driveCoverId: "SUPABASE_" + supabaseCoverPath, // Mark it's on Supabase
            fileHash,
            normalizedTitle,
            series:       series || null,
            seriesOrder:  seriesOrder || null,
            status:       status || "published",
            createdBy:    req.user._id,
        });

        res.status(201).json({ success: true, data: newBook });

    } catch (error) {
        if (uploadedBookId) await deleteFromDrive(uploadedBookId);
        // Supabase deletion can be handled if we have the filename
        console.error("[createBook] Error:", error.message);
        next(error);
    }
};

// ─── عرض كل الكتب (مُحسن)
exports.getAllBook = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = Math.min(parseInt(req.query.limit) || 12, 100);
        const skip  = (page - 1) * limit;

        const { 
            category, section, format, sort, mine, createdBy, 
            series, ids, status, 
            q, author, minDownloads, maxDownloads,
            dateFrom, dateTo, searchIn
        } = req.query;

        const matchStage = {};
        
        // التحقق من صحة الـ IDs لتجنب توقف السيرفر
        const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

        if (status) {
            matchStage.status = status;
        } else {
            matchStage.status = "published";
        }

        if (category && isValidId(category)) matchStage.categories = new mongoose.Types.ObjectId(category);
        if (section && isValidId(section))   matchStage.sections   = new mongoose.Types.ObjectId(section);
        if (format) matchStage.format = format;
        if (series && isValidId(series))     matchStage.series     = new mongoose.Types.ObjectId(series);
        
        if (createdBy && isValidId(createdBy)) {
            matchStage.createdBy = new mongoose.Types.ObjectId(createdBy);
        } else if (mine === "true" && req.user) {
            matchStage.createdBy = req.user._id;
            delete matchStage.status; // السماح للمالك برؤية مسوداته
        }

        // فلاتر المدى (Range Filters)
        if (minDownloads || maxDownloads) {
            matchStage.downloadCount = {};
            if (minDownloads) matchStage.downloadCount.$gte = parseInt(minDownloads);
            if (maxDownloads) matchStage.downloadCount.$lte = parseInt(maxDownloads);
        }
        
        if (dateFrom || dateTo) {
            matchStage.createdAt = {};
            if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
            if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
        }

        // البحث عن المؤلف (جزئي)
        if (author) {
            matchStage.author = { $regex: author, $options: "i" };
        }

        if (ids) {
            const idsArray = ids.split(",").filter(id => isValidId(id));
            if (idsArray.length > 0) {
                matchStage._id = { $in: idsArray.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // البحث النصي الشامل وتحديد الحقول
        let searchUsed = false;
        if (q && q.trim()) {
            const searchFields = searchIn ? searchIn.split(",") : ["title", "author", "description"];
            const isTextSearchable = searchFields.every(f => ["title", "author", "description"].includes(f));
            
            if (isTextSearchable) {
                matchStage.$text = { $search: q };
                searchUsed = true;
            } else {
                // البحث باستخدام Regex في الحقول المخصصة
                const sanitizedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const orConditions = searchFields.map(field => ({
                    [field]: { $regex: sanitizedQuery, $options: "i" }
                }));
                matchStage.$or = orConditions;
            }
        }

        // ─── Seamless Personalization (مختارات لك مخفية ضمنياً) ─── //
        let personalizedCats = [];
        // Apply personalization only when browsing generic lists (no filters, or default/newest sorting)
        if ((!sort || sort === "newest") && req.user && !searchUsed && !category && !section && !ids && !author) {
            const UserParams = require("../models/user.models");
            const dbUser = await UserParams.findById(req.user._id).select("interestScores").lean();
            if (dbUser && dbUser.interestScores && Object.keys(dbUser.interestScores).length > 0) {
                 personalizedCats = Object.entries(dbUser.interestScores)
                     .sort((a,b) => b[1] - a[1])
                     .slice(0, 5) // Top 5 interested categories
                     .map(e => {
                         try { return new mongoose.Types.ObjectId(e[0]); } catch(err) { return null; }
                     }).filter(id => id);
            }
        }

        const sortOptions = {
            newest:    { createdAt: -1, _id: -1 },
            oldest:    { createdAt: 1, _id: 1 },
            downloads: { downloadCount: -1, _id: -1 },
            rating:    { bayesianRating: -1, reviewCount: -1, _id: -1 }, // Updated to use Bayesian Average
            title:     { title: 1, _id: -1 },
        };

        let sortBy = sortOptions[sort] || sortOptions.newest;
        if (searchUsed) {
            sortBy = { score: { $meta: "textScore" }, ...sortBy };
        } else if (personalizedCats.length > 0) {
            // Sort by matched interests first, then newest
            sortBy = { personalizedBoost: -1, ...sortBy };
        }

        const pipeline = [
            { $match: matchStage },
            ...(searchUsed ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
            ...(personalizedCats.length > 0 ? [
                {
                    $addFields: {
                        personalizedBoost: {
                            $size: { $setIntersection: [ { $ifNull: ["$categories", []] }, personalizedCats ] }
                        }
                    }
                }
            ] : []),
            // حساب المتوسط البايزي (Bayesian Average) لترتيب التقييم لتفادي تفوق الكتب ذات تقييم واحد على الكتب المشهورة
            ...(sort === "rating" ? [
                {
                    $addFields: {
                        bayesianRating: {
                            $divide: [
                                { $add: [
                                    { $multiply: [{ $ifNull: ["$averageRating", 0] }, { $ifNull: ["$reviewCount", 0] }] },
                                    10.5 // (C * m) => (3.5 mean rating * 3 min reviews)
                                ]},
                                { $add: [{ $ifNull: ["$reviewCount", 0] }, 3] } // (v + m) => (reviews + 3)
                            ]
                        }
                    }
                }
            ] : []),
            { $sort: sortBy },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        { $lookup: { from: "categories", localField: "categories", foreignField: "_id", as: "categories" } },
                        { $lookup: { from: "sections",   localField: "sections",   foreignField: "_id", as: "sections" } },
                        { $lookup: { from: "series",     localField: "series",     foreignField: "_id", as: "seriesData" } },
                        { $unwind: { path: "$seriesData", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "users",      localField: "createdBy",  foreignField: "_id", as: "createdBy" } },
                        { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
                        { $project: { "createdBy.password": 0, "createdBy.refreshToken": 0, "createdBy.resetOtp": 0, score: 0 } },
                    ],
                },
            },
        ];

        const results = await Book.aggregate(pipeline);
        const books   = results[0]?.data || [];
        const total   = results[0]?.metadata[0]?.total || 0;

        // Cache Management:
        // إذا كان هناك مستخدم مسجل (بيانات مخصصة)، نمنع أو نحجم الكاش العام حتى لا تظهر بياناته لشخص آخر.
        if (req.user) {
            res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
        } else {
            // للزوار غير المسجلين، يمكن حفظ الكاش بسلام
            res.setHeader("Cache-Control", "public, max-age=300");
        }

        res.status(200).json({
            success: true,
            data: books,
            meta: { 
                total, 
                page, 
                limit, 
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            },
        });
    } catch (error) {
        console.error("[getAllBook] Error:", error);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تحميل الكتب." });
    }
};


// ─── Cloud Sync & Bookmarks
exports.getReadingProgress = async (req, res) => {
    try {
        const { id: bookId } = req.params;
        const userId = req.user._id;

        const progress = await ReadingProgress.findOne({ user: userId, book: bookId });
        
        if (!progress) {
            return res.status(200).json({ success: true, data: { currentPage: 1, bookmarks: [] } });
        }

        res.status(200).json({ success: true, data: progress });
    } catch (error) {
        console.error("Error fetching reading progress:", error);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب تقدم القراءة." });
    }
};

exports.updateReadingProgress = async (req, res) => {
    try {
        const { id: bookId } = req.params;
        const userId = req.user._id;
        const { currentPage, bookmarks } = req.body;

        const updateData = {};
        if (currentPage !== undefined) updateData.currentPage = currentPage;
        if (bookmarks !== undefined) updateData.bookmarks = bookmarks; // Array of page numbers

        const progress = await ReadingProgress.findOneAndUpdate(
            { user: userId, book: bookId },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, data: progress });
    } catch (error) {
        console.error("Error updating reading progress:", error);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء تحديث تقدم القراءة." });
    }
};

// ─── تعديل كتاب
exports.updateBook = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });

        if (
            book.createdBy.toString() !== req.user._id.toString() &&
            req.user.role !== "superadmin"
        ) {
            return res.status(403).json({ message: "غير مصرح لك بتعديل هذا الكتاب" });
        }

        const { fileUrl, coverImage, driveFileId, driveCoverId, status, ...safeFields } = req.body;
        
        if (status) safeFields.status = status;

        if (safeFields.categories && !Array.isArray(safeFields.categories)) {
            safeFields.categories = [safeFields.categories];
        }
        if (safeFields.sections && !Array.isArray(safeFields.sections)) {
            safeFields.sections = [safeFields.sections];
        }

        if (safeFields.title) {
            safeFields.normalizedTitle = normalizeArabic(safeFields.title);

            // Check if normalized title already exists elsewhere
            const duplicate = await Book.findOne({
                normalizedTitle: safeFields.normalizedTitle,
                _id: { $ne: req.params.id }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: "يوجد كتاب آخر بنفس هذا العنوان"
                });
            }
        }

        // --- Handle File Uploads for Edit ---
        if (req.files?.bookFile?.[0]) {
            const bookFile = req.files.bookFile[0];
            const fileHash = generateFileHash(bookFile.buffer);

            // check duplicate file
            const existingBookFile = await Book.findOne({ fileHash, _id: { $ne: req.params.id } });
            if (existingBookFile) {
                return res.status(400).json({ success: false, message: "هذا الملف (PDF/EPUB) موجود بالفعل لكتاب آخر" });
            }

            const bookExt = bookFile.originalname.split('.').pop();
            const cleanBookName = `${safeFields.title || book.title}.${bookExt}`;
            
            const bookDrive = await uploadToDrive({
                buffer: bookFile.buffer,
                mimetype: bookFile.mimetype,
                originalname: cleanBookName,
                folderId: process.env.GOOGLE_BOOKS_FOLDER_ID,
            });

            // delete old book file from drive silently
            if (book.driveFileId) {
                await deleteFromDrive(book.driveFileId).catch(err => console.error("Error deleting old book file:", err));
            }

            safeFields.fileUrl = bookDrive.fileUrl;
            safeFields.driveFileId = bookDrive.fileId;
            safeFields.fileHash = fileHash;
        }

        if (req.files?.coverImage?.[0]) {
            const coverFile = req.files.coverImage[0];
            const cleanCoverName = `cover-${req.params.id}-${Date.now()}.jpg`;

            let coverBuffer = coverFile.buffer;
            try {
                const sharp = require("sharp");
                coverBuffer = await sharp(coverFile.buffer)
                    .resize(600, 900, { fit: "cover" })
                    .jpeg({ quality: 90 })
                    .toBuffer();
            } catch {
                coverBuffer = coverFile.buffer;
            }

            const supabaseCoverUrl = await uploadToSupabase(coverBuffer, cleanCoverName, "image/jpeg");

            // delete old cover file
            if (book.driveCoverId && book.driveCoverId.startsWith("SUPABASE_")) {
                const oldPath = book.driveCoverId.replace("SUPABASE_", "");
                await deleteFromSupabase(oldPath).catch(err => console.error("Error deleting old cover from Supabase:", err));
            } else if (book.driveCoverId) {
                await deleteFromDrive(book.driveCoverId).catch(err => console.error("Error deleting old cover from Drive:", err));
            }

            safeFields.coverImage = supabaseCoverUrl;
            safeFields.driveCoverId = "SUPABASE_" + cleanCoverName;
        }

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, safeFields, {
            new: true,
            runValidators: true,
        }).populate("categories", "name").populate("sections", "name icon description").populate("series", "name");

        res.status(200).json({ success: true, data: updatedBook });
    } catch (error) {
        console.error("[updateBook] Error:", error);
        next(error);
    }
};

// ─── حذف كتاب + ملفاته من Drive
exports.deleteBook = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });

        if (
            book.createdBy.toString() !== req.user._id.toString() &&
            req.user.role !== "superadmin"
        ) {
            return res.status(403).json({ message: "غير مصرح لك بحذف هذا الكتاب" });
        }

        const tasks = [deleteFromDrive(book.driveFileId)];
        
        if (book.driveCoverId && book.driveCoverId.startsWith("SUPABASE_")) {
            tasks.push(deleteFromSupabase(book.driveCoverId.replace("SUPABASE_", "")));
        } else if (book.driveCoverId) {
            tasks.push(deleteFromDrive(book.driveCoverId));
        }

        await Promise.allSettled(tasks);

        await book.deleteOne();
        res.status(200).json({ success: true, message: "تم حذف الكتاب بنجاح" });
    } catch (error) { next(error); }
};

// ─── تحميل كتاب
exports.downloadBook = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });
        res.json({ success: true, data: { url: book.fileUrl } });
    } catch (error) { next(error); }
};

// ─── تأكيد التحميل
exports.confirmDownload = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });

        book.downloadCount += 1;
        await book.save();

        if (req.user) {
            const User = require("../models/user.models");
            await User.findByIdAndUpdate(req.user._id, {
                $addToSet: { downloadedBooks: book._id },
            });
            // ─── Update Interest Scores ─── //
            updateUserInterests(req.user._id, book.categories, 5);
        }

        res.json({ success: true });
    } catch (error) { next(error); }
};

// ─── كتاب واحد بالـ ID
exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate("categories", "name")
            .populate("sections", "name icon description")
            .populate("series", "name");

        if (!book) return res.status(404).json({ message: "Book not found" });

        // Privacy Check: Only owner or admin can see non-published books
        const isOwner = req.user && book.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);

        if (book.status !== "published" && !isOwner && !isAdmin) {
            return res.status(404).json({ message: "يتم العمل حالياً على تجهيز هذا الكتاب." });
        }

        // ─── Update Interest Scores (View) ─── //
        if (req.user) {
            updateUserInterests(req.user._id, book.categories, 1);
        }

        // Cache details for 1 minute (private to user)
        res.setHeader("Cache-Control", "private, max-age=60");

        res.status(200).json({ success: true, data: book });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── التحقق من العنوان والبحث الذكي (Smart Title Check)
exports.checkTitleStatus = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 4) {
            return res.json({ success: true, isExactDuplicate: false, suggestions: [] });
        }

        const normalized = normalizeArabic(q.trim());

        // 1. مطابقة تامة بعد معالجة النص
        const exactMatch = await Book.findOne({ normalizedTitle: normalized })
            .select("title author coverImage format")
            .lean();

        if (exactMatch) {
            return res.json({
                success: true,
                isExactDuplicate: true,
                exactMatch,
                suggestions: []
            });
        }

        // 2. كلمات التوقف — لا قيمة بحثية لها منفردة
        const STOP_WORDS = new Set([
            "رواية", "روايه", "كتاب", "كتب", "قصة", "قصه", "قصص",
            "تحميل", "مجاني", "مجانا", "مجاناً", "مجموعة",
            "شعر", "ديوان", "أدب", "فن", "علم", "تاريخ", "طب",
            "في", "من", "إلى", "على", "عن", "مع", "الى",
            "هذا", "هذه", "ذلك", "أن", "لا", "ما",
        ]);

        // 3. استخرج الكلمات ذات المعنى (≥ 2 حرف وليست stop word)
        const rawTokens = normalized
            .split(/\s+/)
            .filter(t => t.length >= 2 && !STOP_WORDS.has(t));

        // لا كلمات ذات معنى → لا نبحث
        if (rawTokens.length === 0) {
            return res.json({ success: true, isExactDuplicate: false, suggestions: [] });
        }

        // 4. ابنِ Regex لكل كلمة — AND: يجب أن تظهر كل الكلمات في العنوان
        const tokenRegexes = rawTokens.map(t => new RegExp(t, "i"));

        const candidates = await Book.find({
            $and: tokenRegexes.map(rx => ({
                $or: [
                    { normalizedTitle: rx },
                    { title: rx }
                ]
            }))
        })
        .limit(10)
        .select("title author coverImage format normalizedTitle")
        .lean();

        // 5. احسب درجة التشابه: كم كلمة تطابقت + رتّب الأكثر تشابهاً أولاً
        const scored = candidates
            .map(book => {
                const haystack = (book.normalizedTitle || book.title || "").toLowerCase();
                const matchCount = rawTokens.filter(t => haystack.includes(t)).length;
                return { ...book, _score: matchCount };
            })
            .filter(b => b._score > 0)
            .sort((a, b) => b._score - a._score)
            .slice(0, 5)
            .map(({ _score, normalizedTitle, ...rest }) => rest);

        res.json({
            success: true,
            isExactDuplicate: false,
            exactMatch: null,
            suggestions: scored
        });
    } catch (error) {
        console.error("[checkTitleStatus] Error:", error);
        res.status(500).json({ success: false, message: "Error checking title" });
    }
};


// ─── جلب الكتب ذات الصلة
exports.getRelatedBooks = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);
        if (!book) return res.status(404).json({ success: false, message: "Book not found" });

        // استخدام Aggregation Pipeline لحساب درجة التقارب بدقة (Relevance Score)
        const related = await Book.aggregate([
            {
                $match: {
                    _id: { $ne: book._id },
                    status: "published",
                    $or: [
                        { categories: { $in: book.categories || [] } },
                        { author: book.author }
                    ]
                }
            },
            {
                $addFields: {
                    // زيادة كبيرة لو كان نفس المؤلف (أجزاء السلسلة أو نفس النمط)
                    authorMatchBoost: { $cond: [{ $eq: ["$author", book.author] }, 4, 0] },
                    // عدد التصنيفات المشتركة بين الكتابين
                    categoryMatchCount: {
                        $size: { $setIntersection: [{ $ifNull: ["$categories", []] }, book.categories || []] }
                    }
                }
            },
            {
                $addFields: {
                    // المجموع الكلي للتقارب
                    totalRelevance: { $add: ["$authorMatchBoost", "$categoryMatchCount"] }
                }
            },
            {
                $sort: { totalRelevance: -1, downloadCount: -1 } // الترتيب بالتقارب أولاً ثم بالتحميلات
            },
            { $limit: 10 },
            {
                $project: {
                    title: 1, author: 1, coverImage: 1, format: 1, totalRelevance: 1
                }
            }
        ]);

        res.json({ success: true, data: related });
    } catch (error) {
        console.error("[getRelatedBooks] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.streamBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (!book.driveFileId) {
      return res.status(404).json({ message: "ملف الكتاب غير متوفر" });
    }

    // تجهيز خيارات الطلب وتمرير الـ Range header إن وجد
    const options = { responseType: "stream" };
    if (req.headers.range) {
      options.headers = { Range: req.headers.range };
    }

    const driveResponse = await drive.files.get(
      { fileId: book.driveFileId, alt: "media" },
      options
    );

    // نسخ الـ Headers الأساسية من استجابة Google Drive وتمريرها للمتصفح (لدعم الـ Chunking)
    res.status(driveResponse.status); // 200 (OK) أو 206 (Partial Content)
    
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    headersToForward.forEach(h => {
      if (driveResponse.headers[h]) {
        res.setHeader(h, driveResponse.headers[h]);
      }
    });

    if (!res.getHeader('content-type')) {
      res.setHeader("Content-Type", "application/pdf");
    }
    
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(book.title)}.pdf"`);
    // Cache PDF stream for 24 hours (CDN friendly)
    res.setHeader("Cache-Control", "public, max-age=86400");

    // ─── Stream مباشرة من Drive للمتصفح
    driveResponse.data
      .on("error", (err) => {
        console.error("[streamBook] Drive stream error:", err.message);
        if (!res.headersSent) {
          res.status(500).json({ message: "فشل تحميل الملف من Drive" });
        }
      })
      .pipe(res);

  } catch (error) {
    console.error("[streamBook] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "حدث خطأ داخلي" });
    } else {
      res.end();
    }
  }
};