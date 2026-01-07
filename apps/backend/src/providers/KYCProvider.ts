/**
 * KYC Provider for Mantle Network
 *
 * TRACK: RWA / RealFi
 *
 * Provides KYC verification services for RWA token compliance.
 * Integrates with on-chain KYC attestations and off-chain verification services.
 *
 * For hackathon demo, this implements a mock KYC service that can be
 * swapped with production KYC providers like:
 * - Ondo ID (for USDY holders)
 * - Chainlink CCIP for cross-chain KYC
 * - Civic, WorldID, etc.
 */

import { ethers } from 'ethers';
import { IKYCProvider, KYCStatus } from './interfaces';

// KYC Attestation Contract ABI (simplified)
const KYC_ATTESTATION_ABI = [
  'function getKYCLevel(address user) view returns (uint8)',
  'function isKYCValid(address user) view returns (bool)',
  'function kycExpiry(address user) view returns (uint256)',
  'event KYCUpdated(address indexed user, uint8 level, uint256 expiry)',
];

export interface KYCProviderConfig {
  rpcUrl: string;
  attestationContract?: string;
  apiEndpoint?: string;
  apiKey?: string;
}

// KYC level mapping
const KYC_LEVELS: Record<number, KYCStatus['level']> = {
  0: 'none',
  1: 'basic',
  2: 'enhanced',
  3: 'institutional',
};

// Mock KYC database for demo
const MOCK_KYC_DB: Map<string, KYCStatus> = new Map();

export class KYCProvider implements IKYCProvider {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly attestationContract?: ethers.Contract;
  private readonly apiEndpoint?: string;
  private readonly apiKey?: string;

  constructor(config: KYCProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;

    if (config.attestationContract) {
      this.attestationContract = new ethers.Contract(
        config.attestationContract,
        KYC_ATTESTATION_ABI,
        this.provider
      );
    }

    // Initialize some mock KYC entries for demo
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Demo wallets with various KYC levels
    const demoWallets = [
      {
        address: '0x0000000000000000000000000000000000000001',
        level: 'basic' as const,
        jurisdiction: 'US',
      },
      {
        address: '0x0000000000000000000000000000000000000002',
        level: 'enhanced' as const,
        jurisdiction: 'EU',
      },
      {
        address: '0x0000000000000000000000000000000000000003',
        level: 'institutional' as const,
        jurisdiction: 'SG',
      },
    ];

    for (const wallet of demoWallets) {
      MOCK_KYC_DB.set(wallet.address.toLowerCase(), {
        address: wallet.address,
        verified: true,
        level: wallet.level,
        provider: 'SnowRail Mock KYC',
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        jurisdiction: wallet.jurisdiction,
      });
    }
  }

  /**
   * Get KYC status for an address
   */
  async getKYCStatus(address: string): Promise<KYCStatus> {
    const normalizedAddress = address.toLowerCase();

    // First, check on-chain attestation if available
    if (this.attestationContract) {
      try {
        const onChainStatus = await this.getOnChainKYCStatus(address);
        if (onChainStatus.verified) {
          return onChainStatus;
        }
      } catch (error) {
        console.log('[KYCProvider] On-chain check failed, falling back to mock');
      }
    }

    // Check mock database
    const mockStatus = MOCK_KYC_DB.get(normalizedAddress);
    if (mockStatus) {
      // Check if expired
      if (mockStatus.expiresAt && mockStatus.expiresAt < Math.floor(Date.now() / 1000)) {
        return {
          address,
          verified: false,
          level: 'none',
          provider: 'SnowRail Mock KYC',
        };
      }
      return mockStatus;
    }

    // Return unverified status for unknown addresses
    return {
      address,
      verified: false,
      level: 'none',
      provider: 'SnowRail Mock KYC',
    };
  }

