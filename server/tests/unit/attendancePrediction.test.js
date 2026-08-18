import { describe, test, expect } from '@jest/globals';
process.env.JWT_SECRET = 'test-secret';
import { trainModel, predictForRegistration } from '../../src/services/attendancePredictionService.js';

describe('attendancePredictionService', () => {
  test('trains and reports plausible evaluation metrics', () => {
    const { metrics } = trainModel({ nSamples: 1500, nTrees: 15 });
    expect(metrics.accuracy).toBeGreaterThan(0.55);
    expect(metrics.rocAuc).toBeGreaterThan(0.6);
  });

  test('a high-engagement user gets a higher attendance probability than a low-engagement one', () => {
    trainModel({ nSamples: 2000, nTrees: 20 });
    const event = { date: new Date(Date.now() + 5 * 86400000), startTime: '18:00', ticketTypes: [{ price: 0 }] };

    const highEngagement = predictForRegistration({
      userStats: { attendanceRate: 0.95, cancellations: 0 },
      event, registrationDate: new Date(), reminderInteraction: 1, sameCityAsEvent: 1, categoryPopularity: 0.9,
    });
    const lowEngagement = predictForRegistration({
      userStats: { attendanceRate: 0.05, cancellations: 4 },
      event: { ...event, date: new Date(Date.now() + 45 * 86400000), ticketTypes: [{ price: 3000 }] },
      registrationDate: new Date(), reminderInteraction: 0, sameCityAsEvent: 0, categoryPopularity: 0.1,
    });

    expect(highEngagement.attendanceProbability).toBeGreaterThan(lowEngagement.attendanceProbability);
  });
});
