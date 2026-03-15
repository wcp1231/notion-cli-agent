# notion-cli-agent Skills

Agent skills for notion-cli-agent, following the [AgentSkills](https://agentskills.dev) progressive disclosure spec.

## What are Skills?

Skills are self-contained knowledge packages for AI agents. Each skill is a directory with a `SKILL.md` (the core instructions) and optional `references/` files that agents load on demand. This keeps the agent's context window lean — only load what's needed, when it's needed.

```
skills/
├── notion-onboarding/       # Run first — discovers your workspace
│   ├── SKILL.md
│   └── references/
│       └── state-schema.md
│
└── notion-cli-agent/        # Core CLI skill — used for all Notion tasks
    ├── SKILL.md
    └── references/
        ├── filters.md           # All property types × operators
        ├── batch-patterns.md    # Multi-op patterns for minimal tool calls
        └── workflows.md         # Common agent workflow recipes
```

## Skill loading design

| Level | Content | Loaded |
|-------|---------|--------|
| `name` + `description` | Trigger metadata | Always in context |
| `SKILL.md` body | Core workflow + commands | When skill triggers |
| `references/*.md` | Deep reference material | On demand as needed |

This means the main SKILL.md stays small (~100 lines), and agents only pull in filters/workflows/batch docs when those topics arise.

## Skills

### `notion-onboarding` — Run first

Maps your Notion workspace (home page, projects DB, tasks DB, goals/OKRs, etc.) and saves the result to `~/.config/notion/workspace.json`. All other skills read from this state file so you never have to look up database IDs manually.

**When to use:** First-time setup, or when your workspace structure changes.

### `notion-cli-agent` — Core CLI skill

Full reference for using the notion-cli-agent CLI. Covers discovery, querying, writing, batch operations, and output modes optimized for agents (`--llm` flag).

**When to use:** Any time you need to interact with Notion.

## Installation

### OpenClaw

Copy or symlink the skill folder into your OpenClaw skills directory:

```bash
# Copy
cp -r skills/notion-cli-agent ~/.local/share/openclaw/skills/
cp -r skills/notion-onboarding ~/.local/share/openclaw/skills/

# Or symlink (picks up updates automatically)
ln -s $(pwd)/skills/notion-cli-agent ~/.local/share/openclaw/skills/
ln -s $(pwd)/skills/notion-onboarding ~/.local/share/openclaw/skills/
```

### Claude Code / Cursor / other agents

Add the skill path to your agent's context or system prompt. The `SKILL.md` files are self-contained — paste content directly or reference the file path.

### Manual use

```bash
# Read the core skill
cat skills/notion-cli-agent/SKILL.md

# Read a reference file when needed
cat skills/notion-cli-agent/references/filters.md
```

## Recommended first-run

1. Install the CLI: `npm install -g notion-cli-agent`
2. Set token: `echo "ntn_..." > ~/.config/notion/api_key` (or `export NOTION_TOKEN="ntn_..."`)
3. Run onboarding: tell your agent to use the `notion-onboarding` skill
4. Start working: all subsequent Notion tasks use the mapped database IDs automatically
