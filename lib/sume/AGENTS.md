# Sume adapter

## Purpose
Server-only integration with https://api.sume.com.

## Ownership
Own client.ts and Sume protocol validation. Root owns catalog, routing and lifecycle.

## Local Contracts
- Inject SUME_API_KEY from Infisical at runtime. Never log response bodies, credentials or signed URLs.
- Free quotes use POST /v1/open/estimate. Reject unverified currency, model or clamped settings.
- Paid creation requires a stable idempotency key, a signed fresh quote and the root spend cap.
- Do not retry uncertain submissions, switch providers, or infer a terminal state from time elapsed.
- Poll canonical job paths. Never follow response URLs with credentials.

## Verification
- tests/sume.test.ts verifies protocol fixtures. No paid request belongs in automated verification.

## Child DOX Index
- None.
