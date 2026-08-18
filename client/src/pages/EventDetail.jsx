import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Users,
} from 'lucide-react';

import { api, apiErrorMessage } from '../api/client.js';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] =
    useState(null);

  const [quantity, setQuantity] = useState(1);

  /*
   * =====================================================
   * GET EVENT
   * =====================================================
   */

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['event', id],

    queryFn: async () => {
      const response = await api.get(
        `/events/${id}`
      );

      return response.data;
    },

    enabled: Boolean(id),
  });

  /*
   * =====================================================
   * SET FIRST TICKET
   * =====================================================
   */

  useEffect(() => {
    const tickets = data?.event?.ticketTypes;

    if (
      Array.isArray(tickets) &&
      tickets.length > 0
    ) {
      if (!selectedTicket) {
        setSelectedTicket(tickets[0]._id);
        setQuantity(1);
      }
    }
  }, [data, selectedTicket]);

  /*
   * =====================================================
   * CURRENT EVENT
   * =====================================================
   */

  const event = data?.event;

  /*
   * =====================================================
   * CURRENT TICKET
   * =====================================================
   */

  const ticket = event?.ticketTypes?.find(
    (item) =>
      String(item._id) ===
      String(selectedTicket)
  );

  /*
   * =====================================================
   * REMAINING TICKETS
   * =====================================================
   */

  const remaining = ticket
    ? Math.max(
        0,
        Number(ticket.capacity || 0) -
          Number(ticket.sold || 0)
      )
    : 0;

  /*
   * =====================================================
   * REGISTRATION
   * =====================================================
   */

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error(
          'Please log in to register.'
        );
      }

      if (!event) {
        throw new Error(
          'Event information is unavailable.'
        );
      }

      if (!selectedTicket) {
        throw new Error(
          'Please select a ticket type.'
        );
      }

      if (!ticket) {
        throw new Error(
          'Selected ticket is no longer available.'
        );
      }

      const numericQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          numericQuantity
        ) ||
        numericQuantity < 1
      ) {
        throw new Error(
          'Quantity must be at least 1.'
        );
      }

      if (
        numericQuantity > 10
      ) {
        throw new Error(
          'You can register for a maximum of 10 tickets.'
        );
      }

      if (
        numericQuantity > remaining
      ) {
        throw new Error(
          `Only ${remaining} ticket(s) remaining.`
        );
      }

      /*
       * This is exactly the payload expected by
       * POST /api/registrations.
       */
      const payload = {
        eventId: id,
        ticketTypeId: selectedTicket,
        quantity: numericQuantity,
      };

      console.log(
        '================================='
      );

      console.log(
        'REGISTRATION REQUEST'
      );

      console.log(
        '================================='
      );

      console.log(
        'URL:',
        '/api/registrations'
      );

      console.log(
        'PAYLOAD:',
        payload
      );

      const response = await api.post(
        '/registrations',
        payload
      );

      return response;
    },

    onSuccess: (response) => {
      console.log(
        'REGISTRATION SUCCESS:',
        response.data
      );

      const registration =
        response.data?.registration;

      if (!registration) {
        toast.success(
          'Registration successful!'
        );

        queryClient.invalidateQueries({
          queryKey: ['event', id],
        });

        return;
      }

      /*
       * Free event
       */
      if (
        registration.status ===
        'CONFIRMED'
      ) {
        toast.success(
          'Registered! Your free ticket is ready.'
        );

        queryClient.invalidateQueries({
          queryKey: ['event', id],
        });

        navigate('/my-tickets');

        return;
      }

      /*
       * Paid event
       */
      toast.success(
        'Registration created. Proceed to payment.'
      );

      queryClient.invalidateQueries({
        queryKey: ['event', id],
      });

      navigate(
        `/checkout/${registration._id}`
      );
    },

    onError: (error) => {
      console.error(
        '================================='
      );

      console.error(
        'REGISTRATION ERROR'
      );

      console.error(
        '================================='
      );

      console.error(
        'STATUS:',
        error.response?.status
      );

      console.error(
        'RESPONSE:',
        error.response?.data
      );

      console.error(
        'MESSAGE:',
        error.response?.data?.message
      );

      console.error(
        'ERRORS:',
        error.response?.data?.errors
      );

      console.error(
        'FULL ERROR:',
        error
      );

      const backendData =
        error.response?.data;

      /*
       * Zod validation errors
       */
      if (
        backendData?.errors &&
        Array.isArray(
          backendData.errors
        )
      ) {
        const messages =
          backendData.errors.map(
            (item) => {
              if (
                typeof item ===
                'string'
              ) {
                return item;
              }

              const field =
                item.field ||
                item.path ||
                'Field';

              const message =
                item.message ||
                'Invalid value';

              return `${field}: ${message}`;
            }
          );

        toast.error(
          messages.join(', ')
        );

        return;
      }

      /*
       * Normal backend error
       */
      toast.error(
        backendData?.message ||
          backendData?.error ||
          apiErrorMessage(error) ||
          'Registration failed.'
      );
    },
  });

  /*
   * =====================================================
   * FAVORITE
   * =====================================================
   */

  const favoriteMutation =
    useMutation({
      mutationFn: async () => {
        return api.post(
          `/events/${id}/favorite`
        );
      },

      onSuccess: (response) => {
        console.log(
          'FAVORITE RESPONSE:',
          response.data
        );

        toast.success(
          'Favorites updated'
        );
      },

      onError: (error) => {
        console.error(
          'FAVORITE ERROR:',
          error.response?.data ||
            error
        );

        toast.error(
          apiErrorMessage(error)
        );
      },
    });

  /*
   * =====================================================
   * QUANTITY
   * =====================================================
   */

  const updateQuantity = (value) => {
    let newQuantity =
      Number(value);

    if (
      !Number.isInteger(
        newQuantity
      ) ||
      newQuantity < 1
    ) {
      newQuantity = 1;
    }

    const maximum =
      Math.min(10, remaining);

    if (
      maximum > 0 &&
      newQuantity > maximum
    ) {
      newQuantity = maximum;
    }

    setQuantity(newQuantity);
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (isLoading) {
    return <Loading />;
  }

  /*
   * =====================================================
   * EVENT ERROR
   * =====================================================
   */

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <div className="card p-6 text-center">
          <h2 className="text-xl font-bold text-red-400">
            Failed to load event
          </h2>

          <p className="text-slate-400 mt-2">
            {apiErrorMessage(error)}
          </p>

          <button
            className="btn-primary mt-5"
            onClick={() =>
              navigate(-1)
            }
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * EVENT NOT FOUND
   * =====================================================
   */

  if (!event) {
    return (
      <p className="text-center text-slate-400 py-20">
        Event not found.
      </p>
    );
  }

  /*
   * =====================================================
   * STATUS
   * =====================================================
   */

  const isPublished =
    event.status ===
    'PUBLISHED';

  /*
   * =====================================================
   * REGISTRATION DATES
   * =====================================================
   */

  const now = new Date();

  const registrationStart =
    event.registrationStart
      ? new Date(
          event.registrationStart
        )
      : null;

  const registrationEnd =
    event.registrationEnd
      ? new Date(
          event.registrationEnd
        )
      : null;

  const beforeRegistration =
    registrationStart &&
    now < registrationStart;

  const afterRegistration =
    registrationEnd &&
    now > registrationEnd;

  const registrationClosed =
    beforeRegistration ||
    afterRegistration;

  /*
   * =====================================================
   * TOTAL PRICE
   * =====================================================
   */

  const totalPrice = ticket
    ? Number(ticket.price || 0) *
      Number(quantity || 1)
    : 0;

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="lg:col-span-2 space-y-6">
        {/* EVENT IMAGE */}

        <div className="h-64 rounded-2xl bg-gradient-to-br from-brand-700 via-purple-700 to-slate-900 flex items-center justify-center overflow-hidden">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/50">
              No image
            </span>
          )}
        </div>

        {/* EVENT INFORMATION */}

        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge bg-brand-500/20 text-brand-300">
              {event.eventType}
            </span>

            <span className="badge bg-slate-800 text-slate-300">
              {event.category}
            </span>

            {event.avgRating > 0 && (
              <span className="badge bg-amber-500/20 text-amber-300 flex items-center gap-1">
                <Star
                  size={12}
                  fill="currentColor"
                />

                {Number(
                  event.avgRating
                ).toFixed(1)}

                ({event.ratingCount})
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-3">
            {event.title}
          </h1>

          {/* DETAILS */}

          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <MapPin size={14} />

              {event.venue},{' '}
              {event.city}
            </span>

            <span className="flex items-center gap-1">
              <Calendar size={14} />

              {new Date(
                event.date
              ).toDateString()}
            </span>

            <span className="flex items-center gap-1">
              <Clock size={14} />

              {event.startTime} -{' '}
              {event.endTime}
            </span>

            <span className="flex items-center gap-1">
              <Users size={14} />

              {event.capacity}{' '}
              capacity
            </span>
          </div>

          {/* DESCRIPTION */}

          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>

          {/* TAGS */}

          {event.tags?.length >
            0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {event.tags.map(
                (tag) => (
                  <span
                    key={tag}
                    className="badge bg-slate-800 text-slate-400"
                  >
                    #{tag}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">
            Get your ticket
          </h3>

          {/* EVENT NOT PUBLISHED */}

          {!isPublished && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
              This event is not currently
              available for registration.
            </div>
          )}

          {/* REGISTRATION CLOSED */}

          {isPublished &&
            registrationClosed && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                Registration is currently
                closed.
              </div>
            )}

          {/* TICKETS */}

          <div className="space-y-2">
            {event.ticketTypes?.length >
            0 ? (
              event.ticketTypes.map(
                (item) => {
                  const available =
                    Math.max(
                      0,
                      Number(
                        item.capacity ||
                          0
                      ) -
                        Number(
                          item.sold ||
                            0
                        )
                    );

                  const soldOut =
                    available <= 0;

                  return (
                    <button
                      type="button"
                      key={item._id}
                      disabled={
                        soldOut ||
                        registerMutation.isPending
                      }
                      onClick={() => {
                        setSelectedTicket(
                          item._id
                        );

                        setQuantity(
                          1
                        );
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedTicket ===
                        item._id
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      } ${
                        soldOut
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {item.name}
                        </span>

                        <span>
                          {Number(
                            item.price
                          ) === 0
                            ? 'Free'
                            : `NPR ${Number(
                                item.price
                              ).toLocaleString()}`
                          }
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {soldOut
                          ? 'Sold out'
                          : `${available} of ${item.capacity} remaining`}
                      </p>
                    </button>
                  );
                }
              )
            ) : (
              <p className="text-sm text-slate-500">
                No ticket types available.
              </p>
            )}
          </div>

          {/* QUANTITY */}

          {ticket && remaining > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">
                  Quantity
                </label>

                <span className="text-xs text-slate-500">
                  Max 10
                </span>
              </div>

              <input
                type="number"
                min={1}
                max={Math.min(
                  10,
                  remaining
                )}
                value={quantity}
                onChange={(e) =>
                  updateQuantity(
                    e.target.value
                  )
                }
                className="input w-full"
              />
            </div>
          )}

          {/* TOTAL */}

          {ticket && (
            <div className="border-t border-slate-800 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Total
                </span>

                <span className="font-semibold">
                  {totalPrice === 0
                    ? 'Free'
                    : `NPR ${totalPrice.toLocaleString()}`}
                </span>
              </div>
            </div>
          )}

          {/* REGISTER */}

          {user ? (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={
                !ticket ||
                remaining < 1 ||
                !isPublished ||
                registrationClosed ||
                registerMutation.isPending
              }
              onClick={() =>
                registerMutation.mutate()
              }
            >
              {!isPublished
                ? 'Registration unavailable'
                : registrationClosed
                ? 'Registration closed'
                : remaining < 1
                ? 'Sold out'
                : registerMutation.isPending
                ? 'Processing...'
                : totalPrice === 0
                ? 'Register for free'
                : 'Register & Continue'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() =>
                navigate('/login')
              }
            >
              Log in to register
            </button>
          )}

          {/* FAVORITE */}

          {user && (
            <button
              type="button"
              onClick={() =>
                favoriteMutation.mutate()
              }
              disabled={
                favoriteMutation.isPending
              }
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Heart size={16} />

              {favoriteMutation.isPending
                ? 'Updating...'
                : 'Save to favorites'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}