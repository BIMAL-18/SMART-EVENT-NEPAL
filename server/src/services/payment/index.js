import { MockPaymentProvider } from './MockPaymentProvider.js';
import { EsewaProvider } from './EsewaProvider.js';
import { KhaltiProvider } from './KhaltiProvider.js';

const mock = new MockPaymentProvider();

export function getProvider(name) {
  if (name === 'esewa' && process.env.ESEWA_MERCHANT_ID && process.env.ESEWA_SECRET) return new EsewaProvider();
  if (name === 'khalti' && process.env.KHALTI_SECRET_KEY) return new KhaltiProvider();
  // Fall back to the demo provider whenever real credentials are missing,
  // regardless of what the client asked for - this is what keeps the app
  // runnable locally without secrets while being transparent about it.
  return mock;
}

export { mock as mockProvider };
