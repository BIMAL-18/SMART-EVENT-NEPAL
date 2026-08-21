# Viva Questions & Answers

## Architecture & general
**1. Why MERN-style architecture (MongoDB, Express, React, Node) for this project?**
It's well-suited to a fast-moving, document-shaped domain (events with
embedded ticket types, flexible interaction records) and lets one language
(JavaScript) span the whole stack, reducing context-switching for a
solo/small-team academic project.

**2. Why did you implement the recommendation engine and attendance model
inside the Node server instead of a separate Python/FastAPI service?**
It removes a second runtime, a second dependency set, and a second network
hop that could fail independently. The algorithms (cosine similarity, KNN,
bagged decision trees) don't require scikit-learn specifically — they're
implementable directly, and doing so keeps the whole system runnable with
one `npm install`. The trade-off (JS is less common for ML than Python) is
acknowledged in `docs/architecture.md`.

**3. What happens if MongoDB isn't running when the server starts?**
`connectDB()` catches the connection error, logs it, and retries in the
background every 8 seconds instead of crashing the process. A middleware in
`app.js` returns a friendly 503 for any `/api` route (except `/health`)
while the DB is down, so the frontend can show a clear message instead of a
generic network error.

**4. How do you prevent the frontend from asserting its own role/authorization?**
`requireAuth` decodes the JWT to get the user ID only, then re-fetches the
full user record from MongoDB and attaches *that* to `req.user`. All
`requireRole()` checks read from this DB-sourced object. Nothing in the
request body or JWT claims is trusted for authorization decisions.

## Recommendation engine
**5. What is content-based filtering here, concretely?**
Each event becomes a sparse vector of weighted features (category, tags,
event type, city, language, price bucket). Each user gets a vector built
from their stated interests plus every interaction they've had with events,
scaled by interaction weight. Similarity is cosine similarity between these
vectors.

**6. What is collaborative filtering here, concretely?**
A user × event interaction matrix (sparse) is built from all `Interaction`
records. For a target user, we find the K most similar other users (cosine
similarity over their interaction vectors) and aggregate what those
neighbours engaged with, weighted by similarity, to score candidate events.

**7. Why cosine similarity and not Euclidean distance?**
Cosine similarity is scale-invariant — it cares about the *direction* of
the preference vector, not its magnitude, which matters here because power
users (many interactions) and new users (few interactions) shouldn't be
penalised just for having vectors of different lengths.

**8. How is the hybrid score computed?**
`0.6 * contentScore + 0.4 * collaborativeScore`, both configurable via
environment variables. Content and collaborative scores are each normalised
to roughly 0–1 before combining.

**9. What is the cold-start problem and how do you solve it?**
New users have no interactions and possibly no stated interests, so their
preference vector is all zeros and cosine similarity against any event is
0. Instead of returning nothing, the engine falls back to a
popularity + recency + same-city score for users with zero signal.

**10. How do new events (no interaction history) get recommended?**
They still score on the content-based half of the hybrid formula purely
from their category/tags/city/type matching a user's profile, even with a
collaborative score of 0.

**11. What interaction types are tracked and what are their weights?**
VIEW=1, CLICK=2, FAVORITE=3, REGISTER=5, RATE=6, ATTEND=7, SEARCH=1 —
matching the project specification exactly.

**12. How would you evaluate recommendation quality formally?**
Precision@K, Recall@K, and NDCG@K against a held-out set of interactions
(e.g. mask a user's most recent REGISTER/ATTEND events, see if the engine
would have surfaced them in the top-K). This project documents the
methodology but doesn't compute it against the small seed dataset, since
meaningful numbers need a larger, more realistic interaction history.

## Attendance prediction
**13. What machine learning model predicts attendance?**
A Random Forest classifier — an ensemble of bagged decision trees trained
with Gini-impurity splitting and random feature subsampling per split,
implemented from scratch in `randomForest.js`.

**14. Why implement Random Forest from scratch instead of using a library?**
To keep the app to a single Node process with zero extra runtime
dependencies, and so every line of the algorithm is inspectable for a viva
walkthrough rather than being a library black box.

**15. What features does the model use?**
Nine features: previous attendance rate, category popularity, ticket price
bucket, event day of week, event start hour, days before the event at
registration time, previous cancellations, reminder interaction, and
same-city-as-event. See `docs/attendance-prediction.md` for the full list.

**16. What data was the model trained on?**
A seeded, synthetic dataset (4,000 rows by default) generated with a
logistic function that encodes plausible real-world relationships (e.g.
higher prior attendance and reminder engagement increase attendance
probability; higher price and more prior cancellations decrease it), plus
random noise. This is explicitly labeled as demo data — not real Nepal-wide
attendance history.

