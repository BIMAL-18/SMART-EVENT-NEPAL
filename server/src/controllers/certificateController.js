import Certificate from '../models/Certificate.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { generateCertificateNumber, generateVerificationCode, generateCertificatePdf } from '../services/certificateService.js';
import { notifyUser } from '../services/notificationService.js';

// Shared core: generates (or returns the existing) certificate for one
// confirmed + checked-in registration. Used both by the manual "issue my
// certificate" endpoint and by the automatic bulk-issue that runs when an
// organizer marks an event COMPLETED.
async function issueCertificateForRegistration(user, registration, event) {
  let cert = await Certificate.findOne({ registration: registration._id });
  if (cert) return { certificate: cert, created: false };

  const certificateNumber = generateCertificateNumber(event._id);
  const verificationCode = generateVerificationCode();
  const { fileName } = await generateCertificatePdf({
    attendeeName: user.name, eventTitle: event.title, eventDate: event.date,
    certificateNumber, verificationCode,
  });
  cert = await Certificate.create({
    user: user._id, event: event._id, registration: registration._id,
    certificateNumber, verificationCode, fileUrl: `/uploads/certificates/${fileName}`,
  });
  await notifyUser(user._id, {
    type: 'CERTIFICATE_READY',
    title: 'Certificate available',
    message: `Your certificate for "${event.title}" is ready to download.`,
    event: event._id,
  });
  return { certificate: cert, created: true };
}

// Called automatically from eventController.completeEvent() the moment an
// organizer/admin marks an event COMPLETED. Every registration that is
// CONFIRMED and was checked in at the door gets a certificate issued
// immediately, with no attendee action required.
export async function issueCertificatesForCompletedEvent(event) {
  // checkedIn=true is the reliable eligibility signal - checking in always
  // moves status to ATTENDED, so filtering by checkedIn alone (rather than a
  // specific status string) can't drift out of sync with that transition.
  const eligible = await Registration.find({ event: event._id, checkedIn: true });
  let issuedCount = 0;
  for (const registration of eligible) {
    const user = await User.findById(registration.user);
    if (!user) continue;
    const { created } = await issueCertificateForRegistration(user, registration, event);
    if (created) issuedCount += 1;
  }
  return { issuedCount, eligibleCount: eligible.length };
}

// Manual endpoint - lets an attendee fetch/re-fetch their certificate
// record (e.g. if they lost the notification) rather than waiting for one
// to be pushed to them. Eligibility is the same rule either way: confirmed,
// checked in, and the event must already be COMPLETED.
export async function issueCertificateIfEligible(req, res, next) {
  try {
    const { registrationId } = req.body;
    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });

    const event = registration.event;
    if (event.status !== 'COMPLETED') return res.status(400).json({ message: 'Certificates are issued after the event is completed' });
    if (!registration.checkedIn) return res.status(403).json({ message: 'Only checked-in attendees are eligible for a certificate' });

    const { certificate } = await issueCertificateForRegistration(req.user, registration, event);
    res.json({ certificate });
  } catch (err) { next(err); }
}

export async function myCertificates(req, res, next) {
  try {
    const certificates = await Certificate.find({ user: req.user._id }).populate('event', 'title date');
    res.json({ certificates });
  } catch (err) { next(err); }
}

// Public endpoint - anyone with the code can verify authenticity.
export async function verifyCertificate(req, res, next) {
  try {
    const cert = await Certificate.findOne({ verificationCode: req.params.code }).populate('event', 'title date').populate('user', 'name');
    if (!cert) return res.status(404).json({ valid: false, message: 'No certificate found for this code' });
    res.json({
      valid: true,
      certificateNumber: cert.certificateNumber,
      attendeeName: cert.user.name,
      eventTitle: cert.event.title,
      eventDate: cert.event.date,
      issuedAt: cert.issuedAt,
    });
  } catch (err) { next(err); }
}
