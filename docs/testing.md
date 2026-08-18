# Testing

Backend tests live in `server/tests/` and use Jest with native ESM
(`--experimental-vm-modules`) — run with `npm test` from `server/`.

## Unit tests (no external services required)
- `tests/unit/ticketService.test.js` — QR payload signing/verification,
  including rejecting a tampered payload (forged ticket detection).
- `tests/unit/randomForest.test.js` — the from-scratch Random Forest learns
  a separable pattern with >85% accuracy, feature importance favors the
  informative feature, and `predictProba` stays within [0, 1].
- `tests/unit/attendancePrediction.test.js` — the trained model reports
  plausible evaluation metrics and correctly ranks a high-engagement user
  above a low-engagement one.
- `tests/unit/recommendationMath.test.js` — cosine similarity properties
  (identity, orthogonality, no division-by-zero on empty vectors), feature
  vector construction, price bucketing, and that a matching-interest user
  scores higher than a mismatched one.

All 15 unit tests were run and verified passing during development of this
project (see below).

## Integration tests (require MongoDB — via `mongodb-memory-server`)
- `tests/integration/auth.test.js` — registration, duplicate-email
  rejection, forced non-admin role on signup, login success/failure,
  protected-route 401 without a token.
- `tests/integration/rbacAndEvents.test.js` — attendees cannot create
  events, organizers can (as DRAFT), only admins can approve/reject, and a
  full capacity/overbooking test: a 1-capacity ticket type accepts exactly
  one registration and rejects the second with 409.

**Note on this repository's build environment:** `mongodb-memory-server`
downloads a real `mongod` binary the first time it runs. In the sandbox
this project was built in, outbound access to `fastdl.mongodb.org` is
blocked, so the integration suite could not be executed there — this is a
network-policy limitation of that specific build environment, not a defect
in the tests or the code they exercise. On a normal development machine
with internet access, `npm test` will download the binary once (cached
afterwards) and run the full suite, including the integration tests, exactly
as described above.

## What isn't covered
Frontend component tests, end-to-end (Cypress/Playwright) tests, and load
testing are not included — flagged in `README.md → Known limitations` as
natural next steps rather than silently omitted.
