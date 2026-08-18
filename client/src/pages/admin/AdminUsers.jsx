import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function AdminUsers({ roleFilter }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.post(`/admin/users/${id}/status`, { status }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{roleFilter === 'organizer' ? 'Organizers' : 'Users'}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase border-b border-slate-800">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b border-slate-800/50">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-slate-400">{u.email}</td>
                <td className="p-3"><span className="badge bg-slate-800">{u.role}</span></td>
                <td className="p-3"><span className={`badge ${u.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{u.status}</span></td>
                <td className="p-3">
                  <button
                    className="text-xs text-brand-400 hover:underline"
                    onClick={() => statusMutation.mutate({ id: u._id, status: u.status === 'active' ? 'suspended' : 'active' })}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
