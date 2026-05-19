import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { getSurveys, createSurvey } from '../controllers/surveysController.js';

const router = express.Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), updateSettings);

export default router;

router.get('/surveys', authenticateToken, getSurveys);
router.post('/surveys', authenticateToken, requireRole(['ADMIN', 'MANAGER']), createSurvey);
