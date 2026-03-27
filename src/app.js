const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger.utils");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sanitize = require('mongo-sanitize');
const cookieParser = require("cookie-parser");
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

const { errorHandler, notFound } = require("./middlewares/error.middleware");

const app = express();

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
    allowedHeaders: ['Content-Type', 'Authorization']
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


app.use((req, res, next) => {
    req.body = sanitize(req.body);
    req.params = sanitize(req.params);
    req.query = sanitize(req.query);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ─── Static Files
app.use("/uploads", express.static("uploads"));

/*app.get("/api/auth/google/callback", (req, res) => {
    res.json({ code: req.query.code });
});*/ 

app.use(notFound);
app.use(errorHandler);

module.exports = app;