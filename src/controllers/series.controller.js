const Series = require("../models/series.models");
const Book   = require("../models/book.models");

// ─── إنشاء سلسلة
exports.createSeries = async (req, res, next) => {
    try {
        const { name } = req.body;

        const exists = await Series.findOne({ name });
        if (exists) {
            return res.status(400).json({ success: false, message: "السلسلة موجودة مسبقاً" });
        }

        const series = await Series.create({ name, createdBy: req.user._id });
        res.status(201).json({ success: true, data: series });
    } catch (error) { next(error); }
};

// ─── جلب كل السلاسل
exports.getAllSeries = async (req, res, next) => {
    try {
        const { search } = req.query;

        const query = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        const seriesList = await Series.find(query).sort({ name: 1 });

        const seriesWithCount = await Promise.all(
            seriesList.map(async (s) => {
                const count = await Book.countDocuments({ series: s._id });
                return { ...s.toObject(), booksCount: count };
            })
        );

        res.status(200).json({ success: true, count: seriesList.length, data: seriesWithCount });
    } catch (error) { next(error); }
};

// ─── جلب سلسلة واحدة + كتبها مرتبة
exports.getSeriesById = async (req, res, next) => {
    try {
        const series = await Series.findById(req.params.id);
        if (!series) return res.status(404).json({ message: "السلسلة غير موجودة" });

        const books = await Book.find({ series: series._id })
            .sort({ seriesOrder: 1 })
            .populate("categories", "name")
            .select("title author coverImage format seriesOrder downloadCount");

        res.status(200).json({ success: true, data: { series, books } });
    } catch (error) { next(error); }
};

// ─── تعديل اسم السلسلة
exports.updateSeries = async (req, res, next) => {
    try {
        const { name } = req.body;
        const series = await Series.findByIdAndUpdate(
            req.params.id,
            { name },
            { new: true, runValidators: true }
        );
        if (!series) return res.status(404).json({ message: "السلسلة غير موجودة" });
        res.status(200).json({ success: true, data: series });
    } catch (error) { next(error); }
};

// ─── حذف سلسلة (يفك ارتباط الكتب)
exports.deleteSeries = async (req, res, next) => {
    try {
        const series = await Series.findById(req.params.id);
        if (!series) return res.status(404).json({ message: "السلسلة غير موجودة" });

        // ─── فك ارتباط الكتب بالسلسلة
        await Book.updateMany(
            { series: series._id },
            { $set: { series: null, seriesOrder: null } }
        );

        await series.deleteOne();
        res.status(200).json({ success: true, message: "تم حذف السلسلة وفك ارتباط كتبها" });
    } catch (error) { next(error); }
};

// ─── إضافة كتاب موجود لسلسلة
exports.addBookToSeries = async (req, res, next) => {
    try {
        const { bookId, order } = req.body;

        const series = await Series.findById(req.params.id);
        if (!series) return res.status(404).json({ message: "السلسلة غير موجودة" });

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        // ─── لو الكتاب في سلسلة أخرى — أبلغ الأدمن
        if (book.series && book.series.toString() !== req.params.id) {
            return res.status(400).json({
                success: false,
                message: "الكتاب مرتبط بسلسلة أخرى، أزله منها أولاً",
            });
        }

        book.series      = series._id;
        book.seriesOrder = order || null;
        await book.save();

        res.status(200).json({ success: true, message: "تم إضافة الكتاب للسلسلة", data: book });
    } catch (error) { next(error); }
};

// ─── إزالة كتاب من سلسلة
exports.removeBookFromSeries = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        book.series      = null;
        book.seriesOrder = null;
        await book.save();

        res.status(200).json({ success: true, message: "تم إزالة الكتاب من السلسلة" });
    } catch (error) { next(error); }
};