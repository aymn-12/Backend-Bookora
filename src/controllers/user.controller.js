const User = require("../models/user.models");
const Book = require("../models/book.models");

// ─── Get Saved Books (المحفوظات)
exports.getLibrary = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("savedBooks", "title author coverImage format downloadCount");

        res.status(200).json({
            success: true,
            count: user.savedBooks.length,
            data: user.savedBooks,
        });
    } catch (error) { next(error); }
};

// ─── Add To Saved Books
exports.addToLibrary = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book) return res.status(404).json({ message: "Book not found" });

        const user = await User.findById(req.user._id);

        // التحقق من حقل savedBooks الجديد
        if (user.savedBooks.includes(req.params.bookId))
            return res.status(400).json({ message: "Book already in saved list" });

        user.savedBooks.push(req.params.bookId);
        await user.save();

        res.status(200).json({ success: true, message: "Book added to saved books" });
    } catch (error) { next(error); }
};

// ─── Remove From Saved Books
exports.removeFromLibrary = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.savedBooks.includes(req.params.bookId))
            return res.status(404).json({ message: "Book not found in saved list" });

        user.savedBooks = user.savedBooks.filter(
            (id) => id.toString() !== req.params.bookId
        );
        await user.save();

        res.status(200).json({ success: true, message: "Book removed from saved books" });
    } catch (error) { next(error); }
};
