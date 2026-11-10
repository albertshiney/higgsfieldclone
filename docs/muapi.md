# MuAPI integration reference

MuAPI supplies six text-to-video models. Higgsfield continues to supply the existing catalog and upload flows. The studio stores the provider on each new generation before it submits. Older generations without a provider remain Higgsfield jobs. The legacy hfRequestId database field holds either provider's request ID.

## Configuration

Infisical source: https://app.infisical.com, project KabOozi-MotiOn, environment dev, folder /. Store MUAPI_API_KEY there. Enter the value locally through Infisical, never through chat or a repository file. The official key page is https://muapi.ai/access-keys.

MUAPI_API_BASE_URL defaults to https://api.muapi.ai/api/v1. Authentication uses the server-only x-api-key header. Redirects are refused. The key was absent at the last presence-only check on October 23, 2026. Account access and real generation remain unverified.

GENERATION_MAX_USD defaults to 0.50. Zero stops requests with a positive estimate. This is a per-request estimate limit, not a daily wallet limit.

## Catalog and public estimates

Public estimates checked October 23, 2026 for five seconds and 16:9:

| Picker model | Endpoint | Default resolution | Public estimate USD |
| --- | --- | --- | --- |
| MiniMax H3 Max Turbo | minimax-h3-max-turbo-text-to-video | 480p | 0.163 |
| MiniMax H3 Max | minimax-h3-max-text-to-video | 480p | 0.325 |
| Seedance 2.0 Mini | seedance-2-mini-text-to-video | 480p | 0.400 |
| Seedance 2.0 Fast | seedance-2-text-to-video-fast | Provider-defined | 0.750 |
| Wan 2.5 Fast | wan2.5-text-to-video-fast | 720p | 0.440 |
| Wan 2.6 via MuAPI | wan2.6-text-to-video | 720p | 0.650 |

These are public quotes, not account-verified charges. Each live request gets a fresh estimate. Seedance Fast and Wan 2.6 exceed the initial cap at these settings and are rejected before debit. Seedance Mini is the documented model name; it is not an alias for an unverified Lite variant. Fast has no resolution field in its verified schema. MuAPI image, image-to-video, video editing, and audio are outside this implementation.

## Approval and accounting

The quote action authenticates the caller, validates owned media and catalog settings, and estimates the canonical server request without submitting. A signed approval expires after two minutes and binds the user, submission key, provider, request body, dollar ceiling, and studio-credit ceiling.

The browser shows estimated provider dollars and studio credits before submission. Dismissing confirmation performs no debit or generation. The server re-estimates before debit and rejects changed requests, expired approval, price increases, or cap violations. An existing submission key returns its existing generation. Studio credits follow the existing markup and ledger; they are separate from the provider wallet.

The provider API has no verified atomic maximum-charge parameter. The studio blocks estimates above the approved amount, but cannot guarantee the provider's eventual bill equals its estimate. Actual cost and provider refund flags are recorded separately.

## Results and uncertain outcomes

Submit uses POST /{endpoint_url}. Polling uses GET /predictions/{request_id}/result. Completed media is copied through the existing owned-storage flow. Confirmed failed, canceled, or moderated jobs use the existing idempotent studio-credit refund policy. A studio refund does not establish that MuAPI refunded its wallet charge.

MuAPI cancellation and webhook signature verification are not established. The UI hides MuAPI cancellation and the server rejects it. The reconciler polls slow MuAPI requests instead of claiming a local timeout canceled them. Uncertain submissions without an ID hold their credits and concurrency slot for operator review. Check provider history before a manual resolution. Never retry the submission blindly.

Public commercial launch rights remain unresolved: the broad terms restrict competing services while white-label materials advertise branded studios. Local technical integration does not establish commercial permission.

## Verification

Run the normal typecheck, lint, unit tests, and secure build. The following command creates a temporary MongoDB replica set and loopback provider servers, starts an isolated studio on port 3001, and runs browser tests with dummy credentials. It does not inherit provider, email, payment, or storage secrets.

    pnpm test:e2e:fixtures

The fixture launcher closes its own processes and temporary database afterward. No paid render is part of verification.

## Official sources

- https://muapi.ai/docs/introduction
- https://muapi.ai/docs/authentication
- https://muapi.ai/docs/api-reference
- https://muapi.ai/docs/pricing
- https://muapi.ai/docs/webhooks
- https://muapi.ai/docs/models
- https://muapi.ai/docs/file-upload
- https://muapi.ai/docs/credits
- https://api.muapi.ai/api/v1/models
- https://api.muapi.ai/api/v1/models/{model-name}
- https://api.muapi.ai/openapi.json

The non-generating account and estimate check is pnpm providers:muapi:check. It reports account verification status without printing credentials or wallet contents, then obtains public quotes for the six configured model defaults. Missing credentials or failed checks return a nonzero exit code.
