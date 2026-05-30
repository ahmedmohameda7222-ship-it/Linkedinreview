# LinkedIn Recruiter Link Tracker

A production-ready Next.js + Supabase web app for creating LinkedIn profile tracking links per company or recruiter.

The app creates URLs such as:

```text
https://your-domain.com/r/bmw-a1b2c3
```

When someone opens a tracking link, the app:

1. Finds the active tracking slug.
2. Records a click in Supabase PostgreSQL.
3. Redirects immediately to the owner user's LinkedIn profile URL.

The initial/default LinkedIn URL configured in the app is:

```text
https://www.linkedin.com/in/ahmed-mohamed-a63a1a230/
```

## What this app does

- Lets users sign up, log in, log out, and request password resets with Supabase Auth.
- Lets each user store their own LinkedIn profile URL.
- Lets each user create company-specific tracking links.
- Tracks clicks per company.
- Stores referrer, user agent, hashed IP, optional country header, and basic device/browser info.
- Shows a private dashboard with total clicks, clicks today, clicks this week, companies, click history, and a simple click chart.
- Uses Supabase Row Level Security so users can only see their own dashboard data.

## What this app cannot do

This app **cannot** tell whether someone viewed a LinkedIn profile directly inside LinkedIn.

It only tracks clicks on generated tracking links, for example:

```text
/r/bmw-a1b2c3
```

If a recruiter copies the real LinkedIn URL, searches manually, or views the profile from inside LinkedIn, this app will not see that action.

This app does **not** hack LinkedIn, scrape LinkedIn, access LinkedIn analytics, or bypass LinkedIn privacy settings.

## Tech stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase JavaScript SDK

## Important security note about keys

This project follows the requested restriction: it does **not** use environment variables. The Supabase project URL and anon key are hardcoded in:

```text
src/lib/supabase/config.ts
```

The Supabase anon key is public by design when Row Level Security is configured correctly.

Never hardcode or expose a Supabase `service_role` key in frontend code, backend code committed to a repository, or any browser-accessible file.

## Privacy note

The app does not store raw IP addresses.

When a tracking link is opened, the server reads the IP address from request headers only to create a SHA-256 hash with a hardcoded salt. Only the hash is inserted into the database.

The app does not use invasive fingerprinting. It stores only standard request metadata:

- referrer, if provided by the browser
- user agent
- hashed IP
- optional country header, if available from the hosting provider
- simple device/browser classification

For a stricter production deployment, add a public privacy notice on your domain and review GDPR requirements for your jurisdiction.

## Supabase setup

### 1. Create or open your Supabase project

Project URL used by this app:

```text
https://pokfickvtmvutiqygxpi.supabase.co
```

REST API URL provided:

```text
https://pokfickvtmvutiqygxpi.supabase.co/rest/v1/
```

Anon key is hardcoded in the app as requested.

### 2. Run SQL schema

Open Supabase Dashboard → SQL Editor.

Run these files in order:

```text
supabase/sql/001_schema.sql
supabase/sql/002_rls_policies.sql
```

Optional:

```text
supabase/sql/003_seed_optional.sql
```

The schema creates:

- `profiles`
- `companies`
- `clicks`
- trigger for profile creation after signup
- RPC function `track_click_and_get_target` for safe public click recording

The RLS file enables Row Level Security and policies.

### 3. Configure Supabase Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:

Set **Site URL** to your final deployed site URL, for example:

```text
https://your-domain.com
```

Add these redirect URLs:

```text
https://your-domain.com/auth/callback
https://your-domain.com/update-password
http://localhost:3000/auth/callback
http://localhost:3000/update-password
```

For production, replace `your-domain.com` with your real domain.

## Deployment

This is a standard Next.js project. It is not tied to any specific hosting provider.

Use any deployment platform that supports Next.js 14 and Node.js.

Typical platform settings:

```text
Install command: npm install
Build command: npm run build
Start command: npm run start
Output: Next.js default output
```

No `.env` file is required because this project intentionally hardcodes the Supabase URL and anon key in `src/lib/supabase/config.ts`.

## Optional local development

Local development is optional. Use this only if you want to test on your own laptop:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How to use the app

Example workflow:

1. User creates an account.
2. User adds or confirms their LinkedIn URL in **Settings**.
3. User opens **Companies**.
4. User adds company `BMW`.
5. App generates a unique link like:

   ```text
   https://your-domain.com/r/bmw-k8x2qf
   ```

6. User puts that link in their CV or application.
7. Recruiter opens it.
8. App records the click.
9. Recruiter is redirected to the user's LinkedIn profile.
10. User sees the click in the dashboard.

## Data model

### profiles

- `id`
- `user_id`
- `full_name`
- `linkedin_url`
- `created_at`
- `updated_at`

### companies

- `id`
- `user_id`
- `name`
- `slug`
- `target_url`
- `active`
- `created_at`
- `updated_at`

### clicks

- `id`
- `user_id`
- `company_id`
- `clicked_at`
- `referrer`
- `user_agent`
- `ip_hash`
- `country`
- `device`
- `browser`
- `created_at`

## SQL files

```text
supabase/sql/001_schema.sql
supabase/sql/002_rls_policies.sql
supabase/sql/003_seed_optional.sql
```

Run `001_schema.sql` first, then `002_rls_policies.sql`.

## Important RLS behavior

- Logged-in users can only read, create, update, and delete their own profile.
- Logged-in users can only read, create, update, and delete their own companies.
- Logged-in users can only read their own clicks.
- The public tracking route uses a safe RPC function to insert click records and return only the redirect target URL.
- Other users' dashboard data is not exposed.

## Project structure

```text
src/
  app/
    login/
    signup/
    dashboard/
    r/[slug]/
    privacy/
  components/
  lib/
supabase/
  sql/
```

## Troubleshooting

### `next: not found`

This means dependencies were not installed before the build command ran. The deployment platform must run:

```text
npm install
```

before:

```text
npm run build
```

### Auth redirect does not work

Check Supabase Auth URL configuration. Your deployed domain must be added as a Site URL and redirect URL.

### Tracking link says not found

Check that:

- the company exists
- the slug is correct
- the link is active
- SQL files were executed successfully

### Dashboard is empty after signup

Check that the `handle_new_user()` trigger exists from `001_schema.sql`.


## Cloud deployment note

This project intentionally contains no hosting-provider-specific configuration files. There are no provider-specific build configuration files.

Use a standard Node/Next.js deployment platform. The platform should run:

```bash
npm install
npm run build
npm run start
```

The project pins a stable Node/npm line in `package.json`:

```json
"engines": {
  "node": "20.x",
  "npm": "10.8.x"
}
```

If your platform previously used Node 22 and npm 10.9.x, clear the deployment cache and redeploy with the files from this ZIP only.
