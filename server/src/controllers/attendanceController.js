import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import Interaction from '../models/Interaction.js';
import { verifyQrPayload } from '../services/ticketService.js';
import { emitToEventRoom } from '../services/notificationService.js';
import { logAction } from '../services/auditService.js';

// Organizer scans a QR ticket at the venue. Validates: ticket exists,
// belongs to this event, is confirmed, and is not already checked in.
// On success, the registration's status moves CONFIRMED -> ATTENDED (in
// addition to the checkedIn/checkedInAt fields), so "attended" is a
// first-class, queryable status rather than only an implicit boolean.
export async function checkIn(req, res, next) {
  try {
    const { qrPayload, eventId } = req.body;
    const verification = verifyQrPayload(qrPayload);
    if (!verification.valid) return res.status(400).json({ message: verification.reason, valid: false });

    const registration = await Registration.findById(verification.registrationId).populate('event');
    if (!registration) return res.status(404).json({ message: 'Ticket not found', valid: false });
    if (String(registration.event._id) !== String(eventId)) {
      return res.status(400).json({ message: 'This ticket belongs to a different event', valid: false });
    }
    if (String(registration.event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised to check in for this event' });
    }
    if (!['CONFIRMED', 'ATTENDED'].includes(registration.status)) {
      return res.status(400).json({ message: 'Registration is not confirmed', valid: false });
    }
    if (registration.checkedIn) {
      return res.status(409).json({ message: `Already checked in at ${registration.checkedInAt}`, valid: false, duplicate: true });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'ATTENDED';
    await registration.save();

    await Interaction.create({ user: registration.user, event: registration.event._id, type: 'ATTEND', weight: 7 });
    await logAction({ actor: req.user._id, actorRole: req.user.role, action: 'CHECK_IN', targetType: 'Registration', targetId: registration._id });

    const totalConfirmed = await Registration.countDocuments({ event: eventId, status: { $in: ['CONFIRMED', 'ATTENDED'] } });
    const totalCheckedIn = await Registration.countDocuments({ event: eventId, checkedIn: true });
    emitToEventRoom(eventId, 'attendance.checkedIn', { registrationId: registration._id, totalConfirmed, totalCheckedIn });

    res.json({ message: 'Checked in successfully', valid: true, registration });
  } catch (err) { next(err); }
}

export async function eventAttendanceSummary(req, res, next) {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const confirmed = await Registration.find({ event: event._id, status: { $in: ['CONFIRMED', 'ATTENDED'] } });
    const checkedIn = confirmed.filter(r => r.checkedIn).length;
    res.json({
      registered: confirmed.length,
      checkedIn,
      pending: confirmed.length - checkedIn,
    });
  } catch (err) { next(err); }
}
