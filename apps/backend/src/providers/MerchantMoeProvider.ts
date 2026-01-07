/**
 * Merchant Moe DEX Provider for Mantle Network
 *
 * TRACK: DeFi & Composability
 *
 * Integrates with Merchant Moe, the leading DEX on Mantle Network.
 * Uses Liquidity Book (LB) v2.2 for concentrated liquidity.
 *
 * Contracts:
 * - Router: 0xeaEE7EE68874218c3558b40063c42B82D3E7232a
 * - Factory: 0xa6630671775c4EA2743840F9A5016dCf2A104054
 */

import { ethers } from 'ethers';
import { ISwapProvider, SwapQuote, SwapParams, SwapResult } from './interfaces';

// Merchant Moe Router ABI (minimal for swaps)
const MOE_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] amounts)',
  'function swapExactTokensForNative(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] amounts)',
  'function swapExactNativeForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] amounts)',
  'function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] amounts)',
  'function factory() view returns (address)',
  'function WNATIVE() view returns (address)',
];

// Merchant Moe LB Router ABI (for concentrated liquidity swaps)
const LB_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, tuple(uint256[] pairBinSteps, uint8[] versions, address[] tokenPath) route, address to, uint256 deadline) returns (uint256 amountOut)',
  'function swapExactNATIVEForTokens(uint256 amountOutMin, tuple(uint256[] pairBinSteps, uint8[] versions, address[] tokenPath) route, address to, uint256 deadline) payable returns (uint256 amountOut)',
  'function swapExactTokensForNATIVE(uint256 amountIn, uint256 amountOutMin, tuple(uint256[] pairBinSteps, uint8[] versions, address[] tokenPath) route, address to, uint256 deadline) returns (uint256 amountOut)',
  'function getSwapOut(address pair, uint128 amountIn, bool swapForY) view returns (uint128 amountInLeft, uint128 amountOut, uint128 fee)',
];

