const User = require("../models/user.models");
const Book = require("../models/book.models");
const Review = require("../models/review.models");
const Category = require("../models/category.models");
const BookRequest = require("../models/bookRequest.models");

// ─── Dashboard Stats (Advanced Nested Structure)
exports.getStats = async (req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [
            overview,
            newStats,
            topDownloaded,
            categoriesDistribution
        ] = await Promise.all([
            // 1. Overview Totals
            (async () => {
                const [[users, admins, regular], publishedAuthorsResult, pendingAuthorsResult, rejectedBooks, requests, downloads] = await Promise.all([
                    Promise.all([
                        User.countDocuments({ isVerified: true }),
                        User.countDocuments({ isVerified: true, role: "admin" }),
                        User.countDocuments({ isVerified: true, role: "user" }),
                    ]),
                    Book.distinct("author", { publishStatus: { $in: ["approved", null] }, status: "published" }),
                    Book.distinct("author", { publishStatus: "pending_review" }),
                    Book.countDocuments({ publishStatus: "rejected" }),
                    BookRequest.countDocuments(),
                    Book.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }])
                ]);

                const publishedAuthorIds = new Set(publishedAuthorsResult.map(id => id.toString()));
                const pendingOnlyAuthors = pendingAuthorsResult.filter(id => !publishedAuthorIds.has(id.toString()));

                const books = await Book.countDocuments({ publishStatus: { $in: ["approved", null] }, status: "published" });
                const pendingBooks = await Book.countDocuments({ publishStatus: "pending_review" });
                const approvedBooks = await Book.countDocuments({ publishStatus: "approved" });

                return {
                    totalUsers: users,
                    totalAdmins: admins,
                    totalRegularUsers: regular,
                    totalBooks: books,
                    pendingBooks,
                    approvedBooks,
                    rejectedBooks,
                    totalAuthors: publishedAuthorsResult.length,
                    pendingAuthors: pendingOnlyAuthors.length,
                    totalRequests: requests,
                    totalDownloads: downloads.length > 0 ? downloads[0].total : 0
                };
            })(),

            // 2. Today's Activity
            (async () => {
                const news = await Book.countDocuments({ createdAt: { $gte: startOfToday } });
                return { newBooks: news };
            })(),

            // 3. Top Charts
            Book.find()
                .sort({ downloadCount: -1, downloads: -1 })
                .limit(5)
                .select("title author downloadCount coverImage"),

            // 4. Category Distribution (with Names)
            Book.aggregate([
                { $unwind: "$categories" },
                { $group: { _id: "$categories", count: { $sum: 1 } } },
                { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "catInfo" } },
                { $unwind: "$catInfo" },
                { $project: { _id: 1, count: 1, name: "$catInfo.name" } },
                { $sort: { count: -1 } },
                { $limit: 8 }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview,
                today: newStats,
                topCharts: { topDownloaded },
                distribution: { categories: categoriesDistribution }
            }
        });
    } catch (error) { next(error); }
};

// ─── إدارة المستخدمين
exports.getAllUsers = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip  = (page - 1) * limit;

        const { search, role, hasAuthorSub } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name:  { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        if (role && role !== "all") {
            query.role = role;
        }

        // Filter users who have activated author subscription
        if (hasAuthorSub === "true") {
            query["authorSubscription.status"] = { $in: ["trial", "active", "expired"] };
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -refreshToken -resetOtp -resetOtpExpires -otp -otpExpires")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext:    page < Math.ceil(total / limit),
                hasPrev:    page > 1,
            },
        });
    } catch (error) { next(error); }
};

// ─── حذف مستخدم
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user._id.toString() === req.user._id.toString())
            return res.status(400).json({ message: "Cannot delete yourself" });

        await user.deleteOne();
        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) { next(error); }
};

// ─── تغيير role مستخدم
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!["user", "admin"].includes(role))
            return res.status(400).json({ message: "Invalid role" });

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        if (targetUser.role === "superadmin")
            return res.status(403).json({ message: "Cannot modify superadmin" });

        if (targetUser._id.toString() === req.user._id.toString())
            return res.status(400).json({ message: "Cannot change your own role" });

        targetUser.role = role;
        await targetUser.save();

        res.status(200).json({
            success: true,
            data: { _id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role }
        });
    } catch (error) { next(error); }
};

// ─── إنشاء مستخدم جديد (Superadmin فقط)
exports.createUser = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ message: "الدور غير صالح" });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "البريد الإلكتروني مستخدم مسبقاً" });
        }

        const bcrypt = require("bcrypt");
        const hashedPassword = await bcrypt.hash(password, 10);
        const generatedName = "BKR-" + Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            name: generatedName,
            email,
            password: hashedPassword,
            role,
            isVerified: true,
            savedBooks: [],
            downloadedBooks: [],
            attempts: 0,
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) { next(error); }
};

// ─── مراجعة كتاب مؤلف (قبول / رفض)
exports.reviewBook = async (req, res, next) => {
    try {
        const { action, notes } = req.body;

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: "الإجراء غير صالح. يجب أن يكون approve أو reject" });
        }

        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        if (book.publishStatus !== "pending_review") {
            return res.status(400).json({ message: "هذا الكتاب ليس قيد المراجعة" });
        }

        // Files are already on Google Drive (PDF) + Supabase (cover) — just update status
        const updateData = {
            publishStatus: action === "approve" ? "approved" : "rejected",
            status: action === "approve" ? "published" : "draft",
            reviewedBy:    req.user._id,
            reviewedAt:    new Date(),
            ...(action === "reject" && notes ? { reviewNotes: notes } : {}),
        };

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.json({ success: true, data: updatedBook });
    } catch (error) { next(error); }
};

// ─── تحديث حالة المؤلف (إلغاء / إعادة تعيين تجربة)
exports.updateAuthorStatus = async (req, res, next) => {
    try {
        const { action } = req.body; // "revoke" | "reset_trial"

        if (!["revoke", "reset_trial"].includes(action)) {
            return res.status(400).json({ message: "الإجراء غير صالح" });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

        if (action === "revoke") {
            user.authorSubscription = {
                status: "none",
                trialEndsAt: null,
                trialBooksUsed: 0,
                monthlyUploadCount: 0,
                subscriptionStartsAt: null,
                subscriptionEndsAt: null,
            };
        } else if (action === "reset_trial") {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 15);
            user.authorSubscription.status = "trial";
            user.authorSubscription.trialEndsAt = trialEndsAt;
            user.authorSubscription.trialBooksUsed = 0;
        }

        await user.save();

        res.json({
            success: true,
            message: action === "revoke" ? "تم إلغاء صلاحية المؤلف" : "تم إعادة تعيين فترة التجربة",
            data: { authorSubscription: user.authorSubscription },
        });
    } catch (error) { next(error); }
};