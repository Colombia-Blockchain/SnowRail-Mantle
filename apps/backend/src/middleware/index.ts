/**
 * Middleware Module Exports
 *
 * WP1 Foundation: Feature gating and request middleware
 */

// Types
export type {
  FeatureDisabledResponse,
  FeatureGateOptions,
  RouteFeatureGateOptions,
  FeatureGatedPluginOptions,
} from './feature-gate';

// Functions and Plugins
export {
  featureGate,
  featureGateSync,
  requireLegacyMode,
  requireX402Mode,
  requireAp2,
  requireOpa,
  requireSentinel,
  requireEigen,
  featureGatedPlugin,
  ifFeatureEnabled,
  ifLegacyMode,
  ifV2Mode,
  featureGatePlugin,
  trackFeatureUsage,
  getFeatureUsageStats,
  resetFeatureUsageStats,
  createFeatureDisabledResponse,
} from './feature-gate';
