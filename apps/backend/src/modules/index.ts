/**
 * LEGO Protocol Modules
 *
 * Entry point for all protocol modules:
 * - AP2: Agent Payments Protocol
 * - x402: HTTP 402 Payment Required
 * - OPA: Open Policy Agent
 * - Sentinel: Security Monitoring
 * - Eigen: Intent Attestation
 */

// Main factory exports - types
export type {
  ProtocolStack,
  ProtocolConfig,
  ProtocolStackStatus,
} from './factory';

// Main factory exports - functions
export {
  createProtocolStack,
  buildProtocolConfigFromEnv,
  getProtocolStackStatus,
  // Singleton management
  initializeProtocols,
  initializeProtocolsWithConfig,
  getProtocolStack,
  isProtocolsInitialized,
  resetProtocolStack,
} from './factory';

// Re-export all modules
export * from './ap2';
export * from './x402';
export * from './opa';
export * from './sentinel';
export * from './eigen';
