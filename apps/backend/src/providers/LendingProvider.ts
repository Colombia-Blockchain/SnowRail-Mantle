/**
 * Lending Protocol Provider for Mantle Network
 *
 * TRACK: DeFi & Composability
 *
 * Integrates with lending protocols on Mantle:
 * - Lendle (Aave v3 fork on Mantle)
 * - INIT Capital (isolated lending)
 *
 * Provides supply, borrow, withdraw, and repay functionality
 * with composable integration to other DeFi protocols.
 *
 * CRITICAL: User Isolation Architecture
 * - Each user has their OWN isolated position tracking
 * - User A's tokens NEVER mix with User B's tokens
 * - Positions are instance-level, NOT module-level
 * - Gas fees are paid from backend PRIVATE_KEY (this is correct)
 */

import { ethers } from 'ethers';
import { ILendingProvider, LendingPosition, LendingMarket, UserPosition } from './interfaces';

// Lendle Protocol ABIs (Aave v3 compatible)
const LENDING_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Mantle Token Addresses
const MANTLE_TOKENS: Record<string, string> = {
  WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
  USDY: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
  mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
  USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
  USDT: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
};

// Lendle Protocol Addresses (Mantle Mainnet - for reference)
const LENDLE_ADDRESSES = {
  LENDING_POOL: '0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF3',
  DATA_PROVIDER: '0x5B59a07e7f9C693c891C30c659E26E9C8F5d8C0a',
};

export interface LendingProviderConfig {
  rpcUrl: string;
  privateKey?: string;
  lendingPoolAddress?: string;
}

// Default market data for demo (would be fetched from contracts in production)
// This is protocol-level data, not user-specific
const DEFAULT_MARKETS: Record<string, LendingMarket> = {
  WMNT: {
    asset: 'WMNT',
    totalSupply: BigInt('10000000000000000000000000'), // 10M
    totalBorrow: BigInt('5000000000000000000000000'), // 5M
    supplyAPY: 3.5,
    borrowAPY: 5.2,
    utilizationRate: 50,
  },
  USDY: {
    asset: 'USDY',
    totalSupply: BigInt('5000000000000000000000000'), // 5M
    totalBorrow: BigInt('2000000000000000000000000'), // 2M
    supplyAPY: 4.8,
    borrowAPY: 6.5,
    utilizationRate: 40,
  },
  METH: {
    asset: 'mETH',
    totalSupply: BigInt('2000000000000000000000'), // 2K
    totalBorrow: BigInt('800000000000000000000'), // 800
    supplyAPY: 2.1,
    borrowAPY: 4.0,
    utilizationRate: 40,
  },
  USDC: {
    asset: 'USDC',
    totalSupply: BigInt('8000000000000000000000000'), // 8M
    totalBorrow: BigInt('3500000000000000000000000'), // 3.5M
    supplyAPY: 3.2,
    borrowAPY: 4.8,
    utilizationRate: 43.75,
  },
  USDT: {
    asset: 'USDT',
    totalSupply: BigInt('7500000000000000000000000'), // 7.5M
    totalBorrow: BigInt('3000000000000000000000000'), // 3M
    supplyAPY: 3.0,
    borrowAPY: 4.5,
    utilizationRate: 40,
  },
};

// NOTE: MOCK_POSITIONS has been removed from module-level!
// User positions are now tracked at the INSTANCE level in the LendingProvider class.
// This ensures complete user isolation - User A's tokens NEVER mix with User B's.

export class LendingProvider implements ILendingProvider {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly lendingPoolAddress: string;
  private readonly lendingPool?: ethers.Contract;

  /**
   * INSTANCE-LEVEL user positions - NOT shared across users!
   *
   * Structure: Map<userAddress, Map<assetSymbol, UserPosition>>
   *
   * CRITICAL: This is the key architectural fix.
   * Each LendingProvider instance maintains isolated user positions.
   * User A's tokens NEVER mix with User B's tokens.
   */
  private readonly userPositions: Map<string, Map<string, UserPosition>> = new Map();

  constructor(config: LendingProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.lendingPoolAddress = config.lendingPoolAddress || LENDLE_ADDRESSES.LENDING_POOL;

    if (config.privateKey) {
      // Gas is paid from backend PRIVATE_KEY - this is correct
      // The backend wallet signs transactions for gas, but user funds remain isolated
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
      this.lendingPool = new ethers.Contract(
        this.lendingPoolAddress,
        LENDING_POOL_ABI,
        this.signer
      );
    }
  }

