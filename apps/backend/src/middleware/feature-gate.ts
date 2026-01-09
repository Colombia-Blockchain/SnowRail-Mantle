/**
 * Feature Gate Middleware for SnowRail LEGO Architecture
 *
 * This module provides:
 * - Fastify middleware to gate features based on feature flags
 * - Returns 501 Not Implemented if feature is disabled
 * - Logs feature usage for analytics
 *
 * CRITICAL: V1 endpoints should never be gated. Only use for V2 features.
 */

import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { FeatureFlags, getFeatureFlags, isFeatureEnabled, logFeatureUsage } from '../config/feature-flags';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Feature gate response when feature is disabled
 */
export interface FeatureDisabledResponse {
  status: 'error';
  code: 'FEATURE_DISABLED';
  message: string;
  details: {
    feature: string;
    enabledIn: string;
    currentMode: string;
  };
}

/**
 * Feature gate hook options
 */
export interface FeatureGateOptions {
  /** The feature flag to check */
  feature: keyof FeatureFlags;

  /** Custom message when feature is disabled */
  message?: string;

  /** Log level for feature access attempts */
  logLevel?: 'debug' | 'info' | 'warn';

  /** Whether to include details in response (default: true in development) */
  includeDetails?: boolean;
}

/**
 * Route-level feature gate decorator options
 */
export interface RouteFeatureGateOptions extends FeatureGateOptions {
  /** Paths to exclude from gating (exact match) */
  excludePaths?: string[];

  /** Path prefixes to exclude from gating */
  excludePrefixes?: string[];
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a feature disabled response
 */
function createFeatureDisabledResponse(
  feature: string,
  message?: string,
  includeDetails: boolean = true
): FeatureDisabledResponse {
  const flags = getFeatureFlags();

  return {
    status: 'error',
    code: 'FEATURE_DISABLED',
    message: message || `Feature '${feature}' is not enabled in the current configuration`,
    details: includeDetails
      ? {
          feature,
          enabledIn: 'x402 protocol mode with feature flag enabled',
          currentMode: flags.protocol,
        }
      : {} as any,
  };
}

// ============================================
// MIDDLEWARE FACTORIES
// ============================================

/**
 * Create a preHandler hook that gates a feature
 *
 * Usage in route:
 * ```typescript
 * server.post('/api/v2/feature', {
 *   preHandler: [featureGate({ feature: 'x402Enabled' })]
 * }, handler);
 * ```
 */
export function featureGate(options: FeatureGateOptions) {
  const { feature, message, logLevel = 'debug' } = options;

  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const isEnabled = isFeatureEnabled(feature);

    // Log the access attempt
    logFeatureUsage(feature, {
      path: request.url,
      method: request.method,
      allowed: isEnabled,
    });

    if (!isEnabled) {
      const flags = getFeatureFlags();
      const includeDetails = options.includeDetails ?? !flags.isLegacyMode;

      request.log[logLevel]?.(
        {
          feature,
          path: request.url,
          method: request.method,
          protocol: flags.protocol,
        },
        '[FeatureGate] Feature access denied'
      );

      reply.code(501).send(createFeatureDisabledResponse(
        feature as string,
        message,
        includeDetails
      ));
      return;
    }

    // Feature is enabled, continue
    request.log.debug?.(
      { feature, path: request.url },
      '[FeatureGate] Feature access allowed'
    );
  };
}

/**
 * Create a synchronous preHandler hook (for non-async routes)
 */
export function featureGateSync(options: FeatureGateOptions) {
  const { feature, message, logLevel = 'debug' } = options;

  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ): void => {
    const isEnabled = isFeatureEnabled(feature);

    logFeatureUsage(feature, {
      path: request.url,
      method: request.method,
      allowed: isEnabled,
    });

    if (!isEnabled) {
      const flags = getFeatureFlags();
      const includeDetails = options.includeDetails ?? !flags.isLegacyMode;

      request.log[logLevel]?.(
        { feature, path: request.url, protocol: flags.protocol },
        '[FeatureGate] Feature access denied'
      );

      reply.code(501).send(createFeatureDisabledResponse(
        feature as string,
        message,
        includeDetails
      ));
      return;
    }

    done();
  };
}

/**
 * Require legacy mode (for V1-only endpoints that should fail in V2 mode)
 * Rarely needed, but available for migration safety
 */
export function requireLegacyMode(message?: string) {
  return featureGate({
    feature: 'isLegacyMode',
    message: message || 'This endpoint is only available in legacy mode',
    logLevel: 'warn',
  });
}

/**
 * Require X402 protocol mode
 */
export function requireX402Mode(message?: string) {
  return featureGate({
    feature: 'x402Enabled',
    message: message || 'This endpoint requires X402 protocol mode',
  });
}

/**
 * Require AP2 (Agent Protocol v2) to be enabled
 */
export function requireAp2(message?: string) {
  return featureGate({
    feature: 'ap2Enabled',
    message: message || 'This endpoint requires Agent Protocol v2 (AP2) to be enabled',
  });
}

/**
 * Require OPA integration to be enabled
 */
export function requireOpa(message?: string) {
  return featureGate({
    feature: 'opaEnabled',
    message: message || 'This endpoint requires OPA (Open Policy Agent) to be enabled',
  });
}

