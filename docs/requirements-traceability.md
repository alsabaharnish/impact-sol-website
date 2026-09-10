# Requirements traceability

This matrix turns the supplied website brief into implementation evidence and launch checks. “Implemented” means code or structured content exists; it does not waive owner approval, legal review, real-host testing, or evidence requirements.

| Requirement area | Implementation evidence | State and release acceptance |
| --- | --- | --- |
| Separate project folder | This `impact-sol-website/` directory has its own package, source, public, server, tests, scripts, and docs. | Implemented. Confirm deployment targets this folder, not the parent Flutter web output. |
| Static-first, semantic build | `astro.config.mjs`, `src/layouts/`, `src/components/`, and `src/pages/`. | Implemented; verify generated HTML, landmarks, heading order, and minimal JavaScript. |
| P0 information architecture | Page routes for Home, About, What we do, Products, Chokro, Purpose and approach, Get involved, Contact, Privacy, Terms, Accessibility, plus error/maintenance handling. | Implemented in route and server code; run the route smoke test on the final build. |
| Stories are conditional | No Stories collection or navigation is created without multiple substantive approved items. | Deliberately deferred. Add only through the workflow in `docs/content-and-cms.md`. |
| English launch, Bangla-ready | `src/content/global/site.json` records `launchLocale: en` and `banglaReady: true`; content is separated from layout. | Implemented. Complete reviewed translation, URL, metadata, font, form, and maintenance work before adding a switcher. |
| Honest organisation status | Global disclosure and public copy describe Impact Sol as being established. | Implemented. Changing status requires an evidence reference and owner/legal approval. |
| Home purpose and pathways | Home route, clear summary, product/work/collaboration pathways, trust/status language, and purposeful CTAs. | Implemented; editorial and mobile hierarchy review required. |
| About page | About route explains intended purpose, principles, current status, and what is not yet claimed. | Implemented; owner must confirm final identity and governance facts. |
| What we do | `src/content/offerings/*.json` and route content describe proposed work without unverified delivery claims. | Implemented. Marking an offering available needs evidence and review. |
| Products index | `src/content/products/` and Products route expose maturity and availability explicitly. | Implemented; verify no product is presented as usable without approval. |
| Chokro product page | Chokro record and page identify a working prototype, use a register-interest CTA, and avoid a confirmed “first product” or live claim. | Implemented. Ownership/licence, product URL, maturity, and real media remain launch gates. |
| Purpose and approach | `/impact/` explains intended decision principles and evidence approach without publishing invented outcomes. | Implemented; factual and environmental-claims review required. |
| Get involved | Route separates partner and maker/initiative pathways with expectation-setting copy. | Implemented; routing owners and service commitments require approval. |
| Contact | Route offers general enquiry and a configurable provisional direct route. | Implemented; replace or approve the monitored mailbox before launch. |
| FAQs | Typed `faqs` collection and embedded FAQ components/content. | Implemented; check every answer against current status at release. |
| Privacy, terms, accessibility | `src/content/legal/*.json` and public routes; each content record is explicitly a working draft. | Implemented as drafts only. Qualified review, responsible entity, jurisdiction, contacts, and approval references are launch gates. |
| Custom 404 and maintenance response | Static error route(s) and Node maintenance handling. | Implemented; test actual host behaviour for unknown paths and maintenance mode. Host-level 500 branding may need platform configuration. |
| Typed content model | `src/content.config.ts` defines offerings, products, FAQs, global, and legal collections with cross-field claim rules. | Implemented and exercised by `astro check`. |
| CMS editorial workflow | `public/admin/index.html` pins Decap CMS; `public/admin/config.yml` enables editorial workflow and collection editing. | Implemented as a shell. Production identity, MFA, roles, Git backend, preview, CSP, and access controls remain launch gates. |
| Claim and placeholder validation | `scripts/validate-content.mjs` runs in `prebuild`. | Implemented. Human evidence, rights, editorial, and legal review remain mandatory. |
| General, partnership, maker forms | Public form markup/scripts and `server/validation.mjs`. | Implemented; verify labels, errors, keyboard flow, content limits, optional fields, and no browser secrets. |
| Server-side form safety | `server/config.mjs`, validation, origin checks, body limit, honeypot, keyed address hashing, and rate limiting. | Implemented; threat-model and tune on the real proxy/host. |
| Durable enquiry and delivery workflow | SQLite storage/outbox and delivery worker under `server/`. | Implemented; configure a durable encrypted volume and exercise restart, retry, failure, bounce, and recovery paths. |
| Acknowledgement and truthful status | Queued acknowledgement copy confirms receipt without promising a reply, place, partnership, or service. | Implemented; test delivery and ensure browser success does not claim provider delivery. |
| Retention, deletion, export | Runtime retention/cleanup plus operational process in `docs/operations.md`. | Partly automated; owner-approved retention and tested admin request procedure remain launch gates. |
| Privacy-minimising launch | No public analytics/ads; provider-neutral event plan in `docs/measurement-plan.md`; no non-essential cookie banner. | Implemented. Reassess consent and policy whenever technology changes. |
| WCAG 2.2 AA target | Semantic components, visible focus, skip link, form status/error handling, reduced motion, responsive CSS, accessible disclosures. | Implemented toward target, not certified. Complete the manual and assistive-technology checks in `docs/launch-readiness.md`. |
| Calm, human, credible visual direction | Reusable design tokens/components, restrained palette, generous spacing, code-native visuals, and no generic greenwashing photography. | Implemented; final brand and stakeholder approval required. |
| Responsive behaviour | Layout/styles and mobile navigation support small screens and large zoom. | Implemented; verify 320 CSS-pixel reflow, 200% zoom, orientation, and touch targets on final content. |
| Performance budgets | Static output, system fonts, lightweight code-native media, and budget checks/tests. | Implemented as an architectural baseline. Record production LCP, INP, CLS, transfer, and JS results against README targets. |
| SEO foundations | Layout metadata, canonical origin configuration, Open Graph asset, structured data, breadcrumbs, robots and sitemap assets. | Implemented; approved production domain and real-host validation are launch gates. |
| Security headers and HTTPS | Node response headers and documented reverse-proxy/TLS expectations. | Implemented in app where possible; verify CSP, HSTS, frame, MIME, referrer, permissions, caching, TLS, and platform overrides on the real host. |
| Asset rights and restraint | Provisional Impact Sol wordmark/social art; Chokro asset is isolated to product context; no partner logos/testimonials/fake screenshots. | Implemented conservatively. Complete the rights register and replace provisional assets only with approved material. |
| Language, link, and content quality | Structured content, stable slugs, validator, and release review workflow. | Implemented; run link checking, spelling/editorial review, and translation checks before launch. |
| Automated verification | `npm run verify` combines content validation, Astro checks/build, and Node tests. | Implemented. CI must require it and production smoke/accessibility/performance/security checks remain necessary. |
| Backup, rollback, monitoring, incident response | `docs/operations.md`. | Documented. Assign owners, configure the platform, and complete a restore/rollback exercise before launch. |
| Owner inputs and final acceptance | `docs/launch-readiness.md` and release record. | Open launch gates are explicit; do not silently replace them with assumptions. |

## Final acceptance record

Attach the completed launch checklist, test outputs, real-host header/SEO results, content and legal approvals, Chokro rights/status record, asset register, backup restore evidence, and the release commit to the launch decision. Any requirement not applicable to the chosen host should be marked not applicable with an owner and rationale, rather than removed from the matrix.
