# KabOozi-MotiOn contract for coding agents

Vireo is a credit-metered AI image/video studio defaulting to Sume, with preserved Higgsfield and MuAPI jobs,
scaffolded from `higgsfield-ai/app-templates` (studio). Read `README.md`,
`docs/decisions.md` and `docs/model-catalog.md` before changing behaviour.

## Layout

- `app/(site)` marketing pages (expanded nav + footer) · `app/(studio)` full-height
  workspaces (generators, library) · `app/(app)` scrolling signed-in pages
  (account, billing, admin) · `app/api` route handlers · `app/actions` server actions.
- `generation/catalog/models/*.ts` — one file per model family; the barrel is
  generated (`pnpm models`). Never hand-edit `models.generated.ts`.
- `lib/higgsfield` (server-only platform client), `lib/generations` (submit,
  finalize, reconcile, cancel, library), `lib/billing` (price, ledger, Stripe),
  `lib/db`, `lib/storage` (R2 / local), `lib/uploads.ts`, `auth.ts`.
- `components/generator` (panel, dock, canvas, picker), `components/studio`
  (template primitives: prompt box, gallery, lightbox, asset library),
  `components/site`, `components/billing`, `components/library`, `components/admin`.

## Invariants — preserve these

- **Server only:** the platform key, Stripe/Resend/R2 secrets and model paths.
  `lib/higgsfield/**` imports `server-only`. Request paths and bodies come from
  the catalog (`toPlatform`), never from the client.
- **Every server action / route handler** calls `auth()` (via `requireUser`)
  and scopes queries by `userId`; other users' ids are 404, not 403.
- **Credits change only through `lib/billing/ledger.ts`**, inside transactions,
  never below zero, idempotent on `{reason, refType, refId, bucket}`.
- **Prices come from server pricing or fresh provider estimates**; the client's
  number is display only.
- **Finalize is the only path to a terminal status**; it re-fetches the status
  (webhook payloads are untrusted) and refunds failed/nsfw/canceled once.
- **Poll our DB, not the platform:** the browser polls
  `GET /api/generations/status`; never poll through a server action.
