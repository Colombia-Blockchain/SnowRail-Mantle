/**
 * Mock Oracle Provider for testing
 */

import { IOracleProvider, PriceData, PriceDataWithProof } from '../interfaces';

export class MockOracleProvider implements IOracleProvider {
  private prices: Map<string, number> = new Map([
    ['ETH/USD', 2500],
    ['BTC/USD', 45000],
    ['MNT/USD', 0.75],
    ['USDC/USD', 1.0],
    ['USDT/USD', 1.0],
  ]);

  async getPrice(base: string, quote: string): Promise<PriceData> {
    const pair = `${base.toUpperCase()}/${quote.toUpperCase()}`;
    const price = this.prices.get(pair);

    if (price === undefined) {
      throw new Error(`Price not found for ${pair}`);
    }

    return {
      price,
      confidence: price * 0.01,
      timestamp: Date.now(),
      source: 'mock',
    };
  }

  async getPriceWithProof(base: string, quote: string): Promise<PriceDataWithProof> {
    const priceData = await this.getPrice(base, quote);

    return {
      ...priceData,
      proof: {
        publishTime: Math.floor(Date.now() / 1000),
        attestations: ['mock_attestation'],
        merkleProof: ['mock_proof'],
      },
    };
  }

  async getBatchPrices(pairs: Array<{ base: string; quote: string }>): Promise<PriceData[]> {
    return Promise.all(pairs.map(({ base, quote }) => this.getPrice(base, quote)));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helper: set price
  setPrice(base: string, quote: string, price: number): void {
    const pair = `${base.toUpperCase()}/${quote.toUpperCase()}`;
    this.prices.set(pair, price);
  }
}
