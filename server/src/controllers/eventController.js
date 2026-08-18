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
import Event from '../models/Event.js';
import Interaction from '../models/Interaction.js';
import { logAction } from '../services/auditService.js';

export async function createEvent(req, res, next) {
  try {
    console.log('CREATE EVENT BODY:', req.body);
    console.log('CREATE EVENT USER:', req.user?._id);

    const payload = {
      ...req.body,
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

    res.status(201).json({ event });
  } catch (err) {
    console.error('CREATE EVENT DATABASE ERROR:', err);
    next(err);
  }
}

export async function updateEvent(req, res, next) {
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
        message:
          'You can only edit your own events',
      });
    }

    Object.assign(event, req.body);

    await event.save();

    res.json({ event });
  } catch (err) {
    console.error('UPDATE EVENT ERROR:', err);
    next(err);
  }
}

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

    await event.deleteOne();

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
    console.error('DELETE EVENT ERROR:', err);
    next(err);
  }
}

export async function submitForApproval(
  req,
  res,
  next
) {
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

    res.json({ event });
  } catch (err) {
    console.error(
      'SUBMIT EVENT ERROR:',
      err
    );

    next(err);
  }
}

export async function moderateEvent(
  req,
  res,
  next
) {
  try {
    const { decision } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        message:
          "Decision must be 'approve' or 'reject'",
      });
    }

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

    res.json({ event });
  } catch (err) {
    console.error(
      'MODERATE EVENT ERROR:',
      err
    );

    next(err);
  }
}

export async function cancelEvent(
  req,
  res,
  next
) {
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

    res.json({ event });
  } catch (err) {
    console.error(
      'CANCEL EVENT ERROR:',
      err
    );

    next(err);
  }
}

export async function getEvent(
  req,
  res,
  next
) {
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

    res.json({ event });
  } catch (err) {
    console.error(
      'GET EVENT ERROR:',
      err
    );

    next(err);
  }
}

export async function listEvents(
  req,
  res,
  next
) {
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
    console.error(
      'LIST EVENTS ERROR:',
      err
    );

    next(err);
  }
}

export async function myEvents(
  req,
  res,
  next
) {
  try {
    const events = await Event.find({
      organizer: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json({ events });
  } catch (err) {
    console.error(
      'MY EVENTS ERROR:',
      err
    );

    next(err);
  }
}

export async function trackInteraction(
  req,
  res,
  next
) {
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
    console.error(
      'TRACK INTERACTION ERROR:',
      err
    );

    next(err);
  }
}

export async function toggleFavorite(
  req,
  res,
  next
) {
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
    console.error(
      'TOGGLE FAVORITE ERROR:',
      err
    );

    next(err);
  }
}