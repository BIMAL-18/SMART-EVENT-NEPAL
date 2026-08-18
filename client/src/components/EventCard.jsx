import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag } from 'lucide-react';

const statusColors = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
  DRAFT: 'bg-slate-500/15 text-slate-400',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-400',
  COMPLETED: 'bg-blue-500/15 text-blue-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export default function EventCard({ event, matchPercent, reason }) {
  const lowestPrice = event.ticketTypes?.length ? Math.min(...event.ticketTypes.map(t => t.price)) : 0;
  return (
    <Link to={`/events/${event._id}`} className="card overflow-hidden hover:border-brand-500/60 transition group flex flex-col">
      <div className="h-40 bg-gradient-to-br from-brand-700 via-purple-700 to-slate-900 relative flex items-center justify-center">
        {event.image ? (
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <Tag className="text-white/40" size={32} />
        )}
        {typeof matchPercent === 'number' && (
          <div className="absolute top-2 right-2 badge bg-brand-500 text-white font-semibold">{matchPercent}% Match</div>
        )}
        <div className={`absolute top-2 left-2 badge ${statusColors[event.status] || 'bg-slate-700'}`}>{event.status}</div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold group-hover:text-brand-400 line-clamp-2">{event.title}</h3>
        <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} />{event.city} &middot; {event.venue}</div>
        <div className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} />{new Date(event.date).toDateString()}</div>
        {reason && <p className="text-xs text-slate-500 italic line-clamp-2">{reason}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold text-brand-300">{lowestPrice === 0 ? 'Free' : `From NPR ${lowestPrice}`}</span>
          <span className="badge bg-slate-800 text-slate-300">{event.eventType}</span>
        </div>
      </div>
    </Link>
  );
}
