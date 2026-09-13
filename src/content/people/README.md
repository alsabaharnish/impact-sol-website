# Leadership and advisors

One JSON file per person, named `<slug>.json`. Records appear on
`/about/leadership/` under **Executive & Strategic Leadership**, grouped by
`group`:

| `group` | Renders under |
| --- | --- |
| `executive` | Executive & Strategic Leaders |
| `strategic` | Executive & Strategic Leaders |
| `advisory` | Advisors |
| `board` | Board & Governance |

A person's `group` alone controls where their profile appears; wording in
`role` never changes placement. A role or title is optional for `advisory`
records and required for every other group.

A group with no members does not render. While this directory holds no approved
record, the About page shows its "not yet published" state instead, and the
matching "withheld" disclosures elsewhere on the page retire themselves as soon
as the first approved record exists.

## Publication consent is required

`publicationStatus` defaults to `withheld`. A `withheld` record stays in the
repository and renders nowhere. Setting it to `approved` requires a
`consentReference` — a durable ticket or document identifier recording that the
person consented to publication of their profile details and portrait.
Store the consent evidence itself outside this repository.

Portraits go in `public/uploads/` (the Decap media folder) and need alternative
text. Only upload an image whose usage rights you hold.

Profile links select their icons automatically from the URL hostname. LinkedIn,
Facebook, Instagram, X/Twitter, YouTube, GitHub, TikTok, WhatsApp, Threads and
Medium are recognised; any other website receives a generic web icon. Only the
icon is visible, while `label` supplies its accessible name and hover text.

Biographies are subject to the same claim rules as the rest of the site: no
awards, superlatives, or numerical outcome claims. `npm run build` enforces this.

```json
{
  "slug": "example-slug",
  "name": "Full Name",
  "role": "Chief Executive Officer",
  "group": "executive",
  "bio": "Two or three factual sentences, approved by the person.",
  "photo": { "path": "/uploads/full-name.jpg", "alt": "Portrait of Full Name" },
  "links": [],
  "publicationStatus": "withheld",
  "consentReference": null,
  "sortOrder": 1
}
```

For an advisor whose title is not yet defined, set `"group": "advisory"` and
omit `role`. Do not omit `role` from executive, strategic, or board records.

`sortOrder` must be unique across every person, not just within a group.
