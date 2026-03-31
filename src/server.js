require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db')
const cleanExpiredOTPS = require("./utils/cleanExpiredOTPs.utils")
const databaseHealthCheckJob = require("./utils/healthCheck.job")
const PORT = process.env.PORT || 3000;

cleanExpiredOTPS()
databaseHealthCheckJob()
connectDB()

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
