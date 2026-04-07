const pdfParse = require('pdf-parse');
const { supabase } = require('./supabase.service');

// Load forbidden words once at startup from env var
const FORBIDDEN_WORDS = process.env.FORBIDDEN_WORDS
    ? process.env.FORBIDDEN_WORDS.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    : [];

/**
 * Scan PDF for forbidden words.
 * Memory-safe strategy:
 *   1. Check file size before download (skip if > 20MB)
 *   2. Limit text analysis to first 100KB only
 *
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} filePath - File path within the bucket
 * @returns {Promise<{safe: boolean, flaggedWords: string[], skipped?: boolean}>}
 */
const scanPdfForForbiddenWords = async (bucket, filePath) => {
    // If no forbidden words configured, skip scan entirely
    if (FORBIDDEN_WORDS.length === 0) {
        return { safe: true, flaggedWords: [] };
    }

    try {
        // ── STEP 1: Size check before downloading ──────────────────────────
        const pathParts = filePath.split('/');
        const fileName  = pathParts.pop();
        const directory = pathParts.join('/');

        const { data: metadata } = await supabase.storage
            .from(bucket)
            .list(directory || undefined, { search: fileName });

        const fileSizeBytes = metadata?.[0]?.metadata?.size ?? 0;

        if (fileSizeBytes > 20 * 1024 * 1024) {
            console.log(
                `[TextFilter] Skipping scan for "${filePath}" ` +
                `(${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB > 20MB limit) ` +
                `— flagged for manual admin review`
            );
            return { safe: true, flaggedWords: [], skipped: true };
        }

        // ── STEP 2: Download PDF ───────────────────────────────────────────
        const { data: fileData, error } = await supabase.storage
            .from(bucket)
            .download(filePath);
        if (error) throw error;

        // ── STEP 3: Parse PDF text ─────────────────────────────────────────
        const pdfData = await pdfParse(fileData);

        // ── STEP 4: Limit analysis to first 100KB of extracted text ────────
        const textToScan = pdfData.text.substring(0, 100 * 1024).toLowerCase();

        // ── STEP 5: Check for forbidden words ──────────────────────────────
        const flaggedWords = FORBIDDEN_WORDS.filter(word => textToScan.includes(word));

        return {
            safe: flaggedWords.length === 0,
            flaggedWords,
        };

    } catch (err) {
        console.error("[TextFilter] Scan error:", err.message);
        // On any error, return safe=false to trigger manual admin review
        return { safe: false, flaggedWords: ['scan_error'] };
    }
};

module.exports = { scanPdfForForbiddenWords };
