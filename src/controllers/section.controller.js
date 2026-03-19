const Section = require("../models/section.models");

// ─── إنشاء قسم
exports.createSection = async (req, res) => {
    try {
        const { name, icon, description } = req.body;

        const exists = await Section.findOne({ name });
        if (exists) {
            return res.status(400).json({ message: "القسم موجود مسبقاً" });
        }

        const section = await Section.create({ name, icon, description });
        res.status(201).json({ success: true, data: section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب كل الأقسام
exports.getAllSections = async (req, res) => {
    try {
        const sections = await Section.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            count: sections.length,
            data: sections,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب قسم واحد
exports.getSectionById = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }
        res.status(200).json({ success: true, data: section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── تعديل قسم
exports.updateSection = async (req, res) => {
    try {
        const { name, icon, description } = req.body;

        const section = await Section.findByIdAndUpdate(
            req.params.id,
            { name, icon, description },
            { new: true, runValidators: true }
        );

        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }

        res.status(200).json({ success: true, data: section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── حذف قسم
exports.deleteSection = async (req, res) => {
    try {
        const section = await Section.findByIdAndDelete(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }
        res.status(200).json({ success: true, message: "تم حذف القسم بنجاح" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
