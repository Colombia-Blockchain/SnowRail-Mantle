/**
 * Mock Swap Provider for testing
 */

import { ISwapProvider, SwapQuote, SwapParams, SwapResult } from '../interfaces';

export class MockSwapProvider implements ISwapProvider {
  private prices: Map<string, number> = new Map([
    ['WMNT', 0.75],
    ['USDT', 1.0],
    ['USDC', 1.0],
    ['WETH', 2500],
    ['mETH', 2500],
  ]);

  async getQuote(tokenIn: string, tokenOut: string, amountIn: bigint): Promise<SwapQuote> {
    const priceIn = this.prices.get(tokenIn.toUpperCase()) || 1;
    const priceOut = this.prices.get(tokenOut.toUpperCase()) || 1;

    const rate = priceIn / priceOut;
    const amountOut = BigInt(Math.floor(Number(amountIn) * rate * 0.997)); // 0.3% fee

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      priceImpact: 0.003,
      route: [tokenIn, tokenOut],
      deadline: Math.floor(Date.now() / 1000) + 1200,
    };
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    const quote = await this.getQuote(params.tokenIn, params.tokenOut, params.amountIn);

    if (quote.amountOut < params.minAmountOut) {
      throw new Error('Insufficient output amount');
    }

    return {
      txHash: '0x' + 'mockswap'.padEnd(64, '0'),
      amountIn: params.amountIn,
      amountOut: quote.amountOut,
      effectivePrice: Number(quote.amountOut) / Number(params.amountIn),
    };
  }

  async getSupportedTokens(): Promise<string[]> {
    return Array.from(this.prices.keys());
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helper: set price
  setPrice(token: string, price: number): void {
    this.prices.set(token.toUpperCase(), price);
  }
}
