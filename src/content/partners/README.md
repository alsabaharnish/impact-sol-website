# Partners

One JSON file per organisation, named `<slug>.json`. Records appear on `/about/`
under **Our Partners**. The whole section is omitted while this directory is
empty — it never renders as an empty shell.

## Written permission is required

Naming another organisation is a claim about them. `permissionReference` is
mandatory on every record and must identify the written name and logo
permission on file. `relationship` must be `proposed` or `active`; do not imply
endorsement, funding, or delivery that has not been agreed.

Logos go in `public/uploads/` and need alternative text. The layout contains the
mark rather than cropping it, so any reasonable aspect ratio works.

```json
{
  "slug": "example-org",
  "name": "Example Organisation",
  "relationship": "proposed",
  "description": "What the relationship covers, without outcome claims.",
  "logo": { "path": "/uploads/example-org.svg", "alt": "Example Organisation logo" },
  "url": "https://example.org",
  "permissionReference": "Ticket or document identifier for the written permission",
  "sortOrder": 1
}
```
