# Launch readiness and owner sign-off

This project is a production-minded pre-launch implementation. It is not ready to make unqualified organisation, legal, ownership, delivery, or impact claims until the owner supplies and approves the inputs below.

Use a durable ticket or approval record for every sign-off. Store sensitive evidence outside the public repository and reference it by identifier.

## Blocking identity and governance inputs

- [ ] Confirm the exact public name and punctuation: “Impact Sol.” or an approved alternative.
- [ ] Confirm the responsible legal entity, legal form, registration status/details, registered address, jurisdiction, and governing-law wording.
- [ ] Confirm whether and how the “being established” disclosure should change.
- [ ] Name the accountable website owner, content publisher, privacy contact, security contact, and incident decision-maker.
- [ ] Approve the primary domain, canonical HTTPS origin, redirects, and domain ownership/renewal contacts.
- [ ] Approve monitored organisation, enquiry, privacy, and accessibility mailboxes. Replace the provisional fallback address where required.
- [ ] Approve any public social profiles. None are assumed in the current content.

## Chokro and intellectual-property inputs

- [ ] Document Chokro's ownership, licence, and relationship to Impact Sol.
- [ ] Approve its public maturity description and whether a pilot or live service exists.
- [ ] Approve the public CTA and destination. The current safe CTA is “Register interest”.
- [ ] Supply an approved product URL only if it is ready and monitored.
- [ ] Supply current screenshots or other media with source files, rights, consent, date, and approved alternative text.
- [ ] Review the Chokro mark's allowed contexts, colours, clear space, and attribution.

## Offerings, claims, and proof

- [ ] Confirm which offerings are genuinely available, who delivers them, where, under what constraints, and through which contact path.
- [ ] Approve every geographical, sector, pricing, timeline, capacity, or delivery statement.
- [ ] Provide source, method, date, scope, limitations, review date, and approver for every impact metric or environmental claim.
- [ ] Provide explicit publication permission and final wording for every testimonial.
- [ ] Provide written logo/name permission for every customer, funder, partner, affiliation, certification, or award.
- [ ] Confirm that no unsupported “first”, “leading”, guaranteed-outcome, carbon, EPR, or certification language remains.
- [ ] Decide whether there are enough approved items for Stories. Omit the section unless there are multiple substantive items.

## Legal and privacy inputs

- [ ] Have a qualified reviewer approve privacy, terms, and accessibility wording for the launch jurisdictions.
- [ ] Confirm the controller/responsible entity, processing purposes, lawful bases, processors, international transfers, user rights, contact route, complaint route, and governing law.
- [ ] Approve enquiry retention and deletion timing. Configure the same value operationally and in policy copy.
- [ ] Approve the exact form consent wording and acknowledgement wording.
- [ ] Sign required processor agreements, including hosting and email delivery.
- [ ] Document access, correction, export, deletion, legal hold, complaint, and breach response procedures.
- [ ] Decide whether analytics or any other non-essential technology is needed. If yes, complete data, consent, policy, and implementation review before enabling it.

## Forms and email inputs

- [ ] Configure the exact allowed production origins and a unique random IP-hash secret.
- [ ] Configure a durable encrypted SQLite volume, backup schedule, restore test, and restricted service account.
- [ ] Configure and verify the sender domain, internal recipient, API credential, and bounce/complaint monitoring.
- [ ] Confirm all three form routes: general, partnership, and maker/initiative.
- [ ] Test validation, keyboard/error flow, spam trap, size limit, rate limit, duplicate submission behaviour, generic errors, queue retries, acknowledgement, internal routing, retention cleanup, and failed-delivery alerting.
- [ ] Ensure logs and monitoring do not contain message bodies, email addresses, or raw client addresses.

## CMS and content operations

- [ ] Select the production Git/identity backend; the committed Git Gateway settings are not an authentication deployment.
- [ ] Require MFA, least-privilege roles, reviewer/publisher separation, offboarding, and recovery controls.
- [ ] Protect `/admin/`, review its CSP/network requirements, and verify that it is excluded from search.
- [ ] Configure preview builds and a required green `npm run verify` check.
- [ ] Approve CDN use for the pinned Decap bundle or self-host the reviewed bundle.
- [ ] Test draft, review, publish, rollback, concurrent edit, media upload, and account removal flows.

## Design and assets

- [ ] Approve the provisional Impact Sol text wordmark, palette, typography, tone, and social card, or supply a rights-cleared brand system.
- [ ] Complete an asset-rights register for every public image, illustration, icon, logo, and font.
- [ ] Verify that no Chokro interface illustration is mistaken for a current product screenshot.
- [ ] Check all image alternatives and mark decorative images appropriately.
- [ ] Confirm that the design avoids misleading green, charity, crypto, or environmental symbolism.

## Accessibility acceptance

- [ ] Run automated checks on every template and correct confirmed issues.
- [ ] Complete every flow using only a keyboard, including mobile navigation and forms.
- [ ] Sample with VoiceOver/Safari and at least one additional relevant screen-reader/browser pair.
- [ ] Verify landmarks, heading hierarchy, page titles, link purpose, labels, instructions, errors, status announcements, skip link, and focus order/visibility.
- [ ] Test 200% text zoom, 320 CSS-pixel reflow, orientation, reduced motion, forced/high contrast, and touch targets.
- [ ] Record known limitations, practical alternatives, owner, and review date in the accessibility statement.

## Performance, SEO, and security acceptance

- [ ] Test a production build on throttled mobile conditions; record LCP, INP, CLS, transfer size, and JavaScript size.
- [ ] Confirm the homepage, ordinary-page, and JavaScript budgets documented in the README.
- [ ] Check responsive images, caching, compression, font loading, no autoplay, and third-party requests.
- [ ] Verify titles, descriptions, H1s, lowercase URLs, canonicals, robots, sitemap, Open Graph data, structured data, breadcrumbs, 404 behaviour, maintenance mode, and redirect mapping.
- [ ] Verify TLS, HSTS, CSP, frame restrictions, MIME sniffing protection, referrer policy, permissions policy, origin checks, dependency audit, and secret scanning on the real host.
- [ ] Confirm preview and admin environments are not indexed.
- [ ] Complete a vulnerability and abuse review of the public forms.

## Release record

Record these fields for the launch decision:

| Field | Value |
| --- | --- |
| Release commit/tag |  |
| Approved canonical origin |  |
| Content approval record |  |
| Legal approval record |  |
| Chokro rights/status record |  |
| Accessibility test report |  |
| Performance report |  |
| Security review |  |
| Backup restore result |  |
| Rollback owner and tested version |  |
| Final publisher |  |
| Launch date/time and timezone |  |

Launch only when every applicable blocking item is complete or a named accountable owner has accepted and documented the residual risk.
