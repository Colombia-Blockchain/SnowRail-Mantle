/**
 * Authentication Middleware for SnowRail API
 *
 * Security Features:
 * 1. API Key Authentication - For backend-to-backend communication
 * 2. Wallet Signature Verification - For frontend authentication
 * 3. Rate Limiting Preparation - Hooks for rate limiting integration
 *
 * SECURITY NOTES:
 * - In production, API keys should be stored securely (e.g., HashiCorp Vault)
 * - Wallet signatures should use EIP-712 typed data for better security
 * - Rate limiting should be implemented per-IP and per-key
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ethers } from 'ethers';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface AuthenticatedRequest extends FastifyRequest {
  auth?: {
    type: 'api-key' | 'wallet' | 'none';
    apiKeyId?: string;
    walletAddress?: string;
    permissions?: string[];
  };
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: Date;
}

// ============================================
// Configuration
// ============================================

// API Key configuration
// SECURITY FIX: Store HASHED keys, not plaintext
const API_KEYS = new Map<string, { name: string; permissions: string[] }>();

/**
 * Hash an API key for secure storage and comparison
 */
function hashApiKeyForStorage(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Initialize with environment-based keys (stored as hashes)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

if (ADMIN_API_KEY) {
  // SECURITY FIX: Store hashed key, not plaintext
  API_KEYS.set(hashApiKeyForStorage(ADMIN_API_KEY), {
    name: 'admin',
    permissions: ['read', 'write', 'execute', 'admin'],
  });
}

if (SERVICE_API_KEY) {
  // SECURITY FIX: Store hashed key, not plaintext
  API_KEYS.set(hashApiKeyForStorage(SERVICE_API_KEY), {
    name: 'service',
    permissions: ['read', 'write', 'execute'],
  });
}

// Rate limiting storage (in-memory for MVP, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// ============================================
// SECURITY FIX: Nonce tracking for replay attack prevention
// ============================================
const usedSignatureNonces = new Map<string, number>(); // signature hash -> expiry timestamp
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes (same as signature validity)

/**
 * Check if a signature/nonce has been used before (replay attack prevention)
 */
function isSignatureUsed(signatureHash: string): boolean {
  const expiry = usedSignatureNonces.get(signatureHash);
  if (!expiry) return false;

  // Clean up expired entries
  if (Date.now() > expiry) {
    usedSignatureNonces.delete(signatureHash);
    return false;
  }

  return true;
}

/**
 * Mark a signature as used
 */
function markSignatureUsed(signatureHash: string): void {
  usedSignatureNonces.set(signatureHash, Date.now() + NONCE_EXPIRY_MS);
}

/**
 * Periodic cleanup of expired nonces (call every minute)
 */
function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [hash, expiry] of usedSignatureNonces) {
    if (now > expiry) {
      usedSignatureNonces.delete(hash);
    }
  }
}

// Cleanup expired nonces and rate limits every minute
setInterval(() => {
  cleanupExpiredNonces();
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

// ============================================
// Utility Functions
// ============================================

/**
 * Hash an API key for secure comparison
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify a wallet signature using EIP-191 personal sign
 */
async function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Verify a wallet signature using EIP-712 typed data (more secure)
 */
async function verifyTypedDataSignature(
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  value: Record<string, unknown>,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Check rate limit for a given identifier
 */
function checkRateLimit(identifier: string): RateLimitInfo {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetTime < now) {
    // Reset or create new window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      limit: RATE_LIMIT_MAX_REQUESTS,
      resetTime: new Date(now + RATE_LIMIT_WINDOW_MS),
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);

  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count),
    limit: RATE_LIMIT_MAX_REQUESTS,
    resetTime: new Date(record.resetTime),
  };
}

// ============================================
// Middleware Functions
// ============================================

/**
 * API Key Authentication Middleware
 * Validates API key from X-API-Key header
 */
export async function apiKeyAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    (request as AuthenticatedRequest).auth = { type: 'none' };
    return;
  }

  // SECURITY FIX: Compare hashed key, not plaintext
  const hashedKey = hashApiKeyForStorage(apiKey);
  const keyInfo = API_KEYS.get(hashedKey);

  if (!keyInfo) {
    request.log.warn(
      { keyPrefix: apiKey.substring(0, 8) + '...' },
      '[Auth] Invalid API key attempt'
    );

    reply.code(401).send({
      status: 'error',
      code: 'INVALID_API_KEY',
      message: 'Invalid or expired API key',
    });
    return;
  }

  (request as AuthenticatedRequest).auth = {
    type: 'api-key',
    apiKeyId: keyInfo.name,
    permissions: keyInfo.permissions,
  };

  request.log.info(
    { keyName: keyInfo.name },
    '[Auth] API key authenticated'
  );
}

/**
 * Wallet Signature Authentication Middleware
 * Validates wallet signature from headers
 *
 * Headers required:
 * - X-Wallet-Address: The wallet address
 * - X-Wallet-Signature: The signature
 * - X-Wallet-Message: The signed message (or timestamp for nonce)
 */
