const { google } = require("googleapis");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

// ─── OAuth2 Client — يرفع لدرايفك الشخصي مباشرة
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://backend-bookora.onrender.com/api/auth/google/callback"
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ─── تجديد تلقائي للـ Token لو تغيّر
oauth2Client.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
        // احفظ الـ Refresh Token الجديد في .env تلقائياً
        const envPath = path.join(__dirname, "../../.env");
        try {
            let envContent = fs.readFileSync(envPath, "utf8");
            envContent = envContent.replace(
                /GOOGLE_REFRESH_TOKEN=.*/,
                `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
            );
            fs.writeFileSync(envPath, envContent);
            console.log("🔄 [Drive] Refresh token updated automatically in .env");
        } catch (err) {
            // لو فشل الحفظ في .env — اطبعه في الـ console يدوياً
            console.warn("⚠️ [Drive] New refresh token — save manually in .env:");
            console.warn(tokens.refresh_token);
        }
    }
    if (tokens.access_token) {
        console.log("✅ [Drive] Access token refreshed successfully");
    }
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// ─── رفع ملف لدرايفك الشخصي
const uploadToDrive = async ({ buffer, filePath, mimetype, originalname, folderId }) => {
    let bodyStream;
    if (filePath) {
        console.log(`[Drive] Streaming file from disk: ${filePath}`);
        bodyStream = fs.createReadStream(filePath);
    } else if (buffer) {
        console.log(`[Drive] Streaming file from buffer (size: ${buffer.length})`);
        bodyStream = Readable.from(buffer);
    } else {
        throw new Error("يجب توفير buffer أو filePath للرفع إلى Drive");
    }

    const res = await drive.files.create({
        requestBody: {
            name: `${originalname}`,
            parents: [folderId],
        },
        media: {
            mimeType: mimetype,
            body: bodyStream,
        },
        fields: "id, name, thumbnailLink, webViewLink",
    });

    const fileId = res.data.id;
    const thumbnailLink = res.data.thumbnailLink;

    // ─── اجعل الملف قابل للقراءة لأي شخص عنده الرابط
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: "reader",
            type: "anyone",
        },
    });

    const backendUrl = process.env.BACKEND_URL || 'https://backend-bookora.onrender.com';

    return {
        fileId,
        fileUrl:    `https://drive.google.com/uc?export=download&id=${fileId}`,
        // Use our own proxy instead of Google's thumbnail link
        previewUrl: `${backendUrl}/api/images/cover/${fileId}`,
    };
};

// ─── حذف ملف من Drive
const deleteFromDrive = async (fileId) => {
    if (!fileId) return;
    try {
        await drive.files.delete({ fileId });
    } catch (err) {
        console.error(`[Drive] فشل حذف الملف ${fileId}:`, err.message);
    }
};

/**
 * Move a file from one folder to another in Google Drive
 * @param {string} fileId - ID of the file to move
 * @param {string} targetFolderId - ID of the target folder
 */
const moveFileInDrive = async (fileId, targetFolderId) => {
    try {
        // 1. Get current parents
        const file = await drive.files.get({
            fileId: fileId,
            fields: 'parents'
        });
        const previousParents = file.data.parents.join(',');

        // 2. Move file: Add new parent and remove old ones
        const movedFile = await drive.files.update({
            fileId: fileId,
            addParents: targetFolderId,
            removeParents: previousParents,
            fields: 'id, parents'
        });

        console.log(`[Drive] File ${fileId} moved successfully to ${targetFolderId}`);
        return movedFile.data;
    } catch (error) {
        console.error(`[Drive] Move file error for ${fileId}:`, error.message);
        throw error;
    }
};

module.exports = {
    uploadToDrive,
    deleteFromDrive,
    moveFileInDrive,
    drive,
    oauth2Client, // مطلوب للحصول على access token مباشرةً في streamBook
};
