import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

// Generates a unique, human-readable ticket ID plus a signed QR payload so
// check-in scanning can validate authenticity without a DB round trip first.
export function generateTicketId() {
  return `SEN-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 6).toUpperCase()}`;
}

function sign(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
}

export function buildQrPayload({ ticketId, eventId, registrationId }) {
  const base = `${ticketId}|${eventId}|${registrationId}`;
  const signature = sign(base);
  return `${base}|${signature}`;
}

export function verifyQrPayload(payload) {
  const parts = (payload || '').split('|');
  if (parts.length !== 4) return { valid: false, reason: 'Malformed QR payload' };
  const [ticketId, eventId, registrationId, signature] = parts;
  const expected = sign(`${ticketId}|${eventId}|${registrationId}`);
  if (expected !== signature) return { valid: false, reason: 'Signature mismatch - possibly forged ticket' };
  return { valid: true, ticketId, eventId, registrationId };
}

export async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}
