import { Router } from 'express';
import { getAllCalculations, createStartingNumber, addOperation } from '../controllers/calculationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public endpoint - get all calculation trees
router.get('/', getAllCalculations);

// Protected endpoints - require authentication
router.post('/', authMiddleware, createStartingNumber);
router.post('/:id/operations', authMiddleware, addOperation);

export default router;

