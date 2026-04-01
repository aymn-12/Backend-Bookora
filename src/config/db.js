require('dotenv').config();
const mongoose = require('mongoose');

exports.connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.DATABASE_URL, {
      serverSelectionTimeoutMS: 30000, // وقت كافي لـ cold start
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to Database');
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1); // أوقف الـ server — لا فائدة منه بدون DB
  }
};