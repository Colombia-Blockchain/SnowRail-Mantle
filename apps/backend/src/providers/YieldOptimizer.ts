/**
 * Yield Optimizer Provider for Mantle Network
 *
 * TRACK: DeFi & Composability
 *
 * Provides composable yield strategies by combining:
 * - Lending protocols (Lendle, INIT)
 * - DEX liquidity (Merchant Moe)
 * - RWA yields (USDY, mETH)
 *
 * Optimizes for best risk-adjusted returns across protocols.
 */

import { ethers } from 'ethers';
import { IYieldOptimizer, YieldStrategy } from './interfaces';

// Predefined yield strategies
const YIELD_STRATEGIES: YieldStrategy[] = [
  {
    id: 'stable-yield',
    name: 'Stable Yield Strategy',
    assets: ['USDY', 'USDC', 'USDT'],
    expectedAPY: 5.5,
    riskLevel: 'low',
    protocols: ['Lendle', 'USDY'],
  },
  {
    id: 'mnt-staking',
    name: 'MNT Staking Optimizer',
    assets: ['WMNT', 'MNT'],
    expectedAPY: 8.2,
    riskLevel: 'medium',
    protocols: ['Lendle', 'Merchant Moe'],
  },
  {
    id: 'eth-yield',
    name: 'ETH Yield Maximizer',
    assets: ['mETH', 'WETH'],
    expectedAPY: 6.8,
    riskLevel: 'medium',
    protocols: ['mETH Staking', 'Lendle'],
  },
  {
    id: 'lp-optimizer',
    name: 'LP Yield Optimizer',
    assets: ['WMNT', 'USDC'],
    expectedAPY: 15.5,
    riskLevel: 'high',
    protocols: ['Merchant Moe LP', 'Lendle'],
  },
  {
    id: 'rwa-defi-hybrid',
    name: 'RWA-DeFi Hybrid',
    assets: ['USDY', 'mETH', 'WMNT'],
    expectedAPY: 7.2,
    riskLevel: 'medium',
    protocols: ['USDY', 'mETH Staking', 'Lendle'],
  },
];

export interface YieldOptimizerConfig {
  rpcUrl: string;
  privateKey?: string;
}

// User positions in strategies
interface StrategyPosition {
  strategyId: string;
  user: string;
  deposited: bigint;
  depositTimestamp: number;
  currentValue: bigint;
  earnedYield: bigint;
}

// In-memory position tracking for demo
const STRATEGY_POSITIONS: Map<string, StrategyPosition> = new Map();

export class YieldOptimizer implements IYieldOptimizer {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;

  constructor(config: YieldOptimizerConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
  }

  /**
   * Get all available yield strategies
   */
  async getStrategies(): Promise<YieldStrategy[]> {
    // In production, this would fetch real-time APYs from protocols
    return YIELD_STRATEGIES.map((strategy) => ({
      ...strategy,
      // Add slight variation to simulate real-time updates
      expectedAPY: strategy.expectedAPY + (Math.random() - 0.5) * 0.5,
    }));
  }

  /**
   * Get optimal strategy for a given asset and amount
   */
  async getOptimalStrategy(asset: string, amount: bigint): Promise<YieldStrategy> {
    const assetUpper = asset.toUpperCase();

    // Find strategies that support this asset
    const compatibleStrategies = YIELD_STRATEGIES.filter((s) =>
      s.assets.some((a) => a.toUpperCase() === assetUpper)
    );

    if (compatibleStrategies.length === 0) {
      throw new Error(`No strategies available for asset: ${asset}`);
    }

    // For large amounts (>100k), prefer lower risk strategies
    const amountInEth = Number(amount) / 1e18;
    let filteredStrategies = compatibleStrategies;

    if (amountInEth > 100000) {
      // Large amounts - prefer low/medium risk
      filteredStrategies = compatibleStrategies.filter(
        (s) => s.riskLevel === 'low' || s.riskLevel === 'medium'
      );
    }

    if (filteredStrategies.length === 0) {
      filteredStrategies = compatibleStrategies;
    }

    // Sort by risk-adjusted APY (Sharpe-like ratio simulation)
    const riskMultiplier: Record<string, number> = {
      low: 1.0,
      medium: 0.85,
      high: 0.7,
    };

    const ranked = filteredStrategies
      .map((s) => ({
        strategy: s,
        score: s.expectedAPY * riskMultiplier[s.riskLevel],
      }))
      .sort((a, b) => b.score - a.score);

    return ranked[0].strategy;
  }

