require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const cleanExpiredOTPS = require("./utils/cleanExpiredOTPs.utils");
const databaseHealthCheckJob = require("./utils/healthCheck.job");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();           // ← ينتظر DB أولاً

  cleanExpiredOTPS();          // ← بعد DB جاهزة
  databaseHealthCheckJob();    // ← بعد DB جاهزة

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
