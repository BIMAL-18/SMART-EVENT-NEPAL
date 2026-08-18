import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: () => api.get('/admin/audit-logs').then(r => r.data) });
  if (isLoading) return <Loading />;
  const logs = data?.logs || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
            <tr><th className="text-left p-3">Time</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Action</th><th className="text-left p-3">Target</th></tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-b border-slate-800/50">
                <td className="p-3 text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="p-3">{l.actor?.name || l.actorRole}</td>
                <td className="p-3"><span className="badge bg-slate-800">{l.action}</span></td>
                <td className="p-3 text-slate-500">{l.targetType} {l.targetId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
