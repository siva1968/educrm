#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs SQL migration files in order
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend/services/.env') });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'educrm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Migrations directory
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Create migrations tracking table
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(query);
  console.log('✓ Migrations table ready');
}

// Get executed migrations
async function getExecutedMigrations() {
  const result = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return result.rows.map(row => row.version);
}

// Get pending migrations
async function getPendingMigrations(executedMigrations) {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.filter(file => {
    const version = file.split('_')[0];
    return !executedMigrations.includes(version);
  });
}

// Execute migration
async function executeMigration(filename) {
  const version = filename.split('_')[0];
  const name = filename.replace('.sql', '');
  const filepath = path.join(MIGRATIONS_DIR, filename);

  console.log(`\nExecuting migration: ${filename}`);

  try {
    // Read migration file
    const sql = fs.readFileSync(filepath, 'utf8');

    // Execute migration
    await pool.query('BEGIN');
    await pool.query(sql);

    // Record migration
    await pool.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [version, name]
    );

    await pool.query('COMMIT');

    console.log(`✓ Migration ${filename} executed successfully`);
    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`✗ Migration ${filename} failed:`, error.message);
    return false;
  }
}

// Rollback last migration
async function rollbackLast() {
  try {
    const result = await pool.query(
      'SELECT version, name FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const { version, name } = result.rows[0];
    console.log(`\nRolling back migration: ${name}`);

    // Check if rollback file exists
    const rollbackFile = path.join(MIGRATIONS_DIR, `rollback_${name}.sql`);
    if (fs.existsSync(rollbackFile)) {
      const sql = fs.readFileSync(rollbackFile, 'utf8');

      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query(
        'DELETE FROM schema_migrations WHERE version = $1',
        [version]
      );
      await pool.query('COMMIT');

      console.log(`✓ Rollback successful`);
    } else {
      console.log(`⚠ No rollback file found for ${name}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('✗ Rollback failed:', error.message);
  }
}

// Main migration function
async function migrate() {
  console.log('========================================');
  console.log('  EduCRM Database Migration Runner');
  console.log('========================================\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection established');

    // Create migrations table
    await createMigrationsTable();

    // Get migrations status
    const executedMigrations = await getExecutedMigrations();
    const pendingMigrations = await getPendingMigrations(executedMigrations);

    console.log(`\nExecuted migrations: ${executedMigrations.length}`);
    console.log(`Pending migrations: ${pendingMigrations.length}`);

    if (pendingMigrations.length === 0) {
      console.log('\n✓ Database is up to date!');
      return;
    }

    // Execute pending migrations
    console.log('\nExecuting pending migrations...');
    for (const migration of pendingMigrations) {
      const success = await executeMigration(migration);
      if (!success) {
        console.error('\n✗ Migration failed. Stopping.');
        process.exit(1);
      }
    }

    console.log('\n========================================');
    console.log('✓ All migrations completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n✗ Migration error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI handling
const command = process.argv[2];

if (command === 'rollback') {
  (async () => {
    await createMigrationsTable();
    await rollbackLast();
    await pool.end();
  })();
} else if (command === 'status') {
  (async () => {
    await createMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    const pendingMigrations = await getPendingMigrations(executedMigrations);

    console.log('\nMigration Status:');
    console.log(`  Executed: ${executedMigrations.length}`);
    console.log(`  Pending: ${pendingMigrations.length}`);

    if (pendingMigrations.length > 0) {
      console.log('\nPending migrations:');
      pendingMigrations.forEach(m => console.log(`  - ${m}`));
    }

    await pool.end();
  })();
} else {
  migrate();
}

module.exports = { migrate, rollbackLast };
