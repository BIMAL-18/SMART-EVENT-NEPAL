import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function TicketDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/registrations/${id}/ticket`).then(r => r.data),
  });

  if (isLoading) return <Loading />;
  if (!data) return null;
  const { registration, qrDataUrl } = data;

  return (
    <div className="max-w-md mx-auto card overflow-hidden">
      <div className="bg-gradient-to-br from-brand-700 to-purple-800 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-white/70">SmartEvent Nepal</p>
        <h1 className="text-xl font-bold mt-1">{registration.event.title}</h1>
      </div>
      <div className="p-6 space-y-4">
        <img src={qrDataUrl} alt="QR ticket" className="mx-auto w-56 h-56 bg-white p-2 rounded-xl" />
        <div className="text-sm space-y-1 text-center">
          <p className="text-slate-400">Ticket ID</p>
          <p className="font-mono font-semibold">{registration.ticketId}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-800 pt-4">
          <div><p className="text-slate-500">Ticket Type</p><p className="font-medium">{registration.ticketTypeName}</p></div>
          <div><p className="text-slate-500">Date</p><p className="font-medium">{new Date(registration.event.date).toDateString()}</p></div>
          <div><p className="text-slate-500">Venue</p><p className="font-medium">{registration.event.venue}</p></div>
          <div><p className="text-slate-500">Status</p><p className="font-medium">{registration.checkedIn ? 'Checked in' : 'Not checked in'}</p></div>
        </div>
      </div>
    </div>
  );
}
