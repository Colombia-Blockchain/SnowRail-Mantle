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

dotenv.config();

interface ApiResponse<T = Record<string, unknown> | null> {
  status: 'success' | 'warning' | 'error';
  code: string;
  message: string;
  data?: T;
  details?: Record<string, unknown>;
}

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
});

// Add BigInt serialization support for JSON responses
// This fixes the "Do not know how to serialize a BigInt" error
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// Security middleware
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

// Register API routes
server.register(intentRoutes, { prefix: '/api' });
server.register(agentRoutes, { prefix: '/api' });
server.register(mixerRoutes, { prefix: '/api' });
server.register(providerRoutes, { prefix: '/api' });  // LEGO provider routes for 4 tracks

// Register MCP plugin for AI assistant integration
server.register(mcpPlugin);

// Health check endpoint
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
    },
  };
  return response;
});

// Health readiness check (includes service initialization)
server.get<{ Reply: ApiResponse }>('/health/ready', async () => {
  // Verify services are initialized
  getWalletService();
  const providerStatus = await getProviderService().getStatus();

  const response: ApiResponse = {
    status: 'success',
    code: 'READINESS_CHECK_OK',
    message: 'SnowRail on Mantle - Ready for 4 Hackathon Tracks',
    data: {
      timestamp: new Date().toISOString(),
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

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    showBanner(port, process.env.NETWORK_NAME || 'Mantle Sepolia');
    server.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Shutting down gracefully...');
  await server.close();
  process.exit(0);
});

start();

