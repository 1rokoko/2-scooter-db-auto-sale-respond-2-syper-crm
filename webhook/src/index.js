import express from 'express';
import helmet from 'helmet';
import config from './config.js';
import webhookRouter from './routes/webhookRouter.js';
import logger from './utils/logger.js';
import { getPool, healthCheck as databaseHealth } from './services/database.js';
import {
  generalRateLimit,
  securityHeaders,
  requestLogger,
  errorHandler
} from './middleware/security.js';
import { metricsMiddleware, monitoringRoutes, healthCheck } from './services/monitoring.js';
import { warmCache } from './services/cache.js';

const app = express();

// Security and middleware setup
app.use(helmet());
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(generalRateLimit);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRouter);

// Monitoring routes
monitoringRoutes(app);

// Enhanced health check
app.get('/healthz', async (req, res) => {
  try {
    const health = await healthCheck();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Error handling
app.use(errorHandler);

const start = async () => {
  try {
    // Test database connection
    await getPool().query('SELECT 1');
    logger.info('Database connection established');

    // Warm cache
    await warmCache();

    // Start server
    app.listen(config.port, () => {
      logger.info(`Webhook server listening on port ${config.port}`);
      logger.info(`Health check available at http://localhost:${config.port}/healthz`);
      logger.info(`Metrics available at http://localhost:${config.port}/metrics`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
