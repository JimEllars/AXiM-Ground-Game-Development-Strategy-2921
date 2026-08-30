import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getProfile, registerOrganization, refreshToken } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes' as any,
  standardHeaders: true,
  keyGenerator: (req: any) => (req.headers['cf-connecting-ip'] || req.ip) as string, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post('/register', authLimiter, register);
router.post('/register-org', authLimiter, registerOrganization);
router.post('/login', authLimiter, login);
router.get('/profile', authenticateToken, getProfile);
router.post('/refresh', authenticateToken, refreshToken);

export default router;