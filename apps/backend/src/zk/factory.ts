/**
 * ZK Provider Factory - Mantle Network
 *
 * Creates LEGO-swappable providers based on configuration.
 * Allows runtime switching between implementations.
 *
 * Available providers:
 * - Verify: worldcoin (production), mock
 * - ZK: noir-zk (production with Barretenberg), noir (basic), mock
 */

import { IVerifyProvider } from './interfaces/IVerifyProvider';
import { IZKProofProvider } from './interfaces/IZKProofProvider';
import { MockVerifyProvider } from './providers/MockVerifyProvider';
import { NoirProvider, NoirProviderConfig } from './providers/NoirProvider';
import { MockZKProvider } from './providers/MockZKProvider';
import { WorldcoinVerifyProvider, WorldcoinVerifyConfig } from './providers/WorldcoinVerifyProvider';
import { NoirZKProvider, NoirZKConfig } from './providers/NoirZKProvider';

export type VerifyProviderType = 'worldcoin' | 'mock';
export type ZKProviderType = 'noir-zk' | 'noir' | 'mock';

export interface ZKFactoryConfig {
  verifyProvider: VerifyProviderType;
  zkProvider: ZKProviderType;
  worldcoin?: WorldcoinVerifyConfig;
  noirZK?: NoirZKConfig;
  noir?: NoirProviderConfig;
  mock?: {
    verifyAll?: boolean;
    initialVerified?: string[];
  };
}

export interface ZKLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Create a verification provider based on configuration
 */
export function createVerifyProvider(
  config: ZKFactoryConfig,
  logger?: ZKLogger
): IVerifyProvider {
  switch (config.verifyProvider) {
    case 'worldcoin':
      if (!config.worldcoin) {
        throw new Error('Worldcoin config required when using worldcoin provider');
      }
      return new WorldcoinVerifyProvider(config.worldcoin, logger);

    case 'mock':
    default:
      return new MockVerifyProvider(config.mock);
  }
}

/**
 * Create a ZK proof provider based on configuration
 */
export function createZKProvider(
  config: ZKFactoryConfig,
  logger?: ZKLogger
): IZKProofProvider {
  switch (config.zkProvider) {
    case 'noir-zk':
      if (!config.noirZK) {
        throw new Error('NoirZK config required when using noir-zk provider');
      }
      return new NoirZKProvider(config.noirZK, logger);

    case 'noir':
      if (!config.noir) {
        throw new Error('Noir config required when using noir provider');
      }
      return new NoirProvider(config.noir, logger);

    case 'mock':
    default:
      return new MockZKProvider();
  }
}

/**
 * Build configuration from environment variables
 */
export function buildConfigFromEnv(): ZKFactoryConfig {
  // Auto-select production providers when configured
  const hasWorldcoin = !!process.env.WORLDCOIN_APP_ID && !!process.env.WORLDCOIN_ACTION_ID;
  const hasNoirZK = !!process.env.NOIR_BACKEND_URL || !!process.env.NOIR_CIRCUITS_PATH;

  const defaultVerifyProvider = hasWorldcoin ? 'worldcoin' : 'mock';
  const defaultZKProvider = hasNoirZK ? 'noir-zk' : 'mock';

  return {
    verifyProvider: (process.env.VERIFY_PROVIDER as VerifyProviderType) || defaultVerifyProvider,
    zkProvider: (process.env.ZK_PROVIDER as ZKProviderType) || defaultZKProvider,

    // Worldcoin (production identity verification)
    worldcoin: hasWorldcoin
      ? {
          rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz',
          appId: process.env.WORLDCOIN_APP_ID!,
          actionId: process.env.WORLDCOIN_ACTION_ID!,
          worldIdRouterAddress: process.env.WORLD_ID_ROUTER_ADDRESS,
          apiKey: process.env.WORLDCOIN_API_KEY,
          enableCache: process.env.WORLDCOIN_CACHE !== 'false',
          cacheTtlSeconds: parseInt(process.env.WORLDCOIN_CACHE_TTL || '3600', 10),
          minVerificationLevel: (process.env.WORLDCOIN_MIN_LEVEL as 'orb' | 'phone' | 'device') || 'phone',
        }
      : undefined,

    // NoirZK (production ZK proofs with Barretenberg)
    noirZK: {
      rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz',
      noirBackendUrl: process.env.NOIR_BACKEND_URL,
      circuitsPath: process.env.NOIR_CIRCUITS_PATH || './circuits',
      verifierContracts: {
        'price-below': process.env.PRICE_BELOW_VERIFIER,
        'price-above': process.env.PRICE_ABOVE_VERIFIER,
        'amount-range': process.env.AMOUNT_RANGE_VERIFIER,
        'mixer-withdraw': process.env.MIXER_WITHDRAW_VERIFIER,
      },
      enableCache: process.env.ZK_CACHE !== 'false',
      cacheTtlSeconds: parseInt(process.env.ZK_CACHE_TTL || '300', 10),
    },

    // Noir (basic ZK proofs)
    noir: {
      circuitsPath: process.env.NOIR_CIRCUITS_PATH || './circuits',
      verifierContracts: {
        price_condition: process.env.PRICE_CONDITION_VERIFIER || '',
        'price-below': process.env.PRICE_BELOW_VERIFIER || '',
        'price-above': process.env.PRICE_ABOVE_VERIFIER || '',
      },
    },

    // Mock (development/testing only)
    mock: {
      verifyAll: process.env.MOCK_VERIFY_ALL === 'true',
    },
  };
}
