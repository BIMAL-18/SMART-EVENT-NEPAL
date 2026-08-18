import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/categoryController.js';

const router = Router();
router.get('/', ctrl.listCategories);
router.post('/', requireAuth, requireRole('admin'), ctrl.createCategory);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteCategory);

export default router;
