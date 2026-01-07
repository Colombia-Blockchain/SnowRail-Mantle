/**
 * Multi-Oracle Consensus Provider for Mantle Network
 *
 * TRACK: AI & Oracles
 *
 * Aggregates price data from multiple oracle sources and provides
 * consensus pricing with deviation detection. Integrates:
 * - Pyth Network (primary)
 * - Chainlink (fallback)
 * - DEX TWAPs (validation)
 *
 * Features:
 * - Weighted median pricing
 * - Outlier detection
 * - Confidence scoring
 * - Alert system for price deviations
 */

import { ethers } from 'ethers';
import {
  IMultiOracleProvider,
  IOracleProvider,
  OracleConsensus,
  PriceData,
} from './interfaces';

// Oracle source weights (higher = more trusted)
const DEFAULT_WEIGHTS: Record<string, number> = {
  pyth: 0.4,
  chainlink: 0.35,
  dex_twap: 0.25,
};

export interface MultiOracleConfig {
  rpcUrl: string;
  deviationThreshold?: number; // Max allowed deviation between sources (percentage)
  minSources?: number; // Minimum number of sources required
}

// Mock price sources for demo
interface PriceSource {
  provider: string;
  getPrice: (base: string, quote: string) => Promise<PriceData>;
  weight: number;
}

export class MultiOracleProvider implements IMultiOracleProvider {
  private sources: PriceSource[] = [];
  private deviationThreshold: number;
  private readonly minSources: number;
  private readonly provider: ethers.JsonRpcProvider;

  // Alert tracking
  private alertHistory: Array<{
    pair: string;
    deviation: number;
    timestamp: number;
    sources: OracleConsensus['sources'];
  }> = [];

  constructor(config: MultiOracleConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.deviationThreshold = config.deviationThreshold || 5; // 5% default
    this.minSources = config.minSources || 2;

    // Initialize default mock sources for demo
    this.initializeDefaultSources();
  }

  /**
   * Initialize default oracle sources
   */
  private initializeDefaultSources(): void {
    // Pyth-like source (primary)
    this.sources.push({
      provider: 'pyth',
      weight: DEFAULT_WEIGHTS.pyth,
      getPrice: async (base: string, quote: string): Promise<PriceData> => {
        // Simulate Pyth oracle data
        const basePrices: Record<string, number> = {
          ETH: 3500,
          BTC: 98000,
          MNT: 0.85,
          USDY: 1.052,
          mETH: 3520,
        };

        const price = basePrices[base.toUpperCase()] || 1;
        // Add slight variation
        const variation = (Math.random() - 0.5) * price * 0.001;

        return {
          price: price + variation,
          confidence: 0.95 + Math.random() * 0.04,
          timestamp: Math.floor(Date.now() / 1000),
          source: 'Pyth Network',
        };
      },
    });

    // Chainlink-like source (secondary)
    this.sources.push({
      provider: 'chainlink',
      weight: DEFAULT_WEIGHTS.chainlink,
      getPrice: async (base: string, quote: string): Promise<PriceData> => {
        // Simulate Chainlink oracle data (slightly different timing)
        const basePrices: Record<string, number> = {
          ETH: 3500,
          BTC: 98000,
          MNT: 0.85,
          USDY: 1.052,
          mETH: 3520,
        };

        const price = basePrices[base.toUpperCase()] || 1;
        // Chainlink typically has slightly delayed prices
        const variation = (Math.random() - 0.5) * price * 0.002;

        return {
          price: price + variation,
          confidence: 0.92 + Math.random() * 0.05,
          timestamp: Math.floor(Date.now() / 1000) - 5, // 5 second delay
          source: 'Chainlink',
        };
      },
    });

    // DEX TWAP source (tertiary)
    this.sources.push({
      provider: 'dex_twap',
      weight: DEFAULT_WEIGHTS.dex_twap,
      getPrice: async (base: string, quote: string): Promise<PriceData> => {
        // Simulate DEX TWAP data (more volatile)
        const basePrices: Record<string, number> = {
          ETH: 3500,
          BTC: 98000,
          MNT: 0.85,
          USDY: 1.052,
          mETH: 3520,
        };

        const price = basePrices[base.toUpperCase()] || 1;
        // DEX prices can be more volatile
        const variation = (Math.random() - 0.5) * price * 0.005;

        return {
          price: price + variation,
          confidence: 0.85 + Math.random() * 0.1,
          timestamp: Math.floor(Date.now() / 1000),
          source: 'Merchant Moe TWAP',
        };
      },
    });
  }

  /**
   * Add a new oracle source
   */
  addSource(provider: IOracleProvider, weight: number): void {
    this.sources.push({
      provider: 'custom',
      weight,
      getPrice: async (base: string, quote: string) =>
        provider.getPrice(base, quote),
    });
  }

