const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger.utils");
const helmet = require("helmet");
const sanitize = require('mongo-sanitize');
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const bookRoutes = require("./routes/book.routes");
const categoryRoutes = require("./routes/category.routes");
const reviewRoutes = require("./routes/review.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const seriesRoutes = require("./routes/series.routes");   // ← جديد
const searchRoutes = require("./routes/search.routes");

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Performance Monitoring & Security
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`⚠️ [PERF] ${req.method} ${req.url} took ${duration}ms`);
        }
    });
    next();
});

app.use(helmet());
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
app.use("/api/admin",      adminRoutes);
app.use("/api/auth",       authRoutes);
app.use("/api/books",      bookRoutes);
app.use("/api/books/:id/reviews", reviewRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users",      userRoutes);
app.use("/api/series",     seriesRoutes);  
app.use("/api/search", searchRoutes);

// ─── Static Files
app.use("/uploads", express.static("uploads"));

/*app.get("/api/auth/google/callback", (req, res) => {
    res.json({ code: req.query.code });
});*/ 
app.use(notFound);
app.use(errorHandler);

module.exports = app;