import Feedback from '../models/Feedback.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import Interaction from '../models/Interaction.js';

export async function submitFeedback(req, res, next) {
  try {
    const { registrationId, eventRating, organizerRating, review } = req.body;
    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });
    if (!registration.checkedIn) return res.status(403).json({ message: 'Only attendees who checked in can leave feedback' });
    if (registration.event.status !== 'COMPLETED') return res.status(400).json({ message: 'Feedback opens after the event is completed' });

    const feedback = await Feedback.create({
      user: req.user._id, event: registration.event._id, registration: registration._id,
      eventRating, organizerRating, review,
    });

    const event = await Event.findById(registration.event._id);
    const newCount = event.ratingCount + 1;
    event.avgRating = ((event.avgRating * event.ratingCount) + eventRating) / newCount;
    event.ratingCount = newCount;
    await event.save();

    await Interaction.create({ user: req.user._id, event: event._id, type: 'RATE', weight: 6 });

    res.status(201).json({ feedback });
  } catch (err) { next(err); }
}

export async function eventFeedback(req, res, next) {
  try {
    const feedback = await Feedback.find({ event: req.params.eventId }).populate('user', 'name');
    res.json({ feedback });
  } catch (err) { next(err); }
}
