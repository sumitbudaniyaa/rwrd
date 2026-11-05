import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { NotFoundError } from './errors/appError.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy if configured
  app.set('trust proxy', env.TRUST_PROXY);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl) in non-prod
        if (!origin) {
          return callback(null, true);
        }
        if (env.CORS_ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Origin not permitted by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      exposedHeaders: ['x-request-id', 'Retry-After'],
    }),
  );

  // Body Parsing & Parameter Pollution Protection
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(hpp());

  // Request ID & Logging
  app.use(requestIdMiddleware);
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => req.id,
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      }),
    );
  }

  // Basic root status
  app.get('/', (_req, res) => {
    res.json({
      name: 'TipTable API',
      version: '0.1.0',
      status: 'operational',
    });
  });

  // Health and Readiness Checks
  app.use(healthRouter);

  // 404 Handler for undefined routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized RFC 7807 Error Handler
  app.use(errorHandler);

  return app;
}
