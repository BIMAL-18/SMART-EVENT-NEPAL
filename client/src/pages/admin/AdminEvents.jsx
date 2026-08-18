import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function AdminEvents() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-events'], queryFn: () => api.get('/admin/events').then(r => r.data) });

  const moderateMutation = useMutation({
    mutationFn: ({ id, decision }) => api.post(`/events/${id}/moderate`, { decision }),
    onSuccess: () => { toast.success('Event moderated'); qc.invalidateQueries({ queryKey: ['admin-events'] }); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  const events = data?.events || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Events</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
            <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Organizer</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev._id} className="border-b border-slate-800/50">
                <td className="p-3">{ev.title}</td>
                <td className="p-3 text-slate-400">{ev.organizer?.name}</td>
                <td className="p-3"><span className="badge bg-slate-800">{ev.status}</span></td>
                <td className="p-3 space-x-2">
                  {ev.status === 'PENDING_APPROVAL' && (
                    <>
                      <button className="text-xs text-emerald-400 hover:underline" onClick={() => moderateMutation.mutate({ id: ev._id, decision: 'approve' })}>Approve</button>
                      <button className="text-xs text-red-400 hover:underline" onClick={() => moderateMutation.mutate({ id: ev._id, decision: 'reject' })}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
