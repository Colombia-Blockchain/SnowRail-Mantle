/**
 * User Pool Service for SnowRail on Mantle
 *
 * CRITICAL: User Isolation Architecture
 *
 * This service ensures complete isolation between users:
 * - User A's tokens NEVER mix with User B's tokens
 * - Each user has their own isolated pool state
 * - Deposits, withdrawals, and positions are tracked per-user
 * - Gas fees are paid from backend PRIVATE_KEY (this is correct)
 *
 * This is the central service for managing user-isolated pool state.
 */

import { UserPool, UserPosition, IUserPoolService } from '../providers/interfaces';

/**
 * UserPoolService - Manages user-isolated pool states
 *
 * ARCHITECTURE:
 * - Each user has a completely isolated UserPool
 * - UserPool contains deposits and borrows per asset
 * - UserPosition tracks individual asset positions within a user's pool
 * - No shared state between users
 */
export class UserPoolService implements IUserPoolService {
  /**
   * INSTANCE-LEVEL user pools - NOT shared across users!
   *
   * Structure: Map<userAddress (lowercase), UserPool>
   *
   * CRITICAL: This is the key architectural feature.
   * Each user has their own isolated pool.
   */
  private readonly userPools: Map<string, UserPool> = new Map();

  /**
   * Get or create a user's isolated pool
   *
   * @param userAddress - The user's wallet address
   * @returns The user's isolated pool (created if doesn't exist)
   */
  getUserPool(userAddress: string): UserPool {
    const userLower = userAddress.toLowerCase();

    if (!this.userPools.has(userLower)) {
      // Create new isolated pool for this user
      const now = Math.floor(Date.now() / 1000);
      const newPool: UserPool = {
        userAddress: userLower,
        deposits: new Map(),
        borrows: new Map(),
        createdAt: now,
        lastActivityAt: now,
      };
      this.userPools.set(userLower, newPool);
    }

    return this.userPools.get(userLower)!;
  }

  /**
   * Deposit to user's isolated pool
   *
   * CRITICAL: Only affects THIS user's pool.
   * User A depositing does NOT affect User B's pool.
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol (e.g., 'USDY', 'WMNT')
   * @param amount - Amount to deposit (in wei)
   */
  depositToPool(userAddress: string, asset: string, amount: bigint): void {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.getUserPool(userLower);

    const currentDeposit = pool.deposits.get(assetUpper) || BigInt(0);
    pool.deposits.set(assetUpper, currentDeposit + amount);
    pool.lastActivityAt = Math.floor(Date.now() / 1000);

    this.userPools.set(userLower, pool);
  }

  /**
   * Withdraw from user's isolated pool
   *
   * CRITICAL: Only affects THIS user's pool.
   * User A withdrawing does NOT affect User B's pool.
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol (e.g., 'USDY', 'WMNT')
   * @param amount - Amount to withdraw (in wei)
   * @throws Error if insufficient balance
   */
  withdrawFromPool(userAddress: string, asset: string, amount: bigint): void {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.getUserPool(userLower);

    const currentDeposit = pool.deposits.get(assetUpper) || BigInt(0);

    if (currentDeposit < amount) {
      throw new Error(
        `Insufficient balance: user ${userLower} has ${currentDeposit} ${assetUpper} but requested ${amount}`
      );
    }

    pool.deposits.set(assetUpper, currentDeposit - amount);
    pool.lastActivityAt = Math.floor(Date.now() / 1000);

    this.userPools.set(userLower, pool);
  }

  /**
   * Borrow from user's isolated pool (creates debt)
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol
   * @param amount - Amount to borrow (in wei)
   */
  borrowFromPool(userAddress: string, asset: string, amount: bigint): void {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.getUserPool(userLower);

    const currentBorrow = pool.borrows.get(assetUpper) || BigInt(0);
    pool.borrows.set(assetUpper, currentBorrow + amount);
    pool.lastActivityAt = Math.floor(Date.now() / 1000);

    this.userPools.set(userLower, pool);
  }

  /**
   * Repay to user's isolated pool (reduces debt)
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol
   * @param amount - Amount to repay (in wei)
   */
  repayToPool(userAddress: string, asset: string, amount: bigint): void {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.getUserPool(userLower);

    const currentBorrow = pool.borrows.get(assetUpper) || BigInt(0);
    const newBorrow = currentBorrow > amount ? currentBorrow - amount : BigInt(0);
    pool.borrows.set(assetUpper, newBorrow);
    pool.lastActivityAt = Math.floor(Date.now() / 1000);

    this.userPools.set(userLower, pool);
  }

  /**
   * Get user's position for a specific asset
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol
   * @returns UserPosition or null if no position exists
   */
  getUserPosition(userAddress: string, asset: string): UserPosition | null {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return null;
    }

    const supplied = pool.deposits.get(assetUpper) || BigInt(0);
    const borrowed = pool.borrows.get(assetUpper) || BigInt(0);

    // If no position in this asset, return null
    if (supplied === BigInt(0) && borrowed === BigInt(0)) {
      return null;
    }

    // Calculate health factor
    let healthFactor = 999;
    if (borrowed > BigInt(0)) {
      healthFactor = (Number(supplied) * 80) / (Number(borrowed) * 100);
    }

