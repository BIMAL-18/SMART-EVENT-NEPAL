import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <Loading />;
  const notifications = data?.notifications || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={() => markAll.mutate()} className="btn-secondary text-sm flex items-center gap-2"><CheckCheck size={16} /> Mark all read</button>
        )}
      </div>
      {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`card p-4 ${!n.read ? 'border-brand-500/50' : ''}`}>
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">{n.title}</p>
                <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
