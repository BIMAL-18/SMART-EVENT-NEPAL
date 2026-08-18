import { describe, test, expect } from '@jest/globals';
process.env.JWT_SECRET = 'test-secret';
import { _internal } from '../../src/services/recommendationService.js';

describe('recommendation engine math', () => {
  const { cosineSim, eventFeatureVector, priceBucket } = _internal();

  test('cosine similarity of identical vectors is 1', () => {
    const v = { a: 2, b: 3 };
    expect(cosineSim(v, v)).toBeCloseTo(1, 5);
  });

  test('cosine similarity of orthogonal vectors is 0', () => {
    expect(cosineSim({ a: 1 }, { b: 1 })).toBe(0);
  });

  test('cosine similarity of an empty vector is 0 (no division by zero)', () => {
    expect(cosineSim({}, { a: 1 })).toBe(0);
  });

  test('event feature vector weights category and tags', () => {
    const event = { category: 'technology', eventType: 'Workshop', city: 'Kathmandu', language: 'English', tags: ['ai', 'ml'], ticketTypes: [{ price: 0 }] };
    const vec = eventFeatureVector(event);
    expect(vec['cat:category:technology']).toBeGreaterThan(0);
    expect(vec['cat:tag:ai']).toBeGreaterThan(0);
  });

  test('price bucket boundaries', () => {
    expect(priceBucket(0)).toBe('free');
    expect(priceBucket(300)).toBe('low');
    expect(priceBucket(1000)).toBe('mid');
    expect(priceBucket(5000)).toBe('high');
  });

  test('a user vector matching an event category scores higher than a mismatched one', () => {
    const event = { category: 'music', eventType: 'Concert', city: 'Pokhara', language: 'English', tags: ['live-music'], ticketTypes: [{ price: 500 }] };
    const evVec = eventFeatureVector(event);
    const matchingUser = { 'cat:category:music': 4 };
    const mismatchedUser = { 'cat:category:sports': 4 };
    expect(cosineSim(matchingUser, evVec)).toBeGreaterThan(cosineSim(mismatchedUser, evVec));
  });
});
