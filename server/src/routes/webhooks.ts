import express from 'express';
import { handleEmailItWebhook, handleDeskeraIngestWebhook } from '../controllers/webhooksController.js';

const router = express.Router();

router.post('/emailit', handleEmailItWebhook);
router.post('/deskera-ingest', handleDeskeraIngestWebhook);

export default router;
