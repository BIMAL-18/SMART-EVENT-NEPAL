import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Heart, Bell, Award, Sparkles } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const { data: regs } = useQuery({ queryKey: ['my-registrations'], queryFn: () => api.get('/registrations/mine').then(r => r.data) });
  const { data: recs } = useQuery({ queryKey: ['recs-preview'], queryFn: () => api.get('/ai/recommendations?limit=3').then(r => r.data) });

  const confirmed = regs?.registrations?.filter(r => r.status === 'CONFIRMED') || [];
  const upcoming = confirmed.filter(r => r.event && new Date(r.event.date) >= new Date());

  const links = [
    { to: '/my-registrations', icon: Ticket, label: 'My Registrations', value: confirmed.length },
    { to: '/my-tickets', icon: Ticket, label: 'My Tickets', value: confirmed.filter(r=>r.ticketId).length },
    { to: '/favorites', icon: Heart, label: 'Favorites', value: user?.favoriteEvents?.length || 0 },
    { to: '/certificates', icon: Award, label: 'Certificates' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-400 text-sm">Here's what's happening with your events.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="card p-5 hover:border-brand-500/60 transition">
            <l.icon className="text-brand-400 mb-2" size={20} />
            <p className="text-sm text-slate-400">{l.label}</p>
            {l.value !== undefined && <p className="text-2xl font-bold">{l.value}</p>}
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Sparkles size={18} className="text-brand-400" /> Recommended for you</h2>
          <Link to="/recommendations" className="text-sm text-brand-400 hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {recs?.recommendations?.slice(0, 3).map(r => (
            <Link to={`/events/${r.event._id}`} key={r.event._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800">
              <div>
                <p className="text-sm font-medium">{r.event.title}</p>
                <p className="text-xs text-slate-500">{r.reason}</p>
              </div>
              <span className="badge bg-brand-500 text-white shrink-0 ml-3">{r.matchPercent}%</span>
            </Link>
          )) || <p className="text-sm text-slate-500">No recommendations yet — browse events to get started.</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Upcoming events</h2>
        {upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming events. <Link to="/events" className="text-brand-400 hover:underline">Browse events</Link></p> : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map(r => (
              <Link to={`/events/${r.event._id}`} key={r._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800">
                <span className="text-sm font-medium">{r.event.title}</span>
                <span className="text-xs text-slate-500">{new Date(r.event.date).toDateString()}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
