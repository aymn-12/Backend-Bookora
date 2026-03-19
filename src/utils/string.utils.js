const crypto = require("crypto");

/**
 * Normalizes Arabic text to a standard form for comparison.
 * - Removes diacritics (harakat).
 * - Maps variant characters (Alef, Teh Marbuta, etc.) to a base form.
 * - Removes non-alphanumeric characters.
 * - Collapses whitespace.
 */
exports.normalizeArabic = (text) => {
    if (!text) return "";

    return text
        .trim()
        .toLowerCase()
        // ─── إزالة التشكيل (Harakat)
        .replace(/[\u064B-\u0652]/g, "")
        // ─── توحيد الألفات (Alef variants)
        .replace(/[أإآ]/g, "ا")
        // ─── توحيد التاء المربوطة والهاء (Teh Marbuta / Heh)
        .replace(/ة/g, "ه")
        // ─── توحيد الياء والألف المقصورة (Yeh / Alef Maksura)
        .replace(/[ىي]/g, "ي")
        // ─── إزالة العلامات الخاصة والرموز
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
        // ─── توحيد المسافات
        .replace(/\s+/g, " ")
        .trim();
};

/**
 * Generates a SHA-256 hash of a buffer.
 */
exports.generateFileHash = (buffer) => {
    if (!buffer) return null;
    return crypto.createHash("sha256").update(buffer).digest("hex");
};
