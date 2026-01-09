import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import { showBanner } from './utils/banner';
import { intentRoutes } from './api/routes/intents';
import { agentRoutes } from './api/routes/agent';
import { mixerRoutes } from './api/routes/mixer';
import { providerRoutes } from './api/routes/providers';
import { initializeAgentService } from './services/agent-service';
import { initializeWalletService } from './services/wallet-service';
import { getWalletService } from './services/wallet-service';
import { initializePriceService } from './services/price-service';
import { initializeMixerService } from './services/mixer-service';
import { initializeProviderService, getProviderService } from './services/provider-service';
import { mcpPlugin } from './mcp';
import { initializeZKServices, getZKStatus } from './zk';

// WP1 Foundation imports
import { initializeFeatureFlags, getFeatureFlags, getFeatureFlagsStatus } from './config/feature-flags';
import { initializeEnvConfig, getEnvConfig, getEnvConfigStatus } from './config/env';
import { initializeRegistry, getRegistry } from './core/registry';
import { featureGatePlugin } from './middleware/feature-gate';

dotenv.config();

interface ApiResponse<T = Record<string, unknown> | null> {
  status: 'success' | 'warning' | 'error';
  code: string;
  message: string;
  data?: T;
  details?: Record<string, unknown>;
}

import crypto from 'crypto';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  },
  // SECURITY: Generate unique request IDs for tracing
  genReqId: () => crypto.randomUUID(),
});

// Add BigInt serialization support for JSON responses
// This fixes the "Do not know how to serialize a BigInt" error
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// ============================================
// WP1 FOUNDATION: Initialize configuration FIRST
// CRITICAL: This must happen before any other initialization
// ============================================

// Initialize environment configuration
const envConfig = initializeEnvConfig(server);

// Initialize feature flags (determines legacy vs x402 mode)
const featureFlags = initializeFeatureFlags(server);

// Initialize module registry (for LEGO architecture)
const registry = initializeRegistry(server);

// Log the foundation initialization summary
server.log.info(
  {
    protocol: featureFlags.protocol,
    isLegacyMode: featureFlags.isLegacyMode,
    hasV2Features: featureFlags.hasV2Features,
    network: envConfig.network.name,
    chainId: envConfig.network.chainId,
  },
  '[Foundation] WP1 initialization complete'
);

// ============================================
// SECURITY MIDDLEWARE (unchanged from V1)
// ============================================

server.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  xFrameOptions: {
    action: 'deny',
  },
});

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Register feature gate plugin (adds helpers to request/server)
server.register(featureGatePlugin);

// ============================================
// SECURITY: Request ID and Audit Logging
// ============================================

// Add request ID to all responses for tracing
server.addHook('onRequest', async (request, reply) => {
  // Add request ID header for client-side correlation
  reply.header('X-Request-ID', request.id);
});

// SECURITY: Audit logging for sensitive operations
server.addHook('onResponse', async (request, reply) => {
  // Log all non-GET requests for audit trail
  if (request.method !== 'GET' && request.method !== 'OPTIONS') {
    const sensitiveEndpoints = ['/api/intents', '/api/mixer', '/api/lending', '/api/swap'];
    const isSensitive = sensitiveEndpoints.some((ep) => request.url.startsWith(ep));

    if (isSensitive) {
      request.log.info({
        audit: true,
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        // SECURITY: Don't log request body - may contain sensitive data
        ip: request.ip,
        userAgent: request.headers['user-agent']?.slice(0, 100),
      }, '[AUDIT] Sensitive operation');
    }
  }
});

// ============================================
// V1 SERVICE INITIALIZATION (unchanged - always runs)
// CRITICAL: This ensures V1 legacy behavior is preserved
// ============================================

// Initialize synchronous services first
initializeWalletService(server);
initializePriceService(server);
initializeZKServices(server);  // ZK LEGO modules (verification + proofs)
initializeProviderService(server);  // LEGO providers for 4 hackathon tracks
initializeAgentService(server);
const walletAddress = getWalletService().getAddress();
server.log.info(`[WalletService] Wallet address: ${walletAddress}`);

