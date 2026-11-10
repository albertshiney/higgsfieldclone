# Issue tracker: Linear

Linear is the shared task tracker for this repository and the broader development workspace. Use Linear as the source of truth for work intake, triage, prioritization, specifications, status, and completion.

GitHub remains the source of truth for repository code, branches, pull requests, review, and merge history. Do not duplicate the same work item in GitHub Issues when it is already tracked in Linear.

## Conventions

- Create work: Create a Linear issue in the shared workspace and associate it with the Linear project for this repository.
- Track each accepted development request as a meaningful Linear issue. Search for an existing issue first. Do not create one issue per commit or duplicate a matching issue.
- Read work: Start with the Linear issue for the current requirement or bug.
- Implement work: Use a GitHub branch and pull request linked to the Linear issue.
- Complete work: Update the Linear issue with the outcome, verification evidence, and GitHub links. Mark it complete only when its agreed completion target is met.
- Keep context in one place: Put planning and status in Linear; put code discussion and review in GitHub.

## Brownfield history

When `/init` finds an existing repository, review its completed work separately from active tasks. Use merged pull requests, releases or tags, changelog entries, and Git history as evidence. Group related commits into meaningful outcomes, search Linear for duplicates, and backfill only outcomes with evidence that they were completed.

Mark imported issues with the workspace-level `historical-backfill` label. This is a tracking label, not one of the five canonical triage labels. Save one workspace-shared custom issue view named `Historical Work` and filter it by this label. The view then shows historical backfills across repository projects. Add a project filter only when you need to narrow the view. See [Linear custom views](https://linear.app/docs/custom-views) for view creation and sharing.

If the available Linear integration cannot create a saved view, open an issue list, filter by the `historical-backfill` label, save the list as a shared custom view named `Historical Work`, and verify that it appears in workspace views. Report the view as pending until this check passes.

Do not treat every commit as an issue. Exclude reverted work and changes without reliable completion evidence. Leave uncertain candidates out of the completed backfill until Mista Boo confirms their status.

## Cross-repository workflow

Use the same Linear workspace and lifecycle for every active development repository. Each repository may have its own Linear project, but all projects use the shared triage labels and the same Linear-first intake process.

## Repository project

Associate this repository's issues with its corresponding project in the shared Linear workspace.
