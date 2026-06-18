import express from 'express';
import { getAnalytics, getPerformanceMetrics, reportTelemetry } from '../controllers/analyticsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getAnalytics);
router.get('/performance', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getPerformanceMetrics);

export default router;
// Telemetry endpoint - available to any authenticated user
router.post('/telemetry', authenticateToken, reportTelemetry);
