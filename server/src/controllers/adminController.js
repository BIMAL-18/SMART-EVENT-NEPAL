import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import { logAction } from '../services/auditService.js';

export async function listUsers(req, res, next) {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const users = await User.find(filter).select('-passwordHash -refreshTokenHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { next(err); }
}

export async function setUserStatus(req, res, next) {
  try {
    const { status } = req.body; // 'active' | 'suspended'
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash -refreshTokenHash');
    await logAction({ actor: req.user._id, actorRole: 'admin', action: `USER_${status.toUpperCase()}`, targetType: 'User', targetId: req.params.id });
    res.json({ user });
  } catch (err) { next(err); }
}

export async function listAllEvents(req, res, next) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const events = await Event.find(filter).populate('organizer', 'name email').sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) { next(err); }
}

// Admin has full visibility into every registration on the platform,
// across every organizer's events - not scoped to "my events" the way the
// organizer dashboard is.
export async function listAllRegistrations(req, res, next) {
  try {
    const { status, eventId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (eventId) filter.event = eventId;
    const registrations = await Registration.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title organizer')
      .sort({ createdAt: -1 })
      .limit(1000);
    res.json({ registrations });
  } catch (err) { next(err); }
}

export async function listPayments(req, res, next) {
  try {
    const payments = await Payment.find().populate('user', 'name email').populate('event', 'title').sort({ createdAt: -1 }).limit(500);
    res.json({ payments });
  } catch (err) { next(err); }
}

export async function listAuditLogs(req, res, next) {
  try {
    const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(500);
    res.json({ logs });
  } catch (err) { next(err); }
}

export async function platformAnalytics(req, res, next) {
  try {
    const [totalUsers, totalOrganizers, totalEvents, publishedEvents, totalRegistrations, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'attendee' }),
      User.countDocuments({ role: 'organizer' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'PUBLISHED' }),
      Registration.countDocuments({ status: { $in: ['CONFIRMED', 'ATTENDED'] } }),
      Payment.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const userGrowth = await User.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const eventGrowth = await Event.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const popularCategories = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const revenueByMonth = await Payment.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totals: {
        totalUsers, totalOrganizers, totalEvents, publishedEvents, totalRegistrations,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
      userGrowth, eventGrowth, popularCategories, revenueByMonth,
    });
  } catch (err) { next(err); }
}
