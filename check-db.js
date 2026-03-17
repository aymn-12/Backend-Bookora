const mongoose = require("mongoose");
require("dotenv").config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        const Book = mongoose.model("Book", new mongoose.Schema({ title: String }));
        const count = await Book.countDocuments();
        console.log("Total books:", count);
        const latest = await Book.find().limit(5).select("title");
        console.log("Sample titles:", latest.map(b => b.title));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
