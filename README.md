# Horizon account application

A static recreation of the Horizon homepage with Supabase-backed email/password accounts.
The original imagery is retained. Market values are sample content; trading and deposits are not implemented.

## Included

- Signup with first name, last name, optional international phone number, and password confirmation.
- Email verification and resend confirmation.
- Email/password login, persistent Supabase sessions, and logout.
- Password recovery using a PKCE callback and an authenticated password update form.
- Protected account page, profile editing, email changes, and password changes.
- Own-profile-only database policies. No admin panel, service-role key, or privileged user management endpoint.

## Local development

Requires Node.js 22 or newer. No dependency installation or build is needed.

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
3. Run `node --env-file-if-exists=.env serve.cjs` or `npm run dev`.
4. Open http://127.0.0.1:4174.

The selected Horizon project is configured in `config/supabase-public.json`. These are intentionally public client settings, not server credentials. Environment variables can override them. Invalid overrides fail closed with HTTP 503. The database schema and Auth URL configuration below must still be applied.

## Supabase setup (required before live signup)

Selected project: `https://utfdajwoseumovoqxtev.supabase.co`. Its publishable key has been verified. Email signup is enabled and email confirmation is required. The `profiles` table still needs to be created; the connected Supabase management account currently cannot access this project.

1. Run `supabase/schema.sql` in its SQL Editor. The SQL includes RLS and verification queries.
2. In Authentication, enable Email/password authentication and email confirmation.
3. Set a password minimum of at least 12 characters.
4. Set the Site URL to the actual production URL, for example `https://aurexmarkets.vercel.app`.
5. Add these exact Redirect URLs:
   - `https://aurexmarkets.vercel.app/auth/callback`
   - `https://aurexmarkets.vercel.app/auth/callback?flow=recovery`
   - `http://127.0.0.1:4174/auth/callback`
   - `http://127.0.0.1:4174/auth/callback?flow=recovery`
   Replace the production hostname if yours differs.
6. Use the project's publishable key (`sb_publishable_...`) from its API keys settings.
7. Configure production SMTP before opening signup to general users; Supabase's default mail service has delivery/rate restrictions.

Default Supabase confirmation and recovery templates are supported. Open email links in the same browser that requested them because PKCE keeps a verifier in that browser. Email changes use Supabase's secure email-change confirmation flow.

Profiles are created on the first authenticated account-page visit. Signup metadata is used only to prefill personal details. Ownership always uses the verified Auth user ID plus RLS; metadata never grants permissions.

## Vercel

Import `Eazynesta/horizon-clone`, branch `main`.

- Keep the Root Directory at the repository root (not `dist`).
- `vercel.json` sets Framework to Other, output to `dist`, and no install/build step.
- Public project settings are already provided in `config/supabase-public.json`. Optionally override them with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel. Remove stale overrides pointing at another project.
- Redeploy after changing environment variables.
- Verify `/api/config` returns 200 and `/auth/callback` returns the app.
- Connect the repository to Vercel Git integration to deploy subsequent pushes automatically.

The `api/config.js` Vercel function exposes only public client configuration.
Never add a Supabase secret/service-role key or database password to the frontend or this repository.
Auth callback query parameters are cleared from the address bar after processing.

## Verify before enabling real users

Run `node --test tests/config.test.cjs tests/auth.test.mjs` or `npm test`.

The tests cover validation, SDK payloads, error propagation, owner-scoped profile writes, public-key filtering, callbacks, and local HTTP isolation.
They do not replace live Supabase testing. After configuration, test signup/verification, login, logout, recovery, email change, profile persistence, and two-user RLS isolation using test accounts you control.
Live database policies and email delivery remain unverified until a backend is connected.

## Structure

- `dist/`: deployable frontend and original assets
- `dist/auth.mjs`: Supabase account service
- `dist/app.js`: routes, forms, and account UI
- `dist/vendor/`: pinned upstream Supabase SDK 2.57.4, MIT license, and checksum
- `api/config.js`: safe public configuration endpoint
- `supabase/schema.sql`: database setup and verification
- `tests/`: Node test suite

The SDK is vendored at an exact version so auth code has no runtime CDN dependency. There are no npm dependencies; the lockfile records the project metadata.

## Save and push

After reviewing changes:

```powershell
git add .
git commit -m "Describe the completed change"
git push
```

Git saves local history; Vercel deployment follows the connected branch's pushes.
