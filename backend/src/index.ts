import { httpServer } from './app';

const PORT = process.env.PORT || 5000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️ Warning: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are not set.');
}

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
