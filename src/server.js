require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const cleanExpiredOTPS = require("./utils/cleanExpiredOTPs.utils");
const databaseHealthCheckJob = require("./utils/healthCheck.job");

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    // Start jobs only after database is connected
    cleanExpiredOTPS();
    databaseHealthCheckJob();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error(`❌ Fatal Error during startup: ${error}`);
    process.exit(1);
});
