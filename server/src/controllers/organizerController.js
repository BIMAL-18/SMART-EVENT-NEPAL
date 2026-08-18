import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Payment from '../models/Payment.js';

export async function organizerDashboard(req, res, next) {
  try {
    const events = await Event.find({ organizer: req.user._id });
    const eventIds = events.map(e => e._id);

    const [totalRegistrations, revenueAgg, checkedInCount] = await Promise.all([
      Registration.countDocuments({ event: { $in: eventIds }, status: 'CONFIRMED' }),
      Payment.aggregate([{ $match: { event: { $in: eventIds }, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Registration.countDocuments({ event: { $in: eventIds }, checkedIn: true }),
    ]);

    const registrationsOverTime = await Registration.aggregate([
      { $match: { event: { $in: eventIds }, status: 'CONFIRMED' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const ticketTypeDistribution = await Registration.aggregate([
      { $match: { event: { $in: eventIds }, status: 'CONFIRMED' } },
      { $group: { _id: '$ticketTypeName', count: { $sum: '$quantity' } } },
    ]);

    res.json({
      totalEvents: events.length,
      totalRegistrations,
      revenue: revenueAgg[0]?.total || 0,
      checkedInCount,
      noShowRateSoFar: totalRegistrations ? Number(((totalRegistrations - checkedInCount) / totalRegistrations).toFixed(3)) : 0,
      registrationsOverTime,
      ticketTypeDistribution,
      events,
    });
  } catch (err) { next(err); }
}

export async function eventAnalytics(req, res, next) {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your event' });
    }
    const registrations = await Registration.find({ event: event._id, status: 'CONFIRMED' });
    const revenueAgg = await Payment.aggregate([{ $match: { event: event._id, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const checkedIn = registrations.filter(r => r.checkedIn).length;

    res.json({
      event,
      totalRegistered: registrations.length,
      revenue: revenueAgg[0]?.total || 0,
      checkedIn,
      capacityRemaining: event.capacity - registrations.reduce((s, r) => s + r.quantity, 0),
      ticketTypeBreakdown: event.ticketTypes.map(t => ({ name: t.name, sold: t.sold, capacity: t.capacity, price: t.price })),
    });
  } catch (err) { next(err); }
}
