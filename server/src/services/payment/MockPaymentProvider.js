import { PaymentProvider } from './PaymentProvider.js';
import { v4 as uuid } from 'uuid';

// Local, in-memory ledger simulating a payment gateway so the demo works
// with zero external credentials. Clearly a DEMO provider - never presented
// to the user as a real eSewa/Khalti transaction.
const ledger = new Map();

export class MockPaymentProvider extends PaymentProvider {
  get name() { return 'mock'; }

  async initiate({ amount, registrationId }) {
    const providerRef = `MOCK-${uuid()}`;
    ledger.set(providerRef, { amount, registrationId, status: 'PENDING' });
    return { providerRef, redirectUrl: null, demo: true };
  }

  // In the demo flow, the client calls /confirm with providerRef after the
  // user clicks "Pay (Demo)" - this simulates the gateway marking it paid.
  async simulateSuccess(providerRef) {
    const entry = ledger.get(providerRef);
    if (!entry) throw new Error('Unknown demo transaction');
    entry.status = 'PAID';
    return entry;
  }

  async verify({ providerRef, amount }) {
    const entry = ledger.get(providerRef);
    if (!entry) return { verified: false, reason: 'Unknown transaction reference' };
    if (entry.status !== 'PAID') return { verified: false, reason: 'Transaction not completed' };
    if (Number(entry.amount) !== Number(amount)) return { verified: false, reason: 'Amount mismatch' };
    return { verified: true, providerRef };
  }
}
