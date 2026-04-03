// src/controllers/search.controller.js
const mongoose = require("mongoose");
const Book     = require("../models/book.models");
const Series   = require("../models/series.models");
const Category = require("../models/category.models");
const { normalizeArabic } = require("../utils/string.utils");

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

        try {
            const [books, series, categories] = await Promise.all([
                Book.aggregate([
                    {
                        $search: {
                            index: "books_search",
                            compound: {
                                filter: [
                                    {
                                        equals: {
                                            path: "status",
                                            value: "published"
                                        }
                                    }
                                ],
                                should: [
                                    // ✅ تطابق الجمل (Phrase Matching) يعطي أعلى أولوية
                                    {
                                        phrase: {
                                            query: q,
                                            path: "title",
                                            score: { boost: { value: 15 } }
                                        }
                                    },
                                    {
                                        phrase: {
                                            query: q,
                                            path: "normalizedTitle",
                                            score: { boost: { value: 12 } }
                                        }
                                    },
                                    // ✅ البحث النصي التقليدي مع تصحيح الأخطاء
                                    {
                                        text: {
                                            query: q,
                                            path: "title",
                                            score: { boost: { value: 8 } },
                                            fuzzy: { maxEdits: 1, prefixLength: 2 },
                                        },
                                    },
                                    {
                                        text: {
                                            query: q,
                                            path: "normalizedTitle",
                                            score: { boost: { value: 6 } },
                                            fuzzy: { maxEdits: 1, prefixLength: 2 },
                                        },
                                    },
                                    {
                                        text: {
                                            query: q,
                                            path: "author",
                                            score: { boost: { value: 4 } },
                                            fuzzy: { maxEdits: 1 }
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
                            highlight: {
                                path: ["title", "author"]
                            }
                        },
                    },
                    { $limit: 12 },
                    {
                        $lookup: {
                            from: "categories",
                            localField: "categories",
                            foreignField: "_id",
                            as: "categories"
                        }
                    },
                    {
                        $lookup: {
                            from: "series",
                            localField: "series",
                            foreignField: "_id",
                            as: "seriesData"
                        }
                    },
                    { $unwind: { path: "$seriesData", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            title: 1,
                            author: 1,
                            coverImage: 1,
                            format: 1,
                            downloadCount: 1,
                            categories: { _id: 1, name: 1 },
                            series: "$seriesData",
                            seriesOrder: 1,
                            score: { $meta: "searchScore" },
                            highlights: { $meta: "searchHighlights" },
                        },
                    },
                ]),

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

                Category.find(
                    { name: { $regex: q, $options: "i" } },
                    { name: 1 }
                ).limit(4).lean(),
            ]);

            if (books.length > 0) {
                return res.status(200).json({
                    success: true,
                    query: q,
                    data: { books, series, categories },
                });
            }

            throw new Error("Atlas empty — fallback");

        } catch (atlasError) {
            console.warn("[globalSearch] Atlas fallback:", atlasError.message);
        }

        // ─── Regex Fallback
        const normalizedQ = normalizeArabic(q);
        const regex = { $regex: normalizedQ, $options: "i" };

        const [books, series, categories] = await Promise.all([
            Book.find({
                status: "published",
                $or: [
                    { title: regex },
                    { author: regex },
                    { normalizedTitle: regex }
                ]
            })
                .limit(12)
                .populate("categories", "name")
                .populate("series", "name")
                .select("title author coverImage format downloadCount categories series seriesOrder")
                .lean(),

            Series.find({ name: regex }).limit(4)
                .select("name")
                .lean()
                .then(list =>
                    Promise.all(list.map(async s => ({
                        ...s,
                        booksCount: await Book.countDocuments({ series: s._id }),
                    })))
                ),

            Category.find({ name: regex }, { name: 1 }).limit(4).lean(),
        ]);

        res.status(200).json({
            success: true,
            query: q,
            data: { books, series, categories },
        });

    } catch (error) {
        console.error("[globalSearch] Fatal:", error.message);
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

        try {
            const suggestions = await Book.aggregate([
                {
                    $search: {
                        index: "books_search",
                        compound: {
                            filter: [
                                {
                                    equals: {
                                        path: "status",
                                        value: "published"
                                    }
                                }
                            ],
                            should: [
                                {
                                    autocomplete: {
                                        query: q,
                                        path: "title",
                                        score: { boost: { value: 5 } },
                                        fuzzy: { maxEdits: 1 }
                                    }
                                },
                                {
                                    autocomplete: {
                                        query: q,
                                        path: "author",
                                        score: { boost: { value: 3 } }
                                    }
                                },
                            ],
                            minimumShouldMatch: 1,
                        },
                    },
                },
                { $limit: 6 },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        author: 1,
                        coverImage: 1,
                        score: { $meta: "searchScore" }
                    }
                },
            ]);

            if (suggestions.length > 0) {
                return res.status(200).json({ success: true, data: suggestions });
            }
            throw new Error("Atlas empty");
        } catch {}

        // Regex fallback
        const normalizedQ = normalizeArabic(q);
        const regex = { $regex: normalizedQ, $options: "i" };
        const fallback = await Book.find({
            status: "published",
            $or: [
                { title: regex },
                { author: regex },
                { normalizedTitle: regex }
            ]
        })
            .limit(6)
            .select("_id title author coverImage")
            .lean();

        res.status(200).json({ success: true, data: fallback });

    } catch (error) {
        res.status(200).json({ success: true, data: [] });
    }
};

// ─────────────────────────────────────────
// Popular Searches
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