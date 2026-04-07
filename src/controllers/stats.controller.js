const Book = require("../models/book.models");
const BookRequest = require("../models/bookRequest.models");
const User = require("../models/user.models");

exports.getGlobalStats = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            totalBooks,
            totalUsers,
            totalRequests,
            downloadStats,
            authors,
            todayBooks,
            topBooks,
            categoryStats
        ] = await Promise.all([
            Book.countDocuments({ publishStatus: { $in: ["approved", null] }, status: "published" }),
            User.countDocuments(),
            BookRequest.countDocuments(),
            Book.aggregate([
                { $match: { publishStatus: { $in: ["approved", null] }, status: "published" } },
                { $group: { _id: null, total: { $sum: "$downloadCount" } } }
            ]),
            Book.distinct("author", { publishStatus: { $in: ["approved", null] }, status: "published" }),
            Book.countDocuments({ createdAt: { $gte: startOfToday }, publishStatus: { $in: ["approved", null] }, status: "published" }),
            // Top 5 Downloaded Books (only published)
            Book.find({ publishStatus: { $in: ["approved", null] }, status: "published" })
                .sort({ downloadCount: -1 })
                .limit(5)
                .select("title author downloadCount coverImage")
                .lean(),
            // Category Distribution for Charts (only published)
            Book.aggregate([
                { $match: { publishStatus: { $in: ["approved", null] }, status: "published" } },
                { $unwind: "$sections" },
                {
                    $lookup: {
                        from: "sections",
                        localField: "sections",
                        foreignField: "_id",
                        as: "sectionInfo"
                    }
                },
                { $unwind: "$sectionInfo" },
                {
                    $group: {
                        _id: "$sectionInfo.name",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);

        const totalDownloads = downloadStats.length > 0 ? downloadStats[0].total : 0;

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalBooks,
                    totalDownloads,
                    totalAuthors: authors.length,
                    totalRequests
                },
                today: {
                    newBooks: todayBooks
                },
                topCharts: {
                    topDownloaded: topBooks
                },
                distribution: {
                    categories: categoryStats
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching advanced stats",
            error: error.message
        });
    }
};

