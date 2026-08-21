import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

const EVENT_TYPES = ['Birthday Party', 'College Event', 'Workshop', 'Seminar', 'Hackathon', 'Conference', 'Concert', 'Sports', 'Corporate Event', 'Community Event', 'Festival', 'Other'];
const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'];

const emptyTicket = { name: 'Regular', price: 0, capacity: 100 };

function toInputDate(d) { return d ? new Date(d).toISOString().slice(0, 10) : ''; }

export default function CreateEditEvent() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: existing, isLoading } = useQuery({
    queryKey: ['event', id], queryFn: () => api.get(`/events/${id}`).then(r => r.data), enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: '', description: '', category: '', tags: '', eventType: 'Workshop', city: 'Kathmandu', venue: '',
    date: '', startTime: '18:00', endTime: '20:00', capacity: 100,
    registrationStart: '', registrationEnd: '', language: 'English', visibility: 'public',
    ticketTypes: [emptyTicket],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing?.event) {
      const e = existing.event;
      setForm({
        title: e.title, description: e.description, category: e.category, tags: (e.tags || []).join(', '),
        eventType: e.eventType, city: e.city, venue: e.venue,
        date: toInputDate(e.date), startTime: e.startTime, endTime: e.endTime, capacity: e.capacity,
        registrationStart: toInputDate(e.registrationStart), registrationEnd: toInputDate(e.registrationEnd),
        language: e.language, visibility: e.visibility,
        ticketTypes: e.ticketTypes.map(t => ({ name: t.name, price: t.price, capacity: t.capacity })),
      });
    }
  }, [existing]);

  if (isEdit && isLoading) return <Loading />;

  const updateTicket = (idx, patch) => setForm(f => ({
    ...f, ticketTypes: f.ticketTypes.map((t, i) => i === idx ? { ...t, ...patch } : t),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        capacity: Number(form.capacity),
        ticketTypes: form.ticketTypes.map(t => ({ ...t, price: Number(t.price), capacity: Number(t.capacity) })),
      };
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
        toast.success('Event updated');
      } else {
        await api.post('/events', payload);
        toast.success('Event created as draft. Publish it from "My Events" whenever you\'re ready — no approval needed.');
      }
      navigate('/organizer/events');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const categories = catData?.categories || [];

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit Event' : 'Create Event'}</h1>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm text-slate-400">Title</label>
          <input required className="input mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-slate-400">Description</label>
          <textarea required rows={4} className="input mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">Category</label>
            <select required className="input mt-1" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select</option>
              {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400">Event Type</label>
            <select className="input mt-1" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-400">Tags (comma separated)</label>
          <input className="input mt-1" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ai, networking, career" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">City</label>
            <select className="input mt-1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400">Venue</label>
            <input required className="input mt-1" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400">Date</label>
            <input required type="date" className="input mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Start Time</label>
            <input required type="time" className="input mt-1" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-400">End Time</label>
            <input required type="time" className="input mt-1" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400">Capacity</label>
            <input required type="number" min={1} className="input mt-1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Registration Start</label>
            <input required type="date" className="input mt-1" value={form.registrationStart} onChange={e => setForm({ ...form, registrationStart: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Registration End</label>
            <input required type="date" className="input mt-1" value={form.registrationEnd} onChange={e => setForm({ ...form, registrationEnd: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">Language</label>
            <select className="input mt-1" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
              <option>English</option><option>Nepali</option><option>Both</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400">Visibility</label>
            <select className="input mt-1" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
              <option value="public">Public — shows up in search & browse</option>
              <option value="private">Private — e.g. birthday party (only visible via direct link)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          No admin approval is needed — publishing an event makes it live immediately.
          Private events never appear in public search results, but anyone with the
          direct event link can still view and register for it.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ticket Types</h3>
          <button type="button" className="btn-secondary text-xs flex items-center gap-1"
            onClick={() => setForm(f => ({ ...f, ticketTypes: [...f.ticketTypes, { ...emptyTicket, name: 'VIP' }] }))}>
            <Plus size={14} /> Add ticket type
          </button>
        </div>
        {form.ticketTypes.map((t, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 items-center">
            <input className="input" placeholder="Name (e.g. VIP)" value={t.name} onChange={e => updateTicket(idx, { name: e.target.value })} />
            <input type="number" min={0} className="input" placeholder="Price" value={t.price} onChange={e => updateTicket(idx, { price: e.target.value })} />
            <input type="number" min={1} className="input" placeholder="Capacity" value={t.capacity} onChange={e => updateTicket(idx, { capacity: e.target.value })} />
            {form.ticketTypes.length > 1 && (
              <button type="button" onClick={() => setForm(f => ({ ...f, ticketTypes: f.ticketTypes.filter((_, i) => i !== idx) }))} className="text-red-400 justify-self-start">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event (draft)'}</button>
    </form>
  );
}
