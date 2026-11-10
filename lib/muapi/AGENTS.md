# MuAPI provider

## Purpose
Own the server-only MuAPI client for the studio's verified text-to-video models.

## Ownership
- client.ts owns estimate, submit, status normalization, and unsupported cancellation.
- Root owns catalog mapping, quote approval, credit accounting, and reconciliation.

## Local Contracts
- Read the root AGENTS.md and docs/muapi.md before changes.
- Consume MUAPI_API_KEY through Infisical runtime injection. Never expose request headers or raw provider errors.
- Use the official HTTPS API origin. Local HTTP origins are fixtures only and are rejected in production.
- Submit once. Network errors, HTTP 408/5xx, malformed success responses, and accepted jobs whose database update fails are uncertain outcomes.
- Never retry or switch providers automatically after an uncertain submission.
- Poll confirmed request IDs. Do not invent cancellation or webhook authentication contracts.
- Keep provider cost/refund records separate from studio credits.

## Work Guidance
- Verify model schemas and endpoint_url through the official model API before changing mappings.

## Verification
- pnpm exec vitest run tests/muapi.test.ts tests/muapi-lifecycle.test.ts
- pnpm test:e2e:fixtures e2e/muapi.spec.ts --project=desktop uses dummy credentials and loopback providers.

## Child DOX Index
- No child instruction files.