  /**
   * Deposit into a yield strategy
   */
  async deposit(
    strategyId: string,
    asset: string,
    amount: bigint
  ): Promise<string> {
    const strategy = YIELD_STRATEGIES.find((s) => s.id === strategyId);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyId}`);
    }

    const assetUpper = asset.toUpperCase();
    if (!strategy.assets.some((a) => a.toUpperCase() === assetUpper)) {
      throw new Error(`Asset ${asset} not supported by strategy ${strategyId}`);
    }

    const user = this.signer?.address || '0x0';
    const positionKey = `${user}-${strategyId}`;

    // Get or create position
    let position = STRATEGY_POSITIONS.get(positionKey);
    if (!position) {
      position = {
        strategyId,
        user,
        deposited: BigInt(0),
        depositTimestamp: Math.floor(Date.now() / 1000),
        currentValue: BigInt(0),
        earnedYield: BigInt(0),
      };
    }

    // Update position
    position.deposited += amount;
    position.currentValue = position.deposited;
    STRATEGY_POSITIONS.set(positionKey, position);

    // In production, this would execute actual protocol interactions
    const mockTxHash = `0x${Buffer.from(
      `deposit-${strategyId}-${asset}-${amount}-${Date.now()}`
    )
      .toString('hex')
      .slice(0, 64)}`;

    return mockTxHash;
  }

  /**
   * Withdraw from a yield strategy
   */
  async withdraw(strategyId: string, amount: bigint): Promise<string> {
    const user = this.signer?.address || '0x0';
    const positionKey = `${user}-${strategyId}`;

    const position = STRATEGY_POSITIONS.get(positionKey);
    if (!position) {
      throw new Error('No position found in this strategy');
    }

    if (amount > position.currentValue) {
      throw new Error('Insufficient balance in strategy');
    }

    // Update position
    const withdrawRatio = Number(amount) / Number(position.currentValue);
    position.deposited -= BigInt(Math.floor(Number(position.deposited) * withdrawRatio));
    position.currentValue -= amount;

    if (position.currentValue === BigInt(0)) {
      STRATEGY_POSITIONS.delete(positionKey);
    } else {
      STRATEGY_POSITIONS.set(positionKey, position);
    }

    const mockTxHash = `0x${Buffer.from(
      `withdraw-${strategyId}-${amount}-${Date.now()}`
    )
      .toString('hex')
      .slice(0, 64)}`;

    return mockTxHash;
  }

  /**
   * Get current position in a strategy
   */
  async getPosition(
    strategyId: string,
    user: string
  ): Promise<{
    deposited: bigint;
    currentValue: bigint;
    earnedYield: bigint;
  }> {
    const positionKey = `${user.toLowerCase()}-${strategyId}`;
    const position = STRATEGY_POSITIONS.get(positionKey);

    if (!position) {
      return {
        deposited: BigInt(0),
        currentValue: BigInt(0),
        earnedYield: BigInt(0),
      };
    }

    // Calculate accrued yield
    const strategy = YIELD_STRATEGIES.find((s) => s.id === strategyId);
    if (strategy) {
      const timeElapsed =
        Math.floor(Date.now() / 1000) - position.depositTimestamp;
      const yearlyRate = strategy.expectedAPY / 100;
      const secondsPerYear = 365 * 24 * 60 * 60;

      // Simple yield calculation
      const yieldAccrued =
        (Number(position.deposited) * yearlyRate * timeElapsed) / secondsPerYear;

      position.earnedYield = BigInt(Math.floor(yieldAccrued));
      position.currentValue = position.deposited + position.earnedYield;
    }

    return {
      deposited: position.deposited,
      currentValue: position.currentValue,
      earnedYield: position.earnedYield,
    };
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): YieldStrategy | undefined {
    return YIELD_STRATEGIES.find((s) => s.id === strategyId);
  }

  /**
   * Get all positions for a user
   */
  async getAllPositions(user: string): Promise<
    Array<{
      strategy: YieldStrategy;
      deposited: bigint;
      currentValue: bigint;
      earnedYield: bigint;
    }>
  > {
    const positions: Array<{
      strategy: YieldStrategy;
      deposited: bigint;
      currentValue: bigint;
      earnedYield: bigint;
    }> = [];

    for (const strategy of YIELD_STRATEGIES) {
      const position = await this.getPosition(strategy.id, user);
      if (position.deposited > BigInt(0)) {
        positions.push({
          strategy,
          ...position,
        });
      }
    }

    return positions;
  }

  /**
   * Simulate rebalancing between strategies
   */
  async simulateRebalance(
    user: string,
    targetAllocations: Array<{ strategyId: string; percentage: number }>
  ): Promise<{
    currentAllocations: Array<{ strategyId: string; percentage: number; value: string }>;
    proposedActions: Array<{
      action: 'deposit' | 'withdraw';
      strategyId: string;
      amount: string;
    }>;
    expectedAPYChange: number;
  }> {
    const positions = await this.getAllPositions(user);
    const totalValue = positions.reduce(
      (sum, p) => sum + Number(p.currentValue),
      0
    );

    const currentAllocations = positions.map((p) => ({
      strategyId: p.strategy.id,
      percentage: totalValue > 0 ? (Number(p.currentValue) / totalValue) * 100 : 0,
      value: ethers.formatEther(p.currentValue),
    }));

    // Calculate proposed actions
    const proposedActions: Array<{
      action: 'deposit' | 'withdraw';
      strategyId: string;
      amount: string;
    }> = [];

    for (const target of targetAllocations) {
      const current = currentAllocations.find(
        (c) => c.strategyId === target.strategyId
      );
      const currentPct = current?.percentage || 0;
      const diff = target.percentage - currentPct;

      if (Math.abs(diff) > 1) {
        // Only rebalance if >1% difference
        const amount = Math.abs((diff / 100) * totalValue);
        proposedActions.push({
          action: diff > 0 ? 'deposit' : 'withdraw',
          strategyId: target.strategyId,
          amount: ethers.formatEther(BigInt(Math.floor(amount * 1e18))),
        });
      }
    }

    // Calculate expected APY change
    const currentAPY = positions.reduce((sum, p) => {
      const weight = totalValue > 0 ? Number(p.currentValue) / totalValue : 0;
      return sum + p.strategy.expectedAPY * weight;
    }, 0);

    const targetAPY = targetAllocations.reduce((sum, t) => {
      const strategy = YIELD_STRATEGIES.find((s) => s.id === t.strategyId);
      return sum + (strategy?.expectedAPY || 0) * (t.percentage / 100);
    }, 0);

    return {
      currentAllocations,
      proposedActions,
      expectedAPYChange: targetAPY - currentAPY,
    };
  }

  /**
   * Get aggregate optimizer stats
   */
  async getStats(): Promise<{
    totalValueLocked: string;
    activeStrategies: number;
    averageAPY: number;
    totalUsers: number;
  }> {
    let totalValueLocked = BigInt(0);
    const activeStrategies = new Set<string>();
    const users = new Set<string>();
    let totalAPY = 0;
    let positionCount = 0;

    for (const [key, position] of STRATEGY_POSITIONS) {
      totalValueLocked += position.currentValue;
      activeStrategies.add(position.strategyId);
      users.add(position.user);

      const strategy = YIELD_STRATEGIES.find(
        (s) => s.id === position.strategyId
      );
      if (strategy) {
        totalAPY += strategy.expectedAPY;
        positionCount++;
      }
    }

    return {
      totalValueLocked: ethers.formatEther(totalValueLocked),
      activeStrategies: activeStrategies.size,
      averageAPY: positionCount > 0 ? totalAPY / positionCount : 0,
      totalUsers: users.size,
    };
  }
}

// Factory function
export function createYieldOptimizer(
  config?: Partial<YieldOptimizerConfig>
): YieldOptimizer {
  return new YieldOptimizer({
    rpcUrl:
      config?.rpcUrl ||
      process.env.MANTLE_SEPOLIA_RPC ||
      'https://rpc.sepolia.mantle.xyz',
    privateKey: config?.privateKey || process.env.PRIVATE_KEY,
  });
}
