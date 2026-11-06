import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      url: env.API_BASE_URL,
    },
    `🚀 rwrd API server listening on port ${env.PORT}`,
  );
});

// Graceful Shutdown Handler
function handleShutdown(signal: string): void {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds timeout
  setTimeout(() => {
    logger.error('Forceful shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
