/**
 * Feature Flags System for SnowRail LEGO Architecture
 *
 * CRITICAL: V1 legacy MUST keep working. All new features are OFF by default.
 *
 * This module provides:
 * - TypeScript interface for all feature flags
 * - Environment variable mapping
 * - Default values (all new features OFF)
 * - Runtime flag checking
 *
 * Protocol modes:
 * - 'legacy': Original V1 behavior, no new features
 * - 'x402': Enable X402 protocol extensions
 */

import { FastifyInstance } from 'fastify';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Protocol mode determines the overall system behavior
 */
export type ProtocolMode = 'legacy' | 'x402';

/**
 * All feature flags with their types
 */
export interface FeatureFlags {
  // Core protocol mode
  protocol: ProtocolMode;

  // Module-level feature flags
  ap2Enabled: boolean;          // AP2 (Agent Protocol v2) module
  x402Enabled: boolean;         // X402 payment extensions
  opaEnabled: boolean;          // Open Policy Agent integration
  sentinelEnabled: boolean;     // Sentinel monitoring/alerting
  eigenEnabled: boolean;        // EigenLayer AVS integration

  // Enforcement flags (only apply when feature is enabled)
  requireAp2Mandate: boolean;   // Require AP2 mandate for all intents
  enforceOpaPolicies: boolean;  // Enforce OPA policy checks on all operations

  // Computed flags (derived from above)
  isLegacyMode: boolean;        // True if protocol === 'legacy'
  hasV2Features: boolean;       // True if any V2 feature is enabled
}

/**
 * Feature flag metadata for logging and introspection
 */
