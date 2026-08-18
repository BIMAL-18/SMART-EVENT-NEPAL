import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/organizerController.js';

const router = Router();
router.get('/dashboard', requireAuth, requireRole('organizer', 'admin'), ctrl.organizerDashboard);
router.get('/events/:eventId/analytics', requireAuth, requireRole('organizer', 'admin'), ctrl.eventAnalytics);

export default router;
