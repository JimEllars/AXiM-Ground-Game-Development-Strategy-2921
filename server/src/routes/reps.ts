import express from 'express';
import { getMyTurf, getRepStats } from '../controllers/repsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/turf', authenticateToken, requireRole(['REP']), getMyTurf);
router.get('/me/stats', authenticateToken, requireRole(['REP']), getRepStats);

export default router;