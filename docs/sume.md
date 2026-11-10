# Sume runtime

New live image/video requests use https://api.sume.com. SUME_API_KEY is injected from Infisical project KabOozi-MotiOn, dev, folder /. There is no plaintext credential file. Restart pnpm dev:local after vault changes.

## Installed models
- GPT Image 2 create/edit. Defaults low quality, 1K, one PNG.
- Seedance 2 Mini and Fast text/image-to-video. Defaults 480p, five seconds, audio enabled.
- MiniMax H3 Max text/image-to-video. Defaults 480p, five seconds.
- MiniMax H3 text/image-to-video. Defaults 768p, five seconds. Native audio is implicit.
- Veed video lip sync. Requires owned video and audio; video duration must be measured server-side, 2 to 60 seconds.

Other Sume tools and reference modes remain uninstalled. They must be mapped and tested before becoming available. WAN 2.5/2.6, Seedance Lite and H3 Max Turbo are not renamed or aliased. No alternative-provider coverage exceptions have been approved. Existing jobs continue through their original provider.

## Price and job safety
POST /v1/open/estimate was verified without generation on the current API origin. The CLI source documents the estimate contract at https://github.com/sumelabs/opensume-cli/blob/main/src/api/client.ts. The server passes the full mapped request, validates USD, exact model, duration and video resolution, and rejects unavailable or clamped estimates.

Every submission re-estimates and verifies a signed approval bound to user, submit key, request body, dollar ceiling and credits. The initial estimate cap is $0.50. The estimate is not a guaranteed provider invoice ceiling. Studio credits include the configured markup.

Stable Idempotency-Key values use the persisted submission intent. No automatic paid retry or cross-provider fallback. Unknown submissions remain pending for operator review; slow jobs keep polling. Confirmed failure, moderation or cancellation uses the existing once-only studio refund. This does not prove a provider-wallet refund.

The adapter polls canonical /v1/jobs/{id}/status and /result paths. Only final HTTPS artifacts are copied to owned storage. Upload tickets come from /v1/files/generate-upload-url. Sume cancellation and webhooks are not enabled. No webhook secret is needed for the polling implementation.

## Verification
Use pnpm providers:sume:check for free estimates only. On October 23, 2026 the actual application client returned $0.20 for Seedance 2 Mini, five seconds at 480p, and $0.006 for one low-quality GPT Image 2 image. Authenticated model catalogs were accessible. The scoped key rejects /v1/me and MCP access; neither route is needed for this adapter.

Fixture tests use dummy keys, loopback servers and a temporary database. Successful fixtures and estimates do not establish successful paid output. No paid Sume generation has been run. A live render still requires approval of its current displayed cost.

Official API contracts: https://www.sume.com/docs and https://api.sume.com/v1/openapi.json.

## Verification on November 10, 2026

The fresh default Seedance Mini quote is $0.1758 for five seconds at 480p, and GPT Image 2 is $0.006 for one low-quality image. These are free estimates, not paid render results. Typecheck and lint passed after the dependency update. All 615 unit tests passed, with 113 catalog cases skipped. The patched Next.js 16.4.1 production build and browser-bundle secret scan passed. The build tolerated the local MongoDB being offline; runtime startup initializes it separately.

The production dependency audit has no critical, high or moderate findings. One low-severity unpatched deepmerge issue in the email renderer remains tracked as BOOZI-60. All 41 browser fixtures passed. The studio started through Infisical at http://127.0.0.1:3000. Read-only Chrome checks returned HTTP 200 and showed Seedance 2 Mini on /video and GPT Image 2 on /image. No live generation was submitted.
