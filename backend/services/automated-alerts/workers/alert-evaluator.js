/**
 * Alert Evaluator Worker
 * Background job that evaluates all active alert rules
 * Runs periodically (configured in PM2 or cron)
 */

const pool = require('../../../shared/config/database');
const alertService = require('../services/alert.service');

// Configure based on environment
const EVALUATION_INTERVAL = process.env.ALERT_EVALUATION_INTERVAL || 21600000; // 6 hours in ms
const BATCH_SIZE = 10; // Process schools in batches

/**
 * Main worker function
 */
async function runAlertEvaluation() {
  console.log(`[${new Date().toISOString()}] Starting alert evaluation worker...`);

  try {
    // Get all schools with active alert rules
    const schoolsResult = await pool.query(`
      SELECT DISTINCT school_id
      FROM alerts.alert_rules
      WHERE is_active = TRUE
    `);

    const schools = schoolsResult.rows;
    console.log(`Found ${schools.length} schools with active alert rules`);

    let totalEvaluated = 0;
    let totalTriggered = 0;

    // Process schools in batches
    for (let i = 0; i < schools.length; i += BATCH_SIZE) {
      const batch = schools.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async ({ school_id }) => {
        try {
          console.log(`Evaluating alerts for school: ${school_id}`);
          const result = await alertService.evaluateRules(school_id);

          console.log(`School ${school_id}: Evaluated ${result.evaluated} rules, triggered ${result.triggered} alerts`);

          return {
            school_id,
            evaluated: result.evaluated,
            triggered: result.triggered
          };
        } catch (error) {
          console.error(`Error evaluating alerts for school ${school_id}:`, error.message);
          return {
            school_id,
            evaluated: 0,
            triggered: 0,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        totalEvaluated += result.evaluated || 0;
        totalTriggered += result.triggered || 0;
      });

      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < schools.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[${new Date().toISOString()}] Alert evaluation complete!`);
    console.log(`Total rules evaluated: ${totalEvaluated}`);
    console.log(`Total alerts triggered: ${totalTriggered}`);

    // Log summary to database
    await pool.query(`
      INSERT INTO alerts.evaluation_log (
        evaluation_date,
        schools_processed,
        rules_evaluated,
        alerts_triggered
      ) VALUES ($1, $2, $3, $4)
    `, [new Date(), schools.length, totalEvaluated, totalTriggered]);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Alert evaluation failed:`, error);
    throw error;
  }
}

/**
 * Create evaluation log table if it doesn't exist
 */
async function ensureLogTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts.evaluation_log (
        log_id SERIAL PRIMARY KEY,
        evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        schools_processed INTEGER,
        rules_evaluated INTEGER,
        alerts_triggered INTEGER
      )
    `);
  } catch (error) {
    console.error('Error creating evaluation log table:', error);
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
  });
}

/**
 * Run as standalone script or scheduled job
 */
async function main() {
  try {
    await ensureLogTable();
    setupGracefulShutdown();

    // Run evaluation
    await runAlertEvaluation();

    // If ALERT_EVALUATION_INTERVAL is set, run continuously
    if (process.env.CONTINUOUS_MODE === 'true') {
      console.log(`Worker will run continuously every ${EVALUATION_INTERVAL / 1000 / 60} minutes`);

      setInterval(async () => {
        await runAlertEvaluation();
      }, EVALUATION_INTERVAL);
    } else {
      // One-time run, exit after completion
      console.log('One-time evaluation complete, exiting...');
      await pool.end();
      process.exit(0);
    }

  } catch (error) {
    console.error('Fatal error in alert evaluator:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { runAlertEvaluation };
