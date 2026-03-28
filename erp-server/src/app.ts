import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import salesRoutes from './routes/sales';
import inventoryRoutes from './routes/inventory';
import productionRoutes from './routes/production';
import maintenanceRoutes from './routes/maintenance';
import dispatchRoutes from './routes/dispatch';
import hrRoutes from './routes/hr';
import settingsRoutes from './routes/settings';
import financeRoutes from './routes/finance';
import analyticsRoutes from './routes/analytics';
import purchaseRoutes from './routes/purchase';
import aiRoutes from './routes/ai';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
    }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

// Attach Socket.io to Request
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// Socket.io Events
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('ERP Server is Running');
});

app.use(errorHandler);

export { app, httpServer, io };
