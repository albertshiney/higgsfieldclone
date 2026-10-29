# Vireo — AI image & video studio

Vireo is an AI studio for generating images and video with documented
[Higgsfield REST API](https://docs.higgsfield.ai) workflows: Seedance,
Kling, Wan, Soul, Cinema Studio, Genjutsu, MiniMax, LTX, PixVerse, Grok,
Recraft, Qwen, Ideogram and more — **53 picker entries covering 89 documented
endpoints** as of the October 2026 catalog refresh. Newly discovered workflows
that still need full verification are listed in `docs/model-catalog.md`. Users sign in with a magic link, pay with Stripe credits, and keep
everything in a personal library. The UX follows higgsfield.ai (dark UI, lime
accent, generator panel, justified feeds); the brand, copy and media are ours.

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| UI | Tailwind v4 + shadcn (Base UI), Quanta tokens, lucide, zustand, @tanstack/react-virtual — scaffolded from [`higgsfield-ai/app-templates`](https://github.com/higgsfield-ai/app-templates) |
| Auth | Auth.js v5 (`next-auth@5`), magic links via Resend, database sessions |
| Email | Resend + React Email (`emails/`) |
| Database | MongoDB (Atlas replica set) — one client shared by the Auth.js adapter and the app |
| Payments | Stripe Checkout, Billing, Customer Portal, webhooks |
| Generation | Higgsfield REST API, one server-side key |
| Media | Cloudflare R2 (every output is copied; the platform keeps outputs ≥ 7 days) |

## Quick start (fully offline)

Nothing external is needed to run the whole product locally: a local MongoDB
replica set, a mock Higgsfield API and a dev mailbox stand in for the services.

```bash
pnpm install
cp .env.example .env.local      # then fill AUTH_SECRET: openssl rand -base64 32
```

In three terminals:

```bash
pnpm db:dev            # MongoDB replica set on :27027 (data in .data/mongo)
pnpm mock:higgsfield   # mock platform on :4010 ("[fail]", "[nsfw]", "[slow]" in a prompt steer outcomes)
pnpm dev               # http://localhost:3000
```

Once, after the database is up:

```bash
pnpm db:init --admin=you@example.com   # indexes + Effects presets (+ admin role)
```

For offline development set in `.env.local`:
`MONGODB_URI=mongodb://127.0.0.1:27027/?replicaSet=vireo`,
`HF_API_BASE_URL=http://localhost:4010`, `HF_CREDENTIALS=mock:mock`,
`SIGNUP_BONUS_CREDITS=200`, `E2E_TEST_MODE=true`. Magic links are printed to the
dev-server log (no Resend key needed); media is stored under `.data/media`; the
reconciler runs in-process every 5 s because there is no cron or webhook tunnel.

## Real services

| Service | What to set | Notes |
|---|---|---|
| MongoDB Atlas | `MONGODB_URI`, `MONGODB_DB` | Any replica set (Atlas M0 works). Run `pnpm db:init` against it. |
| Resend | `AUTH_RESEND_KEY`, `EMAIL_FROM` | Verify the sending domain first. |
| Higgsfield | `HF_API_BASE_URL=https://api.higgsfield.ai`, `HF_CREDENTIALS=key_id:key_secret` | Keys from [console.higgsfield.ai](https://console.higgsfield.ai). Then run `pnpm pricing:sync`. |
| Webhooks | `HF_WEBHOOK_SECRET`, `HF_WEBHOOK_SIGNING_SECRET`, `HF_WEBHOOK_BASE_URL` | Public HTTPS origin; reveal the `whsec_` signing secret in Console Settings. Locally: `cloudflared tunnel --url http://localhost:3000` and put the URL here. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | Create 6 recurring prices (3 plans × month/year) and 3 one-time top-up prices. |
| R2 | `R2_*` | Public bucket or custom domain for `R2_PUBLIC_BASE_URL`; CORS: allow GET from your origin. |

Local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. Test cards: `4242 4242 4242 4242`.

### Pricing

`credits = ceil(platform USD × CREDIT_MARKUP / CREDIT_USD_VALUE)`. Prices
come from the platform's estimate endpoint:

```bash
pnpm pricing:sync            # calls POST /estimate/{path} for every endpoint
```

It writes `lib/billing/pricing.generated.json` (commit it). Token-metered
models (Seedance, Cinema Studio, Wan 3.0, …) return a pricing description
instead; their rules are derived from it in `lib/billing/pricing-table.ts`.
Endpoints with no verified price are not sold on the live API until an admin
sets one in **Admin → Models & pricing**, and a price guard compares each
submit against the live estimate (`HF_PRICE_GUARD`). Details:
`docs/runbook.md` → Pricing.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (regenerates the model barrel on change) |
| `pnpm build` | Production build + client-bundle secret scan |
| `pnpm typecheck` / `pnpm lint` | `tsc --noEmit` / ESLint |
| `pnpm test` | Vitest: catalog snapshots (every model), pricing, ledger, lifecycle, webhooks (in-memory MongoDB replica set) |
| `pnpm test:e2e` | Playwright against a running stack (`E2E_BASE_URL` for a preview deploy) |
| `pnpm models` | Regenerate `generation/catalog/models.generated.ts` |
| `pnpm db:dev` / `pnpm db:init` | Local MongoDB / indexes + preset seed |
| `pnpm mock:higgsfield` | Local mock of the Higgsfield REST API |
| `pnpm pricing:sync` | Derive prices from the estimate endpoint |

## Adding a model

1. Add `generation/catalog/models/<family>.ts` with a default export of
   `ModelEntry[]` (copy a neighbour). Map UI settings to the **documented**
   body fields in `toPlatform`, and cite the docs URLs in the header comment.
2. `pnpm models` (the dev server does this automatically).
3. Add a price rule for each new endpoint path in `lib/billing/pricing-table.ts`
   (or run `pnpm pricing:sync`).
4. `pnpm test -u` updates the catalog snapshots; review them against the docs.

Adding the first **audio** model makes the Audio nav item and `/audio` appear
automatically — the surface, tiles, player and pricing are already wired.

## Architecture

```
Browser ── prompt dock / panel ─▶ server action submitGeneration()
   │                                 validate vs catalog → price → debit (Mongo txn)
   │                                 → POST {model path}?hf_webhook=… → store request_id
   ├─ PUT file ─▶ presigned platform upload URL (key never leaves the server)
   └─ polls GET /api/generations/status (our DB only) every 3.5 s while in flight
Higgsfield ── webhook ─▶ /api/webhooks/higgsfield (HMAC token) ─▶ finalizeGeneration()
Vercel Cron ─▶ /api/cron/reconcile ─▶ stuck/ambiguous runs, refunds, copy retries, annual grants
finalizeGeneration(): re-fetch status → copy outputs to R2 → complete, or refund failed/nsfw/canceled once
Stripe ─▶ /api/webhooks/stripe ─▶ ledger grants (idempotent on Stripe ids)
```

Key files: `lib/generations/{submit,finalize,reconcile,cancel}.ts`,
`lib/billing/{price,ledger,stripe-events}.ts`, `lib/higgsfield/client.ts`,
`generation/catalog/**`, `components/generator/**`, `auth.ts`.

## Deployment (Vercel)

1. Create the Atlas cluster, R2 bucket, Resend domain and Stripe products.
2. Set every `(required)` variable from `.env.example` in Vercel (Production + Preview).
3. `vercel.json` schedules `/api/cron/reconcile` every minute (send `CRON_SECRET`).
4. Stripe webhook endpoint: `https://<domain>/api/webhooks/stripe` with events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `charge.refunded`.
5. `pnpm db:init` against production once; `pnpm pricing:sync` with the live key.

See `docs/runbook.md` for operations, `docs/decisions.md` for every default and
docs-vs-template disagreement, and `docs/model-catalog.md` for the model table.

The Studio UI is adapted from `higgsfield-ai/app-templates` (no LICENSE file
as of 2026-09-26 — re-check before launch; see `docs/decisions.md`).
