require('dotenv').config();
const mongoose = require('mongoose');

exports.connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.DATABASE_URL, {
      maxPoolSize: 10,          // Safe for 512MB RAM — each connection ~2-5MB
      minPoolSize: 2,           // Keep 2 connections warm
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    });
    console.log('✅ Connected to Database');
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1); 
  }
};