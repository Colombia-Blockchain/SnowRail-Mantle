/**
 * Unified Protocol Factory
 *
 * Creates all LEGO protocol providers based on configuration.
 * Returns a complete ProtocolStack for use throughout the application.
 */

import { FastifyInstance } from 'fastify';

// Import all module factories
import {
  IAP2Provider,
  createAP2Provider,
  buildAP2ConfigFromEnv,
  AP2FactoryConfig,
} from './ap2';

import {
  IX402Handler,
  createX402Handler,
  buildX402ConfigFromEnv,
  X402FactoryConfig,
} from './x402';

import {
  IOPAProvider,
  createOPAProvider,
  buildOPAConfigFromEnv,
  OPAFactoryConfig,
} from './opa';

import {
  ISentinelProvider,
  createSentinelProvider,
  buildSentinelConfigFromEnv,
  SentinelFactoryConfig,
} from './sentinel';

import {
  IEigenProvider,
  createEigenProvider,
  buildEigenConfigFromEnv,
  EigenFactoryConfig,
} from './eigen';

// ============================================
// Protocol Stack Types
// ============================================

/**
 * Complete protocol stack containing all LEGO providers
 */
export interface ProtocolStack {
  /** AP2 - Agent Payments Protocol */
  ap2: IAP2Provider;
  /** x402 - HTTP 402 Payment Handler */
  x402: IX402Handler;
  /** OPA - Open Policy Agent */
  opa: IOPAProvider;
  /** Sentinel - Security Provider */
  sentinel: ISentinelProvider;
  /** Eigen - Intent Attestation */
  eigen: IEigenProvider;
}

/**
 * Configuration for all protocols
 */
export interface ProtocolConfig {
  ap2: AP2FactoryConfig;
  x402: X402FactoryConfig;
  opa: OPAFactoryConfig;
  sentinel: SentinelFactoryConfig;
  eigen: EigenFactoryConfig;
}

/**
 * Protocol stack status for health checks
 */
export interface ProtocolStackStatus {
  initialized: boolean;
  ap2: { name: string; healthy: boolean };
  x402: { name: string; healthy: boolean };
  opa: { name: string; healthy: boolean };
  sentinel: { name: string; healthy: boolean };
  eigen: { name: string; healthy: boolean; operator: string };
}

// ============================================
// Logger Interface
// ============================================

interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create the complete protocol stack
 */
export function createProtocolStack(
  config: ProtocolConfig,
  logger?: Logger
): ProtocolStack {
  logger?.info('[Protocols] Creating protocol stack...');

  const ap2 = createAP2Provider(config.ap2, logger);
  logger?.debug({ provider: ap2.name }, '[Protocols] AP2 provider created');

  const x402 = createX402Handler(config.x402, logger);
  logger?.debug({ provider: x402.name }, '[Protocols] x402 handler created');

  const opa = createOPAProvider(config.opa, logger);
  logger?.debug({ provider: opa.name }, '[Protocols] OPA provider created');

  const sentinel = createSentinelProvider(config.sentinel, logger);
  logger?.debug({ provider: sentinel.name }, '[Protocols] Sentinel provider created');

  const eigen = createEigenProvider(config.eigen, logger);
  logger?.debug({ provider: eigen.name, operator: eigen.operator }, '[Protocols] Eigen provider created');

  logger?.info(
    {
      ap2: ap2.name,
      x402: x402.name,
      opa: opa.name,
      sentinel: sentinel.name,
      eigen: eigen.name,
    },
    '[Protocols] Protocol stack created'
  );

  return { ap2, x402, opa, sentinel, eigen };
}

/**
 * Build complete configuration from environment variables
 */
export function buildProtocolConfigFromEnv(): ProtocolConfig {
  return {
    ap2: buildAP2ConfigFromEnv(),
    x402: buildX402ConfigFromEnv(),
    opa: buildOPAConfigFromEnv(),
    sentinel: buildSentinelConfigFromEnv(),
    eigen: buildEigenConfigFromEnv(),
  };
}

/**
 * Get health status for all protocol providers
 */
export async function getProtocolStackStatus(
  stack: ProtocolStack
): Promise<ProtocolStackStatus> {
  const [ap2Health, x402Health, opaHealth, sentinelHealth, eigenHealth] = await Promise.all([
    stack.ap2.healthCheck(),
    stack.x402.healthCheck(),
    stack.opa.healthCheck(),
    stack.sentinel.healthCheck(),
    stack.eigen.healthCheck(),
  ]);

  return {
    initialized: true,
    ap2: { name: stack.ap2.name, healthy: ap2Health },
    x402: { name: stack.x402.name, healthy: x402Health },
    opa: { name: stack.opa.name, healthy: opaHealth },
    sentinel: { name: stack.sentinel.name, healthy: sentinelHealth },
    eigen: { name: stack.eigen.name, healthy: eigenHealth, operator: stack.eigen.operator },
  };
}

// ============================================
// Singleton Management
// ============================================

let protocolStack: ProtocolStack | null = null;
let initialized = false;

/**
 * Initialize protocol stack as singleton
 */
export function initializeProtocols(server: FastifyInstance): ProtocolStack {
  if (initialized && protocolStack) {
    server.log.warn('[Protocols] Protocol stack already initialized');
    return protocolStack;
  }

  const config = buildProtocolConfigFromEnv();
  protocolStack = createProtocolStack(config, server.log);
  initialized = true;

  server.log.info('[Protocols] Protocol stack initialized');

  return protocolStack;
}

/**
 * Initialize with custom configuration (for testing)
 */
export function initializeProtocolsWithConfig(
  config: ProtocolConfig,
  logger?: Logger
): ProtocolStack {
  protocolStack = createProtocolStack(config, logger);
  initialized = true;
  return protocolStack;
}

/**
 * Get the protocol stack singleton
 */
export function getProtocolStack(): ProtocolStack {
  if (!protocolStack) {
    throw new Error('Protocol stack not initialized. Call initializeProtocols first.');
  }
  return protocolStack;
}

/**
 * Check if protocols are initialized
 */
export function isProtocolsInitialized(): boolean {
  return initialized;
}

/**
 * Reset protocol stack (for testing)
 */
export function resetProtocolStack(): void {
  protocolStack = null;
  initialized = false;
}

// ============================================
// Re-exports for convenience
// ============================================

export * from './ap2';
export * from './x402';
export * from './opa';
export * from './sentinel';
export * from './eigen';
