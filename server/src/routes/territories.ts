import express from 'express';
import { 
  createTerritory, 
  getTerritories, 
  deleteTerritory,
  assignTerritory,
  getUserTerritories,
  getAvailableReps,
  updateTerritory
} from '../controllers/territoriesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), createTerritory);
router.get('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getTerritories);
router.delete('/:territoryId', authenticateToken, requireRole(['ADMIN', 'MANAGER']), deleteTerritory);
router.post('/:territoryId/assign', authenticateToken, requireRole(['ADMIN', 'MANAGER']), assignTerritory);
router.get('/available-reps', authenticateToken, requireRole(['ADMIN', 'MANAGER']), getAvailableReps);
router.get('/my-territories', authenticateToken, getUserTerritories);
router.put('/:territoryId', authenticateToken, requireRole(['ADMIN', 'MANAGER']), updateTerritory);

export default router;