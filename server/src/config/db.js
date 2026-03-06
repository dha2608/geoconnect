import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Disable buffering — queries fail immediately if MongoDB is unreachable
    // instead of hanging forever waiting for a connection
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast if server unreachable
      socketTimeoutMS: 45000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
