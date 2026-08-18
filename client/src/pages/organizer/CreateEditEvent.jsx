// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useQuery } from '@tanstack/react-query';
// import toast from 'react-hot-toast';
// import { Plus, Trash2 } from 'lucide-react';
// import { api, apiErrorMessage } from '../../api/client.js';
// import Loading from '../../components/Loading.jsx';

// const EVENT_TYPES = ['Birthday Party', 'College Event', 'Workshop', 'Seminar', 'Hackathon', 'Conference', 'Concert', 'Sports', 'Corporate Event', 'Community Event', 'Festival', 'Other'];
// const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'];

// const emptyTicket = { name: 'Regular', price: 0, capacity: 100 };

// function toInputDate(d) { return d ? new Date(d).toISOString().slice(0, 10) : ''; }

// export default function CreateEditEvent() {
//   const { id } = useParams();
//   const isEdit = Boolean(id);
//   const navigate = useNavigate();

//   const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
//   const { data: existing, isLoading } = useQuery({
//     queryKey: ['event', id], queryFn: () => api.get(`/events/${id}`).then(r => r.data), enabled: isEdit,
//   });

//   const [form, setForm] = useState({
//     title: '', description: '', category: '', tags: '', eventType: 'Workshop', city: 'Kathmandu', venue: '',
//     date: '', startTime: '18:00', endTime: '20:00', capacity: 100,
//     registrationStart: '', registrationEnd: '', language: 'English', visibility: 'public',
//     ticketTypes: [emptyTicket],
//   });
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (existing?.event) {
//       const e = existing.event;
//       setForm({
//         title: e.title, description: e.description, category: e.category, tags: (e.tags || []).join(', '),
//         eventType: e.eventType, city: e.city, venue: e.venue,
//         date: toInputDate(e.date), startTime: e.startTime, endTime: e.endTime, capacity: e.capacity,
//         registrationStart: toInputDate(e.registrationStart), registrationEnd: toInputDate(e.registrationEnd),
//         language: e.language, visibility: e.visibility,
//         ticketTypes: e.ticketTypes.map(t => ({ name: t.name, price: t.price, capacity: t.capacity })),
//       });
//     }
//   }, [existing]);

//   if (isEdit && isLoading) return <Loading />;

//   const updateTicket = (idx, patch) => setForm(f => ({
//     ...f, ticketTypes: f.ticketTypes.map((t, i) => i === idx ? { ...t, ...patch } : t),
//   }));

//   const submit = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     try {
//       const payload = {
//         ...form,
//         tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
//         capacity: Number(form.capacity),
//         ticketTypes: form.ticketTypes.map(t => ({ ...t, price: Number(t.price), capacity: Number(t.capacity) })),
//       };
//       if (isEdit) {
//         await api.put(`/events/${id}`, payload);
//         toast.success('Event updated');
//       } else {
//         await api.post('/events', payload);
//         toast.success('Event created as draft. Submit it for approval when ready.');
//       }
//       navigate('/organizer/events');
//     } catch (err) {
//       toast.error(apiErrorMessage(err));
//     } finally {
//       setSaving(false);
//     }
//   };

//   const categories = catData?.categories || [];

//   return (
//     <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
//       <h1 className="text-2xl font-bold">{isEdit ? 'Edit Event' : 'Create Event'}</h1>

//       <div className="card p-5 space-y-4">
//         <div>
//           <label className="text-sm text-slate-400">Title</label>
//           <input required className="input mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
//         </div>
//         <div>
//           <label className="text-sm text-slate-400">Description</label>
//           <textarea required rows={4} className="input mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
//         </div>
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="text-sm text-slate-400">Category</label>
//             <select required className="input mt-1" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
//               <option value="">Select</option>
//               {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Event Type</label>
//             <select className="input mt-1" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}>
//               {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
//             </select>
//           </div>
//         </div>
//         <div>
//           <label className="text-sm text-slate-400">Tags (comma separated)</label>
//           <input className="input mt-1" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ai, networking, career" />
//         </div>
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="text-sm text-slate-400">City</label>
//             <select className="input mt-1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
//               {CITIES.map(c => <option key={c}>{c}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Venue</label>
//             <input required className="input mt-1" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
//           </div>
//         </div>
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label className="text-sm text-slate-400">Date</label>
//             <input required type="date" className="input mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Start Time</label>
//             <input required type="time" className="input mt-1" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">End Time</label>
//             <input required type="time" className="input mt-1" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
//           </div>
//         </div>
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label className="text-sm text-slate-400">Capacity</label>
//             <input required type="number" min={1} className="input mt-1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Registration Start</label>
//             <input required type="date" className="input mt-1" value={form.registrationStart} onChange={e => setForm({ ...form, registrationStart: e.target.value })} />
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Registration End</label>
//             <input required type="date" className="input mt-1" value={form.registrationEnd} onChange={e => setForm({ ...form, registrationEnd: e.target.value })} />
//           </div>
//         </div>
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="text-sm text-slate-400">Language</label>
//             <select className="input mt-1" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
//               <option>English</option><option>Nepali</option><option>Both</option>
//             </select>
//           </div>
//           <div>
//             <label className="text-sm text-slate-400">Visibility</label>
//             <select className="input mt-1" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
//               <option value="public">Public</option><option value="private">Private (e.g. birthday party)</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       <div className="card p-5 space-y-3">
//         <div className="flex items-center justify-between">
//           <h3 className="font-semibold">Ticket Types</h3>
//           <button type="button" className="btn-secondary text-xs flex items-center gap-1"
//             onClick={() => setForm(f => ({ ...f, ticketTypes: [...f.ticketTypes, { ...emptyTicket, name: 'VIP' }] }))}>
//             <Plus size={14} /> Add ticket type
//           </button>
//         </div>
//         {form.ticketTypes.map((t, idx) => (
//           <div key={idx} className="grid grid-cols-4 gap-2 items-center">
//             <input className="input" placeholder="Name (e.g. VIP)" value={t.name} onChange={e => updateTicket(idx, { name: e.target.value })} />
//             <input type="number" min={0} className="input" placeholder="Price" value={t.price} onChange={e => updateTicket(idx, { price: e.target.value })} />
//             <input type="number" min={1} className="input" placeholder="Capacity" value={t.capacity} onChange={e => updateTicket(idx, { capacity: e.target.value })} />
//             {form.ticketTypes.length > 1 && (
//               <button type="button" onClick={() => setForm(f => ({ ...f, ticketTypes: f.ticketTypes.filter((_, i) => i !== idx) }))} className="text-red-400 justify-self-start">
//                 <Trash2 size={16} />
//               </button>
//             )}
//           </div>
//         ))}
//       </div>

//       <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event (draft)'}</button>
//     </form>
//   );
// }
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

import { api, apiErrorMessage } from '../../api/client.js';
import Loading from '../../components/Loading.jsx';

const EVENT_TYPES = [
  'Birthday Party',
  'College Event',
  'Workshop',
  'Seminar',
  'Hackathon',
  'Conference',
  'Concert',
  'Sports',
  'Corporate Event',
  'Community Event',
  'Festival',
  'Other',
];

const CITIES = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Chitwan',
];

