import express from 'express';
import { 
  createTerritory, 
  getTerritories, 
  deleteTerritory,
  assignTerritory,
  getUserTerritories,
  getAvailableReps
} from '../controllers/territoriesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { setEdgeCache, bypassEdgeCache } from '../middleware/cache.js';

const router = express.Router();

router.post('/', bypassEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), createTerritory);
router.get('/', setEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), getTerritories);
router.delete('/:territoryId', bypassEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), deleteTerritory);
router.post('/:territoryId/assign', bypassEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), assignTerritory);
router.get('/available-reps', setEdgeCache, authenticateToken, requireRole(['ADMIN', 'MANAGER']), getAvailableReps);
router.get('/my-territories', setEdgeCache, authenticateToken, getUserTerritories);

export default router;