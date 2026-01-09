/**
 * OPA Provider Factory
 *
 * Creates LEGO-swappable OPA providers based on configuration.
 */

import { IOPAProvider } from './interfaces/IOPAProvider';
import { SimpleOPAProvider, SimpleOPAConfig } from './providers/SimpleOPAProvider';
import { MockOPAProvider, MockOPAConfig } from './providers/MockOPAProvider';
import { getPoliciesForEnvironment } from './policies/payment-rules';

export type OPAProviderType = 'simple' | 'mock';

export interface OPAFactoryConfig {
  type: OPAProviderType;
  simple?: SimpleOPAConfig;
  mock?: MockOPAConfig;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

/**
 * Create an OPA provider based on configuration
 */
export function createOPAProvider(
  config: OPAFactoryConfig,
  logger?: Logger
): IOPAProvider {
  switch (config.type) {
    case 'simple':
      return new SimpleOPAProvider(config.simple, logger);

    case 'mock':
    default:
      return new MockOPAProvider(config.mock);
  }
}

/**
 * Build OPA configuration from environment variables
 */
export function buildOPAConfigFromEnv(): OPAFactoryConfig {
  const type = (process.env.OPA_PROVIDER as OPAProviderType) || 'mock';
  const env = (process.env.NODE_ENV || 'development') as 'production' | 'staging' | 'development' | 'test';

  // Parse blacklist from env
  const blacklist = process.env.OPA_BLACKLIST
    ? process.env.OPA_BLACKLIST.split(',').map((a) => a.trim())
    : [];

  return {
    type,
    simple: {
      useDefaults: process.env.OPA_USE_DEFAULTS !== 'false',
      blacklist,
      initialPolicies: getPoliciesForEnvironment(env),
    },
    mock: {
      defaultDecision:
        (process.env.OPA_MOCK_DEFAULT as 'allow' | 'deny') || 'allow',
      simulatedDelay: parseInt(process.env.OPA_MOCK_DELAY || '0', 10),
      denyAddresses: blacklist,
    },
  };
}
