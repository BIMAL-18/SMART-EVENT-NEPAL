/**
 * Hybrid recommendation engine.
 *
 * Content-based: builds a numeric/categorical feature vector for every published
 * event (category, tags, eventType, city, language, price bucket) and a matching
 * preference vector for the user from their stated interests + weighted
 * interactions (VIEW/CLICK/FAVORITE/REGISTER/RATE/ATTEND). Similarity = cosine.
 *
 * Collaborative: builds a sparse user-event interaction matrix from Interaction
 * records, finds the K nearest neighbour users by cosine similarity on that
 * matrix, and scores events by how much similar users engaged with them.
 *
 * Hybrid score = contentWeight * contentScore + collabWeight * collabScore
 * Weights are configurable (default 0.6 / 0.4 per spec).
 */
import Event from '../models/Event.js';
import Interaction, { INTERACTION_WEIGHTS } from '../models/Interaction.js';
import User from '../models/User.js';

const CONTENT_WEIGHT = Number(process.env.REC_CONTENT_WEIGHT || 0.6);
const COLLAB_WEIGHT = Number(process.env.REC_COLLAB_WEIGHT || 0.4);
const KNN_K = Number(process.env.REC_KNN_K || 8);

function priceBucket(price) {
  if (price === 0) return 'free';
  if (price <= 500) return 'low';
  if (price <= 2000) return 'mid';
  return 'high';
}

// Build a bag-of-features vector as a plain object {feature: weight}
function eventFeatureVector(event) {
  const vec = {};
  const bump = (k, w = 1) => { vec[`cat:${k}`] = (vec[`cat:${k}`] || 0) + w; };
  bump(`category:${event.category}`, 3);
  bump(`type:${event.eventType}`, 2);
  bump(`city:${event.city}`, 1.5);
  bump(`lang:${event.language}`, 0.5);
  bump(`price:${priceBucket(event.ticketTypes?.[0]?.price ?? 0)}`, 1);
  (event.tags || []).forEach(t => bump(`tag:${t.toLowerCase()}`, 1.5));
  return vec;
}

function cosineSim(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const a = vecA[k] || 0, b = vecB[k] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function buildUserContentVector(userId, user) {
  const vec = {};
  const bump = (k, w) => { vec[k] = (vec[k] || 0) + w; };
  (user.interests || []).forEach(i => bump(`cat:category:${i}`, 4));
  if (user.city) bump(`cat:city:${user.city}`, 2);

  const interactions = await Interaction.find({ user: userId }).populate('event').limit(500);
  for (const it of interactions) {
    if (!it.event) continue;
    const evVec = eventFeatureVector(it.event);
    for (const [k, w] of Object.entries(evVec)) {
      bump(k, w * it.weight);
    }
  }
  return vec;
}

async function buildInteractionMatrix() {
  // userId -> { eventId -> weight }
  const all = await Interaction.find({}).select('user event weight').limit(20000);
  const matrix = new Map();
  for (const it of all) {
    if (!it.event) continue;
    const uid = it.user.toString();
    const eid = it.event.toString();
    if (!matrix.has(uid)) matrix.set(uid, {});
    matrix.get(uid)[eid] = (matrix.get(uid)[eid] || 0) + it.weight;
  }
  return matrix;
}

function collaborativeScoresForUser(userId, matrix) {
  const target = matrix.get(userId.toString());
  const scores = {}; // eventId -> aggregated neighbour score
  if (!target) return scores;

  const neighbours = [];
  for (const [uid, vec] of matrix.entries()) {
    if (uid === userId.toString()) continue;
    const sim = cosineSim(target, vec);
    if (sim > 0) neighbours.push({ uid, sim, vec });
  }
  neighbours.sort((a, b) => b.sim - a.sim);
  const topK = neighbours.slice(0, KNN_K);

  for (const n of topK) {
    for (const [eid, weight] of Object.entries(n.vec)) {
      scores[eid] = (scores[eid] || 0) + n.sim * weight;
    }
  }
  return scores;
}

function reasonFor(user, event, contentScore, collabScore) {
  const reasons = [];
  if ((user.interests || []).includes(event.category)) {
    reasons.push(`you selected "${event.category}" as an interest`);
  }
  if (user.city && user.city === event.city) {
    reasons.push(`it's happening in ${event.city}, your city`);
  }
  if (contentScore > 0.4) reasons.push(`it closely matches events and categories you've engaged with`);
  if (collabScore > 0) reasons.push(`attendees with similar interests to you engaged with this event`);
  if (reasons.length === 0) reasons.push('it is a popular upcoming event that matches general trends');
  return `Recommended because ${reasons.join(' and ')}.`;
}

export async function getRecommendationsForUser(userId, { limit = 10 } = {}) {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const now = new Date();
  const candidateEvents = await Event.find({ status: 'PUBLISHED', date: { $gte: now } }).limit(300);

  if (candidateEvents.length === 0) return [];

  // COLD START: brand-new users with no interests and no interactions get
  // popularity + recency based recommendations instead of a zero vector.
  const interactionCount = await Interaction.countDocuments({ user: userId });
  const isColdStart = interactionCount === 0 && (!user.interests || user.interests.length === 0);

  if (isColdStart) {
    const scored = candidateEvents
      .map(ev => {
        const popularity = ev.viewCount * 0.5 + ev.ratingCount * 2 + ev.avgRating * 3;
        const daysAway = Math.max(1, (ev.date - now) / 86400000);
        const recency = 1 / Math.sqrt(daysAway);
        const cityBoost = user.city && user.city === ev.city ? 5 : 0;
        const score = popularity + recency * 10 + cityBoost;
        return { event: ev, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    const max = Math.max(...scored.map(s => s.score), 1);
    return scored.map(s => ({
      event: s.event,
      matchPercent: Math.round(Math.min(99, (s.score / max) * 85 + 15)),
      reason: 'New here! Showing popular, upcoming events near you and matching general trends until we learn your interests.',
      breakdown: { content: 0, collaborative: 0, cold_start: true },
    }));
  }

  const userVec = await buildUserContentVector(userId, user);
  const matrix = await buildInteractionMatrix();
  const collabScores = collaborativeScoresForUser(userId, matrix);
  const maxCollab = Math.max(...Object.values(collabScores), 1);

  const alreadyInteracted = new Set(
    (await Interaction.find({ user: userId, type: { $in: ['REGISTER', 'ATTEND'] } }).select('event')).map(i => i.event?.toString())
  );

  const results = candidateEvents
    .filter(ev => !alreadyInteracted.has(ev._id.toString()))
    .map(ev => {
      const evVec = eventFeatureVector(ev);
      const contentScore = cosineSim(userVec, evVec);
      const rawCollab = collabScores[ev._id.toString()] || 0;
      const collabScore = rawCollab / maxCollab; // normalise 0..1
      const hybrid = CONTENT_WEIGHT * contentScore + COLLAB_WEIGHT * collabScore;
      return {
        event: ev,
        score: hybrid,
        matchPercent: Math.round(Math.min(99, hybrid * 100)),
        reason: reasonFor(user, ev, contentScore, collabScore),
        breakdown: { content: Number(contentScore.toFixed(3)), collaborative: Number(collabScore.toFixed(3)) },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

export function _internal() {
  // exported for tests
  return { cosineSim, eventFeatureVector, priceBucket };
}
