/**
 * AP2 Provider Factory
 *
 * Creates LEGO-swappable AP2 providers based on configuration.
 */

import { IAP2Provider } from './interfaces/IAP2Provider';
import { AP2Provider, AP2ProviderConfig } from './providers/AP2Provider';
import { MockAP2Provider, MockAP2Config } from './providers/MockAP2Provider';

export type AP2ProviderType = 'production' | 'mock';

export interface AP2FactoryConfig {
  type: AP2ProviderType;
  production?: AP2ProviderConfig;
  mock?: MockAP2Config;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

/**
 * Create an AP2 provider based on configuration
 */
export function createAP2Provider(
  config: AP2FactoryConfig,
  logger?: Logger
): IAP2Provider {
  switch (config.type) {
    case 'production':
      if (!config.production) {
        throw new Error('Production config required for AP2 production provider');
      }
      return new AP2Provider(config.production, logger);

    case 'mock':
    default:
      return new MockAP2Provider(config.mock);
  }
}

/**
 * Build AP2 configuration from environment variables
 */
export function buildAP2ConfigFromEnv(): AP2FactoryConfig {
  const type = (process.env.AP2_PROVIDER as AP2ProviderType) || 'mock';

  return {
    type,
    production: {
      chainId: parseInt(process.env.CHAIN_ID || '5003', 10),
      verifyingContract: process.env.AP2_VERIFIER_CONTRACT,
      signerPrivateKey: process.env.AGENT_PRIVATE_KEY,
    },
    mock: {
      approveAll: process.env.AP2_MOCK_APPROVE_ALL === 'true',
      simulatedDelay: parseInt(process.env.AP2_MOCK_DELAY || '0', 10),
    },
  };
}
