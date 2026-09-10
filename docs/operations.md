# Netlify operations runbook

## Service shape

Astro generates the static site into `dist/`. Netlify serves those assets, applies the headers in `netlify.toml`, and handles the three enquiry forms. Form submissions are stored in the Netlify project rather than a local database. The website’s `/admin/` route remains a separate Decap content editor backed by GitHub.

## Build and release

1. Start from a reviewed commit and clean dependency lockfile.
2. Confirm the production branch, primary Netlify domain, and GitHub OAuth configuration.
3. Run `npm ci` followed by `npm run verify`.
4. Let Netlify deploy the reviewed commit using `npm run build` and publish `dist/`.
5. Check the production pages, assets, security headers, redirects, 404 behaviour, canonicals, robots file, sitemap, admin login, and all three form routes.
6. Confirm the three forms appear in the Netlify Forms dashboard and delete controlled test submissions after verification.
7. Record the release commit, approvals, deployment URL, form test result, and rollback version.

The production canonical origin is read from Netlify’s primary `URL` during production builds. `IMPACT_SOL_SITE_URL` remains an explicit override. After a custom domain becomes the primary Netlify domain, redeploy and verify canonical links, social metadata, robots, sitemap, OAuth homepage settings, and redirects.

## Form monitoring

At minimum, monitor:

- Netlify deployment failures and availability;
- unexpected submission volume and spam classification;
- form-notification failures or delivery gaps, if notifications are enabled;
- whether the approved team mailbox is monitored;
- storage and manual retention/deletion reviews;
- certificate and domain expiry; and
- dependency, repository, and account security alerts.

Alerts and tickets must not copy full messages or unnecessary personal information. Name an owner and escalation route before launch.

## Enquiry incident

If a form shows success but a submission cannot be found:

1. Check the correct form in **Netlify → Forms**.
2. Check its **Spam submissions** list.
3. Confirm form detection is enabled and the latest deploy detected all three form names.
4. Confirm the submitter used the production site and not a local or preview build.
5. Check Netlify service status and deployment logs without publishing submitted data.
6. Disable or remove the public form call to action if submissions cannot be handled safely; keep only an approved, monitored alternative.
7. Record the scope, timeline, decision, recovery, and follow-up without putting message bodies into an uncontrolled incident ticket.

If only notification email fails, submissions may still be present in Netlify. Review the Forms dashboard directly before asking anyone to resubmit.

## Data access, export, and deletion

Restrict Netlify project access to authorised operational staff and require multi-factor authentication. Verify privacy requests outside the dashboard before acting.

For an approved export, select the form in Netlify and use **Download as CSV**, then transfer the minimum necessary data through an approved secure channel. For deletion, select the relevant submission and permanently delete it after completing any required verification or legal-hold check.

Deletion must also cover controlled exports, mailbox copies, tickets, and any other approved downstream system. Never promise removal from provider backups unless the provider contract and policy support that promise.

## Retention

Netlify Forms does not use an application retention timer from this repository. The privacy owner must approve the retention period and assign a recurring review. On schedule:

1. Identify records beyond the approved period.
2. Check legal holds or continuing correspondence requirements.
3. Export only records that have an approved operational need.
4. Permanently delete expired submissions.
5. Record completion without copying submission content into the record.

Apply aligned retention to notification emails, CSV exports, support tickets, logs, and incident records.

## Backup and rollback

Git and Netlify deploy history provide code and content recovery. Record a known-good production deployment for each release. Before relying on deploy history, exercise one rollback and confirm public pages, `/admin/`, and form definitions recover as expected.

Form data is operational data, not part of a site rollback. Rolling back a deploy must not be treated as deleting or restoring submissions. If business continuity requires a separate submission archive, define an encrypted, access-controlled export schedule and its retention before creating one.

## Security maintenance

- Keep GitHub and Netlify accounts protected by MFA and least privilege.
- Review the GitHub OAuth App, authorised editors, Netlify members, notification destinations, and recovery controls at every release and staff change.
- Apply supported dependency updates through a reviewed branch and full verification.
- Verify the Netlify security headers after configuration changes.
- Keep `/admin/` excluded from search and review its third-party Decap script policy.
- Reassess the privacy notice before adding analytics, advertising, uploads, CAPTCHA, automation, or another data recipient.

## Scheduled review

At each release and on an owner-defined schedule, review claims, product maturity, links, policies, accessibility limitations, form access, retention, accounts, dependencies, notifications, domain ownership, and incident contacts. Remove stale copy instead of leaving an unsupported public statement online.
