# Database

MongoDB via Mongoose. Twelve collections, matching the spec:

| Model | Purpose | Key indexes |
|---|---|---|
| User | Auth, role, interests, favorites | `email` unique, `{role, status}` |
| Category | Event categories | `slug` unique |
| Event | Event listings + embedded ticket types | text index on title/description/tags, `{status, date}`, `{city, category, eventType}` |
| Registration | A user's registration for a ticket type | `{event, user}`, `{event, status}`, `ticketId` unique sparse |
| Payment | Payment attempts/records | `{status}` |
| Interaction | Behavioural signal feed for recommendations | `{user, event, type}` |
| Notification | In-app notifications | `{user}`, `{read}` |
| Certificate | Issued certificates | `certificateNumber` unique, `verificationCode` unique |
| Feedback | Post-event ratings | `{event, user}` unique compound (one review per user per event) |
| AuditLog | Admin/organizer action trail | `{action}`, `{createdAt}` |

## Notable design choices

- **Ticket types are embedded** in `Event.ticketTypes` rather than a
  separate `Ticket` collection, because they're always read/written together
  with the event and never queried independently at scale. `sold` is
  incremented atomically on registration (see `registrationController.js`)
  to prevent overbooking under concurrent requests.
- **Interaction is append-only** and deliberately denormalized (stores
  `weight` at write time using the fixed `INTERACTION_WEIGHTS` table) so the
  recommendation engine can aggregate without joining against a
  weights-lookup table.
- **AuditLog.actor** is nullable to allow system-initiated actions.

## Seed data
`server/src/seed/seed.js` creates:
- 1 admin, 5 organizers, 30 attendees (including three fixed demo accounts)
- 8 categories
- 32 events across 5 cities and 12 event types, mixing DRAFT / PENDING /
  PUBLISHED / COMPLETED statuses
- Interactions (VIEW/CLICK/FAVORITE/REGISTER/RATE/ATTEND), registrations,
  payments, and feedback generated with weighted randomness so the
  recommendation engine has a non-trivial interaction matrix to work with.
