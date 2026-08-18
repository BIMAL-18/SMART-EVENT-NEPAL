import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_event_nepal';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log('[db] MongoDB connected:', uri);
  } catch (err) {
    isConnected = false;
    console.error('[db] MongoDB connection failed. The API will keep running, but any endpoint that touches the database will return 503 until MongoDB is reachable.');
    console.error('[db] Reason:', err.message);
    // Retry in background instead of crashing the process
    setTimeout(() => connectDB(), 8000);
  }
}

export function dbIsConnected() {
  return mongoose.connection.readyState === 1;
}
