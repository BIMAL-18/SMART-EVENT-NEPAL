// import Registration from '../models/Registration.js';
// import Payment from '../models/Payment.js';
// import Event from '../models/Event.js';
// import { getProvider, mockProvider } from '../services/payment/index.js';
// import { issueTicket } from './registrationController.js';
// import { notifyUser } from '../services/notificationService.js';

// export async function initiatePayment(req, res, next) {
//   try {
//     const { registrationId, provider = 'mock' } = req.body;
//     const registration = await Registration.findById(registrationId).populate('event');
//     if (!registration) return res.status(404).json({ message: 'Registration not found' });
//     if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });
//     if (registration.status !== 'PENDING_PAYMENT') return res.status(400).json({ message: 'This registration does not require payment' });

//     const paymentProvider = getProvider(provider);
//     const initResult = await paymentProvider.initiate({ amount: registration.totalAmount, registrationId: registration._id.toString() });

//     const payment = await Payment.create({
//       registration: registration._id,
//       user: req.user._id,
//       event: registration.event._id,
//       provider: paymentProvider.name,
//       amount: registration.totalAmount,
//       status: 'PENDING',
//       providerRef: initResult.providerRef,
//       rawResponse: initResult,
//     });

//     res.status(201).json({ payment, providerResult: initResult, usingDemoProvider: paymentProvider.name === 'mock' });
//   } catch (err) { next(err); }
// }

// // Demo-only endpoint: simulates the user completing payment on the mock
// // gateway's hosted page. Never exists for esewa/khalti - those are verified
// // via their real server-to-server APIs in verifyPayment below.
// export async function simulateDemoPayment(req, res, next) {
//   try {
//     const { providerRef } = req.body;
//     await mockProvider.simulateSuccess(providerRef);
//     res.json({ message: 'Demo payment marked as completed on the mock gateway. Call verify next.' });
//   } catch (err) { next(err); }
// }

// // The single source of truth for marking a payment PAID. Always re-verifies
// // with the provider server-side - a client can never flip status by itself.
// export async function verifyPayment(req, res, next) {
//   try {
//     const { paymentId } = req.body;
//     const payment = await Payment.findById(paymentId).populate('registration');
//     if (!payment) return res.status(404).json({ message: 'Payment not found' });
//     if (String(payment.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your payment' });

//     const provider = getProvider(payment.provider);
//     const verification = await provider.verify({ providerRef: payment.providerRef, amount: payment.amount });

//     if (!verification.verified) {
//       payment.status = 'FAILED';
//       await payment.save();
//       return res.status(400).json({ message: `Payment verification failed: ${verification.reason}`, payment });
//     }

//     payment.status = 'PAID';
//     payment.verifiedAt = new Date();
//     await payment.save();

//     const registration = await payment.registration.populate('event');
//     const event = await Event.findById(registration.event._id || registration.event);
//     await issueTicket(registration, event);

//     await notifyUser(req.user._id, {
//       type: 'PAYMENT_SUCCESS',
//       title: 'Payment successful',
//       message: `Your payment of NPR ${payment.amount} was confirmed.`,
//       event: event._id,
//     });

//     res.json({ payment, registration });
//   } catch (err) { next(err); }
// }

// export async function myPayments(req, res, next) {
//   try {
//     const payments = await Payment.find({ user: req.user._id }).populate('event', 'title').sort({ createdAt: -1 });
//     res.json({ payments });
//   } catch (err) { next(err); }
// }
import Registration from '../models/Registration.js';
import Payment from '../models/Payment.js';
import Event from '../models/Event.js';

import { getProvider, mockProvider } from '../services/payment/index.js';

import { issueTicket } from './registrationController.js';
import { notifyUser } from '../services/notificationService.js';

/**
 * Initiate payment
 *
 * Creates a PENDING payment record and returns
 * the provider-specific payment information.
 */
