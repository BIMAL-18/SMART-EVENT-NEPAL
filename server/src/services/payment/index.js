// import { MockPaymentProvider } from './MockPaymentProvider.js';
// import { EsewaProvider } from './EsewaProvider.js';
// import { KhaltiProvider } from './KhaltiProvider.js';

// const mock = new MockPaymentProvider();

// export function getProvider(name) {
//   if (name === 'esewa' && process.env.ESEWA_MERCHANT_ID && process.env.ESEWA_SECRET) return new EsewaProvider();
//   if (name === 'khalti' && process.env.KHALTI_SECRET_KEY) return new KhaltiProvider();
//   // Fall back to the demo provider whenever real credentials are missing,
//   // regardless of what the client asked for - this is what keeps the app
//   // runnable locally without secrets while being transparent about it.
//   return mock;
// }

// export { mock as mockProvider };
import { MockPaymentProvider } from './MockPaymentProvider.js';
import { EsewaProvider } from './EsewaProvider.js';
import { KhaltiProvider } from './KhaltiProvider.js';

const mock = new MockPaymentProvider();

/**
 * Returns the requested payment provider.
 *
 * IMPORTANT:
 * Real payment providers do NOT silently fall back
 * to the mock provider.
 *
 * If the user selects eSewa but eSewa credentials are
 * missing, we return a configuration error instead.
 */
export function getProvider(name = 'mock') {
  /**
   * Mock provider
   */
  if (name === 'mock') {
    return mock;
  }

  /**
   * eSewa provider
   */
  if (name === 'esewa') {
    if (
      !process.env.ESEWA_MERCHANT_ID ||
      !process.env.ESEWA_SECRET
    ) {
      throw Object.assign(
        new Error(
          'eSewa is not configured. Please set ESEWA_MERCHANT_ID and ESEWA_SECRET in .env'
        ),
        {
          status: 503,
          code: 'ESEWA_NOT_CONFIGURED',
        }
      );
    }

    return new EsewaProvider();
  }

  /**
   * Khalti provider
   */
  if (name === 'khalti') {
    if (!process.env.KHALTI_SECRET_KEY) {
      throw Object.assign(
        new Error(
          'Khalti is not configured. Please set KHALTI_SECRET_KEY in .env'
        ),
        {
          status: 503,
          code: 'KHALTI_NOT_CONFIGURED',
        }
      );
    }

    return new KhaltiProvider();
  }

  /**
   * Unknown provider
   */
  throw Object.assign(
    new Error(
      `Unsupported payment provider: ${name}`
    ),
    {
      status: 400,
      code: 'UNSUPPORTED_PAYMENT_PROVIDER',
    }
  );
}

export { mock as mockProvider };