  /**
   * Get deviation threshold
   */
  getDeviationThreshold(): number {
    return this.deviationThreshold;
  }

  /**
   * Set deviation threshold
   */
  setDeviationThreshold(threshold: number): void {
    this.deviationThreshold = threshold;
  }

  /**
   * Get consensus price from multiple oracles
   */
  async getConsensusPrice(base: string, quote: string): Promise<OracleConsensus> {
    if (this.sources.length < this.minSources) {
      throw new Error(
        `Insufficient oracle sources. Required: ${this.minSources}, Available: ${this.sources.length}`
      );
    }

    // Fetch prices from all sources
    const priceResults = await Promise.allSettled(
      this.sources.map(async (source) => {
        const priceData = await source.getPrice(base, quote);
        return {
          provider: source.provider,
          price: priceData.price,
          weight: source.weight,
          confidence: priceData.confidence,
          timestamp: priceData.timestamp,
        };
      })
    );

    // Filter successful results
    const successfulPrices = priceResults
      .filter(
        (r): r is PromiseFulfilledResult<{
          provider: string;
          price: number;
          weight: number;
          confidence: number;
          timestamp: number;
        }> => r.status === 'fulfilled'
      )
      .map((r) => r.value);

    if (successfulPrices.length < this.minSources) {
      throw new Error(
        `Too few oracle responses. Required: ${this.minSources}, Received: ${successfulPrices.length}`
      );
    }

    // Calculate weighted median price
    const consensusPrice = this.calculateWeightedMedian(
      successfulPrices.map((p) => ({ value: p.price, weight: p.weight }))
    );

    // Calculate deviation
    const prices = successfulPrices.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const deviation = ((maxPrice - minPrice) / consensusPrice) * 100;

    // Check for excessive deviation and log alert
    if (deviation > this.deviationThreshold) {
      this.alertHistory.push({
        pair: `${base}/${quote}`,
        deviation,
        timestamp: Math.floor(Date.now() / 1000),
        sources: successfulPrices.map((p) => ({
          provider: p.provider,
          price: p.price,
          weight: p.weight,
        })),
      });
    }

    return {
      price: consensusPrice,
      sources: successfulPrices.map((p) => ({
        provider: p.provider,
        price: p.price,
        weight: p.weight,
      })),
      deviation,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Calculate weighted median
   */
  private calculateWeightedMedian(
    items: Array<{ value: number; weight: number }>
  ): number {
    // Sort by value
    const sorted = [...items].sort((a, b) => a.value - b.value);
    const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);

    let cumulativeWeight = 0;
    for (const item of sorted) {
      cumulativeWeight += item.weight;
      if (cumulativeWeight >= totalWeight / 2) {
        return item.value;
      }
    }

    // Fallback to simple weighted average
    return (
      sorted.reduce((sum, item) => sum + item.value * item.weight, 0) /
      totalWeight
    );
  }

  /**
   * Get recent price deviation alerts
   */
  getAlerts(since?: number): typeof this.alertHistory {
    if (since) {
      return this.alertHistory.filter((a) => a.timestamp >= since);
    }
    return this.alertHistory;
  }

  /**
   * Get all prices from individual sources (for debugging/analysis)
   */
  async getAllSourcePrices(
    base: string,
    quote: string
  ): Promise<
    Array<{
      provider: string;
      price: number;
      weight: number;
      source: string;
    }>
  > {
    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        const priceData = await source.getPrice(base, quote);
        return {
          provider: source.provider,
          price: priceData.price,
          weight: source.weight,
          source: priceData.source,
        };
      })
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<{
          provider: string;
          price: number;
          weight: number;
          source: string;
        }> => r.status === 'fulfilled'
      )
      .map((r) => r.value);
  }

  /**
   * Get multi-oracle statistics
   */
  async getStats(): Promise<{
    activeSources: number;
    totalQueries: number;
    alertCount: number;
    averageDeviation: number;
  }> {
    const avgDeviation =
      this.alertHistory.length > 0
        ? this.alertHistory.reduce((sum, a) => sum + a.deviation, 0) /
          this.alertHistory.length
        : 0;

    return {
      activeSources: this.sources.length,
      totalQueries: this.alertHistory.length, // Simplified - track all queries in production
      alertCount: this.alertHistory.filter(
        (a) => a.deviation > this.deviationThreshold
      ).length,
      averageDeviation: avgDeviation,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get a consensus price
      await this.getConsensusPrice('ETH', 'USD');
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function
export function createMultiOracleProvider(
  config?: Partial<MultiOracleConfig>
): MultiOracleProvider {
  return new MultiOracleProvider({
    rpcUrl:
      config?.rpcUrl ||
      process.env.MANTLE_SEPOLIA_RPC ||
      'https://rpc.sepolia.mantle.xyz',
    deviationThreshold: config?.deviationThreshold || 5,
    minSources: config?.minSources || 2,
  });
}
