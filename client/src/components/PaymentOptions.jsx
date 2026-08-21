import React, { useState } from 'react';
import { CreditCard, Wallet, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';

export default function PaymentOptions({
  registrationId,
  onSuccess,
}) {
  const [provider, setProvider] = useState('esewa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitEsewaForm = (formAction, formData) => {
    const form = document.createElement('form');

    form.method = 'POST';
    form.action = formAction;
    form.style.display = 'none';

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');

      input.type = 'hidden';
      input.name = key;
      input.value = value ?? '';

      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handlePayment = async () => {
    setError('');

    if (!registrationId) {
      setError('Registration ID is missing.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/payments/initiate', {
        registrationId,
        provider,
      });

      const data = response.data;
      const providerResult = data?.providerResult;

      if (!providerResult) {
        throw new Error(
          'Payment provider did not return payment information.'
        );
      }

      // eSewa
      if (provider === 'esewa') {
        if (
          !providerResult.formAction ||
          !providerResult.formData
        ) {
          throw new Error(
            'Invalid eSewa payment response.'
          );
        }

        submitEsewaForm(
          providerResult.formAction,
          providerResult.formData
        );

        return;
      }

      // Khalti
      if (provider === 'khalti') {
        const paymentUrl =
          providerResult.paymentUrl ||
          providerResult.payment_url ||
          providerResult.redirectUrl ||
          providerResult.redirect_url;

        if (!paymentUrl) {
          throw new Error(
            'Khalti payment URL was not returned.'
          );
        }

        window.location.href = paymentUrl;
        return;
      }

      // Mock payment
      if (provider === 'mock') {
        if (onSuccess) {
          onSuccess({
            payment: data.payment,
            providerResult,
          });
        }

        return;
      }
    } catch (err) {
      console.error('Payment initiation error:', err);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to initiate payment.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Choose Payment Method
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select your preferred payment provider.
        </p>
      </div>

      <div className="space-y-3">

        {/* eSewa */}
        <button
          type="button"
          onClick={() => setProvider('esewa')}
          className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
            provider === 'esewa'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Wallet className="h-5 w-5 text-green-600" />
          </div>

          <div className="flex-1">
            <div className="font-medium text-gray-900">
              eSewa
            </div>

            <div className="text-sm text-gray-500">
              Pay securely using eSewa
            </div>
          </div>

          <div
            className={`h-4 w-4 rounded-full border ${
              provider === 'esewa'
                ? 'border-green-600 bg-green-600'
                : 'border-gray-400'
            }`}
          />
        </button>

        {/* Khalti */}
        <button
          type="button"
          onClick={() => setProvider('khalti')}
          className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
            provider === 'khalti'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Wallet className="h-5 w-5 text-purple-600" />
          </div>

          <div className="flex-1">
            <div className="font-medium text-gray-900">
              Khalti
            </div>

            <div className="text-sm text-gray-500">
              Pay securely using Khalti
            </div>
          </div>

          <div
            className={`h-4 w-4 rounded-full border ${
              provider === 'khalti'
                ? 'border-purple-600 bg-purple-600'
                : 'border-gray-400'
            }`}
          />
        </button>

        {/* Mock */}
        <button
          type="button"
          onClick={() => setProvider('mock')}
          className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
            provider === 'mock'
              ? 'border-gray-500 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <CreditCard className="h-5 w-5 text-gray-600" />
          </div>

          <div className="flex-1">
            <div className="font-medium text-gray-900">
              Demo Payment
            </div>

            <div className="text-sm text-gray-500">
              Use mock payment for local testing
            </div>
          </div>

          <div
            className={`h-4 w-4 rounded-full border ${
              provider === 'mock'
                ? 'border-gray-600 bg-gray-600'
                : 'border-gray-400'
            }`}
          />
        </button>

      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            Continue with{' '}
            {provider === 'esewa'
              ? 'eSewa'
              : provider === 'khalti'
                ? 'Khalti'
                : 'Demo Payment'}
          </>
        )}
      </button>
    </div>
  );
}