import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
} from 'lucide-react';

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

function toInputDate(d) {
  return d
    ? new Date(d).toISOString().slice(0, 10)
    : '';
}

function getImageUrl(image) {
  if (!image) return '';

  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }

  const apiBase =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api';

  const serverBase =
    apiBase.replace(/\/api\/?$/, '');

  return `${serverBase}${image.startsWith('/') ? '' : '/'}${image}`;
}

export default function CreateEditEvent() {
  const { id } = useParams();

  const isEdit = Boolean(id);

  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const { data: catData } = useQuery({
    queryKey: ['categories'],

    queryFn: () =>
      api
        .get('/categories')
        .then((r) => r.data),
  });

  const {
    data: existing,
    isLoading,
  } = useQuery({
    queryKey: ['event', id],

    queryFn: () =>
      api
        .get(`/events/${id}`)
        .then((r) => r.data),

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

    ticketTypes: [emptyTicket],
  });

  const [imageFile, setImageFile] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  // -------------------------------------------------------
  // LOAD EXISTING EVENT
  // -------------------------------------------------------

  useEffect(() => {
    if (existing?.event) {
      const e = existing.event;

      setForm({
        title: e.title || '',

        description:
          e.description || '',

        category:
          e.category || '',

        tags: (e.tags || []).join(', '),

        eventType:
          e.eventType || 'Workshop',

        city:
          e.city || 'Kathmandu',

        venue:
          e.venue || '',

        date:
          toInputDate(e.date),

        startTime:
          e.startTime || '18:00',

        endTime:
          e.endTime || '20:00',

        capacity:
          e.capacity || 100,

        registrationStart:
          toInputDate(
            e.registrationStart
          ),

        registrationEnd:
          toInputDate(
            e.registrationEnd
          ),

        language:
          e.language || 'English',

        visibility:
          e.visibility || 'public',

        ticketTypes:
          e.ticketTypes?.length
            ? e.ticketTypes.map(
                (t) => ({
                  name: t.name,
                  price: t.price,
                  capacity:
                    t.capacity,
                })
              )
            : [emptyTicket],
      });

      if (e.image) {
        setImagePreview(
          getImageUrl(e.image)
        );
      }
    }
  }, [existing]);

  // -------------------------------------------------------
  // CLEANUP IMAGE PREVIEW
  // -------------------------------------------------------

  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  if (isEdit && isLoading) {
    return <Loading />;
  }

  // -------------------------------------------------------
  // IMAGE SELECT
  // -------------------------------------------------------

  const handleImageChange = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      toast.error(
        'Please select a JPG, PNG, WEBP or GIF image.'
      );

      e.target.value = '';

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        'Image must be smaller than 5 MB.'
      );

      e.target.value = '';

      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // -------------------------------------------------------
  // REMOVE IMAGE
  // -------------------------------------------------------

  const removeImage = () => {
    setImageFile(null);

    setImagePreview('');

    if (fileInputRef.current) {
      fileInputRef.current.value =
        '';
    }
  };

  // -------------------------------------------------------
  // UPDATE TICKET
  // -------------------------------------------------------

  const updateTicket = (
    idx,
    patch
  ) => {
    setForm((f) => ({
      ...f,

      ticketTypes:
        f.ticketTypes.map(
          (t, i) =>
            i === idx
              ? {
                  ...t,
                  ...patch,
                }
              : t
        ),
    }));
  };

  // -------------------------------------------------------
  // SUBMIT
  // -------------------------------------------------------

  const submit = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      const formData =
        new FormData();

      // Basic event fields
      formData.append(
        'title',
        form.title
      );

      formData.append(
        'description',
        form.description
      );

      formData.append(
        'category',
        form.category
      );

      formData.append(
        'tags',
        JSON.stringify(
          form.tags
            .split(',')
            .map(
              (t) => t.trim()
            )
            .filter(Boolean)
        )
      );

      formData.append(
        'eventType',
        form.eventType
      );

      formData.append(
        'city',
        form.city
      );

      formData.append(
        'venue',
        form.venue
      );

      formData.append(
        'date',
        form.date
      );

      formData.append(
        'startTime',
        form.startTime
      );

      formData.append(
        'endTime',
        form.endTime
      );

      formData.append(
        'capacity',
        String(
          Number(form.capacity)
        )
      );

      formData.append(
        'registrationStart',
        form.registrationStart
      );

      formData.append(
        'registrationEnd',
        form.registrationEnd
      );

      formData.append(
        'language',
        form.language
      );

      formData.append(
        'visibility',
        form.visibility
      );

      // Ticket types
      const ticketTypes =
        form.ticketTypes.map(
          (ticket) => ({
            name: ticket.name,

            price: Number(
              ticket.price
            ),

            capacity: Number(
              ticket.capacity
            ),
          })
        );

      formData.append(
        'ticketTypes',
        JSON.stringify(
          ticketTypes
        )
      );

      // Image
      if (imageFile) {
        formData.append(
          'image',
          imageFile
        );
      }

      if (isEdit) {
        await api.put(
          `/events/${id}`,
          formData
        );

        toast.success(
          'Event updated successfully.'
        );
      } else {
        await api.post(
          '/events',
          formData
        );

        toast.success(
          'Event created as draft. Publish it from "My Events" whenever you\'re ready.'
        );
      }

      navigate(
        '/organizer/events'
      );
    } catch (err) {
      console.error(
        'Event save error:',
        err
      );

      toast.error(
        apiErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  };

  const categories =
    catData?.categories || [];

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl mx-auto space-y-6 pb-10"
    >
      <h1 className="text-2xl font-bold">
        {isEdit
          ? 'Edit Event'
          : 'Create Event'}
      </h1>

      {/* ------------------------------------------------ */}
      {/* EVENT IMAGE */}
      {/* ------------------------------------------------ */}

      <div className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">
            Event Image
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Upload a cover image for your
            event. Maximum size is 5 MB.
          </p>
        </div>

        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Event preview"
              className="w-full h-64 object-cover rounded-xl border border-slate-700"
            />

            <button
              type="button"
              onClick={removeImage}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
              title="Remove image"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="w-full h-56 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-400 transition"
          >
            <ImageIcon size={42} />

            <div className="text-center">
              <p className="font-medium">
                Click to upload event image
              </p>

              <p className="text-xs mt-1">
                JPG, PNG, WEBP or GIF
              </p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          className="hidden"
        />

        {imageFile && (
          <div className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm">
            <span className="truncate">
              {imageFile.name}
            </span>

            <span className="text-slate-400 ml-3">
              {(
                imageFile.size /
                1024 /
                1024
              ).toFixed(2)}{' '}
              MB
            </span>
          </div>
        )}

        {!imagePreview && (
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="btn-secondary w-full"
          >
            Choose Image
          </button>
        )}
      </div>

      {/* ------------------------------------------------ */}
      {/* BASIC EVENT DETAILS */}
      {/* ------------------------------------------------ */}

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm text-slate-400">
            Title
          </label>

          <input
            required
            className="input mt-1"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Description
          </label>

          <textarea
            required
            rows={4}
            className="input mt-1"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
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
                setForm({
                  ...form,
                  category:
                    e.target.value,
                })
              }
            >
              <option value="">
                Select
              </option>

              {categories.map(
                (c) => (
                  <option
                    key={c.slug}
                    value={c.slug}
                  >
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">
              Event Type
            </label>

            <select
              className="input mt-1"
              value={form.eventType}
              onChange={(e) =>
                setForm({
                  ...form,
                  eventType:
                    e.target.value,
                })
              }
            >
              {EVENT_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Tags (comma separated)
          </label>

          <input
            className="input mt-1"
            value={form.tags}
            onChange={(e) =>
              setForm({
                ...form,
                tags: e.target.value,
              })
            }
            placeholder="ai, networking, career"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              City
            </label>

            <select
              className="input mt-1"
              value={form.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  city: e.target.value,
                })
              }
            >
              {CITIES.map(
                (city) => (
                  <option
                    key={city}
                    value={city}
                  >
                    {city}
                  </option>
                )
              )}
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
                setForm({
                  ...form,
                  venue: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Date
            </label>

            <input
              required
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date: e.target.value,
                })
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
                setForm({
                  ...form,
                  startTime:
                    e.target.value,
                })
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
                setForm({
                  ...form,
                  endTime:
                    e.target.value,
                })
              }
            />
          </div>
        </div>

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
                setForm({
                  ...form,
                  capacity:
                    e.target.value,
                })
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
              value={
                form.registrationStart
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  registrationStart:
                    e.target.value,
                })
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
              value={
                form.registrationEnd
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  registrationEnd:
                    e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">
              Language
            </label>

            <select
              className="input mt-1"
              value={form.language}
              onChange={(e) =>
                setForm({
                  ...form,
                  language:
                    e.target.value,
                })
              }
            >
              <option>
                English
              </option>

              <option>
                Nepali
              </option>

              <option>
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
              value={
                form.visibility
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  visibility:
                    e.target.value,
                })
              }
            >
              <option value="public">
                Public — shows up in
                search & browse
              </option>

              <option value="private">
                Private — only visible
                via direct link
              </option>
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          No admin approval is needed —
          publishing an event makes it
          live immediately.
        </p>
      </div>

      {/* ------------------------------------------------ */}
      {/* TICKET TYPES */}
      {/* ------------------------------------------------ */}

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            Ticket Types
          </h3>

          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1"
            onClick={() =>
              setForm((f) => ({
                ...f,

                ticketTypes: [
                  ...f.ticketTypes,

                  {
                    ...emptyTicket,
                    name: 'VIP',
                  },
                ],
              }))
            }
          >
            <Plus size={14} />

            Add ticket type
          </button>
        </div>

        {form.ticketTypes.map(
          (ticket, idx) => (
            <div
              key={idx}
              className="grid grid-cols-4 gap-2 items-center"
            >
              <input
                className="input"
                placeholder="Name (e.g. VIP)"
                value={ticket.name}
                onChange={(e) =>
                  updateTicket(
                    idx,
                    {
                      name:
                        e.target.value,
                    }
                  )
                }
              />

              <input
                type="number"
                min={0}
                className="input"
                placeholder="Price"
                value={ticket.price}
                onChange={(e) =>
                  updateTicket(
                    idx,
                    {
                      price:
                        e.target.value,
                    }
                  )
                }
              />

              <input
                type="number"
                min={1}
                className="input"
                placeholder="Capacity"
                value={
                  ticket.capacity
                }
                onChange={(e) =>
                  updateTicket(
                    idx,
                    {
                      capacity:
                        e.target.value,
                    }
                  )
                }
              />

              {form.ticketTypes
                .length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,

                      ticketTypes:
                        f.ticketTypes.filter(
                          (_, i) =>
                            i !== idx
                        ),
                    }))
                  }
                  className="text-red-400 justify-self-start"
                >
                  <Trash2
                    size={16}
                  />
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* ------------------------------------------------ */}
      {/* SUBMIT */}
      {/* ------------------------------------------------ */}

      <button
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