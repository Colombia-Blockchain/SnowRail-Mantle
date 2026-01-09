/**
 * Environment Configuration & Validation for SnowRail
 *
 * This module provides:
 * - Type-safe environment configuration
 * - Validation of required variables
 * - Sensible defaults for development
 * - Clear error messages for missing configuration
 *
 * CRITICAL: V1 legacy mode should work with minimal configuration
 */

import { FastifyInstance } from 'fastify';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Network configuration
 */
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}

/**
 * Contract addresses
 */
export interface ContractConfig {
  settlementContract?: string;
  mixerContract?: string;
  pythAddress?: string;
  merchantMoeRouter?: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  logLevel: string;
  nodeEnv: string;
  corsOrigins: string[];
}

/**
 * Wallet/Keys configuration
 */
export interface WalletConfig {
  privateKey?: string;
  hasPrivateKey: boolean;
}

/**
 * Provider configuration for environment
 * (Named EnvProviderConfig to avoid conflict with providers/interfaces.ts)
 */
export interface EnvProviderConfig {
  rwaProvider: 'usdy' | 'meth' | 'mock';
  oracleProvider: 'pyth' | 'mock';
  swapProvider: 'merchant-moe' | 'mock';
  verifyProvider: 'worldcoin' | 'mock';
  zkProvider: 'noir' | 'mock';
}

/**
 * Complete environment configuration
 */
