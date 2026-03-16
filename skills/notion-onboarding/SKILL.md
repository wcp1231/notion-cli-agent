---
name: notion-onboarding
description: >
  Discover and map a user's Notion workspace for the first time.
  Run this before any Notion workflows when no workspace state exists.
  Identifies key data sources (projects, tasks, OKRs, home page, etc.)
  through guided discovery and saves them to a persistent state file
  so future interactions don't need to re-discover. Use when: first
  Notion setup, user says "set up Notion", "map my workspace",
  "onboard Notion", or when ~/.config/notion/workspace.json is missing.
---

# Notion Workspace Onboarding

Maps the user's Notion workspace and saves a state file that all future Notion skills read.

**State file:** `~/.config/notion/workspace.json`

## Step 0 — Check existing state

```bash
cat ~/.config/notion/workspace.json 2>/dev/null
```

If it exists: show the current mapping, ask the user if they want to update it or continue. If absent: proceed with full onboarding.

## Step 1 — Verify auth & get user

```bash
notion user me
```

Confirm the integration is working. Note the workspace name.

## Step 2 — Discover all accessible data sources and pages

```bash
notion inspect ws --compact
notion inspect ws --json
```

This lists all databases (with their data sources) and top-level pages the integration can see. Present the list clearly to the user (name + ID).

## Step 3 — Guided identification

Ask the user to identify which data sources correspond to each role. Be conversational — not all workspaces have all of these:

```
I found these data sources in your workspace:
[list from step 2]

Can you tell me:
1. Which one is your main Tasks / To-do data source? (where day-to-day work lives)
2. Which one is your Projects data source? (higher-level work containers)
3. Do you have a Goals, OKRs, or Objectives data source?
4. Is there a main Home or Dashboard page (not a data source) I should know about?
5. Any other data sources that are central to how you work? (e.g., CRM, Notes, Areas)
```

## Step 4 — Inspect each identified data source

For each confirmed data source, run:

```bash
notion inspect context <id>
notion inspect schema <id> --llm
```

Extract from the output:
- The exact `titleProp` name (the property of type `title`)
- The `statusProp` name and valid status values (if any)
- Key properties used for filtering (priority, assignee, due date, etc.)

## Step 5 — Build and save the state file

Write `~/.config/notion/workspace.json` following the schema in `references/state-schema.md`.

```bash
mkdir -p ~/.config/notion
# write the JSON file
```

Example minimal state:
```json
{
  "version": 2,
  "onboardedAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD",
  "workspace": { "name": "Acme" },
  "dataSources": {
    "tasks": {
      "id": "abc-123",
      "databaseId": "def-456",
      "title": "Tasks",
      "titleProp": "Name",
      "statusProp": "Status",
      "statuses": ["Todo", "In Progress", "Done"]
    }
  }
}
```

## Step 6 — Confirm with user

Show a human-readable summary of what was saved. Ask: "Does this look right? Anything to adjust?"

Apply any corrections, save the final file.

## After onboarding

Tell the user: "Your workspace is now mapped. Any Notion task I do will use these data sources by default — no need to look up IDs. Run this onboarding again anytime to update."

For full state schema see: `references/state-schema.md`
