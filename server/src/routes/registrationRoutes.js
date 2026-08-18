import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/registrationController.js';

const router = Router();
const registerSchema = z.object({ eventId: z.string(), ticketTypeId: z.string(), quantity: z.number().min(1).max(10).optional() });

router.post('/', requireAuth, validateBody(registerSchema), ctrl.registerForEvent);
router.get('/mine', requireAuth, ctrl.myRegistrations);
router.get('/:id/ticket', requireAuth, ctrl.getTicket);
router.post('/:id/cancel', requireAuth, ctrl.cancelRegistration);
router.get('/event/:eventId', requireAuth, requireRole('organizer', 'admin'), ctrl.eventRegistrations);

export default router;
