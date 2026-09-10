# Impact Sol website

An accessible, static-first website for the proposed Impact Sol initiative. The implementation is intentionally honest about its pre-launch state: Impact Sol is described as **being established**, Chokro is described as a **working prototype**, and no registration, ownership, availability, partner, testimonial, certification, or impact-metric claim is invented.

The public site launches in English. Its content model is ready to add a reviewed Bangla edition later, but no public language switcher is shown until a complete translation and maintenance workflow exist.

## Technology

- Astro 7 and TypeScript for semantic, mostly server-rendered HTML
- Structured JSON content validated by Astro schemas and a prebuild risk check
- Decap CMS admin shell with editorial workflow; the editor bundle is pinned to `3.16.1` and loads only under `/admin/`
- A small Node service for the built site, enquiry API, SQLite-backed queue, rate limiting, retention, and optional Resend delivery
- No public analytics, advertising scripts, autoplay media, or non-essential cookies

Node.js `22.12.0` or newer is required because the enquiry service uses the built-in SQLite module.

## Quick start

From this folder:

```sh
npm ci
cp .env.example .env
npm run dev
```

Astro serves the development site at the URL printed in the terminal. The `.env` file is ignored by Git. Keep real credentials out of source control.

Run all available release checks with:

```sh
npm run verify
```

Build and exercise the production-style Node service with:

```sh
npm run build
npm run serve
```

The default production-style address is `http://127.0.0.1:8788`. The service loads a local `.env` when the Node runtime supports `process.loadEnvFile()`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server. |
| `npm run build` | Validate content, type-check Astro, and generate `dist/`. |
| `npm run preview` | Preview the static Astro output without the enquiry API. |
| `npm run serve` | Serve `dist/` with the production-style enquiry service. Build first. |
| `npm test` | Run the Node test suite. |
| `npm run verify` | Run the build and tests together. |

## Runtime configuration

Start from `.env.example`. Production values belong in the deployment platform's encrypted environment settings, not in the repository.

| Variable | Production guidance |
| --- | --- |
| `IMPACT_SOL_SITE_URL` | Required canonical HTTPS origin after the owner approves the domain. Do not launch with `example.com`. |
| `PUBLIC_CONTACT_EMAIL` | Approved, monitored public mailbox. The repository fallback `arnish@lamppost.org.bd` is provisional. |
| `INQUIRY_DATABASE_PATH` | Path on a durable, encrypted, backed-up volume. |
| `INQUIRY_TO_EMAIL` | Approved internal recipient for enquiries. |
| `INQUIRY_FROM_EMAIL` | Verified sender identity for acknowledgement and routing mail. |
| `RESEND_API_KEY` | Server-side delivery credential. Never expose it to browser code. |
| `INQUIRY_ALLOWED_ORIGINS` | Exact comma-separated production origins; do not use wildcards. |
| `INQUIRY_IP_HASH_SECRET` | Unique random secret of at least 32 characters. Production startup rejects weak values. |
| `INQUIRY_RETENTION_DAYS` | Owner- and legal-approved retention period; the sample value is not legal advice. |
| `PORT` / `HOST` | Process listener settings. Bind deliberately behind a trusted reverse proxy. |
| `TRUST_PROXY` | Enable only when the proxy contract and forwarded-address handling are verified. |
| `MAINTENANCE_MODE` | Serves the maintenance response when enabled. |
| `INQUIRY_MAX_BODY_BYTES` | Optional body limit, capped by the server at 32 KiB. |
| `INQUIRY_RATE_LIMIT_WINDOW_SECONDS` / `INQUIRY_RATE_LIMIT_MAX` | Optional abuse-control tuning. Review against real traffic. |
| `INQUIRY_DELIVERY_INTERVAL_MS` / `INQUIRY_MAX_DELIVERY_ATTEMPTS` | Optional outbox worker tuning. |

If mail credentials or recipients are absent, confirm the service's queue behaviour before accepting public submissions. A successful browser acknowledgement means the enquiry was accepted for processing; it must not be interpreted as proof that an email was delivered.

## Content and editorial workflow

Editable records live in `src/content/`:

- `global/` — working identity, disclosure, contact fallback, locale, and approved links
- `offerings/` — proposed or approved work areas
- `products/` — product maturity, availability, rights status, and call to action
- `faqs/` — reusable answers grouped by topic
- `legal/` — explicitly labelled policy drafts and approval references

`src/content.config.ts` supplies the typed Astro schemas. `scripts/validate-content.mjs` runs before each build and blocks missing required fields, common placeholders, several unsafe absolute claims, numerical marketing outcomes, and status changes without evidence. The validator is a guardrail, not a substitute for editorial, legal, or evidence review.

See [Content and CMS](docs/content-and-cms.md) for the full workflow.

### Decap CMS: local editing

