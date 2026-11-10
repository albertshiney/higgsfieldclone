# Triage Labels

The skills speak in terms of five canonical triage roles. These are the label strings used in Linear for this workspace.

| Label in mattpocock/skills | Label in our tracker | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a canonical triage role, use the corresponding Linear label.

## Historical tracking label

Use the workspace-level `historical-backfill` label only to mark completed work imported from repository history. It is not a triage label and does not replace any of the five canonical labels. Filter this label in the shared `Historical Work` view to keep backfilled work separate from active tasks across repository projects.
