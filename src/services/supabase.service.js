const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ [Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload an image buffer to Supabase Storage
 * @param {Buffer} buffer - The image buffer
 * @param {string} fileName - Destination filename
 * @param {string} mimetype - File mimetype
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
const uploadToSupabase = async (buffer, fileName, mimetype = 'image/jpeg') => {
    try {
        const bucketName = 'book-covers.';
        console.log(`[Supabase] Attempting upload to bucket: "${bucketName}" at URL: ${supabaseUrl}`);
        
        // Upload the file to the bucket
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: mimetype,
                upsert: true // Overwrite if exists
            });

        if (error) {
            console.error(`[Supabase] Upload error details:`, error);
            throw error;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error("[Supabase] Upload error:", error.message);
        throw error;
    }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} fileName - File path/name in the bucket
 */
const deleteFromSupabase = async (fileName) => {
    try {
        const { error } = await supabase.storage
            .from('book-covers')
            .remove([fileName]);

        if (error) throw error;
    } catch (error) {
        console.error("[Supabase] Delete error:", error.message);
    }
};


/**
 * Generate a signed URL for direct upload from frontend
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} filePath - Destination file path
 * @param {number} expirySeconds - URL expiration time (default: 3600)
 * @returns {Promise<{signedUrl: string, path: string, token: string}>}
 */
const generateSignedUploadUrl = async (bucket, filePath, expirySeconds = 3600) => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(filePath, { expiresIn: expirySeconds });
        if (error) throw error;
        return data; // { signedUrl, path, token }
    } catch (error) {
        console.error("[Supabase] Signed URL generation error:", error.message);
        throw error;
    }
};

/**
 * Move file between buckets (Download → Upload → Delete)
 * Note: Supabase JS doesn't support cross-bucket move directly.
 * @param {string} fromBucket - Source bucket
 * @param {string} toBucket - Destination bucket
 * @param {string} filePath - File path within the bucket
 */
const moveFile = async (fromBucket, toBucket, filePath) => {
    try {
        // 1. Download from source
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(fromBucket)
            .download(filePath);
        if (downloadError) throw downloadError;

        // 2. Upload to destination
        const { error: uploadError } = await supabase.storage
            .from(toBucket)
            .upload(filePath, fileData, { upsert: true });
        if (uploadError) throw uploadError;

        // 3. Delete from source (best effort)
        const { error: deleteError } = await supabase.storage
            .from(fromBucket)
            .remove([filePath]);
        if (deleteError) console.warn("[Supabase] Cleanup warning:", deleteError.message);

        return true;
    } catch (error) {
        console.error("[Supabase] Move file error:", error.message);
        throw error;
    }
};

/**
 * Delete file from a specific bucket
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} filePath - File path to delete
 */
const deleteFromBucket = async (bucket, filePath) => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);
        if (error) throw error;
    } catch (error) {
        console.error("[Supabase] Delete error:", error.message);
        throw error;
    }
};

module.exports = {
    supabase,
    uploadToSupabase,
    deleteFromSupabase,
    generateSignedUploadUrl,
    moveFile,
    deleteFromBucket,
};
