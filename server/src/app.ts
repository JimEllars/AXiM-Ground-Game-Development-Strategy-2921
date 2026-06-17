import { traceMiddleware } from './middleware/trace.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import errorHandler from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import territoryRoutes from './routes/territories.js';
import leadRoutes from './routes/leads.js';
import repRoutes from './routes/reps.js';
import interactionRoutes from './routes/interactions.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import settingsRoutes from './routes/settings.js';
import appointmentRoutes from './routes/appointments.js';

const app = express();

// Middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: {
    action: 'deny'
  }
}));
app.use(traceMiddleware);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
// Increase payload limit for territory operations (GeoJSON can be large)
app.use('/api/territories', express.json({ limit: '5mb' }));
app.use('/api/territories', express.urlencoded({ extended: true, limit: '5mb' }));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/reps', repRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/appointments', appointmentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
