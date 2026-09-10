# Leadership and advisors

One JSON file per person, named `<slug>.json`. Records appear on `/about/` under
**Executive & Strategic Leadership**, grouped by `group`:

| `group` | Renders under |
| --- | --- |
| `executive` | Executive leadership |
| `strategic` | Strategic leadership |
| `advisory` | Advisors |
| `board` | Board and governance |

A tier with no members does not render. While this directory holds no approved
record, the About page shows its "not yet published" state instead, and the
matching "withheld" disclosures elsewhere on the page retire themselves as soon
as the first approved record exists.

## Publication consent is required

`publicationStatus` defaults to `withheld`. A `withheld` record stays in the
repository and renders nowhere. Setting it to `approved` requires a
`consentReference` — a durable ticket or document identifier recording that the
person consented to publication of their name, role, biography and portrait.
Store the consent evidence itself outside this repository.

Portraits go in `public/uploads/` (the Decap media folder) and need alternative
text. Only upload an image whose usage rights you hold.

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

`sortOrder` must be unique across every person, not just within a group.
