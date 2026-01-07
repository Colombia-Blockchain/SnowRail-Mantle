/**
 * USDY Provider for Mantle Network
 *
 * TRACK: RWA / RealFi
 *
 * Integrates with Ondo Finance's USDY (US Dollar Yield) token
 * which represents tokenized US Treasury exposure.
 *
 * USDY is a real-world asset (RWA) that provides:
 * - Yield from short-dated US Treasuries
 * - Daily rebasing based on treasury yields
 * - Institutional-grade compliance
 */

import { ethers } from 'ethers';
import { IRWAProvider, RWAAssetInfo } from './interfaces';

// ERC20 ABI subset for USDY interactions
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Mantle Token Addresses
const MANTLE_TOKENS = {
  // USDY (Ondo) - May need to be deployed or bridged
  USDY: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
  // mETH (Mantle Staked ETH)
  mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
  // WMNT (Wrapped MNT)
  WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
};

// RWA Asset metadata
const RWA_ASSETS: Record<string, Omit<RWAAssetInfo, 'yieldRate'>> = {
  USDY: {
    symbol: 'USDY',
    name: 'US Dollar Yield',
    decimals: 18,
    contractAddress: MANTLE_TOKENS.USDY,
    underlyingAsset: 'US Treasury Bills',
    issuer: 'Ondo Finance',
  },
  mETH: {
    symbol: 'mETH',
    name: 'Mantle Staked ETH',
    decimals: 18,
    contractAddress: MANTLE_TOKENS.mETH,
    underlyingAsset: 'Ethereum',
    issuer: 'Mantle',
  },
};

export interface USDYProviderConfig {
  rpcUrl: string;
  privateKey?: string;
}

export class USDYProvider implements IRWAProvider {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly contracts: Map<string, ethers.Contract> = new Map();

  // Cache for yield rates (updated every hour)
  private yieldCache: Map<string, { rate: number; expires: number }> = new Map();
  private readonly yieldCacheTTL = 3600000; // 1 hour

  constructor(config: USDYProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Initialize contracts
    for (const [symbol, info] of Object.entries(RWA_ASSETS)) {
      const contract = new ethers.Contract(
        info.contractAddress,
        ERC20_ABI,
        this.signer || this.provider
      );
      this.contracts.set(symbol, contract);
    }
  }

  async getYieldRate(asset: string): Promise<number> {
    const assetUpper = asset.toUpperCase();

    // Check cache
    const cached = this.yieldCache.get(assetUpper);
    if (cached && cached.expires > Date.now()) {
      return cached.rate;
    }

    let yieldRate: number;

    switch (assetUpper) {
      case 'USDY':
        // USDY yield is tied to US Treasury rates
        // For hackathon demo, we simulate fetching from Ondo API
        yieldRate = await this.fetchUSDYYield();
        break;

      case 'METH':
        // mETH yield from Mantle staking
        yieldRate = await this.fetchMETHYield();
        break;

      default:
        throw new Error(`Unknown RWA asset: ${asset}`);
    }

    // Cache the result
    this.yieldCache.set(assetUpper, {
      rate: yieldRate,
      expires: Date.now() + this.yieldCacheTTL,
    });

    return yieldRate;
  }

  async getAssetInfo(asset: string): Promise<RWAAssetInfo> {
    const assetUpper = asset.toUpperCase();
    const baseInfo = RWA_ASSETS[assetUpper];

    if (!baseInfo) {
      throw new Error(`Unknown RWA asset: ${asset}`);
    }

    const yieldRate = await this.getYieldRate(assetUpper);

    return {
      ...baseInfo,
      yieldRate,
    };
  }

  async getBalance(asset: string, address: string): Promise<bigint> {
    const assetUpper = asset.toUpperCase();
    const contract = this.contracts.get(assetUpper);

    if (!contract) {
      throw new Error(`Unknown RWA asset: ${asset}`);
    }

    try {
      const balance = await contract.balanceOf(address);
      return balance;
    } catch (error) {
      console.error(`[USDYProvider] Error getting balance for ${asset}:`, error);
      throw error;
    }
  }

  async approve(asset: string, spender: string, amount: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for approve operation');
    }

    const assetUpper = asset.toUpperCase();
    const contract = this.contracts.get(assetUpper);

    if (!contract) {
      throw new Error(`Unknown RWA asset: ${asset}`);
    }

    try {
      const tx = await contract.approve(spender, amount);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error(`[USDYProvider] Error approving ${asset}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber > 0;
    } catch {
      return false;
    }
  }

  /**
   * Fetch USDY yield rate from Ondo Finance
   * For hackathon: Returns simulated US Treasury yield
   */
  private async fetchUSDYYield(): Promise<number> {
    try {
      // In production, this would call Ondo's API
      // For hackathon demo, simulate based on current US Treasury rates
      // Current 3-month T-bill rate is approximately 5.25%
      const baseYield = 525; // 5.25% in basis points

      // Add small variation based on time (simulating market movement)
      const variation = Math.sin(Date.now() / 86400000) * 10; // +/- 0.1%

      return Math.round(baseYield + variation);
    } catch (error) {
      console.error('[USDYProvider] Error fetching USDY yield:', error);
      // Return default yield on error
      return 500; // 5.00%
    }
  }

  /**
   * Fetch mETH staking yield
   */
  private async fetchMETHYield(): Promise<number> {
    try {
      // mETH yield is approximately 2.8% as of late 2025
      // This would normally be fetched from Mantle's staking contract
      return 280; // 2.8% in basis points
    } catch (error) {
      console.error('[USDYProvider] Error fetching mETH yield:', error);
      return 280;
    }
  }

  /**
   * Get all supported RWA assets
   */
  getSupportedAssets(): string[] {
    return Object.keys(RWA_ASSETS);
  }

  /**
   * Get token address for asset
   */
  getTokenAddress(asset: string): string {
    const assetUpper = asset.toUpperCase();
    const info = RWA_ASSETS[assetUpper];
    if (!info) {
      throw new Error(`Unknown RWA asset: ${asset}`);
    }
    return info.contractAddress;
  }
}

// Export factory function
export function createUSDYProvider(config?: Partial<USDYProviderConfig>): USDYProvider {
  return new USDYProvider({
    rpcUrl: config?.rpcUrl || process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz',
    privateKey: config?.privateKey || process.env.PRIVATE_KEY,
  });
}
