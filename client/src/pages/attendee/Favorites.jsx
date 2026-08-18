import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import EventCard from '../../components/EventCard.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Favorites() {
  const { user } = useAuth();
  const ids = user?.favoriteEvents || [];

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', ids],
    queryFn: async () => {
      const results = await Promise.all(ids.map(id => api.get(`/events/${id}`).then(r => r.data.event).catch(() => null)));
      return results.filter(Boolean);
    },
    enabled: ids.length > 0,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Favorites</h1>
      {ids.length === 0 ? <EmptyState icon={Heart} title="No favorites yet" /> : isLoading ? <Loading /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.map(ev => <EventCard key={ev._id} event={ev} />)}
        </div>
      )}
    </div>
  );
}
