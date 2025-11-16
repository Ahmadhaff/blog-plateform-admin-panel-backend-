import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/database.js';
import { seedAdmin } from './src/utils/seedAdmin.js';

import authRoutes from './src/routes/auth.routes.js';
import articleRoutes from './src/routes/article.routes.js';
import userRoutes from './src/routes/user.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB().then(async () => {
  // Seed admin account after DB connection
  await seedAdmin();
});

// Middleware
const allowedOrigins = [
  'http://localhost:4200',  // Main frontend
  'http://localhost:4201',  // Admin panel frontend
  'http://localhost:3000',
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log(`❌ CORS: Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'admin-panel-server',
    timestamp: new Date()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Admin Panel Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
});

