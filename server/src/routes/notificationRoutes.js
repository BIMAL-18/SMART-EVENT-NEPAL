import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/notificationController.js';

const router = Router();
router.get('/', requireAuth, ctrl.myNotifications);
router.post('/:id/read', requireAuth, ctrl.markRead);
router.post('/read-all', requireAuth, ctrl.markAllRead);

export default router;
