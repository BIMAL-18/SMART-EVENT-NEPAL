# AI Recommendation Engine

Implemented in `server/src/services/recommendationService.js`. This is a
real, computed hybrid recommender — not randomized percentages.

## 1. Content-based filtering
Every event is converted to a sparse feature vector (`eventFeatureVector`):
category (weight 3), event type (2), city (1.5), language (0.5), price
bucket (1), and each tag (1.5). A user's preference vector is built the same
way from their `interests`, `city`, and every `Interaction` they've made,
where each event's feature vector is added into the user vector scaled by
the interaction's weight (see table below). Similarity between the user
vector and each candidate event vector is **cosine similarity**.

## 2. Collaborative filtering
A sparse user × event interaction matrix is built from all `Interaction`
records. For the target user, cosine similarity is computed against every
other user's interaction vector; the **K nearest neighbours** (default K=8,
`REC_KNN_K` env var) are kept. Each neighbour's interactions are summed,
weighted by that neighbour's similarity to the target user, to produce a
collaborative score per candidate event.

## 3. Hybrid scoring
```
hybridScore = CONTENT_WEIGHT * contentScore + COLLAB_WEIGHT * collabScore
```
Defaults: `CONTENT_WEIGHT=0.6`, `COLLAB_WEIGHT=0.4` (configurable via
`REC_CONTENT_WEIGHT` / `REC_COLLAB_WEIGHT` env vars, as required by the
spec). The top 10 (configurable) events by hybrid score are returned, each
with a human-readable `reason` string generated from which signals fired
(matching interest, same city, high content similarity, collaborative
signal).

## Interaction weights
```
VIEW = 1   CLICK = 2   FAVORITE = 3
REGISTER = 5   RATE = 6   ATTEND = 7   SEARCH = 1
```
Matches the spec exactly (`server/src/models/Interaction.js`).

## Cold start
A user with zero interactions and no stated interests receives
popularity + recency scored events instead of a zero vector (which would
otherwise make every cosine similarity 0). Popularity combines view count,
rating count/average, and a `1/sqrt(daysAway)` recency term, plus a same-
city boost. The response is clearly flagged in the API payload
(`breakdown.cold_start: true`) and explained to the user in the `reason`
field, per the spec's requirement not to leave new users empty-handed.

New events with no interaction history naturally score well under the
content-based half of the hybrid formula (category/tag/city match) even
before any collaborative signal accumulates, satisfying the "new events"
cold-start requirement.

## Evaluation
`docs/testing.md` / `server/tests/unit/recommendationMath.test.js` verify
the underlying math (cosine similarity properties, feature vector
construction, price bucketing) directly. Precision@K / Recall@K / NDCG@K
against held-out interactions are documented as a natural next step in
`README.md → Future improvements` — computing them meaningfully requires a
held-out relevance dataset larger than what the seed script produces, and
is a good extension exercise for the project defense.
