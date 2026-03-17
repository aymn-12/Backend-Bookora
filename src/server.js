require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db')
const cleanExpiredOTPS = require("./utils/cleanExpiredOTPs.utils")
const PORT = process.env.PORT || 3000;

cleanExpiredOTPS()
connectDB()

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
