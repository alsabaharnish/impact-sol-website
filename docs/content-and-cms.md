# Content and CMS workflow

## Editorial principles

The website must distinguish intent from evidence. Current copy uses “being established”, “proposed”, “intended”, and “working prototype” deliberately. Editors should not strengthen those words simply to make copy sound more confident.

Every factual claim should answer four questions:

1. What exactly is being claimed?
2. What dated source supports it?
3. Who approved publication?
4. When should it be reviewed or removed?

Do not publish numerical outcomes, testimonials, customer or partner names, logos, certifications, registration claims, product availability, or Chokro ownership language until the evidence and rights are recorded. Avoid vague environmental superlatives such as “green”, “sustainable”, or “zero impact” unless the copy defines the scope and method.

## Collections

| Collection | Use | High-risk fields |
| --- | --- | --- |
| `global` | Working identity, organisation status, locale, contact fallback, domain, social links | `status`, `approvedDomain`, `evidenceReference` |
| `offerings` | Proposed or approved areas of work | `status`, `evidenceReference` |
| `products` | Product maturity, availability, rights status, CTA, URL | `stage`, `publicAvailability`, `ownershipStatus`, `evidenceReference` |
| `faqs` | Plain-language reusable answers | Any answer that implies a promise or completed status |
| `legal` | Privacy, terms, and accessibility copy | `status`, `approvalReference`, jurisdiction-specific statements |

The file name must match each record's `slug`. Slugs are lowercase ASCII words joined by hyphens. URLs should remain stable; changing a slug requires a redirect and an SEO review.

## Page integration boundary

`src/content/read.ts` is the supported page-facing API. It returns schema-validated, sorted data from Astro's collections:

- `getOfferings()` for offering cards and status;
- `getProducts()` and `getProduct(slug)` for the index and product detail;
- `getFaqs(category?)` for embedded FAQ groups;
- `getGlobalSettings()` for the public status, approved links, locale, and contact fallback;
- `getLegalDocument(slug)` for policy routes.

Those records are CMS-owned. Page templates continue to own semantic composition, section headings, contextual narrative, CTA placement, forms, validation messages, and non-editable safety explanations. If an editor must control one of those values later, add a typed field and validator rule first, then remove the hardcoded duplicate. A claim must never exist in two independently editable places.

## Guardrails and approval references

The Astro schema enforces field shapes and cross-field status rules. The prebuild validator additionally rejects common placeholders, high-risk fields, several absolute claims, and marketing numbers. It also requires:

- an evidence reference when a product becomes live or publicly available, or when ownership is marked documented;
- an evidence reference when Impact Sol status becomes operating or an approved domain is entered;
- an approval reference before legal content can be marked approved;
- explicit working-draft wording while a legal document remains a draft.

An evidence reference should point to a durable internal record: for example, an approval ticket, signed agreement identifier, rights register entry, or versioned evidence file. Do not paste credentials, personal data, private contract text, or temporary chat links into public content files.

Automated checks catch only obvious risks. A reviewer still needs to read the rendered page in context.

## Git editorial workflow

The production CMS should use Decap's editorial workflow:

1. The editor saves a draft on an unpublished Git branch.
2. A preview build renders the exact proposed content.
3. A reviewer checks facts, rights, tone, accessibility, privacy, SEO, and layout.
4. CI runs `npm run verify`.
5. An authorised publisher merges only after required approvals are attached.
6. The deployment system records the commit and release result.

Recommended roles are author, reviewer, and publisher. Do not give every contributor publish access. Require MFA through the chosen identity provider and define an offboarding owner.

## Local editing

`public/admin/config.yml` sets `local_backend: true`. Run the website and an organisation-approved, pinned Decap local proxy, then open `/admin/`. The editor bundle itself is pinned to Decap CMS `3.16.1` in `public/admin/index.html`.

Direct JSON editing is equally valid:

1. Copy an existing record in the appropriate collection.
2. Change the filename and `slug` together.
3. Keep field types and allowed status values intact.
4. Run `npm run build`.
5. Review the rendered page at mobile and desktop sizes.

## Production CMS activation

The committed `git-gateway` backend is a configuration starting point, not a deployed authentication system. Before exposing `/admin/`:

- confirm the production repository and branch;
- configure a compatible identity and Git Gateway, or replace the backend with an approved OAuth service;
- restrict allowed editors and require MFA;
- protect `/admin/` at the edge when possible;
- review CSP and network allow-lists needed by the editor;
- test login, logout, password/account recovery, authorisation failure, role removal, draft preview, publish, and rollback;
- confirm that the CDN-hosted editor meets supply-chain policy, or self-host the exact reviewed bundle and integrity metadata.

The admin page is marked `noindex`, but that is not access control.

## Media and rights

The media paths are `public/uploads` and `/uploads`. Before any upload, record source, creator, licence, consent where relevant, allowed crops/uses, expiry, and alt-text intent. Strip unnecessary metadata and avoid publishing personal data. Optimise raster images into responsive formats outside the CMS if the editor cannot produce the required variants.

Impact Sol currently has no approved public logo or photography in the project. The text wordmark is provisional. The Chokro mark must be used only in the Chokro context and only after the owner confirms its rights and relationship.

## Language workflow

English is the only launch locale. The `banglaReady` flag records architecture intent; it does not mean a translation exists. Before adding Bangla:

- translate every navigation, page, form, validation message, error, legal notice, metadata field, image alternative, and email message;
- use a qualified reviewer and test culturally appropriate terminology;
- define canonical and alternate-language URLs;
- add `hreflang` only when both versions are complete and equivalent;
- test fonts, line wrapping, reflow, screen readers, and mixed-script input;
- assign an owner who keeps both editions in sync.

Do not expose a language switcher to incomplete or machine-only copy.

## Conditional Stories section

Do not create a public Stories area until there are at least two or three substantive, approved items with source material and media rights. When that threshold is met, add a typed collection, listing, detail template, authorship/date fields, structured data, and archive/redirect policy before adding navigation.
