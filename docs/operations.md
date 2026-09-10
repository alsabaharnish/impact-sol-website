# Operations runbook

## Service shape

Astro generates the public assets into `dist/`. The Node process serves those assets and the enquiry endpoint, and uses SQLite for enquiries, the delivery outbox, and rate-limit state. Email delivery is optional at configuration level but must be fully configured and tested before public forms are presented as operational.

Run the service behind a managed HTTPS reverse proxy. Keep the application listener private where possible. Preserve the application's security headers and add platform headers only after checking for conflicts.

## Build and release

1. Start from a reviewed commit with a clean dependency lockfile.
2. Set the approved canonical origin for the build.
3. Run `npm ci` followed by `npm run verify`.
4. Retain the build log and artifact digest.
5. Deploy the code and `dist/` without replacing the persistent data volume.
6. Start one tested delivery worker topology. If multiple Node replicas are used, verify SQLite locking, volume semantics, and outbox claiming under that topology first.
7. Smoke-test page routes, assets, headers, 404s, maintenance mode, every enquiry type, mail delivery, and retention cleanup.
8. Record the commit, configuration revision, database backup, approvers, and rollback version.

## Health and monitoring

At minimum, monitor:

- process availability and restart loops;
- HTTP error rate and latency without recording submitted form bodies;
- rejected origin, body-limit, and rate-limit counts at an aggregate level;
- outbox pending age, retries, permanently failed jobs, provider rejections, bounces, and complaints;
- database volume capacity, filesystem permissions, backup freshness, and cleanup results;
- certificate and domain expiry;
- dependency and secret-scanning alerts.

Alerts need a named recipient and escalation path. Do not put names, email addresses, messages, raw IP addresses, API keys, or database contents into logs or alert payloads.

## Enquiry delivery incident

If submissions are accepted but messages are not delivered:

1. Keep the durable database and outbox intact.
2. Check provider status, verified sender, credential validity, recipient configuration, and failed-job codes.
3. Do not repeatedly resubmit user forms or manually email message bodies through unapproved channels.
4. Correct configuration, restart the worker if needed, and allow idempotent retries.
5. Reconcile accepted enquiry IDs against delivered or terminally failed outbox jobs.
6. Notify the privacy/security owner if exposure or loss is suspected.
7. Record scope, timeline, action, recovery, and follow-up without copying personal data into the incident ticket unless access is explicitly controlled.

Enable maintenance mode if forms cannot safely accept submissions. Provide the approved direct-contact alternative only if that mailbox is monitored.

## Data access, export, and deletion

Restrict database access to authorised operational staff. Requests for access, correction, export, deletion, restriction, or legal hold must be verified and handled under an owner-approved procedure. Query and export tooling should be run on an encrypted administrative environment, produce the minimum necessary data, and record who authorised the action.

Deletion must cover the enquiry and its queued/delivered outbox rows according to the database relationship, then confirm that scheduled backups expire under the approved backup retention policy. Never promise immediate removal from immutable backups unless the backup system supports and the policy requires it.

## Backup

Back up both of these assets:

- Git repository and release metadata for code and content;
- SQLite database on its persistent volume for accepted enquiries and delivery state.

Use a consistent SQLite-aware backup, a storage-level snapshot that coordinates writes, or stop writes briefly. Copying only `inquiries.sqlite` while WAL mode is active can omit committed data in the WAL file. Encrypt backups, restrict restore access, set an approved retention, and test restoration into an isolated environment on a schedule.

A restore test should verify database integrity, representative inquiry/outbox relationships, application startup, queue recovery without duplicate delivery, and cleanup timing. Use a safe mail sink or disabled delivery in restore tests.

## Rollback

Rollback the application by redeploying the last verified release artifact or commit. Preserve the live data volume and take a consistent backup before rollback. Confirm that the older code can read the current schema; future non-additive database changes require an explicit compatibility and migration plan.

After rollback, smoke-test public routes, response headers, form validation, one controlled submission, queue processing, and cleanup. Record why the rollback occurred and block the failed version from automatic redeployment.

Content-only rollback should use Git revert or republish a previously approved revision through the editorial workflow. Do not overwrite history or manually edit production output.

## Retention and cleanup

`INQUIRY_RETENTION_DAYS` controls application cleanup, but the configured number must match the approved privacy notice and operational policy. Also define retention for provider email copies, logs, alerts, exports, incident tickets, and backups. Review cleanup success without logging deleted content.

Rate-limit records contain keyed hashes rather than raw addresses; they still require access control and scheduled cleanup.

## Security maintenance

- Apply supported Node and dependency security updates through a reviewed branch and full verification.
- Rotate the email credential and IP-hash secret under a documented plan. Changing the hash secret resets continuity of rate-limit identities.
- Review allowed origins, proxy trust, CSP, and admin access whenever the host changes.
- Test that production rejects an insecure hash secret and has no development origins.
- Keep runtime files outside the public static root.
- Review third-party CDN policy for the admin editor. The public pages should remain independent of that script.

## Scheduled review

At least at each release, and on an owner-defined periodic schedule, review public claims, product maturity, links, policies, accessibility limitations, retention, accounts, dependencies, backups, alerts, domain ownership, and incident contacts. Remove stale copy rather than leaving an unsupported statement online.
