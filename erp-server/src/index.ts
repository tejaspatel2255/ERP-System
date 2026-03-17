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

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
    }
});

const PORT = process.env.PORT || 5000;

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

// Database Connection
mongoose.connect(process.env.MONGODB_URI!)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

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

const tryPort = (port: number) => {
    // Start HTTP Server (which wraps Express)
    const server = httpServer.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`Note: If frontend fails to connect, ensure NEXT_PUBLIC_API_URL points to this port.`);
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            server.close(); // Close before retrying
            tryPort(port + 1);
        } else {
            console.error(err);
        }
    });
};

tryPort(Number(process.env.PORT) || 5000);
