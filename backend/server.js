import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import central error handler
import { errorHandler } from './middleware/errorHandler.js';

// Import all routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import salesRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchase.js';
import inventoryRoutes from './routes/inventory.js';
import productionRoutes from './routes/production.js';
import maintenanceRoutes from './routes/maintenance.js';
import qaRoutes from './routes/qa.js';
import qcRoutes from './routes/qc.js';
import dispatchRoutes from './routes/dispatch.js';
import hrRoutes from './routes/hr.js';
import designRoutes from './routes/design.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();

// Set security HTTP headers
app.use(helmet());

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

// Parse incoming JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/inventory', inventoryRoutes);
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
