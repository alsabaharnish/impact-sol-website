# Editable content

These JSON files are the structured source for editable Impact Sol content. The matching schemas live in `src/content.config.ts`; the Decap editor configuration lives in `src/admin/config.yml`.

Pages should consume the validated records through `src/content/read.ts`. It exposes sorted offerings, products and FAQs, the single global-settings record, and legal documents without making page templates know the underlying file layout. A typical Astro frontmatter block is:

```ts
import { getFaqs, getOfferings } from '../content/read';

const offerings = await getOfferings();
const faqs = await getFaqs();
```

CMS-owned content includes offering cards, product maturity and rights disclosures, FAQ answers, global public-status/contact settings, and legal/policy draft bodies. Page composition, section headings, explanatory narrative, CTA layout, form labels, and validation messages remain code-owned unless they are deliberately migrated into a new schema and editor field. Do not duplicate a CMS-owned claim in page code; render the record or derive display labels from its controlled status value.

The launch copy intentionally describes Impact Sol as being established. Do not change organisation status, approved domain, Chokro availability, or Chokro ownership without adding an evidence or approval reference. Do not add metrics, testimonials, partner logos, or certification claims until the owner has supplied written approval and source material.

Run `npm run build` after every content change. The prebuild validator rejects missing fields and a small set of high-risk placeholder or unsupported claims before Astro validates the full schemas.
