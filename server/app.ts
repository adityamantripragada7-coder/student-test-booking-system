import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import { connectDB, isDatabaseConnected } from './db.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import resultRoutes from './routes/resultRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & Standard Middleware
const frontendUrl = process.env.FRONTEND_URL || '*';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or matching allowed domains
      if (
        !origin ||
        frontendUrl === '*' ||
        origin === frontendUrl ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Middleware to ensure Persistent Database Connection per request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Pass health check directly without blocking
  if (req.path === '/api/health') {
    return next();
  }

  try {
    if (!isDatabaseConnected()) {
      await connectDB();
    }
    next();
  } catch (error: any) {
    console.error('Database connection error in request middleware:', error.message);
    
    // Write operations MUST fail if database is not connected - prevent false positives and ephemeral data loss
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Operation was not saved to prevent data loss. Please check MONGODB_URI settings.',
      });
    }

    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please check server logs and MONGODB_URI settings.',
    });
  }
});

// Health check endpoint with real database status
app.get('/api/health', (req: Request, res: Response) => {
  const connected = isDatabaseConnected();
  res.json({
    status: connected ? 'healthy' : 'database_disconnected',
    database: {
      connected,
      engine: connected
        ? process.env.MONGODB_URI?.includes('mongodb+srv')
          ? 'MongoDB Atlas'
          : 'MongoDB'
        : 'Disconnected',
      name: mongoose.connection.name || 'test_booking',
      host: mongoose.connection.host || 'unknown',
      readyState: mongoose.connection.readyState,
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/results', resultRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// Serve frontend static build if available (Production Full-Stack Deployment on Render)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
  });
});

export default app;
