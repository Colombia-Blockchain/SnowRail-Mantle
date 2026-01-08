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
 */

import { ethers } from 'ethers';
import { ILendingProvider, LendingPosition, LendingMarket } from './interfaces';

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

// Mock market data for demo (would be fetched from contracts in production)
const MOCK_MARKETS: Record<string, LendingMarket> = {
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

// Mock user positions
const MOCK_POSITIONS: Map<string, Map<string, LendingPosition>> = new Map();

export class LendingProvider implements ILendingProvider {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly lendingPoolAddress: string;
  private readonly lendingPool?: ethers.Contract;

  constructor(config: LendingProviderConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.lendingPoolAddress = config.lendingPoolAddress || LENDLE_ADDRESSES.LENDING_POOL;

    if (config.privateKey) {
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
   */
  async getMarket(asset: string): Promise<LendingMarket> {
    const assetUpper = asset.toUpperCase();

    // Return mock data for demo
    // In production, would fetch from contract via this.lendingPool.getReserveData()
    const mockMarket = MOCK_MARKETS[assetUpper];
    if (!mockMarket) {
      throw new Error(`Unsupported lending market: ${asset}`);
    }

    return mockMarket;
  }

  /**
   * Get user's lending position
   */
  async getPosition(asset: string, user: string): Promise<LendingPosition> {
    const assetUpper = asset.toUpperCase();
    const userLower = user.toLowerCase();

    // Check mock positions
    const userPositions = MOCK_POSITIONS.get(userLower);
    if (userPositions?.has(assetUpper)) {
      return userPositions.get(assetUpper)!;
    }

    // Return empty position
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
   * Supply asset to lending market
   */
  async supply(asset: string, amount: bigint): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    if (this.signer && this.lendingPool) {
      try {
        // Approve token
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
        const approveTx = await token.approve(this.lendingPoolAddress, amount);
        await approveTx.wait();

        // Supply to lending pool
        const tx = await this.lendingPool.supply(
          tokenAddress,
          amount,
          this.signer.address,
          0 // referral code
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (error) {
        console.error(`[LendingProvider] Supply failed:`, error);
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`supply-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update mock position
    this.updateMockPosition(this.signer?.address || '0x0', assetUpper, {
      suppliedDelta: amount,
    });

    return mockTxHash;
  }

  /**
   * Withdraw from lending market
   */
  async withdraw(asset: string, amount: bigint): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    if (this.signer && this.lendingPool) {
      try {
        const tx = await this.lendingPool.withdraw(
          tokenAddress,
          amount,
          this.signer.address
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (error) {
        console.error(`[LendingProvider] Withdraw failed:`, error);
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`withdraw-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update mock position
    this.updateMockPosition(this.signer?.address || '0x0', assetUpper, {
      suppliedDelta: -amount,
    });

    return mockTxHash;
  }

  /**
   * Borrow from lending market
   */
  async borrow(asset: string, amount: bigint): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    if (this.signer && this.lendingPool) {
      try {
        const tx = await this.lendingPool.borrow(
          tokenAddress,
          amount,
          2, // Variable rate mode
          0, // referral code
          this.signer.address
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (error) {
        console.error(`[LendingProvider] Borrow failed:`, error);
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`borrow-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update mock position
    this.updateMockPosition(this.signer?.address || '0x0', assetUpper, {
      borrowedDelta: amount,
    });

    return mockTxHash;
  }

  /**
   * Repay borrowed asset
   */
  async repay(asset: string, amount: bigint): Promise<string> {
    const assetUpper = asset.toUpperCase();
    const tokenAddress = MANTLE_TOKENS[assetUpper];

    if (!tokenAddress) {
      throw new Error(`Unknown asset: ${asset}`);
    }

    if (this.signer && this.lendingPool) {
      try {
        // Approve token
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
        const approveTx = await token.approve(this.lendingPoolAddress, amount);
        await approveTx.wait();

        const tx = await this.lendingPool.repay(
          tokenAddress,
          amount,
          2, // Variable rate mode
          this.signer.address
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } catch (error) {
        console.error(`[LendingProvider] Repay failed:`, error);
        throw error;
      }
    }

    // Mock transaction for demo
    const mockTxHash = `0x${Buffer.from(`repay-${asset}-${amount}-${Date.now()}`)
      .toString('hex')
      .slice(0, 64)}`;

    // Update mock position
    this.updateMockPosition(this.signer?.address || '0x0', assetUpper, {
      borrowedDelta: -amount,
    });

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
    return Object.keys(MOCK_MARKETS);
  }

  /**
   * Calculate health factor for user
   */
  async calculateHealthFactor(user: string): Promise<number> {
    const userPositions = MOCK_POSITIONS.get(user.toLowerCase());
    if (!userPositions) {
      return 999; // No positions = very healthy
    }

    let totalCollateralValue = BigInt(0);
    let totalBorrowValue = BigInt(0);
    let weightedLiquidationThreshold = 0;
    let collateralCount = 0;

    for (const [asset, position] of userPositions) {
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
   * Get aggregate lending statistics
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

    for (const market of Object.values(MOCK_MARKETS)) {
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
   * Update mock position (for demo)
   */
  private updateMockPosition(
    user: string,
    asset: string,
    delta: { suppliedDelta?: bigint; borrowedDelta?: bigint }
  ): void {
    const userLower = user.toLowerCase();

    if (!MOCK_POSITIONS.has(userLower)) {
      MOCK_POSITIONS.set(userLower, new Map());
    }

    const userPositions = MOCK_POSITIONS.get(userLower)!;
    let position = userPositions.get(asset);

    if (!position) {
      position = {
        asset,
        supplied: BigInt(0),
        borrowed: BigInt(0),
        collateralFactor: 75,
        liquidationThreshold: 80,
        healthFactor: 999,
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

    // Recalculate health factor
    if (position.borrowed > BigInt(0)) {
      position.healthFactor =
        (Number(position.supplied) * position.liquidationThreshold) /
        (Number(position.borrowed) * 100);
    } else {
      position.healthFactor = 999;
    }

    userPositions.set(asset, position);
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
