const mongoose = require("mongoose");
const Book = require("../models/book.models");
const { uploadToDrive, deleteFromDrive, drive } = require("../services/drive.service");
const Category = require("../models/category.models");
const Section = require("../models/section.models");
const { normalizeArabic, generateFileHash } = require("../utils/string.utils");

// ─── إنشاء كتاب جديد
exports.createBook = async (req, res, next) => {
    let uploadedBookId  = null;
    let uploadedCoverId = null;

    try {
        const { title, author, description, categories, sections, format, series, seriesOrder } = req.body;

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
        const sectionsArray = Array.isArray(sections) ? sections : sections ? [sections] : [];

        const bookExt        = bookFile.originalname.split('.').pop();
        const cleanBookName  = `${title}.${bookExt}`;
        const cleanCoverName = `${title}-cover.jpg`;

        let coverBuffer = coverFile.buffer;
        try {
            const sharp = require("sharp");
            coverBuffer = await sharp(coverFile.buffer)
                .resize(400, 600, { fit: "cover" })
                .jpeg({ quality: 80 })
                .toBuffer();
        } catch {
            coverBuffer = coverFile.buffer;
        }

        const [bookDrive, coverDrive] = await Promise.all([
            uploadToDrive({
                buffer:       bookFile.buffer,
                mimetype:     bookFile.mimetype,
                originalname: cleanBookName,
                folderId:     process.env.GOOGLE_BOOKS_FOLDER_ID,
            }),
            uploadToDrive({
                buffer:       coverBuffer,
                mimetype:     "image/jpeg",
                originalname: cleanCoverName,
                folderId:     process.env.GOOGLE_COVERS_FOLDER_ID,
            }),
        ]);

        uploadedBookId  = bookDrive.fileId;
        uploadedCoverId = coverDrive.fileId;

        const newBook = await Book.create({
            title,
            author,
            description,
            categories:   categoriesArray,
            sections:     sectionsArray,
            format:       format || "pdf",
            fileUrl:      bookDrive.fileUrl,
            coverImage:   coverDrive.previewUrl,
            driveFileId:  bookDrive.fileId,
            driveCoverId: coverDrive.fileId,
            fileHash,
            normalizedTitle,
            series:       series || null,
            seriesOrder:  seriesOrder || null,
            createdBy:    req.user._id,
        });

        res.status(201).json({ success: true, data: newBook });

    } catch (error) {
        await Promise.allSettled([
            uploadedBookId  ? deleteFromDrive(uploadedBookId)  : Promise.resolve(),
            uploadedCoverId ? deleteFromDrive(uploadedCoverId) : Promise.resolve(),
        ]);
        console.error("[createBook] Error:", error.message);
        next(error);
    }
};

// ─── عرض كل الكتب
exports.getAllBook = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip  = (page - 1) * limit;

        const { category, section, format, sort, mine, createdBy, series, ids } = req.query;

        const matchStage = {};
        if (category)  matchStage.categories = new mongoose.Types.ObjectId(category);
        if (section)   matchStage.sections   = new mongoose.Types.ObjectId(section);
        if (format)    matchStage.format      = format;
        if (series)    matchStage.series      = new mongoose.Types.ObjectId(series);
        if (ids) {
            const idsArray = ids.split(",").filter(id => mongoose.Types.ObjectId.isValid(id));
            if (idsArray.length > 0) {
                matchStage._id = { $in: idsArray.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }
        if (createdBy) {
            matchStage.createdBy = new mongoose.Types.ObjectId(createdBy);
        } else if (mine === "true" && req.user) {
            matchStage.createdBy = req.user._id;
        }

        const sortOptions = {
            newest:    { createdAt: -1, _id: -1 },
            downloads: { downloadCount: -1, _id: -1 },
            rating:    { averageRating: -1, reviewCount: -1, _id: -1 },
            title:     { title: 1, _id: -1 },
        };
        const sortBy = sortOptions[sort] || sortOptions.newest;

        const pipeline = [
            ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
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
                        { $project: { "createdBy.password": 0, "createdBy.refreshToken": 0, "createdBy.resetOtp": 0 } },
                    ],
                },
            },
        ];

        const results = await Book.aggregate(pipeline);
        const books   = results[0]?.data || [];
        const total   = results[0]?.metadata[0]?.total || 0;

        res.status(200).json({
            success: true,
            data: books,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("[getAllBook] Error:", error);
        res.status(500).json({ success: false, message: "عذراً، حدث خطأ أثناء جلب الكتب." });
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

        const { fileUrl, coverImage, driveFileId, driveCoverId, ...safeFields } = req.body;

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
            const cleanCoverName = `${safeFields.title || book.title}-cover.jpg`;

            let coverBuffer = coverFile.buffer;
            try {
                const sharp = require("sharp");
                coverBuffer = await sharp(coverFile.buffer)
                    .resize(400, 600, { fit: "cover" })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch {
                coverBuffer = coverFile.buffer;
            }

            const coverDrive = await uploadToDrive({
                buffer: coverBuffer,
                mimetype: "image/jpeg",
                originalname: cleanCoverName,
                folderId: process.env.GOOGLE_COVERS_FOLDER_ID,
            });

            // delete old cover file from drive silently
            if (book.driveCoverId) {
                await deleteFromDrive(book.driveCoverId).catch(err => console.error("Error deleting old cover max:", err));
            }

            safeFields.coverImage = coverDrive.previewUrl;
            safeFields.driveCoverId = coverDrive.fileId;
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

        await Promise.allSettled([
            deleteFromDrive(book.driveFileId),
            deleteFromDrive(book.driveCoverId),
        ]);

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

        // نجد الكتب التي تشترك في تصنيف واحد على الأقل أو نفس المؤلف
        const related = await Book.find({
            _id: { $ne: id },
            $or: [
                { categories: { $in: book.categories || [] } },
                { author: book.author }
            ]
        })
        .limit(6)
        .select("title author coverImage format")
        .sort({ downloadCount: -1 })
        .lean();

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
    res.setHeader("Cache-Control", "private, max-age=3600");

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