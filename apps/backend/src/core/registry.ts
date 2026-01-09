/**
 * Module Registry for SnowRail LEGO Architecture
 *
 * This module provides:
 * - Service/module registration pattern
 * - Lazy initialization support
 * - Health check aggregation
 * - Dependency management
 *
 * Follows the LEGO architecture principle: modules can be swapped/added
 * without affecting the core system.
 */

import { FastifyInstance } from 'fastify';
import { FeatureFlags, getFeatureFlags, isFeatureEnabled } from '../config/feature-flags';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Module lifecycle states
 */
export type ModuleState = 'unregistered' | 'registered' | 'initializing' | 'ready' | 'error' | 'stopped';

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

/**
 * Module definition
 */
export interface ModuleDefinition<T = unknown> {
  /** Unique module identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Version string */
  version: string;

  /** Feature flag that gates this module (optional) */
  featureFlag?: keyof FeatureFlags;

  /** Is this a V2/new feature module? */
  isV2Module: boolean;

  /** Dependencies on other modules (by name) */
  dependencies?: string[];

  /**
   * Factory function to create module instance
   * Called lazily when module is first accessed or during eager init
   */
  factory: (server: FastifyInstance, registry: ModuleRegistry) => Promise<T> | T;

  /**
   * Health check function (optional)
   * Called during health aggregation
   */
  healthCheck?: (instance: T) => Promise<HealthCheckResult> | HealthCheckResult;

  /**
   * Cleanup function (optional)
   * Called during graceful shutdown
   */
  cleanup?: (instance: T) => Promise<void> | void;
}

/**
 * Registered module with state
 */
interface RegisteredModule<T = unknown> {
  definition: ModuleDefinition<T>;
  state: ModuleState;
  instance: T | null;
  error: Error | null;
  initStartTime: number | null;
  initEndTime: number | null;
}

/**
 * Registry status for health checks
 */
export interface RegistryStatus {
  totalModules: number;
  readyModules: number;
  errorModules: number;
  v1Modules: number;
  v2Modules: number;
  modules: Array<{
    name: string;
    state: ModuleState;
    isV2: boolean;
    featureFlag?: string;
    initTimeMs?: number;
    error?: string;
  }>;
}

/**
 * Aggregated health check result
 */
export interface AggregatedHealthCheck {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  modules: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    skipped: number;
  };
}

// ============================================
// MODULE REGISTRY CLASS
// ============================================

export class ModuleRegistry {
  private modules: Map<string, RegisteredModule> = new Map();
  private server: FastifyInstance;
  private initialized: boolean = false;

  constructor(server: FastifyInstance) {
    this.server = server;
  }

  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * Register a module definition
   * Module will be created lazily on first access or during eager initialization
   */
  register<T>(definition: ModuleDefinition<T>): void {
    if (this.modules.has(definition.name)) {
      this.server.log.warn(
        { module: definition.name },
        '[Registry] Module already registered, skipping'
      );
      return;
    }

    // Check if module is gated by a disabled feature flag
    if (definition.featureFlag) {
      const flags = getFeatureFlags();
      const flagValue = flags[definition.featureFlag];

      if (typeof flagValue === 'boolean' && !flagValue) {
        this.server.log.debug(
          { module: definition.name, featureFlag: definition.featureFlag },
          '[Registry] Module skipped - feature flag disabled'
        );
        return;
      }
    }

    // In legacy mode, skip all V2 modules
    if (definition.isV2Module && getFeatureFlags().isLegacyMode) {
      this.server.log.debug(
        { module: definition.name },
        '[Registry] V2 module skipped - running in legacy mode'
      );
      return;
    }

    const registered: RegisteredModule<T> = {
      definition,
      state: 'registered',
      instance: null,
      error: null,
      initStartTime: null,
      initEndTime: null,
    };

    this.modules.set(definition.name, registered as RegisteredModule);

    this.server.log.info(
      {
        module: definition.name,
        version: definition.version,
        isV2: definition.isV2Module,
        dependencies: definition.dependencies,
      },
      '[Registry] Module registered'
    );
  }

