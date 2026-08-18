import { PaymentProvider } from './PaymentProvider.js';

// Real eSewa integration skeleton. Activated automatically once
// ESEWA_MERCHANT_ID and ESEWA_SECRET are set in .env - see paymentFactory.js.
// Implements the eSewa v2 ePay signature flow shape; endpoints/signature
// verification should be finalised against eSewa's current merchant docs
// before going live, since sandbox specs change.
export class EsewaProvider extends PaymentProvider {
  get name() { return 'esewa'; }

  constructor() {
    super();
    this.merchantId = process.env.ESEWA_MERCHANT_ID;
    this.secret = process.env.ESEWA_SECRET;
  }

  async initiate({ amount, registrationId }) {
    const productCode = this.merchantId;
    const transactionUuid = `${registrationId}-${Date.now()}`;
    // eSewa expects an HMAC signature over specific fields - left as a
    // documented TODO for real credentials since we cannot sign without them.
    return {
      providerRef: transactionUuid,
      formAction: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
      formData: {
        amount, tax_amount: 0, total_amount: amount,
        transaction_uuid: transactionUuid, product_code: productCode,
        product_service_charge: 0, product_delivery_charge: 0,
        success_url: `${process.env.CLIENT_URL}/payment/callback?provider=esewa`,
        failure_url: `${process.env.CLIENT_URL}/payment/callback?provider=esewa&status=failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
      },
    };
  }

  async verify({ providerRef }) {
    // Real implementation calls eSewa's transaction status API with providerRef
    // and the merchant secret. Requires live credentials to test against.
    throw Object.assign(new Error('eSewa is not configured with live credentials on this server.'), { status: 503 });
  }
}
