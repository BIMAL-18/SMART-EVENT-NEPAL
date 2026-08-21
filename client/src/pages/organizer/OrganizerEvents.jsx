import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Rocket, Ban, CheckCircle2, BarChart3, Users, QrCode, Lock } from 'lucide-react';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const statusColors = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
  DRAFT: 'bg-slate-500/15 text-slate-400',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-400',
  COMPLETED: 'bg-blue-500/15 text-blue-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export default function OrganizerEvents() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['organizer-events'], queryFn: () => api.get('/events/mine').then(r => r.data) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['organizer-events'] });

  // Organizers publish directly - no admin approval required to go live.
  const publishMutation = useMutation({
    mutationFn: (id) => api.post(`/events/${id}/publish`),
    onSuccess: () => { toast.success('Event published — it is now live and visible to attendees.'); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/events/${id}/complete`),
    onSuccess: ({ data }) => {
      toast.success(`Event marked completed. ${data.certificatesIssued} certificate(s) issued automatically.`);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/events/${id}/cancel`),
    onSuccess: () => { toast.success('Event cancelled'); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`),
    onSuccess: () => { toast.success('Event deleted'); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  const events = data?.events || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link to="/organizer/events/create" className="btn-primary flex items-center gap-2"><Plus size={16} /> New Event</Link>
      </div>

      {events.length === 0 ? <EmptyState title="No events yet" subtitle="Create your first event to get started." /> : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev._id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {ev.title}
                  {ev.visibility === 'private' && (
                    <span className="badge bg-slate-800 text-slate-400 flex items-center gap-1"><Lock size={10} /> Private</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{new Date(ev.date).toDateString()} &middot; {ev.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${statusColors[ev.status]}`}>{ev.status}</span>
                <Link to={`/organizer/events/${ev._id}/edit`} className="p-2 rounded-lg hover:bg-slate-800" title="Edit"><Edit size={16} /></Link>
                <Link to={`/organizer/events/${ev._id}/registrations`} className="p-2 rounded-lg hover:bg-slate-800" title="Registrations"><Users size={16} /></Link>
                <Link to={`/organizer/events/${ev._id}/attendance`} className="p-2 rounded-lg hover:bg-slate-800" title="Check-in"><QrCode size={16} /></Link>
                <Link to={`/organizer/events/${ev._id}/analytics`} className="p-2 rounded-lg hover:bg-slate-800" title="Analytics"><BarChart3 size={16} /></Link>
                {['DRAFT', 'PENDING_APPROVAL'].includes(ev.status) && (
                  <button onClick={() => publishMutation.mutate(ev._id)} className="p-2 rounded-lg hover:bg-slate-800 text-emerald-400" title="Publish (goes live immediately, no approval needed)">
                    <Rocket size={16} />
                  </button>
                )}
                {ev.status === 'PUBLISHED' && (
                  <button onClick={() => completeMutation.mutate(ev._id)} className="p-2 rounded-lg hover:bg-slate-800 text-blue-400" title="Mark completed (auto-issues certificates)">
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {['PUBLISHED', 'PENDING_APPROVAL'].includes(ev.status) && (
                  <button onClick={() => cancelMutation.mutate(ev._id)} className="p-2 rounded-lg hover:bg-slate-800 text-red-400" title="Cancel"><Ban size={16} /></button>
                )}
                <button onClick={() => deleteMutation.mutate(ev._id)} className="p-2 rounded-lg hover:bg-slate-800 text-red-400" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
