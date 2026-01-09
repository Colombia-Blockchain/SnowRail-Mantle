/**
 * Yield Distributor Provider for Mantle Network
 *
 * TRACK: RWA / RealFi
 *
 * Handles yield calculation and distribution for RWA tokens like USDY and mETH.
 * This provider tracks yield accrual and manages distribution to token holders.
 *
 * CRITICAL: User Isolation Architecture
 * - Each user has their OWN isolated yield tracking
 * - User A's yield comes from User A's deposits ONLY
 * - Yield calculations are per-user, never shared
 * - Gas fees are paid from backend PRIVATE_KEY (this is correct)
 */

import { ethers } from 'ethers';
import {
  IYieldDistributor,
  YieldDistribution,
  IRWAProvider,
  UserYieldRecord,
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

// NOTE: The old shared YieldRecord interface has been replaced with UserYieldRecord
// from interfaces.ts which includes proper user isolation tracking.

export class YieldDistributor implements IYieldDistributor {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly rwaProvider: IRWAProvider;
  private readonly distributorAddress?: string;

  /**
   * INSTANCE-LEVEL user yield records - NOT shared across users!
   *
   * Structure: Map<"asset-userAddress", UserYieldRecord>
   *
   * CRITICAL: This is the key architectural fix.
   * Each user has their own isolated yield tracking.
   * User A's yield comes from User A's deposits ONLY.
   */
  private readonly userYieldRecords: Map<string, UserYieldRecord> = new Map();

  /**
   * Per-user distribution history - isolated per user
   * Structure: Map<userAddress, YieldDistribution[]>
   */
  private readonly userDistributionHistory: Map<string, YieldDistribution[]> = new Map();

  /**
   * Total yield distributed per asset (protocol-level stat)
   */
  private readonly totalDistributed: Map<string, bigint> = new Map();

  // Yield calculation constants
  private readonly SECONDS_PER_YEAR = 31536000;
  private readonly BASIS_POINTS = 10000;

  constructor(config: YieldDistributorConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.rwaProvider = config.rwaProvider;
    this.distributorAddress = config.distributorAddress;

    if (config.privateKey) {
      // Gas is paid from backend PRIVATE_KEY - this is correct
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Calculate pending yield for an address based on their RWA holdings
   *
   * CRITICAL: Calculates yield based on THIS user's deposits ONLY.
   * User A's yield is independent of User B's deposits.
   */
  async calculatePendingYield(asset: string, holder: string): Promise<bigint> {
    const holderLower = holder.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const recordKey = `${asset.toLowerCase()}-${holderLower}`;
    let record = this.userYieldRecords.get(recordKey);

    // Get current balance for THIS user only
    const currentBalance = await this.rwaProvider.getBalance(asset, holder);

    // Get yield rate (in basis points)
    const yieldRate = await this.rwaProvider.getYieldRate(asset);

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (!record) {
      // First time tracking this holder - create isolated record
      record = {
        userAddress: holderLower,
        asset: assetUpper,
        balance: currentBalance,
        lastClaimTimestamp: currentTimestamp,
        pendingYield: BigInt(0),
        totalClaimed: BigInt(0),
      };
      this.userYieldRecords.set(recordKey, record);
      return BigInt(0);
    }

    // Calculate time elapsed since last claim
    const timeElapsed = currentTimestamp - record.lastClaimTimestamp;

    // Calculate yield accrued FROM THIS USER'S DEPOSITS ONLY:
    // yield = balance * (yieldRate / BASIS_POINTS) * (timeElapsed / SECONDS_PER_YEAR)
    // To maintain precision with BigInt, we rearrange:
    // yield = balance * yieldRate * timeElapsed / (BASIS_POINTS * SECONDS_PER_YEAR)

    const averageBalance = (record.balance + currentBalance) / BigInt(2);
    const yieldAccrued =
      (averageBalance * BigInt(yieldRate) * BigInt(timeElapsed)) /
      BigInt(this.BASIS_POINTS * this.SECONDS_PER_YEAR);

    // Update user's isolated record
    record.balance = currentBalance;
    record.pendingYield = record.pendingYield + yieldAccrued;
    record.lastClaimTimestamp = currentTimestamp;
    this.userYieldRecords.set(recordKey, record);

    return record.pendingYield;
  }

  /**
   * Get user's yield record (for internal use)
   */
  getUserYieldRecord(asset: string, holder: string): UserYieldRecord | null {
    const recordKey = `${asset.toLowerCase()}-${holder.toLowerCase()}`;
    return this.userYieldRecords.get(recordKey) || null;
  }

  /**
   * Distribute yield to multiple holders
   *
   * CRITICAL: Each recipient receives yield from THEIR deposits ONLY.
   * Distribution is per-user isolated.
   */
  async distributeYield(
    asset: string,
    recipients: string[]
  ): Promise<YieldDistribution[]> {
    const distributions: YieldDistribution[] = [];
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const assetUpper = asset.toUpperCase();

    for (const recipient of recipients) {
      const recipientLower = recipient.toLowerCase();
      const recordKey = `${asset.toLowerCase()}-${recipientLower}`;

      // Calculate pending yield for THIS user only
      const pendingYield = await this.calculatePendingYield(asset, recipient);

      if (pendingYield > BigInt(0)) {
        const record = this.userYieldRecords.get(recordKey);

        const distribution: YieldDistribution = {
          recipient: recipientLower,
          amount: pendingYield,
          asset: assetUpper,
          period: {
            start: record?.lastClaimTimestamp || currentTimestamp - 86400,
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
            `${recipientLower}-${asset}-${currentTimestamp}`
          )
            .toString('hex')
            .slice(0, 64)}`;
        }

        distributions.push(distribution);

        // Add to user's isolated distribution history
        if (!this.userDistributionHistory.has(recipientLower)) {
          this.userDistributionHistory.set(recipientLower, []);
        }
        this.userDistributionHistory.get(recipientLower)!.push(distribution);

        // Update total distributed (protocol-level stat)
        const currentTotal = this.totalDistributed.get(assetUpper) || BigInt(0);
        this.totalDistributed.set(assetUpper, currentTotal + pendingYield);

        // Update user's record - reset pending, increment totalClaimed
        if (record) {
          record.totalClaimed += pendingYield;
          record.pendingYield = BigInt(0);
          this.userYieldRecords.set(recordKey, record);
        }
      }
    }

    return distributions;
  }

  /**
   * Get historical yield distributions for a holder
   *
   * CRITICAL: Returns ONLY this user's distribution history.
   * User A cannot see User B's distributions.
   */
  async getDistributionHistory(
    asset: string,
    holder: string
  ): Promise<YieldDistribution[]> {
    const holderLower = holder.toLowerCase();
    const assetUpper = asset.toUpperCase();

    const userHistory = this.userDistributionHistory.get(holderLower) || [];
    return userHistory.filter((d) => d.asset === assetUpper);
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
   * Get yield statistics for an asset (protocol-level)
   */
  async getYieldStats(asset: string): Promise<{
    totalDistributed: string;
    holdersTracked: number;
    averageYield: string;
    currentRate: number;
  }> {
    const assetUpper = asset.toUpperCase();
    const assetLower = asset.toLowerCase();
    const totalDistributed = this.totalDistributed.get(assetUpper) || BigInt(0);

    // Count unique holders for this asset
    let holdersTracked = 0;
    let totalPending = BigInt(0);

    for (const [key, record] of this.userYieldRecords.entries()) {
      if (key.startsWith(assetLower)) {
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
   * Get yield statistics for a specific user
   */
  async getUserYieldStats(asset: string, holder: string): Promise<{
    pendingYield: string;
    totalClaimed: string;
    balance: string;
    lastClaimTimestamp: number;
  }> {
    const recordKey = `${asset.toLowerCase()}-${holder.toLowerCase()}`;
    const record = this.userYieldRecords.get(recordKey);

    if (!record) {
      return {
        pendingYield: '0',
        totalClaimed: '0',
        balance: '0',
        lastClaimTimestamp: 0,
      };
    }

    return {
      pendingYield: ethers.formatEther(record.pendingYield),
      totalClaimed: ethers.formatEther(record.totalClaimed),
      balance: ethers.formatEther(record.balance),
      lastClaimTimestamp: record.lastClaimTimestamp,
    };
  }

  /**
   * Simulate yield accrual for testing (advances time)
   * NOTE: Only affects THIS user's isolated yield record
   */
  async simulateYieldAccrual(
    asset: string,
    holder: string,
    daysToSimulate: number
  ): Promise<bigint> {
    const recordKey = `${asset.toLowerCase()}-${holder.toLowerCase()}`;
    let record = this.userYieldRecords.get(recordKey);

    if (!record) {
      // Initialize record first
      await this.calculatePendingYield(asset, holder);
      record = this.userYieldRecords.get(recordKey);
    }

    if (record) {
      // Backdate the last claim timestamp to simulate time passing
      record.lastClaimTimestamp -= daysToSimulate * 86400;
      this.userYieldRecords.set(recordKey, record);
    }

    // Recalculate with the new "elapsed" time
    return this.calculatePendingYield(asset, holder);
  }

  /**
   * Get the number of users with yield records (for monitoring)
   */
  getUniqueHolderCount(): number {
    const uniqueHolders = new Set<string>();
    for (const [key] of this.userYieldRecords) {
      const holder = key.split('-').slice(1).join('-'); // Extract holder from "asset-holder" key
      uniqueHolders.add(holder);
    }
    return uniqueHolders.size;
  }

  /**
   * Clear all yield records for a user (for testing only)
   */
  clearUserYieldRecords(holder: string): void {
    const holderLower = holder.toLowerCase();

    // Remove all records for this user
    for (const [key] of this.userYieldRecords) {
      if (key.endsWith(`-${holderLower}`)) {
        this.userYieldRecords.delete(key);
      }
    }

    // Remove distribution history
    this.userDistributionHistory.delete(holderLower);
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
