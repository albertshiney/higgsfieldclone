# Engineering Skill Configuration

## Purpose

This folder contains the repository-specific configuration consumed by the shared engineering skills.

## Ownership

- `issue-tracker.md` defines how work is tracked in Linear and linked to GitHub code work.
- `triage-labels.md` defines the canonical triage vocabulary.
- `domain.md` defines how agents consume domain context and ADRs.
- repository-automation.md defines local and GitHub provisioning behavior.

## Local Contracts

- Keep the tracker, label, and domain guidance consistent with the root `AGENTS.md`.
- Keep Linear as the source of truth for work items; do not create duplicate GitHub Issues for the same work.
- Keep historical completed-work backfill separate from active tasks with the workspace-level `historical-backfill` label and one shared Linear custom view named `Historical Work`. This label is not part of the canonical triage set.
- Update these files when the shared development workflow changes.

## Work Guidance

- Read the relevant configuration before using the engineering skills in this repository.
- Keep repo-specific details here; keep cross-repo workflow rules in the shared user-level contract.

## Verification

- Confirm the four configuration files exist and agree with the root AGENTS.md Agent skills block.

## Child DOX Index

- None.