// Initialize async services (will sync in background)
initializeMixerService(server).catch((err) => {
  server.log.error({ err }, '[MixerService] Async initialization failed');
});

// ============================================
// V1 API ROUTES (unchanged - always registered)
// ============================================

// Register V1 API routes
server.register(intentRoutes, { prefix: '/api' });
server.register(agentRoutes, { prefix: '/api' });
server.register(mixerRoutes, { prefix: '/api' });
server.register(providerRoutes, { prefix: '/api' });  // LEGO provider routes for 4 tracks

// Register MCP plugin for AI assistant integration
server.register(mcpPlugin);

// ============================================
// V2 MODULE INITIALIZATION (conditional on feature flags)
// Only loads if SNOWRAIL_PROTOCOL=x402 and specific features enabled
// ============================================

async function initializeV2Modules(): Promise<void> {
  if (featureFlags.isLegacyMode) {
    server.log.debug('[V2] Skipping V2 module initialization - legacy mode');
    return;
  }

  server.log.info('[V2] Initializing V2 modules based on feature flags');

  // AP2 Module (Agent Protocol v2)
  if (featureFlags.ap2Enabled) {
    server.log.info('[V2] AP2 module enabled - will initialize when implemented');
    // Future: registry.register(ap2ModuleDefinition);
  }

  // X402 Module (Payment Protocol Extensions)
  if (featureFlags.x402Enabled) {
    server.log.info('[V2] X402 module enabled - will initialize when implemented');
    // Future: registry.register(x402ModuleDefinition);
  }

  // OPA Module (Open Policy Agent)
  if (featureFlags.opaEnabled) {
    server.log.info('[V2] OPA module enabled - will initialize when implemented');
    // Future: registry.register(opaModuleDefinition);
  }

  // Sentinel Module (Monitoring/Alerting)
  if (featureFlags.sentinelEnabled) {
    server.log.info('[V2] Sentinel module enabled - will initialize when implemented');
    // Future: registry.register(sentinelModuleDefinition);
  }

  // EigenLayer Module (AVS Integration)
  if (featureFlags.eigenEnabled) {
    server.log.info('[V2] Eigen module enabled - will initialize when implemented');
    // Future: registry.register(eigenModuleDefinition);
  }

  // Initialize all registered V2 modules
  await registry.initializeAll();
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Basic health check endpoint (unchanged)
server.get<{ Reply: ApiResponse }>('/health', async () => {
  const response: ApiResponse = {
    status: 'success',
    code: 'HEALTH_CHECK_OK',
    message: 'SnowRail Backend on Mantle is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '0.0.1',
      environment: process.env.NODE_ENV || 'development',
      network: process.env.NETWORK_NAME || 'Mantle Sepolia',
      chainId: process.env.CHAIN_ID || '5003',
      // WP1: Add protocol mode info
      protocol: featureFlags.protocol,
      isLegacyMode: featureFlags.isLegacyMode,
    },
  };
  return response;
});

