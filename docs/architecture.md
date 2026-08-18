# Architecture

## Overview
SmartEvent Nepal is a three-tier application:

```
client/   React + Vite + Tailwind SPA (port 5173)
server/   Node.js + Express + MongoDB REST API + Socket.IO (port 5000)
```

An `ml-service/` directory is intentionally **not** a separate Python/FastAPI
process in this build. The spec allows "a working fallback model" when a
separate ML service isn't practical; here, the Random Forest and the hybrid
recommendation engine are implemented directly inside `server/src/services/`
in plain JavaScript, trained/queried in-process. This keeps the app to two
processes instead of three, with zero cross-service network calls to debug,
while the algorithms themselves are real (see `ai-recommendation.md` and
`attendance-prediction.md`). The interface is deliberately narrow
(`predictForRegistration`, `getRecommendationsForUser`) so swapping in an
actual Python microservice later is a drop-in change, not a rewrite.

## Request flow
1. Client calls `/api/*` (proxied to the Express server in dev via Vite).
2. `requireAuth` verifies the JWT and re-fetches the user from MongoDB —
   the role used for authorization always comes from the database record,
   never from the token payload's claims being trusted blindly, and never
   from anything the client sends in the request body.
3. Controllers perform business logic and persist via Mongoose models.
4. Socket.IO pushes real-time events (`attendance.checkedIn`,
   `notification.created`) to per-user and per-event rooms.

## Why plain JavaScript instead of TypeScript
Given the project's scope (12+ models, 10+ services, 40+ endpoints, a full
SPA), plain JS was chosen over TypeScript to minimize the chance of type
errors blocking a first run in a viva setting. The trade-off is documented
here rather than hidden — see `docs/testing.md` and `README.md`
"Known limitations" for how this affects maintainability.

## Payment architecture

```
PaymentProvider (interface)
   ├── EsewaProvider   - real integration skeleton, requires ESEWA_MERCHANT_ID/SECRET
   ├── KhaltiProvider  - real integration skeleton, requires KHALTI_SECRET_KEY
   └── MockPaymentProvider - always available, used automatically when
                             real credentials are absent
```

`getProvider(name)` in `server/src/services/payment/index.js` silently falls
back to the mock provider whenever the requested provider's credentials
aren't configured — the client is told this via `usingDemoProvider` in the
API response, and the UI surfaces it to the user. Payment status is **never**
set to PAID by the client; `POST /api/payments/verify` always re-verifies
server-side against the provider before issuing a ticket.

## Real-time layer
Socket.IO rooms:
- `user:<id>` — personal notifications
- `event:<id>` — organizer check-in dashboards subscribe here and receive
  `attendance.checkedIn` events with live registered/checked-in counts.
