import express from 'express';
import { uploadLeads, uploadMiddleware, getLeads } from '../controllers/leadsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload', authenticateToken, requireRole(['ADMIN', 'MANAGER']), uploadMiddleware, uploadLeads);
router.get('/', authenticateToken, getLeads);

export default router;