export interface EnvConfig {
  network: NetworkConfig;
  contracts: ContractConfig;
  server: ServerConfig;
  wallet: WalletConfig;
  providers: EnvProviderConfig;
  isProduction: boolean;
  isDevelopment: boolean;
  isConfigured: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default network configurations
 */
export const NETWORK_DEFAULTS: Record<string, NetworkConfig> = {
  'mantle-sepolia': {
    name: 'Mantle Sepolia',
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerUrl: 'https://sepolia.mantlescan.xyz',
  },
  'mantle': {
    name: 'Mantle',
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    explorerUrl: 'https://mantlescan.xyz',
  },
};

/**
 * Required environment variables for production
 */
export const REQUIRED_FOR_PRODUCTION = [
  'PRIVATE_KEY',
  'SETTLEMENT_CONTRACT_ADDRESS',
];

/**
 * Recommended environment variables (warnings if missing)
 */
export const RECOMMENDED_VARS = [
  'MIXER_CONTRACT_ADDRESS',
  'PYTH_ADDRESS',
];

// ============================================
// SINGLETON STATE
// ============================================

let envConfig: EnvConfig | null = null;
let initialized = false;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse integer with fallback
 */
function parseIntWithDefault(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse comma-separated list
 */
function parseList(value: string | undefined, defaults: string[]): string[] {
  if (!value) return defaults;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Get network config from chain ID or name
 */
function getNetworkConfig(chainId?: string, networkName?: string, rpcUrl?: string): NetworkConfig {
  // Try to match by chain ID first
  if (chainId) {
    const numericChainId = parseInt(chainId, 10);
    for (const network of Object.values(NETWORK_DEFAULTS)) {
      if (network.chainId === numericChainId) {
        return {
          ...network,
          rpcUrl: rpcUrl || network.rpcUrl,
        };
      }
    }
  }

  // Try to match by network name
  if (networkName) {
    const normalized = networkName.toLowerCase().replace(/\s+/g, '-');
    if (NETWORK_DEFAULTS[normalized]) {
      return {
        ...NETWORK_DEFAULTS[normalized],
        rpcUrl: rpcUrl || NETWORK_DEFAULTS[normalized].rpcUrl,
      };
    }
  }

  // Default to Mantle Sepolia for development
  return {
    ...NETWORK_DEFAULTS['mantle-sepolia'],
    rpcUrl: rpcUrl || NETWORK_DEFAULTS['mantle-sepolia'].rpcUrl,
    chainId: chainId ? parseInt(chainId, 10) : NETWORK_DEFAULTS['mantle-sepolia'].chainId,
  };
}

/**
 * Build configuration from environment
 */
function buildConfigFromEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  // Network configuration
  const network = getNetworkConfig(
    process.env.CHAIN_ID,
    process.env.NETWORK_NAME,
    process.env.RPC_URL || process.env.MANTLE_SEPOLIA_RPC
  );

  // Contract addresses (optional, may not be deployed yet)
  const contracts: ContractConfig = {
    settlementContract: process.env.SETTLEMENT_CONTRACT_ADDRESS,
    mixerContract: process.env.MIXER_CONTRACT_ADDRESS,
    pythAddress: process.env.PYTH_ADDRESS || '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
    merchantMoeRouter: process.env.MERCHANT_MOE_ROUTER || '0xeaEE7EE68874218c3558b40063c42B82D3E7232a',
  };

  // Server configuration
  const server: ServerConfig = {
    port: parseIntWithDefault(process.env.PORT, 3001),
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv,
    corsOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS, ['http://localhost:3000', 'http://localhost:3001']),
  };

  // Wallet configuration (private key is sensitive, don't store the value)
  const wallet: WalletConfig = {
    privateKey: process.env.PRIVATE_KEY,
    hasPrivateKey: !!process.env.PRIVATE_KEY,
  };

  // Provider configuration (all default to mock for safety)
  const providers: EnvProviderConfig = {
    rwaProvider: (process.env.RWA_PROVIDER as 'usdy' | 'meth' | 'mock') || 'mock',
    oracleProvider: (process.env.ORACLE_PROVIDER as 'pyth' | 'mock') || 'mock',
    swapProvider: (process.env.SWAP_PROVIDER as 'merchant-moe' | 'mock') || 'mock',
    verifyProvider: (process.env.VERIFY_PROVIDER as 'worldcoin' | 'mock') || 'mock',
    zkProvider: (process.env.ZK_PROVIDER as 'noir' | 'mock') || 'mock',
  };

  // Check if properly configured for production
  const isConfigured = !isProduction || (wallet.hasPrivateKey && !!contracts.settlementContract);

  return {
    network,
    contracts,
    server,
    wallet,
    providers,
    isProduction,
    isDevelopment,
    isConfigured,
  };
}

/**
 * Validate environment configuration
 */
function validateConfig(config: EnvConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Production requirements
  if (config.isProduction) {
    for (const varName of REQUIRED_FOR_PRODUCTION) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable for production: ${varName}`);
      }
    }
  }

  // Recommended variables (warnings only)
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Recommended environment variable not set: ${varName}`);
    }
  }

  // Validate chain ID is a number
  if (process.env.CHAIN_ID && isNaN(parseInt(process.env.CHAIN_ID, 10))) {
    errors.push(`Invalid CHAIN_ID: ${process.env.CHAIN_ID} (must be a number)`);
  }

  // Validate port is a valid number
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`Invalid PORT: ${process.env.PORT} (must be 1-65535)`);
    }
  }

  // Warn about mock providers in production
  if (config.isProduction) {
    const mockProviders: string[] = [];
    if (config.providers.rwaProvider === 'mock') mockProviders.push('RWA');
    if (config.providers.oracleProvider === 'mock') mockProviders.push('Oracle');
    if (config.providers.swapProvider === 'mock') mockProviders.push('Swap');
    if (config.providers.zkProvider === 'mock') mockProviders.push('ZK');

    if (mockProviders.length > 0) {
      warnings.push(`Mock providers enabled in production: ${mockProviders.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Initialize environment configuration
 * Should be called once at startup, after dotenv.config()
 */
export function initializeEnvConfig(server: FastifyInstance): EnvConfig {
  if (initialized) {
    server.log.warn('[EnvConfig] Already initialized, returning existing config');
    return envConfig!;
  }

  envConfig = buildConfigFromEnv();
  const validation = validateConfig(envConfig);

  // Log configuration summary
  server.log.info(
    {
      network: envConfig.network.name,
      chainId: envConfig.network.chainId,
      environment: envConfig.server.nodeEnv,
      configured: envConfig.isConfigured,
    },
    '[EnvConfig] Environment configuration loaded'
  );

  // Log warnings
  for (const warning of validation.warnings) {
    server.log.warn(`[EnvConfig] ${warning}`);
  }

  // Handle errors
  if (!validation.valid) {
    for (const error of validation.errors) {
      server.log.error(`[EnvConfig] ${error}`);
    }

    // In production, fail fast on configuration errors
    if (envConfig.isProduction) {
      throw new Error(`Environment configuration invalid: ${validation.errors.join('; ')}`);
    }
  }

  initialized = true;
  return envConfig;
}

/**
 * Get current environment configuration
 * Throws if not initialized
 */
export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    throw new Error('EnvConfig not initialized. Call initializeEnvConfig first.');
  }
  return envConfig;
}

/**
 * Get network configuration
 */
export function getNetworkConfigFromEnv(): NetworkConfig {
  return getEnvConfig().network;
}

/**
 * Get contract configuration
 */
export function getContractConfig(): ContractConfig {
  return getEnvConfig().contracts;
}

/**
 * Get server configuration
 */
export function getServerConfig(): ServerConfig {
  return getEnvConfig().server;
}

/**
 * Get provider configuration
 */
export function getProviderConfigFromEnv(): EnvProviderConfig {
  return getEnvConfig().providers;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvConfig().isProduction;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvConfig().isDevelopment;
}

/**
 * Get configuration status for health checks
 */
export function getEnvConfigStatus(): {
  initialized: boolean;
  config: Omit<EnvConfig, 'wallet'> & { wallet: { hasPrivateKey: boolean } } | null;
  validation: ValidationResult | null;
} {
  if (!envConfig) {
    return { initialized: false, config: null, validation: null };
  }

  // Don't expose private key in status
  const safeConfig = {
    ...envConfig,
    wallet: { hasPrivateKey: envConfig.wallet.hasPrivateKey },
  };

  return {
    initialized,
    config: safeConfig,
    validation: validateConfig(envConfig),
  };
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get a required environment variable (throws if missing)
 */
export function requireEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable not set: ${key}`);
  }
  return value;
}

/**
 * Reset configuration (for testing only)
 * DO NOT use in production code
 */
export function resetEnvConfig(): void {
  envConfig = null;
  initialized = false;
}

/**
 * Initialize with custom config (for testing only)
 */
export function initializeWithConfig(config: Partial<EnvConfig>): EnvConfig {
  const defaultConfig = buildConfigFromEnv();
  envConfig = {
    ...defaultConfig,
    ...config,
    network: { ...defaultConfig.network, ...config.network },
    contracts: { ...defaultConfig.contracts, ...config.contracts },
    server: { ...defaultConfig.server, ...config.server },
    wallet: { ...defaultConfig.wallet, ...config.wallet },
    providers: { ...defaultConfig.providers, ...config.providers },
  };
  initialized = true;
  return envConfig;
}
