# Runbook

Operating Vireo in production. Everything below is idempotent unless noted.

## Health at a glance

| Signal | Where | Healthy |
|---|---|---|
| Reconciler | Vercel → Cron → `/api/cron/reconcile` | 200 every minute; JSON summary with small numbers |
| In-flight runs | Admin → Generations → status `queued` / `in_progress` | Nothing older than `RUN_TIMEOUT_MINUTES` (30) |
| Pending submits | Admin → Generations → `pending_submit` | Empty after 2 minutes |
| Pricing | Admin → Models & pricing | No pink "placeholder" or "Reprice" badges |
| Billing flags | Admin → Users (pink ⚠ next to an email) | None unreviewed |

## Generation lifecycle

`pending_submit → queued → in_progress → completed | failed | nsfw | canceled`

* Credits are debited in the same transaction that creates the generation.
* `failed`, `nsfw`, `canceled` and timeouts refund exactly once (ledger key
  `{reason, refType, refId, bucket}`); the reconciler re-runs any refund that
  didn't land.
* The webhook verifies Standard Webhooks headers against the raw body when
  `HF_WEBHOOK_SIGNING_SECRET` is configured (required in production). It also
  checks the URL token and never trusts the payload — it re-fetches
  `GET /requests/{id}/status`.

### A run is stuck

1. Admin → Generations, filter by status. Note the platform request id.
2. The user can press **Check status** on the tile (after 90 s), or wait for
   the reconciler (runs every minute; anything untouched for 3 minutes is
   re-fetched).
3. After `RUN_TIMEOUT_MINUTES` the reconciler cancels (if queued) or fails the
   run and refunds. A late platform success is still delivered to the user
   (logged as "late delivery"), without re-charging.

### Ambiguous submits (`pending_submit` with no request id)

The platform has no idempotency key, so timeouts/502/504 on submit are never
retried automatically. After 2 minutes the reconciler marks them failed and
refunds. If a webhook for that generation arrives later, the result is attached
and delivered free.

### Platform errors in logs

| Log | Meaning | Action |
|---|---|---|
| `OPERATOR ALERT: Higgsfield rejected HF_CREDENTIALS (401)` | Key revoked/rotated | Update `HF_CREDENTIALS`, redeploy |
| `OPERATOR ALERT: Higgsfield account is out of credits (403)` | Platform balance empty | Top up the platform account |
| `OPERATOR ALERT: Platform concurrency limit reached` | Account concurrency cap | Ask Higgsfield for higher limits; lower plan concurrency |
| `[pricing] live cost … exceeds our price basis` | Price table stale | Admin → Models & pricing, or `pnpm pricing:sync` |

## Pricing

* `pnpm pricing:sync` (needs `HF_CREDENTIALS`) rebuilds
  `lib/billing/pricing.generated.json` from `POST /estimate/{path}`: every
  endpoint the catalog reaches, every enum/switch value it offers there, and
  the duration curve. Commit and deploy. Endpoints that fetch their inputs
  need reachable sample media: `PROBE_IMAGE=https://… PROBE_VIDEO=https://…
  pnpm pricing:sync` (any public image and ~5 s MP4).
* Token-metered endpoints (Seedance, Cinema Studio, Wan 3.0, Genjutsu,
  MiniMax H3 references, Marketing Flare/Sunburst) answer the estimate with a
  pricing *description*; the sync prints it. Their rules are hand-derived in
  `lib/billing/pricing-table.ts` (`source: "description"`, text quoted next to
  each rule) — re-check them when the sync shows a changed description.
* **Unverified** (placeholder) prices are never sold against the live API: the
  Generate button says the option isn't available yet. As of 2026-09-26 that
  is Kling motion control (2.6 / 3.0, std / pro), Kling O3 / Omni video edit
  (their estimate returns 500) and Marketing Flare / Sunburst (token-billed
  with no per-image rate). Look the cost up in the Higgsfield console and set
  it in Admin → Models & pricing → ✎.
* Per-endpoint overrides: Admin → Models & pricing → ✎. Takes effect within 30 s.
* The price guard blocks a submit only when the live cost is > 25 % above our
  basis (and flags the model at > 1 %).

## Credits and billing

* Adjust a balance: Admin → Users → **Adjust credits** (ledger `admin_adjust`
  with a note the user sees in their history).
* Stripe events are deduplicated (`stripe_events`) and every grant is keyed on
  a Stripe id. Replaying an event from the Stripe dashboard is safe.
* Refunded top-ups claw back credits (never below zero). If the credits were
  already spent the user is flagged — decide in Admin → Users, then clear the
  flag.
* Subscription invoices **reset** plan credits; cancellation keeps them until
  the period ends (`customer.subscription.deleted` zeroes the plan bucket).
* Annual plans get monthly grants from the reconciler (`nextGrantAt`).

## Moderation

Admin → Moderation lists reported public generations. **Unpublish** removes an
item from Community and blocks re-publishing; **Dismiss** closes the reports.

## Secrets rotation

| Secret | Rotation |
|---|---|
| `AUTH_SECRET` | Rotating signs everyone out (database sessions stay, cookies become invalid). |
| `HF_WEBHOOK_SECRET` | In-flight runs' webhook tokens stop verifying; the reconciler finishes them. |
| `HF_WEBHOOK_SIGNING_SECRET` | Reveal or rotate in Higgsfield Console Settings. The previous signing key remains valid for 24 hours; update the app before it expires. |
| `HF_CREDENTIALS` | Create the new key in the console first, deploy, then revoke the old key. |
| `STRIPE_WEBHOOK_SECRET` | Roll in the Stripe dashboard; Stripe retries failed deliveries. |
| `CRON_SECRET` | Update in Vercel; Vercel Cron sends the new value automatically. |

## Data

* Indexes: `pnpm db:init` (idempotent). Required for the ledger's exactly-once
  guarantees — run it before the first deploy.
* Outputs live in R2 under `u/{userId}/{generationId}/{n}.{ext}`; uploads under
  `u/{userId}/uploads/`. Deleting a generation deletes its objects.
* Backups: enable Atlas continuous backup; R2 has no versioning by default.

## Launch checklist

- [ ] Every `(required)` variable in `.env.example` set in Production.
- [ ] Reveal the Higgsfield `whsec_` webhook signing secret and set `HF_WEBHOOK_SIGNING_SECRET`.
- [ ] `pnpm db:init` against the production database.
- [ ] `pnpm pricing:sync` with the live key; no placeholder prices in admin.
- [ ] Final plan prices and credit allowances in `lib/billing/plans.ts`; Stripe prices match.
- [ ] Stripe in live mode, webhook endpoint + events configured, test purchase refunded.
- [ ] Resend domain verified; a real magic link arrives.
- [ ] R2 CORS allows GET from the site origin.
- [ ] Legal pages replaced (`/legal/*`).
- [ ] `higgsfield-ai/app-templates` licence re-checked.
- [ ] `pnpm test:e2e` green against the preview deploy (`E2E_TEST_MODE` on the preview only).
