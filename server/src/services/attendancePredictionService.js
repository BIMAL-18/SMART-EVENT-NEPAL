/**
 * Attendance prediction using the from-scratch RandomForestClassifier
 * (see randomForest.js). The model is trained once at server startup (and
 * can be retrained on demand via POST /api/ai/attendance/retrain) on a
 * SEEDED, SYNTHETIC historical dataset - clearly labeled as demo/training
 * data per the project spec. It is not real-world Nepal-wide data.
 *
 * Features (in fixed order - see FEATURE_NAMES):
 *  0 prevAttendanceRate     - user's historical attendance rate (0..1)
 *  1 categoryPopularity     - normalised popularity score of the event category (0..1)
 *  2 ticketPriceBucket      - 0 free, 1 low, 2 mid, 3 high
 *  3 eventDayOfWeek         - 0..6
 *  4 eventHour              - 0..23 (start time)
 *  5 daysBeforeEvent        - days between registration and event date
 *  6 prevCancellations      - user's historical cancellation count (capped)
 *  7 reminderInteraction    - whether user clicked/opened a reminder (0/1)
 *  8 sameCityAsEvent        - whether user's city matches event city (0/1)
 */
import { RandomForestClassifier, evaluateClassifier } from './randomForest.js';

export const FEATURE_NAMES = [
  'prevAttendanceRate', 'categoryPopularity', 'ticketPriceBucket', 'eventDayOfWeek',
  'eventHour', 'daysBeforeEvent', 'prevCancellations', 'reminderInteraction', 'sameCityAsEvent',
];

let model = null;
let lastMetrics = null;
let trainedAt = null;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generates a synthetic but *behaviourally plausible* historical dataset:
// higher prevAttendanceRate, reminder interaction, and same-city all push
// toward ATTEND; high price, many prior cancellations, and long lead time
// push toward NO_SHOW. This encodes real-world intuition into label
// generation so the model has genuine, learnable signal (not pure noise).
export function generateSyntheticTrainingData(nSamples = 4000, seed = 42) {
  const rand = seededRandom(seed);
  const rows = [];
  const labels = [];

  for (let i = 0; i < nSamples; i++) {
    const prevAttendanceRate = rand();
    const categoryPopularity = rand();
    const ticketPriceBucket = Math.floor(rand() * 4);
    const eventDayOfWeek = Math.floor(rand() * 7);
    const eventHour = Math.floor(rand() * 24);
    const daysBeforeEvent = Math.floor(rand() * 60);
    const prevCancellations = Math.floor(rand() * 5);
    const reminderInteraction = rand() > 0.5 ? 1 : 0;
    const sameCityAsEvent = rand() > 0.4 ? 1 : 0;

    let score =
      prevAttendanceRate * 2.2 +
      categoryPopularity * 0.5 +
      reminderInteraction * 0.6 +
      sameCityAsEvent * 0.5 -
      ticketPriceBucket * 0.25 -
      prevCancellations * 0.35 -
      (daysBeforeEvent > 30 ? 0.5 : 0) -
      (eventDayOfWeek === 1 || eventDayOfWeek === 2 ? 0.1 : 0); // weekday slight dip
    score += (rand() - 0.5) * 0.8; // noise

    const prob = 1 / (1 + Math.exp(-((score - 1.1) * 1.6))); // logistic squashing
    const label = rand() < prob ? 1 : 0;

    rows.push([
      prevAttendanceRate, categoryPopularity, ticketPriceBucket, eventDayOfWeek,
      eventHour, daysBeforeEvent, prevCancellations, reminderInteraction, sameCityAsEvent,
    ]);
    labels.push(label);
  }
  return { rows, labels };
}

export function trainModel({ nSamples = 4000, nTrees = 30 } = {}) {
  const { rows, labels } = generateSyntheticTrainingData(nSamples);
  const splitAt = Math.floor(rows.length * 0.8);
  const trainRows = rows.slice(0, splitAt), trainLabels = labels.slice(0, splitAt);
  const testRows = rows.slice(splitAt), testLabels = labels.slice(splitAt);

  model = new RandomForestClassifier({ nTrees, maxDepth: 7, minSize: 6, featureNames: FEATURE_NAMES });
  model.fit(trainRows, trainLabels);
  lastMetrics = evaluateClassifier(model, testRows, testLabels);
  trainedAt = new Date();
  console.log('[ml] Attendance RandomForest trained on synthetic data. Test metrics:', lastMetrics);
  return { metrics: lastMetrics, trainedAt };
}

export function getModelInfo() {
  if (!model) return { trained: false };
  return {
    trained: true,
    trainedAt,
    metrics: lastMetrics,
    featureImportance: model.featureImportance,
    nTrees: model.trees.length,
    note: 'Trained on a seeded synthetic dataset for demo purposes. Not real-world attendance data.',
  };
}

function dayOfWeek(date) { return new Date(date).getDay(); }
function hourOf(timeStr) { return timeStr ? Number(timeStr.split(':')[0]) : 18; }

function priceBucketNum(price) {
  if (price === 0) return 0;
  if (price <= 500) return 1;
  if (price <= 2000) return 2;
  return 3;
}

/**
 * Predict attendance probability for a single registration.
 * userStats: { attendanceRate, cancellations }
 */
export function predictForRegistration({ userStats, event, registrationDate, reminderInteraction = 0, sameCityAsEvent = 0, categoryPopularity = 0.5 }) {
  if (!model) trainModel();
  const daysBeforeEvent = Math.max(0, Math.round((new Date(event.date) - new Date(registrationDate)) / 86400000));
  const price = event.ticketTypes?.[0]?.price ?? 0;

  const row = [
    userStats.attendanceRate ?? 0.6,
    categoryPopularity,
    priceBucketNum(price),
    dayOfWeek(event.date),
    hourOf(event.startTime),
    daysBeforeEvent,
    Math.min(5, userStats.cancellations ?? 0),
    reminderInteraction,
    sameCityAsEvent,
  ];

  const attendanceProbability = model.predictProba(row);
  return {
    attendanceProbability: Number(attendanceProbability.toFixed(3)),
    noShowProbability: Number((1 - attendanceProbability).toFixed(3)),
    prediction: attendanceProbability >= 0.5 ? 'ATTEND' : 'NO_SHOW',
  };
}

/**
 * Aggregate prediction across all confirmed registrations for an event -
 * used by the organizer dashboard AI panel.
 */
export function predictForEventRegistrations(registrations, event, userStatsMap) {
  if (!model) trainModel();
  let expectedAttend = 0;
  const perRegistration = registrations.map(reg => {
    const stats = userStatsMap.get(reg.user.toString()) || { attendanceRate: 0.6, cancellations: 0 };
    const result = predictForRegistration({
      userStats: stats,
      event,
      registrationDate: reg.registeredAt || reg.createdAt,
      sameCityAsEvent: 0,
    });
    expectedAttend += result.attendanceProbability;
    return { registrationId: reg._id, ...result };
  });
  const registered = registrations.length;
  const predictedAttendance = Math.round(expectedAttend);
  const predictedNoShows = registered - predictedAttendance;
  return {
    registered,
    predictedAttendance,
    predictedNoShows,
    noShowRate: registered ? Number((predictedNoShows / registered).toFixed(3)) : 0,
    perRegistration,
  };
}