// Merchant Moe Factory ABI
const LB_FACTORY_ABI = [
  'function getLBPairInformation(address tokenA, address tokenB, uint256 binStep) view returns (address pair, bool isV2)',
  'function getAllLBPairs(address tokenA, address tokenB) view returns (tuple(uint16 binStep, address LBPair, bool createdByOwner, bool ignoredForRouting)[])',
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// Mantle Token Addresses
const MANTLE_TOKENS: Record<string, string> = {
  WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
  USDT: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE', // Mantle USDT
  USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // Mantle USDC
  WETH: '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111', // Canonical ETH
  mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
};

export interface MerchantMoeConfig {
  rpcUrl: string;
  privateKey?: string;
  routerAddress?: string;
  lbRouterAddress?: string;
  factoryAddress?: string;
}

export class MerchantMoeProvider implements ISwapProvider {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer?: ethers.Wallet;
  private readonly router: ethers.Contract;
  private readonly lbRouter: ethers.Contract;
  private readonly factory: ethers.Contract;

  private readonly routerAddress: string;
  private readonly lbRouterAddress: string;
  private readonly factoryAddress: string;

  constructor(config: MerchantMoeConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Contract addresses
    this.routerAddress = config.routerAddress || '0xeaEE7EE68874218c3558b40063c42B82D3E7232a';
    this.lbRouterAddress = config.lbRouterAddress || '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a';
    this.factoryAddress = config.factoryAddress || '0xa6630671775c4EA2743840F9A5016dCf2A104054';

    // Initialize contracts
    this.router = new ethers.Contract(
      this.routerAddress,
      MOE_ROUTER_ABI,
      this.signer || this.provider
    );

    this.lbRouter = new ethers.Contract(
      this.lbRouterAddress,
      LB_ROUTER_ABI,
      this.signer || this.provider
    );

    this.factory = new ethers.Contract(
      this.factoryAddress,
      LB_FACTORY_ABI,
      this.provider
    );
  }

  async getQuote(tokenIn: string, tokenOut: string, amountIn: bigint): Promise<SwapQuote> {
    const tokenInAddr = this.resolveTokenAddress(tokenIn);
    const tokenOutAddr = this.resolveTokenAddress(tokenOut);

    try {
      // Try to get quote using standard router first
      const path = [tokenInAddr, tokenOutAddr];
      const amounts = await this.router.getAmountsOut(amountIn, path);
      const amountOut = amounts[amounts.length - 1];

      // Calculate price impact (simplified)
      const priceImpact = this.calculatePriceImpact(amountIn, amountOut);

      return {
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        amountIn,
        amountOut,
        priceImpact,
        route: path,
        deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      };
    } catch (error) {
      console.error('[MerchantMoe] Error getting quote:', error);
      throw new Error(`Failed to get quote for ${tokenIn} -> ${tokenOut}`);
    }
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    if (!this.signer) {
      throw new Error('Signer required for swap operation');
    }

    const tokenInAddr = this.resolveTokenAddress(params.tokenIn);
    const tokenOutAddr = this.resolveTokenAddress(params.tokenOut);

    try {
      // Approve token spending if needed
      await this.ensureApproval(tokenInAddr, params.amountIn);

      const path = [tokenInAddr, tokenOutAddr];
      const isNativeIn = this.isNativeToken(params.tokenIn);
      const isNativeOut = this.isNativeToken(params.tokenOut);

      let tx;

      if (isNativeIn) {
        // Swap native MNT for tokens
        tx = await this.router.swapExactNativeForTokens(
          params.minAmountOut,
          path.slice(1), // Remove native from path
          params.recipient,
          params.deadline,
          { value: params.amountIn }
        );
      } else if (isNativeOut) {
        // Swap tokens for native MNT
        tx = await this.router.swapExactTokensForNative(
          params.amountIn,
          params.minAmountOut,
          path.slice(0, -1), // Remove native from path
          params.recipient,
          params.deadline
        );
      } else {
        // Swap tokens for tokens
        tx = await this.router.swapExactTokensForTokens(
          params.amountIn,
          params.minAmountOut,
          path,
          params.recipient,
          params.deadline
        );
      }

      const receipt = await tx.wait();

      // Parse swap events to get actual amounts
      const amountOut = await this.parseSwapResult(receipt, tokenOutAddr);

      return {
        txHash: receipt.hash,
        amountIn: params.amountIn,
        amountOut,
        effectivePrice: Number(amountOut) / Number(params.amountIn),
      };
    } catch (error) {
      console.error('[MerchantMoe] Swap error:', error);
      throw error;
    }
  }

  async getSupportedTokens(): Promise<string[]> {
    return Object.keys(MANTLE_TOKENS);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const factory = await this.router.factory();
      return factory !== ethers.ZeroAddress;
    } catch {
      return false;
    }
  }

  /**
   * Resolve token symbol to address
   */
  private resolveTokenAddress(token: string): string {
    // If already an address, return as-is
    if (token.startsWith('0x') && token.length === 42) {
      return token;
    }

    const address = MANTLE_TOKENS[token.toUpperCase()];
    if (!address) {
      throw new Error(`Unknown token: ${token}`);
    }
    return address;
  }

  /**
   * Check if token is native MNT
   */
  private isNativeToken(token: string): boolean {
    return token.toUpperCase() === 'MNT' || token.toUpperCase() === 'NATIVE';
  }

  /**
   * Ensure token approval for router
   */
  private async ensureApproval(tokenAddress: string, amount: bigint): Promise<void> {
    if (!this.signer) return;

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const signerAddress = await this.signer.getAddress();

    const currentAllowance = await token.allowance(signerAddress, this.routerAddress);

    if (currentAllowance < amount) {
      console.log(`[MerchantMoe] Approving ${amount} for router...`);
      const tx = await token.approve(this.routerAddress, ethers.MaxUint256);
      await tx.wait();
      console.log('[MerchantMoe] Approval confirmed');
    }
  }

  /**
   * Calculate price impact (simplified)
   */
  private calculatePriceImpact(amountIn: bigint, amountOut: bigint): number {
    // Simplified price impact calculation
    // In production, compare to mid-market price
    return 0.003; // 0.3% default
  }

  /**
   * Parse swap result from transaction receipt
   */
  private async parseSwapResult(receipt: ethers.TransactionReceipt, tokenOut: string): Promise<bigint> {
    // Look for Transfer event to the recipient
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === tokenOut.toLowerCase()) {
          // ERC20 Transfer event topic
          if (log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
            return BigInt(log.data);
          }
        }
      } catch {
        continue;
      }
    }

    // Fallback: return 0 if can't parse
    console.warn('[MerchantMoe] Could not parse swap result from receipt');
    return 0n;
  }

  /**
   * Get liquidity pair information
   */
  async getPairInfo(tokenA: string, tokenB: string): Promise<{ pair: string; binStep: number }[]> {
    const tokenAAddr = this.resolveTokenAddress(tokenA);
    const tokenBAddr = this.resolveTokenAddress(tokenB);

    try {
      const pairs = await this.factory.getAllLBPairs(tokenAAddr, tokenBAddr);
      return pairs.map((p: { binStep: number; LBPair: string }) => ({
        pair: p.LBPair,
        binStep: p.binStep,
      }));
    } catch (error) {
      console.error('[MerchantMoe] Error getting pair info:', error);
      return [];
    }
  }

  /**
   * Get router address
   */
  getRouterAddress(): string {
    return this.routerAddress;
  }
}

// Export factory function
export function createMerchantMoeProvider(config?: Partial<MerchantMoeConfig>): MerchantMoeProvider {
  return new MerchantMoeProvider({
    rpcUrl: config?.rpcUrl || process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz',
    privateKey: config?.privateKey || process.env.PRIVATE_KEY,
    routerAddress: config?.routerAddress || process.env.MERCHANT_MOE_ROUTER,
    factoryAddress: config?.factoryAddress || process.env.MERCHANT_MOE_FACTORY,
  });
}
