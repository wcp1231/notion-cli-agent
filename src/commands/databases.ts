/**
 * Data source commands - get, query, update data sources (and create databases)
 *
 * The primary entry point is `notion datasource` (alias: ds).
 * `notion database` (alias: db) is kept as a deprecated alias.
 *
 * Users can pass either a data_source ID or a database ID — the CLI
 * resolves database IDs to data_source IDs transparently.
 */
import { Command } from 'commander';
import { getClient } from '../client.js';
import { formatOutput, parseFilter } from '../utils/format.js';
import { getDbTitle, resolveDataSourceId, resolveAllDataSourceIds, getDatabaseWithDataSource } from '../utils/notion-helpers.js';
import type { DataSource } from '../types/notion.js';

function getItemTitle(item: { properties: Record<string, unknown> }): string {
  for (const prop of Object.values(item.properties)) {
    const typedProp = prop as { type: string; title?: Array<{ plain_text: string }> };
    if (typedProp.type === 'title' && typedProp.title) {
      return typedProp.title.map(t => t.plain_text).join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

export function registerDatabasesCommand(program: Command): void {
  const datasource = program
    .command('datasource')
    .alias('ds')
    .alias('database')
    .alias('db')
    .description('Manage data sources (accepts data_source ID or database ID)');

  // Get data source
  datasource
    .command('get <id>')
    .description('Retrieve a data source (or database) by ID')
    .option('-j, --json', 'Output raw JSON')
    .action(async (id: string, options) => {
      try {
        const client = getClient();
        const dsId = await resolveDataSourceId(client, id);
        const ds = await client.get(`data_sources/${dsId}`) as DataSource;

        // Try to get parent database title
        let dbTitle = '';
        if (ds.parent?.database_id) {
          try {
            const db = await client.get(`databases/${ds.parent.database_id}`) as { title?: { plain_text: string }[] };
            dbTitle = db.title?.map(t => t.plain_text).join('') || '';
          } catch { /* ignore */ }
        }

        if (options.json) {
          console.log(formatOutput(ds));
        } else {
          if (dbTitle) console.log('Database:', dbTitle);
          console.log('Data Source:', dsId);
          if (ds.parent?.database_id && ds.parent.database_id !== dsId) {
            console.log('Database ID:', ds.parent.database_id);
          }
          console.log('\nProperties:');
          for (const [name, prop] of Object.entries(ds.properties)) {
            console.log(`  - ${name}: ${prop.type}`);
          }
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  // Query data source
  datasource
    .command('query <id>')
    .description('Query a data source (or database)')
    .option('-f, --filter <json>', 'Filter as JSON string')
    .option('--filter-prop <property>', 'Property to filter on')
    .option('--filter-type <type>', 'Filter type: equals, contains, etc.')
    .option('--filter-value <value>', 'Filter value')
    .option('--filter-prop-type <propType>', 'Property type: select, status, text, number, date, checkbox')
    .option('-s, --sort <property>', 'Sort by property')
    .option('--sort-dir <direction>', 'Sort direction: asc, desc', 'desc')
    .option('-l, --limit <number>', 'Max results', '100')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('-j, --json', 'Output raw JSON')
    .action(async (id: string, options) => {
      try {
        const client = getClient();

        const body: Record<string, unknown> = {};

        if (options.filter) {
          body.filter = JSON.parse(options.filter);
        } else if (options.filterProp && options.filterType && options.filterValue) {
          body.filter = parseFilter(
            options.filterProp,
            options.filterType,
            options.filterValue,
            options.filterPropType
          );
        }

        if (options.sort) {
          body.sorts = [{
            property: options.sort,
            direction: options.sortDir === 'asc' ? 'ascending' : 'descending',
          }];
        }

        if (options.limit) body.page_size = parseInt(options.limit, 10);
        if (options.cursor) body.start_cursor = options.cursor;

        const dsIds = await resolveAllDataSourceIds(client, id);

        // Query all data sources and merge results
        const allResults: Array<{ id: string; properties: Record<string, unknown> }> = [];
        let lastHasMore = false;
        let lastCursor: string | null = null;

        for (const dsId of dsIds) {
          const result = await client.post(`data_sources/${dsId}/query`, body) as {
            results: Array<{ id: string; properties: Record<string, unknown> }>;
            has_more: boolean;
            next_cursor: string | null;
          };
          allResults.push(...result.results);
          lastHasMore = result.has_more;
          lastCursor = result.next_cursor;
        }

        if (options.json) {
          console.log(formatOutput({ results: allResults, has_more: lastHasMore, next_cursor: lastCursor }));
          return;
        }

        console.log(`Found ${allResults.length} items:\n`);

        for (const item of allResults) {
          const title = getItemTitle(item);
          console.log(`📄 ${title}`);
          console.log(`   ID: ${item.id}`);
        }

        if (lastHasMore) {
          console.log(`\nMore results available. Use --cursor ${lastCursor}`);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  // Create database (still uses the databases endpoint)
  datasource
    .command('create')
    .description('Create a new database')
    .requiredOption('--parent <page_id>', 'Parent page ID')
    .requiredOption('-t, --title <title>', 'Database title')
    .option('--inline', 'Create as inline database')
    .option('-p, --property <name:type...>', 'Add property (e.g., Status:select, Date:date)')
    .option('-j, --json', 'Output raw JSON')
    .action(async (options) => {
      try {
        const client = getClient();

        const properties: Record<string, { type?: string; title?: object; [key: string]: unknown }> = {
          Name: { title: {} },
        };

        if (options.property) {
          for (const prop of options.property) {
            const [name, type] = prop.split(':');
            if (name && type) {
              properties[name] = { [type]: {} };
            }
          }
        }

        const body: Record<string, unknown> = {
          parent: { page_id: options.parent },
          title: [{ type: 'text', text: { content: options.title } }],
          properties,
        };

        if (options.inline) {
          body.is_inline = true;
        }

        const result = await client.post('databases', body) as { id: string; url: string; data_sources?: { id: string }[] };

        if (options.json) {
          console.log(formatOutput(result));
        } else {
          console.log('✅ Database created');
          console.log('ID:', result.id);
          if (result.data_sources?.[0]) {
            console.log('Data Source:', result.data_sources[0].id);
          }
          console.log('URL:', result.url);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  // Update data source
  datasource
    .command('update <id>')
    .description('Update data source schema or database title')
    .option('-t, --title <title>', 'New database title')
    .option('--add-prop <name:type>', 'Add a property')
    .option('--remove-prop <name>', 'Remove a property')
    .option('-j, --json', 'Output raw JSON')
    .action(async (id: string, options) => {
      try {
        const client = getClient();

        // Title update goes to the parent database
        if (options.title) {
          // Try to find the database ID (id might be a data_source or database)
          let dbId = id;
          try {
            const ds = await client.get(`data_sources/${id}`) as DataSource;
            if (ds.parent?.database_id) dbId = ds.parent.database_id;
          } catch { /* id might already be a database ID */ }
          await client.patch(`databases/${dbId}`, {
            title: [{ type: 'text', text: { content: options.title } }],
          });
        }

        // Property changes go to the data source
        const properties: Record<string, unknown> = {};
        if (options.addProp) {
          const [name, type] = options.addProp.split(':');
          if (name && type) {
            properties[name] = { [type]: {} };
          }
        }
        if (options.removeProp) {
          properties[options.removeProp] = null;
        }

        if (Object.keys(properties).length > 0) {
          const dsId = await resolveDataSourceId(client, id);
          await client.patch(`data_sources/${dsId}`, { properties });
        }

        if (options.json) {
          const dsId = await resolveDataSourceId(client, id);
          const updated = await client.get(`data_sources/${dsId}`);
          console.log(formatOutput(updated));
        } else {
          console.log('✅ Updated');
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });

  // List data sources for a database
  datasource
    .command('list <database_id>')
    .alias('ls')
    .description('List all data sources in a database')
    .option('-j, --json', 'Output raw JSON')
    .action(async (databaseId: string, options) => {
      try {
        const client = getClient();
        const { db } = await getDatabaseWithDataSource(client, databaseId);
        const title = getDbTitle(db);

        if (options.json) {
          console.log(formatOutput(db.data_sources || []));
          return;
        }

        console.log(`📊 ${title} (${db.id})\n`);

        if (!db.data_sources || db.data_sources.length === 0) {
          console.log('No data sources found.');
          return;
        }

        for (const ds of db.data_sources) {
          const dsDetail = await client.get(`data_sources/${ds.id}`) as DataSource;
          const propCount = Object.keys(dsDetail.properties).length;
          console.log(`  📋 ${ds.name || 'Unnamed'}`);
          console.log(`     ID: ${ds.id}`);
          console.log(`     Properties: ${propCount}`);
        }
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    });
}
