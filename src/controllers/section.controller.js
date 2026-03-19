const Section = require("../models/section.models");
const Book    = require("../models/book.models");

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

// ─── جلب قسم واحد + كتبه
exports.getSectionById = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }

        const books = await Book.find({ sections: section._id })
            .populate("categories", "name")
            .select("title author coverImage format downloadCount");

        res.status(200).json({ success: true, data: { section, books } });
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
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }

        // ─── فك ارتباط الكتب بالقسم
        await Book.updateMany(
            { sections: section._id },
            { $pull: { sections: section._id } }
        );

        await section.deleteOne();
        res.status(200).json({ success: true, message: "تم حذف القسم بنجاح وفك ارتباط كتبه" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── إضافة كتاب موجود لقسم
exports.addBookToSection = async (req, res) => {
    try {
        const { bookId } = req.body;
        const sectionId = req.params.id;

        const section = await Section.findById(sectionId);
        if (!section) return res.status(404).json({ message: "القسم غير موجود" });

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        // إضافة القسم للمصفوفة لو مش موجود
        if (!book.sections.includes(sectionId)) {
            book.sections.push(sectionId);
            await book.save();
        }

        res.status(200).json({ success: true, message: "تم إضافة الكتاب للقسم", data: book });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── إزالة كتاب من قسم
exports.removeBookFromSection = async (req, res) => {
    try {
        const { bookId } = req.params;
        const sectionId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        book.sections = book.sections.filter(id => id.toString() !== sectionId);
        await book.save();

        res.status(200).json({ success: true, message: "تم إزالة الكتاب من القسم" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
