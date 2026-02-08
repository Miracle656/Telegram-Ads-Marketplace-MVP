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

// Add BigInt serialization support for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - MUST be before rate limiter
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - allow both production and development origins
const allowedOrigins = [
    'https://telegram-ads-marketplace.vercel.app',
    'https://localhost:5173',
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow all for now to debug, change to callback(new Error('Not allowed by CORS')) later
        }
    },
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

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
});

console.log('Starting application...');

// Start server
const server = app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);

    // Initialize Telegram Bot
    try {
        console.log('Initializing Telegram Bot...');
        // Don't await initBot to block the server startup callback if it hangs
        initBot().then(() => {
            console.log('✅ Telegram Bot initialized');
        }).catch((error) => {
            console.error('❌ Failed to initialize Telegram Bot:', error);
        });
    } catch (error) {
        console.error('❌ Failed to initiate Telegram Bot setup:', error);
    }

    // Start cron jobs
    if (process.env.ENABLE_CRON_JOBS === 'true') {
        try {
            startCronJobs();
            console.log('✅ Cron jobs started');
        } catch (error) {
            console.error('❌ Failed to start cron jobs:', error);
        }
    }
});

export default app;
