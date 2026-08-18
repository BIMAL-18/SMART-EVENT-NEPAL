// Base interface every payment provider implements.
export class PaymentProvider {
  get name() { throw new Error('not implemented'); }
  // Returns { redirectUrl | formData, providerRef } to start a payment
  async initiate({ amount, registrationId }) { throw new Error('not implemented'); }
  // Verifies a callback/webhook or client-reported reference SERVER-SIDE.
  // Must never trust a bare "success" flag from the frontend.
  async verify({ providerRef, amount }) { throw new Error('not implemented'); }
}
