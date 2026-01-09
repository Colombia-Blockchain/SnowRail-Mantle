/**
 * x402 Fastify Middleware
 *
 * Implements HTTP 402 Payment Required flow for protected resources.
 * Intercepts requests, issues challenges, validates payments.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  IX402Handler,
  X402Challenge,
  X402Payment,
  X402ResourcePricing,
} from '../interfaces/IX402Provider';

/**
 * Configuration for x402 middleware
 */
export interface X402MiddlewareConfig {
  /** x402 handler to use */
  handler: IX402Handler;
  /** Protected route patterns (glob-like) */
  protectedRoutes: string[];
  /** Routes to exclude from protection */
  excludedRoutes?: string[];
  /** Custom header name for access token */
  accessTokenHeader?: string;
  /** Custom header name for payment proof */
  paymentHeader?: string;
  /** Enable challenge caching */
  cacheEnabled?: boolean;
}

/**
 * 402 Response body structure
 */
interface X402ResponseBody {
  error: 'payment_required';
  challenge: X402Challenge;
  instructions: {
    paymentMethods: string[];
    submitTo: string;
    headers: Record<string, string>;
  };
}

/**
 * Create x402 middleware plugin for Fastify
 */
export function createX402Middleware(config: X402MiddlewareConfig) {
  const accessTokenHeader = config.accessTokenHeader || 'X-Access-Token';
  const paymentHeader = config.paymentHeader || 'X-Payment-Proof';

  return async function x402Plugin(fastify: FastifyInstance): Promise<void> {
    // Helper to check if route is protected
    const isProtectedRoute = (path: string): boolean => {
      // Check exclusions first
      if (config.excludedRoutes) {
        for (const pattern of config.excludedRoutes) {
          if (matchRoute(path, pattern)) {
            return false;
          }
        }
      }

      // Check protected routes
      for (const pattern of config.protectedRoutes) {
        if (matchRoute(path, pattern)) {
          return true;
        }
      }

      return false;
    };

    // Pre-handler hook for protected routes
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.url.split('?')[0]; // Remove query string

      if (!isProtectedRoute(path)) {
        return; // Not protected, continue
      }

      // Check for access token
      const accessToken = request.headers[accessTokenHeader.toLowerCase()] as string;
      if (accessToken) {
        const accessResult = await config.handler.checkAccess(accessToken);
        if (accessResult.granted) {
          // Attach receipt to request for downstream use
          (request as any).x402Receipt = accessResult.receipt;
          (request as any).x402TTL = accessResult.ttl;
          return; // Access granted, continue
        }
        // Token invalid/expired, issue new challenge
      }

      // Check for payment proof
      const paymentProof = request.headers[paymentHeader.toLowerCase()] as string;
      if (paymentProof) {
        try {
          const payment = parsePaymentProof(paymentProof);
          const challenge = await config.handler.getChallenge(payment.challengeId);

          if (challenge) {
            const validation = await config.handler.validatePayment(
              payment.challengeId,
              payment
            );

            if (validation.valid) {
              const receipt = await config.handler.processPayment(
                payment.challengeId,
                payment
              );

              // Attach receipt and continue
              (request as any).x402Receipt = receipt;
              (request as any).x402TTL = receipt.expiresAt - Math.floor(Date.now() / 1000);

              // Add access token to response headers for client caching
              reply.header(accessTokenHeader, receipt.accessToken);
              reply.header('X-Receipt-Id', receipt.id);

              return; // Payment valid, continue
            }
          }
        } catch (error) {
          fastify.log.warn({ error }, '[x402] Payment proof parsing failed');
        }
      }

      // No valid access - issue 402 challenge
      const resourceId = path;
      const challenge = await config.handler.createChallenge(resourceId);

      const responseBody: X402ResponseBody = {
        error: 'payment_required',
        challenge,
        instructions: {
          paymentMethods: [challenge.method],
          submitTo: `${request.protocol}://${request.hostname}${path}`,
          headers: {
            [paymentHeader]: 'JSON-encoded payment proof',
          },
        },
      };

      reply
        .code(402)
        .header('X-Challenge-Id', challenge.id)
        .header('X-Challenge-Expires', challenge.expiresAt.toString())
        .header('X-Payment-Amount', challenge.amount.toString())
        .header('X-Payment-Recipient', challenge.recipient)
        .send(responseBody);
    });

    // Decorate request with x402 helpers
    fastify.decorateRequest('hasX402Access', function (this: FastifyRequest): boolean {
      return !!(this as any).x402Receipt;
    });

    fastify.decorateRequest('getX402Receipt', function (this: FastifyRequest) {
      return (this as any).x402Receipt || null;
    });

    // Route to submit payment proof directly
    fastify.post('/x402/pay', async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        challengeId: string;
        payment: Partial<X402Payment>;
      };

      if (!body.challengeId || !body.payment) {
        reply.code(400).send({ error: 'Missing challengeId or payment' });
        return;
      }

      const challenge = await config.handler.getChallenge(body.challengeId);
      if (!challenge) {
        reply.code(404).send({ error: 'Challenge not found' });
        return;
      }

      const payment: X402Payment = {
        challengeId: body.challengeId,
        payer: body.payment.payer || '',
        signature: body.payment.signature || '',
        timestamp: body.payment.timestamp || Math.floor(Date.now() / 1000),
        txHash: body.payment.txHash,
        preimage: body.payment.preimage,
        subscriptionId: body.payment.subscriptionId,
      };

      const validation = await config.handler.validatePayment(body.challengeId, payment);

      if (!validation.valid) {
        reply.code(402).send({
          error: 'payment_invalid',
          errors: validation.errors,
          challenge,
        });
        return;
      }

      const receipt = await config.handler.processPayment(body.challengeId, payment);

      reply.send({
        success: true,
        receipt: {
          id: receipt.id,
          accessToken: receipt.accessToken,
          expiresAt: receipt.expiresAt,
        },
      });
    });

    // Route to check access status
    fastify.get('/x402/status', async (request: FastifyRequest, reply: FastifyReply) => {
      const accessToken = request.headers[accessTokenHeader.toLowerCase()] as string;

      if (!accessToken) {
        reply.code(401).send({ error: 'No access token provided' });
        return;
      }

      const result = await config.handler.checkAccess(accessToken);

      reply.send({
        granted: result.granted,
        reason: result.reason,
        ttl: result.ttl,
        resourceId: result.receipt?.metadata?.resourceId,
      });
    });

    fastify.log.info(
      { protectedRoutes: config.protectedRoutes },
      '[x402] Middleware registered'
    );
  };
}

/**
 * Simple route pattern matching
 */
function matchRoute(path: string, pattern: string): boolean {
  // Exact match
  if (pattern === path) return true;

  // Wildcard at end (e.g., /api/premium/*)
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix);
  }

  // Wildcard in middle (e.g., /api/*/data)
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
    return regex.test(path);
  }

  return false;
}

/**
 * Parse payment proof from header
 */
function parsePaymentProof(proof: string): X402Payment {
  try {
    // Try JSON first
    const parsed = JSON.parse(proof);
    return {
      challengeId: parsed.challengeId,
      payer: parsed.payer,
      signature: parsed.signature || '',
      timestamp: parsed.timestamp || Math.floor(Date.now() / 1000),
      txHash: parsed.txHash,
      preimage: parsed.preimage,
      subscriptionId: parsed.subscriptionId,
    };
  } catch {
    // Try base64
    const decoded = Buffer.from(proof, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
}

/**
 * Type augmentation for Fastify request
 */
declare module 'fastify' {
  interface FastifyRequest {
    hasX402Access(): boolean;
    getX402Receipt(): import('../interfaces/IX402Provider').X402Receipt | null;
  }
}
