import express from 'express';
import { bulkImportLeads, uploadMiddleware, getLeads, deleteLeads } from '../controllers/leadsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/bulk-import', authenticateToken, requireRole(['ADMIN', 'MANAGER']), uploadMiddleware, bulkImportLeads);
router.get('/', authenticateToken, getLeads);
router.post('/delete-many', authenticateToken, requireRole(['ADMIN', 'MANAGER']), deleteLeads);

export default router;