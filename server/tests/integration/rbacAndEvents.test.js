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

  test('only admin can moderate (approve) an event', async () => {
    const organizer = await registerUser('organizer');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`).send(await makeEventPayload());
    const eventId = createRes.body.event._id;
    await request(app).post(`/api/events/${eventId}/submit`).set('Authorization', `Bearer ${organizer.accessToken}`);

    const attendeeAttempt = await registerUser('attendee');
    const forbidden = await request(app).post(`/api/events/${eventId}/moderate`).set('Authorization', `Bearer ${attendeeAttempt.accessToken}`).send({ decision: 'approve' });
    expect(forbidden.status).toBe(403);
  });
});

describe('Event capacity / overbooking prevention', () => {
  test('registration is rejected once ticket capacity is exhausted', async () => {
    const organizer = await registerUser('organizer', 'org-cap@example.com');
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizer.accessToken}`)
      .send(await makeEventPayload({ capacity: 1, ticketTypes: [{ name: 'Regular', price: 0, capacity: 1 }] }));
    const event = createRes.body.event;
    await request(app).post(`/api/events/${event._id}/submit`).set('Authorization', `Bearer ${organizer.accessToken}`);
    await request(app).post(`/api/events/${event._id}/moderate`).set('Authorization', `Bearer ${(await registerAdmin()).accessToken}`).send({ decision: 'approve' });

    const ticketTypeId = event.ticketTypes[0]._id;

    const user1 = await registerUser('attendee', 'u1@example.com');
    const reg1 = await request(app).post('/api/registrations').set('Authorization', `Bearer ${user1.accessToken}`).send({ eventId: event._id, ticketTypeId, quantity: 1 });
    expect(reg1.status).toBe(201);

    const user2 = await registerUser('attendee', 'u2@example.com');
    const reg2 = await request(app).post('/api/registrations').set('Authorization', `Bearer ${user2.accessToken}`).send({ eventId: event._id, ticketTypeId, quantity: 1 });
    expect(reg2.status).toBe(409); // capacity exhausted
  });

  async function registerAdmin() {
    // Admin cannot self-register via API by design, so promote directly in the test DB.
    const mongoose = (await import('mongoose')).default;
    const User = (await import('../../src/models/User.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    const existing = await User.findOne({ email: 'admin-test@example.com' });
    if (existing) {
      const { signAccessToken } = await import('../../src/middleware/auth.js');
      return { accessToken: signAccessToken(existing) };
    }
    const passwordHash = await bcrypt.hash('password123', 10);
    const admin = await User.create({ name: 'Admin', email: 'admin-test@example.com', passwordHash, role: 'admin' });
    const { signAccessToken } = await import('../../src/middleware/auth.js');
    return { accessToken: signAccessToken(admin) };
  }
});
