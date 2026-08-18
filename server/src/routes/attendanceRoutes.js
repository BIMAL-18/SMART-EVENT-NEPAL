import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/attendanceController.js';

const router = Router();
router.post('/check-in', requireAuth, requireRole('organizer', 'admin'), validateBody(z.object({ qrPayload: z.string(), eventId: z.string() })), ctrl.checkIn);
router.get('/event/:eventId/summary', requireAuth, requireRole('organizer', 'admin'), ctrl.eventAttendanceSummary);

export default router;
