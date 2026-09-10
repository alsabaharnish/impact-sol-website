# Inquiry form service

The production server in `server/` serves the generated `dist/` site and accepts the three public inquiry routes. It uses only Node.js built-ins, including `node:sqlite`, and requires Node 22.12 or newer.

## Public contract

Submit `POST /api/inquiries` as either `application/json` or `application/x-www-form-urlencoded`. The request body must be no larger than 32 KiB.

| Field | Requirement | Constraint |
| --- | --- | --- |
| `inquiryType` | Required | `general`, `partnership`, or `maker` |
| `name` | Required | 2–100 characters |
| `email` | Required | Valid email address, up to 254 characters |
| `message` | Required | 20–3,000 characters |
| `organization` | Optional | Up to 160 characters |
| `role` | Optional | Up to 100 characters |
| `phone` | Optional | Up to 32 characters; digits and common phone punctuation only |
| `country` | Optional | Up to 80 characters |
| `subject` | Optional | Up to 140 characters |
| `partnershipInterest` | Optional | Up to 300 characters |
| `initiativeName` | Optional | Up to 160 characters |
| `initiativeStage` | Optional | `idea`, `testing`, `active`, `scaling`, or `other` |
| `supportNeeded` | Optional | Up to 500 characters |
| `websiteUrl` | Optional | Complete `http` or `https` URL, up to 300 characters |
| `sourcePath` | Optional | Site-relative path beginning with one `/`, up to 200 characters |
| `privacyNoticeVersion` | Optional | Identifier for the contextual notice shown with the form, up to 40 characters |
| `companyWebsite` | Spam trap | Must remain empty and should be visually hidden from people |

The aliases `type` and `honeypot` are also accepted for compatibility, but new forms should use the canonical names above.

The form should place a short contextual privacy notice and a privacy-page link immediately beside the submit control. It must not make reading that notice a required “consent” checkbox unless counsel later identifies a separate legal reason. This service ignores unrecognised consent/marketing fields and does not store or infer marketing consent.

A valid submission returns HTTP `202`:

```json
{
  "ok": true,
  "message": "Thank you. Your inquiry has been received."
}
```

Validation failures return HTTP `422`, a generic message, and field-keyed `errors` for accessible inline error rendering. Unsupported media uses `415`, oversized content uses `413`, rejected origins use `403`, and rate limiting uses `429` with `Retry-After`. Delivery status and internal identifiers are never exposed. A filled honeypot receives the same generic `202` response but is not stored.

Browser requests must originate from `IMPACT_SOL_SITE_URL` or an origin listed in `INQUIRY_ALLOWED_ORIGINS`. A non-browser system with neither `Origin` nor `Sec-Fetch-Site: cross-site` can submit for controlled integration use. The server does not support credentialed cross-origin requests.

## Storage and delivery

Each accepted inquiry and its two outbox jobs are committed in one SQLite transaction. The jobs are:

1. An internal alert to `INQUIRY_TO_EMAIL` containing the submitted details.
2. A privacy-safe acknowledgement to the submitter. It confirms receipt but does not repeat their message or promise a response, partnership, place, or service.

The public request succeeds after the durable commit; it does not wait for email. The worker uses Resend when configured, retries failed jobs with exponential backoff, and stops after `INQUIRY_MAX_DELIVERY_ATTEMPTS` (default 8). Each job has a stable provider idempotency key, reducing duplicate email after a process crash. Jobs stay pending when email configuration is absent, so submissions are not lost during setup.

Raw IP addresses and user-agent strings are not stored. Per-address throttling stores only an HMAC-SHA-256 digest. The digest secret must be a unique, random value of at least 32 characters in production.

Expired inquiries and their outbox rows are deleted automatically once per day. The default retention is 90 days. Old rate-limit rows are also removed. Review the retention period with the privacy owner before launch.

## Environment

The server loads `.env` at the project root without replacing variables already supplied by the host.

