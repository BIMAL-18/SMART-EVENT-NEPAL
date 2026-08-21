import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/users', ctrl.listUsers);
router.post('/users/:id/status', validateBody(z.object({ status: z.enum(['active', 'suspended']) })), ctrl.setUserStatus);
router.get('/events', ctrl.listAllEvents);
router.get('/registrations', ctrl.listAllRegistrations);
router.get('/payments', ctrl.listPayments);
router.get('/audit-logs', ctrl.listAuditLogs);
router.get('/analytics', ctrl.platformAnalytics);

export default router;
