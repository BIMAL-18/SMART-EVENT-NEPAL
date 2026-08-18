import Certificate from '../models/Certificate.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import { generateCertificateNumber, generateVerificationCode, generateCertificatePdf } from '../services/certificateService.js';
import { notifyUser } from '../services/notificationService.js';

// Eligibility: registration confirmed + checked in + event completed.
export async function issueCertificateIfEligible(req, res, next) {
  try {
    const { registrationId } = req.body;
    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });

    const event = registration.event;
    if (event.status !== 'COMPLETED') return res.status(400).json({ message: 'Certificates are issued after the event is completed' });
    if (!registration.checkedIn) return res.status(403).json({ message: 'Only checked-in attendees are eligible for a certificate' });

    let cert = await Certificate.findOne({ registration: registration._id });
    if (!cert) {
      const certificateNumber = generateCertificateNumber(event._id);
      const verificationCode = generateVerificationCode();
      const { fileName } = await generateCertificatePdf({
        attendeeName: req.user.name, eventTitle: event.title, eventDate: event.date,
        certificateNumber, verificationCode,
      });
      cert = await Certificate.create({
        user: req.user._id, event: event._id, registration: registration._id,
        certificateNumber, verificationCode, fileUrl: `/uploads/certificates/${fileName}`,
      });
      await notifyUser(req.user._id, { type: 'CERTIFICATE_READY', title: 'Certificate available', message: `Your certificate for "${event.title}" is ready.`, event: event._id });
    }
    res.json({ certificate: cert });
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
