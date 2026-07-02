import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { getSurveys, createSurvey } from '../controllers/surveysController.js';
import { setEdgeCache, bypassEdgeCache } from '../middleware/cache.js';

const router = express.Router();

router.get('/', setEdgeCache, authenticateToken, getSettings);
router.put('/', bypassEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), updateSettings);

router.get('/surveys', setEdgeCache, authenticateToken, getSurveys);
router.post('/surveys', bypassEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), createSurvey);

export default router;
