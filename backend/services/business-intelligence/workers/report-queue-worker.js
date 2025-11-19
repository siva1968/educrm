/**
 * Report Queue Worker
 * Processes scheduled and queued report generation jobs
 * Uses Bull queue for job management
 */

const Bull = require('bull');
const reportService = require('../services/report.service');
const pool = require('../../../shared/config/database');

// Queue configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

const QUEUE_CONCURRENCY = parseInt(process.env.REPORT_QUEUE_CONCURRENCY || '5');
const MAX_ATTEMPTS = parseInt(process.env.REPORT_QUEUE_MAX_ATTEMPTS || '3');

// Create Bull queue
const reportQueue = new Bull('report-generation', {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

/**
 * Process report generation job
 */
reportQueue.process(QUEUE_CONCURRENCY, async (job) => {
  const { report_id, execution_id, format, filters } = job.data;

  console.log(`[${new Date().toISOString()}] Processing report job ${job.id}`);
  console.log(`Report ID: ${report_id}, Execution ID: ${execution_id}, Format: ${format}`);

  try {
    // Update execution status to processing
    await pool.query(
      `UPDATE analytics.report_executions
       SET status = 'processing',
           started_at = CURRENT_TIMESTAMP
       WHERE execution_id = $1`,
      [execution_id]
    );

    // Get report configuration
    const reportResult = await pool.query(
      `SELECT * FROM analytics.reports WHERE report_id = $1`,
      [report_id]
    );

    if (reportResult.rows.length === 0) {
      throw new Error(`Report ${report_id} not found`);
    }

    const report = reportResult.rows[0];

    // Generate report using report service
    const result = await reportService.generateReport({
      report_id,
      format,
      filters,
      execution_id
    });

    // Update execution status to completed
    await pool.query(
      `UPDATE analytics.report_executions
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           file_path = $1,
           file_size = $2,
           row_count = $3
       WHERE execution_id = $4`,
      [result.file_path, result.file_size, result.row_count, execution_id]
    );

    console.log(`[${new Date().toISOString()}] Report job ${job.id} completed successfully`);
    console.log(`File: ${result.file_path}, Rows: ${result.row_count}`);

    return {
      success: true,
      execution_id,
      file_path: result.file_path,
      row_count: result.row_count
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Report job ${job.id} failed:`, error);

    // Update execution status to failed
    await pool.query(
      `UPDATE analytics.report_executions
       SET status = 'failed',
           completed_at = CURRENT_TIMESTAMP,
           error_message = $1
       WHERE execution_id = $2`,
      [error.message, execution_id]
    );

    throw error; // Re-throw to mark job as failed
  }
});

/**
 * Queue event handlers
 */
reportQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

reportQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed with error:`, error.message);

  // Send notification to admins about failed report
  notifyAdminsOfFailure(job, error);
});

reportQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} has stalled and will be reprocessed`);
});

reportQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

/**
 * Notify admins of report generation failure
 */
async function notifyAdminsOfFailure(job, error) {
  try {
    const { report_id } = job.data;

    // Get report details
    const reportResult = await pool.query(
      `SELECT r.*, u.email as creator_email
       FROM analytics.reports r
       LEFT JOIN public.users u ON r.created_by = u.user_id
       WHERE r.report_id = $1`,
      [report_id]
    );

    if (reportResult.rows.length > 0) {
      const report = reportResult.rows[0];

      console.log(`Notification: Report "${report.report_name}" failed for ${report.creator_email}`);
      console.log(`Error: ${error.message}`);

      // TODO: Integrate with notification service to send email
      // For now, just log it
    }
  } catch (notifyError) {
    console.error('Error sending failure notification:', notifyError);
  }
}

/**
 * Process scheduled reports
 * Check for reports that should be generated now
 */
async function processScheduledReports() {
  try {
    console.log(`[${new Date().toISOString()}] Checking for scheduled reports...`);

    // Find reports with schedules that are due
    const result = await pool.query(`
      SELECT r.*, s.schedule_id, s.frequency, s.parameters
      FROM analytics.reports r
      JOIN analytics.report_schedules s ON r.report_id = s.report_id
      WHERE s.is_active = TRUE
        AND s.next_run_at <= CURRENT_TIMESTAMP
        AND r.is_active = TRUE
      ORDER BY s.next_run_at ASC
      LIMIT 50
    `);

    console.log(`Found ${result.rows.length} scheduled reports to process`);

    for (const report of result.rows) {
      try {
        // Create execution record
        const executionResult = await pool.query(
          `INSERT INTO analytics.report_executions (
            report_id, executed_by, format, filters, status
          ) VALUES ($1, $2, $3, $4, 'queued')
          RETURNING execution_id`,
          [
            report.report_id,
            report.created_by,
            report.parameters?.format || 'pdf',
            JSON.stringify(report.parameters?.filters || {})
          ]
        );

        const execution_id = executionResult.rows[0].execution_id;

        // Add to queue
        await reportQueue.add({
          report_id: report.report_id,
          execution_id,
          format: report.parameters?.format || 'pdf',
          filters: report.parameters?.filters || {}
        }, {
          priority: 5 // Scheduled reports have lower priority than on-demand
        });

        // Update next run time
        const nextRun = calculateNextRun(report.frequency);
        await pool.query(
          `UPDATE analytics.report_schedules
           SET next_run_at = $1,
               last_run_at = CURRENT_TIMESTAMP
           WHERE schedule_id = $2`,
          [nextRun, report.schedule_id]
        );

        console.log(`Queued scheduled report: ${report.report_name} (${report.report_id})`);

      } catch (error) {
        console.error(`Error processing scheduled report ${report.report_id}:`, error);
      }
    }

  } catch (error) {
    console.error('Error checking scheduled reports:', error);
  }
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency) {
  const now = new Date();

  switch (frequency) {
    case 'daily':
      return new Date(now.setDate(now.getDate() + 1));
    case 'weekly':
      return new Date(now.setDate(now.getDate() + 7));
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    default:
      return new Date(now.setDate(now.getDate() + 1));
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  console.log('Shutting down report queue worker...');

  await reportQueue.close();
  await pool.end();

  console.log('Report queue worker stopped');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Main worker function
 */
async function main() {
  console.log('===========================================');
  console.log('Report Queue Worker Started');
  console.log('===========================================');
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Concurrency: ${QUEUE_CONCURRENCY}`);
  console.log(`Max Attempts: ${MAX_ATTEMPTS}`);
  console.log('===========================================');

  // Check for scheduled reports every 5 minutes
  setInterval(processScheduledReports, 5 * 60 * 1000);

  // Run once on startup
  await processScheduledReports();
}

// Start worker
main().catch(error => {
  console.error('Fatal error in report queue worker:', error);
  process.exit(1);
});

// Export for testing
module.exports = { reportQueue, processScheduledReports };
