import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';

let app;
beforeAll(async () => { await setupTestDb(); ({ default: app } = await import('../../src/app.js')); });
afterAll(teardownTestDb);
beforeEach(clearTestDb);

async function registerUser(role = 'attendee', email = `${role}@example.com`) {
  const res = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123', role });
  return res.body;
}

async function registerAdmin() {
  // Admin cannot self-register via the public API by design, so promote directly in the test DB.
  const User = (await import('../../src/models/User.js')).default;
  const bcrypt = (await import('bcryptjs')).default;
  const existing = await User.findOne({ email: 'admin-test@example.com' });
  const { signAccessToken } = await import('../../src/middleware/auth.js');
  if (existing) return { accessToken: signAccessToken(existing) };
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await User.create({ name: 'Admin', email: 'admin-test@example.com', passwordHash, role: 'admin' });
  return { accessToken: signAccessToken(admin) };
}

async function makeEventPayload(overrides = {}) {
  const future = new Date(Date.now() + 20 * 86400000);
  const regStart = new Date(Date.now() - 86400000);
  const regEnd = new Date(Date.now() + 15 * 86400000);
  return {
    title: 'Test Workshop', description: 'A workshop for testing purposes and beyond',
    category: 'technology', tags: ['test'], eventType: 'Workshop',
    city: 'Kathmandu', venue: 'Test Hall', date: future.toISOString(),
    startTime: '10:00', endTime: '12:00', capacity: 2,
    ticketTypes: [{ name: 'Regular', price: 0, capacity: 2 }],
    registrationStart: regStart.toISOString(), registrationEnd: regEnd.toISOString(),
    ...overrides,
  };
}

