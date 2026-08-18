import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';

let app;

beforeAll(async () => {
  await setupTestDb();
  ({ default: app } = await import('../../src/app.js'));
});
afterAll(teardownTestDb);
beforeEach(clearTestDb);

describe('Auth flow', () => {
  test('registers a new attendee and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe', email: 'jane@example.com', password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('attendee');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('rejects registration with an already-used email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'dup@example.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email: 'dup@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('cannot self-register as admin - role is forced to attendee/organizer', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker', email: 'hacker@example.com', password: 'password123', role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).not.toBe('admin');
  });

  test('logs in with correct credentials and rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Jane', email: 'jane2@example.com', password: 'correct-password' });
    const good = await request(app).post('/api/auth/login').send({ email: 'jane2@example.com', password: 'correct-password' });
    expect(good.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({ email: 'jane2@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  test('protected route rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
