import express from 'express';
import { getTeams, createTeam, updateTeam, deleteTeam, assignUserToTeam } from '../controllers/teamsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Only Admins can manage teams and assign users globally
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getTeams);
router.post('/', createTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/assign', assignUserToTeam);

export default router;
