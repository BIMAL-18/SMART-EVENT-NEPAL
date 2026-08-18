import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { api } from '../api/client.js';
import Loading from '../components/Loading.jsx';

export default function CertificateVerify() {
  const { code } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['verify-cert', code],
    queryFn: () => api.get(`/certificates/verify/${code}`).then(r => r.data).catch(e => e.response.data),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-md mx-auto card p-8 mt-10 text-center">
      {data?.valid ? (
        <>
          <ShieldCheck className="mx-auto text-emerald-400 mb-3" size={40} />
          <h1 className="text-xl font-bold mb-4">Certificate Verified</h1>
          <div className="text-left text-sm space-y-2 text-slate-300">
            <p><span className="text-slate-500">Certificate No:</span> {data.certificateNumber}</p>
            <p><span className="text-slate-500">Attendee:</span> {data.attendeeName}</p>
            <p><span className="text-slate-500">Event:</span> {data.eventTitle}</p>
            <p><span className="text-slate-500">Date:</span> {new Date(data.eventDate).toDateString()}</p>
          </div>
        </>
      ) : (
        <>
          <ShieldX className="mx-auto text-red-400 mb-3" size={40} />
          <h1 className="text-xl font-bold mb-2">Not Verified</h1>
          <p className="text-sm text-slate-400">{data?.message || 'This certificate code could not be verified.'}</p>
        </>
      )}
    </div>
  );
}
