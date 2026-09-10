# Impact Sol website

An accessible, static-first website for the proposed Impact Sol initiative. The implementation is intentionally honest about its pre-launch state: Impact Sol is described as **being established**, Chokro as a **working prototype**, and no registration, ownership, availability, partner, testimonial, certification, or impact-metric claim is invented.

The public site launches in English. Its structured content can support a reviewed Bangla edition later, but no language switcher is shown until a complete translation and maintenance workflow exists.

## Technology

- Astro 7 and TypeScript for semantic, static HTML
- A self-hosted Inter variable face, linked only when present
- Structured JSON content with Astro schemas and a prebuild risk check
- Decap CMS at `/admin/`, using GitHub OAuth and editorial workflow
- Netlify Forms for general, partnership, and maker/initiative enquiries
- Netlify deployment and security-header configuration in `netlify.toml`
- No public analytics, advertising scripts, autoplay media, or non-essential cookies

Node.js `22.12.0` or newer is required.

## Quick start

```sh
npm ci
cp .env.example .env
npm run dev
```

Astro prints the local site address. Local form submissions are not stored; verify forms only on a controlled Netlify production deployment.

Run the complete repository checks with:

```sh
npm run verify
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server. |
| `npm run fonts` | Copy the Inter variable face into `public/fonts/`. |
| `npm run build` | Validate content, type-check Astro, generate `dist/`, and inspect the built site. |
| `npm run preview` | Preview the generated static site. |
| `npm run verify` | Run the full release build and checks. |

## Typeface

The design system uses a five-step weight scale (400/500/600/700/800). Those
steps only render as five distinct weights when a variable face is available,
so Inter is served from `public/fonts/` rather than assumed to be installed:

```sh
npm install --save-dev @fontsource-variable/inter
npm run fonts
```

`BaseLayout` links `/fonts/inter.css` and preloads the face **only when
`public/fonts/inter-variable.woff2` exists**, so a missing font costs no
failed request — the stack falls back to Segoe UI / Roboto / Helvetica and the
hierarchy still reads, because every step is a standard weight. The existing
`font-src 'self'` and `style-src 'self'` rules in `netlify.toml` already allow
both files; no header change is needed.

Commit the `.woff2` so deploys are reproducible, or add `npm run fonts` ahead
of `prebuild` if you would rather resolve it from the lockfile at build time.

## Configuration

Start local development from `.env.example`. Do not commit `.env`.

| Variable | Guidance |
| --- | --- |
| `IMPACT_SOL_SITE_URL` | Optional canonical-origin override. Netlify’s primary production `URL` is used automatically when this is absent. |
| `PUBLIC_CONTACT_EMAIL` | Approved, monitored public mailbox. The repository fallback is provisional. |

When a custom domain becomes the Netlify project’s primary domain, redeploy and verify canonical URLs, the sitemap, robots rules, social metadata, redirects, and the GitHub OAuth App homepage. No form-code change is needed.

## Netlify deployment

Connect the GitHub repository to the existing Netlify project. `netlify.toml` tells Netlify to run `npm run build`, publish `dist/`, use Node 22.12.0, and apply the public and `/admin/` security headers.

Before testing forms, open **Netlify → Forms → Usage and configuration → Form detection**, ensure detection is enabled, and redeploy. Netlify should detect:

- `impact-sol-general`
- `impact-sol-partnership`
- `impact-sol-maker`

Submissions are viewed and exported in the Netlify **Forms** dashboard. They do not appear in `/admin/`. The forms include accessible browser validation, an inline success state, a non-JavaScript confirmation page, Netlify spam filtering, and a honeypot. See [Enquiry forms on Netlify](docs/forms.md) for access, notifications, retention, and production testing.

## Content and editorial workflow

Editable records live in `src/content/`:

- `global/` — working identity, disclosure, contact fallback, locale, and approved links
- `offerings/` — proposed or approved work areas
- `products/` — product maturity, availability, rights status, and call to action
- `faqs/` — reusable answers grouped by topic
- `people/` — leadership and advisors, published only with recorded consent
- `partners/` — named organisations, each with written name and logo permission
- `legal/` — explicitly labelled policy drafts and approval references

`src/content.config.ts` supplies typed schemas. `scripts/validate-content.mjs` blocks missing required fields, common placeholders, several unsafe absolute claims, numerical marketing outcomes, and status changes without evidence. It is a guardrail, not a substitute for editorial, legal, or evidence review.

For local CMS editing, `public/admin/config.yml` enables `local_backend`. Start Astro and a trusted, pinned Decap local proxy in separate terminals, then visit `/admin/`. If no approved proxy is installed, edit the JSON files directly and run `npm run verify`.

Production CMS sign-in uses the GitHub backend for `alsabaharnish/impact-sol-website`. The GitHub OAuth App and Netlify authentication provider must contain the real Client ID and secret. Each editor needs appropriate repository access and MFA. Protect `main`, require review and a successful `npm run verify`, test recovery and offboarding, and keep the secret outside this repository. See [Content and CMS](docs/content-and-cms.md).

## Release sequence

1. Resolve every applicable blocking item in [Launch readiness](docs/launch-readiness.md).
2. Confirm the production branch, primary Netlify domain, public mailbox, Netlify Forms detection, notification owner, retention process, GitHub OAuth, and authorised accounts.
3. Run `npm ci` and `npm run verify` on the reviewed commit.
4. Deploy through Netlify and smoke-test public routes, 404 handling, metadata, headers, `/admin/`, and all three form types.
5. Confirm controlled test submissions appear under the correct Netlify form names, then delete them.
6. Record the release commit, approvals, deployment result, rollback version, and final publisher.

Preview deployments and draft legal pages must remain out of search. Confirm `robots.txt`, canonical URLs, and the sitemap against the final primary origin before launch.

## Release quality

The target is WCAG 2.2 Level AA, not a certification claim. Test every form with keyboard-only operation and representative screen readers, plus visible focus, errors, status announcements, 200% zoom, 320 CSS-pixel reflow, reduced motion, high contrast, and touch targets.

Keep the homepage compressed first load at or below 1.5 MB, ordinary pages at or below 1 MB, and shipped JavaScript at or below 200 KB. Record production LCP, INP, and CLS against targets of 2.5 seconds, 200 milliseconds, and 0.1.

Confirm the responsible entity, legal bases, Netlify processing, international-transfer position, retention, deletion/export procedure, monitored privacy contact, and any required data-processing agreement. Do not add a cookie banner unless non-essential technology is actually introduced and reviewed.

See [Operations](docs/operations.md) for release, incident, data-access, retention, rollback, and account procedures. Requirements and remaining verification are mapped in [Requirements traceability](docs/requirements-traceability.md).
