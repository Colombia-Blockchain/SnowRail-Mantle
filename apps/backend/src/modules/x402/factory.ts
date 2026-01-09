/**
 * x402 Handler Factory
 *
 * Creates LEGO-swappable x402 handlers based on configuration.
 */

import { IX402Handler } from './interfaces/IX402Provider';
import { X402Handler, X402HandlerConfig } from './providers/X402Handler';
import { MockX402Handler, MockX402Config } from './providers/MockX402Handler';

export type X402HandlerType = 'production' | 'mock';

export interface X402FactoryConfig {
  type: X402HandlerType;
  production?: X402HandlerConfig;
  mock?: MockX402Config;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

/**
 * Create an x402 handler based on configuration
 */
export function createX402Handler(
  config: X402FactoryConfig,
  logger?: Logger
): IX402Handler {
  switch (config.type) {
    case 'production':
      if (!config.production) {
        throw new Error('Production config required for x402 production handler');
      }
      return new X402Handler(config.production, logger);

    case 'mock':
    default:
      return new MockX402Handler(config.mock);
  }
}

/**
 * Build x402 configuration from environment variables
 */
export function buildX402ConfigFromEnv(): X402FactoryConfig {
  const type = (process.env.X402_HANDLER as X402HandlerType) || 'mock';

  return {
    type,
    production: {
      chainId: parseInt(process.env.CHAIN_ID || '5003', 10),
      rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz',
      recipientAddress: process.env.X402_RECIPIENT_ADDRESS || process.env.WALLET_ADDRESS || '',
      signerPrivateKey: process.env.X402_SIGNER_KEY || process.env.AGENT_PRIVATE_KEY,
      defaultAccessDuration: parseInt(process.env.X402_ACCESS_DURATION || '3600', 10),
      challengeValidity: parseInt(process.env.X402_CHALLENGE_VALIDITY || '300', 10),
    },
    mock: {
      acceptAll: process.env.X402_MOCK_ACCEPT_ALL === 'true',
      defaultAccessDuration: parseInt(process.env.X402_ACCESS_DURATION || '3600', 10),
      challengeValidity: parseInt(process.env.X402_CHALLENGE_VALIDITY || '300', 10),
      simulatedDelay: parseInt(process.env.X402_MOCK_DELAY || '0', 10),
    },
  };
}
