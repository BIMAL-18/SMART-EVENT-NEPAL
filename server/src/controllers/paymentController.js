import Registration from '../models/Registration.js';
import Payment from '../models/Payment.js';
import Event from '../models/Event.js';
import { getProvider, mockProvider } from '../services/payment/index.js';
import { issueTicket } from './registrationController.js';
import { notifyUser } from '../services/notificationService.js';

export async function initiatePayment(req, res, next) {
  try {
    const { registrationId, provider = 'mock' } = req.body;
    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });
    if (registration.status !== 'PENDING_PAYMENT') return res.status(400).json({ message: 'This registration does not require payment' });

    const paymentProvider = getProvider(provider);
    const initResult = await paymentProvider.initiate({ amount: registration.totalAmount, registrationId: registration._id.toString() });

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

    res.status(201).json({ payment, providerResult: initResult, usingDemoProvider: paymentProvider.name === 'mock' });
  } catch (err) { next(err); }
}

// Demo-only endpoint: simulates the user completing payment on the mock
// gateway's hosted page. Never exists for esewa/khalti - those are verified
// via their real server-to-server APIs in verifyPayment below.
export async function simulateDemoPayment(req, res, next) {
  try {
    const { providerRef } = req.body;
    await mockProvider.simulateSuccess(providerRef);
    res.json({ message: 'Demo payment marked as completed on the mock gateway. Call verify next.' });
  } catch (err) { next(err); }
}

// The single source of truth for marking a payment PAID. Always re-verifies
// with the provider server-side - a client can never flip status by itself.
export async function verifyPayment(req, res, next) {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId).populate('registration');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (String(payment.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your payment' });

    const provider = getProvider(payment.provider);
    const verification = await provider.verify({ providerRef: payment.providerRef, amount: payment.amount });

    if (!verification.verified) {
      payment.status = 'FAILED';
      await payment.save();
      return res.status(400).json({ message: `Payment verification failed: ${verification.reason}`, payment });
    }

    payment.status = 'PAID';
    payment.verifiedAt = new Date();
    await payment.save();

    const registration = await payment.registration.populate('event');
    const event = await Event.findById(registration.event._id || registration.event);
    await issueTicket(registration, event);

    await notifyUser(req.user._id, {
      type: 'PAYMENT_SUCCESS',
      title: 'Payment successful',
      message: `Your payment of NPR ${payment.amount} was confirmed.`,
      event: event._id,
    });

    res.json({ payment, registration });
  } catch (err) { next(err); }
}

export async function myPayments(req, res, next) {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('event', 'title').sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) { next(err); }
}
