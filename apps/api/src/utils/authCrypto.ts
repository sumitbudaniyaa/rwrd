import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP recommended parameters for Argon2id password hashing:
 * - memoryCost: 19 MiB (19456 KiB)
 * - timeCost: 2 iterations
 * - parallelism: 1 thread
 * - outputLen: 32 bytes
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure, high-entropy URL-safe base64 token.
 * Defaults to 32 bytes (256 bits of entropy).
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Produces a SHA-256 hash of a sensitive token (e.g., refresh token)
 * before persisting to the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison of two string hashes to resist timing attacks.
 */
export function timingSafeHashMatch(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
