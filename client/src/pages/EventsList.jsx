import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import Loading from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';

const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'];
const EVENT_TYPES = ['Birthday Party', 'College Event', 'Workshop', 'Seminar', 'Hackathon', 'Conference', 'Concert', 'Sports', 'Corporate Event', 'Community Event', 'Festival', 'Other'];

export default function EventsList() {
  const [filters, setFilters] = useState({ q: '', city: '', eventType: '', language: '', sort: 'newest', page: 1 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      return api.get(`/events?${params.toString()}`).then(r => r.data);
    },
  });

  const set = (patch) => setFilters(f => ({ ...f, ...patch, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="input pl-9"
            placeholder="Search events, workshops, concerts..."
            value={filters.q}
            onChange={e => set({ q: e.target.value })}
          />
        </div>
        <button onClick={() => setShowFilters(s => !s)} className="btn-secondary flex items-center gap-2">
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input" value={filters.city} onChange={e => set({ city: e.target.value })}>
            <option value="">All cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={filters.eventType} onChange={e => set({ eventType: e.target.value })}>
            <option value="">All event types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={filters.language} onChange={e => set({ language: e.target.value })}>
            <option value="">Any language</option>
            <option>English</option><option>Nepali</option><option>Both</option>
          </select>
          <select className="input" value={filters.sort} onChange={e => set({ sort: e.target.value })}>
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="popularity">Popularity</option>
            <option value="price">Price</option>
            <option value="start_time">Start time</option>
          </select>
        </div>
      )}

      {isLoading ? <Loading /> : (
        data?.events?.length ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.events.map(ev => <EventCard key={ev._id} event={ev} />)}
            </div>
            <p className="text-xs text-slate-500 text-center">{data.total} event(s) found</p>
          </>
        ) : <EmptyState title="No events found" subtitle="Try adjusting your search or filters." />
      )}
    </div>
  );
}
