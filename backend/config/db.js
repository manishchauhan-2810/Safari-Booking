import mongoose from "mongoose";

const connectDB = async () => {
  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[db] reconnected"));
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 50, // plenty for 500-1000 concurrent users on one server
      minPoolSize: 5,
      socketTimeoutMS: 45000,
    });
    console.log("db connected");
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;