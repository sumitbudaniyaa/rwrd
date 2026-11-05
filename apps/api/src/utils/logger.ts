import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'vpa',
      'vpaEncrypted',
      'vpa_encrypted',
      'totpSecret',
      'totp_secret_encrypted',
      'refreshToken',
      'refreshTokenHash',
      '*.password',
      '*.vpa',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
