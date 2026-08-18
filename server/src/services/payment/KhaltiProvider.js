import { PaymentProvider } from './PaymentProvider.js';

// Real Khalti integration skeleton (activated once KHALTI_SECRET_KEY is set).
export class KhaltiProvider extends PaymentProvider {
  get name() { return 'khalti'; }

  constructor() {
    super();
    this.secretKey = process.env.KHALTI_SECRET_KEY;
  }

  async initiate({ amount, registrationId }) {
    // Real implementation POSTs to Khalti's /epayment/initiate/ with the
    // secret key in the Authorization header and returns their payment_url.
    return {
      providerRef: `khalti-${registrationId}-${Date.now()}`,
      redirectUrl: null,
      note: 'Khalti initiate requires a live secret key + server-to-server call to Khalti.',
    };
  }

  async verify({ providerRef }) {
    throw Object.assign(new Error('Khalti is not configured with live credentials on this server.'), { status: 503 });
  }
}