export async function initiatePayment(req, res, next) {
  try {
    const {
      registrationId,
      provider = 'mock',
    } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        message: 'registrationId is required',
      });
    }

    const registration = await Registration
      .findById(registrationId)
      .populate('event');

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    if (String(registration.user) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Not your registration',
      });
    }

    if (registration.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        message: 'This registration does not require payment',
      });
    }

    /**
     * Get requested payment provider.
     *
     * Example:
     * esewa
     * khalti
     * mock
     */
    const paymentProvider = getProvider(provider);

    /**
     * Initiate payment with provider.
     */
    const initResult = await paymentProvider.initiate({
      amount: registration.totalAmount,
      registrationId: registration._id.toString(),
    });

    /**
     * Create local payment record.
     */
    const payment = await Payment.create({
      registration: registration._id,
      user: req.user._id,
      event: registration.event._id,

      provider: paymentProvider.name,

      amount: registration.totalAmount,

      status: 'PENDING',

      providerRef: initResult.providerRef,

      rawResponse: initResult,
    });

    return res.status(201).json({
      payment,

      providerResult: initResult,

      usingDemoProvider:
        paymentProvider.name === 'mock',
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Demo-only endpoint.
 *
 * This endpoint is ONLY used for the mock payment provider.
 *
 * Never use this endpoint for eSewa or Khalti.
 */
export async function simulateDemoPayment(req, res, next) {
  try {
    const {
      providerRef,
    } = req.body;

    if (!providerRef) {
      return res.status(400).json({
        message: 'providerRef is required',
      });
    }

    await mockProvider.simulateSuccess(providerRef);

    return res.json({
      message:
        'Demo payment marked as completed on the mock gateway. Call verify next.',
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Verify payment.
 *
 * This is the main server-side payment verification function.
 *
 * IMPORTANT:
 * The frontend cannot directly mark a payment as PAID.
 * The provider must first confirm the transaction.
 */
export async function verifyPayment(req, res, next) {
  try {
    const {
      paymentId,
    } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        message: 'paymentId is required',
      });
    }

    const payment = await Payment
      .findById(paymentId)
      .populate('registration');

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found',
      });
    }

    if (String(payment.user) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Not your payment',
      });
    }

    /**
     * Prevent processing an already-paid payment again.
     */
    if (payment.status === 'PAID') {
      const registration = await Registration
        .findById(payment.registration._id || payment.registration)
        .populate('event');

      return res.json({
        message: 'Payment already verified.',
        payment,
        registration,
      });
    }

    /**
     * Get provider.
     */
    const provider = getProvider(payment.provider);

    /**
     * Server-to-server verification.
     */
    const verification = await provider.verify({
      providerRef: payment.providerRef,
      amount: payment.amount,
    });

    /**
     * Different providers may use different property names.
     *
     * eSewa provider:
     * verification.success
     *
     * Older/mock provider:
     * verification.verified
     */
    const verified =
      verification?.verified === true ||
      verification?.success === true;

    if (!verified) {
      payment.status = 'FAILED';

      payment.rawResponse = {
        ...(payment.rawResponse || {}),
        verification,
      };

      await payment.save();

      return res.status(400).json({
        message:
          `Payment verification failed: ${
            verification?.reason ||
            verification?.status ||
            'Transaction was not completed'
          }`,

        payment,
      });
    }

    /**
     * Payment successfully verified.
     */
    payment.status = 'PAID';

    payment.verifiedAt = new Date();

    payment.rawResponse = {
      ...(payment.rawResponse || {}),
      verification,
    };

    /**
     * Save provider reference if eSewa/Khalti
     * returned another reference ID.
     */
    if (verification.referenceId) {
      payment.providerRef =
        verification.referenceId;
    }

    await payment.save();

    /**
     * Get registration + event.
     */
    const registration = await Registration
      .findById(
        payment.registration._id ||
        payment.registration
      )
      .populate('event');

    if (!registration) {
      return res.status(404).json({
        message:
          'Registration associated with payment was not found.',
      });
    }

    const event = await Event.findById(
      registration.event._id ||
      registration.event
    );

    if (!event) {
      return res.status(404).json({
        message:
          'Event associated with registration was not found.',
      });
    }

    /**
     * Issue ticket.
     */
    await issueTicket(
      registration,
      event
    );

    /**
     * Notify user.
     */
    await notifyUser(req.user._id, {
      type: 'PAYMENT_SUCCESS',

      title: 'Payment successful',

      message:
        `Your payment of NPR ${payment.amount} was confirmed.`,

      event: event._id,
    });

    return res.json({
      message: 'Payment verified successfully.',

      payment,

      registration,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * eSewa success callback.
 *
 * eSewa redirects the customer here after payment.
 *
 * eSewa v2 returns an encoded response in:
 *
 * req.query.data
 */
export async function esewaSuccess(req, res, next) {
  try {
    const encodedData = req.query.data;

    if (!encodedData) {
      return res.status(400).json({
        message: 'eSewa response data is missing.',
      });
    }

    /**
     * Decode Base64 response from eSewa.
     */
    let decoded;

    try {
      decoded = Buffer
        .from(encodedData, 'base64')
        .toString('utf8');
    } catch (error) {
      return res.status(400).json({
        message: 'Invalid eSewa response data.',
      });
    }

    let esewaData;

    try {
      esewaData = JSON.parse(decoded);
    } catch (error) {
      return res.status(400).json({
        message:
          'Unable to parse eSewa payment response.',
      });
    }

    /**
     * Expected eSewa data contains:
     *
     * transaction_code
     * status
     * total_amount
     * transaction_uuid
     * product_code
     * signed_field_names
     * signature
     */
    const transactionUuid =
      esewaData.transaction_uuid;

    if (!transactionUuid) {
      return res.status(400).json({
        message:
          'eSewa transaction UUID is missing.',
      });
    }

    /**
     * Find our local payment using the
     * transaction UUID created during initiation.
     */
    const payment = await Payment.findOne({
      provider: 'esewa',
      providerRef: transactionUuid,
    });

    if (!payment) {
      return res.status(404).json({
        message:
          'eSewa payment record not found.',
        transactionUuid,
      });
    }

    /**
     * Get eSewa provider.
     */
    const provider = getProvider('esewa');

    /**
     * IMPORTANT:
     *
     * Do NOT trust only the browser callback.
     *
     * Verify the transaction directly with eSewa.
     */
    const verification = await provider.verify({
      providerRef: transactionUuid,
      amount: payment.amount,
    });

    const verified =
      verification?.verified === true ||
      verification?.success === true;

    if (!verified) {
      payment.status = 'FAILED';

      payment.rawResponse = {
        ...(payment.rawResponse || {}),
        esewaResponse: esewaData,
        verification,
      };

      await payment.save();

      const clientUrl =
        process.env.CLIENT_URL ||
        'http://localhost:5173';

      return res.redirect(
        `${clientUrl}/payment/callback?provider=esewa&status=failed&paymentId=${payment._id}`
      );
    }

    /**
     * Mark payment as PAID.
     */
    payment.status = 'PAID';

    payment.verifiedAt = new Date();

    payment.rawResponse = {
      ...(payment.rawResponse || {}),
      esewaResponse: esewaData,
      verification,
    };

    await payment.save();

    /**
     * Load registration.
     */
    const registration = await Registration
      .findById(payment.registration)
      .populate('event');

    if (!registration) {
      return res.status(404).json({
        message:
          'Registration associated with payment was not found.',
      });
    }

    /**
     * Load event.
     */
    const event = await Event.findById(
      registration.event._id ||
      registration.event
    );

    if (!event) {
      return res.status(404).json({
        message:
          'Event associated with payment was not found.',
      });
    }

    /**
     * Issue ticket.
     */
    await issueTicket(
      registration,
      event
    );

    /**
     * Notify user.
     */
    await notifyUser(payment.user, {
      type: 'PAYMENT_SUCCESS',

      title: 'Payment successful',

      message:
        `Your payment of NPR ${payment.amount} was confirmed.`,

      event: event._id,
    });

    /**
     * Redirect customer back to React.
     */
    const clientUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173';

    return res.redirect(
      `${clientUrl}/payment/callback?provider=esewa&status=success&paymentId=${payment._id}`
    );
  } catch (err) {
    next(err);
  }
}


/**
 * eSewa failure callback.
 */
export async function esewaFailure(req, res, next) {
  try {
    const encodedData = req.query.data;

    let esewaData = null;

    /**
     * Try to decode eSewa failure response.
     */
    if (encodedData) {
      try {
        const decoded = Buffer
          .from(encodedData, 'base64')
          .toString('utf8');

        esewaData = JSON.parse(decoded);
      } catch (error) {
        console.warn(
          'Unable to decode eSewa failure response:',
          error.message
        );
      }
    }

    /**
     * Extract transaction UUID.
     */
    const transactionUuid =
      esewaData?.transaction_uuid ||
      req.query.transaction_uuid;

    /**
     * If we have the transaction UUID,
     * mark the corresponding payment as failed.
     */
    if (transactionUuid) {
      const payment = await Payment.findOne({
        provider: 'esewa',
        providerRef: transactionUuid,
      });

      if (payment && payment.status !== 'PAID') {
        payment.status = 'FAILED';

        payment.rawResponse = {
          ...(payment.rawResponse || {}),
          esewaResponse: esewaData,
        };

        await payment.save();
      }
    }

    /**
     * Redirect to frontend.
     */
    const clientUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173';

    const paymentId = transactionUuid
      ? (
          await Payment.findOne({
            provider: 'esewa',
            providerRef: transactionUuid,
          })
        )?._id
      : null;

    const query = new URLSearchParams({
      provider: 'esewa',
      status: 'failed',
    });

    if (paymentId) {
      query.set(
        'paymentId',
        paymentId.toString()
      );
    }

    return res.redirect(
      `${clientUrl}/payment/callback?${query.toString()}`
    );
  } catch (err) {
    next(err);
  }
}


/**
 * Get current user's payment history.
 */
export async function myPayments(req, res, next) {
  try {
    const payments = await Payment
      .find({
        user: req.user._id,
      })
      .populate('event', 'title')
      .sort({
        createdAt: -1,
      });

    return res.json({
      payments,
    });
  } catch (err) {
    next(err);
  }
}