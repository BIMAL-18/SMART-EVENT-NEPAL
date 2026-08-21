import fs from 'fs';
import path from 'path';

import Event from '../models/Event.js';
import Interaction from '../models/Interaction.js';
import { logAction } from '../services/auditService.js';


// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function parseBoolean(value) {
  if (value === undefined || value === null) return undefined;

  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  return undefined;
}

function parseNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function parseJSON(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function deleteImageFile(imageUrl) {
  if (!imageUrl) return;

  try {
    // Only delete locally stored event images
    if (!imageUrl.startsWith('/uploads/events/')) {
      return;
    }

    const relativePath = imageUrl.replace(/^\/+/, '');

    const filePath = path.join(
      process.cwd(),
      relativePath
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      '[image] Failed to delete image:',
      error.message
    );
  }
}

function normalizeTicketTypes(ticketTypes) {
  if (!Array.isArray(ticketTypes)) {
    return [];
  }

  return ticketTypes.map((ticket) => ({
    name: String(ticket.name || '').trim(),
    price: Number(ticket.price) || 0,
    capacity: Number(ticket.capacity) || 0,

    ...(ticket.saleStart
      ? { saleStart: new Date(ticket.saleStart) }
      : {}),

    ...(ticket.saleEnd
      ? { saleEnd: new Date(ticket.saleEnd) }
      : {}),
  }));
}

function buildEventPayload(req) {
  const body = req.body || {};

  let tags = body.tags;

  if (typeof tags === 'string') {
    tags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(tags)) {
    tags = [];
  }

  let ticketTypes = body.ticketTypes;

  if (typeof ticketTypes === 'string') {
    ticketTypes = parseJSON(ticketTypes, []);
  }

  ticketTypes = normalizeTicketTypes(ticketTypes);

  let location = body.location;

  if (typeof location === 'string') {
    location = parseJSON(location, undefined);
  }

  const payload = {
    title: body.title,
    description: body.description,

    category: body.category,

    tags,

    eventType: body.eventType,

    city: body.city,

    venue: body.venue,

    location,

    date: body.date
      ? new Date(body.date)
      : undefined,

    startTime: body.startTime,

    endTime: body.endTime,

    capacity: parseNumber(body.capacity),

    ticketTypes,

    registrationStart: body.registrationStart
      ? new Date(body.registrationStart)
      : undefined,

    registrationEnd: body.registrationEnd
      ? new Date(body.registrationEnd)
      : undefined,

    language: body.language || 'English',

    visibility: body.visibility || 'public',
  };

  // -------------------------------------------------------
  // IMAGE
  // -------------------------------------------------------

  if (req.file) {
    payload.image = `/uploads/events/${req.file.filename}`;
  }

  return payload;
}


// ---------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------

export function validateCreateEvent(req, res, next) {
  try {
    const body = req.body || {};

    const payload = buildEventPayload(req);

    const errors = [];

    if (!payload.title || payload.title.length < 3) {
      errors.push('Title must be at least 3 characters.');
    }

    if (
      !payload.description ||
      payload.description.length < 10
    ) {
      errors.push(
        'Description must be at least 10 characters.'
      );
    }

    if (!payload.category) {
      errors.push('Category is required.');
    }

    if (!payload.eventType) {
      errors.push('Event type is required.');
    }

    if (!payload.city) {
      errors.push('City is required.');
    }

    if (!payload.venue) {
      errors.push('Venue is required.');
    }

    if (
      !payload.date ||
      Number.isNaN(payload.date.getTime())
    ) {
      errors.push('Valid event date is required.');
    }

    if (!payload.startTime) {
      errors.push('Start time is required.');
    }

    if (!payload.endTime) {
      errors.push('End time is required.');
    }

    if (
      !Number.isFinite(payload.capacity) ||
      payload.capacity < 1
    ) {
      errors.push('Capacity must be at least 1.');
    }

    if (!payload.ticketTypes.length) {
      errors.push('At least one ticket type is required.');
    }

    for (const ticket of payload.ticketTypes) {
      if (!ticket.name) {
        errors.push('Every ticket type needs a name.');
      }

      if (
        !Number.isFinite(ticket.price) ||
        ticket.price < 0
      ) {
        errors.push(
          'Ticket price must be 0 or greater.'
        );
      }

      if (
        !Number.isFinite(ticket.capacity) ||
        ticket.capacity < 0
      ) {
        errors.push(
          'Ticket capacity must be 0 or greater.'
        );
      }
    }

    if (
      !payload.registrationStart ||
      Number.isNaN(
        payload.registrationStart.getTime()
      )
    ) {
      errors.push(
        'Registration start date is required.'
      );
    }

    if (
      !payload.registrationEnd ||
      Number.isNaN(
        payload.registrationEnd.getTime()
      )
    ) {
      errors.push(
        'Registration end date is required.'
      );
    }

    if (
      payload.registrationStart &&
      payload.registrationEnd &&
      payload.registrationStart > payload.registrationEnd
    ) {
      errors.push(
        'Registration start cannot be after registration end.'
      );
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors,
      });
    }

    req.eventPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}

