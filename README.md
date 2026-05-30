# LinkedIn Recruiter Link Tracker

A production-ready **Job Application Tracker + LinkedIn/CV Analytics** web app built with Next.js, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, and Row Level Security.

The app helps users create clean public tracking links for job applications, record LinkedIn/CV engagement events, separate likely-human clicks from bot/security-scanner opens, and manage follow-up reminders.

## What the app does

- Lets each user create an account and save their own LinkedIn profile URL.
- Creates application/company records with job title, recruiter details, application URL, notes, status, and applied date.
- Creates multiple source-specific tracking links per company.
- Uses clean random public slugs such as `/profile/a8f3k2` instead of company-specific slugs.
- Redirects public LinkedIn tracking links to the user's configured LinkedIn URL.
- Tracks CV landing page views through `/cv/[slug]`.
- Tracks CV downloads through `/cv/[slug]/download`.
- Tracks total clicks, likely-human clicks, possible bots, duplicates, CV views, CV downloads, browser/device/OS/country stats, and source/campaign performance.
- Provides a status pipeline: `Applied`, `Link Opened`, `Interview`, `Rejected`, `Offer`, `Archived`.
- Automatically moves a company from `Applied` to `Link Opened` after the first likely-human click.
- Provides reminders and dashboard follow-up lists.
- Provides CSV exports for clicks, companies, and full reports.
- Keeps all private dashboard data behind Supabase Auth and RLS.

## What the app cannot do

- It does **not** access LinkedIn analytics.
- It does **not** hack, scrape, or read LinkedIn recruiter data.
- It cannot prove exactly who opened a link.
- It cannot guarantee that a click came from a real recruiter because company email systems often scan links automatically.
- It does not use Google Analytics or external tracking scripts.
- It does not store raw IP addresses.
- It does not add invasive fingerprinting.

## Click tracking model

When a recruiter opens a clean public link like:

```text
https://your-domain.com/profile/a8f3k2
```

The app:

1. Resolves the random slug using a safe Supabase RPC function.
2. Records a click event.
3. Stores only a hashed IP value, not the raw IP address.
4. Stores basic user-agent-derived fields: browser, device type, and OS.
5. Classifies the event as `human`, `bot`, `duplicate`, or `unknown`.
6. Redirects the visitor to the user's configured LinkedIn profile URL.

The public route never exposes the company name, recruiter notes, dashboard data, or user analytics.

## Bot/security scanner detection

Company email systems often open links automatically before a recruiter sees the email. The app classifies clicks using conservative rules:

- Known bot/scanner user agents are marked as possible bots.
- Empty or suspicious user agents are treated as bot-like.
- Repeated clicks from the same `ipHash + userAgent + trackingLinkId` within 30 seconds are marked as duplicates.
- Bot and duplicate clicks are stored for transparency but can be filtered out of analytics.
- Redirects are never blocked because blocking can break legitimate recruiter access.

## Source/campaign tracking

Each tracking link has a source:

- CV
- Cover Letter
- Email
- Email Signature
- LinkedIn Message
- Portfolio
- Other

A company can have multiple source-specific links, for example:

```text
BMW - CV            - /profile/a8f3k2
BMW - Cover Letter  - /profile/k9p2m1
BMW - Email         - /profile/x7n4q8
```

The dashboard groups analytics by company, source, and tracking link.

## CV view/download tracking

Each tracking slug can also be used as a CV landing page:

```text
/cv/[slug]
```

When opened, the app records a CV view and shows a simple professional landing page with:

- View LinkedIn
- Download CV

The download button uses:

```text
/cv/[slug]/download
```

This records a CV download event and redirects to the user's `cv_file_url`. For now, CV uploads are intentionally simple: users paste a public PDF URL in Settings.

## Privacy note

- Raw IP addresses are never stored.
- IP addresses are hashed server-side using `IP_HASH_SALT`.
- Country is optional and only stored if provided by deployment platform headers such as `x-vercel-ip-country`, `cf-ipcountry`, or `x-country`.
- No precise location is collected.
- No Google Analytics or third-party web analytics script is included.
- No invasive fingerprinting is used.

