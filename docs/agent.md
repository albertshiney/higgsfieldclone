# Director agent layer

Status: design approved by Mista Boo on November 10, 2026. Not implemented.
Decisions: brain = in-app planner first, Claude over MCP second. Spend approval = per wave.

## Purpose

Director turns a plain-language brief into a priced plan of image and video
generations, then runs the plan one approved wave at a time through the
existing submission pipeline. It is the first piece of a Higgsfield
Supercomputer equivalent for KabOozi-MotiOn.

Director plans and quotes. It never spends. Every paid request still passes
through `quoteGeneration` and `submitGeneration` in `lib/generations/submit.ts`
with a signed, request-bound approval.

## Scope

In v1:

- A `/agent` studio page with a chat thread and a plan card.
- A server-only planner that calls one OpenAI-compatible chat endpoint.
- Plans limited to catalog models that can create new live jobs today.
- Per-wave quote, approval and submission.
- Outputs grouped in one Project per plan.
- Memory: one brand brief per user plus thread and plan history.

Not in v1 (parking lot):

- Stitching clips into a finished video. v1 delivers stills and clips.
- Connectors, scheduled tasks, skills, marketplace.
- Whole-plan budget approval. This would change the approval rules.
- Audio, and any model not installed in the catalog.
- Autonomous spend of any kind.

## Flow

1. Brief. The user sends a message in a thread.
2. Plan. The planner returns JSON. The server validates it (see Plan format).
   An invalid plan is rejected and never shown as runnable.
3. Waves. Steps are sorted into waves by dependency. Wave 1 has no dependencies.
4. Quote. When the user opens a wave for approval, the server prices every step
   in that wave with `quoteGeneration`. The plan card shows dollars and credits
   per step and for the wave.
5. Approve. The user confirms the wave total. The client submits each step with
   its fresh approval token through `submitGenerationAction`.
6. Wait. The browser polls `GET /api/generations/status` as it does today.
7. Next wave. A dependent step is built only after its parent has a completed
   output in owned storage. It is quoted then, not earlier.
8. Deliver. All generations of the plan carry the plan's `projectId`.

A failed, moderated or canceled step blocks only the steps that depend on it.
Director never resubmits a step on its own. The user may ask for a revised plan.

## Plan format

`lib/agent/plan-schema.ts` owns a zod schema with this shape:

```ts
type Plan = {
  title: string            // max 80 chars
  summary: string          // max 400 chars
  steps: PlanStep[]        // 1 to AGENT_MAX_STEPS
}
type PlanStep = {
  id: string               // "s1", "s2", unique in the plan
  modelId: string          // must be a live catalog id
  prompt: string           // within the model's maxPromptLength
  settings: Record<string, unknown>   // validated by the catalog parser
  inputs: { role: MediaRole; fromStep: string }[]  // outputs of earlier steps
  rationale: string        // one sentence, shown to the user
}
```

Server validation, in order:

1. The schema parses.
2. Every `modelId` resolves to a model that may create new live jobs under the
   Sume-first policy and the live pricing rules.
3. Settings pass the catalog parser for that model. No clamping: a setting the
   model does not accept rejects the plan.
4. Every `fromStep` names an earlier step, the graph has no cycle, and each
   role is accepted by the target model.
5. Step count is within `AGENT_MAX_STEPS`.

The planner output is untrusted input. Request paths and bodies still come only
from the catalog `toPlatform`.

## Money rules

- `GENERATION_MAX_USD` still caps every single request (default 0.50).
- `AGENT_PLAN_MAX_USD` caps the sum of approved quotes in one plan (default
  2.00). The server tracks the approved total on the plan and refuses a wave
  that would exceed it.
- Each step gets one `submitKey` (uuid) stored on the plan before it is first
  quoted. Reusing it keeps submission idempotent.
- Approval tokens expire after 120 seconds, so quotes are taken when the user
  opens the approval dialog, not when the plan is created.