export function validateUpdateEvent(req, res, next) {
  try {
    const payload = buildEventPayload(req);

    req.eventPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}


// ---------------------------------------------------------
// CREATE EVENT
// ---------------------------------------------------------

export async function createEvent(req, res, next) {
  try {
    const payload = {
      ...(req.eventPayload || buildEventPayload(req)),

      organizer: req.user._id,

      status: 'DRAFT',
    };

    const event = await Event.create(payload);

    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'EVENT_CREATED',
      targetType: 'Event',
      targetId: event._id,
    });

    res.status(201).json({
      event,
    });
  } catch (err) {
    // If DB creation fails, remove uploaded image
    if (req.file) {
      deleteImageFile(
        `/uploads/events/${req.file.filename}`
      );
    }

    next(err);
  }
}


// ---------------------------------------------------------
// PUBLISH EVENT
// ---------------------------------------------------------

export async function publishEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    if (
      !['DRAFT', 'PENDING_APPROVAL'].includes(
        event.status
      )
    ) {
      return res.status(400).json({
        message: `Cannot publish an event with status ${event.status}`,
      });
    }

    event.status = 'PUBLISHED';

    await event.save();

    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'EVENT_PUBLISHED',
      targetType: 'Event',
      targetId: event._id,
    });

    res.json({
      event,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// COMPLETE EVENT
// ---------------------------------------------------------

export async function completeEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({
        message:
          `Only a PUBLISHED event can be marked completed ` +
          `(current status: ${event.status})`,
      });
    }

    event.status = 'COMPLETED';

    await event.save();

    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'EVENT_COMPLETED',
      targetType: 'Event',
      targetId: event._id,
    });

    const {
      issueCertificatesForCompletedEvent,
    } = await import(
      './certificateController.js'
    );

    const certResult =
      await issueCertificatesForCompletedEvent(
        event
      );

    res.json({
      event,
      certificatesIssued:
        certResult.issuedCount,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// UPDATE EVENT
// ---------------------------------------------------------

export async function updateEvent(req, res, next) {
  try {
    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message:
          'You can only edit your own events',
      });
    }

    const oldImage = event.image;

    const payload =
      req.eventPayload || buildEventPayload(req);

    // Don't overwrite existing image if no new image
    // was uploaded.
    if (!req.file) {
      delete payload.image;
    }

    Object.assign(event, payload);

    await event.save();

    // Delete old image after successful DB update
    if (
      req.file &&
      oldImage &&
      oldImage !== event.image
    ) {
      deleteImageFile(oldImage);
    }

    res.json({
      event,
    });
  } catch (err) {
    // If new image was uploaded but update failed,
    // delete the new image.
    if (req.file) {
      deleteImageFile(
        `/uploads/events/${req.file.filename}`
      );
    }

    next(err);
  }
}


// ---------------------------------------------------------
// DELETE EVENT
// ---------------------------------------------------------