- **Model files cite their docs URLs**; never invent endpoints, fields or enums.
- Generating and failed tiles stay in feeds; loaded media never unmounts on fast scroll.
- Dark only; lime is reserved for the Generate CTA and active states; every
  visible control works (remove what can't); no `any`, `@ts-ignore`,
  `@ts-expect-error`.

## Definition of done for a change

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass; E2E
(`pnpm test:e2e`) passes against a running stack; docs updated when a default
or contract changes.

## Agent skills

### Issue tracker

Linear is the shared task tracker for this repository and the broader development workspace. GitHub remains the code, branch, pull-request, review, and merge system. See docs/agents/issue-tracker.md.

### Triage labels

Use the canonical triage labels needs-triage, needs-info, ready-for-agent, ready-for-human, and wontfix. See docs/agents/triage-labels.md.

### Domain docs

Keep repository-specific domain context in docs/agents/domain.md.

## Infisical development contract

- Read docs/setup.md before changing startup or service configuration.
- Infisical is the source of truth for development and deployment secrets.
- The linked instance is https://app.infisical.com. Project KabOozi-MotiOn is
  7fa17a08-0d84-408a-985e-b8f94ceced81. Local startup uses environment dev, folder /.
- Use scoped CLI runtime injection. Never store real credentials in source,
  plaintext env files, command arguments, chat, logs, or screenshots.
- Development uses local MongoDB on 27027 and Sume at https://api.sume.com for new requests. The mock on 4010 is only for explicitly isolated fixtures. Keep live paid usage clearly identified. Do not describe fixture tests as live renders.
- Browser fixture tests reject real provider credentials and remote API origins.
  Keep browser traces off and suppress development request/function logs containing authentication data.
- E2E_TEST_MODE is only configured for loopback development. Do not deploy it.
- Shared dialog triggers stay disabled during server rendering until client
  handlers are ready. Preserve caller-disabled props and the no-JavaScript browser regression.
- The requested reusable Infisical skill is future work tracked as BOOZI-50.

## Child DOX Index

- components/studio/AGENTS.md owns the inherited studio primitives.
- docs/agents/AGENTS.md owns repository workflow and tracker documentation.
- lib/sume/AGENTS.md owns the server-only Sume adapter.
- lib/muapi/AGENTS.md owns the server-only MuAPI adapter.
- Root owns all other application, library, catalog, script, test, asset, and
  documentation paths, including docs/setup.md and the secure startup commands.

## Seedance SDK example

- Root index.ts owns the standalone official SDK example. It is server-side CLI code and must never be imported by client components.
- generate:seedance:secure uses Infisical dev:/; generate:seedance supports an ignored .env.local as an explicit user-requested compatibility exception. Never inspect or print that file or copy vault credentials into it.
- Each example invocation can create a billable request. Keep submissions non-retrying and never run this example as a test-suite setup step. Report success only for completed status plus a valid HTTPS video URL.

- test:e2e:secure runs scripts/test-mock-e2e.mjs. It requires loopback app and mock provider origins, substitutes dummy credentials only in the browser-test child process, and never changes the vault.

## Mandatory Sume-first provider policy

- Mista Boo's October 23, 2026 instruction supersedes the earlier MuAPI/Higgsfield provider preference for new media work. Use Sume whenever it offers the exact required feature/model/input-mode/settings combination. Other providers require a verified coverage gap.
- Read the detailed protocol and registry in the sibling planning repository: ../CREATIVE-COMMAND-PLATFORM/-CREATIVE-COMMAND-PLATFORM/docs/providers/sume/protocol.md and routing-policy.json. Its model-matrix.md and public-evidence.json record dated public discovery.
- A missing key, auth/scope error, low balance, cap, outage, moderation refusal, or uncertain job is not a coverage gap. Hold instead of switching providers automatically.
- Pin exact models and quote complete requests. Keep the $0.50 initial estimate cap, explicit paid approval, owner block on Seedance 2.5, and Infisical runtime injection. Never alias Seedance Mini as Lite, H3 Max as Turbo, or Wan 3.0 as 2.5/2.6.
- New non-fixture requests allow only Sume entries. Seven entries cover GPT Image 2 create/edit, Seedance 2 Mini/Fast and MiniMax H3/Max text/image-to-video, and Veed video lip sync. Uninstalled features remain unavailable. No alternative-provider coverage exceptions are approved yet.
- Sume quotes use the verified current-origin POST /v1/open/estimate. Every new Sume job needs signed request-bound approval, a fresh quote, and a stable provider idempotency key.
- Sume uses status polling and owned output storage. Cancellation and Sume webhooks are not enabled. Unknown submissions and slow jobs retain their ledger reservation until confirmed. Never equate a studio refund with a provider-wallet refund.
- The production reconciler checks eligible Sume jobs on each minute cron run after five seconds without an update. Browser status polling remains database-only; cron batching and provider delays can add wait time.
- providerFixtureMode permits legacy routes only with explicit loopback dummy fixtures or the unit harness. Production always enforces Sume-only submission. Unit suites run sequentially because concurrent temporary MongoDB replicas can exhaust Windows resources.
- Preserve original providers for existing jobs and outputs. Do not relabel jobs, rotate keys, delete adapters, transfer balances, or run a paid migration test as part of adopting this policy.

## Budget model policy

- generation/catalog/index.ts puts Sume defaults first. Disabled legacy entries remain installed for old jobs and fixture coverage, but cannot create new live jobs. Preserve recorded providers on old jobs.
- lib/billing/pricing.ts disables all Seedance 2.5 entries on the live platform. Preserve server-side rejection before debit or submission, including saved choices and direct requests.
- docs/muapi.md records six verified MuAPI text-to-video routes. Higgsfield H3 Max/Lite/Fast/Wan 2.5 variants remain unverified there. Never alias Seedance Mini as Lite.
- Live submissions require a signed request-bound dollar approval and a fresh estimate before debit. GENERATION_MAX_USD defaults to 0.50. Never bypass the cap, retry uncertain submissions, or use automatic provider fallback.
- Persist provider before submission; old rows default to Higgsfield. MuAPI cancellation is unsupported. Hold uncertain submissions for review and keep polling slow confirmed jobs without inventing cancellation or provider refunds.
- scripts/test-provider-fixtures.mjs owns isolated loopback browser verification. It uses a temporary database and inherits no real service secrets.
- scripts/check-live-provider.ts performs estimate calls only, through the configured server client. It must never submit a generation.
- Do not run paid agent verification without showing the estimated dollar cost and receiving explicit approval. The live migration itself authorizes no extra paid renders.
- Signup grants are zero in the live development configuration. Existing local test balances were not changed. The credit meter and provider wallet are separate.
- Authentication and mobile menu buttons remain disabled before hydration, as covered by the no-JavaScript browser regression.

## Dependency checks

- Preserve the verified Next.js 16.4.1 security baseline, Zod >=4.6.6, follow-redirects >=1.16.2 and ip-address >=10.7.4 when updating packages.
- One unpatched low-severity deepmerge email-renderer advisory is tracked in BOOZI-60. Report it honestly; do not suppress audit findings.
- Native browser confirmation tests must handle the dialog concurrently with the click so Playwright does not wait on a blocked browser action.