export async function walletAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const address = request.headers['x-wallet-address'] as string | undefined;
  const signature = request.headers['x-wallet-signature'] as string | undefined;
  const message = request.headers['x-wallet-message'] as string | undefined;

  if (!address || !signature || !message) {
    // No wallet auth provided, continue
    return;
  }

  // Validate address format
  if (!ethers.isAddress(address)) {
    reply.code(401).send({
      status: 'error',
      code: 'INVALID_WALLET_ADDRESS',
      message: 'Invalid wallet address format',
    });
    return;
  }

  // SECURITY FIX: Check for replay attack - has this signature been used before?
  const signatureHash = crypto.createHash('sha256').update(signature).digest('hex');

  if (isSignatureUsed(signatureHash)) {
    request.log.warn(
      { address, signaturePrefix: signature.substring(0, 20) },
      '[Auth] REPLAY ATTACK DETECTED - Signature already used'
    );

    reply.code(401).send({
      status: 'error',
      code: 'SIGNATURE_ALREADY_USED',
      message: 'This signature has already been used. Please sign a new message.',
    });
    return;
  }

  // Validate message timestamp (prevent replay attacks)
  // Message format: "SnowRail Auth: <timestamp>"
  const timestampMatch = message.match(/SnowRail Auth: (\d+)/);
  if (timestampMatch) {
    const timestamp = parseInt(timestampMatch[1], 10);
    const now = Date.now();
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

    if (now - timestamp > MAX_AGE_MS) {
      reply.code(401).send({
        status: 'error',
        code: 'SIGNATURE_EXPIRED',
        message: 'Signature has expired. Please sign a new message.',
      });
      return;
    }
  }

  // Verify signature
  const isValid = await verifyWalletSignature(message, signature, address);

  if (!isValid) {
    request.log.warn(
      { address },
      '[Auth] Invalid wallet signature attempt'
    );

    reply.code(401).send({
      status: 'error',
      code: 'INVALID_SIGNATURE',
      message: 'Wallet signature verification failed',
    });
    return;
  }

  // SECURITY FIX: Mark signature as used AFTER successful verification
  markSignatureUsed(signatureHash);

  (request as AuthenticatedRequest).auth = {
    type: 'wallet',
    walletAddress: address,
    permissions: ['read', 'write'], // Default wallet permissions
  };

  request.log.info(
    { address },
    '[Auth] Wallet signature authenticated'
  );
}

/**
 * Rate Limiting Middleware
 * Limits requests per IP address or API key
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Use API key if authenticated, otherwise use IP
  const authRequest = request as AuthenticatedRequest;
  const identifier =
    authRequest.auth?.type === 'api-key'
      ? `key:${authRequest.auth.apiKeyId}`
      : `ip:${request.ip}`;

  const rateLimitInfo = checkRateLimit(identifier);

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  reply.header('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  reply.header('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());

  if (rateLimitInfo.remaining <= 0) {
    request.log.warn(
      { identifier },
      '[Auth] Rate limit exceeded'
    );

    reply.code(429).send({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: {
        limit: rateLimitInfo.limit,
        resetTime: rateLimitInfo.resetTime.toISOString(),
      },
    });
    return;
  }
}

/**
 * Require Authentication Middleware
 * Ensures request is authenticated via API key or wallet
 */
export async function requireAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.auth || request.auth.type === 'none') {
    reply.code(401).send({
      status: 'error',
      code: 'AUTHENTICATION_REQUIRED',
      message: 'This endpoint requires authentication. Provide X-API-Key or wallet signature.',
    });
    return;
  }
}

/**
 * Require Specific Permission Middleware Factory
 */
export function requirePermission(permission: string) {
  return async function (
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.auth || request.auth.type === 'none') {
      reply.code(401).send({
        status: 'error',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      });
      return;
    }

    if (!request.auth.permissions?.includes(permission)) {
      reply.code(403).send({
        status: 'error',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires '${permission}' permission`,
      });
      return;
    }
  };
}

// ============================================
// Plugin Registration
// ============================================

/**
 * Register authentication middleware as Fastify plugin
 */
export async function registerAuthMiddleware(fastify: FastifyInstance): Promise<void> {
  // Check if auth is enabled
  const isAuthEnabled = process.env.ENABLE_AUTH !== 'false';
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isAuthEnabled && isProduction) {
    fastify.log.error(
      '[Auth] CRITICAL: Authentication is disabled in production! Set ENABLE_AUTH=true'
    );
    throw new Error('Authentication cannot be disabled in production');
  }

  if (!isAuthEnabled) {
    fastify.log.warn(
      '[Auth] SECURITY WARNING: Authentication is DISABLED. Enable in production!'
    );
    return;
  }

  // Check for required API keys in production
  if (isProduction && API_KEYS.size === 0) {
    fastify.log.error(
      '[Auth] CRITICAL: No API keys configured in production! Set ADMIN_API_KEY and SERVICE_API_KEY'
    );
    throw new Error('API keys must be configured in production');
  }

  fastify.log.info(
    { keyCount: API_KEYS.size, rateLimitMax: RATE_LIMIT_MAX_REQUESTS },
    '[Auth] Authentication middleware registered'
  );

  // Add global hooks
  fastify.addHook('preHandler', apiKeyAuthMiddleware);
  fastify.addHook('preHandler', walletAuthMiddleware);
  fastify.addHook('preHandler', rateLimitMiddleware);
}

// Export individual middleware for route-level use
export {
  verifyWalletSignature,
  verifyTypedDataSignature,
  checkRateLimit,
};
