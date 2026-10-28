import mongoose from 'mongoose';
import { migrateExistingData } from './migrate.js';

export let isMongoConnected = false;

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Bind connection events to track state
mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('✅ Persistent Database Connection: Active (MongoDB Atlas / MongoDB)');
});

mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  console.error('❌ Persistent Database Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.warn('⚠️ Persistent Database Connection Disconnected.');
});

export const connectDB = async (retryCount = 0): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return;
  }

  let mongoUri = process.env.MONGODB_URI;

  // In development, if MONGODB_URI is not set or is still placeholder, default to local MongoDB
  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      mongoUri = 'mongodb://127.0.0.1:27017/test_booking';
      console.log('ℹ️ MONGODB_URI not specified. Using local MongoDB at mongodb://127.0.0.1:27017/test_booking');
    } else {
      isMongoConnected = false;
      const errMsg = '❌ CRITICAL: MONGODB_URI is not configured in Render Environment Variables! Data persistence requires a valid MongoDB connection string.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000, // 15 seconds to allow cloud connection negotiation
    });

    isMongoConnected = isDatabaseConnected();
    if (isMongoConnected) {
      console.log('✅ Connected to persistent database successfully.');
      // Automatically migrate and preserve any existing student records
      await migrateExistingData();
    }
  } catch (error: any) {
    isMongoConnected = false;
    console.error(`❌ Database connection failed: ${error.message}`);
    
    // Retry up to 2 times with a slight delay
    if (retryCount < 2) {
      console.log(`🔄 Retrying database connection in 2 seconds (attempt ${retryCount + 2}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return connectDB(retryCount + 1);
    }
    
    throw error;
  }
};
