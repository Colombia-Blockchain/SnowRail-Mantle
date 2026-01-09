/**
 * Eigen Provider Factory
 *
 * Creates LEGO-swappable Eigen providers based on configuration.
 *
 * Available providers:
 * - avs: Production EigenLayer AVS integration (on-chain attestations)
 * - local: Local signing for attestations (no external infrastructure)
 * - mock: Development/testing only
 */

import { IEigenProvider } from './interfaces/IEigenProvider';
import { EigenAVSProvider, EigenAVSConfig } from './providers/EigenAVSProvider';
import { LocalAttestationProvider, LocalAttestationConfig } from './providers/LocalAttestationProvider';
import { MockEigenProvider, MockEigenConfig } from './providers/MockEigenProvider';

export type EigenProviderType = 'avs' | 'local' | 'mock';

export interface EigenFactoryConfig {
  type: EigenProviderType;
  avs?: EigenAVSConfig;
  local?: LocalAttestationConfig;
  mock?: MockEigenConfig;
}

interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Create an Eigen provider based on configuration
 */
export function createEigenProvider(
  config: EigenFactoryConfig,
  logger?: Logger
): IEigenProvider {
  switch (config.type) {
    case 'avs':
      if (!config.avs) {
        throw new Error('AVS config required for Eigen AVS provider');
      }
      return new EigenAVSProvider(config.avs, logger);

    case 'local':
      if (!config.local) {
        throw new Error('Local config required for Eigen local provider');
      }
      return new LocalAttestationProvider(config.local, logger);

    case 'mock':
    default:
      return new MockEigenProvider(config.mock);
  }
}

/**
 * Build Eigen configuration from environment variables
 */
export function buildEigenConfigFromEnv(): EigenFactoryConfig {
  const envType = process.env.EIGEN_PROVIDER as EigenProviderType | undefined;

  // Check for required credentials
  const hasPrivateKey = !!process.env.EIGEN_SIGNER_KEY || !!process.env.AGENT_PRIVATE_KEY;
  const hasAVSRegistry = !!process.env.EIGEN_AVS_REGISTRY_ADDRESS;

  // Auto-select provider: AVS > Local > Mock
  let type: EigenProviderType;
  if (envType) {
    type = envType;
  } else if (hasPrivateKey && hasAVSRegistry) {
    type = 'avs';
  } else if (hasPrivateKey) {
    type = 'local';
  } else {
    type = 'mock';
  }

  const chainId = parseInt(process.env.CHAIN_ID || '5003', 10);
  const attestationValidityPeriod = parseInt(process.env.EIGEN_ATTESTATION_TTL || '3600', 10);
  const privateKey = process.env.EIGEN_SIGNER_KEY || process.env.AGENT_PRIVATE_KEY;

  return {
    type,

    // AVS Provider (production - on-chain attestations)
    avs: hasPrivateKey && hasAVSRegistry
      ? {
          rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz',
          signerPrivateKey: privateKey!,
          avsRegistryAddress: process.env.EIGEN_AVS_REGISTRY_ADDRESS!,
          operatorName: process.env.EIGEN_OPERATOR_NAME || 'SnowRail AVS Operator',
          chainId,
          attestationValidityPeriod,
          supportedIntents: ['payment', 'swap', 'stake', 'lend', 'transfer', 'approve', 'custom'],
        }
      : undefined,

    // Local Provider (no external infrastructure)
    local: hasPrivateKey
      ? {
          signerPrivateKey: privateKey!,
          operatorName: process.env.EIGEN_OPERATOR_NAME || 'SnowRail Operator',
          chainId,
          attestationValidityPeriod,
        }
      : undefined,

    // Mock Provider (development/testing only)
    mock: {
      operatorName: process.env.EIGEN_OPERATOR_NAME || 'Mock Operator',
      alwaysVerify: process.env.EIGEN_MOCK_VERIFY !== 'false',
      attestationValidityPeriod,
      simulatedDelay: parseInt(process.env.EIGEN_MOCK_DELAY || '0', 10),
    },
  };
}