/**
 * Require Sentinel monitoring to be enabled
 */
export function requireSentinel(message?: string) {
  return featureGate({
    feature: 'sentinelEnabled',
    message: message || 'This endpoint requires Sentinel monitoring to be enabled',
  });
}

/**
 * Require EigenLayer integration to be enabled
 */
export function requireEigen(message?: string) {
  return featureGate({
    feature: 'eigenEnabled',
    message: message || 'This endpoint requires EigenLayer AVS integration to be enabled',
  });
}

// ============================================
// PLUGIN-LEVEL FEATURE GATING
// ============================================

/**
 * Create a Fastify plugin that gates an entire route prefix
 *
 * Usage:
 * ```typescript
 * server.register(featureGatedPlugin({
 *   feature: 'x402Enabled',
 *   plugin: x402Routes,
 *   prefix: '/api/v2/x402'
 * }));
 * ```
 */
export interface FeatureGatedPluginOptions {
  feature: keyof FeatureFlags;
  plugin: (server: FastifyInstance, opts: any) => Promise<void> | void;
  prefix?: string;
  message?: string;
}

export function featureGatedPlugin(options: FeatureGatedPluginOptions) {
  const { feature, plugin, prefix, message } = options;

  return async (server: FastifyInstance, opts: any): Promise<void> => {
    // Check if feature is enabled before registering the plugin
    if (!isFeatureEnabled(feature)) {
      server.log.info(
        { feature, prefix },
        '[FeatureGate] Plugin skipped - feature disabled'
      );

      // Register a catch-all route that returns 501
      if (prefix) {
        server.all(`${prefix}/*`, async (request, reply) => {
          reply.code(501).send(createFeatureDisabledResponse(
            feature as string,
            message
          ));
        });
      }

      return;
    }

    // Feature is enabled, register the actual plugin
    server.log.info(
      { feature, prefix },
      '[FeatureGate] Plugin registered - feature enabled'
    );

    await server.register(plugin, { ...opts, prefix });
  };
}

// ============================================
// CONDITIONAL ROUTE REGISTRATION
// ============================================

/**
 * Conditionally register routes based on feature flag
 *
 * Usage:
 * ```typescript
 * ifFeatureEnabled('x402Enabled', () => {
 *   server.post('/api/v2/payment', handler);
 * });
 * ```
 */
export function ifFeatureEnabled(
  feature: keyof FeatureFlags,
  callback: () => void,
  elseCallback?: () => void
): void {
  if (isFeatureEnabled(feature)) {
    callback();
  } else if (elseCallback) {
    elseCallback();
  }
}

/**
 * Conditionally register routes only in legacy mode
 */
export function ifLegacyMode(callback: () => void, elseCallback?: () => void): void {
  ifFeatureEnabled('isLegacyMode', callback, elseCallback);
}

/**
 * Conditionally register routes only when V2 features are active
 */
export function ifV2Mode(callback: () => void, elseCallback?: () => void): void {
  ifFeatureEnabled('hasV2Features', callback, elseCallback);
}

// ============================================
// FASTIFY PLUGIN
// ============================================

/**
 * Fastify plugin that adds feature gate decorators to the server
 */
export async function featureGatePlugin(server: FastifyInstance): Promise<void> {
  // Decorate request with feature flag helpers
  server.decorateRequest('isFeatureEnabled', null);
  server.decorateRequest('getFeatureFlags', null);

  // Add pre-handler hook to inject helpers
  server.addHook('onRequest', async (request) => {
    (request as any).isFeatureEnabled = isFeatureEnabled;
    (request as any).getFeatureFlags = getFeatureFlags;
  });

  // Add convenience methods to server
  server.decorate('featureGate', featureGate);
  server.decorate('requireX402', requireX402Mode);
  server.decorate('requireAp2', requireAp2);
  server.decorate('requireOpa', requireOpa);

  server.log.info('[FeatureGate] Plugin registered');
}

// ============================================
// METRICS & ANALYTICS
// ============================================

/**
 * Feature usage statistics
 */
interface FeatureUsageStats {
  feature: string;
  enabled: boolean;
  accessCount: number;
  deniedCount: number;
  lastAccessed: string | null;
}

const usageStats: Map<string, FeatureUsageStats> = new Map();

/**
 * Track feature usage (call this from middleware)
 */
export function trackFeatureUsage(feature: string, allowed: boolean): void {
  let stats = usageStats.get(feature);

  if (!stats) {
    stats = {
      feature,
      enabled: allowed,
      accessCount: 0,
      deniedCount: 0,
      lastAccessed: null,
    };
    usageStats.set(feature, stats);
  }

  stats.accessCount++;
  if (!allowed) {
    stats.deniedCount++;
  }
  stats.enabled = allowed;
  stats.lastAccessed = new Date().toISOString();
}

/**
 * Get feature usage statistics
 */
export function getFeatureUsageStats(): FeatureUsageStats[] {
  return Array.from(usageStats.values());
}

/**
 * Reset usage statistics (for testing)
 */
export function resetFeatureUsageStats(): void {
  usageStats.clear();
}

// ============================================
// EXPORTS
// ============================================

export {
  createFeatureDisabledResponse,
};
