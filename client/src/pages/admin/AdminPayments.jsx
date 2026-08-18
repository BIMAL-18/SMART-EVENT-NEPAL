import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function AdminPayments() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-payments'], queryFn: () => api.get('/admin/payments').then(r => r.data) });
  if (isLoading) return <Loading />;
  const payments = data?.payments || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
            <tr><th className="text-left p-3">User</th><th className="text-left p-3">Event</th><th className="text-left p-3">Provider</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th></tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p._id} className="border-b border-slate-800/50">
                <td className="p-3">{p.user?.name}</td>
                <td className="p-3 text-slate-400">{p.event?.title}</td>
                <td className="p-3"><span className="badge bg-slate-800">{p.provider}</span></td>
                <td className="p-3">NPR {p.amount}</td>
                <td className="p-3"><span className={`badge ${p.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
