const Category = require("../models/category.models");

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

// ─── جلب كل التصنيفات
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب تصنيف واحد
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "التصنيف غير موجود" });
        }
        res.status(200).json({ success: true, data: category });
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
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "التصنيف غير موجود" });
        }
        res.status(200).json({ success: true, message: "تم حذف التصنيف بنجاح" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};