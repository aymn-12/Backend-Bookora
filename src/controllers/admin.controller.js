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
                const [users, admins, regular, books, authors, requests, downloads] = await Promise.all([
                    User.countDocuments({ isVerified: true }),
                    User.countDocuments({ isVerified: true, role: "admin" }),
                    User.countDocuments({ isVerified: true, role: "user" }),
                    Book.countDocuments(),
                    Book.distinct("author").then(authors => authors.length),
                    BookRequest.countDocuments(),
                    Book.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }])
                ]);
                return {
                    totalUsers: users,
                    totalAdmins: admins,
                    totalRegularUsers: regular,
                    totalBooks: books,
                    totalAuthors: authors,
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

            // 4. Category Distribution
            Book.aggregate([
                { $unwind: "$categories" },
                { $group: { _id: "$categories", count: { $sum: 1 } } },
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

        const { search, role } = req.query; // إضافة role للفلترة
        const query = {};

        if (search) {
            query.$or = [
                { name:  { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        // تفعيل فلترة الأدوار
        if (role && role !== "all") {
            query.role = role;
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
