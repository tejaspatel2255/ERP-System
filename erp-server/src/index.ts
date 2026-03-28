import { httpServer } from './app';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

// Database Connection
mongoose.connect(process.env.MONGODB_URI!)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const tryPort = (port: number) => {
    const server = httpServer.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            server.close();
            tryPort(port + 1);
        } else {
            console.error(err);
        }
    });
};

tryPort(Number(PORT));
