/**
 * Provider Service - LEGO Architecture Integration
 *
 * Singleton service that initializes and manages all LEGO providers
 * for the 5 hackathon tracks:
 * - RWA/RealFi: USDYProvider + YieldDistributor
 * - AI & Oracles: PythOracleProvider
 * - DeFi: MerchantMoeProvider
 * - ZK & Privacy: Handled by existing ZK services
 * - Infrastructure: Monitoring & Health
 */

import { FastifyInstance } from 'fastify';
import {
  createProviders,
  buildProvidersConfigFromEnv,
  IRWAProvider,
  IOracleProvider,
  ISwapProvider,
  Providers,
  ProviderFactoryConfig,
  YieldDistribution,
  KYCStatus,
} from '../providers';
import { YieldDistributor, createYieldDistributor } from '../providers/YieldDistributor';
import { KYCProvider, createKYCProvider } from '../providers/KYCProvider';
import { LendingProvider, createLendingProvider } from '../providers/LendingProvider';
import { LendingMarket, LendingPosition } from '../providers';

// Singleton instance
let providerServiceInstance: ProviderService | null = null;

export function initializeProviderService(server: FastifyInstance): void {
  const config = buildProvidersConfigFromEnv();
  providerServiceInstance = new ProviderService(config, server.log);

  server.log.info({
    rwa: config.rwa.type,
    oracle: config.oracle.type,
    swap: config.swap.type,
  }, '[ProviderService] Initialized LEGO providers');
}

export function getProviderService(): ProviderService {
  if (!providerServiceInstance) {
    throw new Error('ProviderService not initialized. Call initializeProviderService first.');
  }
  return providerServiceInstance;
}

export class ProviderService {
  private readonly providers: Providers;
  private readonly config: ProviderFactoryConfig;
  private readonly logger: FastifyInstance['log'];
  private readonly yieldDistributor: YieldDistributor;
  private readonly kycProvider: KYCProvider;
  private readonly lendingProvider: LendingProvider;

  constructor(config: ProviderFactoryConfig, logger: FastifyInstance['log']) {
    this.config = config;
    this.logger = logger;
    this.providers = createProviders(config);
    // Initialize yield distributor with RWA provider
    this.yieldDistributor = createYieldDistributor(this.providers.rwa);
    // Initialize KYC provider for RWA compliance
    this.kycProvider = createKYCProvider();
    // Initialize lending provider for DeFi composability
    this.lendingProvider = createLendingProvider();
  }

  // ============================================
  // RWA PROVIDER (Track 1: RWA/RealFi)
  // ============================================

  get rwa(): IRWAProvider {
    return this.providers.rwa;
  }

  async getRWAYield(asset: string): Promise<{ asset: string; yieldRate: number; yieldPercent: string }> {
    const yieldRate = await this.providers.rwa.getYieldRate(asset);
    return {
      asset,
      yieldRate,
      yieldPercent: `${(yieldRate / 100).toFixed(2)}%`,
    };
  }

  async getRWABalance(asset: string, address: string): Promise<{ asset: string; balance: string; address: string }> {
    const balance = await this.providers.rwa.getBalance(asset, address);
    return {
      asset,
      balance: balance.toString(),
      address,
    };
  }

  // ============================================
  // YIELD DISTRIBUTION (Track 1: RWA/RealFi Extension)
  // ============================================

  async getPendingYield(asset: string, holder: string): Promise<bigint> {
    return this.yieldDistributor.calculatePendingYield(asset, holder);
  }

  async distributeYield(asset: string, recipients: string[]): Promise<YieldDistribution[]> {
    return this.yieldDistributor.distributeYield(asset, recipients);
  }

  async getYieldHistory(asset: string, holder: string): Promise<YieldDistribution[]> {
    return this.yieldDistributor.getDistributionHistory(asset, holder);
  }

  async getYieldStats(asset: string): Promise<{
    totalDistributed: string;
    holdersTracked: number;
    averageYield: string;
    currentRate: number;
  }> {
    return this.yieldDistributor.getYieldStats(asset);
  }

  async simulateYieldAccrual(asset: string, holder: string, days: number): Promise<bigint> {
    return this.yieldDistributor.simulateYieldAccrual(asset, holder, days);
  }

  // ============================================
  // KYC PROVIDER (Track 1: RWA/RealFi Extension)
  // ============================================

  async getKYCStatus(address: string): Promise<KYCStatus> {
    return this.kycProvider.getKYCStatus(address);
  }

  async meetsKYCRequirement(address: string, minLevel: KYCStatus['level']): Promise<boolean> {
    return this.kycProvider.meetsRequirement(address, minLevel);
  }

  async getKYCAttestation(address: string): Promise<{
    signature: string;
    expiry: number;
    level: KYCStatus['level'];
  }> {
    return this.kycProvider.getAttestation(address);
  }

