import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getAllGuests,
  getGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
  getStats,
} from '../controllers/guestController';

const router = Router();

// Protected guests endpoints
router.get('/guests', authenticate, getAllGuests);
router.get('/guests/:id', authenticate, getGuestById);
router.post('/guests', authenticate, createGuest);
router.put('/guests/:id', authenticate, updateGuest);
router.delete('/guests/:id', authenticate, deleteGuest);

// Protected stats endpoint
router.get('/stats', authenticate, getStats);

export default router;
