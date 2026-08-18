import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function EventRegistrations() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['event-registrations', id],
    queryFn: () => api.get(`/registrations/event/${id}`).then(r => r.data),
  });

  if (isLoading) return <Loading />;
  const regs = data?.registrations || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registrations</h1>
      {regs.length === 0 ? <EmptyState title="No registrations yet" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="text-left p-3">Attendee</th>
                <th className="text-left p-3">Ticket</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Checked In</th>
              </tr>
            </thead>
            <tbody>
              {regs.map(r => (
                <tr key={r._id} className="border-b border-slate-800/50">
                  <td className="p-3">{r.user?.name}<br /><span className="text-slate-500 text-xs">{r.user?.email}</span></td>
                  <td className="p-3">{r.ticketTypeName} x{r.quantity}</td>
                  <td className="p-3">NPR {r.totalAmount}</td>
                  <td className="p-3"><span className="badge bg-slate-800">{r.status}</span></td>
                  <td className="p-3">{r.checkedIn ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
