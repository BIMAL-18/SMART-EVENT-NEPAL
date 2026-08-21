# SmartEvent Nepal

**AI-Driven Event Management & Recommendation Platform** — an academic
full-stack project (CSIT / Computer Engineering final-year scope) combining
a real hybrid recommendation engine, a from-scratch Random Forest attendance
predictor, QR-based ticketing and check-in, and role-based dashboards for
attendees, organizers, and administrators.

> **Scope note:** this is a deliberately-trimmed MVP of a very large spec.
> Every feature listed below is real and working end-to-end — no TODOs, no
> mocked API responses pretending to be real, no fake AI. What's trimmed
> (i18n wiring, a separate Python ML microservice, exhaustive admin CRUD,
> full E2E test coverage) is listed explicitly in **Known limitations**
> rather than silently omitted. See `docs/architecture.md` for the
> reasoning behind each trade-off.

## Features

- **Auth**: JWT access + refresh tokens, bcrypt password hashing, RBAC
  (attendee / organizer / admin), forgot/reset password, profile editing
- **Events**: full CRUD, organizers **publish their own events directly —
  no admin approval required**, cancellation, multiple ticket types per
  event (Early Bird / Student / Regular / VIP), capacity enforcement,
  public and private visibility (private events, e.g. a birthday party,
  never show up in public search but are viewable via direct link)
- **Search**: keyword + category/city/type/language/price/date filters,
  multiple sort orders, MongoDB text + compound indexes
- **AI recommendations**: real hybrid content-based (cosine similarity) +
  collaborative (KNN) filtering, configurable weights, cold-start handling,
  human-readable "why recommended" reasons — see `docs/ai-recommendation.md`
- **AI attendance prediction**: a from-scratch Random Forest classifier
  trained on a clearly-labeled synthetic dataset, with real accuracy/
  precision/recall/F1/ROC-AUC evaluation and feature importance — see
  `docs/attendance-prediction.md`
- **Payments**: pluggable provider architecture (eSewa / Khalti / Demo),
  automatically falls back to a working Demo provider when real credentials
  are absent, server-side payment verification only
- **QR ticketing & check-in**: HMAC-signed QR payloads, camera-based
  scanning with a manual-entry fallback, duplicate check-in prevention.
  A successful scan moves the registration's status from `CONFIRMED` to
  `ATTENDED` (a first-class status, not just a boolean flag) and pushes a
  live Socket.IO update to the organizer's dashboard
- **Certificates**: the moment an organizer marks an event `COMPLETED`,
  every checked-in attendee automatically gets a PDF certificate generated
  and a notification — no manual per-attendee step required. Certificates
  are publicly verifiable by code, for eligible (checked-in) attendees of
  completed events, publicly verifiable by code
