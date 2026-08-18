import { getRecommendationsForUser } from '../services/recommendationService.js';
import { trainModel, getModelInfo, predictForEventRegistrations } from '../services/attendancePredictionService.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Interaction from '../models/Interaction.js';

export async function getRecommendations(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 10;
    const recommendations = await getRecommendationsForUser(req.user._id, { limit });
    res.json({
      recommendations: recommendations.map(r => ({
        event: r.event,
        matchPercent: r.matchPercent,
        reason: r.reason,
        breakdown: r.breakdown,
      })),
    });
  } catch (err) { next(err); }
}

export async function attendancePredictionInfo(req, res) {
  res.json(getModelInfo());
}

export async function retrainAttendanceModel(req, res, next) {
  try {
    const { nSamples, nTrees } = req.body || {};
    const result = trainModel({ nSamples: nSamples || 4000, nTrees: nTrees || 30 });
    res.json(result);
  } catch (err) { next(err); }
}

// Organizer dashboard AI panel: predicted attendance/no-shows for one event.
export async function predictEventAttendance(req, res, next) {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your event' });
    }
    const registrations = await Registration.find({ event: event._id, status: 'CONFIRMED' });

    // Build per-user historical attendance stats from Interaction history
    const userIds = [...new Set(registrations.map(r => r.user.toString()))];
    const userStatsMap = new Map();
    for (const uid of userIds) {
      const registered = await Interaction.countDocuments({ user: uid, type: 'REGISTER' });
      const attended = await Interaction.countDocuments({ user: uid, type: 'ATTEND' });
      const cancellations = await Registration.countDocuments({ user: uid, status: 'CANCELLED' });
      userStatsMap.set(uid, {
        attendanceRate: registered > 0 ? Math.min(1, attended / registered) : 0.6,
        cancellations,
      });
    }

    const prediction = predictForEventRegistrations(registrations, event, userStatsMap);
    res.json(prediction);
  } catch (err) { next(err); }
}
