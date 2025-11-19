const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'educrm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Create migrations tracking table
const createMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Get list of executed migrations
const getExecutedMigrations = async (client) => {
  const result = await client.query(
    'SELECT migration_name FROM public.schema_migrations ORDER BY id'
  );
  return result.rows.map((row) => row.migration_name);
};

// Record migration execution
const recordMigration = async (client, migrationName) => {
  await client.query(
    'INSERT INTO public.schema_migrations (migration_name) VALUES ($1)',
    [migrationName]
  );
};

// Run migrations
const runMigrations = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...\n');

    // Create migrations table
    await createMigrationsTable(client);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(client);
    console.log(`📋 Found ${executedMigrations.length} executed migrations\n`);

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📂 Found ${migrationFiles.length} migration files\n`);

    let executedCount = 0;

    // Execute pending migrations
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');

      if (executedMigrations.includes(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already executed)`);
        continue;
      }

      console.log(`\n🔄 Executing ${migrationName}...`);

      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await recordMigration(client, migrationName);
        await client.query('COMMIT');

        console.log(`✅ ${migrationName} executed successfully`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error executing ${migrationName}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✨ Migration complete! Executed ${executedCount} new migrations`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
