/**
 * Pyth Oracle Provider for Mantle Network
 *
 * TRACK: AI & Oracles
 *
 * Integrates with Pyth Network for real-time price feeds
 * with on-chain verifiable proofs.
 *
 * Pyth on Mantle: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
 */

import { IOracleProvider, PriceData, PriceDataWithProof } from './interfaces';

// Pyth Price Feed IDs for common assets
const PYTH_PRICE_FEEDS: Record<string, string> = {
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'MNT/USD': '0x4e3037c822d852d79af3ac80e35eb420ee3b870dca49f9344a38ef4773fb0585',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
};

export interface PythProviderConfig {
  pythAddress: string;
  hermesEndpoint?: string;
  rpcUrl: string;
}

export class PythOracleProvider implements IOracleProvider {
  private readonly pythAddress: string;
  private readonly hermesEndpoint: string;
  private readonly rpcUrl: string;
  private priceCache: Map<string, { data: PriceData; expires: number }> = new Map();
  private readonly cacheTTL = 10000; // 10 seconds

  constructor(config: PythProviderConfig) {
    this.pythAddress = config.pythAddress;
    this.hermesEndpoint = config.hermesEndpoint || 'https://hermes.pyth.network';
    this.rpcUrl = config.rpcUrl;
  }

  async getPrice(base: string, quote: string): Promise<PriceData> {
    const pair = `${base.toUpperCase()}/${quote.toUpperCase()}`;
    const cacheKey = pair;

    // Check cache
    const cached = this.priceCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const feedId = PYTH_PRICE_FEEDS[pair];
    if (!feedId) {
      throw new Error(`Price feed not found for ${pair}`);
    }

    try {
      // Fetch from Pyth Hermes API
      const response = await fetch(
        `${this.hermesEndpoint}/api/latest_price_feeds?ids[]=${feedId}`,
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json() as PythApiResponse;
      const priceFeed = data[0];

      if (!priceFeed) {
        throw new Error(`No price data for ${pair}`);
      }

      const price = this.parsePythPrice(priceFeed.price);
      const confidence = this.parsePythPrice(priceFeed.price) * 0.01; // 1% confidence band

      const priceData: PriceData = {
        price,
        confidence,
        timestamp: priceFeed.price.publish_time * 1000,
        source: 'pyth',
      };

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: priceData,
        expires: Date.now() + this.cacheTTL,
      });

      return priceData;
    } catch (error) {
      console.error(`[PythOracle] Error fetching price for ${pair}:`, error);
      throw error;
    }
  }

  async getPriceWithProof(base: string, quote: string): Promise<PriceDataWithProof> {
    const pair = `${base.toUpperCase()}/${quote.toUpperCase()}`;
    const feedId = PYTH_PRICE_FEEDS[pair];

    if (!feedId) {
      throw new Error(`Price feed not found for ${pair}`);
    }

    try {
      // Fetch price update data with VAA proof
      const response = await fetch(
        `${this.hermesEndpoint}/api/latest_vaas?ids[]=${feedId}`,
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const vaaData = await response.json() as string[];

      // Also get the parsed price
      const priceData = await this.getPrice(base, quote);

      return {
        ...priceData,
        proof: {
          publishTime: Math.floor(priceData.timestamp / 1000),
          attestations: vaaData,
          merkleProof: [], // Pyth uses VAA, not merkle proofs
        },
      };
    } catch (error) {
      console.error(`[PythOracle] Error fetching price with proof for ${pair}:`, error);
      throw error;
    }
  }

  async getBatchPrices(pairs: Array<{ base: string; quote: string }>): Promise<PriceData[]> {
    const feedIds = pairs.map(({ base, quote }) => {
      const pair = `${base.toUpperCase()}/${quote.toUpperCase()}`;
      const feedId = PYTH_PRICE_FEEDS[pair];
      if (!feedId) {
        throw new Error(`Price feed not found for ${pair}`);
      }
      return feedId;
    });

    try {
      const idsParam = feedIds.map(id => `ids[]=${id}`).join('&');
      const response = await fetch(
        `${this.hermesEndpoint}/api/latest_price_feeds?${idsParam}`,
        {
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json() as PythApiResponse;

      return data.map((priceFeed, index) => {
        const price = this.parsePythPrice(priceFeed.price);
        return {
          price,
          confidence: price * 0.01,
          timestamp: priceFeed.price.publish_time * 1000,
          source: 'pyth',
        };
      });
    } catch (error) {
      console.error('[PythOracle] Error fetching batch prices:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.hermesEndpoint}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Parse Pyth price format (price * 10^expo)
   */
  private parsePythPrice(priceInfo: { price: string; expo: number }): number {
    const price = BigInt(priceInfo.price);
    const expo = priceInfo.expo;
    return Number(price) * Math.pow(10, expo);
  }

  /**
   * Get supported price feeds
   */
  getSupportedFeeds(): string[] {
    return Object.keys(PYTH_PRICE_FEEDS);
  }

  /**
   * Get the on-chain Pyth contract address
   */
  getPythAddress(): string {
    return this.pythAddress;
  }
}

// Types for Pyth API responses
interface PythPriceInfo {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
}

interface PythPriceFeed {
  id: string;
  price: PythPriceInfo;
  ema_price: PythPriceInfo;
}

type PythApiResponse = PythPriceFeed[];

// Export factory function
export function createPythOracleProvider(config?: Partial<PythProviderConfig>): PythOracleProvider {
  return new PythOracleProvider({
    pythAddress: config?.pythAddress || process.env.PYTH_ADDRESS || '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
    hermesEndpoint: config?.hermesEndpoint || 'https://hermes.pyth.network',
    rpcUrl: config?.rpcUrl || process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz',
  });
}
