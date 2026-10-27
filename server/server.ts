import app from './app.js';
import dotenv from 'dotenv';
import { connectDB } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Student Test Booking Server running on port ${PORT}`);
    console.log(`🩺 Health check available at /api/health`);
  });
}).catch((err) => {
  console.error('Failed to start server due to database connection error:', err);
});
