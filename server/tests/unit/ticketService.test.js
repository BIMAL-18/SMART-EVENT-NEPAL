import { describe, test, expect, beforeAll } from '@jest/globals';
process.env.JWT_SECRET = 'test-secret';
const { generateTicketId, buildQrPayload, verifyQrPayload } = await import('../../src/services/ticketService.js');

describe('ticketService', () => {
  test('generates a unique-looking ticket id', () => {
    const a = generateTicketId();
    const b = generateTicketId();
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^SEN-/);
  });

  test('builds a QR payload that verifies successfully', () => {
    const ticketId = generateTicketId();
    const payload = buildQrPayload({ ticketId, eventId: 'event123', registrationId: 'reg456' });
    const result = verifyQrPayload(payload);
    expect(result.valid).toBe(true);
    expect(result.ticketId).toBe(ticketId);
    expect(result.eventId).toBe('event123');
    expect(result.registrationId).toBe('reg456');
  });

  test('rejects a tampered QR payload (forged ticket)', () => {
    const ticketId = generateTicketId();
    const payload = buildQrPayload({ ticketId, eventId: 'event123', registrationId: 'reg456' });
    const tampered = payload.replace('event123', 'event999');
    const result = verifyQrPayload(tampered);
    expect(result.valid).toBe(false);
  });

  test('rejects a malformed payload', () => {
    expect(verifyQrPayload('not-a-real-payload').valid).toBe(false);
    expect(verifyQrPayload('').valid).toBe(false);
  });
});
