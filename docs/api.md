# API Overview

Base URL: `http://localhost:5000/api`

All authenticated routes expect `Authorization: Bearer <accessToken>`.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | /auth/register | role limited to attendee/organizer |
| POST | /auth/login | |
| POST | /auth/refresh | body: `{ refreshToken }` |
| POST | /auth/logout | auth required |
| GET | /auth/me | auth required |
| PUT | /auth/me | update profile/interests |
| POST | /auth/forgot-password | always 200, doesn't leak email existence |
| POST | /auth/reset-password | |

## Events
| Method | Path | Notes |
|---|---|---|
| GET | /events | search/filter/sort, query params: q, category, city, eventType, language, dateFrom, dateTo, minPrice, maxPrice, sort, page, limit. **Private events are excluded from these results** unless you are their organizer or an admin. |
| GET | /events/mine | organizer/admin |
| GET | /events/:id | tracks a VIEW interaction if authenticated. Works for private events too — a private event is reachable by direct link/ID, it's just excluded from the list above. |
| POST | /events | organizer/admin, creates DRAFT |
| PUT | /events/:id | owner or admin |
| DELETE | /events/:id | owner or admin |
| POST | /events/:id/publish | **owner or admin — no admin approval required.** DRAFT/PENDING_APPROVAL → PUBLISHED directly. This is the primary way an event goes live. |
| POST | /events/:id/submit | organizer, DRAFT → PENDING_APPROVAL. Optional — only useful if an organizer *wants* a second pair of eyes before publishing; not required. |
| POST | /events/:id/moderate | admin, body: `{decision:'approve'|'reject'}`. Optional oversight tool, kept for teams that want it — publishing no longer depends on this. |
| POST | /events/:id/complete | owner or admin, PUBLISHED → COMPLETED. **Automatically issues a certificate to every checked-in attendee** (see Certificates below) — returns `{ event, certificatesIssued }`. |
| POST | /events/:id/cancel | owner or admin |
| POST | /events/:id/favorite | toggle favorite |
| POST | /events/interactions | body: `{eventId, type, metadata}` |

## Registrations / Payments / Attendance
| Method | Path | Notes |
|---|---|---|
| POST | /registrations | |
| GET | /registrations/mine | |
| GET | /registrations/:id/ticket | |
| POST | /registrations/:id/cancel | Blocked once a ticket's status is `ATTENDED` (already checked in) |
| GET | /registrations/event/:eventId | organizer/admin |
| POST | /payments/initiate | |
| POST | /payments/demo/simulate | demo provider only |
| POST | /payments/verify | |
| GET | /payments/mine | |
| POST | /attendance/check-in | organizer/admin. On success, the registration's `status` moves `CONFIRMED` → `ATTENDED` (in addition to `checkedIn`/`checkedInAt`) — this is a first-class status, not just a boolean. Duplicate scans return 409. |
| GET | /attendance/event/:eventId/summary | |

## AI
| Method | Path |
|---|---|
| GET | /ai/recommendations?limit=10 |
| GET | /ai/attendance/model-info (organizer/admin) |
| POST | /ai/attendance/retrain (admin) |
| GET | /ai/attendance/event/:eventId (organizer/admin) |

## Feedback / Certificates / Notifications / Categories
| Method | Path | Notes |
|---|---|---|
| POST | /feedback | attendee, requires checkedIn + event COMPLETED |
| GET | /feedback/event/:eventId | |
| POST | /certificates/issue | attendee — manually (re-)fetch your own certificate. Most attendees won't need this: certificates are already auto-issued in bulk when the organizer calls `POST /events/:id/complete`. |
| GET | /certificates/mine | |
| GET | /certificates/verify/:code | **public, no auth** — anyone holding a certificate's code can verify it |
| GET/POST/DELETE | /notifications, /categories | see `server/src/routes/*.js` — each mirrors its controller 1:1 |

## Organizer / Admin
| Method | Path | Notes |
|---|---|---|
| GET | /organizer/dashboard | |
| GET | /organizer/events/:eventId/analytics | |
| GET | /admin/users | |
| GET | /admin/events | **every event regardless of status or visibility** — this is how admin sees private events and drafts too |
| GET | /admin/registrations | **every registration across every organizer's events**, not scoped to one organizer |
| GET | /admin/payments, /admin/audit-logs, /admin/analytics | |
| POST | /admin/users/:id/status | |
