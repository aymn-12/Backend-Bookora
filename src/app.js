const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger.utils");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sanitize = require('mongo-sanitize');
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const authRoutes = require("./routes/auth.routes");
const bookRoutes = require("./routes/book.routes");
const categoryRoutes = require("./routes/category.routes");
const reviewRoutes = require("./routes/review.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const seriesRoutes = require("./routes/series.routes");
const sectionRoutes = require("./routes/section.routes");
const bookRequestRoutes = require("./routes/bookRequest.routes");
const searchRoutes = require("./routes/search.routes");
const statsRoutes = require("./routes/stats.routes");
const downloadRoutes = require("./routes/download.routes");
const imageRoutes = require("./routes/image.routes"); // Add this
const authorRoutes = require("./routes/author.routes");
const xss = require("xss");


const { errorHandler, notFound } = require("./middlewares/error.middleware");

const app = express();

// Trust proxy is required for rate limiting on platforms like Render/Heroku
app.set("trust proxy", 1);

// ─── General Middleware
const allowedOrigins = [
    "http://localhost:3000",
    "https://bkora.online",
    "https://www.bkora.online"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type']
}));

// ─── Performance Monitoring & Security
app.use(helmet({
    contentSecurityPolicy: false,
    xssFilter: true,
    noSniff: true,
    frameguard: {
        action: "deny"
    },
    ieNoOpen: true,
    hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true
    }
}));

// Global Rate Limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Limit each IP to 2000 requests per windowMs
    message: { success: false, message: "Too many requests from this IP, please try again later" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use("/api", globalLimiter);


app.use(express.json({ limit: "50kb" })); // DoS Protection (Size Limit)
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ─── No-SQL Injection & XSS Protection
app.use((req, res, next) => {
    // Helper to recursively clean XSS (XSS protection)
    const cleanXSS = (obj) => {
        if (!obj || typeof obj !== "object" || obj === null) {
            return (typeof obj === "string") ? xss(obj) : obj;
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = cleanXSS(obj[key]);
            }
        }
        return obj;
    };

    // 1. Sanitize for NoSQL Injection (mongo-sanitize)
    // In Express 5, req.query is a getter. We modify it without reassignment.
    
    // Sanitize Body (Usually settable)
    if (req.body) req.body = sanitize(req.body);

    // Sanitize Query & Params in-place (Express 5 compatibility)
    const sQuery = sanitize(req.query);
    Object.keys(req.query).forEach(key => delete req.query[key]);
    Object.assign(req.query, sQuery);

    const sParams = sanitize(req.params);
    Object.keys(req.params).forEach(key => delete req.params[key]);
    Object.assign(req.params, sParams);

    // 2. Deep Sanitization for XSS
    cleanXSS(req.body);
    cleanXSS(req.query);
    cleanXSS(req.params);

    next();
});

// ─── HTTP Parameter Pollution Protection
app.use(hpp());
// ─── Logging
app.use(morgan("combined", {
    stream: {
        write: (message) => logger.http(message.trim())
    }
}));

app.use(cookieParser());

// ─── Routes 
app.use("/api/download", downloadRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/auth",       authRoutes);
app.use("/api/books",      bookRoutes);
app.use("/api/books/:id/reviews", reviewRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users",      userRoutes);
app.use("/api/series",     seriesRoutes);  
app.use("/api/sections",   sectionRoutes);
app.use("/api/requests", bookRequestRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/images",     imageRoutes); // Add this mount point
app.use("/api/author",     authorRoutes);

// ─── Static Files
app.use("/uploads", express.static("uploads"));
app.get("/api/health", (req, res) => res.json({ ok: true }));
 
/*app.get("/api/auth/google/callback", (req, res) => {
    res.json({ code: req.query.code });
});*/ 

app.use(notFound);
app.use(errorHandler);

module.exports = app;