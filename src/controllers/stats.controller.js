const Book = require("../models/book.models");
const BookRequest = require("../models/bookRequest.models");

exports.getGlobalStats = async (req, res) => {
    try {
        // Get total books count
        const totalBooks = await Book.countDocuments();

        // Get total downloads count
        const downloadStats = await Book.aggregate([
            { $group: { _id: null, total: { $sum: "$downloadCount" } } }
        ]);
        const totalDownloads = downloadStats.length > 0 ? downloadStats[0].total : 0;

        // Get unique authors count
        const authors = await Book.distinct("author");
        const totalAuthors = authors.length;

        // Get total requests count
        const totalRequests = await BookRequest.countDocuments();

        res.json({
            success: true,
            data: {
                totalBooks,
                totalDownloads,
                totalAuthors,
                totalRequests
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching stats",
            error: error.message
        });
    }
};
