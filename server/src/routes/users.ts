import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, getUserStats } from '../controllers/usersController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['ADMIN']), getUsers);
router.post('/', authenticateToken, requireRole(['ADMIN']), createUser);
router.put('/:userId', authenticateToken, requireRole(['ADMIN']), updateUser);
router.delete('/:userId', authenticateToken, requireRole(['ADMIN']), deleteUser);
router.get('/stats', authenticateToken, requireRole(['ADMIN']), getUserStats);

export default router;