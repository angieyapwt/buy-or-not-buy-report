# Report-request conversion tracking

`Lead` (Meta) and `generate_lead` (GA4) fire only after the report backend
acknowledges a saved, new request. A successful response must have `ok: true`,
no duplicate flag, and an integer `loggedRowNumber` of at least 2. It must be:

- An emailed report: `loggedSheet: "Leads"`, `found: true`, with no status
  (the current backend response) or `status: "FOUND_SENT_MASKED"`.
- An accepted manual-review request: `loggedSheet: "NotFoundRequests"`,
  `found: false`, `status: "NOT_FOUND_MANUAL_REVIEW"`.

Form validation, button clicks, duplicate responses, processing states, errors,
demo mode, and the 21-second pending message never count as leads. A confirmed
response that arrives after the pending message still counts once. Tracking
exceptions do not interrupt report delivery or the success UI.

`GetReportButtonClick` remains a diagnostic event, not the optimisation target.
Use the standard `Lead` event on pixel `1073030562320651` for ad optimisation.

Run regression checks with:

```sh
node --test tests/lead-tracking.test.cjs
node --check main.js
```

This change moves the existing browser event; it does not add another
Conversions API sender. Verify the existing server integration and its
deduplication in Events Manager before making changes to server events.
Browser tracking can still be blocked or lost if the visitor closes the page
before the backend replies. Backend lead logs remain the source of truth for
total requests; Ads Manager reports only requests attributed to ads.

After deployment, check the v65 asset URL, then use Events Manager Test Events
to verify an accepted request, an invalid form, and a duplicate. Real request
tests send emails and create backend records; use a designated test contact.
