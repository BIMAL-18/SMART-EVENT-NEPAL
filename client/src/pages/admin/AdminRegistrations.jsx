import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

const statusColors = {
  CONFIRMED: 'bg-emerald-500/15 text-emerald-400',
  ATTENDED: 'bg-blue-500/15 text-blue-400',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

// Platform-wide registration view - not scoped to any single organizer,
// unlike the organizer dashboard which only shows "my events".
export default function AdminRegistrations() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-registrations'], queryFn: () => api.get('/admin/registrations').then(r => r.data) });
  if (isLoading) return <Loading />;
  const registrations = data?.registrations || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Registrations</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
            <tr>
              <th className="text-left p-3">Attendee</th>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Ticket</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Checked In</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(r => (
              <tr key={r._id} className="border-b border-slate-800/50">
                <td className="p-3">{r.user?.name}<br /><span className="text-slate-500 text-xs">{r.user?.email}</span></td>
                <td className="p-3 text-slate-400">{r.event?.title || 'Deleted event'}</td>
                <td className="p-3">{r.ticketTypeName} x{r.quantity}</td>
                <td className="p-3">NPR {r.totalAmount}</td>
                <td className="p-3"><span className={`badge ${statusColors[r.status] || 'bg-slate-800'}`}>{r.status}</span></td>
                <td className="p-3">{r.checkedIn ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
