# Measurement plan

No analytics provider or non-essential tracking is enabled in the launch build. This avoids creating a consent banner for technology the site does not need. If analytics is introduced later, complete privacy, consent, security, performance, accessibility, and procurement review first.

The browser may emit a local, provider-neutral custom event hook for quality measurement. A future adapter must keep the payload allow-listed and free of personal data.

## Event dictionary

| Event | Purpose | Allowed properties | Never collect |
| --- | --- | --- | --- |
| `navigation_select` | Understand which public route is selected | destination path, navigation location | link text containing user content, referrer query values |
| `cta_select` | Compare intended pathways | stable CTA ID, source path, destination path | names, email addresses, message text |
| `faq_toggle` | Identify information that needs clearer placement | FAQ slug, open/closed state, source path | typed search terms or free text |
| `form_start` | Detect form discoverability | form type, source path | field values |
| `form_submit_result` | Monitor usability and service health | form type, success/validation/server/rate-limit category | validation field values, email, name, message, raw status body |
| `error_view` | Find broken routes and service states | error type, pathname | query strings, full referrer, client identifiers |

Paths must be stripped of query strings and fragments. Do not create persistent visitor IDs, fingerprints, cross-site identifiers, session replay, heatmaps, ad audiences, or user profiles for this site.

## Operational metrics

Server-side operational monitoring may count response classes, latency, queue age, retries, failed deliveries, cleanup success, and rate-limit events. Keep those statistics aggregate. Logs must not contain enquiry bodies, contact details, raw addresses, secrets, database records, or provider email payloads.

## Decision process for future analytics

Before enabling any provider, document:

1. the specific decision each event supports;
2. data fields, identifiers, retention, hosting location, subprocessors, and access roles;
3. whether consent is required in each launch jurisdiction;
4. opt-out and deletion mechanics;
5. script-size and performance impact;
6. CSP/network changes;
7. policy copy and owner approval;
8. a removal plan if the data is not used.

Prefer short-lived, aggregate, first-party measurement. Revalidate the no-cookie-banner decision whenever technology changes.
