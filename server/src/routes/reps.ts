import express from 'express';
import { getMyTurf, getRepStats, startShift, endShift, heartbeatShift } from '../controllers/repsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/turf', authenticateToken, requireRole(['REP']), getMyTurf);
router.get('/me/stats', authenticateToken, requireRole(['REP']), getRepStats);
router.post('/shift/start', authenticateToken, requireRole(['REP', 'TEAM_LEADER']), startShift);
router.post('/shift/end', authenticateToken, requireRole(['REP', 'TEAM_LEADER']), endShift);

router.post('/shift/heartbeat', authenticateToken, requireRole(['REP', 'TEAM_LEADER']), heartbeatShift);

export default router;
