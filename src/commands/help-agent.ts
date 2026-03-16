/**
 * Help for AI agents - comprehensive quick reference
 */
import { Command } from 'commander';

export function registerHelpAgentCommand(program: Command): void {
  program
    .command('quickstart')
    .alias('qs')
    .description('Quick reference guide for AI agents')
    .action(() => {
      console.log(`
# notion-cli-agent Quick Reference for AI Agents

## Setup (choose one)
1. Config file (recommended): echo "ntn_xxx" > ~/.config/notion/api_key
2. Environment variable: export NOTION_TOKEN="ntn_xxx"
3. Inline: notion --token "ntn_xxx" <command>

## Most Common Operations

### 1. Discover workspace structure
\`\`\`bash
notion inspect ws --compact          # List all databases and top-level pages
notion inspect ws --json             # Full raw inventory
notion inspect schema <id> --llm    # Get data source schema with valid values
notion inspect context <id>         # Full context for working with a data source
\`\`\`

### 2. Search and query
\`\`\`bash
notion search "keyword"              # Search pages and data sources
notion ds query <id> --limit 10      # Query data source entries
notion ds query <id> --limit 10 --json
notion ds list <db_id>               # List all data sources in a database
notion find "overdue tasks" -d <id>  # Smart natural language query
\`\`\`

### 3. Create entries
\`\`\`bash
notion page create --parent <id> --title "New Entry"
notion page create --parent <id> --title "Task" --prop "Status=Todo" --prop "Priority=High"
\`\`\`

### 4. Update entries
\`\`\`bash
notion page update <page_id> --prop "Status=Done"
notion bulk update <ds_id> --where "Status=Todo" --set "Status=In Progress" --yes
\`\`\`

### 5. Read page content
\`\`\`bash
notion page get <page_id>            # Get page properties
notion page get <page_id> --content  # Include content blocks
notion page get <page_id> --json     # Raw JSON
notion ai summarize <page_id>        # Get concise summary
\`\`\`

### 6. Add content to pages
\`\`\`bash
notion block append <page_id> --text "Hello world"
notion block append <page_id> --heading2 "Section" --bullet "Item 1" --bullet "Item 2"
notion block append <page_id> --todo "Task to do"
\`\`\`

## Property Types for Filters

When filtering, specify --filter-prop-type for non-text properties:
- status: --filter-prop-type status
- select: --filter-prop-type select
- number: --filter-prop-type number
- date: --filter-prop-type date
- checkbox: --filter-prop-type checkbox

Example:
\`\`\`bash
notion ds query <id> --filter-prop "Status" --filter-type equals --filter-value "Done" --filter-prop-type status
\`\`\`

## AI-Specific Commands

\`\`\`bash
notion ai prompt <id>                # Generate optimal prompt for this data source
notion ai summarize <page_id>        # Summarize page content
notion ai extract <page_id> --schema "email,phone,date"  # Extract structured data
notion ai suggest <id> "what I want to do"  # Get command suggestions
\`\`\`

## Batch Operations (reduce tool calls)

\`\`\`bash
notion batch --llm --data '[
  {"op":"get","type":"page","id":"xxx"},
  {"op":"create","type":"page","parent":"<ds_id>","data":{...}},
  {"op":"query","type":"data_source","id":"<ds_id>","data":{"limit":5}},
  {"op":"update","type":"page","id":"yyy","data":{...}}
]'
\`\`\`

## Output Formats

- Default: Human-readable
- --json or -j: Raw JSON (for parsing)
- --llm: Supported on selected commands such as find, batch, and inspect schema

## Tips for AI Agents

1. Always run \`notion inspect context <id>\` first to understand data source structure
2. Property names and values must match EXACTLY (case-sensitive)
3. Use --dry-run on bulk/batch operations before executing
4. Status properties use "status" type, not "select"
5. The title property name varies per data source (could be "Name", "Título", "Task", etc.)
6. Use \`notion ds list <db_id>\` to see all data sources in a database

## Get Help

\`\`\`bash
notion --help                # List all commands
notion <command> --help      # Help for specific command
notion ai prompt <id>        # Data source-specific instructions
\`\`\`
`);
    });
}
