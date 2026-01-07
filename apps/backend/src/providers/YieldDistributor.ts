/**
 * Yield Distributor Provider for Mantle Network
 *
 * TRACK: RWA / RealFi
 *
 * Handles yield calculation and distribution for RWA tokens like USDY and mETH.
 * This provider tracks yield accrual and manages distribution to token holders.
 */

import { ethers } from 'ethers';
import {
  IYieldDistributor,
  YieldDistribution,
  IRWAProvider,
} from './interfaces';

// Yield Distribution Events ABI
const YIELD_DISTRIBUTOR_ABI = [
  'event YieldDistributed(address indexed recipient, address indexed asset, uint256 amount, uint256 timestamp)',
  'function pendingYield(address asset, address holder) view returns (uint256)',
  'function claimYield(address asset) returns (uint256)',
  'function getTotalDistributed(address asset) view returns (uint256)',
];

export interface YieldDistributorConfig {
  rpcUrl: string;
  privateKey?: string;
  distributorAddress?: string;
  rwaProvider: IRWAProvider;
}

// In-memory tracking for demo (would be on-chain in production)
interface YieldRecord {
  recipient: string;
  asset: string;
  balance: bigint;
  lastClaimTimestamp: number;
  pendingYield: bigint;
}

export class YieldDistributor implements IYieldDistributor {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly rwaProvider: IRWAProvider;
  private readonly distributorAddress?: string;

  // In-memory yield tracking (demo purposes)
  private yieldRecords: Map<string, YieldRecord> = new Map();
  private distributionHistory: YieldDistribution[] = [];
  private totalDistributed: Map<string, bigint> = new Map();

  // Yield calculation constants
  private readonly SECONDS_PER_YEAR = 31536000;
  private readonly BASIS_POINTS = 10000;