- **Notifications**: in-app + email (console-logged in dev mode when SMTP
  isn't configured)
- **Dashboards**: attendee, organizer (with AI attendance panel and
  charts), and admin — platform-wide analytics plus full visibility into
  **every** user, event (including private/draft ones), registration, and
  payment on the platform, not just aggregated counts
- **Security**: helmet, CORS, rate limiting, Zod validation everywhere,
  audit logging — see `docs/security.md`

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query, Axios, React Hook Form + Zod, Recharts, Socket.IO client, html5-qrcode |
| Backend | Node.js, Express, MongoDB + Mongoose, JWT, bcrypt, Socket.IO, Zod, Helmet, express-rate-limit, PDFKit, QRCode, Nodemailer |
| AI/ML | Hand-written hybrid recommender + from-scratch Random Forest (plain JS, no Python service — see `docs/architecture.md` for why) |

## Folder structure

```
smart-event-nepal/
├── client/            React SPA
│   └── src/
│       ├── pages/      attendee/, organizer/, admin/, and public pages
│       ├── components/
│       ├── context/     AuthContext
│       ├── api/         axios client with token refresh
│       └── locales/     en.json / ne.json (scaffolded, see limitations)
├── server/
│   └── src/
│       ├── models/       12 Mongoose models
│       ├── controllers/
│       ├── routes/
│       ├── middleware/   auth, RBAC, validation, error handling
│       ├── services/     recommendation, randomForest, attendancePrediction,
│       │                 payment/, ticketService, emailService,
│       │                 notificationService, certificateService, auditService
│       └── seed/         seed.js
├── docs/                architecture, database, api, ai-recommendation,
│                         attendance-prediction, security, testing, viva-questions
├── docker-compose.yml
└── README.md (this file)
```

## Installation

Requires Node.js 18+ and either a local MongoDB instance or Docker.

```bash
git clone <this-repo>
cd smart-event-nepal
npm run install:all       # installs server/ and client/ dependencies
```

## Environment variables

Copy the example files and fill in what you have — everything not
configured degrades gracefully (see table below).

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

| Variable | Required? | Behaviour if missing |
|---|---|---|
| `MONGODB_URI` | Recommended | Server still starts; DB-dependent routes return 503 until Mongo is reachable |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Yes** | Set these to any long random string before running |
| `ESEWA_MERCHANT_ID` / `ESEWA_SECRET` | No | Falls back to Demo Payment provider |
| `KHALTI_SECRET_KEY` | No | Falls back to Demo Payment provider |
| `SMTP_*` | No | Emails are logged to the server console instead of sent |
| `CLOUDINARY_*` | No | Not wired in this build — event images are plain URL strings (see limitations) |

## Database setup

**Option A — Docker (recommended, zero local install):**
```bash
docker compose up
```
This starts MongoDB, the API server, and the client together.

**Option B — local MongoDB:**
Install MongoDB Community Edition and ensure it's running on
`mongodb://127.0.0.1:27017` (or set `MONGODB_URI` to point elsewhere).

## Seed instructions

```bash
npm run seed --prefix server
```
Creates 8 categories, 36 users (1 admin, 5 organizers, 30 attendees), 32
events across 5 cities, and realistic interactions/registrations/payments/
feedback so the recommendation engine and dashboards have real data to show.

## How to run (development)

```bash
# Terminal 1
npm run dev:server     # http://localhost:5000

# Terminal 2
npm run dev:client     # http://localhost:5173
```

Or with Docker: `docker compose up` (then run the seed script once against
the running containers: `docker compose exec server npm run seed`).

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@smarteventnepal.com | Admin@123 |
| Organizer | organizer@smarteventnepal.com | Organizer@123 |
| Attendee | user@smarteventnepal.com | User@123 |

**These are demo credentials seeded by `seed.js` for local development and
grading only — change or remove them before any real deployment.**

## Payment demo mode

Select "Demo Payment" at checkout (or select eSewa/Khalti — the server will
transparently substitute Demo Payment and tell the client it did so, unless
real merchant credentials are set in `server/.env`). The demo flow: initiate
→ "Pay (Demo)" button simulates gateway success → the client-reported
success is **re-verified server-side** before a ticket is ever issued —
exactly like a real integration would, just against an in-memory ledger
instead of a live gateway. See `docs/security.md`.

## ML setup

No separate setup required — the Random Forest attendance model trains
automatically on server boot against a seeded synthetic dataset (labeled as
such throughout the UI and docs). Retrain manually via
`POST /api/ai/attendance/retrain` (admin only). See
`docs/attendance-prediction.md` and `docs/ai-recommendation.md` for full
methodology.

## API overview
See `docs/api.md`.

## Testing

```bash
npm run test:server
```
15 unit tests (recommendation math, Random Forest, attendance prediction,
QR signing) run with zero external dependencies. Integration tests
(auth flow, RBAC, capacity/overbooking) additionally require
`mongodb-memory-server`, which downloads a `mongod` binary on first run —
see `docs/testing.md` for a note on this if you're behind a restrictive
firewall.

## Screenshots
_Add screenshots of the Home page, Event detail, Organizer dashboard (with
the AI attendance panel), and Admin dashboard here before submission._

## Known limitations

Disclosed deliberately rather than hidden:

- **No TypeScript** — plain JavaScript throughout, traded for lower risk of
  type errors blocking a first run (see `docs/architecture.md`).
- **No separate Python/FastAPI ML service** — the recommendation engine and
  Random Forest are implemented directly in the Node server. Algorithmically
  equivalent, operationally simpler; see `docs/architecture.md` for the
  reasoning and how to split it out later.
- **i18n is scaffolded, not wired** — `client/src/locales/en.json` and
  `ne.json` exist but no language switcher or `t()` calls are connected yet.
- **No image upload pipeline** — event images are plain URL strings; a real
  Cloudinary/local-multipart upload flow is a natural next step.
- **Admin category management** — categories are listed and seeded, but the
  admin "create/delete category" UI is not built (the API endpoints exist:
  `POST/DELETE /api/categories`).
- **Recommendation evaluation (Precision@K/Recall@K/NDCG@K)** is documented
  methodologically but not computed against the seed dataset, which is too
  small for the numbers to be meaningful.
- **No E2E (Cypress/Playwright) tests** — only backend unit + integration
  tests.
- **Integration tests need internet access** on first run (to download
  `mongodb-memory-server`'s bundled MongoDB binary) — see `docs/testing.md`.

## Future improvements

- Wire up i18n fully with a language switcher
- Real image upload (Cloudinary or local multipart + sharp)
- Precision@K / Recall@K / NDCG@K computed against real usage data
- Split the recommendation/ML services into an independently-scalable
  worker process
- E2E test coverage
- Push notifications (web push) in addition to in-app + email

---
*Not affiliated with eSewa or Khalti. This is an academic demonstration
project.*
