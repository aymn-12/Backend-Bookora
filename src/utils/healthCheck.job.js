const cron = require("node-cron");
const Book = require("../models/book.models");
const Section = require("../models/section.models");
const winston = require("winston");

// Configure a dedicated logger for health checks
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "logs/db-health.log" })
    ]
});

const runHealthCheck = async () => {
    try {
        console.log("🔍 Running Database Health Check...");
        const allBooks = await Book.find({});
        const sections = await Section.find({});
        const sectionIds = new Set(sections.map(s => s._id.toString()));

        let issuesFound = 0;

        for (const book of allBooks) {
            let bookIssues = [];

            // 1. Check for unassigned sections
            if (!book.sections || book.sections.length === 0) {
                bookIssues.push("No section assigned");
            } else {
                // 2. Check for invalid section references
                for (const secId of book.sections) {
                    if (!sectionIds.has(secId.toString())) {
                        bookIssues.push(`Invalid section ID: ${secId}`);
                    }
                }
            }

            // 3. Check for missing media links
            if (!book.coverImage || !book.fileUrl) {
                bookIssues.push("Missing cover or file link");
            }

            if (bookIssues.length > 0) {
                issuesFound++;
                logger.warn({
                    bookId: book._id,
                    title: book.title,
                    issues: bookIssues
                });
            }
        }

        if (issuesFound > 0) {
            console.log(`⚠️  Health check finished: Found issues in ${issuesFound} books. See logs/db-health.log`);
        } else {
            console.log("✅ Database Health Check: Everything is perfect.");
        }

    } catch (error) {
        console.error("❌ Database Health Check Error:", error);
    }
};

const databaseHealthCheckJob = () => {
    // Run daily at midnight
    cron.schedule("0 0 * * *", runHealthCheck);
    
    // Also run once immediately on server start for immediate protection
    runHealthCheck();
};

module.exports = databaseHealthCheckJob;
