// import { PaymentProvider } from './PaymentProvider.js';

// // Real eSewa integration skeleton. Activated automatically once
// // ESEWA_MERCHANT_ID and ESEWA_SECRET are set in .env - see paymentFactory.js.
// // Implements the eSewa v2 ePay signature flow shape; endpoints/signature
// // verification should be finalised against eSewa's current merchant docs
// // before going live, since sandbox specs change.
// export class EsewaProvider extends PaymentProvider {
//   get name() { return 'esewa'; }

//   constructor() {
//     super();
//     this.merchantId = process.env.ESEWA_MERCHANT_ID;
//     this.secret = process.env.ESEWA_SECRET;
//   }

//   async initiate({ amount, registrationId }) {
//     const productCode = this.merchantId;
//     const transactionUuid = `${registrationId}-${Date.now()}`;
//     // eSewa expects an HMAC signature over specific fields - left as a
//     // documented TODO for real credentials since we cannot sign without them.
//     return {
//       providerRef: transactionUuid,
//       formAction: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
//       formData: {
//         amount, tax_amount: 0, total_amount: amount,
//         transaction_uuid: transactionUuid, product_code: productCode,
//         product_service_charge: 0, product_delivery_charge: 0,
//         success_url: `${process.env.CLIENT_URL}/payment/callback?provider=esewa`,
//         failure_url: `${process.env.CLIENT_URL}/payment/callback?provider=esewa&status=failed`,
//         signed_field_names: 'total_amount,transaction_uuid,product_code',
//       },
//     };
//   }

//   async verify({ providerRef }) {
//     // Real implementation calls eSewa's transaction status API with providerRef
//     // and the merchant secret. Requires live credentials to test against.
//     throw Object.assign(new Error('eSewa is not configured with live credentials on this server.'), { status: 503 });
//   }
// }
import crypto from 'crypto';
import axios from 'axios';
import { PaymentProvider } from './PaymentProvider.js';

export class EsewaProvider extends PaymentProvider {
  get name() {
    return 'esewa';
  }

  constructor() {
    super();

    this.merchantId = process.env.ESEWA_MERCHANT_ID;
    this.secret = process.env.ESEWA_SECRET;

    this.formAction =
      process.env.ESEWA_FORM_URL ||
      'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

    this.statusUrl =
      process.env.ESEWA_STATUS_URL ||
      'https://uat.esewa.com.np/api/epay/transaction/status/';

    if (!this.merchantId || !this.secret) {
      console.warn(
        'eSewa credentials are not configured.'
      );
    }
  }

  /**
   * Generate eSewa HMAC-SHA256 signature.
   *
   * Signed fields:
   * total_amount,transaction_uuid,product_code
   */
  generateSignature(
    totalAmount,
    transactionUuid,
    productCode
  ) {
    const message =
      `total_amount=${totalAmount},` +
      `transaction_uuid=${transactionUuid},` +
      `product_code=${productCode}`;

    return crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('base64');
  }

  /**
   * Initiate eSewa payment.
   */
  async initiate({
    amount,
    registrationId,
  }) {
    if (!this.merchantId || !this.secret) {
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

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      throw Object.assign(
        new Error('Invalid payment amount.'),
        {
          status: 400,
        }
      );
    }

    /**
     * Create unique eSewa transaction UUID.
     */
    const transactionUuid =
      `${registrationId}-${Date.now()}`
        .replace(/[^a-zA-Z0-9-]/g, '');

    const totalAmount =
      numericAmount.toFixed(2);

    const productCode =
      this.merchantId;

    /**
     * Generate required signature.
     */
    const signature =
      this.generateSignature(
        totalAmount,
        transactionUuid,
        productCode
      );

    const serverUrl =
      process.env.SERVER_URL ||
      'http://localhost:5000';

    return {
      providerRef: transactionUuid,

      formAction: this.formAction,

      formData: {
        amount: totalAmount,

        tax_amount: '0',

        total_amount: totalAmount,

        transaction_uuid:
          transactionUuid,

        product_code:
          productCode,

        product_service_charge: '0',

        product_delivery_charge: '0',

        success_url:
          `${serverUrl}/api/payments/esewa/success`,

        failure_url:
          `${serverUrl}/api/payments/esewa/failure`,

        signed_field_names:
          'total_amount,transaction_uuid,product_code',

        signature,
      },
    };
  }

  /**
   * Verify eSewa transaction.
   *
   * This performs server-to-server verification.
   */
  async verify({
    providerRef,
    amount,
  }) {
    if (!this.merchantId || !this.secret) {
      throw Object.assign(
        new Error(
          'eSewa is not configured.'
        ),
        {
          status: 503,
          code: 'ESEWA_NOT_CONFIGURED',
        }
      );
    }

    if (!providerRef) {
      throw Object.assign(
        new Error(
          'Missing eSewa transaction UUID.'
        ),
        {
          status: 400,
        }
      );
    }

    const numericAmount =
      Number(amount);

    if (!Number.isFinite(numericAmount)) {
      throw Object.assign(
        new Error(
          'Invalid payment amount.'
        ),
        {
          status: 400,
        }
      );
    }

    try {
      const response =
        await axios.get(
          this.statusUrl,
          {
            params: {
              product_code:
                this.merchantId,

              total_amount:
                numericAmount,

              transaction_uuid:
                providerRef,
            },

            timeout: 15000,
          }
        );

      const data =
        response.data;

      const status =
        data?.status;

      return {
        success:
          status === 'COMPLETE',

        verified:
          status === 'COMPLETE',

        status,

        providerRef,

        referenceId:
          data?.ref_id ||
          data?.refId ||
          null,

        transactionCode:
          data?.transaction_code ||
          null,

        amount:
          data?.total_amount ??
          data?.totalAmount ??
          numericAmount,

        raw: data,
      };
    } catch (error) {
      console.error(
        'eSewa verification error:',
        error.response?.data ||
          error.message
      );

      throw Object.assign(
        new Error(
          'Unable to verify eSewa payment.'
        ),
        {
          status: 502,
          code: 'ESEWA_VERIFICATION_FAILED',
          cause: error,
        }
      );
    }
  }
}