export async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message:
          'You can only delete your own events',
      });
    }

    const image = event.image;

    await event.deleteOne();

    // Remove event image from disk
    deleteImageFile(image);

    await logAction({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'EVENT_DELETED',
      targetType: 'Event',
      targetId: req.params.id,
    });

    res.json({
      message: 'Event deleted',
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// SUBMIT FOR APPROVAL
// ---------------------------------------------------------

export async function submitForApproval(req, res, next) {
  try {
    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
      String(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    event.status = 'PENDING_APPROVAL';

    await event.save();

    res.json({
      event,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// MODERATE EVENT
// ---------------------------------------------------------

export async function moderateEvent(req, res, next) {
  try {
    const { decision } = req.body;

    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    event.status =
      decision === 'approve'
        ? 'PUBLISHED'
        : 'DRAFT';

    await event.save();

    await logAction({
      actor: req.user._id,
      actorRole: 'admin',
      action:
        decision === 'approve'
          ? 'EVENT_APPROVED'
          : 'EVENT_REJECTED',
      targetType: 'Event',
      targetId: event._id,
    });

    res.json({
      event,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// CANCEL EVENT
// ---------------------------------------------------------

export async function cancelEvent(req, res, next) {
  try {
    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    event.status = 'CANCELLED';

    await event.save();

    res.json({
      event,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// GET SINGLE EVENT
// ---------------------------------------------------------

export async function getEvent(req, res, next) {
  try {
    const event = await Event.findById(
      req.params.id
    ).populate(
      'organizer',
      'name organizerProfile'
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    event.viewCount += 1;

    await event.save();

    if (req.user) {
      await Interaction.create({
        user: req.user._id,
        event: event._id,
        type: 'VIEW',
        weight: 1,
      });
    }

    res.json({
      event,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// LIST EVENTS
// ---------------------------------------------------------

export async function listEvents(req, res, next) {
  try {
    const {
      q,
      category,
      city,
      eventType,
      language,
      minPrice,
      maxPrice,
      dateFrom,
      dateTo,
      sort = 'relevance',
      page = 1,
      limit = 12,
      status,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = 'PUBLISHED';
    }

    // Private events don't appear publicly
    if (!req.user || req.user.role !== 'admin') {
      filter.$or = [
        {
          visibility: 'public',
        },

        ...(req.user
          ? [
              {
                visibility: 'private',
                organizer: req.user._id,
              },
            ]
          : []),
      ];
    }

    if (q) {
      filter.$text = {
        $search: q,
      };
    }

    if (category) {
      filter.category = category;
    }

    if (city) {
      filter.city = city;
    }

    if (eventType) {
      filter.eventType = eventType;
    }

    if (language) {
      filter.language = language;
    }

    if (dateFrom || dateTo) {
      filter.date = {};

      if (dateFrom) {
        filter.date.$gte = new Date(
          dateFrom
        );
      }

      if (dateTo) {
        filter.date.$lte = new Date(
          dateTo
        );
      }
    }

    if (minPrice || maxPrice) {
      filter['ticketTypes.price'] = {};

      if (minPrice) {
        filter['ticketTypes.price'].$gte =
          Number(minPrice);
      }

      if (maxPrice) {
        filter['ticketTypes.price'].$lte =
          Number(maxPrice);
      }
    }

    const sortMap = {
      newest: {
        createdAt: -1,
      },

      popularity: {
        viewCount: -1,
      },

      price: {
        'ticketTypes.0.price': 1,
      },

      start_time: {
        date: 1,
      },

      relevance: q
        ? {
            score: {
              $meta: 'textScore',
            },
          }
        : {
            date: 1,
          },
    };

    const projection = q
      ? {
          score: {
            $meta: 'textScore',
          },
        }
      : {};

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const [events, total] =
      await Promise.all([
        Event.find(
          filter,
          projection
        )
          .sort(
            sortMap[sort] ||
              sortMap.relevance
          )
          .skip(skip)
          .limit(Number(limit)),

        Event.countDocuments(filter),
      ]);

    if (req.user && q) {
      await Interaction.create({
        user: req.user._id,
        type: 'SEARCH',
        weight: 1,
        metadata: {
          q,
        },
      });
    }

    res.json({
      events,
      total,
      page: Number(page),
      pages: Math.ceil(
        total / Number(limit)
      ),
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// MY EVENTS
// ---------------------------------------------------------

export async function myEvents(req, res, next) {
  try {
    const events = await Event.find({
      organizer: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      events,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// TRACK INTERACTION
// ---------------------------------------------------------

export async function trackInteraction(req, res, next) {
  try {
    const {
      eventId,
      type,
      metadata,
    } = req.body;

    const weights = {
      VIEW: 1,
      CLICK: 2,
      FAVORITE: 3,
      REGISTER: 5,
      RATE: 6,
      ATTEND: 7,
      SEARCH: 1,
    };

    if (!weights[type]) {
      return res.status(400).json({
        message:
          'Invalid interaction type',
      });
    }

    const interaction =
      await Interaction.create({
        user: req.user._id,
        event: eventId,
        type,
        weight: weights[type],
        metadata,
      });

    res.status(201).json({
      interaction,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// TOGGLE FAVORITE
// ---------------------------------------------------------

export async function toggleFavorite(req, res, next) {
  try {
    const user = req.user;

    const eventId = req.params.id;

    const idx =
      user.favoriteEvents.findIndex(
        (event) =>
          event.toString() === eventId
      );

    if (idx >= 0) {
      user.favoriteEvents.splice(
        idx,
        1
      );
    } else {
      user.favoriteEvents.push(
        eventId
      );

      await Interaction.create({
        user: user._id,
        event: eventId,
        type: 'FAVORITE',
        weight: 3,
      });
    }

    await user.save();

    res.json({
      favoriteEvents:
        user.favoriteEvents,
    });
  } catch (err) {
    next(err);
  }
}
// import Event from '../models/Event.js';
// import Interaction from '../models/Interaction.js';
// import { logAction } from '../services/auditService.js';

// export async function createEvent(req, res, next) {
//   try {
//     const payload = { ...req.body, organizer: req.user._id, status: 'DRAFT' };
//     const event = await Event.create(payload);
//     await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_CREATED', targetType: 'Event', targetId: event._id });
//     res.status(201).json({ event });
//   } catch (err) { next(err); }
// }

// // Organizers publish their own events directly - no admin approval is
// // required to go live. This is a deliberate design choice: admins retain
// // full visibility (GET /admin/events lists every event regardless of
// // status/visibility) and full override power (cancel/suspend), but they are
// // not a gate the organizer has to wait behind before an event goes public.
// export async function publishEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not your event' });
//     }
//     if (!['DRAFT', 'PENDING_APPROVAL'].includes(event.status)) {
//       return res.status(400).json({ message: `Cannot publish an event with status ${event.status}` });
//     }
//     event.status = 'PUBLISHED';
//     await event.save();
//     await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_PUBLISHED', targetType: 'Event', targetId: event._id });
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// // Organizer or admin marks a published event COMPLETED once it's over.
// // This is the trigger point for the post-event lifecycle: certificates are
// // automatically generated for every checked-in attendee at this moment,
// // instead of requiring each attendee to remember to request one.
// export async function completeEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not your event' });
//     }
//     if (event.status !== 'PUBLISHED') {
//       return res.status(400).json({ message: `Only a PUBLISHED event can be marked completed (current status: ${event.status})` });
//     }
//     event.status = 'COMPLETED';
//     await event.save();
//     await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_COMPLETED', targetType: 'Event', targetId: event._id });

//     const { issueCertificatesForCompletedEvent } = await import('./certificateController.js');
//     const certResult = await issueCertificatesForCompletedEvent(event);

//     res.json({ event, certificatesIssued: certResult.issuedCount });
//   } catch (err) { next(err); }
// }

// export async function updateEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'You can only edit your own events' });
//     }
//     Object.assign(event, req.body);
//     await event.save();
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// export async function deleteEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'You can only delete your own events' });
//     }
//     await event.deleteOne();
//     await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_DELETED', targetType: 'Event', targetId: req.params.id });
//     res.json({ message: 'Event deleted' });
//   } catch (err) { next(err); }
// }

// // Organizer submits DRAFT -> PENDING_APPROVAL; Admin approves -> PUBLISHED
// export async function submitForApproval(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id)) return res.status(403).json({ message: 'Not your event' });
//     event.status = 'PENDING_APPROVAL';
//     await event.save();
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// export async function moderateEvent(req, res, next) {
//   try {
//     const { decision } = req.body; // 'approve' | 'reject'
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     event.status = decision === 'approve' ? 'PUBLISHED' : 'DRAFT';
//     await event.save();
//     await logAction({ actor: req.user._id, actorRole: 'admin', action: `EVENT_${decision === 'approve' ? 'APPROVED' : 'REJECTED'}`, targetType: 'Event', targetId: event._id });
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// export async function cancelEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not your event' });
//     }
//     event.status = 'CANCELLED';
//     await event.save();
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// export async function getEvent(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.id).populate('organizer', 'name organizerProfile');
//     if (!event) return res.status(404).json({ message: 'Event not found' });

//     event.viewCount += 1;
//     await event.save();

//     if (req.user) {
//       await Interaction.create({ user: req.user._id, event: event._id, type: 'VIEW', weight: 1 });
//     }
//     res.json({ event });
//   } catch (err) { next(err); }
// }

// // Search + filter + sort with proper Mongo query construction
// export async function listEvents(req, res, next) {
//   try {
//     const {
//       q, category, city, eventType, language, minPrice, maxPrice,
//       dateFrom, dateTo, sort = 'relevance', page = 1, limit = 12, status,
//     } = req.query;

//     const filter = {};
//     if (status) filter.status = status;
//     else filter.status = 'PUBLISHED';

//     // Private events (e.g. a birthday party) never appear in public
//     // search/browse results - they're only reachable via a direct link
//     // (GET /events/:id), and always visible to their own organizer or admin.
//     if (!req.user || req.user.role !== 'admin') {
//       filter.$or = [
//         { visibility: 'public' },
//         ...(req.user ? [{ visibility: 'private', organizer: req.user._id }] : []),
//       ];
//     }

//     if (q) filter.$text = { $search: q };
//     if (category) filter.category = category;
//     if (city) filter.city = city;
//     if (eventType) filter.eventType = eventType;
//     if (language) filter.language = language;
//     if (dateFrom || dateTo) {
//       filter.date = {};
//       if (dateFrom) filter.date.$gte = new Date(dateFrom);
//       if (dateTo) filter.date.$lte = new Date(dateTo);
//     }
//     if (minPrice || maxPrice) {
//       filter['ticketTypes.price'] = {};
//       if (minPrice) filter['ticketTypes.price'].$gte = Number(minPrice);
//       if (maxPrice) filter['ticketTypes.price'].$lte = Number(maxPrice);
//     }

//     const sortMap = {
//       newest: { createdAt: -1 },
//       popularity: { viewCount: -1 },
//       price: { 'ticketTypes.0.price': 1 },
//       start_time: { date: 1 },
//       relevance: q ? { score: { $meta: 'textScore' } } : { date: 1 },
//     };

//     const projection = q ? { score: { $meta: 'textScore' } } : {};
//     const skip = (Number(page) - 1) * Number(limit);

//     const [events, total] = await Promise.all([
//       Event.find(filter, projection).sort(sortMap[sort] || sortMap.relevance).skip(skip).limit(Number(limit)),
//       Event.countDocuments(filter),
//     ]);

//     if (req.user && q) {
//       await Interaction.create({ user: req.user._id, type: 'SEARCH', weight: 1, metadata: { q } });
//     }

//     res.json({ events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
//   } catch (err) { next(err); }
// }

// export async function myEvents(req, res, next) {
//   try {
//     const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
//     res.json({ events });
//   } catch (err) { next(err); }
// }

// export async function trackInteraction(req, res, next) {
//   try {
//     const { eventId, type, metadata } = req.body;
//     const weights = { VIEW: 1, CLICK: 2, FAVORITE: 3, REGISTER: 5, RATE: 6, ATTEND: 7, SEARCH: 1 };
//     if (!weights[type]) return res.status(400).json({ message: 'Invalid interaction type' });
//     const interaction = await Interaction.create({ user: req.user._id, event: eventId, type, weight: weights[type], metadata });
//     res.status(201).json({ interaction });
//   } catch (err) { next(err); }
// }

// export async function toggleFavorite(req, res, next) {
//   try {
//     const user = req.user;
//     const eventId = req.params.id;
//     const idx = user.favoriteEvents.findIndex(e => e.toString() === eventId);
//     if (idx >= 0) {
//       user.favoriteEvents.splice(idx, 1);
//     } else {
//       user.favoriteEvents.push(eventId);
//       await Interaction.create({ user: user._id, event: eventId, type: 'FAVORITE', weight: 3 });
//     }
//     await user.save();
//     res.json({ favoriteEvents: user.favoriteEvents });
//   } catch (err) { next(err); }
// }
