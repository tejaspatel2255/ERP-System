import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
const nativeRequire = createRequire(import.meta.url);
import db from './models/db.js';

const require = (id) => {
  if (id === './models/db' || id === './models/db.js') {
    return db;
  }
  return nativeRequire(id);
};

// Startup Environment Variable Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPABASE_URL',
  'CLIENT_URL'
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
}

if (missingEnvVars.length > 0) {
  console.error('❌ FATAL: Missing required environment variables:');
  missingEnvVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error('Please configure these variables in your environment or .env file before starting the application.');
  process.exit(1);
}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Import central error handler
import { errorHandler } from './middleware/errorHandler.js';

// Import all routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import qaRoutes from './routes/qaRoutes.js';
import qcRoutes from './routes/qcRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import designRoutes from './routes/designRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const app = express();

// Set security HTTP headers with Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }
  })
);

// Enable CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));

// HTTP request logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parse incoming JSON, URL-encoded requests, and cookies
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', async (req, res) => {
  try {
    await require('./models/db').query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/design', designRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Base route for server status verification
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'ERP Backend API Server is running.' });
});

// Catch-all 404 Route Handler
app.use((req, res, next) => {
  const err = new Error('API Endpoint Not Found');
  err.name = 'NotFoundError';
  err.statusCode = 404;
  next(err);
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
