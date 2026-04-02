const Section = require("../models/section.models");
const Book = require("../models/book.models");

// ─── مساعدة: جلب كل المعرفات للأبناء (Recursive IDs)
const getDescendantIds = async (parentId) => {
    let children = await Section.find({ parent: parentId });
    let ids = children.map(c => c._id);
    for (let child of children) {
        const subIds = await getDescendantIds(child._id);
        ids = [...ids, ...subIds];
    }
    return ids;
};

// ─── إنشاء قسم
exports.createSection = async (req, res) => {
    try {
        const { name, icon, description, parent } = req.body;

        const exists = await Section.findOne({ name });
        if (exists) {
            return res.status(400).json({ message: "القسم موجود مسبقاً" });
        }

        const section = await Section.create({ 
            name, 
            icon, 
            description, 
            parent: parent || null 
        });
        res.status(201).json({ success: true, data: section });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب كل الأقسام (مع حساب الكتب التكراري)
exports.getAllSections = async (req, res) => {
    try {
        const sections = await Section.find().sort({ name: 1 });

        const sectionsWithCount = await Promise.all(sections.map(async (sec) => {
            const descendantIds = await getDescendantIds(sec._id);
            const allTargetIds = [sec._id, ...descendantIds];
            const count = await Book.countDocuments({ sections: { $in: allTargetIds } });
            return {
                ...sec.toObject(),
                booksCount: count
            };
        }));

        res.status(200).json({
            success: true,
            count: sectionsWithCount.length,
            data: sectionsWithCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── جلب قسم واحد + كتبه (يشمل الأبناء والفروع)
exports.getSectionById = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }

        const descendantIds = await getDescendantIds(section._id);
        const allTargetIds = [section._id, ...descendantIds];

        // احسب إجمالي عدد الكتب لهذا القسم وفروعه (للترقيم)
        const totalBooks = await Book.countDocuments({ sections: { $in: allTargetIds } });

        // جلب الأبناء المباشرين لعرضهم كمتصفح فروع
        const immediateChildren = await Section.find({ parent: section._id });
        
        const childrenWithCount = await Promise.all(immediateChildren.map(async (child) => {
            const subDescendantIds = await getDescendantIds(child._id);
            const childTargetIds = [child._id, ...subDescendantIds];
            const count = await Book.countDocuments({ sections: { $in: childTargetIds } });
            return {
                ...child.toObject(),
                booksCount: count
            };
        }));

        // جلب الكتب بخصائص الترقيم (Pagination)
        const books = await Book.find({ sections: { $in: allTargetIds } })
            .populate("categories", "name")
            .select("title author coverImage format downloadCount status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({ 
            success: true, 
            data: { 
                section, 
                books, 
                pagination: {
                    total: totalBooks,
                    page,
                    limit,
                    pages: Math.ceil(totalBooks / limit)
                },
                children: childrenWithCount 
            } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── تعديل قسم
exports.updateSection = async (req, res) => {
    try {
        const { name, icon, description, parent } = req.body;

        const section = await Section.findByIdAndUpdate(
            req.params.id,
            { name, icon, description, parent: parent || null },
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
        const sectionId = req.params.id;
        const section = await Section.findById(sectionId);
        
        if (!section) {
            return res.status(404).json({ message: "القسم غير موجود" });
        }

        // فك ارتباط الكتب بالقسم
        await Book.updateMany(
            { sections: sectionId },
            { $pull: { sections: sectionId } }
        );

        await section.deleteOne();
        res.status(200).json({ success: true, message: "تم حذف القسم بنجاح وفك ارتباط كتبه" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── إضافة كتاب لقسم
exports.addBookToSection = async (req, res) => {
    try {
        const { bookId } = req.body;
        const sectionId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: "الكتاب غير موجود" });

        if (!book.sections.includes(sectionId)) {
            book.sections.push(sectionId);
            await book.save();
        }

        res.status(200).json({ success: true, message: "تم إضافة الكتاب للقسم" });
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