  async registerKYC(
    address: string,
    level: KYCStatus['level'],
    jurisdiction?: string
  ): Promise<KYCStatus> {
    return this.kycProvider.registerKYC(address, level, jurisdiction);
  }

  async getKYCStats(): Promise<{
    totalVerified: number;
    byLevel: Record<KYCStatus['level'], number>;
    byJurisdiction: Record<string, number>;
  }> {
    return this.kycProvider.getStats();
  }

  // ============================================
  // ORACLE PROVIDER (Track 2: AI & Oracles)
  // ============================================

  get oracle(): IOracleProvider {
    return this.providers.oracle;
  }

  async getPrice(base: string, quote: string): Promise<{
    pair: string;
    price: number;
    confidence: number;
    timestamp: number;
    source: string;
  }> {
    const priceData = await this.providers.oracle.getPrice(base, quote);
    return {
      pair: `${base}/${quote}`,
      ...priceData,
    };
  }

  async getPriceWithProof(base: string, quote: string): Promise<{
    pair: string;
    price: number;
    proof: object;
  }> {
    const data = await this.providers.oracle.getPriceWithProof(base, quote);
    return {
      pair: `${base}/${quote}`,
      price: data.price,
      proof: data.proof,
    };
  }

  // ============================================
  // SWAP PROVIDER (Track 2: DeFi - Swaps)
  // ============================================

  get swap(): ISwapProvider {
    return this.providers.swap;
  }

  // ============================================
  // LENDING PROVIDER (Track 2: DeFi - Lending)
  // ============================================

  async getLendingMarkets(): Promise<LendingMarket[]> {
    const marketNames = this.lendingProvider.getSupportedMarkets();
    const markets: LendingMarket[] = [];
    for (const name of marketNames) {
      const market = await this.lendingProvider.getMarket(name);
      markets.push(market);
    }
    return markets;
  }

  async getLendingMarket(asset: string): Promise<LendingMarket> {
    return this.lendingProvider.getMarket(asset);
  }

  async getLendingPosition(asset: string, user: string): Promise<LendingPosition> {
    return this.lendingProvider.getPosition(asset, user);
  }

  async lendingSupply(asset: string, amount: string): Promise<string> {
    return this.lendingProvider.supply(asset, BigInt(amount));
  }

  async lendingWithdraw(asset: string, amount: string): Promise<string> {
    return this.lendingProvider.withdraw(asset, BigInt(amount));
  }

  async lendingBorrow(asset: string, amount: string): Promise<string> {
    return this.lendingProvider.borrow(asset, BigInt(amount));
  }

  async lendingRepay(asset: string, amount: string): Promise<string> {
    return this.lendingProvider.repay(asset, BigInt(amount));
  }

  async getLendingStats(): Promise<{
    totalSupplied: string;
    totalBorrowed: string;
    markets: number;
    averageUtilization: number;
  }> {
    return this.lendingProvider.getStats();
  }

  async getSwapQuote(tokenIn: string, tokenOut: string, amountIn: string): Promise<{
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    priceImpact: number;
    route: string[];
  }> {
    const quote = await this.providers.swap.getQuote(tokenIn, tokenOut, BigInt(amountIn));
    return {
      tokenIn: quote.tokenIn,
      tokenOut: quote.tokenOut,
      amountIn: quote.amountIn.toString(),
      amountOut: quote.amountOut.toString(),
      priceImpact: quote.priceImpact,
      route: quote.route,
    };
  }

  async executeSwap(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    recipient: string;
  }): Promise<{
    txHash: string;
    amountIn: string;
    amountOut: string;
    effectivePrice: number;
  }> {
    const result = await this.providers.swap.swap({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: BigInt(params.amountIn),
      minAmountOut: BigInt(params.minAmountOut),
      recipient: params.recipient,
      deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
    });

    return {
      txHash: result.txHash,
      amountIn: result.amountIn.toString(),
      amountOut: result.amountOut.toString(),
      effectivePrice: result.effectivePrice,
    };
  }

  // ============================================
  // HEALTH & STATUS
  // ============================================

  async getStatus(): Promise<{
    initialized: boolean;
    providers: {
      rwa: { type: string; healthy: boolean };
      oracle: { type: string; healthy: boolean };
      swap: { type: string; healthy: boolean };
    };
    network: string;
  }> {
    const [rwaHealth, oracleHealth, swapHealth] = await Promise.all([
      this.providers.rwa.healthCheck().catch(() => false),
      this.providers.oracle.healthCheck().catch(() => false),
      this.providers.swap.healthCheck().catch(() => false),
    ]);

    return {
      initialized: true,
      providers: {
        rwa: { type: this.config.rwa.type, healthy: rwaHealth },
        oracle: { type: this.config.oracle.type, healthy: oracleHealth },
        swap: { type: this.config.swap.type, healthy: swapHealth },
      },
      network: process.env.NETWORK || 'mantle',
    };
  }

  getConfig(): ProviderFactoryConfig {
    return this.config;
  }
}
