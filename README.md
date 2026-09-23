# Portfolio no Jutsu

An anime-inspired software-engineering portfolio built with Next.js, TypeScript, Turso, and Vercel. The repository includes the public portfolio, a résumé viewer, privacy-conscious analytics ingestion, authenticated metrics, and automated data retention.

## Repository structure

- `apps/web` — Next.js App Router application, including pages and server-side Route Handlers.
- `packages/contracts` — shared Zod schemas and TypeScript types for portfolio configuration and analytics.
- `portfolio.config.json` — owner-editable public content and feature settings.
- `.env.example` — private server-environment variable names with safe placeholders.

The project uses npm workspaces. Analytics Route Handlers live in `apps/web/src/app/api`; there is no separately deployed API service.

## Requirements

- Node.js 22 or later
- npm 11 or later
- A Turso account and CLI when analytics is enabled
- A Vercel project for preview and production deployments

## Getting started

Install dependencies and start the web application:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Analytics is enabled for this hosted portfolio in `portfolio.config.json`, so a complete local analytics setup also requires the private values described below. To work on the UI without analytics, temporarily set `analytics.enabled` to `false`; disabled mode sends no analytics requests and does not require private environment variables.

## Public configuration

Edit `portfolio.config.json` to change site content, themes, page visibility, résumé settings, and public analytics behavior. Never put credentials or private tokens in this file.

The analytics settings are:

- `enabled` — activates browser reporting and server analytics.
- `retentionDays` — number of days event records remain eligible for storage.
- `sessionTimeoutMinutes` — inactivity window used to deduplicate visits.
- `refreshIntervalSeconds` — reserved for a future analytics dashboard.
- `metrics` — individual switches for visits, estimated unique visitors, résumé views, and résumé downloads.

### Avatar and résumé assets

Place avatar images in `apps/web/public/avatars/`, then configure `site.avatarFileName`, `site.avatarAlt`, and `site.heroPortraits`.

Place the résumé PDF under `apps/web/public/` and configure its same-origin path and download filename in the `resume` object. The current viewer is available at `/resume`, and `/api/resume/download` records an explicit download before redirecting to the configured PDF.

## Analytics architecture

The initial analytics release records only these allowlisted events:

- `visit`
- `resume_view`
- `resume_download`

Clients send an event name and normalized internal route. The server supplies timestamps and applies the public metric switches.

Visit deduplication uses a server-generated opaque session cookie. Only a keyed session hash is stored. Estimated daily unique visitors use an HMAC derived from the UTC date and visitor address; the raw address is discarded after hashing. This is an approximate operational metric, not a browser fingerprint or permanent identity.

Analytics failures are best effort: they do not block navigation, résumé viewing, or résumé downloads.

### Metric semantics

- **Visits** — accepted `visit` events without an unexpired analytics session. Activity refreshes the configured session timeout.
- **Estimated unique visitors** — distinct daily visitor hashes across stored events.
- **Résumé views** — emitted once per mounted résumé viewer after the viewer becomes visible. Prefetching does not count.
- **Résumé downloads** — explicit requests through `/api/resume/download`.

## Private environment variables

Copy `.env.example` to `.env.local` for local development and fill in private values:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://` or HTTPS URL for the environment's database |
| `TURSO_AUTH_TOKEN` | Turso token authorized for that database or database group |
| `ANALYTICS_ADMIN_TOKEN` | Bearer token for `/api/metrics` |
| `ANALYTICS_HASH_SECRET` | HMAC secret for daily visitor and session hashes |
| `ANALYTICS_ALLOWED_ORIGINS` | Comma-separated exact HTTP(S) origins allowed to submit events |
| `CRON_SECRET` | Bearer token for the retention endpoint and Vercel Cron |

All six values are required when analytics is enabled. Keep them server-only and never rename them with a `NEXT_PUBLIC_` prefix. Generate independent application secrets with, for example:

```bash
openssl rand -base64 48
```

Use different Turso databases and different secrets for development/Preview and Production. This repository uses `pnj-dev` for local and Preview testing and `pnj-prod` for Production.

## Turso setup and migrations

Create separate development and production databases in the closest practical region. Obtain each database URL and a token through the Turso CLI or dashboard, then store only the development values in the ignored `.env.local` file.

Migrations are checked into `apps/web/src/lib/analytics/migrations`. They never execute during an application request or automatically during deployment.

Load the local file into the current shell, check migration state, apply pending migrations, and check again:

```bash
set -a
source .env.local
set +a

npm run analytics:migrate:check
npm run analytics:migrate
npm run analytics:migrate:check
```

The final check should print `Analytics migrations are current.` Unset credentials when they are no longer needed in the shell:

```bash
unset TURSO_DATABASE_URL TURSO_AUTH_TOKEN
```

Inspect the development database with:

```bash
turso db shell pnj-dev
```

```sql
SELECT name
FROM sqlite_master
WHERE type IN ('table', 'index')
ORDER BY name;
```

Expected tables include `schema_migrations`, `analytics_events`, `analytics_sessions`, and `analytics_rate_limits`.

## API endpoints

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/events` | Same or configured origin | Validate and record allowlisted events |
| `OPTIONS` | `/api/events` | Origin validation | CORS preflight |
| `GET` | `/api/resume/download` | Public | Record a download and redirect to the PDF |
| `GET` | `/api/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD` | `ANALYTICS_ADMIN_TOKEN` | Read daily aggregates for a range of at most 365 days |
| `GET` | `/api/cron/analytics-retention` | `CRON_SECRET` | Delete expired data in bounded batches |

Private endpoints expect an `Authorization: Bearer <token>` header. Successful and error responses use `Cache-Control: no-store`. Common statuses are:

- `200` — successful metrics query or cleanup.
- `400` — malformed, reversed, duplicated, or oversized date range.
- `401` — missing or invalid private Bearer token.
- `503` — analytics configuration or storage is unavailable.

Example local metrics request:

```bash
curl -sS "http://localhost:3000/api/metrics?from=2026-09-01&to=2026-09-30" \
  -H "Authorization: Bearer $ANALYTICS_ADMIN_TOKEN" \
  | jq .
```

## Vercel deployment

The Vercel project Root Directory must be `apps/web`, which is why its deployment configuration is stored at `apps/web/vercel.json`.

Configure the six analytics variables separately for these environments:

| Vercel environment | Database | Credentials |
| --- | --- | --- |
| Preview | Development database (`pnj-dev`) | Development/Preview-only secrets |
| Production | Production database (`pnj-prod`) | Independent Production-only secrets |

Changing a Vercel environment variable does not update an existing deployment; redeploy after every change. Treat database tokens, admin tokens, hash secrets, and cron secrets as sensitive values.

`apps/web/vercel.json` invokes `/api/cron/analytics-retention` daily at `03:00 UTC`. Vercel automatically sends the configured `CRON_SECRET` as a Bearer token. Scheduled invocations run only on Production deployments; invoke the endpoint manually when testing a Preview deployment.

After a production deployment, confirm the job under **Vercel → Project → Settings → Cron Jobs**.

Refer to Vercel's documentation for [environment scopes](https://vercel.com/docs/environment-variables) and [secured Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Retention

Each cleanup call:

- deletes event records older than `analytics.retentionDays`;
- deletes expired sessions;
- deletes completed rate-limit windows;
- processes no more than 500 rows per table per batch and ten batches per invocation;
- reports deletion totals and whether the bounded run completed.

Cleanup is idempotent and safe to repeat. A response with `"complete": false` means another authenticated invocation may be needed. Disabling analytics also disables automatic cleanup; disabling does not erase previously stored records.

## Secret rotation

### Application secrets

To rotate `ANALYTICS_ADMIN_TOKEN` or `CRON_SECRET`, generate a new value, update the appropriate Vercel environment, redeploy, verify the new token, and remove the old value from local secret storage.

Rotating `ANALYTICS_HASH_SECRET` intentionally breaks continuity with previously derived visitor and session hashes. Expect existing visitors to begin new analytics sessions after deployment.

### Turso tokens

For a database in a Turso group, token invalidation is group-wide rather than token-specific. Plan a short maintenance window:

1. Invalidate existing tokens with `turso group tokens invalidate <group-name>`.
2. Generate fresh development and production database tokens.
3. Update local and Vercel environments.
4. Redeploy and verify event ingestion and metrics.

Never commit a generated token or paste one into issue, PR, or deployment logs.

## Testing and verification

Run the full local quality suite from the repository root:

```bash
npm test
npm run test:coverage
npm run lint
npm run build
```

The root HTML coverage report is written to `coverage/index.html`. Workspace-specific commands remain available:

```bash
npm test --workspace @portfolio-no-jutsu/contracts
npm test --workspace @portfolio-no-jutsu/web
```

Before promoting an analytics change:

1. Run `analytics:migrate:check` against the target database.
2. Confirm disabled mode sends no event requests.
3. Verify visit session deduplication and résumé events against the Preview database.
4. Confirm anonymous private-endpoint requests return `401`.
5. Confirm authenticated metrics match direct Turso aggregates.
6. Invoke Preview retention manually and verify newer records remain.
7. Confirm the Production cron registration after merge.

## Full opt-out

Set `analytics.enabled` to `false` in `portfolio.config.json` and redeploy. In disabled mode, the browser client sends no analytics requests and the server does not require analytics environment variables.

This setting does not delete previously stored data. If permanent deletion is required, clean the database separately before revoking access or deleting it.
