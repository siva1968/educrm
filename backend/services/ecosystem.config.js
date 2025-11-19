/**
 * PM2 Ecosystem Configuration
 * Manages all Phase 3 AI-Enabled Services
 *
 * Usage:
 *   Start all services: pm2 start ecosystem.config.js
 *   Stop all services: pm2 stop ecosystem.config.js
 *   Restart all: pm2 restart ecosystem.config.js
 *   Monitor: pm2 monit
 *   Logs: pm2 logs
 */

module.exports = {
  apps: [
    // =============================================
    // PHASE 3: AI-ENABLED SERVICES
    // =============================================

    // Business Intelligence Service
    {
      name: 'bi-service',
      script: './business-intelligence/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      error_file: './logs/bi-service-error.log',
      out_file: './logs/bi-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10
    },

    // AI Analytics Service
    {
      name: 'ai-analytics-service',
      script: './ai-analytics/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3012
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012
      },
      error_file: './logs/ai-analytics-error.log',
      out_file: './logs/ai-analytics-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10
    },

    // Automated Alerts Service
    {
      name: 'alerts-service',
      script: './automated-alerts/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3013
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3013
      },
      error_file: './logs/alerts-error.log',
      out_file: './logs/alerts-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10
    },

    // CRM Service
    {
      name: 'crm-service',
      script: './crm/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3014
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3014
      },
      error_file: './logs/crm-error.log',
      out_file: './logs/crm-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10
    },

    // Alumni Management Service
    {
      name: 'alumni-service',
      script: './alumni/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3015
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3015
      },
      error_file: './logs/alumni-error.log',
      out_file: './logs/alumni-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10
    },

    // =============================================
    // BACKGROUND JOBS
    // =============================================

    // Alert Evaluation Worker
    {
      name: 'alert-worker',
      script: './automated-alerts/workers/alert-evaluator.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */6 * * *',  // Every 6 hours
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/alert-worker-error.log',
      out_file: './logs/alert-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    },

    // Report Queue Worker
    {
      name: 'report-worker',
      script: './business-intelligence/workers/report-queue-worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/report-worker-error.log',
      out_file: './logs/report-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
