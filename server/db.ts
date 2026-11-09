import mongoose from 'mongoose';
import { migrateExistingData } from './migrate.js';
import { seedSlokasIfEmpty } from './seedSlokas.js';

export let isMongoConnected = false;

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Bind connection events to track state and handle unexpected disconnects
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
  console.warn('⚠️ Persistent Database Connection Disconnected. Will attempt reconnection on next operation.');
});

mongoose.connection.on('reconnected', () => {
  isMongoConnected = true;
  console.log('🔄 Persistent Database Connection Reconnected.');
});

export const connectDB = async (retryCount = 0): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return;
  }

  // If currently connecting, wait for it
  if ((mongoose.connection.readyState as number) === 2) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if ((mongoose.connection.readyState as number) === 1) {
      isMongoConnected = true;
      return;
    }
  }

  let mongoUri = process.env.MONGODB_URI;

  // In development, if MONGODB_URI is not set or is still placeholder, default to local MongoDB
  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      mongoUri = 'mongodb://127.0.0.1:27017/test_booking';
      console.log('ℹ️ MONGODB_URI not specified. Using local MongoDB at mongodb://127.0.0.1:27017/test_booking');
    } else {
      isMongoConnected = false;
      const errMsg = '❌ CRITICAL: MONGODB_URI is not configured in Render Environment Variables! Data persistence requires a valid MongoDB Atlas connection string.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000, // 15 seconds to negotiate cloud Atlas connection
      socketTimeoutMS: 45000,
      maxPoolSize: 15,
      minPoolSize: 2,
    });

    isMongoConnected = isDatabaseConnected();
    if (isMongoConnected) {
      console.log('✅ Connected to persistent cloud database successfully.');
      // Automatically preserve, migrate, and protect student records
      await migrateExistingData();
      // Ensure educational Slokas and questions are pre-seeded
      await seedSlokasIfEmpty();
    }
  } catch (error: any) {
    isMongoConnected = false;
    console.error(`❌ Database connection failed (attempt ${retryCount + 1}): ${error.message}`);

    // Retry with exponential backoff (e.g., 2s, 4s, 8s) up to 3 retries
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount + 1) * 1000;
      console.log(`🔄 Retrying database connection in ${delay / 1000} seconds (attempt ${retryCount + 2}/4)...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    throw error;
  }
};
