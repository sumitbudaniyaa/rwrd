import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });
  }
  return redisClient;
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
