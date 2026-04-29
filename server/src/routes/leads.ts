import express from 'express';
import { bulkImportLeads, uploadMiddleware, getLeads, deleteLeads, updateLead, getImportJobStatus, getLeadInsights } from '../controllers/leadsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/bulk-import', authenticateToken, requireRole(['ADMIN', 'MANAGER']), uploadMiddleware, bulkImportLeads);
router.get('/upload/:jobId', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getImportJobStatus);
router.get('/', authenticateToken, getLeads);
router.get('/:id/insights', authenticateToken, getLeadInsights);
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER', 'REP']), updateLead);
router.post('/delete-many', authenticateToken, requireRole(['ADMIN', 'MANAGER']), deleteLeads);

export default router;