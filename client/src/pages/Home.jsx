import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Search, ShieldCheck, QrCode } from 'lucide-react';
import { api } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: () => api.get('/events?sort=popularity&limit=8').then(r => r.data),
  });

  return (
    <div className="space-y-14">
      <section className="text-center py-16 px-4 rounded-3xl bg-gradient-to-br from-brand-900/60 via-slate-900 to-purple-900/40 border border-slate-800">
        <div className="inline-flex items-center gap-2 badge bg-brand-500/20 text-brand-300 mb-4">
          <Sparkles size={14} /> AI-Powered Recommendations
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover events made for <span className="text-brand-400">you</span></h1>
        <p className="text-slate-400 max-w-xl mx-auto mb-8">
          SmartEvent Nepal uses a real hybrid recommendation engine to match you with workshops,
          concerts, hackathons and more across Kathmandu, Pokhara, and beyond.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/events" className="btn-primary flex items-center gap-2"><Search size={16} /> Browse Events</Link>
          {!user && <Link to="/register" className="btn-secondary">Create an account</Link>}
          {user && <Link to="/recommendations" className="btn-secondary">See recommendations</Link>}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Sparkles, title: 'Hybrid AI Recommendations', desc: 'Content-based + collaborative filtering with cosine similarity, tuned to your interests and behaviour.' },
          { icon: QrCode, title: 'QR Tickets & Check-in', desc: 'Instant QR tickets, validated at the door in real time with duplicate check-in prevention.' },
          { icon: ShieldCheck, title: 'Secure by Design', desc: 'JWT auth, RBAC, bcrypt hashing, and server-verified payments — never trusted from the client.' },
        ].map((f, i) => (
          <div key={i} className="card p-6">
            <f.icon className="text-brand-400 mb-3" size={24} />
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Popular right now</h2>
          <Link to="/events" className="text-sm text-brand-400 hover:underline">View all</Link>
        </div>
        {isLoading ? <Loading /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data?.events?.map(ev => <EventCard key={ev._id} event={ev} />)}
          </div>
        )}
      </section>
    </div>
  );
}
