/**
 * Mock RWA Provider for testing
 */

import { IRWAProvider, RWAAssetInfo } from '../interfaces';

export class MockRWAProvider implements IRWAProvider {
  private balances: Map<string, Map<string, bigint>> = new Map();

  constructor() {
    // Initialize with some mock data
    this.balances.set('USDY', new Map());
    this.balances.set('mETH', new Map());
  }

  async getYieldRate(asset: string): Promise<number> {
    switch (asset.toUpperCase()) {
      case 'USDY':
        return 525; // 5.25% APY
      case 'METH':
        return 280; // 2.8% APY
      default:
        return 0;
    }
  }

  async getAssetInfo(asset: string): Promise<RWAAssetInfo> {
    const yieldRate = await this.getYieldRate(asset);

    switch (asset.toUpperCase()) {
      case 'USDY':
        return {
          symbol: 'USDY',
          name: 'US Dollar Yield (Mock)',
          decimals: 18,
          contractAddress: '0x0000000000000000000000000000000000000001',
          yieldRate,
          underlyingAsset: 'US Treasury Bills',
          issuer: 'Ondo Finance (Mock)',
        };
      case 'METH':
        return {
          symbol: 'mETH',
          name: 'Mantle Staked ETH (Mock)',
          decimals: 18,
          contractAddress: '0x0000000000000000000000000000000000000002',
          yieldRate,
          underlyingAsset: 'Ethereum',
          issuer: 'Mantle (Mock)',
        };
      default:
        throw new Error(`Unknown asset: ${asset}`);
    }
  }

  async getBalance(asset: string, address: string): Promise<bigint> {
    const assetBalances = this.balances.get(asset.toUpperCase());
    if (!assetBalances) return 0n;
    return assetBalances.get(address.toLowerCase()) || 0n;
  }

  async approve(asset: string, spender: string, amount: bigint): Promise<string> {
    // Mock approval - return fake tx hash
    return '0x' + 'mock'.padEnd(64, '0');
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helper: set balance
  setBalance(asset: string, address: string, balance: bigint): void {
    let assetBalances = this.balances.get(asset.toUpperCase());
    if (!assetBalances) {
      assetBalances = new Map();
      this.balances.set(asset.toUpperCase(), assetBalances);
    }
    assetBalances.set(address.toLowerCase(), balance);
  }
}
