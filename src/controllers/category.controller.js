const Category = require("../models/category.models");
const Book = require("../models/book.models");

// ─── إنشاء تصنيف
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        const exists = await Category.findOne({ name });
        if (exists) {
            return res.status(400).json({ message: "التصنيف موجود مسبقاً" });
        }

        const category = await Category.create({ name });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب كل التصنيفات (مع حساب الكتب بكفاءة)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        // جلب عدد الكتب لكل التصنيفات دفعة واحدة (تجميع سريع)
        const counts = await Book.aggregate([
            { $unwind: "$categories" },
            { $group: { _id: "$categories", count: { $sum: 1 } } }
        ]);

        const countsMap = counts.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.count;
            return acc;
        }, {});

        const categoriesWithCount = categories.map(cat => ({
            ...cat.toObject(),
            booksCount: countsMap[cat._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            count: categoriesWithCount.length,
            data: categoriesWithCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب تصنيف واحد + كتبه
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "التصنيف غير موجود" });
        }

        const books = await Book.find({ categories: req.params.id })
            .select("title author coverImage format downloadCount");

        res.status(200).json({ 
            success: true, 
            data: { 
                category, 
                books, 
                children: [] // النظام مسطح، لا توجد أبناء
            } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── تعديل تصنيف
exports.updateCategory = async (req, res) => {
    try {
        const { name } = req.body;

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "التصنيف غير موجود" });
        }

        res.status(200).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── حذف تصنيف
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({ message: "التصنيف غير موجود" });
        }

        // فك ارتباط الكتب بهذا التصنيف
        await Book.updateMany(
            { categories: categoryId },
            { $pull: { categories: categoryId } }
        );

        await category.deleteOne();
        res.status(200).json({ success: true, message: "تم حذف التصنيف بنجاح وفك ارتباط كتبه" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── إضافة كتاب لتصنيف
exports.addBookToCategory = async (req, res) => {
    try {
        const { bookId } = req.body;
        const categoryId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        if (!book.categories.includes(categoryId)) {
            book.categories.push(categoryId);
            await book.save();
        }

        res.status(200).json({ success: true, message: "تم إضافة الكتاب للتصنيف" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── إزالة كتاب من تصنيف
exports.removeBookFromCategory = async (req, res) => {
    try {
        const { bookId } = req.params;
        const categoryId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        book.categories = book.categories.filter(id => id.toString() !== categoryId);
        await book.save();

        res.status(200).json({ success: true, message: "تم إزالة الكتاب من التصنيف" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};