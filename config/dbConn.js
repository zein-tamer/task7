const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.DATABASE_URI)

    }catch(err){
        console.error(`❌ Error connecting to mongoDB: ${err.message}`)
        process.exit(1) 
    }
}

module.exports = connectDB;