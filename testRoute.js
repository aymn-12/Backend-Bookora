const mongoose = require("mongoose");
require("dotenv").config();
const { updateReadingProgress, getReadingProgress } = require("./src/controllers/book.controller");
const User = require("./src/models/user.models");
const Book = require("./src/models/book.models");

(async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("Connected to DB.");

        // Find a random user
        const user = await User.findOne();
        if(!user) throw new Error("No user found");
        console.log("Got user:", user._id);

        // Find a random book
        const book = await Book.findOne();
        if(!book) throw new Error("No book found");
        console.log("Got book:", book._id);

        // Mock req and res
        const req = {
            params: { id: book._id.toString() },
            user: user,
            body: { currentPage: 2, bookmarks: [1] }
        };

        let responseCode = null;
        const res = {
            status: (code) => {
                responseCode = code;
                return res;
            },
            json: (data) => {
                console.log(`[Response ${responseCode}]`, data);
            }
        };

        console.log("--- Calling getReadingProgress ---");
        await getReadingProgress(req, res);

        console.log("--- Calling updateReadingProgress ---");
        await updateReadingProgress(req, res);

        console.log("Done.");
        process.exit(0);
    } catch(err) {
        console.error("SCRIPT ERROR:", err);
        process.exit(1);
    }
})();
