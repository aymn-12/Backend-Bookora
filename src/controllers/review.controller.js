const Review = require("../models/review.models");
const Book = require("../models/book.models");

// ─── Add Review
exports.addReview = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const bookId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });

        // هل راجع هذا الكتاب من قبل؟
        const alreadyReviewed = await Review.findOne({
            book: bookId,
            user: req.user._id
        });
        if (alreadyReviewed)
            return res.status(400).json({ message: "You already reviewed this book" });

        const review = await Review.create({
            user:    req.user._id,
            book:    bookId,
            rating,
            comment,
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) { next(error); }
};

// ─── Get Book Reviews
exports.getBookReviews = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip  = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            Review.find({ book: req.params.id })
                .populate("user", "name")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Review.countDocuments({ book: req.params.id })
        ]);

        res.status(200).json({
            success: true,
            data: reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext:    page < Math.ceil(total / limit),
                hasPrev:    page > 1,
            }
        });
    } catch (error) { next(error); }
};

// ─── Delete Review
exports.deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.reviewId);

        if (!review)
            return res.status(404).json({ message: "Review not found" });

        // فقط صاحب التقييم أو الـ admin يقدر يحذف
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin")
            return res.status(403).json({ message: "Not authorized" });

        await review.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) { next(error); }
};