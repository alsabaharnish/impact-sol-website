# Enquiry forms on Netlify

The general, partnership, and maker/initiative forms are static HTML forms handled by Netlify Forms. The site does not run a separate enquiry API or store submissions in a repository database.

## Forms and fields

Netlify identifies the forms by these unique names:

| Public route | Netlify form name |
| --- | --- |
| `/contact/` | `impact-sol-general` |
| `/get-involved/partnership/` | `impact-sol-partnership` |
| `/get-involved/maker/` | `impact-sol-maker` |

All forms include `form-name`, `inquiryType`, `sourcePath`, and `privacyNoticeVersion`. Depending on the route, a submission may also include name, email, message, organisation or initiative, phone, country, website, role, category, collaboration interest, initiative stage, and support sought.

The forms use HTML constraints and accessible client-side error messages. Netlify receives URL-encoded form data. JavaScript submissions show an inline confirmation; no-JavaScript submissions open `/thank-you/`. Neither confirmation promises a reply or claims that a notification email was delivered.

## Detection and spam protection

Each rendered form includes:

- a unique `name`;
- `method="post"` and `data-netlify="true"`;
- a matching hidden `form-name` field for AJAX submissions; and
- `data-netlify-honeypot="companyWebsite"` with a visually hidden, normally blank field.

Netlify also filters form submissions for spam. A honeypot rejection is intentionally not distinguishable to a bot. Check both **Verified submissions** and **Spam submissions** when testing with realistic data.

In Netlify, open **Forms → Usage and configuration → Form detection** and ensure detection is enabled. Redeploy after enabling it or changing form markup. The build check verifies that all three static form definitions are present.

## Administrator access

Submissions are not shown in the website’s `/admin/` content editor. Authorised Netlify project members access them through:

1. Open the site in Netlify.
2. Select **Forms**.
3. Select `impact-sol-general`, `impact-sol-partnership`, or `impact-sol-maker`.
4. Review the verified and spam lists.

The form detail page can export verified submissions as CSV. Individual submissions can be marked as spam or permanently deleted. Restrict Netlify project access, require multi-factor authentication, and remove access promptly when a role ends.

## Notifications

Form notification email is optional and does not need code changes. In Netlify, open **Project configuration → Notifications → Emails and webhooks → Form submission notifications**, add an email notification, choose the relevant forms, and use a monitored mailbox.

Netlify notification emails are operational alerts to the site team, not automatic replies to the person who submitted the form. Do not promise a submitter email unless a separately reviewed workflow is added and tested.

## Privacy, retention, and requests

The forms collect personal information. Before public launch:

- approve the privacy notice and identify Netlify as the hosting and form processor;
- approve a retention period and a recurring deletion process;
- define who may access, export, or delete submissions;
- sign any required data-processing agreement and review processing locations/transfers; and
- document how access, correction, deletion, legal hold, complaint, and incident requests are handled.

Netlify does not apply this project’s former database retention timer. An authorised owner must regularly delete submissions according to the approved retention schedule. Export only the minimum necessary data, store exports securely, and securely remove temporary copies.

## Verification

After a production deploy:

1. Confirm all three forms appear under **Netlify → Forms**.
2. Submit one realistic, non-sensitive test through each public route.
3. Confirm the inline success state with JavaScript.
4. Confirm the `/thank-you/` route works as the non-JavaScript destination.
5. Confirm each test appears under the correct form name; check the spam list if it does not.
6. Confirm validation, keyboard focus, the honeypot indicator, notification routing, CSV export, and deletion.
7. Delete the test records after verification.

Do not send production personal data through local development or deploy-preview testing.
