import mongoose from 'mongoose';
import { LocalStore } from './localStore.js';

export let isMongoConnected = false;

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('<username>')) {
    isMongoConnected = false;
    // Ensure local file store is initialized with demo data
    LocalStore.read();
    return;
  }

  if (isMongoConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const db = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    });
    isMongoConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB Atlas successfully');
  } catch (error) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB Atlas connection failed. Falling back to Local File Storage (data/db.json).');
    LocalStore.read();
  }
};