  /**
   * Register multiple modules at once
   */
  registerAll(definitions: ModuleDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize a single module (and its dependencies)
   */
  async initializeModule<T>(name: string): Promise<T> {
    const registered = this.modules.get(name) as RegisteredModule<T> | undefined;

    if (!registered) {
      throw new Error(`Module not registered: ${name}`);
    }

    // Already initialized
    if (registered.state === 'ready' && registered.instance) {
      return registered.instance;
    }

    // Initialization in progress (circular dependency protection)
    if (registered.state === 'initializing') {
      throw new Error(`Circular dependency detected for module: ${name}`);
    }

    // Previous error
    if (registered.state === 'error') {
      throw new Error(`Module previously failed to initialize: ${name} - ${registered.error?.message}`);
    }

    // Initialize dependencies first
    if (registered.definition.dependencies) {
      for (const depName of registered.definition.dependencies) {
        if (!this.modules.has(depName)) {
          throw new Error(`Missing dependency for ${name}: ${depName}`);
        }
        await this.initializeModule(depName);
      }
    }

    // Initialize this module
    registered.state = 'initializing';
    registered.initStartTime = Date.now();

    try {
      this.server.log.debug({ module: name }, '[Registry] Initializing module');

      const instance = await registered.definition.factory(this.server, this);
      registered.instance = instance;
      registered.state = 'ready';
      registered.initEndTime = Date.now();

      const initTimeMs = registered.initEndTime - registered.initStartTime;
      this.server.log.info(
        { module: name, initTimeMs },
        '[Registry] Module initialized'
      );

      return instance;
    } catch (error) {
      registered.state = 'error';
      registered.error = error instanceof Error ? error : new Error(String(error));
      registered.initEndTime = Date.now();

      this.server.log.error(
        { module: name, error: registered.error.message },
        '[Registry] Module initialization failed'
      );

      throw error;
    }
  }

  /**
   * Initialize all registered modules (respecting dependencies)
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      this.server.log.warn('[Registry] Already initialized');
      return;
    }

    const moduleNames = Array.from(this.modules.keys());
    const initOrder = this.getInitializationOrder(moduleNames);

    this.server.log.info(
      { count: initOrder.length, order: initOrder },
      '[Registry] Initializing all modules'
    );

    for (const name of initOrder) {
      try {
        await this.initializeModule(name);
      } catch (error) {
        // Log but continue with other modules
        this.server.log.error(
          { module: name, error: error instanceof Error ? error.message : String(error) },
          '[Registry] Failed to initialize module, continuing with others'
        );
      }
    }

    this.initialized = true;
    this.server.log.info('[Registry] All modules initialization complete');
  }

  /**
   * Get topologically sorted initialization order
   */
  private getInitializationOrder(names: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (name: string, path: Set<string>): void => {
      if (visited.has(name)) return;
      if (path.has(name)) {
        throw new Error(`Circular dependency detected: ${Array.from(path).join(' -> ')} -> ${name}`);
      }

      path.add(name);

      const registered = this.modules.get(name);
      if (registered?.definition.dependencies) {
        for (const dep of registered.definition.dependencies) {
          if (this.modules.has(dep)) {
            visit(dep, path);
          }
        }
      }

      path.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of names) {
      visit(name, new Set());
    }

    return order;
  }

  // ============================================
  // ACCESS
  // ============================================

  /**
   * Get a module instance (initializes lazily if needed)
   */
  async get<T>(name: string): Promise<T> {
    return this.initializeModule<T>(name);
  }

  /**
   * Get a module instance if already initialized
   * Returns null if not ready
   */
  getSync<T>(name: string): T | null {
    const registered = this.modules.get(name) as RegisteredModule<T> | undefined;
    if (registered?.state === 'ready' && registered.instance) {
      return registered.instance;
    }
    return null;
  }

  /**
   * Check if a module is registered
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Check if a module is ready
   */
  isReady(name: string): boolean {
    const registered = this.modules.get(name);
    return registered?.state === 'ready';
  }

  /**
   * Get all module names
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }

  // ============================================
  // HEALTH CHECKS
  // ============================================

  /**
   * Run health check for a single module
   */
  async checkModuleHealth(name: string): Promise<HealthCheckResult> {
    const registered = this.modules.get(name);

    if (!registered) {
      return { healthy: false, message: 'Module not registered' };
    }

    if (registered.state !== 'ready' || !registered.instance) {
      return {
        healthy: false,
        message: `Module not ready: ${registered.state}`,
        details: registered.error ? { error: registered.error.message } : undefined,
      };
    }

    if (!registered.definition.healthCheck) {
      return { healthy: true, message: 'No health check defined' };
    }

    const startTime = Date.now();
    try {
      const result = await registered.definition.healthCheck(registered.instance);
      return {
        ...result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Run health checks for all modules
   */
  async checkAllHealth(): Promise<AggregatedHealthCheck> {
    const results: Record<string, HealthCheckResult> = {};
    let healthy = 0;
    let unhealthy = 0;
    let skipped = 0;

    for (const [name, registered] of this.modules) {
      if (registered.state !== 'ready') {
        skipped++;
        results[name] = {
          healthy: false,
          message: `Module not initialized: ${registered.state}`,
        };
        continue;
      }

      const result = await this.checkModuleHealth(name);
      results[name] = result;

      if (result.healthy) {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    const total = this.modules.size;
    let overall: 'healthy' | 'degraded' | 'unhealthy';

    if (unhealthy === 0 && skipped === 0) {
      overall = 'healthy';
    } else if (healthy > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      modules: results,
      summary: { total, healthy, unhealthy, skipped },
    };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Gracefully shutdown all modules
   */
  async shutdown(): Promise<void> {
    this.server.log.info('[Registry] Shutting down modules');

    // Shutdown in reverse initialization order
    const moduleNames = Array.from(this.modules.keys()).reverse();

    for (const name of moduleNames) {
      const registered = this.modules.get(name);

      if (!registered || registered.state !== 'ready' || !registered.instance) {
        continue;
      }

      if (registered.definition.cleanup) {
        try {
          await registered.definition.cleanup(registered.instance);
          this.server.log.debug({ module: name }, '[Registry] Module cleanup complete');
        } catch (error) {
          this.server.log.error(
            { module: name, error: error instanceof Error ? error.message : String(error) },
            '[Registry] Module cleanup failed'
          );
        }
      }

      registered.state = 'stopped';
    }

    this.server.log.info('[Registry] All modules shut down');
  }

  /**
   * Get registry status for diagnostics
   */
  getStatus(): RegistryStatus {
    let readyModules = 0;
    let errorModules = 0;
    let v1Modules = 0;
    let v2Modules = 0;

    const moduleList: RegistryStatus['modules'] = [];

    for (const [name, registered] of this.modules) {
      if (registered.state === 'ready') readyModules++;
      if (registered.state === 'error') errorModules++;
      if (registered.definition.isV2Module) {
        v2Modules++;
      } else {
        v1Modules++;
      }

      moduleList.push({
        name,
        state: registered.state,
        isV2: registered.definition.isV2Module,
        featureFlag: registered.definition.featureFlag as string | undefined,
        initTimeMs: registered.initStartTime && registered.initEndTime
          ? registered.initEndTime - registered.initStartTime
          : undefined,
        error: registered.error?.message,
      });
    }

    return {
      totalModules: this.modules.size,
      readyModules,
      errorModules,
      v1Modules,
      v2Modules,
      modules: moduleList,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let registryInstance: ModuleRegistry | null = null;

/**
 * Initialize the module registry
 */
export function initializeRegistry(server: FastifyInstance): ModuleRegistry {
  if (registryInstance) {
    server.log.warn('[Registry] Already initialized, returning existing instance');
    return registryInstance;
  }

  registryInstance = new ModuleRegistry(server);
  server.log.info('[Registry] Module registry initialized');
  return registryInstance;
}

/**
 * Get the module registry instance
 */
export function getRegistry(): ModuleRegistry {
  if (!registryInstance) {
    throw new Error('ModuleRegistry not initialized. Call initializeRegistry first.');
  }
  return registryInstance;
}

/**
 * Check if registry is initialized
 */
export function isRegistryInitialized(): boolean {
  return registryInstance !== null;
}

/**
 * Reset registry (for testing only)
 */
export function resetRegistry(): void {
  registryInstance = null;
}

// ============================================
// HELPER: MODULE DEFINITION BUILDER
// ============================================

/**
 * Helper function to create a module definition with type safety
 */
export function defineModule<T>(definition: ModuleDefinition<T>): ModuleDefinition<T> {
  return definition;
}

/**
 * Helper to create a V1 (legacy) module definition
 */
export function defineV1Module<T>(
  name: string,
  factory: ModuleDefinition<T>['factory'],
  options?: Partial<Omit<ModuleDefinition<T>, 'name' | 'factory' | 'isV2Module'>>
): ModuleDefinition<T> {
  return {
    name,
    description: options?.description || `V1 module: ${name}`,
    version: options?.version || '1.0.0',
    isV2Module: false,
    factory,
    ...options,
  };
}

/**
 * Helper to create a V2 (new feature) module definition
 */
export function defineV2Module<T>(
  name: string,
  featureFlag: keyof FeatureFlags,
  factory: ModuleDefinition<T>['factory'],
  options?: Partial<Omit<ModuleDefinition<T>, 'name' | 'factory' | 'isV2Module' | 'featureFlag'>>
): ModuleDefinition<T> {
  return {
    name,
    description: options?.description || `V2 module: ${name}`,
    version: options?.version || '2.0.0',
    isV2Module: true,
    featureFlag,
    factory,
    ...options,
  };
}
