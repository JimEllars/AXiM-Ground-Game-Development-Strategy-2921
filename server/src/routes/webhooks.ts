import express from 'express';
import { handleEmailItWebhook } from '../controllers/webhooksController.js';

const router = express.Router();

router.post('/emailit', handleEmailItWebhook);

export default router;
