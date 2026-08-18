import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Certificates() {
  const { data, isLoading } = useQuery({ queryKey: ['my-certificates'], queryFn: () => api.get('/certificates/mine').then(r => r.data) });
  if (isLoading) return <Loading />;
  const certs = data?.certificates || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Certificates</h1>
      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" subtitle="Certificates appear here after you check in to a completed event." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {certs.map(c => (
            <div key={c._id} className="card p-5">
              <p className="font-semibold">{c.event?.title}</p>
              <p className="text-xs text-slate-500 mt-1">{c.certificateNumber}</p>
              <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs mt-3 inline-flex items-center gap-2">
                <Download size={14} /> Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
