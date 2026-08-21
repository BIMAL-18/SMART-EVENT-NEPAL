// import React, { useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import toast from 'react-hot-toast';
// import { ShieldCheck, Info } from 'lucide-react';
// import { api, apiErrorMessage } from '../../api/client.js';
// import Loading from '../../components/Loading.jsx';

// const PROVIDERS = [
//   { id: 'esewa', label: 'eSewa' },
//   { id: 'khalti', label: 'Khalti' },
//   { id: 'mock', label: 'Demo Payment' },
// ];

// export default function Checkout() {
//   const { registrationId } = useParams();
//   const navigate = useNavigate();
//   const [provider, setProvider] = useState('mock');
//   const [step, setStep] = useState('select'); // select -> pending -> done
//   const [payment, setPayment] = useState(null);

//   const { data, isLoading } = useQuery({
//     queryKey: ['my-registrations'],
//     queryFn: () => api.get('/registrations/mine').then(r => r.data),
//   });
//   const registration = data?.registrations?.find(r => r._id === registrationId);

//   const initiateMutation = useMutation({
//     mutationFn: () => api.post('/payments/initiate', { registrationId, provider }),
//     onSuccess: ({ data }) => {
//       setPayment(data.payment);
//       if (data.usingDemoProvider) {
//         toast('Using Demo Payment — real credentials for this provider are not configured on this server.', { icon: 'ℹ️' });
//       }
//       setStep('pending');
//     },
//     onError: (err) => toast.error(apiErrorMessage(err)),
//   });

//   const simulateMutation = useMutation({
//     mutationFn: () => api.post('/payments/demo/simulate', { providerRef: payment.providerRef }),
//     onSuccess: () => verifyMutation.mutate(),
//     onError: (err) => toast.error(apiErrorMessage(err)),
//   });

//   const verifyMutation = useMutation({
//     mutationFn: () => api.post('/payments/verify', { paymentId: payment._id }),
//     onSuccess: () => { toast.success('Payment verified! Your ticket has been issued.'); navigate('/my-tickets'); },
//     onError: (err) => toast.error(apiErrorMessage(err)),
//   });

//   if (isLoading) return <Loading />;
//   if (!registration) return <p className="text-center text-slate-400 py-20">Registration not found.</p>;

//   return (
//     <div className="max-w-lg mx-auto space-y-6">
//       <h1 className="text-2xl font-bold">Checkout</h1>
//       <div className="card p-5">
//         <p className="font-medium">{registration.event?.title}</p>
//         <p className="text-sm text-slate-400">{registration.ticketTypeName} &middot; Qty {registration.quantity}</p>
//         <p className="text-lg font-bold mt-2">NPR {registration.totalAmount}</p>
//       </div>

//       {step === 'select' && (
//         <div className="card p-5 space-y-4">
//           <p className="text-sm font-medium">Choose a payment method</p>
//           <div className="grid grid-cols-3 gap-2">
//             {PROVIDERS.map(p => (
//               <button key={p.id} onClick={() => setProvider(p.id)}
//                 className={`p-3 rounded-xl border text-sm ${provider === p.id ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800'}`}>
//                 {p.label}
//               </button>
//             ))}
//           </div>
//           <p className="text-xs text-slate-500 flex items-start gap-2">
//             <Info size={14} className="mt-0.5 shrink-0" />
//             eSewa and Khalti automatically fall back to Demo Payment on this server unless real merchant
//             credentials are configured in the environment — see the README.
//           </p>
//           <button className="btn-primary w-full" disabled={initiateMutation.isPending} onClick={() => initiateMutation.mutate()}>
//             {initiateMutation.isPending ? 'Starting payment...' : 'Continue to pay'}
//           </button>
//         </div>
//       )}

//       {step === 'pending' && payment && (
//         <div className="card p-5 space-y-4 text-center">
//           <ShieldCheck className="mx-auto text-brand-400" size={32} />
//           <p className="text-sm text-slate-300">
//             {payment.provider === 'mock'
//               ? 'This is a simulated Demo Payment gateway. Click below to simulate a successful transaction.'
//               : `Redirecting to ${payment.provider}...`}
//           </p>
//           <p className="text-xs text-slate-500">Reference: {payment.providerRef}</p>
//           <button className="btn-primary w-full" disabled={simulateMutation.isPending || verifyMutation.isPending} onClick={() => simulateMutation.mutate()}>
//             {simulateMutation.isPending || verifyMutation.isPending ? 'Verifying...' : 'Pay (Demo)'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldCheck, Info, CreditCard } from 'lucide-react';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

const PROVIDERS = [
  { id: 'esewa', label: 'eSewa' },
  { id: 'khalti', label: 'Khalti' },
  { id: 'mock', label: 'Demo Payment' },
];