`public/admin/config.yml` enables `local_backend`. Start the Astro development server and a trusted, pinned Decap local proxy in separate terminals, then visit `/admin/`. If no approved proxy version is installed, edit the JSON files directly and run `npm run build`; do not add a floating production dependency simply to open the editor.

### Decap CMS: production authentication caveat

The committed backend is `git-gateway` on `main`, but it is **not production authentication by itself**. Before enabling `/admin/`, the owner must select and configure the hosting identity/Git workflow, restrict authorised editors, require MFA at the identity provider, test recovery and role removal, and protect the admin route at the edge where practical. If the production host does not provide a compatible Git Gateway, replace the backend with an approved OAuth-backed Decap configuration and review its callback service.

Editorial workflow creates unpublished changes in Git. Configure branch previews and require a human reviewer plus a green `npm run verify` check before merging.

## Deployment

The complete site needs two things:

1. The generated `dist/` assets.
2. The Node enquiry service with a persistent SQLite volume and server-side secrets.

A static host alone can serve the information pages, but the forms require either `server/index.mjs` or a platform function that preserves the same validation, origin checks, rate limits, durable queue, retention, and generic responses.

Recommended release sequence:

1. Resolve every blocking item in [Launch readiness](docs/launch-readiness.md).
2. Set the approved production origin, mailbox, recipients, sender, secrets, retention, and storage path.
3. Run `npm ci` and `npm run verify` on the release commit.
4. Deploy behind HTTPS with the repository's security headers preserved.
5. Run smoke tests against every route, all enquiry types, the queue worker, 404 handling, maintenance mode, canonical metadata, and admin access controls.
6. Record the release commit, content approval, policy approval, database migration state, and rollback owner.

Do not index a preview build. The layout keeps unapproved or non-HTTPS origins out of search; confirm `robots.txt`, canonical URLs, and the sitemap against the real origin before lifting a launch block.

## Release quality workflows

### Privacy and forms

- Confirm the responsible entity, lawful basis, recipients/processors, transfer position, retention, deletion/export procedure, and monitored privacy contact.
- Exercise client and server validation, honeypot handling, body limits, same-origin checks, rate limiting, queue retries, acknowledgement copy, and generic error responses.
- Keep form data and IP-derived rate-limit hashes out of logs and analytics.
- Confirm scheduled cleanup and a documented process for access, correction, export, and deletion requests.
- Do not add a cookie banner unless non-essential technology is actually introduced; if it is introduced, complete a consent and policy review first.

### Accessibility

The target is WCAG 2.2 Level AA, not a claim of certification. Before every public release, test representative pages and every form at keyboard-only operation, visible focus, screen-reader landmarks and errors, 200% text zoom, 320 CSS-pixel reflow, reduced motion, high contrast, and touch target size. Recheck copy after CMS edits because heading order, link purpose, and clarity are content responsibilities too.

### Performance

Keep the homepage transfer at or below 1.5 MB, ordinary pages at or below 1 MB, and shipped JavaScript at or below 200 KB under the agreed measurement method. Test a production build on a throttled mobile profile and record LCP, INP, and CLS against the project targets of 2.5 seconds, 200 milliseconds, and 0.1 respectively. Any regression needs an owner and explicit release decision.

### SEO and sharing

Verify one descriptive title, meta description, H1, canonical URL, Open Graph image, and stable lowercase URL per page. Validate Organization, WebSite, and breadcrumb structured data. Check the sitemap, robots rules, custom error behaviour, redirects for changed URLs, and social previews on the approved domain.

## Backup and rollback

Content changes are versioned in Git. Tag or record every production release so site code and content can be reverted together. Back up the SQLite database using a consistent database-aware snapshot on encrypted storage; copying only the main file while WAL writes are active is not a reliable backup. Test restoration and the enquiry deletion/export procedure before launch.

Application rollback means redeploying a previously verified commit while preserving the current data volume. Do not replace or delete the live database as part of a code rollback. If a future schema change is not backward compatible, ship and test an explicit forward and rollback migration first.

See [Operations](docs/operations.md) for the runbook.

## Owner-supplied launch inputs

The current build deliberately does not guess the following:

- final legal identity, legal form, registration details, address, governing law, and exact public name punctuation
- approved domain, canonical origin, social profiles, monitored organisation and privacy mailboxes
- Chokro ownership/licence relationship, public availability, approved product URL, and real screenshots or other rights-cleared media
- approved services, delivery geographies, pricing or commitments
- verified impact evidence, metrics, testimonials, partner names/logos, certifications, and environmental claims
- policy sign-off, data retention, processors, form recipients, sender domain, and incident owners
- CMS identity provider, editor roles, MFA, preview workflow, hosting account, backups, and rollback authority
- complete reviewed Bangla translation and its ongoing content owner, if that edition is launched

The actionable sign-off list is in [Launch readiness](docs/launch-readiness.md). Requirements coverage and remaining verification are mapped in [Requirements traceability](docs/requirements-traceability.md).
