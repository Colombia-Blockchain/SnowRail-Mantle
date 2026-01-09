/**
 * Sentinel Provider Factory
 *
 * Creates LEGO-swappable Sentinel providers based on configuration.
 */

import { ISentinelProvider } from './interfaces/ISentinelProvider';
import { DefaultSentinelProvider, DefaultSentinelConfig } from './providers/DefaultSentinelProvider';
import { MockSentinelProvider, MockSentinelConfig } from './providers/MockSentinelProvider';

export type SentinelProviderType = 'default' | 'mock';

export interface SentinelFactoryConfig {
  type: SentinelProviderType;
  default?: Partial<DefaultSentinelConfig>;
  mock?: MockSentinelConfig;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

/**
 * Create a Sentinel provider based on configuration
 */
export function createSentinelProvider(
  config: SentinelFactoryConfig,
  logger?: Logger
): ISentinelProvider {
  switch (config.type) {
    case 'default':
      return new DefaultSentinelProvider(config.default, logger);

    case 'mock':
    default:
      return new MockSentinelProvider(config.mock);
  }
}

/**
 * Build Sentinel configuration from environment variables
 */
export function buildSentinelConfigFromEnv(): SentinelFactoryConfig {
  const type = (process.env.SENTINEL_PROVIDER as SentinelProviderType) || 'mock';

  // Parse blacklist from env
  const blacklist = process.env.SENTINEL_BLACKLIST
    ? process.env.SENTINEL_BLACKLIST.split(',').map((a) => a.trim())
    : [];

  return {
    type,
    default: {
      baseReputationScore: parseInt(process.env.SENTINEL_BASE_SCORE || '50', 10),
      scoreValidityPeriod: parseInt(process.env.SENTINEL_SCORE_TTL || '86400', 10),
      minTransactionsForScore: parseInt(process.env.SENTINEL_MIN_TX || '5', 10),
      highValueThreshold: BigInt(process.env.SENTINEL_HIGH_VALUE || '10000000000000000000'),
      velocityLimit: parseInt(process.env.SENTINEL_VELOCITY_LIMIT || '50', 10),
      blacklistExpiry: process.env.SENTINEL_BLACKLIST_EXPIRY
        ? parseInt(process.env.SENTINEL_BLACKLIST_EXPIRY, 10)
        : null,
    },
    mock: {
      defaultReputationScore: parseInt(process.env.SENTINEL_MOCK_SCORE || '75', 10),
      blacklistedAddresses: blacklist,
      alwaysSafe: process.env.SENTINEL_MOCK_SAFE !== 'false',
      simulatedDelay: parseInt(process.env.SENTINEL_MOCK_DELAY || '0', 10),
    },
  };
}
