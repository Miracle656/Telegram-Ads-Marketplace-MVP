import dotenv from 'dotenv';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import channelRoutes from './routes/channels.routes';
import campaignRoutes from './routes/campaigns.routes';
import dealRoutes from './routes/deals.routes';
import paymentRoutes from './routes/payments.routes';
import { initBot } from './bot';
import { startCronJobs } from './jobs';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://localhost:5173',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/channels', channelRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Initialize Telegram Bot
    try {
        await initBot();
        console.log('✅ Telegram Bot initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Telegram Bot:', error);
    }

    // Start cron jobs
    if (process.env.ENABLE_CRON_JOBS === 'true') {
        startCronJobs();
        console.log('✅ Cron jobs started');
    }
});

export default app;
