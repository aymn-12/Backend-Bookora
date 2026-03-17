const mongoose = require("mongoose");
const Book = require("../models/book.models");
const { uploadToDrive, deleteFromDrive } = require("../services/drive.service");

// ─── إنشاء كتاب جديد
exports.createBook = async (req, res, next) => {
    let uploadedBookId  = null;
    let uploadedCoverId = null;

    try {
        const { title, author, description, categories, format, keyTakeaways, series, seriesOrder } = req.body;

        if (!req.files?.bookFile?.[0]) {
            return res.status(400).json({ success: false, message: "ملف الكتاب مطلوب (bookFile)" });
        }
        if (!req.files?.coverImage?.[0]) {
            return res.status(400).json({ success: false, message: "صورة الغلاف مطلوبة (coverImage)" });
        }

       
        const categoriesArray = Array.isArray(categories) ? categories : categories ? [categories]: [];

        const bookFile  = req.files.bookFile[0];
        const coverFile = req.files.coverImage[0];

        // ─── اسم الملف النظيف
        const bookExt        = bookFile.originalname.split('.').pop();
        const cleanBookName  = `${title}.${bookExt}`;
        const cleanCoverName = `${title}-cover.jpg`;

        // ─── ضغط الغلاف
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

        // ─── رفع متوازٍ
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

        // ─── حفظ في MongoDB
        const newBook = await Book.create({
            title,
            author,
            description,
            categories:   categoriesArray,
            format:       format || "pdf",
            fileUrl:      bookDrive.fileUrl,
            coverImage:   coverDrive.previewUrl,
            driveFileId:  bookDrive.fileId,
            driveCoverId: coverDrive.fileId,
            keyTakeaways,
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

        const { search, category, format, sort, mine, createdBy, series } = req.query;

        let pipeline = [];

        if (search) {
            pipeline.push({
                $search: {
                    index: "default",
                    compound: {
                        should: [
                            {
                                text: {
                                    query: search,
                                    path: "title",
                                    score: { boost: { value: 10 } },
                                    fuzzy: { maxEdits: 1, prefixLength: 3 },
                                },
                            },
                            {
                                text: {
                                    query: search,
                                    path: "author",
                                    score: { boost: { value: 6 } },
                                    fuzzy: { maxEdits: 1, prefixLength: 3 },
                                },
                            },
                            {
                                text: {
                                    query: search,
                                    path: "description",
                                    score: { boost: { value: 1 } },
                                },
                            },
                        ],
                        minimumShouldMatch: 1,
                    },
                },
            });
        }

        const matchStage = {};
        if (category)  matchStage.categories = new mongoose.Types.ObjectId(category);
        if (format)    matchStage.format      = format;
        if (series)    matchStage.series      = new mongoose.Types.ObjectId(series);
        if (createdBy) {
            matchStage.createdBy = new mongoose.Types.ObjectId(createdBy);
        } else if (mine === "true" && req.user) {
            matchStage.createdBy = req.user._id;
        }

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        const sortOptions = {
            newest:    { createdAt: -1 },
            downloads: { downloadCount: -1 },
            title:     { title: 1 },
        };
        const sortBy = search
            ? { score: { $meta: "searchScore" } }
            : (sortOptions[sort] || sortOptions.newest);

        pipeline.push({ $sort: sortBy });

        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    { $lookup: { from: "categories", localField: "categories", foreignField: "_id", as: "categories" } },
                    { $lookup: { from: "series",     localField: "series",     foreignField: "_id", as: "seriesData" } },
                    { $unwind: { path: "$seriesData", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: "users",      localField: "createdBy",  foreignField: "_id", as: "createdBy" } },
                    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
                    { $project: { "createdBy.password": 0, "createdBy.refreshToken": 0, "createdBy.resetOtp": 0 } },
                ],
            },
        });

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
        const userMessage = error.message.includes("$search")
            ? "نظام البحث الذكي قيد التجهيز حالياً، يرجى المحاولة بعد قليل."
            : "عذراً، حدث خطأ أثناء جلب الكتب.";
        res.status(500).json({ success: false, message: userMessage, error: error.message });
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

        // ─── تأكد categories يكون array
        if (safeFields.categories && !Array.isArray(safeFields.categories)) {
            safeFields.categories = [safeFields.categories];
        }

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, safeFields, {
            new: true,
            runValidators: true,
        }).populate("categories", "name").populate("series", "name");

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
            .populate("series", "name");
        if (!book) return res.status(404).json({ message: "Book not found" });
        res.status(200).json({ success: true, data: book });
    } catch (error) { res.status(500).json({ message: error.message }); }
};