export default function Checkout() {
  const { registrationId } = useParams();
  const navigate = useNavigate();

  // eSewa selected by default
  const [provider, setProvider] = useState('esewa');

  const [step, setStep] = useState('select');
  const [payment, setPayment] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () =>
      api.get('/registrations/mine').then((r) => r.data),
  });

  const registration =
    data?.registrations?.find(
      (r) => r._id === registrationId
    );

  /*
   * Submit the eSewa payment form returned by the backend.
   */
  const submitEsewaForm = (formAction, formData) => {
    if (!formAction || !formData) {
      toast.error(
        'Invalid eSewa payment information received from server.'
      );
      return;
    }

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

  /*
   * Start payment.
   */
  const initiateMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/initiate', {
        registrationId,
        provider,
      }),

    onSuccess: ({ data }) => {
      setPayment(data.payment);

      /*
       * REAL eSewa
       *
       * Backend returns:
       * {
       *   providerResult: {
       *      formAction,
       *      formData
       *   }
       * }
       *
       * Submit directly to eSewa.
       */
      if (provider === 'esewa') {
        if (
          data?.providerResult?.formAction &&
          data?.providerResult?.formData
        ) {
          toast.success(
            'Redirecting to eSewa...'
          );

          submitEsewaForm(
            data.providerResult.formAction,
            data.providerResult.formData
          );

          return;
        }

        toast.error(
          'eSewa payment information was not returned by the server.'
        );

        return;
      }

      /*
       * Khalti
       */
      if (provider === 'khalti') {
        const paymentUrl =
          data?.providerResult?.paymentUrl ||
          data?.providerResult?.payment_url ||
          data?.providerResult?.redirectUrl ||
          data?.providerResult?.redirect_url;

        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }

        toast.error(
          'Khalti payment URL was not returned.'
        );

        return;
      }

      /*
       * Mock provider.
       */
      if (
        provider === 'mock' &&
        data.usingDemoProvider
      ) {
        toast(
          'Demo Payment selected.',
          {
            icon: 'ℹ️',
          }
        );

        setStep('pending');
      }
    },

    onError: (err) => {
      toast.error(
        apiErrorMessage(err)
      );
    },
  });

  /*
   * Demo payment only.
   */
  const simulateMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/demo/simulate', {
        providerRef: payment.providerRef,
      }),

    onSuccess: () => {
      verifyMutation.mutate();
    },

    onError: (err) => {
      toast.error(
        apiErrorMessage(err)
      );
    },
  });

  /*
   * Verify Demo/Khalti payment.
   *
   * For eSewa, verification is performed through
   * the backend callback/server-side verification flow.
   */
  const verifyMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/verify', {
        paymentId: payment._id,
      }),

    onSuccess: () => {
      toast.success(
        'Payment verified! Your ticket has been issued.'
      );

      navigate('/my-tickets');
    },

    onError: (err) => {
      toast.error(
        apiErrorMessage(err)
      );
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (!registration) {
    return (
      <p className="py-20 text-center text-slate-400">
        Registration not found.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">

      <h1 className="text-2xl font-bold">
        Checkout
      </h1>

      {/* Registration information */}
      <div className="card p-5">
        <p className="font-medium">
          {registration.event?.title}
        </p>

        <p className="text-sm text-slate-400">
          {registration.ticketTypeName}
          {' · '}
          Qty {registration.quantity}
        </p>

        <p className="mt-2 text-lg font-bold">
          NPR {registration.totalAmount}
        </p>
      </div>

      {/* Provider selection */}
      {step === 'select' && (
        <div className="card space-y-4 p-5">

          <p className="text-sm font-medium">
            Choose a payment method
          </p>

          <div className="grid grid-cols-3 gap-2">

            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setProvider(p.id)
                }
                className={`rounded-xl border p-3 text-sm transition ${
                  provider === p.id
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}

          </div>

          {/* eSewa information */}
          {provider === 'esewa' && (
            <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-xs text-slate-400">
              <Info
                size={14}
                className="mt-0.5 shrink-0 text-green-400"
              />

              <span>
                You will be redirected to the
                eSewa payment page to complete
                your payment securely.
              </span>
            </div>
          )}

          {/* Khalti information */}
          {provider === 'khalti' && (
            <div className="flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-slate-400">
              <Info
                size={14}
                className="mt-0.5 shrink-0 text-purple-400"
              />

              <span>
                You will be redirected to
                Khalti to complete your payment.
              </span>
            </div>
          )}

          {/* Demo information */}
          {provider === 'mock' && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-400">
              <Info
                size={14}
                className="mt-0.5 shrink-0"
              />

              <span>
                Demo Payment is only for local
                development and testing.
              </span>
            </div>
          )}

          <button
            type="button"
            className="btn-primary flex w-full items-center justify-center gap-2"
            disabled={
              initiateMutation.isPending
            }
            onClick={() =>
              initiateMutation.mutate()
            }
          >
            {initiateMutation.isPending ? (
              'Starting payment...'
            ) : (
              <>
                <CreditCard size={18} />

                {provider === 'esewa'
                  ? 'Pay with eSewa'
                  : provider === 'khalti'
                    ? 'Pay with Khalti'
                    : 'Continue with Demo'}
              </>
            )}
          </button>

        </div>
      )}

      {/* Demo payment only */}
      {step === 'pending' &&
        payment &&
        payment.provider === 'mock' && (
          <div className="card space-y-4 p-5 text-center">

            <ShieldCheck
              className="mx-auto text-brand-400"
              size={32}
            />

            <p className="text-sm text-slate-300">
              This is a simulated Demo Payment
              gateway.
            </p>

            <p className="text-xs text-slate-500">
              Reference: {payment.providerRef}
            </p>

            <button
              type="button"
              className="btn-primary w-full"
              disabled={
                simulateMutation.isPending ||
                verifyMutation.isPending
              }
              onClick={() =>
                simulateMutation.mutate()
              }
            >
              {simulateMutation.isPending ||
              verifyMutation.isPending
                ? 'Verifying...'
                : 'Pay (Demo)'}
            </button>

          </div>
        )}

    </div>
  );
}