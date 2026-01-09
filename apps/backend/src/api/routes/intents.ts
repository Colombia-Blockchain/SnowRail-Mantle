import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createIntent,
  getIntents,
  getIntentById,
  executeIntent,
  prepareDeposit,
  confirmDeposit,
} from "../controllers/intent-controller";
import { requirePermission, AuthenticatedRequest } from "../../middleware/auth-middleware";

/**
 * Intent Routes
 *
 * SECURITY:
 * - All routes check authentication via global middleware
 * - Write operations (POST) require 'write' permission
 * - Execute operations require 'execute' permission
 * - Read operations (GET) require 'read' permission
 *
 * Authentication is enforced globally when ENABLE_AUTH=true
 * Route-specific permission checks are applied below
 */
export async function intentRoutes(fastify: FastifyInstance) {
  const isAuthEnabled = process.env.ENABLE_AUTH !== 'false';

  // Register routes with optional permission checks
  // Using addHook at route level for cleaner type handling

  if (isAuthEnabled) {
    // Add permission checks as route-level hooks
    fastify.addHook('preHandler', async (request: AuthenticatedRequest, reply) => {
      const url = request.url;
      const method = request.method;

      // Skip if already handled by global auth
      if (!request.auth || request.auth.type === 'none') {
        // Global auth middleware will handle 401
        return;
      }

      // Determine required permission based on route
      let requiredPermission: string | null = null;

      if (method === 'GET') {
        requiredPermission = 'read';
      } else if (method === 'POST') {
        if (url.includes('/execute')) {
          requiredPermission = 'execute';
        } else {
          requiredPermission = 'write';
        }
      }

      // Check permission
      if (requiredPermission && !request.auth.permissions?.includes(requiredPermission)) {
        reply.code(403).send({
          status: 'error',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires '${requiredPermission}' permission`,
        });
        return;
      }
    });
  }

  // Register routes (same as original)
  fastify.post("/intents", createIntent);
  fastify.get("/intents", getIntents);
  fastify.get("/intents/:id", getIntentById);
  fastify.post("/intents/:id/deposit", prepareDeposit);
  fastify.post("/intents/:id/confirm-deposit", confirmDeposit);
  fastify.post("/intents/:id/execute", executeIntent);

  // Log security configuration
  if (!isAuthEnabled) {
    fastify.log.warn(
      '[IntentRoutes] SECURITY WARNING: Authentication is DISABLED. Set ENABLE_AUTH=true in production!'
    );
  } else {
    fastify.log.info('[IntentRoutes] Authentication enabled for intent routes');
  }
}
