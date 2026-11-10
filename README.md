# KabOozi-MotiOn

KabOozi-MotiOn is an image and video studio with Sume as the default for new live requests. Seven installed Sume entries cover image generation/editing, budget video models, and video lip sync. Existing Higgsfield and MuAPI jobs keep their original provider.

The application uses Next.js, React, TypeScript, pnpm, MongoDB, Auth.js, and optional Stripe/R2 services. Credentials are injected from Infisical. See [Sume runtime](docs/sume.md) for model availability, pricing safeguards, and verification limits.

## Local setup with Infisical

Development settings live in the KabOozi-MotiOn Infisical project, environment
`dev`, folder `/`. The Windows account uses the existing Infisical CLI login.
Real credentials must stay in Infisical. Do not copy them into a plaintext env file.

```powershell
pnpm install --frozen-lockfile
pnpm config:check
pnpm dev:local
```

Open http://localhost:3000. The launcher starts the local MongoDB replica set
and mock generation service when needed, initializes the database, and serves
the studio on loopback. It reuses services already listening on their ports.
New generation requests use the live Sume API with explicit dollar approval and a $0.50 estimate cap. Signup grants are zero in the live configuration. Fixture tests use separate loopback providers and dummy keys. See [docs/sume.md](docs/sume.md) for installed Sume models and verification limits.

See [docs/setup.md](docs/setup.md) for the actual vault metadata, restart steps,
transcript analysis, verification, and remaining live-service setup.

## Real services

| Service       | What to set                                                                     | Notes                                                                                                |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| MongoDB Atlas | `MONGODB_URI`, `MONGODB_DB`                                                     | Any replica set (Atlas M0 works). Run `pnpm db:init` against it.                                     |
| Resend        | `AUTH_RESEND_KEY`, `EMAIL_FROM`                                                 | Verify the sending domain first.                                                                     |
| Higgsfield    | `HF_API_BASE_URL=https://api.higgsfield.ai`, `HF_CREDENTIALS=key_id:key_secret` | Keys from [console.higgsfield.ai](https://console.higgsfield.ai). Then run `pnpm pricing:sync`.      |
| Webhooks      | `HF_WEBHOOK_SECRET`, `HF_WEBHOOK_BASE_URL`                                      | Public HTTPS origin. Locally: `cloudflared tunnel --url http://localhost:3000` and put the URL here. |
| Stripe        | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`                  | Create 6 recurring prices (3 plans × month/year) and 3 one-time top-up prices.                       |
| R2            | `R2_*`                                                                          | Public bucket or custom domain for `R2_PUBLIC_BASE_URL`; CORS: allow GET from your origin.           |

Local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Store the listener signing secret as `STRIPE_WEBHOOK_SECRET` in the appropriate Infisical environment. Test cards: `4242 4242 4242 4242`.

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

| Command                        | What it does                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Infisical-backed local launcher                                                                               |
| `pnpm build`                   | Production build + client-bundle secret scan                                                                  |
| `pnpm typecheck` / `pnpm lint` | `tsc --noEmit` / ESLint                                                                                       |
| `pnpm test`                    | Vitest: catalog snapshots (every model), pricing, ledger, lifecycle, webhooks (in-memory MongoDB replica set) |
| `pnpm test:e2e`                | Playwright against a running stack (`E2E_BASE_URL` for a preview deploy)                                      |
| `pnpm models`                  | Regenerate `generation/catalog/models.generated.ts`                                                           |
| `pnpm db:dev` / `pnpm db:init` | Local MongoDB / indexes + preset seed                                                                         |
| `pnpm mock:higgsfield`         | Local mock of the Higgsfield REST API                                                                         |
| `pnpm pricing:sync`            | Derive prices from the estimate endpoint                                                                      |

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
2. Configure an Infisical-supported secret sync or scoped runtime injection for each deployment environment. Keep Production and Preview credentials separate.
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

MuAPI budget routes and dollar approval are documented in [docs/muapi.md](docs/muapi.md). Add its key through Infisical to enable those models. Verification uses loopback fixtures and never submits paid requests automatically.
