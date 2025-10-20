import express from 'express';
import { createInteractions, getInteractions } from '../controllers/interactionsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, createInteractions);
router.get('/', authenticateToken, getInteractions);

export default router;