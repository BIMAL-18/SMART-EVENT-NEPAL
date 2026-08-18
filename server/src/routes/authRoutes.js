import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/authController.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['attendee', 'organizer']).optional(),
  city: z.string().optional().default(''),
  phone: z.string().optional().default(''),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), token: z.string().min(10), newPassword: z.string().min(6).max(72) });

router.post('/register', validateBody(registerSchema), ctrl.register);
router.post('/login', validateBody(loginSchema), ctrl.login);
router.post('/refresh', validateBody(refreshSchema), ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);
router.get('/me', requireAuth, ctrl.me);
router.put('/me', requireAuth, validateBody(z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  interests: z.array(z.string()).optional(),
  organizerProfile: z.object({ orgName: z.string().optional(), description: z.string().optional() }).optional(),
})), ctrl.updateProfile);
router.post('/forgot-password', validateBody(forgotSchema), ctrl.forgotPassword);
router.post('/reset-password', validateBody(resetSchema), ctrl.resetPassword);

export default router;
