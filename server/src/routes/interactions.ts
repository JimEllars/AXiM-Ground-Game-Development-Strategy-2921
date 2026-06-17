import express from 'express';
import rateLimit from 'express-rate-limit';
import { createInteractions, getInteractions } from '../controllers/interactionsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 sync requests per windowMs
  message: { error: 'Too many synchronization attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});


router.post('/', syncLimiter, authenticateToken, createInteractions);
router.get('/', authenticateToken, getInteractions);

export default router;