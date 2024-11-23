const mongoose = require("mongoose");

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    //To avoid warnings
  }); //Returns a promise

  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

module.exports = connectDB;
