const SECTIONS = {
    FICTION: "69bc72ed5c9b170b5e8801ea",     // الروايات والقصص الادبيه
    SELF_HELP: "69bc73125c9b170b5e8801f4",   // التنميه البشريه وتطوير الذات
    INT_FICTION: "69bc74315c9b170b5e880255", // الروايات العالمية والروايات المترجمة
    AR_FICTION: "69bc742a5c9b170b5e880250",  // الروايات العربية
};

/**
 * Smartly suggests a section ID based on the book title.
 * @param {string} title - The title of the book.
 * @returns {string} - The suggested section ID.
 */
const suggestSection = (title) => {
    if (!title) return SECTIONS.FICTION;
    
    const t = title.toLowerCase();

    // Mapping logic
    if (t.includes("آن في") || t.includes("المرتفعات") || t.includes("القلعة الزرقاء") || t.includes("المسكن") || t.includes("رواية عالمية")) {
        return SECTIONS.INT_FICTION;
    } 
    
    if (t.includes("فن اللامبالاة") || t.includes("تسويق") || t.includes("خطة") || t.includes("تطوير") || t.includes("نجاح") || t.includes("عادات")) {
        return SECTIONS.SELF_HELP;
    } 
    
    if (t.includes("رواية") || t.includes("قصة") || t.includes("حكاية")) {
        return SECTIONS.AR_FICTION;
    }

    // Default fallback
    return SECTIONS.FICTION;
};

module.exports = { suggestSection };