describe('RBAC', () => {
  test('an attendee cannot create an event', async () => {
    const { accessToken } = await registerUser('attendee');
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${accessToken}`).send(await makeEventPayload());
    expect(res.status).toBe(403);
  });

  test('an organizer can create an event as DRAFT', async () => {
    const { accessToken } = await registerUser('organizer');
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${accessToken}`).send(await makeEventPayload());
    expect(res.status).toBe(201);
    expect(res.body.event.status).toBe('DRAFT');
  });

  test('an organizer can publish their own event directly, with no admin approval required', async () => {
    const { accessToken } = await registerUser('organizer', 'org-publish@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${accessToken}`).send(await makeEventPayload());
    const eventId = createRes.body.event._id;

    const publishRes = await request(app).post(`/api/events/${eventId}/publish`).set('Authorization', `Bearer ${accessToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.event.status).toBe('PUBLISHED');
  });

  test('an organizer cannot publish someone else\'s event', async () => {
    const owner = await registerUser('organizer', 'owner@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${owner.accessToken}`).send(await makeEventPayload());
    const eventId = createRes.body.event._id;

    const otherOrganizer = await registerUser('organizer', 'other-org@example.com');
    const res = await request(app).post(`/api/events/${eventId}/publish`).set('Authorization', `Bearer ${otherOrganizer.accessToken}`);
    expect(res.status).toBe(403);
  });

  test('only admin can moderate (approve/reject) an event - the optional oversight path', async () => {
    const organizer = await registerUser('organizer');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`).send(await makeEventPayload());
    const eventId = createRes.body.event._id;
    await request(app).post(`/api/events/${eventId}/submit`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const attendeeAttempt = await registerUser('attendee');
    const forbidden = await request(app).post(`/api/events/${eventId}/moderate`).set('Authorization', `Bearer ${attendeeAttempt.accessToken}`).send({ decision: 'approve' });
    expect(forbidden.status).toBe(403);
  });

  test('admin can list every event regardless of status or visibility', async () => {
    const organizer = await registerUser('organizer', 'org-admin-view@example.com');
    await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ visibility: 'private', title: 'Secret Birthday Party' }));

    const admin = await registerAdmin();
    const res = await request(app).get('/api/admin/events').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.events.some(e => e.title === 'Secret Birthday Party')).toBe(true);
  });
});

describe('Private events', () => {
  test('a private event does not appear in public search results', async () => {
    const organizer = await registerUser('organizer', 'org-private@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ visibility: 'private', title: 'My Private Birthday' }));
    const eventId = createRes.body.event._id;
    await request(app).post(`/api/events/${eventId}/publish`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const stranger = await registerUser('attendee', 'stranger@example.com');
    const listRes = await request(app).get('/api/events').set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(listRes.body.events.some(e => e.title === 'My Private Birthday')).toBe(false);
  });

  test('a private event is still viewable directly by its link (event ID)', async () => {
    const organizer = await registerUser('organizer', 'org-private2@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ visibility: 'private', title: 'Direct Link Party' }));
    const eventId = createRes.body.event._id;
    await request(app).post(`/api/events/${eventId}/publish`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const stranger = await registerUser('attendee', 'stranger2@example.com');
    const directRes = await request(app).get(`/api/events/${eventId}`).set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(directRes.status).toBe(200);
    expect(directRes.body.event.title).toBe('Direct Link Party');
  });
});

describe('Event capacity / overbooking prevention', () => {
  test('registration is rejected once ticket capacity is exhausted', async () => {
    const organizer = await registerUser('organizer', 'org-cap@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ capacity: 1, ticketTypes: [{ name: 'Regular', price: 0, capacity: 1 }] }));
    const event = createRes.body.event;
    await request(app).post(`/api/events/${event._id}/publish`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const ticketTypeId = event.ticketTypes[0]._id;

    const user1 = await registerUser('attendee', 'u1@example.com');
    const reg1 = await request(app).post('/api/registrations').set('Authorization', `Bearer ${user1.accessToken}`).send({ eventId: event._id, ticketTypeId, quantity: 1 });
    expect(reg1.status).toBe(201);

    const user2 = await registerUser('attendee', 'u2@example.com');
    const reg2 = await request(app).post('/api/registrations').set('Authorization', `Bearer ${user2.accessToken}`).send({ eventId: event._id, ticketTypeId, quantity: 1 });
    expect(reg2.status).toBe(409); // capacity exhausted
  });
});

describe('Check-in status transition and certificate issuance', () => {
  test('checking in a ticket moves registration status to ATTENDED, and completing the event issues a certificate', async () => {
    const organizer = await registerUser('organizer', 'org-checkin@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ capacity: 5, ticketTypes: [{ name: 'Regular', price: 0, capacity: 5 }] }));
    const event = createRes.body.event;
    await request(app).post(`/api/events/${event._id}/publish`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const attendee = await registerUser('attendee', 'checkin-attendee@example.com');
    const regRes = await request(app).post('/api/registrations').set('Authorization', `Bearer ${attendee.accessToken}`)
      .send({ eventId: event._id, ticketTypeId: event.ticketTypes[0]._id, quantity: 1 });
    expect(regRes.body.registration.status).toBe('CONFIRMED');

    const ticketRes = await request(app).get(`/api/registrations/${regRes.body.registration._id}/ticket`).set('Authorization', `Bearer ${attendee.accessToken}`);
    const qrPayload = ticketRes.body.registration.qrPayload;

    const checkInRes = await request(app).post('/api/attendance/check-in').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ qrPayload, eventId: event._id });
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.registration.status).toBe('ATTENDED');
    expect(checkInRes.body.registration.checkedIn).toBe(true);

    // Scanning the same ticket again must be rejected as a duplicate.
    const dupRes = await request(app).post('/api/attendance/check-in').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ qrPayload, eventId: event._id });
    expect(dupRes.status).toBe(409);

    // Completing the event should auto-issue a certificate for the checked-in attendee.
    const completeRes = await request(app).post(`/api/events/${event._id}/complete`).set('Authorization', `Bearer ${organizer.accessToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.event.status).toBe('COMPLETED');
    expect(completeRes.body.certificatesIssued).toBe(1);

    const certsRes = await request(app).get('/api/certificates/mine').set('Authorization', `Bearer ${attendee.accessToken}`);
    expect(certsRes.body.certificates.length).toBe(1);
  });
});