// Health readiness check (includes service initialization)
server.get<{ Reply: ApiResponse }>('/health/ready', async () => {
  // Verify services are initialized
  getWalletService();
  const providerStatus = await getProviderService().getStatus();

  // WP1: Include registry and feature flag status
  const registryStatus = getRegistry().getStatus();
  const flagStatus = getFeatureFlagsStatus();

  const response: ApiResponse = {
    status: 'success',
    code: 'READINESS_CHECK_OK',
    message: 'SnowRail on Mantle - Ready for 4 Hackathon Tracks',
    data: {
      timestamp: new Date().toISOString(),
      // WP1: Foundation status
      foundation: {
        protocol: featureFlags.protocol,
        isLegacyMode: featureFlags.isLegacyMode,
        hasV2Features: featureFlags.hasV2Features,
        registeredModules: registryStatus.totalModules,
        readyModules: registryStatus.readyModules,
      },
      services: {
        wallet: { initialized: true },
        agent: { initialized: true },
        providers: providerStatus,
      },
      environment: {
        network: process.env.NETWORK_NAME || 'Mantle Sepolia',
        chainId: process.env.CHAIN_ID || '5003',
      },
      hackathonTracks: {
        rwa: {
          track: 'RWA / RealFi',
          provider: providerStatus.providers.rwa.type,
          endpoints: ['GET /api/providers/rwa/yield/:asset', 'GET /api/providers/rwa/assets'],
        },
        oracle: {
          track: 'AI & Oracles',
          provider: providerStatus.providers.oracle.type,
          endpoints: ['GET /api/providers/oracle/price/:base/:quote', 'GET /api/providers/oracle/feeds'],
        },
        defi: {
          track: 'DeFi & Composability',
          provider: providerStatus.providers.swap.type,
          endpoints: ['GET /api/providers/swap/quote', 'POST /api/providers/swap/execute'],
        },
        zk: {
          track: 'ZK & Privacy',
          status: await getZKStatus(),
          endpoints: ['GET /api/mixer/info', 'POST /api/mixer/deposit', 'POST /api/mixer/withdraw'],
        },
      },
      endpoints: {
        createIntent: 'POST /api/intents',
        executeIntent: 'POST /api/intents/:id/execute',
        triggerAgent: 'POST /api/agent/trigger',
        providerStatus: 'GET /api/providers/status',
      },
      contracts: {
        settlement: process.env.SETTLEMENT_CONTRACT_ADDRESS || 'pending deployment',
        mixer: process.env.MIXER_CONTRACT_ADDRESS || 'pending deployment',
      },
    },
  };
  return response;
});

// WP1: New foundation status endpoint
server.get<{ Reply: ApiResponse }>('/health/foundation', async () => {
  const envStatus = getEnvConfigStatus();
  const flagStatus = getFeatureFlagsStatus();
  const registryHealth = await getRegistry().checkAllHealth();
  const registryStatus = getRegistry().getStatus();

  const response: ApiResponse = {
    status: registryHealth.overall === 'healthy' ? 'success' : 'warning',
    code: 'FOUNDATION_STATUS',
    message: `WP1 Foundation - ${registryHealth.overall}`,
    data: {
      timestamp: new Date().toISOString(),
      featureFlags: flagStatus.flags,
      environment: {
        initialized: envStatus.initialized,
        network: envStatus.config?.network.name,
        chainId: envStatus.config?.network.chainId,
        isProduction: envStatus.config?.isProduction,
        validation: envStatus.validation,
      },
      registry: {
        status: registryStatus,
        health: registryHealth,
      },
      v2Features: {
        ap2: featureFlags.ap2Enabled,
        x402: featureFlags.x402Enabled,
        opa: featureFlags.opaEnabled,
        sentinel: featureFlags.sentinelEnabled,
        eigen: featureFlags.eigenEnabled,
      },
    },
  };
  return response;
});

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler
server.setErrorHandler((error, request, reply) => {
  const traceId = request.id || 'unknown';

  server.log.error(error);

  const response: ApiResponse = {
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: {
      traceId,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
    },
  };

  reply.code(error.statusCode || 500).send(response);
});

// ============================================
// SERVER STARTUP
// ============================================

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    // WP1: Initialize V2 modules (if any enabled)
    await initializeV2Modules();

    await server.listen({ port, host });
    showBanner(port, process.env.NETWORK_NAME || 'Mantle Sepolia');

    // WP1: Enhanced startup logging
    server.log.info(`Server running on http://${host}:${port}`);
    server.log.info({
      protocol: featureFlags.protocol,
      legacyMode: featureFlags.isLegacyMode,
      v2Features: featureFlags.hasV2Features ? 'enabled' : 'disabled',
    }, '[Foundation] SnowRail ready');

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
  server.log.info('Shutting down gracefully...');

  // WP1: Shutdown registry modules
  try {
    await getRegistry().shutdown();
  } catch (err) {
    server.log.error({ err }, '[Registry] Shutdown error');
  }

  await server.close();
  process.exit(0);
});

start();
