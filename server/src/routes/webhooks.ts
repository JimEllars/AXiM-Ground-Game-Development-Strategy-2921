import express from 'express';
import { handleEmailItWebhook, handleDeskeraIngestWebhook } from '../controllers/webhooksController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/emailit', authenticateToken, requireRole(['ADMIN', 'ORG_ADMIN']), handleEmailItWebhook);
router.post('/deskera-ingest', authenticateToken, requireRole(['ADMIN', 'ORG_ADMIN']), handleDeskeraIngestWebhook);

export default router;