  constructor(config: YieldDistributorConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.rwaProvider = config.rwaProvider;
    this.distributorAddress = config.distributorAddress;

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Calculate pending yield for an address based on their RWA holdings
   */
  async calculatePendingYield(asset: string, holder: string): Promise<bigint> {
    const recordKey = `${asset.toLowerCase()}-${holder.toLowerCase()}`;
    let record = this.yieldRecords.get(recordKey);

    // Get current balance
    const currentBalance = await this.rwaProvider.getBalance(asset, holder);

    // Get yield rate (in basis points)
    const yieldRate = await this.rwaProvider.getYieldRate(asset);

    if (!record) {
      // First time tracking this holder
      record = {
        recipient: holder,
        asset: asset.toUpperCase(),
        balance: currentBalance,
        lastClaimTimestamp: Math.floor(Date.now() / 1000),
        pendingYield: BigInt(0),
      };
      this.yieldRecords.set(recordKey, record);
      return BigInt(0);
    }

    // Calculate time elapsed since last claim
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeElapsed = currentTimestamp - record.lastClaimTimestamp;

    // Calculate yield accrued:
    // yield = balance * (yieldRate / BASIS_POINTS) * (timeElapsed / SECONDS_PER_YEAR)
    // To maintain precision with BigInt, we rearrange:
    // yield = balance * yieldRate * timeElapsed / (BASIS_POINTS * SECONDS_PER_YEAR)

    const averageBalance = (record.balance + currentBalance) / BigInt(2);
    const yieldAccrued =
      (averageBalance * BigInt(yieldRate) * BigInt(timeElapsed)) /
      BigInt(this.BASIS_POINTS * this.SECONDS_PER_YEAR);

    // Update record
    record.balance = currentBalance;
    record.pendingYield = record.pendingYield + yieldAccrued;
    record.lastClaimTimestamp = currentTimestamp;
    this.yieldRecords.set(recordKey, record);

    return record.pendingYield;
  }

  /**
   * Distribute yield to multiple holders
   */
  async distributeYield(
    asset: string,
    recipients: string[]
  ): Promise<YieldDistribution[]> {
    const distributions: YieldDistribution[] = [];
    const currentTimestamp = Math.floor(Date.now() / 1000);

    for (const recipient of recipients) {
      const pendingYield = await this.calculatePendingYield(asset, recipient);

      if (pendingYield > BigInt(0)) {
        const distribution: YieldDistribution = {
          recipient,
          amount: pendingYield,
          asset: asset.toUpperCase(),
          period: {
            start:
              this.yieldRecords.get(
                `${asset.toLowerCase()}-${recipient.toLowerCase()}`
              )?.lastClaimTimestamp || currentTimestamp - 86400,
            end: currentTimestamp,
          },
        };

        // In production, this would execute an on-chain transaction
        // For demo, we simulate the distribution
        if (this.signer && this.distributorAddress) {
          try {
            const txHash = await this.executeOnChainDistribution(
              asset,
              recipient,
              pendingYield
            );
            distribution.txHash = txHash;
          } catch (error) {
            console.error(
              `[YieldDistributor] Failed to distribute to ${recipient}:`,
              error
            );
          }
        } else {
          // Mock transaction hash for demo
          distribution.txHash = `0x${Buffer.from(
            `${recipient}-${asset}-${currentTimestamp}`
          )
            .toString('hex')
            .slice(0, 64)}`;
        }

        distributions.push(distribution);
        this.distributionHistory.push(distribution);

        // Update total distributed
        const assetKey = asset.toUpperCase();
        const currentTotal = this.totalDistributed.get(assetKey) || BigInt(0);
        this.totalDistributed.set(assetKey, currentTotal + pendingYield);

        // Reset pending yield for this recipient
        const recordKey = `${asset.toLowerCase()}-${recipient.toLowerCase()}`;
        const record = this.yieldRecords.get(recordKey);
        if (record) {
          record.pendingYield = BigInt(0);
          this.yieldRecords.set(recordKey, record);
        }
      }
    }

    return distributions;
  }

  /**
   * Get historical yield distributions for a holder
   */
  async getDistributionHistory(
    asset: string,
    holder: string
  ): Promise<YieldDistribution[]> {
    return this.distributionHistory.filter(
      (d) =>
        d.asset.toUpperCase() === asset.toUpperCase() &&
        d.recipient.toLowerCase() === holder.toLowerCase()
    );
  }

  /**
   * Get total yield distributed for an asset
   */
  async getTotalDistributed(asset: string): Promise<bigint> {
    return this.totalDistributed.get(asset.toUpperCase()) || BigInt(0);
  }

  /**
   * Execute on-chain yield distribution (production implementation)
   */
  private async executeOnChainDistribution(
    asset: string,
    recipient: string,
    amount: bigint
  ): Promise<string> {
    if (!this.signer || !this.distributorAddress) {
      throw new Error('Signer and distributor address required');
    }

    const contract = new ethers.Contract(
      this.distributorAddress,
      YIELD_DISTRIBUTOR_ABI,
      this.signer
    );

    const tx = await contract.claimYield(recipient);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get yield statistics for an asset
   */
  async getYieldStats(asset: string): Promise<{
    totalDistributed: string;
    holdersTracked: number;
    averageYield: string;
    currentRate: number;
  }> {
    const assetUpper = asset.toUpperCase();
    const totalDistributed = this.totalDistributed.get(assetUpper) || BigInt(0);

    // Count holders for this asset
    let holdersTracked = 0;
    let totalPending = BigInt(0);

    for (const [key, record] of this.yieldRecords.entries()) {
      if (key.startsWith(asset.toLowerCase())) {
        holdersTracked++;
        totalPending += record.pendingYield;
      }
    }

    const currentRate = await this.rwaProvider.getYieldRate(asset);

    return {
      totalDistributed: ethers.formatEther(totalDistributed),
      holdersTracked,
      averageYield:
        holdersTracked > 0
          ? ethers.formatEther(totalPending / BigInt(holdersTracked))
          : '0',
      currentRate: currentRate / 100, // Convert basis points to percentage
    };
  }

  /**
   * Simulate yield accrual for testing (advances time)
   */
  async simulateYieldAccrual(
    asset: string,
    holder: string,
    daysToSimulate: number
  ): Promise<bigint> {
    const recordKey = `${asset.toLowerCase()}-${holder.toLowerCase()}`;
    let record = this.yieldRecords.get(recordKey);

    if (!record) {
      // Initialize record first
      await this.calculatePendingYield(asset, holder);
      record = this.yieldRecords.get(recordKey);
    }

    if (record) {
      // Backdate the last claim timestamp to simulate time passing
      record.lastClaimTimestamp -= daysToSimulate * 86400;
      this.yieldRecords.set(recordKey, record);
    }

    // Recalculate with the new "elapsed" time
    return this.calculatePendingYield(asset, holder);
  }
}

// Factory function
export function createYieldDistributor(
  rwaProvider: IRWAProvider,
  config?: Partial<Omit<YieldDistributorConfig, 'rwaProvider'>>
): YieldDistributor {
  return new YieldDistributor({
    rpcUrl:
      config?.rpcUrl ||
      process.env.MANTLE_SEPOLIA_RPC ||
      'https://rpc.sepolia.mantle.xyz',
    privateKey: config?.privateKey || process.env.PRIVATE_KEY,
    distributorAddress: config?.distributorAddress,
    rwaProvider,
  });
}
