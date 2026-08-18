import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

export default function EventAnalytics() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['event-analytics', id],
    queryFn: () => api.get(`/organizer/events/${id}/analytics`).then(r => r.data),
  });
  const { data: prediction, isLoading: predLoading } = useQuery({
    queryKey: ['event-prediction', id],
    queryFn: () => api.get(`/ai/attendance/event/${id}`).then(r => r.data),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data.event.title} — Analytics</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-sm text-slate-400">Registered</p><p className="text-2xl font-bold">{data.totalRegistered}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-400">Revenue</p><p className="text-2xl font-bold">NPR {data.revenue}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-400">Checked In</p><p className="text-2xl font-bold">{data.checkedIn}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-400">Capacity Remaining</p><p className="text-2xl font-bold">{data.capacityRemaining}</p></div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Ticket type breakdown</h3>
        <div className="space-y-2">
          {data.ticketTypeBreakdown.map(t => (
            <div key={t.name} className="flex items-center justify-between text-sm">
              <span>{t.name} (NPR {t.price})</span>
              <span className="text-slate-400">{t.sold} / {t.capacity} sold</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 border-brand-500/40">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Brain className="text-brand-400" size={18} /> AI Attendance Prediction</h3>
        <p className="text-xs text-slate-500 mb-4">Random Forest model trained on seeded demo/synthetic data — see docs/ai-recommendation.md for methodology.</p>
        {predLoading ? <Loading label="Running prediction..." /> : prediction && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 text-center">
              <p className="text-xs text-slate-500">Registered</p>
              <p className="text-xl font-bold">{prediction.registered}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 text-center">
              <TrendingUp className="mx-auto text-emerald-400 mb-1" size={18} />
              <p className="text-xs text-slate-500">Predicted Attendance</p>
              <p className="text-xl font-bold text-emerald-400">{prediction.predictedAttendance}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 text-center">
              <TrendingDown className="mx-auto text-red-400 mb-1" size={18} />
              <p className="text-xs text-slate-500">Predicted No-Shows</p>
              <p className="text-xl font-bold text-red-400">{prediction.predictedNoShows}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
