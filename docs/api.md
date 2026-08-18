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
| GET | /events | search/filter/sort, query params: q, category, city, eventType, language, dateFrom, dateTo, minPrice, maxPrice, sort, page, limit |
| GET | /events/mine | organizer/admin |
| GET | /events/:id | tracks a VIEW interaction if authenticated |
| POST | /events | organizer/admin, creates DRAFT |
| PUT | /events/:id | owner or admin |
| DELETE | /events/:id | owner or admin |
| POST | /events/:id/submit | organizer, DRAFT → PENDING_APPROVAL |
| POST | /events/:id/moderate | admin, body: `{decision:'approve'|'reject'}` |
| POST | /events/:id/cancel | owner or admin |
| POST | /events/:id/favorite | toggle favorite |
| POST | /events/interactions | body: `{eventId, type, metadata}` |

## Registrations / Payments / Attendance
| Method | Path |
|---|---|
| POST | /registrations |
| GET | /registrations/mine |
| GET | /registrations/:id/ticket |
| POST | /registrations/:id/cancel |
| GET | /registrations/event/:eventId (organizer/admin) |
| POST | /payments/initiate |
| POST | /payments/demo/simulate (demo provider only) |
| POST | /payments/verify |
| GET | /payments/mine |
| POST | /attendance/check-in (organizer/admin) |
| GET | /attendance/event/:eventId/summary |

## AI
| Method | Path |
|---|---|
| GET | /ai/recommendations?limit=10 |
| GET | /ai/attendance/model-info (organizer/admin) |
| POST | /ai/attendance/retrain (admin) |
| GET | /ai/attendance/event/:eventId (organizer/admin) |

## Feedback / Certificates / Notifications / Categories
See `server/src/routes/*.js` — each mirrors its controller 1:1 and is kept
intentionally thin.

## Organizer / Admin
| Method | Path |
|---|---|
| GET | /organizer/dashboard |
| GET | /organizer/events/:eventId/analytics |
| GET | /admin/users, /admin/events, /admin/payments, /admin/audit-logs, /admin/analytics |
| POST | /admin/users/:id/status |
