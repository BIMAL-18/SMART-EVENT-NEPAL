import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const statusColors = {
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  ATTENDED: 'bg-blue-500/15 text-blue-400',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export default function MyRegistrations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['my-registrations'], queryFn: () => api.get('/registrations/mine').then(r => r.data) });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/registrations/${id}/cancel`),
    onSuccess: () => { toast.success('Registration cancelled'); qc.invalidateQueries({ queryKey: ['my-registrations'] }); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  const regs = data?.registrations || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Registrations</h1>
      {regs.length === 0 ? <EmptyState title="No registrations yet" subtitle="Register for an event to see it here." /> : (
        <div className="space-y-3">
          {regs.map(r => (
            <div key={r._id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <Link to={`/events/${r.event?._id}`} className="font-medium hover:text-brand-400">{r.event?.title || 'Event removed'}</Link>
                <p className="text-xs text-slate-500 mt-1">{r.ticketTypeName} &middot; Qty {r.quantity} &middot; NPR {r.totalAmount}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${statusColors[r.status]}`}>{r.status.replace('_', ' ')}</span>
                {r.status === 'PENDING_PAYMENT' && (
                  <Link to={`/checkout/${r._id}`} className="btn-primary text-xs py-1.5">Pay now</Link>
                )}
                {['CONFIRMED', 'ATTENDED'].includes(r.status) && (
                  <Link to={`/my-tickets/${r._id}`} className="btn-secondary text-xs py-1.5">View ticket</Link>
                )}
                {!['CANCELLED', 'ATTENDED'].includes(r.status) && (
                  <button onClick={() => cancelMutation.mutate(r._id)} className="text-xs text-red-400 hover:underline">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
