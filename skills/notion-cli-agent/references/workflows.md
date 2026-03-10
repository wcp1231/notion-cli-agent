# Agent Workflow Recipes

Common Notion workflows for AI agents. Each recipe assumes workspace state exists at
`~/.config/notion/workspace.json` (run notion-onboarding skill first).

---

## Daily task triage

Review and organize today's tasks.

```bash
# 1. Load task DB from state
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')

# 2. What's overdue?
notion find "overdue" -d $TASKS --llm

# 3. What's due today or this week?
notion find "due this week" -d $TASKS --llm

# 4. What's unassigned?
notion db query $TASKS \
  --filter-prop "Assignee" --filter-type is_empty \
  --filter-prop-type people --llm

# 5. Mark done items
notion page update <page_id> --prop "Status=Done"
# or bulk:
notion bulk update $TASKS --where "Status=In Review" --set "Status=Done" --dry-run
```

---

## Weekly review

Summarize the week and prep for the next.

```bash
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')
PROJECTS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.projects.id')

# What was completed this week?
notion stats timeline $TASKS --days 7

# Health check — any stale items?
notion validate check $TASKS --check-stale 7

# Project status overview
notion db query $PROJECTS --filter-prop "Status" \
  --filter-type does_not_equal --filter-value "Completed" \
  --filter-prop-type status --llm
```

---

## Create a new project + first tasks

```bash
PROJECTS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.projects.id')
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')

# Create project
notion page create --parent $PROJECTS \
  --title "Project Name" \
  --prop "Status=In progress"

# Create first tasks in batch
notion batch --llm --data '[
  {"op":"create","type":"page","parent":"'$TASKS'","data":{"title":"Define scope","Status":"Todo","Priority":"High"}},
  {"op":"create","type":"page","parent":"'$TASKS'","data":{"title":"Set up repo","Status":"Todo","Priority":"High"}},
  {"op":"create","type":"page","parent":"'$TASKS'","data":{"title":"Write first draft","Status":"Todo","Priority":"Medium"}}
]'
```

---

## Summarize a database for a report

```bash
DB_ID="<db_id>"

# Stats overview
notion stats overview $DB_ID

# Get all in-progress items
notion db query $DB_ID \
  --filter-prop "Status" --filter-type equals \
  --filter-value "In Progress" --filter-prop-type status --llm

# Summarize key pages
notion ai summarize <page_id>
```

---

## Sync tasks from an external source (e.g., GitHub issues)

```bash
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')

# For each issue, create a task
notion page create --parent $TASKS \
  --title "[GH-42] Fix authentication bug" \
  --prop "Status=Todo" \
  --prop "Priority=High"

# Or batch-create multiple
notion batch --llm --data '[
  {"op":"create","type":"page","parent":"'$TASKS'","data":{"title":"[GH-42] Fix auth","Status":"Todo"}},
  {"op":"create","type":"page","parent":"'$TASKS'","data":{"title":"[GH-43] Update deps","Status":"Todo"}}
]'
```

---

## OKR/Goals check-in

```bash
GOALS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.goals.id // empty')

if [ -z "$GOALS" ]; then
  echo "No goals database in workspace state. Run notion-onboarding to add it."
  exit 1
fi

# List active goals
notion db query $GOALS \
  --filter-prop "Status" --filter-type does_not_equal \
  --filter-value "Done" --filter-prop-type status --llm

# Summarize a specific goal page
notion ai summarize <goal_page_id>

# Update progress
notion page update <goal_page_id> --prop "Status=On track"
```

---

## Bulk cleanup — archive completed old tasks

```bash
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')

# Preview first
notion bulk archive $TASKS --where "Status=Done" --dry-run

# Health check to find stale items
notion validate check $TASKS --check-stale 30 --check-dates

# Execute archive (requires explicit confirmation)
notion bulk archive $TASKS --where "Status=Done" --yes
```

---

## Export to Obsidian / backup

```bash
TASKS=$(cat ~/.config/notion/workspace.json | jq -r '.databases.tasks.id')

# Export to Obsidian vault
notion export db $TASKS --vault ~/obsidian-vault --folder notion-tasks --content

# Full JSON backup
notion backup $TASKS -o ./backups/tasks-$(date +%Y%m%d) --content
```

---

## Tips

- Always load `~/.config/notion/workspace.json` at the start of any workflow script
- Run `notion find "..." --explain` to see what filter was generated before committing
- Use `notion ai prompt <db_id>` to get a DB-specific prompt if you're unsure of the schema
- For multi-step workflows involving many pages, write intermediate results to a temp file rather than keeping them in memory across tool calls
