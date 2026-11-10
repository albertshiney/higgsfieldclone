# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront. Domain-modeling work creates them lazily when terms or decisions actually get resolved.

## File structure

This is a single-context repository:

- `CONTEXT.md`
- `docs/adr/`

## Use the glossary's vocabulary

When an output names a domain concept, use the term as defined in `CONTEXT.md`. If the concept is not defined there, note the vocabulary gap instead of silently inventing terminology.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