const emptyTicket = {
  name: 'Regular',
  price: 0,
  capacity: 100,
};

function toInputDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function dateToISO(value) {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

export default function CreateEditEvent() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const {
    data: catData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      api.get('/categories').then((response) => response.data),
  });

  const {
    data: existing,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () =>
      api.get(`/events/${id}`).then((response) => response.data),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    eventType: 'Workshop',
    city: 'Kathmandu',
    venue: '',
    date: '',
    startTime: '18:00',
    endTime: '20:00',
    capacity: 100,
    registrationStart: '',
    registrationEnd: '',
    language: 'English',
    visibility: 'public',
    ticketTypes: [{ ...emptyTicket }],
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing?.event) return;

    const event = existing.event;

    setForm({
      title: event.title || '',
      description: event.description || '',
      category: event.category || '',
      tags: Array.isArray(event.tags)
        ? event.tags.join(', ')
        : '',
      eventType: event.eventType || 'Workshop',
      city: event.city || 'Kathmandu',
      venue: event.venue || '',
      date: toInputDate(event.date),
      startTime: event.startTime || '18:00',
      endTime: event.endTime || '20:00',
      capacity: event.capacity || 100,
      registrationStart: toInputDate(
        event.registrationStart
      ),
      registrationEnd: toInputDate(
        event.registrationEnd
      ),
      language: event.language || 'English',
      visibility: event.visibility || 'public',
      ticketTypes:
        Array.isArray(event.ticketTypes) &&
        event.ticketTypes.length > 0
          ? event.ticketTypes.map((ticket) => ({
              name: ticket.name || 'Regular',
              price: Number(ticket.price) || 0,
              capacity: Number(ticket.capacity) || 100,
            }))
          : [{ ...emptyTicket }],
    });
  }, [existing]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateTicket = (index, patch) => {
    setForm((previous) => ({
      ...previous,
      ticketTypes: previous.ticketTypes.map(
        (ticket, ticketIndex) =>
          ticketIndex === index
            ? {
                ...ticket,
                ...patch,
              }
            : ticket
      ),
    }));
  };

  const addTicket = () => {
    setForm((previous) => ({
      ...previous,
      ticketTypes: [
        ...previous.ticketTypes,
        {
          name: 'VIP',
          price: 0,
          capacity: 100,
        },
      ],
    }));
  };

  const removeTicket = (index) => {
    setForm((previous) => ({
      ...previous,
      ticketTypes: previous.ticketTypes.filter(
        (_, ticketIndex) => ticketIndex !== index
      ),
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('Event title is required');
      return false;
    }

    if (form.title.trim().length < 3) {
      toast.error('Event title must contain at least 3 characters');
      return false;
    }

    if (!form.description.trim()) {
      toast.error('Event description is required');
      return false;
    }

    if (form.description.trim().length < 10) {
      toast.error(
        'Event description must contain at least 10 characters'
      );
      return false;
    }

    if (!form.category) {
      toast.error('Please select a category');
      return false;
    }

    if (!form.eventType) {
      toast.error('Please select an event type');
      return false;
    }

    if (!form.city) {
      toast.error('Please select a city');
      return false;
    }

    if (!form.venue.trim()) {
      toast.error('Venue is required');
      return false;
    }

    if (!form.date) {
      toast.error('Event date is required');
      return false;
    }

    if (!form.startTime || !form.endTime) {
      toast.error('Start and end time are required');
      return false;
    }

    if (form.endTime <= form.startTime) {
      toast.error('End time must be after start time');
      return false;
    }

    if (Number(form.capacity) < 1) {
      toast.error('Capacity must be at least 1');
      return false;
    }

    if (!form.registrationStart) {
      toast.error('Registration start date is required');
      return false;
    }

    if (!form.registrationEnd) {
      toast.error('Registration end date is required');
      return false;
    }

    if (form.registrationEnd < form.registrationStart) {
      toast.error(
        'Registration end date cannot be before registration start date'
      );
      return false;
    }

    if (!form.ticketTypes.length) {
      toast.error('At least one ticket type is required');
      return false;
    }

    for (const ticket of form.ticketTypes) {
      if (!ticket.name.trim()) {
        toast.error('Every ticket must have a name');
        return false;
      }

      if (Number(ticket.price) < 0) {
        toast.error('Ticket price cannot be negative');
        return false;
      }

      if (Number(ticket.capacity) < 0) {
        toast.error('Ticket capacity cannot be negative');
        return false;
      }
    }

    return true;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),

        description: form.description.trim(),

        category: form.category,

        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),

        eventType: form.eventType,

        city: form.city,

        venue: form.venue.trim(),

        date: dateToISO(form.date),

        startTime: form.startTime,

        endTime: form.endTime,

        capacity: Number(form.capacity),

        registrationStart: dateToISO(
          form.registrationStart
        ),

        registrationEnd: dateToISO(
          form.registrationEnd
        ),

        language: form.language,

        visibility: form.visibility,

        ticketTypes: form.ticketTypes.map((ticket) => ({
          name: ticket.name.trim(),
          price: Number(ticket.price),
          capacity: Number(ticket.capacity),
        })),
      };

      console.log('=================================');
      console.log('EVENT PAYLOAD');
      console.log(payload);
      console.log('=================================');

      if (isEdit) {
        const response = await api.put(
          `/events/${id}`,
          payload
        );

        console.log(
          'EVENT UPDATE RESPONSE:',
          response.data
        );

        toast.success('Event updated successfully');
      } else {
        const response = await api.post(
          '/events',
          payload
        );

        console.log(
          'EVENT CREATE RESPONSE:',
          response.data
        );

        toast.success(
          'Event created as draft. Submit it for approval when ready.'
        );
      }

      navigate('/organizer/events');
    } catch (error) {
      console.error('=================================');
      console.error('EVENT CREATE/UPDATE ERROR');
      console.error('=================================');

      console.error('Error:', error);

      console.error(
        'Status:',
        error.response?.status
      );

      console.error(
        'Backend response:',
        error.response?.data
      );

      console.error(
        'Backend message:',
        error.response?.data?.message
      );

      console.error(
        'Validation errors:',
        error.response?.data?.errors
      );

      const backendData = error.response?.data;

      if (
        backendData?.errors &&
        Array.isArray(backendData.errors)
      ) {
        backendData.errors.forEach((validationError) => {
          console.error(
            `${validationError.field}: ${validationError.message}`
          );
        });

        toast.error(
          backendData.errors
            .map(
              (validationError) =>
                `${validationError.field}: ${validationError.message}`
            )
            .join(', ')
        );
      } else {
        toast.error(
          backendData?.message ||
            backendData?.error ||
            apiErrorMessage(error) ||
            'Failed to save event'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && eventLoading) {
    return <Loading />;
  }

  if (isEdit && eventError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-red-400">
            Failed to load event
          </h2>

          <p className="mt-2 text-slate-400">
            {apiErrorMessage(eventError)}
          </p>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    console.error(
      'CATEGORY ERROR:',
      categoriesError
    );
  }

  const categories = catData?.categories || [];

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">
          {isEdit ? 'Edit Event' : 'Create Event'}
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          {isEdit
            ? 'Update your event information.'
            : 'Create your event as a draft.'}
        </p>
      </div>

      {/* BASIC INFORMATION */}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">
          Basic Information
        </h2>

        <div>
          <label className="text-sm text-slate-400">
            Title
          </label>

          <input
            required
            minLength={3}
            className="input mt-1"
            value={form.title}
            onChange={(e) =>
              updateForm('title', e.target.value)
            }
            placeholder="Enter event title"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Description
          </label>

          <textarea
            required
            minLength={10}
            rows={4}
            className="input mt-1"
            value={form.description}
            onChange={(e) =>
              updateForm(
                'description',
                e.target.value
              )
            }
            placeholder="Describe your event"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Category
            </label>

            <select
              required
              className="input mt-1"
              value={form.category}
              onChange={(e) =>
                updateForm(
                  'category',
                  e.target.value
                )
              }
            >
              <option value="">
                Select category
              </option>

              {categories.map((category) => (
                <option
                  key={
                    category._id ||
                    category.slug
                  }
                  value={category.slug}
                >
                  {category.name}
                </option>
              ))}
            </select>

            {categoriesLoading && (
              <p className="text-xs text-slate-500 mt-1">
                Loading categories...
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Event Type
            </label>

            <select
              className="input mt-1"
              value={form.eventType}
              onChange={(e) =>
                updateForm(
                  'eventType',
                  e.target.value
                )
              }
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Tags
          </label>

          <input
            className="input mt-1"
            value={form.tags}
            onChange={(e) =>
              updateForm('tags', e.target.value)
            }
            placeholder="ai, networking, career"
          />

          <p className="text-xs text-slate-500 mt-1">
            Separate multiple tags using commas.
          </p>
        </div>
      </div>

      {/* LOCATION */}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">
          Location
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              City
            </label>

            <select
              className="input mt-1"
              value={form.city}
              onChange={(e) =>
                updateForm(
                  'city',
                  e.target.value
                )
              }
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Venue
            </label>

            <input
              required
              className="input mt-1"
              value={form.venue}
              onChange={(e) =>
                updateForm(
                  'venue',
                  e.target.value
                )
              }
              placeholder="Event venue"
            />
          </div>
        </div>
      </div>

      {/* DATE AND TIME */}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">
          Date & Time
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Event Date
            </label>

            <input
              required
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(e) =>
                updateForm(
                  'date',
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Start Time
            </label>

            <input
              required
              type="time"
              className="input mt-1"
              value={form.startTime}
              onChange={(e) =>
                updateForm(
                  'startTime',
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm text-slate-400">
              End Time
            </label>

            <input
              required
              type="time"
              className="input mt-1"
              value={form.endTime}
              onChange={(e) =>
                updateForm(
                  'endTime',
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* REGISTRATION */}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">
          Registration
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Capacity
            </label>

            <input
              required
              type="number"
              min={1}
              className="input mt-1"
              value={form.capacity}
              onChange={(e) =>
                updateForm(
                  'capacity',
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Registration Start
            </label>

            <input
              required
              type="date"
              className="input mt-1"
              value={form.registrationStart}
              onChange={(e) =>
                updateForm(
                  'registrationStart',
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Registration End
            </label>

            <input
              required
              type="date"
              className="input mt-1"
              value={form.registrationEnd}
              onChange={(e) =>
                updateForm(
                  'registrationEnd',
                  e.target.value
                )
              }
            />
          </div>
        </div>
      </div>

      {/* SETTINGS */}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">
          Event Settings
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Language
            </label>

            <select
              className="input mt-1"
              value={form.language}
              onChange={(e) =>
                updateForm(
                  'language',
                  e.target.value
                )
              }
            >
              <option value="English">
                English
              </option>

              <option value="Nepali">
                Nepali
              </option>

              <option value="Both">
                Both
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Visibility
            </label>

            <select
              className="input mt-1"
              value={form.visibility}
              onChange={(e) =>
                updateForm(
                  'visibility',
                  e.target.value
                )
              }
            >
              <option value="public">
                Public
              </option>

              <option value="private">
                Private
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* TICKET TYPES */}

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              Ticket Types
            </h2>

            <p className="text-xs text-slate-500">
              Add at least one ticket type.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1"
            onClick={addTicket}
          >
            <Plus size={14} />
            Add ticket type
          </button>
        </div>

        {form.ticketTypes.map(
          (ticket, index) => (
            <div
              key={index}
              className="grid grid-cols-4 gap-2 items-center"
            >
              <input
                required
                className="input"
                placeholder="Name"
                value={ticket.name}
                onChange={(e) =>
                  updateTicket(index, {
                    name: e.target.value,
                  })
                }
              />

              <input
                required
                type="number"
                min={0}
                className="input"
                placeholder="Price"
                value={ticket.price}
                onChange={(e) =>
                  updateTicket(index, {
                    price: e.target.value,
                  })
                }
              />

              <input
                required
                type="number"
                min={0}
                className="input"
                placeholder="Capacity"
                value={ticket.capacity}
                onChange={(e) =>
                  updateTicket(index, {
                    capacity: e.target.value,
                  })
                }
              />

              {form.ticketTypes.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    removeTicket(index)
                  }
                  className="text-red-400 justify-self-start"
                  title="Remove ticket"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <div />
              )}
            </div>
          )
        )}
      </div>

      {/* SUBMIT */}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={saving}
      >
        {saving
          ? 'Saving...'
          : isEdit
          ? 'Save changes'
          : 'Create event (draft)'}
      </button>
    </form>
  );
}