| Variable | Production guidance |
| --- | --- |
| `NODE_ENV` | Set to `production`; this activates required secret/origin checks |
| `HOST` | Listening address; use `0.0.0.0` only inside an appropriately isolated deployment |
| `PORT` | Listening port, default `8788` |
| `STATIC_ROOT` | Optional absolute or project-relative path to the generated site, default `./dist` |
| `IMPACT_SOL_SITE_URL` | Canonical HTTPS origin; also admitted as a form origin |
| `INQUIRY_ALLOWED_ORIGINS` | Comma-separated additional exact origins; omit unneeded entries |
| `INQUIRY_DATABASE_PATH` | Path on encrypted, backed-up persistent storage, default `./runtime-data/inquiries.sqlite` |
| `INQUIRY_IP_HASH_SECRET` | Required in production; random secret of at least 32 characters |
| `INQUIRY_RETENTION_DAYS` | Inquiry retention, default `90`, allowed range 1–3,650 |
| `INQUIRY_RATE_LIMIT_MAX` | Attempts per window, default `5` |
| `INQUIRY_RATE_LIMIT_WINDOW_SECONDS` | Fixed-window length, default `900` |
| `INQUIRY_MAX_BODY_BYTES` | May lower, but never raise, the 32 KiB ceiling |
| `RESEND_API_KEY` | Server-only Resend API key; never expose it through an Astro `PUBLIC_` variable |
| `INQUIRY_FROM_EMAIL` | Verified sender, for example `Impact Sol <forms@example.org>` |
| `INQUIRY_TO_EMAIL` | Monitored mailbox for internal alerts |
| `INQUIRY_DELIVERY_INTERVAL_MS` | Queue polling interval, default `15000` |
| `INQUIRY_MAX_DELIVERY_ATTEMPTS` | Retry ceiling, default `8` |
| `TRUST_PROXY` | Set `true` only when the app accepts traffic exclusively from a trusted reverse proxy |
| `MAINTENANCE_MODE` | When `true`, returns the static maintenance page and HTTP `503` except for `/healthz` |

`TRUST_PROXY=true` makes the server use the first `X-Forwarded-For` value for rate limiting and `X-Forwarded-Proto` for HSTS. Never enable it if clients can connect directly and forge those headers.

## Run and verify

Build, then start the combined static and form service:

```sh
npm run build
npm run serve
```

Run the focused backend tests:

```sh
node --test tests/form-validation.test.mjs tests/form-server.test.mjs
```

The server supplies CSP, HSTS on verified HTTPS requests, `nosniff`, referrer, permissions, clickjacking, and cross-origin opener headers. Public pages use a strict self-only policy plus an exact SHA-256 hash for their JSON-LD block; they do not receive `unsafe-inline` or the CMS network allowances. The isolated `/admin/` document allows the pinned Decap CDN and the inline styles Decap injects at runtime. Self-host the reviewed CMS bundle and narrow that editor-only policy when the production identity and preview workflow are configured.

Deploy with one process per SQLite database on a persistent local volume. Do not put SQLite on an object store or a network filesystem that lacks correct locking. If the site is deployed to a static-only host, deploy this server separately and update the frontend endpoint and CORS policy deliberately; same-origin deployment is preferred.

## Privacy requests

These commands are local administrative operations; there are intentionally no public export or deletion endpoints.

Export matching records to standard output:

```sh
node server/records.mjs export --email person@example.com
```

Write a new owner-only file (the command refuses to overwrite an existing file):

```sh
node server/records.mjs export --email person@example.com --output ./person-export.json
```

Delete matching inquiries and their queued/delivered outbox records. The repeated email is an intentional confirmation guard:

```sh
node server/records.mjs delete --email person@example.com --confirm-email person@example.com
```

Confirm the requester's identity outside this tool, record the decision in the organisation's privacy workflow, transfer exports securely, and securely delete temporary export files after use.

## Launch checks

- Use a canonical HTTPS origin and keep the server behind TLS.
- Set and protect all secrets in the hosting platform, not in source control.
- Verify the sender domain and send test messages to both internal and acknowledgement recipients.
- Confirm `INQUIRY_TO_EMAIL` is actively monitored and define response ownership.
- Put the database on encrypted persistent storage with tested backups and access logging.
- Confirm the privacy notice states the actual processor, purpose, retention, and rights route.
- Exercise the 404, 500, and maintenance pages through the production proxy.
- Monitor generic service/error counts without logging form bodies, email addresses, or raw network addresses.
