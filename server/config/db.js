import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora";
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't crash the whole server during early development if DB isn't up yet
    console.error("Server will keep running, but DB-backed routes will fail until MongoDB is reachable.");
  }
};

export default connectDB;
