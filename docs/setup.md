# KabOozi-MotiOn local setup

The repository is installed on this machine. The original source called the app Vireo. Development configuration now uses the KabOozi-MotiOn name.

## Secret source

- Instance: https://app.infisical.com.
- Organization: FENIX DIGITAL ENTERPRISE TECHNOLOGIES.
- Project: KabOozi-MotiOn, ID `7fa17a08-0d84-408a-985e-b8f94ceced81`.
- Environment: Development, slug `dev`.
- Secret folder: `/`.
- Human authentication: the existing Infisical login stored in Windows Credential Manager.
- `.infisical.json` contains non-secret project metadata. No application credential values belong in this repository.

Signing secrets were generated in process memory and stored directly in Infisical. They were not printed or written to a local environment file. Production and staging remain separate from this development setup.

## Start on Windows

Use PowerShell from this repository:

```powershell
pnpm install --frozen-lockfile
pnpm config:check
pnpm dev:local
```

The launcher reads only this project's `dev:/` configuration. It starts local MongoDB on port 27027 when that is the configured database, starts the mock on port 4010 when mock generation is configured, initializes indexes and presets, and runs the web app on [localhost:3000](http://localhost:3000). The web server binds to loopback.

MongoDB and the mock run as hidden background processes. Their logs are under ignored `.data/logs/`. The launcher reports each process it starts. It reuses listeners already on the configured local backend ports. It refuses to start a second web server on port 3000.

If the backends are already running, start only the web process:

```powershell
pnpm dev:secure
```

The first MongoDB startup downloads its binary. Wait for the readiness message. Do not start another download or reset the database to fix a slow first run.

## What development mode means

The current development environment routes generation to the live Higgsfield API. The visible LIVE API notice identifies paid usage. New signups receive zero bonus credits. Existing local test balances remain unchanged and are not provider wallet funds. The local mock on port 4010 is only for isolated fixture verification.

Without Resend, sign-in messages stay in the local development mailbox. Magic-link URLs must not be printed to logs. Test-only mailbox access is controlled by the existing E2E configuration and must never be exposed as a public deployment.

Local media is stored under ignored `.data/media/`. Stripe checkout is disabled until actual Stripe configuration exists. R2 storage and real email delivery are not established by local mock tests.

## Connect real generation

