/**
 * Provider Module Index
 *
 * LEGO Architecture for SnowRail on Mantle
 * Exports all providers for the 5 hackathon tracks:
 *
 * 1. RWA/RealFi: USDYProvider (USDY, mETH) + YieldDistributor
 * 2. AI & Oracles: PythOracleProvider
 * 3. DeFi & Composability: MerchantMoeProvider
 * 4. ZK & Privacy: See src/zk/ (NoirProvider)
 * 5. Infrastructure: Monitoring & Health APIs
 */

// Interfaces
export * from './interfaces';

// Factory
export {
  createProviders,
  createRWAProvider,
  createOracleProvider,
  createSwapProvider,
  buildProvidersConfigFromEnv,
} from './factory';
export type { ProviderFactoryConfig, Providers } from './factory';

// Concrete Providers
export { USDYProvider, createUSDYProvider } from './USDYProvider';
export { PythOracleProvider, createPythOracleProvider } from './PythOracleProvider';
export { MerchantMoeProvider, createMerchantMoeProvider } from './MerchantMoeProvider';
export { YieldDistributor, createYieldDistributor } from './YieldDistributor';
export { KYCProvider, createKYCProvider } from './KYCProvider';
export { LendingProvider, createLendingProvider } from './LendingProvider';
export { YieldOptimizer, createYieldOptimizer } from './YieldOptimizer';
export { MultiOracleProvider, createMultiOracleProvider } from './MultiOracleProvider';

// Mock Providers (for testing)
export { MockRWAProvider } from './mocks/MockRWAProvider';
export { MockOracleProvider } from './mocks/MockOracleProvider';
export { MockSwapProvider } from './mocks/MockSwapProvider';