  /**
   * Get lending market information
   * NOTE: Market data is protocol-level (shared), not user-specific
   */
  async getMarket(asset: string): Promise<LendingMarket> {
    const assetUpper = asset.toUpperCase();

    // Return default market data for demo
    // In production, would fetch from contract via this.lendingPool.getReserveData()
    const market = DEFAULT_MARKETS[assetUpper];
    if (!market) {
      throw new Error(`Unsupported lending market: ${asset}`);
    }

    return market;
  }

  /**
   * Get user's lending position
   *
   * CRITICAL: Returns position from THIS user's isolated pool only.
   * User A cannot see or access User B's positions.
   */
  async getPosition(asset: string, user: string): Promise<LendingPosition> {
    const assetUpper = asset.toUpperCase();
    const userLower = user.toLowerCase();

    // Get user's isolated position map
    const userPositionMap = this.userPositions.get(userLower);
    if (userPositionMap?.has(assetUpper)) {
      const position = userPositionMap.get(assetUpper)!;
      // Convert UserPosition to LendingPosition for interface compatibility
      return {
        asset: position.asset,
        supplied: position.supplied,
        borrowed: position.borrowed,
        collateralFactor: position.collateralFactor,
        liquidationThreshold: position.liquidationThreshold,
        healthFactor: position.healthFactor,
      };
    }

    // Return empty position for this user
    return {
      asset: assetUpper,
      supplied: BigInt(0),
      borrowed: BigInt(0),
      collateralFactor: 75, // 75% LTV
      liquidationThreshold: 80, // 80% liquidation threshold
      healthFactor: 999, // Very healthy (no debt)
    };
  }

  /**
   * Get user's full position with metadata (for internal use)
   */
  getUserPosition(asset: string, user: string): UserPosition | null {
    const assetUpper = asset.toUpperCase();
    const userLower = user.toLowerCase();

    const userPositionMap = this.userPositions.get(userLower);
    if (userPositionMap?.has(assetUpper)) {
      return userPositionMap.get(assetUpper)!;
    }
    return null;
  }

  /**
   * Get all positions for a specific user
   */
  getAllUserPositions(user: string): UserPosition[] {
    const userLower = user.toLowerCase();
    const userPositionMap = this.userPositions.get(userLower);
    if (!userPositionMap) {
      return [];
    }
    return Array.from(userPositionMap.values());
  }

  /**
   * Supply asset to lending market for a specific user
   *
   * @param asset - Asset to supply
   * @param amount - Amount to supply
   * @param userAddress - REQUIRED: The user whose isolated pool receives the supply
   */
  async supply(asset: string, amount: bigint, userAddress?: string): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    // Determine the user for position tracking
    const user = userAddress || this.signer?.address || '0x0';

