import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/paymentController.js';

const router = Router();
router.post('/initiate', requireAuth, validateBody(z.object({ registrationId: z.string(), provider: z.enum(['esewa', 'khalti', 'mock']).optional() })), ctrl.initiatePayment);
router.post('/demo/simulate', requireAuth, validateBody(z.object({ providerRef: z.string() })), ctrl.simulateDemoPayment);
router.post('/verify', requireAuth, validateBody(z.object({ paymentId: z.string() })), ctrl.verifyPayment);
router.get('/mine', requireAuth, ctrl.myPayments);

export default router;
