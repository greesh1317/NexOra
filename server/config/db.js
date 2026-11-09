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

// True while the database connection is healthy (Mongoose readyState 1 = connected)
export const dbIsUp = () => mongoose.connection.readyState === 1;

mongoose.connection.on("disconnected", () => console.error("MongoDB disconnected. Requests get a 503 until it reconnects."));
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected."));

// Used by the web server only: if MongoDB is not up yet, keep trying every few seconds instead of
// giving up. (After the first connection, the driver reconnects by itself if the database drops.)
export async function connectWithRetry(retryMs = 5000) {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora";
  for (;;) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB not reachable (${error.message}). Retrying in ${retryMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
  }
}

export default connectDB;
