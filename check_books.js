require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./src/models/book.models');

const checkBooks = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        const sampleBooks = await Book.find({}).limit(5).select('title cover coverImage driveCoverId');
        console.log(JSON.stringify(sampleBooks, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkBooks();
