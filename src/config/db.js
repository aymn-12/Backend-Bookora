require('dotenv').config();
const mongoose = require('mongoose');

exports.connectDB = async () => {
    try{
        mongoose.set('strictQuery', true);
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to Database');
    }catch(error){
        console.log(`Error in : ${error}`);
    }
} 