Use [Higgsfield's console](https://console.higgsfield.ai) to obtain a real API credential. Store it directly in this project's Development environment, under `HF_CREDENTIALS`, in the documented key ID and secret format. Do not paste it into chat. The standalone SDK example also supports the explicitly requested, ignored .env.local compatibility exception; enter any such value locally without exposing it to the agent.

The initial setup found only a demo credential. A later presence-only check found a non-demo credential in dev:/; that check alone does not verify account access or successful generation.

HF_API_BASE_URL is now https://api.higgsfield.ai in Infisical dev:/, with HF_PRICE_GUARD enabled. The restarted studio uses the existing server REST client for submissions, polling, cancellation, and finalization. The live banner replaces the demo notice. Keep the pricing guard enabled.

The provider account was funded by the owner. Paid agent verification still requires a displayed dollar estimate and explicit approval. No paid generation was submitted during this live migration.

For actual email, configure Resend and a verified sender. For cloud data and media, configure an Atlas replica set and R2. For payments, configure Stripe test mode and its products and webhook before live mode. Production requires all services checked by `lib/env.ts`.

## Useful checks

```powershell
pnpm config:check
pnpm db:init:secure
pnpm typecheck
pnpm lint
pnpm test
pnpm build:secure
pnpm test:e2e:secure
```

Report mock and live results separately. Keep the real provider key and any authenticated test URLs out of logs, screenshots, and committed artifacts.

## Transcript analysis

- Around 3:15, the presenter enters secrets in a local environment file. This setup replaces that step with scoped Infisical runtime injection.
- Around 4:17, the presenter suggests MongoDB and email are unnecessary for testing. This code uses MongoDB for authentication, balances, and persisted generations. Real email can be replaced only by the clearly identified local test mailbox.
- Around 5:13, generation fails before and after funding the provider account. A failure alone does not establish its cause. Check the real error and provider estimate before changing pricing or retrying paid work.
- Around 6:14, Stripe keys are described as the remaining billing step. This application also needs products, price IDs, webhook verification, and payment lifecycle tests.
- Around 7:10, the presenter notices image pricing may be too low. Keep the server estimate and pricing guard. Markup and gross margin are different. Buying for $1 and selling for $1.50 produces a 33.3% gross margin before other costs, not a 50% gross margin.
- Around 7:29 and 9:04, the presenter recommends a distinctive niche and original branding. KabOozi-MotiOn is the selected project identity. Its customer niche and final commercial policies remain product decisions.
- Around 9:38, the presenter mentions a resource link, but the pasted transcript does not include it. This setup uses the repository Mista Boo supplied.
- Video claims about valuation, market size, API discounts, one-shot completeness, and profitability are not setup requirements or verified business facts.

The repository's public-template licensing and provider-use terms still require review before a commercial launch. Local setup is not launch approval.

## Tracking

- Current setup: [BOOZI-51](https://linear.app/aigeekhub-development-portal/issue/BOOZI-51/run-kaboozi-motion-locally-with-infisical).
- Future Infisical skill: [BOOZI-50](https://linear.app/aigeekhub-development-portal/issue/BOOZI-50/create-a-reusable-infisical-setup-skill). No installed `/infisical` or `/infiscal` skill was found. Creating it is future work.

## Local verification contracts

The mock estimate uses the checked-in pricing rules and request settings. It does not establish real provider pricing or account availability. The price guard stays enabled. Browser traces are disabled because authentication requests contain sign-in tokens and may contain the E2E secret header.

Browser fixtures reject real provider credentials and remote API origins. Next.js development request and Server Function argument logging are disabled to avoid recording authentication URLs or submitted data. See the [official logging options](https://nextjs.org/docs/app/api-reference/config/next-config-js/logging).

## Production dependency verification

The setup updates Next.js and its matching ESLint configuration to 16.3.8, sharp to 0.35.5, and source-map-js to 1.2.2. The scaffolding CLI is a development dependency. `pnpm audit --prod --audit-level=high` reports no known production vulnerabilities in this resolved tree. This is a dependency scan, not a full application security audit.

The Next.js updates address the published [ImageResponse advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) and [image optimization advisory](https://github.com/advisories/GHSA-cjq9-62q9-8jv4). Runtime packages were checked against the installed registry metadata.

Support email, the public domain, commercial policies, and complete replacement of inherited Vireo legal and sender defaults remain launch decisions. The local brand setting does not establish those values.

## Dialog readiness

Verification reproduced an early-click defect with client scripts disabled. The server-rendered New project trigger was enabled before its handler could run. Shared dialog triggers now reuse the existing readiness hook and remain disabled until hydration. This follows the [Playwright hydration guidance](https://playwright.dev/docs/navigations#hydration). The browser regression checks the server-rendered state and normal authenticated access checks exercise the enabled behavior.

## Official Seedance 2.5 SDK example

Official references were read before implementation: [SDK](https://docs.higgsfield.ai/docs/how-to/sdk) and [model](https://console.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference). The installed TypeScript client is @higgsfield/client 0.2.6. Node provides the optional local env-file loader, so no dotenv dependency is needed.

```powershell
pnpm generate:seedance:secure
# Alternative only when a credential was entered locally into ignored .env.local:
pnpm generate:seedance
```

Each invocation is billable. The example calls subscribe for bytedance/seedance-2.5/text-to-video with the exact requested sunset prompt, 5 seconds, 720p, and 16:9. It polls for completion, emits only a validated video URL on success, and exits nonzero on failure or unconfirmed completion. It suppresses raw SDK errors and disables submission retries. The SDK currently polls failed and moderated terminal states; an externally canceled request may instead reach its polling timeout. Neither is reported as success. Check the provider dashboard before rerunning an uncertain request. No real credential is copied out of Infisical into the local template.

## Current live test result

The requested single official SDK submission was executed on 2026-10-21 and rejected with HTTP 403. No completed video or video URL was returned. A separate non-generating estimate request returned HTTP 200, and a nonexistent request-status lookup returned 404. The signed-in Higgsfield billing page showed a $0.00 API balance and no payment method. After Mista Boo confirmed funding on 2026-10-21, one explicitly authorized rerun of pnpm generate:seedance:secure completed successfully (exit 0), returning a validated HTTPS video URL. A HEAD request to the generated artifact returned HTTP 200, Content-Type video/mp4, and Content-Length 4294129. The exact requested sunset prompt, 5-second duration, 720p resolution, and 16:9 aspect ratio were submitted through the official SDK. Credentials remained privately injected from Infisical. The local studio provider configuration remains mock; this verifies the standalone live SDK example.

The secure browser-test wrapper refuses remote provider and app origins, substitutes only the dummy provider credential within the test child process, and leaves Infisical unchanged. The generator is client-only, so its picker is absent with JavaScript disabled; the project dialog is server-rendered and its trigger must be disabled before hydration. Normal browser tests verify both become usable.

## Verified final SDK dependencies

The official SDK dependency tree includes follow-redirects 1.16.1. Final type checking, lint, and all 474 unit checks passed (100 catalog cases remain skipped). The production dependency audit reports no known vulnerabilities. The final production build passed with a clean client-bundle secret scan. These checks do not establish live generation success.

The final secure mock browser suite passed all 37 checks, covering authentication, account isolation, dialog readiness, generation, refunds, cancellation, video playback after refresh, page errors, and mobile layouts. The local studio remains available at http://127.0.0.1:3000. This suite made no live provider generation requests.

## Live budget model verification, 2026-10-21

MuAPI budget models take priority when its key is configured. Without that key, MiniMax H3 through Higgsfield remains the available fallback. All Seedance 2.5 entries are disabled in live pricing policy and rejected by the server before charging credits or contacting the generation endpoint. Existing installed models remain available under their real names. Separate H3 Max, Seedance Lite/Fast, and Wan 2.5 routes could not be verified in the current official Higgsfield catalog.

Non-generating authenticated estimates through the configured server client returned $0.553 for MiniMax H3 at 5 seconds and 2K, and $0.425 for Wan 2.6 at 5 seconds and 720p. Standard Seedance 2.0 returned a token-pricing description, not a numeric quote. These are account-specific estimates, not final charges or studio-credit prices.

```powershell
infisical run --env=dev --path=/ -- node --conditions=react-server --import tsx scripts/check-live-provider.ts
```

Typecheck, lint, and 475 unit checks passed, with 100 catalog cases skipped. All 37 browser fixture checks passed against the mock before cutover. A sign-up readiness failure found during that run was fixed with the existing hydration hook. The fixture runner intentionally refuses the live provider configuration. Do not point fixture generation tests at the live studio. Live routing was verified with configuration checks and estimate requests; no new paid end-to-end studio render was attempted.

Official model references: https://open.higgsfield.ai/models/minimax/h3/text-to-video/api-reference and https://open.higgsfield.ai/models/wan/v2.6/text-to-video/api-reference.

The live browser check confirmed the LIVE API notice, MiniMax H3 selected, and no search results for Seedance 2.5. Video models no longer have expensive featured cards pinned above the preferred family list. Root AGENTS.md owns these catalog and provider contracts; the existing child instruction files were left unchanged because their scopes did not change.
The final live-configured production build and client-bundle secret scan passed after the picker change. The remaining named model variants are tracked in BOOZI-56.

## Connect MuAPI budget models

See [MuAPI integration reference](muapi.md) for the verified routes, current estimates, and limitations. Store MUAPI_API_KEY directly in the linked Infisical Development folder /. Restart pnpm dev:local after changing vault configuration. No plaintext env file is needed.

Live generation now requires a dollar confirmation. GENERATION_MAX_USD defaults to 0.50. Models or settings above the cap are rejected before debit. The initial MuAPI connection is text-to-video only. Key presence, account access, and a successful paid render are separate verification steps.

Use pnpm test:e2e:fixtures for an isolated temporary database and local dummy providers. The older secure browser wrapper still requires the configured Higgsfield origin to be a local mock. Neither command authorizes paid verification.

## Current Sume runtime, 2026-10-23

This section supersedes the earlier provider preference and mock-mode descriptions. New live requests default to Sume with SUME_API_KEY injected from the linked Infisical dev:/ folder. Run pnpm dev:local and open http://localhost:3000. Default video is Seedance 2 Mini at 480p for five seconds. Image defaults to GPT Image 2, low quality, one image. A signed dollar approval and $0.50 estimate cap apply before submission. No paid Sume output has been verified. See [sume.md](sume.md) for installed modes and limitations.

## Final Sume setup verification, November 10, 2026

The patched build, browser-bundle secret scan, 615 unit checks and all 41 browser fixtures passed. The Infisical launcher starts the live studio at http://127.0.0.1:3000 with Sume defaults verified in Chrome. No paid Sume generation has been tested. See sume.md for quotes, remaining feature limits and the low-severity dependency follow-up.
