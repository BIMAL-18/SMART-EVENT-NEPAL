import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldCheck, Info } from 'lucide-react';
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
  const [provider, setProvider] = useState('mock');
  const [step, setStep] = useState('select'); // select -> pending -> done
  const [payment, setPayment] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => api.get('/registrations/mine').then(r => r.data),
  });
  const registration = data?.registrations?.find(r => r._id === registrationId);

  const initiateMutation = useMutation({
    mutationFn: () => api.post('/payments/initiate', { registrationId, provider }),
    onSuccess: ({ data }) => {
      setPayment(data.payment);
      if (data.usingDemoProvider) {
        toast('Using Demo Payment — real credentials for this provider are not configured on this server.', { icon: 'ℹ️' });
      }
      setStep('pending');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const simulateMutation = useMutation({
    mutationFn: () => api.post('/payments/demo/simulate', { providerRef: payment.providerRef }),
    onSuccess: () => verifyMutation.mutate(),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post('/payments/verify', { paymentId: payment._id }),
    onSuccess: () => { toast.success('Payment verified! Your ticket has been issued.'); navigate('/my-tickets'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  if (!registration) return <p className="text-center text-slate-400 py-20">Registration not found.</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="card p-5">
        <p className="font-medium">{registration.event?.title}</p>
        <p className="text-sm text-slate-400">{registration.ticketTypeName} &middot; Qty {registration.quantity}</p>
        <p className="text-lg font-bold mt-2">NPR {registration.totalAmount}</p>
      </div>

      {step === 'select' && (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-medium">Choose a payment method</p>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => setProvider(p.id)}
                className={`p-3 rounded-xl border text-sm ${provider === p.id ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0" />
            eSewa and Khalti automatically fall back to Demo Payment on this server unless real merchant
            credentials are configured in the environment — see the README.
          </p>
          <button className="btn-primary w-full" disabled={initiateMutation.isPending} onClick={() => initiateMutation.mutate()}>
            {initiateMutation.isPending ? 'Starting payment...' : 'Continue to pay'}
          </button>
        </div>
      )}

      {step === 'pending' && payment && (
        <div className="card p-5 space-y-4 text-center">
          <ShieldCheck className="mx-auto text-brand-400" size={32} />
          <p className="text-sm text-slate-300">
            {payment.provider === 'mock'
              ? 'This is a simulated Demo Payment gateway. Click below to simulate a successful transaction.'
              : `Redirecting to ${payment.provider}...`}
          </p>
          <p className="text-xs text-slate-500">Reference: {payment.providerRef}</p>
          <button className="btn-primary w-full" disabled={simulateMutation.isPending || verifyMutation.isPending} onClick={() => simulateMutation.mutate()}>
            {simulateMutation.isPending || verifyMutation.isPending ? 'Verifying...' : 'Pay (Demo)'}
          </button>
        </div>
      )}
    </div>
  );
}
