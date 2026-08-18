import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '../../api/client.js';
import EventCard from '../../components/EventCard.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Recommendations() {
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/ai/recommendations?limit=10').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="text-brand-400" /> Recommended for you</h1>
        <p className="text-slate-400 text-sm">Powered by a hybrid content-based + collaborative filtering engine.</p>
      </div>
      {isLoading ? <Loading /> : (
        data?.recommendations?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.recommendations.map(r => (
              <EventCard key={r.event._id} event={r.event} matchPercent={r.matchPercent} reason={r.reason} />
            ))}
          </div>
        ) : <EmptyState title="No recommendations yet" subtitle="Browse and interact with a few events, and we'll start tailoring suggestions to you." />
      )}
    </div>
  );
}
