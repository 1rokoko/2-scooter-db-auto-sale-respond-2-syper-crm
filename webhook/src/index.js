import express from 'express';
import helmet from 'helmet';
import config from './config.js';
import webhookRouter from './routes/webhookRouter.js';
import logger from './utils/logger.js';
import { getPool, healthCheck as databaseHealth } from './services/database.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

app.use('/webhook', webhookRouter);

app.get('/healthz', async (req, res) => {
  try {
    await databaseHealth();
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const start = async () => {
  try {
    await getPool().query('SELECT 1');
    app.listen(config.port, () => {
      logger.info(`Webhook server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
