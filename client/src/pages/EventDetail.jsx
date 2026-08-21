import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MapPin, Calendar, Clock, Star, Heart, Users } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client.js';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  useEffect(() => {
    if (data?.event?.ticketTypes?.length && !selectedTicket) {
      setSelectedTicket(data.event.ticketTypes[0]._id);
    }
  }, [data]);

  const registerMutation = useMutation({
    mutationFn: () => api.post('/registrations', { eventId: id, ticketTypeId: selectedTicket, quantity }),
    onSuccess: ({ data }) => {
      const reg = data.registration;
      if (reg.status === 'CONFIRMED') {
        toast.success('Registered! Your free ticket is ready.');
        navigate('/my-tickets');
      } else {
        toast.success('Registration created — proceed to payment.');
        navigate(`/checkout/${reg._id}`);
      }
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => api.post(`/events/${id}/favorite`),
    onSuccess: () => toast.success('Favorites updated'),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) return <Loading />;
  if (!data?.event) return <p className="text-center text-slate-400 py-20">Event not found.</p>;
  const event = data.event;
  const ticket = event.ticketTypes.find(t => t._id === selectedTicket);
  const remaining = ticket ? ticket.capacity - ticket.sold : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="h-64 rounded-2xl bg-gradient-to-br from-brand-700 via-purple-700 to-slate-900 flex items-center justify-center overflow-hidden">
          {event.image ? <img src={event.image} className="w-full h-full object-cover" /> : <span className="text-white/50">No image</span>}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-brand-500/20 text-brand-300">{event.eventType}</span>
            <span className="badge bg-slate-800 text-slate-300">{event.category}</span>
            {event.avgRating > 0 && (
              <span className="badge bg-amber-500/20 text-amber-300 flex items-center gap-1"><Star size={12} fill="currentColor" />{event.avgRating.toFixed(1)} ({event.ratingCount})</span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
            <span className="flex items-center gap-1"><MapPin size={14} />{event.venue}, {event.city}</span>
            <span className="flex items-center gap-1"><Calendar size={14} />{new Date(event.date).toDateString()}</span>
            <span className="flex items-center gap-1"><Clock size={14} />{event.startTime} - {event.endTime}</span>
            <span className="flex items-center gap-1"><Users size={14} />{event.capacity} capacity</span>
          </div>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">{event.description}</p>
          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {event.tags.map(t => <span key={t} className="badge bg-slate-800 text-slate-400">#{t}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Get your ticket</h3>
          <div className="space-y-2">
            {event.ticketTypes.map(t => (
              <button
                key={t._id}
                onClick={() => setSelectedTicket(t._id)}
                className={`w-full text-left p-3 rounded-xl border transition ${selectedTicket === t._id ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span>{t.price === 0 ? 'Free' : `NPR ${t.price}`}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t.capacity - t.sold} of {t.capacity} remaining</p>
              </button>
            ))}
          </div>

          {ticket && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-400">Quantity</label>
              <input type="number" min={1} max={Math.min(10, remaining)} value={quantity}
                onChange={e => setQuantity(Number(e.target.value))} className="input w-20" />
            </div>
          )}

          {user ? (
            <button
              className="btn-primary w-full"
              disabled={!ticket || remaining < 1 || registerMutation.isPending || event.status !== 'PUBLISHED'}
              onClick={() => registerMutation.mutate()}
            >
              {event.status !== 'PUBLISHED' ? 'Registration closed' : remaining < 1 ? 'Sold out' : registerMutation.isPending ? 'Processing...' : 'Register'}
            </button>
          ) : (
            <button className="btn-primary w-full" onClick={() => navigate('/login')}>Log in to register</button>
          )}

          {user && (
            <button onClick={() => favoriteMutation.mutate()} className="btn-secondary w-full flex items-center justify-center gap-2">
              <Heart size={16} /> Save to favorites
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