export interface FeatureFlagMeta {
  name: keyof FeatureFlags;
  envVar: string;
  description: string;
  defaultValue: boolean | string;
  isV2Feature: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Environment variable mappings
 */
export const ENV_VARS = {
  PROTOCOL: 'SNOWRAIL_PROTOCOL',
  AP2_ENABLED: 'AP2_ENABLED',
  X402_ENABLED: 'X402_ENABLED',
  OPA_ENABLED: 'OPA_ENABLED',
  SENTINEL_ENABLED: 'SENTINEL_ENABLED',
  EIGEN_ENABLED: 'EIGEN_ENABLED',
  REQUIRE_AP2_MANDATE: 'REQUIRE_AP2_MANDATE',
  ENFORCE_OPA_POLICIES: 'ENFORCE_OPA_POLICIES',
} as const;

/**
 * Feature flag metadata for documentation and introspection
 */
export const FEATURE_FLAG_META: FeatureFlagMeta[] = [
  {
    name: 'protocol',
    envVar: ENV_VARS.PROTOCOL,
    description: 'Core protocol mode (legacy or x402)',
    defaultValue: 'legacy',
    isV2Feature: false,
  },
  {
    name: 'ap2Enabled',
    envVar: ENV_VARS.AP2_ENABLED,
    description: 'Enable Agent Protocol v2 module',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'x402Enabled',
    envVar: ENV_VARS.X402_ENABLED,
    description: 'Enable X402 payment protocol extensions',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'opaEnabled',
    envVar: ENV_VARS.OPA_ENABLED,
    description: 'Enable Open Policy Agent integration',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'sentinelEnabled',
    envVar: ENV_VARS.SENTINEL_ENABLED,
    description: 'Enable Sentinel monitoring and alerting',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'eigenEnabled',
    envVar: ENV_VARS.EIGEN_ENABLED,
    description: 'Enable EigenLayer AVS integration',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'requireAp2Mandate',
    envVar: ENV_VARS.REQUIRE_AP2_MANDATE,
    description: 'Require AP2 mandate for all intents (only if AP2 enabled)',
    defaultValue: false,
    isV2Feature: true,
  },
  {
    name: 'enforceOpaPolicies',
    envVar: ENV_VARS.ENFORCE_OPA_POLICIES,
    description: 'Enforce OPA policy checks (only if OPA enabled)',
    defaultValue: false,
    isV2Feature: true,
  },
];

// ============================================
// SINGLETON STATE
// ============================================

let currentFlags: FeatureFlags | null = null;
let logger: FastifyInstance['log'] | null = null;
let initialized = false;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse boolean from environment variable
 * Explicit 'true' required to enable, everything else is false
 */
function parseEnvBool(value: string | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

/**
 * Parse protocol mode from environment variable
 * Defaults to 'legacy' for safety
 */
function parseProtocolMode(value: string | undefined): ProtocolMode {
  if (value?.toLowerCase() === 'x402') {
    return 'x402';
  }
  return 'legacy';
}

/**
 * Build feature flags from environment variables
 * CRITICAL: All V2 features default to OFF
 */
function buildFlagsFromEnv(): FeatureFlags {
  const protocol = parseProtocolMode(process.env[ENV_VARS.PROTOCOL]);

  // In legacy mode, all V2 features are forcibly disabled
  const isLegacyMode = protocol === 'legacy';

  // Parse individual flags (will be overridden in legacy mode)
  const ap2Enabled = !isLegacyMode && parseEnvBool(process.env[ENV_VARS.AP2_ENABLED]);
  const x402Enabled = !isLegacyMode && parseEnvBool(process.env[ENV_VARS.X402_ENABLED]);
  const opaEnabled = !isLegacyMode && parseEnvBool(process.env[ENV_VARS.OPA_ENABLED]);
  const sentinelEnabled = !isLegacyMode && parseEnvBool(process.env[ENV_VARS.SENTINEL_ENABLED]);
  const eigenEnabled = !isLegacyMode && parseEnvBool(process.env[ENV_VARS.EIGEN_ENABLED]);

  // Enforcement flags only apply when parent feature is enabled
  const requireAp2Mandate = ap2Enabled && parseEnvBool(process.env[ENV_VARS.REQUIRE_AP2_MANDATE]);
  const enforceOpaPolicies = opaEnabled && parseEnvBool(process.env[ENV_VARS.ENFORCE_OPA_POLICIES]);

  // Compute derived flags
  const hasV2Features = ap2Enabled || x402Enabled || opaEnabled || sentinelEnabled || eigenEnabled;

  return {
    protocol,
    ap2Enabled,
    x402Enabled,
    opaEnabled,
    sentinelEnabled,
    eigenEnabled,
    requireAp2Mandate,
    enforceOpaPolicies,
    isLegacyMode,
    hasV2Features,
  };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Initialize feature flags system
 * Should be called once at startup, before any other services
 */
export function initializeFeatureFlags(server: FastifyInstance): FeatureFlags {
  if (initialized) {
    server.log.warn('[FeatureFlags] Already initialized, returning existing flags');
    return currentFlags!;
  }

  logger = server.log;
  currentFlags = buildFlagsFromEnv();
  initialized = true;

  // Log the active configuration
  server.log.info(
    {
      protocol: currentFlags.protocol,
      isLegacyMode: currentFlags.isLegacyMode,
      hasV2Features: currentFlags.hasV2Features,
    },
    '[FeatureFlags] Core configuration loaded'
  );

  if (currentFlags.hasV2Features) {
    server.log.info(
      {
        ap2: currentFlags.ap2Enabled,
        x402: currentFlags.x402Enabled,
        opa: currentFlags.opaEnabled,
        sentinel: currentFlags.sentinelEnabled,
        eigen: currentFlags.eigenEnabled,
      },
      '[FeatureFlags] V2 features enabled'
    );
  } else {
    server.log.info('[FeatureFlags] Running in pure legacy mode - V1 behavior preserved');
  }

  return currentFlags;
}

/**
 * Get current feature flags
 * Throws if not initialized
 */
export function getFeatureFlags(): FeatureFlags {
  if (!currentFlags) {
    throw new Error('FeatureFlags not initialized. Call initializeFeatureFlags first.');
  }
  return currentFlags;
}

/**
 * Check if a specific feature is enabled
 * Type-safe way to check individual flags
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  const value = flags[feature];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Check if running in legacy mode
 * Shorthand for the most common check
 */
export function isLegacyMode(): boolean {
  return getFeatureFlags().isLegacyMode;
}

/**
 * Check if any V2 features are enabled
 */
export function hasV2Features(): boolean {
  return getFeatureFlags().hasV2Features;
}

/**
 * Get feature flags status for health checks
 */
export function getFeatureFlagsStatus(): {
  initialized: boolean;
  flags: FeatureFlags | null;
  meta: FeatureFlagMeta[];
} {
  return {
    initialized,
    flags: currentFlags,
    meta: FEATURE_FLAG_META,
  };
}

/**
 * Log feature usage (for analytics/debugging)
 * Call this when a V2 feature is actually used
 */
export function logFeatureUsage(feature: keyof FeatureFlags, context?: Record<string, unknown>): void {
  if (logger) {
    logger.debug(
      {
        feature,
        enabled: isFeatureEnabled(feature),
        ...context,
      },
      '[FeatureFlags] Feature accessed'
    );
  }
}

/**
 * Reset feature flags (for testing only)
 * DO NOT use in production code
 */
export function resetFeatureFlags(): void {
  currentFlags = null;
  logger = null;
  initialized = false;
}

/**
 * Initialize with custom flags (for testing only)
 */
export function initializeWithFlags(flags: Partial<FeatureFlags>, testLogger?: FastifyInstance['log']): FeatureFlags {
  const defaultFlags = buildFlagsFromEnv();
  currentFlags = {
    ...defaultFlags,
    ...flags,
    // Recompute derived flags
    isLegacyMode: flags.protocol ? flags.protocol === 'legacy' : defaultFlags.isLegacyMode,
    hasV2Features: flags.ap2Enabled || flags.x402Enabled || flags.opaEnabled ||
                   flags.sentinelEnabled || flags.eigenEnabled || false,
  };
  logger = testLogger || null;
  initialized = true;
  return currentFlags;
}
