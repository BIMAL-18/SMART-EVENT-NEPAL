// import { Router } from 'express';
// import { z } from 'zod';
// import { validateBody } from '../middleware/validate.js';
// import { requireAuth } from '../middleware/auth.js';
// import * as ctrl from '../controllers/paymentController.js';

// const router = Router();
// router.post('/initiate', requireAuth, validateBody(z.object({ registrationId: z.string(), provider: z.enum(['esewa', 'khalti', 'mock']).optional() })), ctrl.initiatePayment);
// router.post('/demo/simulate', requireAuth, validateBody(z.object({ providerRef: z.string() })), ctrl.simulateDemoPayment);
// router.post('/verify', requireAuth, validateBody(z.object({ paymentId: z.string() })), ctrl.verifyPayment);
// router.get('/mine', requireAuth, ctrl.myPayments);

// export default router;
import { Router } from 'express';

import { z } from 'zod';

import { validateBody } from '../middleware/validate.js';

import { requireAuth } from '../middleware/auth.js';

import * as ctrl from '../controllers/paymentController.js';

const router = Router();

/**
 * Initiate payment
 *
 * Supported providers:
 * - esewa
 * - khalti
 * - mock
 */
router.post(
  '/initiate',
  requireAuth,
  validateBody(
    z.object({
      registrationId: z.string(),

      provider: z
        .enum(['esewa', 'khalti', 'mock'])
        .optional(),
    })
  ),
  ctrl.initiatePayment
);


/**
 * eSewa success callback
 *
 * IMPORTANT:
 * Do NOT use requireAuth here.
 *
 * eSewa redirects the user's browser to this endpoint
 * after successful payment.
 */
router.get(
  '/esewa/success',
  ctrl.esewaSuccess
);


/**
 * eSewa failure/cancel callback
 *
 * IMPORTANT:
 * Do NOT use requireAuth here.
 */
router.get(
  '/esewa/failure',
  ctrl.esewaFailure
);


/**
 * Demo payment endpoint
 *
 * Only intended for mock payment testing.
 */
router.post(
  '/demo/simulate',
  requireAuth,
  validateBody(
    z.object({
      providerRef: z.string(),
    })
  ),
  ctrl.simulateDemoPayment
);


/**
 * Manual/server-side payment verification.
 *
 * The controller performs provider verification
 * before marking the payment as PAID.
 */
router.post(
  '/verify',
  requireAuth,
  validateBody(
    z.object({
      paymentId: z.string(),
    })
  ),
  ctrl.verifyPayment
);


/**
 * Current user's payment history.
 */
router.get(
  '/mine',
  requireAuth,
  ctrl.myPayments
);

export default router;