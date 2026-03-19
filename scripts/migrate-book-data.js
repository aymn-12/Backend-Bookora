require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const axios = require("axios");
const Book = require("../src/models/book.models");
const { normalizeArabic, generateFileHash } = require("../src/utils/string.utils");

const migrate = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("✅ Connected to MongoDB");

        const books = await Book.find({
            $or: [
                { fileHash: { $exists: false } },
                { normalizedTitle: { $exists: false } }
            ]
        });

        console.log(`🔍 Found ${books.length} books to migrate.`);

        for (const book of books) {
            console.log(`📖 Processing: ${book.title}`);
            
            // 1. Normalize Title
            book.normalizedTitle = normalizeArabic(book.title);

            // 2. Fetch File to Generate Hash (only if fileHash missing)
            if (!book.fileHash && book.fileUrl) {
                try {
                    console.log(`   - Fetching file content from: ${book.fileUrl}`);
                    const response = await axios.get(book.fileUrl, { responseType: "arraybuffer" });
                    book.fileHash = generateFileHash(Buffer.from(response.data));
                    console.log(`   - Generated Hash: ${book.fileHash}`);
                } catch (err) {
                    console.error(`   ❌ Failed to fetch file for hash: ${err.message}`);
                }
            }

            try {
                await book.save();
                console.log(`   ✅ Migrated success.`);
            } catch (err) {
                if (err.code === 11000) {
                    console.error(`   ⚠️ Duplicate detected for: ${book.title}. Skipping...`);
                } else {
                    console.error(`   ❌ Save error: ${err.message}`);
                }
            }
        }

        console.log("\n🎉 Migration finished!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

migrate();
