/**
 * Configuration Module Exports
 *
 * WP1 Foundation: Configuration and feature flags
 */

// Feature Flags - Types
export type {
  ProtocolMode,
  FeatureFlags,
  FeatureFlagMeta,
} from './feature-flags';

// Feature Flags - Values and Functions
export {
  ENV_VARS,
  FEATURE_FLAG_META,
  initializeFeatureFlags,
  getFeatureFlags,
  isFeatureEnabled,
  isLegacyMode,
  hasV2Features,
  getFeatureFlagsStatus,
  logFeatureUsage,
  resetFeatureFlags,
  initializeWithFlags,
} from './feature-flags';

// Environment Configuration - Types
export type {
  NetworkConfig,
  ContractConfig,
  ServerConfig,
  WalletConfig,
  EnvProviderConfig,
  EnvConfig,
  ValidationResult,
} from './env';

// Environment Configuration - Values and Functions
export {
  NETWORK_DEFAULTS,
  REQUIRED_FOR_PRODUCTION,
  RECOMMENDED_VARS,
  initializeEnvConfig,
  getEnvConfig,
  getNetworkConfigFromEnv,
  getContractConfig,
  getServerConfig,
  getProviderConfigFromEnv,
  isProduction,
  isDevelopment,
  getEnvConfigStatus,
  getEnvVar,
  requireEnvVar,
  resetEnvConfig,
  initializeWithConfig,
} from './env';
