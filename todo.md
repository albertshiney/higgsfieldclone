# MuAPI integration
- [x] Ground: trace catalog, server debit/submit, finalizer, cancellation, and UI generation.
- [x] Sketch: compare separate MuAPI pipeline with shared provider adapter; choose adapter to preserve one ledger and finalizer.
- [x] Agree: proceed under Mista Boo's instruction; sequential execution follows repository tool mapping.
- [ ] Implement: provider client and verified text-to-video models.
- [ ] Implement: signed request-bound quote, server cap, dollar confirmation.
- [ ] Verify: fixtures, negative authorization/price cases, build and runtime.
- [ ] Scrap: revisit design only if existing lifecycle cannot preserve provider identity.
- [x] Blocking first steps: schema/docs and Infisical presence checked. Real MuAPI key missing; continue fixtures.
- [x] Independent workstreams: n/a, sequential owner per repository instruction.
- [x] Shared mutable state: serialize environment updates and runtime restart; preserve old jobs as Higgsfield.
- [x] Smallest safe decomposition: one adapter plus existing ledger, no separate generation service.
## Design
GenerationDoc.provider is optional for old rows, defaulting to Higgsfield. New MuAPI jobs persist provider before submission. ProviderClient shares submit/status/cancel/estimate contracts.
Quote approval is HMAC-signed, expires, and binds user, submit key, canonical provider request, USD and credit ceiling. Re-estimate before debit; reject increases or cap violations.
MuAPI cancellation is unsupported until verified. Never force a MuAPI job terminal because local polling times out. No blind retries or automatic provider fallback.
Start with six verified text-to-video models. Existing Higgsfield image/reference flows remain intact.

# Sume runtime cutover
- [x] Ground: trace catalog, price approval, ledger, uploads and finalization.
- [x] Sketch: shared adapter versus separate pipeline. Choose shared adapter to preserve one ledger and job identity.
- [x] Agree: Mista Boo authorized implementation.
- [x] Blocking first steps: current-origin free estimate verified.
- [x] Independent workstreams: n/a, repository requires sequential execution.
- [x] Shared mutable state: serialize ledger and startup changes.
- [x] Smallest safe decomposition: typed provider discriminator and one adapter.
- [x] Implement Sume catalog, lifecycle, upload and server routing policy.
- [x] Verify fixtures, existing jobs, build, and non-generating live checks.
- [x] Scrap temporary artifacts and update owning documentation.

Architect alternatives reviewed sequentially per repository tool mapping. A separate pipeline duplicates ownership and debit logic; a shared adapter keeps these invariants in one place. No automatic provider fallback. Paid verification remains unauthorized.

## Resumed November 5, 2026
- [x] Recover command runner and verify saved files.
- [x] Typecheck, lint, 615 unit checks, production build and secret scan.
- [x] Refresh free Sume estimates without generation.
- [x] Complete all 41 browser fixtures.
- [x] Patch newly reported dependency advisories and rerun checks.
- [x] Start live studio after the fixture server exits.

## Final verification, November 10, 2026
Typecheck and lint passed. Patched build and client secret scan passed. 615 unit tests passed, 113 catalog cases skipped. All 41 browser fixtures passed. Live studio is running on 127.0.0.1:3000 with confirmed Sume image/video defaults. Free quotes were checked through the application adapter. No paid Sume output tested. Remaining low email dependency advisory is BOOZI-60. Audio and other uninstalled Sume tools remain future work, with no cross-provider fallback.
DOX reviewed. Root and lib/sume instructions updated; studio, MuAPI and tracker child docs remain unchanged because their ownership/contracts were not changed by this closeout.
