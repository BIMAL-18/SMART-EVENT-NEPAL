import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/certificateController.js';

const router = Router();
router.post('/issue', requireAuth, validateBody(z.object({ registrationId: z.string() })), ctrl.issueCertificateIfEligible);
router.get('/mine', requireAuth, ctrl.myCertificates);
router.get('/verify/:code', ctrl.verifyCertificate);

export default router;