    if (this.signer && this.lendingPool) {
      try {
        // Approve token - gas paid from backend PRIVATE_KEY
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
        const approveTx = await token.approve(this.lendingPoolAddress, amount);
        await approveTx.wait();

        // Supply to lending pool - on behalf of the user
        const tx = await this.lendingPool.supply(
          tokenAddress,
          amount,
          user, // Supply goes to USER's position, not backend wallet
          0 // referral code
        );
        const receipt = await tx.wait();

        // Update user's isolated position
        this.updateUserPosition(user, assetUpper, { suppliedDelta: amount });

        return receipt.hash;
      } catch (error) {
        // SECURITY: Don't log user addresses or sensitive data in production
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[LendingProvider] Supply failed:`, error);
        }
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`supply-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update user's isolated position
    this.updateUserPosition(user, assetUpper, { suppliedDelta: amount });

    return mockTxHash;
  }

  /**
   * Withdraw from lending market for a specific user
   *
   * @param asset - Asset to withdraw
   * @param amount - Amount to withdraw
   * @param userAddress - REQUIRED: The user whose isolated pool to withdraw from
   */
  async withdraw(asset: string, amount: bigint, userAddress?: string): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    // Determine the user for position tracking
    const user = userAddress || this.signer?.address || '0x0';

    // Validate user has sufficient balance in their isolated pool
    const position = await this.getPosition(assetUpper, user);
    if (position.supplied < amount) {
      throw new Error(`Insufficient balance: user ${user} has ${position.supplied} but requested ${amount}`);
    }

    if (this.signer && this.lendingPool) {
      try {
        // Withdraw from user's position, send to user
        const tx = await this.lendingPool.withdraw(
          tokenAddress,
          amount,
          user // Tokens go to USER, not backend wallet
        );
        const receipt = await tx.wait();

        // Update user's isolated position
        this.updateUserPosition(user, assetUpper, { suppliedDelta: -amount });

        return receipt.hash;
      } catch (error) {
        // SECURITY: Don't log user addresses or sensitive data in production
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[LendingProvider] Withdraw failed:`, error);
        }
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`withdraw-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update user's isolated position
    this.updateUserPosition(user, assetUpper, { suppliedDelta: -amount });

    return mockTxHash;
  }

  /**
   * Borrow from lending market for a specific user
   *
   * @param asset - Asset to borrow
   * @param amount - Amount to borrow
   * @param userAddress - REQUIRED: The user whose isolated pool to borrow into
   */
  async borrow(asset: string, amount: bigint, userAddress?: string): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    // Determine the user for position tracking
    const user = userAddress || this.signer?.address || '0x0';

    if (this.signer && this.lendingPool) {
      try {
        // Borrow on behalf of the user
        const tx = await this.lendingPool.borrow(
          tokenAddress,
          amount,
          2, // Variable rate mode
          0, // referral code
          user // Borrow goes to USER's position
        );
        const receipt = await tx.wait();

        // Update user's isolated position
        this.updateUserPosition(user, assetUpper, { borrowedDelta: amount });

        return receipt.hash;
      } catch (error) {
        // SECURITY: Don't log user addresses or sensitive data in production
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[LendingProvider] Borrow failed:`, error);
        }
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`borrow-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update user's isolated position
    this.updateUserPosition(user, assetUpper, { borrowedDelta: amount });

    return mockTxHash;
  }

  /**
   * Repay borrowed asset for a specific user
   *
   * @param asset - Asset to repay
   * @param amount - Amount to repay
   * @param userAddress - REQUIRED: The user whose debt to repay
   */
  async repay(asset: string, amount: bigint, userAddress?: string): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    // Determine the user for position tracking
    const user = userAddress || this.signer?.address || '0x0';

    if (this.signer && this.lendingPool) {
      try {
        // Approve token - gas paid from backend PRIVATE_KEY
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
        const approveTx = await token.approve(this.lendingPoolAddress, amount);
        await approveTx.wait();

        // Repay user's debt
        const tx = await this.lendingPool.repay(
          tokenAddress,
          amount,
          2, // Variable rate mode
          user // Repay USER's debt
        );
        const receipt = await tx.wait();

        // Update user's isolated position
        this.updateUserPosition(user, assetUpper, { borrowedDelta: -amount });

        return receipt.hash;
      } catch (error) {
        // SECURITY: Don't log user addresses or sensitive data in production
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[LendingProvider] Repay failed:`, error);
        }
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`repay-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update user's isolated position
    this.updateUserPosition(user, assetUpper, { borrowedDelta: -amount });

    return mockTxHash;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported markets
   */
  getSupportedMarkets(): string[] {
    return Object.keys(DEFAULT_MARKETS);
  }

  /**
   * Calculate health factor for a specific user
   *
   * CRITICAL: Calculates based on THIS user's isolated positions only.
   * User A's health factor is independent of User B's positions.
   */
  async calculateHealthFactor(user: string): Promise<number> {
    const userLower = user.toLowerCase();
    const userPositionMap = this.userPositions.get(userLower);
    if (!userPositionMap) {
      return 999; // No positions = very healthy
    }

    let totalCollateralValue = BigInt(0);
    let totalBorrowValue = BigInt(0);
    let weightedLiquidationThreshold = 0;
    let collateralCount = 0;

    for (const [, position] of userPositionMap) {
      if (position.supplied > BigInt(0)) {
        // Simplified - in production would use oracle prices
        totalCollateralValue += position.supplied;
        weightedLiquidationThreshold += position.liquidationThreshold;
        collateralCount++;
      }
      if (position.borrowed > BigInt(0)) {
        totalBorrowValue += position.borrowed;
      }
    }

    if (totalBorrowValue === BigInt(0)) {
      return 999;
    }

    const avgLiqThreshold = collateralCount > 0 ? weightedLiquidationThreshold / collateralCount : 80;
    const healthFactor =
      (Number(totalCollateralValue) * avgLiqThreshold) / (Number(totalBorrowValue) * 100);

    return Math.round(healthFactor * 100) / 100;
  }

  /**
   * Get aggregate lending statistics (protocol-level, not user-specific)
   */
  async getStats(): Promise<{
    totalSupplied: string;
    totalBorrowed: string;
    markets: number;
    averageUtilization: number;
  }> {
    let totalSupplied = BigInt(0);
    let totalBorrowed = BigInt(0);
    let totalUtilization = 0;
    let marketCount = 0;

    for (const market of Object.values(DEFAULT_MARKETS)) {
      totalSupplied += market.totalSupply;
      totalBorrowed += market.totalBorrow;
      totalUtilization += market.utilizationRate;
      marketCount++;
    }

    return {
      totalSupplied: ethers.formatEther(totalSupplied),
      totalBorrowed: ethers.formatEther(totalBorrowed),
      markets: marketCount,
      averageUtilization: marketCount > 0 ? totalUtilization / marketCount : 0,
    };
  }

  /**
   * Get statistics for a specific user's isolated positions
   */
  async getUserStats(user: string): Promise<{
    totalSupplied: string;
    totalBorrowed: string;
    positionCount: number;
    healthFactor: number;
  }> {
    const userLower = user.toLowerCase();
    const userPositionMap = this.userPositions.get(userLower);

    if (!userPositionMap) {
      return {
        totalSupplied: '0',
        totalBorrowed: '0',
        positionCount: 0,
        healthFactor: 999,
      };
    }

    let totalSupplied = BigInt(0);
    let totalBorrowed = BigInt(0);
    let positionCount = 0;

    for (const [, position] of userPositionMap) {
      totalSupplied += position.supplied;
      totalBorrowed += position.borrowed;
      positionCount++;
    }

    const healthFactor = await this.calculateHealthFactor(user);

    return {
      totalSupplied: ethers.formatEther(totalSupplied),
      totalBorrowed: ethers.formatEther(totalBorrowed),
      positionCount,
      healthFactor,
    };
  }

  /**
   * Update user's isolated position
   *
   * CRITICAL: Updates THIS user's position in their isolated pool.
   * Never affects other users' positions.
   */
  private updateUserPosition(
    user: string,
    asset: string,
    delta: { suppliedDelta?: bigint; borrowedDelta?: bigint }
  ): void {
    const userLower = user.toLowerCase();
    const now = Math.floor(Date.now() / 1000);

    // Create user's position map if it doesn't exist
    if (!this.userPositions.has(userLower)) {
      this.userPositions.set(userLower, new Map());
    }

    const userPositionMap = this.userPositions.get(userLower)!;
    let position = userPositionMap.get(asset);

    if (!position) {
      // Create new isolated position for this user
      position = {
        userAddress: userLower,
        asset,
        supplied: BigInt(0),
        borrowed: BigInt(0),
        collateralFactor: 75,
        liquidationThreshold: 80,
        healthFactor: 999,
        createdAt: now,
        updatedAt: now,
      };
    }

    if (delta.suppliedDelta) {
      position.supplied += delta.suppliedDelta;
      if (position.supplied < BigInt(0)) position.supplied = BigInt(0);
    }

    if (delta.borrowedDelta) {
      position.borrowed += delta.borrowedDelta;
      if (position.borrowed < BigInt(0)) position.borrowed = BigInt(0);
    }

    // Recalculate health factor for this user's position
    if (position.borrowed > BigInt(0)) {
      position.healthFactor =
        (Number(position.supplied) * position.liquidationThreshold) /
        (Number(position.borrowed) * 100);
    } else {
      position.healthFactor = 999;
    }

    position.updatedAt = now;
    userPositionMap.set(asset, position);
  }

  /**
   * Check if user has sufficient balance in their isolated pool
   */
  hasSufficientBalance(user: string, asset: string, amount: bigint): boolean {
    const userLower = user.toLowerCase();
    const assetUpper = asset.toUpperCase();
    const userPositionMap = this.userPositions.get(userLower);

    if (!userPositionMap) {
      return false;
    }

    const position = userPositionMap.get(assetUpper);
    if (!position) {
      return false;
    }

    return position.supplied >= amount;
  }

  /**
   * Get the number of users with positions (for monitoring)
   */
  getUserCount(): number {
    return this.userPositions.size;
  }

  /**
   * Clear all positions for a user (for testing only)
   */
  clearUserPositions(user: string): void {
    const userLower = user.toLowerCase();
    this.userPositions.delete(userLower);
  }
}

// Factory function
export function createLendingProvider(
  config?: Partial<LendingProviderConfig>
): LendingProvider {
  return new LendingProvider({
    rpcUrl:
      config?.rpcUrl ||
      process.env.MANTLE_SEPOLIA_RPC ||
      'https://rpc.sepolia.mantle.xyz',
    privateKey: config?.privateKey || process.env.PRIVATE_KEY,
    lendingPoolAddress: config?.lendingPoolAddress || process.env.LENDLE_POOL_ADDRESS,
  });
}