  /**
   * Check on-chain KYC attestation
   */
  private async getOnChainKYCStatus(address: string): Promise<KYCStatus> {
    if (!this.attestationContract) {
      throw new Error('No attestation contract configured');
    }

    const [level, isValid, expiry] = await Promise.all([
      this.attestationContract.getKYCLevel(address),
      this.attestationContract.isKYCValid(address),
      this.attestationContract.kycExpiry(address),
    ]);

    return {
      address,
      verified: isValid,
      level: KYC_LEVELS[Number(level)] || 'none',
      provider: 'On-Chain Attestation',
      expiresAt: Number(expiry),
    };
  }

  /**
   * Check if address meets minimum KYC level requirement
   */
  async meetsRequirement(
    address: string,
    minLevel: KYCStatus['level']
  ): Promise<boolean> {
    const status = await this.getKYCStatus(address);

    if (!status.verified) {
      return false;
    }

    const levelOrder: KYCStatus['level'][] = ['none', 'basic', 'enhanced', 'institutional'];
    const userLevelIndex = levelOrder.indexOf(status.level);
    const requiredLevelIndex = levelOrder.indexOf(minLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * Get KYC attestation for on-chain verification
   */
  async getAttestation(address: string): Promise<{
    signature: string;
    expiry: number;
    level: KYCStatus['level'];
  }> {
    const status = await this.getKYCStatus(address);

    if (!status.verified) {
      throw new Error('Address not KYC verified');
    }

    // Generate attestation signature
    // In production, this would be signed by a trusted KYC oracle
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
    const message = ethers.solidityPackedKeccak256(
      ['address', 'uint8', 'uint256'],
      [address, ['none', 'basic', 'enhanced', 'institutional'].indexOf(status.level), expiry]
    );

    // Mock signature for demo
    const mockSignature = `0x${'ab'.repeat(65)}`;

    return {
      signature: mockSignature,
      expiry,
      level: status.level,
    };
  }

  /**
   * Register KYC status (for demo purposes)
   */
  async registerKYC(
    address: string,
    level: KYCStatus['level'],
    jurisdiction?: string
  ): Promise<KYCStatus> {
    const status: KYCStatus = {
      address,
      verified: level !== 'none',
      level,
      provider: 'SnowRail Mock KYC',
      expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
      jurisdiction,
    };

    MOCK_KYC_DB.set(address.toLowerCase(), status);
    return status;
  }

  /**
   * Get all KYC'd addresses (for demo)
   */
  async getAllVerifiedAddresses(): Promise<string[]> {
    const addresses: string[] = [];
    for (const [address, status] of MOCK_KYC_DB) {
      if (status.verified) {
        addresses.push(address);
      }
    }
    return addresses;
  }

  /**
   * Get KYC statistics
   */
  async getStats(): Promise<{
    totalVerified: number;
    byLevel: Record<KYCStatus['level'], number>;
    byJurisdiction: Record<string, number>;
  }> {
    const stats = {
      totalVerified: 0,
      byLevel: { none: 0, basic: 0, enhanced: 0, institutional: 0 },
      byJurisdiction: {} as Record<string, number>,
    };

    for (const [, status] of MOCK_KYC_DB) {
      if (status.verified) {
        stats.totalVerified++;
        stats.byLevel[status.level]++;
        if (status.jurisdiction) {
          stats.byJurisdiction[status.jurisdiction] =
            (stats.byJurisdiction[status.jurisdiction] || 0) + 1;
        }
      }
    }

    return stats;
  }
}

// Factory function
export function createKYCProvider(
  config?: Partial<KYCProviderConfig>
): KYCProvider {
  return new KYCProvider({
    rpcUrl:
      config?.rpcUrl ||
      process.env.MANTLE_SEPOLIA_RPC ||
      'https://rpc.sepolia.mantle.xyz',
    attestationContract: config?.attestationContract || process.env.KYC_ATTESTATION_CONTRACT,
    apiEndpoint: config?.apiEndpoint || process.env.KYC_API_ENDPOINT,
    apiKey: config?.apiKey || process.env.KYC_API_KEY,
  });
}
