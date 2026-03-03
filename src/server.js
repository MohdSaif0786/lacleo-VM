const app = require('./app');
const { config, validateEnv } = require('./config/env');
const { logger } = require('./utils/logger');
const { startAbandonedCartJob } = require('./jobs/abandonedCartJob');
const { startDNEMigrationJob } = require('./jobs/dneMigrationJob');

validateEnv();

const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`====================================`);
  logger.info(`lacleoOmnia-auto server started`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Mock Snov: ${config.snov.mock}`);
  logger.info(`====================================`);

  startAbandonedCartJob();
  startDNEMigrationJob();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
