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

module.exports = { supabase, uploadToSupabase, deleteFromSupabase };
