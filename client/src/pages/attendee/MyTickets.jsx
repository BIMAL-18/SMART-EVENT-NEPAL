import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function MyTickets() {
  const { data, isLoading } = useQuery({ queryKey: ['my-registrations'], queryFn: () => api.get('/registrations/mine').then(r => r.data) });
  if (isLoading) return <Loading />;
  const tickets = (data?.registrations || []).filter(r => ['CONFIRMED', 'ATTENDED'].includes(r.status) && r.ticketId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Tickets</h1>
      {tickets.length === 0 ? <EmptyState icon={Ticket} title="No tickets yet" subtitle="Confirmed registrations will show your QR ticket here." /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tickets.map(t => (
            <Link key={t._id} to={`/my-tickets/${t._id}`} className="card p-5 hover:border-brand-500/60 transition">
              <p className="text-xs text-slate-500 mb-1">{t.ticketId}</p>
              <p className="font-semibold">{t.event?.title}</p>
              <p className="text-sm text-slate-400 mt-1">{t.ticketTypeName} &middot; {t.event && new Date(t.event.date).toDateString()}</p>
              {t.checkedIn && <span className="badge bg-emerald-500/15 text-emerald-400 mt-2 inline-block">Checked in</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
