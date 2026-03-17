const mongoose = require("mongoose");
const Book     = require("../models/book.models");
const Series   = require("../models/series.models");
const Category = require("../models/category.models");

// ─── Popular Searches (في الذاكرة — يُصفَّر عند restart)
const searchCounts = new Map();

const saveSearchQuery = (q) => {
    const key = q.toLowerCase().trim();
    searchCounts.set(key, (searchCounts.get(key) || 0) + 1);
};

// ─────────────────────────────────────────
// البحث الرئيسي — GET /api/search?q=...
// ─────────────────────────────────────────
exports.globalSearch = async (req, res) => {
    try {
        const q = req.query.q?.trim();

        if (!q || q.length < 2) {
            return res.status(200).json({
                success: true,
                data: { books: [], series: [], categories: [] },
            });
        }

        saveSearchQuery(q);

        // ─── تشغيل البحث في الثلاثة بشكل متوازٍ
        const [books, series, categories] = await Promise.all([

            // كتب — Atlas Search مع weighted scoring
            Book.aggregate([
                {
                    $search: {
                        index: "default",
                        compound: {
                            should: [
                                {
                                    text: {
                                        query: q,
                                        path: "title",
                                        score: { boost: { value: 10 } },
                                        fuzzy: { maxEdits: 1, prefixLength: 3 },
                                    },
                                },
                                {
                                    text: {
                                        query: q,
                                        path: "author",
                                        score: { boost: { value: 6 } },
                                        fuzzy: { maxEdits: 1, prefixLength: 3 },
                                    },
                                },
                                {
                                    text: {
                                        query: q,
                                        path: "description",
                                        score: { boost: { value: 1 } },
                                    },
                                },
                            ],
                            minimumShouldMatch: 1,
                        },
                    },
                },
                // ─── احذف النتائج الضعيفة
                { $match: { $expr: { $gt: [{ $meta: "searchScore" }, 1.5] } } },
                { $limit: 8 },
                { $lookup: { from: "categories", localField: "categories", foreignField: "_id", as: "categories" } },
                { $lookup: { from: "series", localField: "series", foreignField: "_id", as: "seriesData" } },
                { $unwind: { path: "$seriesData", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        title: 1, author: 1, coverImage: 1,
                        format: 1, downloadCount: 1,
                        categories: { _id: 1, name: 1 },
                        series: "$seriesData.name",
                        seriesOrder: 1,
                        score: { $meta: "searchScore" },
                    },
                },
            ]),

            // سلاسل — regex
            Series.aggregate([
                { $match: { name: { $regex: q, $options: "i" } } },
                { $limit: 4 },
                {
                    $lookup: {
                        from: "books",
                        localField: "_id",
                        foreignField: "series",
                        as: "books",
                    },
                },
                { $project: { name: 1, booksCount: { $size: "$books" } } },
            ]),

            // تصنيفات — regex
            Category.find(
                { name: { $regex: q, $options: "i" } },
                { name: 1 }
            ).limit(4).lean(),
        ]);

        res.status(200).json({
            success: true,
            query: q,
            data: { books, series, categories },
        });

    } catch (error) {
        console.error("[globalSearch]", error.message);

        // ─── Fallback لو Atlas Search معطل
        if (error.message.includes("$search")) {
            return fallbackSearch(req, res);
        }

        res.status(500).json({ success: false, message: "حدث خطأ في البحث" });
    }
};

// ─────────────────────────────────────────
// Autocomplete — GET /api/search/autocomplete?q=...
// ─────────────────────────────────────────
exports.autocomplete = async (req, res) => {
    try {
        const q = req.query.q?.trim();

        if (!q || q.length < 2) {
            return res.status(200).json({ success: true, data: [] });
        }

        const suggestions = await Book.aggregate([
            {
                $search: {
                    index: "default",
                    compound: {
                        should: [
                            {
                                autocomplete: {
                                    query: q,
                                    path: "title",
                                    score: { boost: { value: 3 } },
                                },
                            },
                            {
                                autocomplete: {
                                    query: q,
                                    path: "author",
                                    score: { boost: { value: 2 } },
                                },
                            },
                        ],
                    },
                },
            },
            { $limit: 5 },
            { $project: { _id: 1, title: 1, author: 1, coverImage: 1 } },
        ]);

        res.status(200).json({ success: true, data: suggestions });

    } catch (error) {
        console.error("[autocomplete]", error.message);
        res.status(200).json({ success: true, data: [] });
    }
};

// ─────────────────────────────────────────
// Popular Searches — GET /api/search/popular
// ─────────────────────────────────────────
exports.getPopularSearches = async (req, res) => {
    try {
        const sorted = [...searchCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));

        res.status(200).json({ success: true, data: sorted });
    } catch (error) {
        res.status(500).json({ success: false, message: "حدث خطأ" });
    }
};

// ─────────────────────────────────────────
// Fallback — regex لو Atlas معطل
// ─────────────────────────────────────────
const fallbackSearch = async (req, res) => {
    try {
        const q     = req.query.q?.trim();
        const regex = { $regex: q, $options: "i" };

        const [books, series, categories] = await Promise.all([
            Book.find({ $or: [{ title: regex }, { author: regex }] })
                .limit(8)
                .populate("categories", "name")
                .select("title author coverImage format downloadCount")
                .lean(),
            Series.find({ name: regex }).limit(4).lean(),
            Category.find({ name: regex }, { name: 1 }).limit(4).lean(),
        ]);

        res.status(200).json({
            success: true,
            query: q,
            data: { books, series, categories },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "حدث خطأ في البحث" });
    }
};