- No automatic retry, no provider fallback, no approval on the user's behalf.
- Credits change only through `lib/billing/ledger.ts`. The agent module never
  imports the ledger or a provider client.

## Planner

`lib/agent/planner.ts` is server-only. It sends one chat completion request to
`AGENT_LLM_BASE_URL` + `/chat/completions` with model `AGENT_LLM_MODEL`.

- The system prompt contains the plan format, the money limits, and the model
  brief from `lib/agent/catalog-brief.ts` (id, surface, accepted roles,
  settings and their allowed values for each live model).
- It receives the thread messages and the user's brand brief. It never receives
  credentials, email addresses, ledger data or signed URLs.
- It asks for JSON only. The reply is parsed and validated. One repair request
  is allowed when validation fails. A second failure returns a user-facing error.
- LLM calls are not generations and cost no credits in v1.
- When any of the three planner variables is unset, the Agent nav link and the
  `/agent` page are hidden and the actions return a clear error.

No model is hard-coded. The owner chooses a provider and model in Infisical.

## Environment

Add to `lib/env.ts` and `.env.example` (names only, values in Infisical):

| Variable | Default | Rule |
|---|---|---|
| `AGENT_LLM_BASE_URL` | unset | HTTPS, or loopback HTTP outside production |
| `AGENT_LLM_API_KEY` | unset | Server only |
| `AGENT_LLM_MODEL` | unset | Passed through unchanged |
| `AGENT_PLAN_MAX_USD` | 2 | Finite, zero or more. Zero blocks agent spend |
| `AGENT_MAX_STEPS` | 8 | Integer, 1 to 20 |

## Data

Add to `lib/db/collections.ts` and `lib/db/indexes.ts`. All queries are scoped
by `userId`; another user's id is a 404.

- `agentThreads`: `_id`, `userId`, `title`, `messages[]` (role, text,
  createdAt, optional planId), `createdAt`, `updatedAt`.
- `agentPlans`: `_id`, `userId`, `threadId`, `projectId`, `plan` (validated),
  `steps[]` runtime state (stepId, submitKey, generationId, status),
  `approvedUsd`, `createdAt`, `updatedAt`.
- `agentMemory`: `_id`, `userId` (unique), `brandBrief` (max 4,000 chars),
  `updatedAt`.

## Files

| Path | Purpose |
|---|---|
| `lib/agent/plan-schema.ts` | Plan schema and wave sorting |
| `lib/agent/catalog-brief.ts` | Live model brief for the planner |
| `lib/agent/planner.ts` | Server-only LLM call and repair |
| `lib/agent/run.ts` | Build a step's `SubmitInput`, quote a wave, record results |
| `lib/agent/store.ts` | Thread, plan and memory persistence |
| `lib/agent/AGENTS.md` | Child DOX for this module |
| `app/actions/agent.ts` | Server actions, each calling `requireUser` |
| `app/(studio)/agent/page.tsx` | Page |
| `components/agent/*` | Chat, plan card, wave approval dialog |
| `components/site/nav-links.ts` | Agent link when the planner is configured |
| `tests/agent-plan.test.ts`, `tests/agent-run.test.ts` | Unit tests |
| `e2e/agent.spec.ts` | Browser fixture with a loopback LLM |

## Phase 2: Claude as the brain

A small MCP server exposes read and plan tools (list live models, create a plan
from supplied JSON, read plan status). It reuses the same validation. It does
not expose quote approval or submission: approval stays in the studio UI.
Authentication for MCP clients is undecided and must be designed before work
starts.

## Verification

- Unit: schema accept and reject cases, cycle detection, wave order, plan cap,
  per-request cap, idempotent `submitKey`, user scoping.
- Browser fixture: loopback LLM returns a two-wave plan; approve wave 1; wave 2
  is quoted only after wave 1 completes; a rejected setting never reaches the
  provider fixture.
- No paid request in automated verification. A live Director run needs the
  displayed dollar cost and explicit approval, and must wait until one manual
  paid Sume render has succeeded end to end.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass.