    return {
      userAddress: userLower,
      asset: assetUpper,
      supplied,
      borrowed,
      collateralFactor: 75,
      liquidationThreshold: 80,
      healthFactor,
      createdAt: pool.createdAt,
      updatedAt: pool.lastActivityAt,
    };
  }

  /**
   * Get all positions for a user
   *
   * @param userAddress - The user's wallet address
   * @returns Array of all UserPositions for this user
   */
  getAllUserPositions(userAddress: string): UserPosition[] {
    const userLower = userAddress.toLowerCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return [];
    }

    const positions: UserPosition[] = [];
    const assets = new Set([...pool.deposits.keys(), ...pool.borrows.keys()]);

    for (const asset of assets) {
      const position = this.getUserPosition(userLower, asset);
      if (position) {
        positions.push(position);
      }
    }

    return positions;
  }

  /**
   * Check if user has sufficient balance in their isolated pool
   *
   * @param userAddress - The user's wallet address
   * @param asset - Asset symbol
   * @param amount - Amount to check
   * @returns true if user has sufficient balance
   */
  hasSufficientBalance(userAddress: string, asset: string, amount: bigint): boolean {
    const userLower = userAddress.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return false;
    }

    const currentDeposit = pool.deposits.get(assetUpper) || BigInt(0);
    return currentDeposit >= amount;
  }

  /**
   * Get user's total collateral value (for health factor calculations)
   *
   * @param userAddress - The user's wallet address
   * @returns Total collateral value in wei
   */
  getUserTotalCollateral(userAddress: string): bigint {
    const userLower = userAddress.toLowerCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return BigInt(0);
    }

    let total = BigInt(0);
    for (const [, value] of pool.deposits) {
      total += value;
    }

    return total;
  }

  /**
   * Get user's total debt value
   *
   * @param userAddress - The user's wallet address
   * @returns Total debt value in wei
   */
  getUserTotalDebt(userAddress: string): bigint {
    const userLower = userAddress.toLowerCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return BigInt(0);
    }

    let total = BigInt(0);
    for (const [, value] of pool.borrows) {
      total += value;
    }

    return total;
  }

  /**
   * Calculate health factor for user's entire pool
   *
   * @param userAddress - The user's wallet address
   * @returns Health factor (999 if no debt)
   */
  calculateUserHealthFactor(userAddress: string): number {
    const totalCollateral = this.getUserTotalCollateral(userAddress);
    const totalDebt = this.getUserTotalDebt(userAddress);

    if (totalDebt === BigInt(0)) {
      return 999;
    }

    // Health factor = (collateral * liquidation threshold) / debt
    const healthFactor = (Number(totalCollateral) * 80) / (Number(totalDebt) * 100);
    return Math.round(healthFactor * 100) / 100;
  }

  /**
   * Get summary statistics for a user's pool
   */
  getUserPoolSummary(userAddress: string): {
    userAddress: string;
    totalDeposits: string;
    totalBorrows: string;
    positionCount: number;
    healthFactor: number;
    createdAt: number;
    lastActivityAt: number;
  } {
    const userLower = userAddress.toLowerCase();
    const pool = this.userPools.get(userLower);

    if (!pool) {
      return {
        userAddress: userLower,
        totalDeposits: '0',
        totalBorrows: '0',
        positionCount: 0,
        healthFactor: 999,
        createdAt: 0,
        lastActivityAt: 0,
      };
    }

    const totalDeposits = this.getUserTotalCollateral(userAddress);
    const totalBorrows = this.getUserTotalDebt(userAddress);
    const positions = this.getAllUserPositions(userAddress);

    return {
      userAddress: userLower,
      totalDeposits: totalDeposits.toString(),
      totalBorrows: totalBorrows.toString(),
      positionCount: positions.length,
      healthFactor: this.calculateUserHealthFactor(userAddress),
      createdAt: pool.createdAt,
      lastActivityAt: pool.lastActivityAt,
    };
  }

  /**
   * Get the number of users with pools (for monitoring)
   */
  getTotalUserCount(): number {
    return this.userPools.size;
  }

  /**
   * Get all user addresses with pools (for monitoring/admin)
   */
  getAllUserAddresses(): string[] {
    return Array.from(this.userPools.keys());
  }

  /**
   * Check if a user has any pool state
   */
  hasUserPool(userAddress: string): boolean {
    return this.userPools.has(userAddress.toLowerCase());
  }

  /**
   * Clear a user's pool (for testing only)
   */
  clearUserPool(userAddress: string): void {
    this.userPools.delete(userAddress.toLowerCase());
  }

  /**
   * Clear all pools (for testing only)
   */
  clearAllPools(): void {
    this.userPools.clear();
  }
}

// Singleton instance for the service
let userPoolServiceInstance: UserPoolService | null = null;

/**
 * Get the singleton instance of UserPoolService
 */
export function getUserPoolService(): UserPoolService {
  if (!userPoolServiceInstance) {
    userPoolServiceInstance = new UserPoolService();
  }
  return userPoolServiceInstance;
}

/**
 * Create a new UserPoolService instance (for testing)
 */
export function createUserPoolService(): UserPoolService {
  return new UserPoolService();
}

// Default export
export default UserPoolService;
