import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/feedbackController.js';

const router = Router();
router.post('/', requireAuth, validateBody(z.object({
  registrationId: z.string(), eventRating: z.number().min(1).max(5), organizerRating: z.number().min(1).max(5), review: z.string().optional().default(''),
})), ctrl.submitFeedback);
router.get('/event/:eventId', ctrl.eventFeedback);

export default router;
