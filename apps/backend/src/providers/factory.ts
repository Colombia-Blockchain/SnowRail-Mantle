/**
 * Provider Factory for SnowRail on Mantle
 *
 * LEGO Architecture: Swappable providers for all 4 hackathon tracks
 *
 * Tracks covered:
 * - RWA/RealFi: USDYProvider
 * - AI & Oracles: PythOracleProvider
 * - DeFi & Composability: MerchantMoeProvider
 * - ZK & Privacy: Existing NoirProvider in src/zk/
 */

import {
  IRWAProvider,
  IOracleProvider,
  ISwapProvider,
  ProviderConfig,
} from './interfaces';

import { USDYProvider, createUSDYProvider } from './USDYProvider';
import { PythOracleProvider, createPythOracleProvider } from './PythOracleProvider';
import { MerchantMoeProvider, createMerchantMoeProvider } from './MerchantMoeProvider';

// Mock providers for testing
import { MockRWAProvider } from './mocks/MockRWAProvider';
import { MockOracleProvider } from './mocks/MockOracleProvider';
import { MockSwapProvider } from './mocks/MockSwapProvider';

export interface ProviderFactoryConfig {
  rwa: {
    type: 'usdy' | 'meth' | 'mock';
    rpcUrl?: string;
    privateKey?: string;
  };
  oracle: {
    type: 'pyth' | 'mock';
    pythAddress?: string;
    rpcUrl?: string;
  };
  swap: {
    type: 'merchant-moe' | 'mock';
    rpcUrl?: string;
    privateKey?: string;
    routerAddress?: string;
  };
}

export interface Providers {
  rwa: IRWAProvider;
  oracle: IOracleProvider;
  swap: ISwapProvider;
}

/**
 * Create all providers based on configuration
 */
export function createProviders(config: ProviderFactoryConfig): Providers {
  return {
    rwa: createRWAProvider(config.rwa),
    oracle: createOracleProvider(config.oracle),
    swap: createSwapProvider(config.swap),
  };
}

/**
 * Create RWA provider
 */
export function createRWAProvider(config: ProviderFactoryConfig['rwa']): IRWAProvider {
  switch (config.type) {
    case 'usdy':
    case 'meth':
      return createUSDYProvider({
        rpcUrl: config.rpcUrl,
        privateKey: config.privateKey,
      });

    case 'mock':
    default:
      return new MockRWAProvider();
  }
}

/**
 * Create Oracle provider
 */
export function createOracleProvider(config: ProviderFactoryConfig['oracle']): IOracleProvider {
  switch (config.type) {
    case 'pyth':
      return createPythOracleProvider({
        pythAddress: config.pythAddress,
        rpcUrl: config.rpcUrl,
      });

    case 'mock':
    default:
      return new MockOracleProvider();
  }
}

/**
 * Create Swap provider
 */
export function createSwapProvider(config: ProviderFactoryConfig['swap']): ISwapProvider {
  switch (config.type) {
    case 'merchant-moe':
      return createMerchantMoeProvider({
        rpcUrl: config.rpcUrl,
        privateKey: config.privateKey,
        routerAddress: config.routerAddress,
      });

    case 'mock':
    default:
      return new MockSwapProvider();
  }
}

/**
 * Build provider configuration from environment variables
 */
export function buildProvidersConfigFromEnv(): ProviderFactoryConfig {
  const rpcUrl = process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz';
  const privateKey = process.env.PRIVATE_KEY;

  return {
    rwa: {
      type: (process.env.RWA_PROVIDER as 'usdy' | 'meth' | 'mock') || 'mock',
      rpcUrl,
      privateKey,
    },
    oracle: {
      type: (process.env.ORACLE_PROVIDER as 'pyth' | 'mock') || 'mock',
      pythAddress: process.env.PYTH_ADDRESS || '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
      rpcUrl,
    },
    swap: {
      type: (process.env.SWAP_PROVIDER as 'merchant-moe' | 'mock') || 'mock',
      rpcUrl,
      privateKey,
      routerAddress: process.env.MERCHANT_MOE_ROUTER || '0xeaEE7EE68874218c3558b40063c42B82D3E7232a',
    },
  };
}

// Export types
export type { IRWAProvider, IOracleProvider, ISwapProvider };
export { USDYProvider, PythOracleProvider, MerchantMoeProvider };
