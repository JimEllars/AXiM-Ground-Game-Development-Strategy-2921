import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentsController.js';

const router = Router();

// Require authentication for all appointment routes
router.use(authenticateToken);

router.get('/', getAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

export default router;
