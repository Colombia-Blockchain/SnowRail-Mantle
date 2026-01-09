/**
 * Core Module Exports
 *
 * WP1 Foundation: Module registry and LEGO architecture
 */

// Types
export type {
  ModuleState,
  HealthCheckResult,
  ModuleDefinition,
  RegistryStatus,
  AggregatedHealthCheck,
} from './registry';

// Class and Functions
export {
  ModuleRegistry,
  initializeRegistry,
  getRegistry,
  isRegistryInitialized,
  resetRegistry,
  defineModule,
  defineV1Module,
  defineV2Module,
} from './registry';
