# Security

- **Password storage**: bcrypt, 10 salt rounds. Plain-text passwords are
  never stored or logged.
- **JWT**: short-lived access tokens (default 15m) + longer-lived refresh
  tokens (default 7d), stored hashed (`bcrypt`) server-side so a leaked DB
  dump doesn't hand out usable refresh tokens directly.
- **RBAC**: `requireAuth` always re-fetches the user record from MongoDB by
  the token's `sub` claim and reads `role` from that record — the role is
  never trusted from the JWT payload's other claims, request body, or query
  string. `requireRole(...)` middleware gates every mutating route.
- **No client-side trust for admin signup**: `POST /auth/register` ignores
  any `role: 'admin'` in the request body and forces attendee/organizer
  only (verified in `tests/integration/auth.test.js`).
- **Payment integrity**: `POST /payments/verify` always calls the
  provider's own `verify()` method server-side; a payment is never marked
  PAID because the client said so.
- **Headers & transport**: `helmet()` for standard security headers, CORS
  restricted to `CLIENT_URL`.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (500
  requests / 15 min per IP by default).
- **Validation**: Zod schemas validate every mutating request body before
  it reaches a controller (`middleware/validate.js`).
- **File uploads**: certificate PDFs are generated server-side only (no
  arbitrary file upload endpoint exists in this build — event images are
  accepted as URLs, not raw uploads, to avoid needing to validate MIME
  types/size limits for an academic MVP; wiring Cloudinary or local
  multipart upload is a documented next step).
- **Error handling**: the global error handler never returns stack traces
  to the client in production; technical details are logged server-side
  only.
- **Audit logging**: `AuditLog` records key admin/organizer actions
  (event approval/rejection, check-ins, user suspension) with the acting
  user, role, and target.
- **Secrets**: `.env` is gitignored; `.env.example` contains no real
  values. `JWT_SECRET`, `JWT_REFRESH_SECRET`, provider secrets, and SMTP
  credentials are never returned in any API response.