**17. How do you evaluate the model?**
An 80/20 train/test split; the test set is scored for accuracy, precision,
recall, F1, and an approximate ROC-AUC computed via a rank-based
Mann-Whitney U statistic (no external stats library needed). Typical
results: ~74% accuracy, ~0.80 ROC-AUC.

**18. What is Gini impurity and why use it for splitting?**
A measure of how mixed the class labels are in a node (0 = pure, up to 0.5
for a 50/50 binary split). At each candidate split, the tree picks the
feature/threshold that most reduces the weighted Gini impurity of the
resulting child nodes — i.e. the split that best separates ATTEND from
NO_SHOW.

**19. What is bagging and why does it help?**
Each tree is trained on a bootstrap sample (random sample with replacement,
same size as the original data) of the training set. This means each tree
sees a slightly different dataset, so their individual errors are less
correlated; averaging their predictions (the forest's output) reduces
variance compared to a single tree.

**20. What is feature subsampling and why does it help?**
At each split, only a random subset of features is considered as
candidates (default: all features when there are ≤3, otherwise √n). This
decorrelates the trees further — without it, a very strong feature would
dominate every tree's root split, making the trees very similar to each
other (and bagging alone wouldn't reduce variance much).

**21. How is feature importance computed?**
By counting how many times each feature is chosen as a split node across
every tree in the forest, then normalising those counts to sum to 1.

**22. What does the organizer's AI panel actually show?**
For every confirmed registration on an event, the model predicts an
individual attendance probability (using that attendee's real historical
attendance rate pulled from their `Interaction` history). These are summed
to produce `predictedAttendance` and `predictedNoShows` for the whole event.

## Authentication & security
**23. How are passwords stored?**
Hashed with bcrypt (10 salt rounds). The plain password is never persisted
or logged.

**24. Why both an access token and a refresh token?**
The access token is short-lived (15 min default) to limit the blast radius
if it leaks; the refresh token is longer-lived (7 days) and used only to
mint new access tokens, and is itself stored hashed server-side so a
database leak doesn't directly hand out usable refresh tokens.

**25. How do you prevent privilege escalation at signup?**
`register()` explicitly maps any role value that isn't `'organizer'` to
`'attendee'` — `'admin'` can never be self-assigned through the public API.

**26. How is a QR ticket protected against forgery?**
The QR payload is `ticketId|eventId|registrationId|signature`, where
`signature` is an HMAC-SHA256 of the first three fields keyed by
`JWT_SECRET`. `verifyQrPayload()` recomputes the signature and rejects any
mismatch, so a forged or edited payload fails verification immediately.

**27. How is double check-in prevented?**
`Registration.checkedIn` is checked before marking a ticket as checked in;
if already true, the API returns 409 with `duplicate: true` instead of
processing it again.

**28. How is overbooking prevented under concurrent requests?**
Ticket capacity is enforced with a MongoDB conditional update (`$inc` on
`ticketTypes.$.sold` guarded by an `$expr` check that sold+quantity stays
within capacity), which is atomic at the document level — two concurrent
requests can't both succeed past capacity.

**29. Why is `/payments/verify` necessary if `/payments/initiate` already
returns a reference?**
Initiating a payment only starts the transaction; the client could claim
success without actually paying. `verify()` always calls the provider's own
verification method server-side (or, for eSewa/Khalti without real
credentials, correctly fails since a live check is impossible) before a
ticket is ever issued.

## Payments
**30. What happens if eSewa/Khalti credentials aren't configured?**
`getProvider()` transparently falls back to `MockPaymentProvider`
regardless of what the client requested, and the API response includes
`usingDemoProvider: true` so the frontend can tell the user plainly, rather
than silently pretending to be a real gateway.

**31. Is the Demo Payment ever presented to the user as a real transaction?**
No — the UI explicitly labels it "Demo Payment" and shows an info banner
explaining why, whenever eSewa/Khalti aren't configured.

## Data model
**32. Why are ticket types embedded in the Event document rather than a
separate collection?**
They're always read and written together with their parent event and never
queried independently at scale, so embedding avoids an extra join/lookup
for the most common access pattern (rendering an event page).

**33. Why is Interaction a separate, append-only collection instead of,
say, counters on the Event document?**
The recommendation engine needs the full history (who did what, when) to
build per-user vectors and the interaction matrix — aggregated counters
would lose exactly the information the AI needs.

**34. How is a certificate's authenticity checkable by a third party?**
`GET /api/certificates/verify/:code` is a public endpoint that looks up a
certificate by its `verificationCode` and returns the attendee name, event,
and issue date if found — no authentication required, so anyone holding a
printed certificate's code can verify it.

## Frontend
**35. How does the frontend handle an expired access token?**
An Axios response interceptor catches a 401, attempts one silent refresh
using the stored refresh token, retries the original request, and only
redirects to `/login` if the refresh itself fails.

**36. How does the organizer's check-in page update in real time?**
It joins a Socket.IO room for the event (`event:<id>`) and listens for
`attendance.checkedIn`, which the backend emits after every successful
check-in with the latest registered/checked-in counts — no polling.

**37. What happens if the camera isn't available for QR scanning?**
The check-in page falls back to a manual text field where the organizer can
paste the raw QR payload string, which is validated identically server-side.

## Trade-offs & limitations
**38. What would you improve with more time?**
Precision@K/NDCG@K evaluation with a larger interaction dataset, a real
Cloudinary/S3 image upload pipeline instead of image URLs, full i18n
wiring (locale files exist but aren't yet connected to a language
switcher), and end-to-end (Cypress) tests.

**39. Why plain JavaScript instead of TypeScript given the spec asked for it?**
Given the scope (12+ models, 40+ endpoints, a full SPA), TypeScript's
compile-time safety was traded for a much lower risk of type errors
blocking a first run in front of examiners; this is documented as a
deliberate, disclosed trade-off rather than hidden.

**40. How would you scale this beyond a single server instance?**
Move Socket.IO to a Redis adapter for multi-instance pub/sub, move session/
refresh-token state out of process (already stateless via JWT + DB lookup,
so this mostly just works), and split the recommendation engine into its
own worker process reading from the same MongoDB if computation becomes a
bottleneck — the interface was kept narrow specifically to make this easy.

**41. How do you know the AI is "real" and not just producing plausible-
looking random numbers?**
The unit tests directly assert on the underlying math: cosine similarity of
identical vectors is exactly 1, of orthogonal vectors is exactly 0; a
Random Forest trained on a clearly-separable synthetic pattern reaches
>85% test accuracy; a high-engagement synthetic attendee profile always
scores a higher attendance probability than a low-engagement one. These are
deterministic properties a random-number generator could not satisfy.

## Event workflow & lifecycle

**42. Does an organizer need admin approval to publish an event?**
No. `POST /api/events/:id/publish` lets an organizer take their own event
straight from DRAFT (or PENDING_APPROVAL) to PUBLISHED. The optional
`submit`/`moderate` admin-review pair still exists in the codebase for a
team that wants a review step, but it's not required — admins retain full
visibility and override power (they can still cancel or suspend anything)
without being a mandatory gate to going live.

**43. How are private events (e.g. a birthday party) different from public
ones?**
A private event is excluded from `/api/events` search/browse results (the
listEvents query filters them out for anyone except their own organizer or
an admin), but `GET /api/events/:id` still works for anyone who has the
direct link — the same pattern as an "unlisted" video. It still goes
through registration, payment, QR ticketing, and check-in exactly like a
public event.

**44. What can the admin see that an organizer cannot?**
Everything, platform-wide: `GET /api/admin/events` lists every event
regardless of status or visibility (including other organizers' private/
draft events), `GET /api/admin/registrations` lists every registration
across every organizer, and `/api/admin/payments` / `/api/admin/audit-logs`
/ `/api/admin/analytics` give platform-wide financial and activity
visibility. An organizer's dashboard, by contrast, is always scoped to
`organizer: req.user._id`.

**45. What exactly happens when a QR ticket is scanned?**
Beyond the boolean `checkedIn`/`checkedInAt` fields, the registration's
`status` field itself transitions from `CONFIRMED` to `ATTENDED` — a
first-class, queryable status rather than an implicit flag. This has two
practical consequences enforced in code: an ATTENDED registration can no
longer be cancelled (`cancelRegistration` explicitly blocks it), and every
dashboard/analytics query that used to filter on `status: 'CONFIRMED'` was
updated to match `{$in: ['CONFIRMED', 'ATTENDED']}` so attended tickets
still count as valid registrations everywhere they should.

**46. How does certificate issuance work after an event ends?**
An organizer or admin calls `POST /api/events/:id/complete`
(PUBLISHED → COMPLETED). That single call triggers
`issueCertificatesForCompletedEvent()`, which finds every registration for
that event with `checkedIn: true` and generates a certificate + sends a
notification for each one automatically, in bulk. The manual
`POST /api/certificates/issue` endpoint still exists for an attendee to
re-fetch their own certificate record, but it's no longer the primary path
— nobody has to remember to request one.
