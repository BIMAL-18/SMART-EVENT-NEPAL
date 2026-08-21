import Event from '../models/Event.js';
import Interaction from '../models/Interaction.js';
import { logAction } from '../services/auditService.js';

export async function createEvent(req, res, next) {
  try {
    const payload = { ...req.body, organizer: req.user._id, status: 'DRAFT' };
    const event = await Event.create(payload);
    await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_CREATED', targetType: 'Event', targetId: event._id });
    res.status(201).json({ event });
  } catch (err) { next(err); }
}

// Organizers publish their own events directly - no admin approval is
// required to go live. This is a deliberate design choice: admins retain
// full visibility (GET /admin/events lists every event regardless of
// status/visibility) and full override power (cancel/suspend), but they are
// not a gate the organizer has to wait behind before an event goes public.
export async function publishEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your event' });
    }
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(event.status)) {
      return res.status(400).json({ message: `Cannot publish an event with status ${event.status}` });
    }
    event.status = 'PUBLISHED';
    await event.save();
    await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_PUBLISHED', targetType: 'Event', targetId: event._id });
    res.json({ event });
  } catch (err) { next(err); }
}

// Organizer or admin marks a published event COMPLETED once it's over.
// This is the trigger point for the post-event lifecycle: certificates are
// automatically generated for every checked-in attendee at this moment,
// instead of requiring each attendee to remember to request one.
export async function completeEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your event' });
    }
    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({ message: `Only a PUBLISHED event can be marked completed (current status: ${event.status})` });
    }
    event.status = 'COMPLETED';
    await event.save();
    await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_COMPLETED', targetType: 'Event', targetId: event._id });

    const { issueCertificatesForCompletedEvent } = await import('./certificateController.js');
    const certResult = await issueCertificatesForCompletedEvent(event);

    res.json({ event, certificatesIssued: certResult.issuedCount });
  } catch (err) { next(err); }
}

export async function updateEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }
    Object.assign(event, req.body);
    await event.save();
    res.json({ event });
  } catch (err) { next(err); }
}

export async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }
    await event.deleteOne();
    await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'EVENT_DELETED', targetType: 'Event', targetId: req.params.id });
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
}

// Organizer submits DRAFT -> PENDING_APPROVAL; Admin approves -> PUBLISHED
export async function submitForApproval(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id)) return res.status(403).json({ message: 'Not your event' });
    event.status = 'PENDING_APPROVAL';
    await event.save();
    res.json({ event });
  } catch (err) { next(err); }
}

export async function moderateEvent(req, res, next) {
  try {
    const { decision } = req.body; // 'approve' | 'reject'
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.status = decision === 'approve' ? 'PUBLISHED' : 'DRAFT';
    await event.save();
    await logAction({ actor: req.user._id, actorRole: 'admin', action: `EVENT_${decision === 'approve' ? 'APPROVED' : 'REJECTED'}`, targetType: 'Event', targetId: event._id });
    res.json({ event });
  } catch (err) { next(err); }
}

export async function cancelEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your event' });
    }
    event.status = 'CANCELLED';
    await event.save();
    res.json({ event });
  } catch (err) { next(err); }
}

export async function getEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name organizerProfile');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.viewCount += 1;
    await event.save();

    if (req.user) {
      await Interaction.create({ user: req.user._id, event: event._id, type: 'VIEW', weight: 1 });
    }
    res.json({ event });
  } catch (err) { next(err); }
}

// Search + filter + sort with proper Mongo query construction
export async function listEvents(req, res, next) {
  try {
    const {
      q, category, city, eventType, language, minPrice, maxPrice,
      dateFrom, dateTo, sort = 'relevance', page = 1, limit = 12, status,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    else filter.status = 'PUBLISHED';

    // Private events (e.g. a birthday party) never appear in public
    // search/browse results - they're only reachable via a direct link
    // (GET /events/:id), and always visible to their own organizer or admin.
    if (!req.user || req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        ...(req.user ? [{ visibility: 'private', organizer: req.user._id }] : []),
      ];
    }

    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (city) filter.city = city;
    if (eventType) filter.eventType = eventType;
    if (language) filter.language = language;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    if (minPrice || maxPrice) {
      filter['ticketTypes.price'] = {};
      if (minPrice) filter['ticketTypes.price'].$gte = Number(minPrice);
      if (maxPrice) filter['ticketTypes.price'].$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      popularity: { viewCount: -1 },
      price: { 'ticketTypes.0.price': 1 },
      start_time: { date: 1 },
      relevance: q ? { score: { $meta: 'textScore' } } : { date: 1 },
    };

    const projection = q ? { score: { $meta: 'textScore' } } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      Event.find(filter, projection).sort(sortMap[sort] || sortMap.relevance).skip(skip).limit(Number(limit)),
      Event.countDocuments(filter),
    ]);

    if (req.user && q) {
      await Interaction.create({ user: req.user._id, type: 'SEARCH', weight: 1, metadata: { q } });
    }

    res.json({ events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
}

export async function myEvents(req, res, next) {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) { next(err); }
}

export async function trackInteraction(req, res, next) {
  try {
    const { eventId, type, metadata } = req.body;
    const weights = { VIEW: 1, CLICK: 2, FAVORITE: 3, REGISTER: 5, RATE: 6, ATTEND: 7, SEARCH: 1 };
    if (!weights[type]) return res.status(400).json({ message: 'Invalid interaction type' });
    const interaction = await Interaction.create({ user: req.user._id, event: eventId, type, weight: weights[type], metadata });
    res.status(201).json({ interaction });
  } catch (err) { next(err); }
}

export async function toggleFavorite(req, res, next) {
  try {
    const user = req.user;
    const eventId = req.params.id;
    const idx = user.favoriteEvents.findIndex(e => e.toString() === eventId);
    if (idx >= 0) {
      user.favoriteEvents.splice(idx, 1);
    } else {
      user.favoriteEvents.push(eventId);
      await Interaction.create({ user: user._id, event: eventId, type: 'FAVORITE', weight: 3 });
    }
    await user.save();
    res.json({ favoriteEvents: user.favoriteEvents });
  } catch (err) { next(err); }
}
