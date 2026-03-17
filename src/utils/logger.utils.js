const winston = require("winston");
const path = require("path");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({        // ✅ transports.File وليس transport.defaultMaxListeners
            filename: path.join("logs", "error.log"),  // ✅ filename وليس failename
            level: "error",
        }),
        new winston.transports.File({        // ✅ transports.File وليس transport.File
            filename: path.join("logs", "combined.log"), // ✅ filename وليس failename
        }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

module.exports = logger;