## Security note

- Supabase RLS must be enabled.
- Dashboard users can only read/write their own data.
- Public routes record events only through safe `SECURITY DEFINER` RPC functions.
- Public routes do not expose dashboard tables directly.
- Do not expose service role keys to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is optional and used only server-side for notification helper logic.

## Tech stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security

## Local development

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build check

```bash
npm run typecheck
npm run build
```

This project was verified with:

```bash
npm run typecheck
npm run build
```

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run:

```text
supabase/sql/001_schema.sql
supabase/sql/002_rls_policies.sql
```

If a public tracking URL shows `Link error`, run the hotfix file as well:

```text
supabase/sql/006_fix_public_tracking_rpc.sql
```

4. Optional seed file:

```text
supabase/sql/003_seed_optional.sql
```

5. If you already deployed the older version of this app, run this migration first, then re-run the RLS/RPC file:

```text
supabase/sql/005_upgrade_to_job_tracker_platform.sql
supabase/sql/002_rls_policies.sql
supabase/sql/006_fix_public_tracking_rpc.sql
```

## SQL structure

Main tables:

- `profiles`
- `companies`
- `tracking_links`
- `clicks`
- `cv_events`
- `timeline_events`
- `reminders`

Public-safe RPC functions:

- `track_profile_click_and_get_target(...)`
- `track_cv_event_and_get_payload(...)`
- `mark_first_click_notification_sent(...)`

## Environment / configuration

The current project keeps the public Supabase URL and anon key in:

```text
src/lib/supabase/config.ts
```

For a public production repository, move these to environment variables and rotate the existing values.

Server-only optional variables for first-click notifications:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
FIRST_CLICK_NOTIFICATION_FROM="Job Tracker <notifications@your-domain.com>"
```

The app works normally if these variables are missing. The notification helper returns a skipped result and never crashes the redirect flow.

## Email notification abstraction

The notification entry point is:

```text
src/lib/server/notifications.ts
```

The function is:

```ts
sendFirstClickNotification(...)
```

It currently supports a Resend provider path when environment variables are configured. You can add SendGrid, Supabase Edge Functions, or another provider inside the same function without changing the tracking routes.

Notification behavior:

- Only the first likely-human click is considered.
- Bot clicks do not trigger notifications.
- Duplicate clicks do not trigger notifications.
- Repeated human clicks do not repeatedly trigger notifications.
- If the provider is not configured, the app skips sending safely.

## Deployment

The app is a standard Next.js project. Deploy it using your hosting provider's Next.js preset or framework auto-detection. Do not commit platform-specific initialization files unless you intentionally want to override the host defaults.

General steps:

1. Connect the GitHub repository to your hosting provider.
2. Add the required environment variables.
3. Use `npm run build` as the build command if asked.
4. Let the provider auto-detect the Next.js output settings.

## How to use

1. Create an account.
2. Add your LinkedIn URL in Settings.
3. Optionally add a public CV PDF URL in Settings.
4. Add a company/application.
5. Create source-specific tracking links.
6. Put the clean `/profile/[slug]` link in your CV, email, cover letter, or application.
7. Optionally use `/cv/[slug]` as a CV landing page.
8. Recruiter opens the link.
9. Dashboard records the click, classifies it, and updates analytics.
10. Follow up based on status, reminder date, and likely-human engagement.

## Public route examples

```text
/profile/a8f3k2          -> records LinkedIn click and redirects to LinkedIn
/r/a8f3k2                -> legacy route, same behavior
/cv/a8f3k2               -> records CV view and shows CV landing page
/cv/a8f3k2/download      -> records CV download and redirects to CV file URL
```

## Quality notes

- TypeScript strict mode is enabled.
- Input validation is included.
- LinkedIn URL validation is required.
- Slugs are short random values and globally unique through a database unique constraint.
- Public routes do not expose dashboard data.
- RLS policies restrict each user to their own data.
- No raw IP addresses are stored.
