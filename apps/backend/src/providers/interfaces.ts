/**
 * LEGO Provider Interfaces for SnowRail on Mantle
 *
 * These interfaces define the contracts for swappable providers
 * supporting all 4 hackathon tracks:
 * - RWA/RealFi: IRWAProvider
 * - AI & Oracles: IOracleProvider
 * - DeFi & Composability: ISwapProvider
 * - ZK & Privacy: Already in src/zk/
 */

// ============================================
// TRACK 1: RWA / RealFi
// ============================================

export interface RWAAssetInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
  yieldRate: number; // APY in basis points (e.g., 500 = 5%)
  underlyingAsset: string;
  issuer: string;
}

export interface IRWAProvider {
  /**
   * Get current yield rate for RWA token
   */
  getYieldRate(asset: string): Promise<number>;

  /**
   * Get asset information
   */
  getAssetInfo(asset: string): Promise<RWAAssetInfo>;

  /**
   * Get user's balance of RWA token
   */
  getBalance(asset: string, address: string): Promise<bigint>;

  /**
   * Approve RWA token for spending
   */
  approve(asset: string, spender: string, amount: bigint): Promise<string>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

// ============================================
// TRACK 2: AI & Oracles
// ============================================

export interface PriceData {
  price: number;
  confidence: number;
  timestamp: number;
  source: string;
}

export interface PriceDataWithProof extends PriceData {
  proof: {
    publishTime: number;
    attestations: string[];
    merkleProof: string[];
  };
}

export interface IOracleProvider {
  /**
   * Get current price for asset pair
   */
  getPrice(base: string, quote: string): Promise<PriceData>;

  /**
   * Get price with on-chain verifiable proof (for ZK integration)
   */
  getPriceWithProof(base: string, quote: string): Promise<PriceDataWithProof>;

  /**
   * Get multiple prices in batch
   */
  getBatchPrices(pairs: Array<{ base: string; quote: string }>): Promise<PriceData[]>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

// ============================================
// TRACK 3: DeFi & Composability
// ============================================

export interface SwapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  route: string[];
  deadline: number;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: string;
  deadline: number;
}

export interface SwapResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  effectivePrice: number;
}

export interface ISwapProvider {
  /**
   * Get quote for swap
   */
  getQuote(tokenIn: string, tokenOut: string, amountIn: bigint): Promise<SwapQuote>;

  /**
   * Execute swap
   */
  swap(params: SwapParams): Promise<SwapResult>;

  /**
   * Get supported tokens
   */
  getSupportedTokens(): Promise<string[]>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

// ============================================
// Provider Factory Types
// ============================================

export type RWAProviderType = 'usdy' | 'meth' | 'mock';
export type OracleProviderType = 'pyth' | 'mock';
export type SwapProviderType = 'merchant-moe' | 'mock';

export interface ProviderConfig {
  rwa: {
    type: RWAProviderType;
    config?: Record<string, unknown>;
  };
  oracle: {
    type: OracleProviderType;
    config?: Record<string, unknown>;
  };
  swap: {
    type: SwapProviderType;
    config?: Record<string, unknown>;
  };
}

// ============================================
// TRACK 1: RWA / RealFi - Extended Interfaces
// ============================================

export interface YieldDistribution {
  recipient: string;
  amount: bigint;
  asset: string;
  period: {
    start: number;
    end: number;
  };
  txHash?: string;
}

export interface IYieldDistributor {
  /**
   * Calculate pending yield for an address
   */
  calculatePendingYield(asset: string, holder: string): Promise<bigint>;

  /**
   * Distribute yield to holders
   */
  distributeYield(asset: string, recipients: string[]): Promise<YieldDistribution[]>;

  /**
   * Get historical yield distributions
   */
  getDistributionHistory(asset: string, holder: string): Promise<YieldDistribution[]>;

  /**
   * Get total yield distributed
   */
  getTotalDistributed(asset: string): Promise<bigint>;
}

export interface KYCStatus {
  address: string;
  verified: boolean;
  level: 'none' | 'basic' | 'enhanced' | 'institutional';
  provider: string;
  expiresAt?: number;
  jurisdiction?: string;
}

export interface IKYCProvider {
  /**
   * Check KYC status for address
   */
  getKYCStatus(address: string): Promise<KYCStatus>;

  /**
   * Verify if address meets minimum KYC level
   */
  meetsRequirement(address: string, minLevel: KYCStatus['level']): Promise<boolean>;

  /**
   * Get KYC attestation for on-chain verification
   */
  getAttestation(address: string): Promise<{
    signature: string;
    expiry: number;
    level: KYCStatus['level'];
  }>;
}

// ============================================
// TRACK 2: DeFi & Composability - Extended
// ============================================

export interface LendingPosition {
  asset: string;
  supplied: bigint;
  borrowed: bigint;
  collateralFactor: number;
  liquidationThreshold: number;
  healthFactor: number;
}

export interface LendingMarket {
  asset: string;
  totalSupply: bigint;
  totalBorrow: bigint;
  supplyAPY: number;
  borrowAPY: number;
  utilizationRate: number;
}

export interface ILendingProvider {
  /**
   * Get lending market info
   */
  getMarket(asset: string): Promise<LendingMarket>;

  /**
   * Get user's lending position
   */
  getPosition(asset: string, user: string): Promise<LendingPosition>;

  /**
   * Supply asset to lending market
   */
  supply(asset: string, amount: bigint): Promise<string>;

  /**
   * Withdraw from lending market
   */
  withdraw(asset: string, amount: bigint): Promise<string>;

  /**
   * Borrow from lending market
   */
  borrow(asset: string, amount: bigint): Promise<string>;

  /**
   * Repay borrowed asset
   */
  repay(asset: string, amount: bigint): Promise<string>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

export interface YieldStrategy {
  id: string;
  name: string;
  assets: string[];
  expectedAPY: number;
  riskLevel: 'low' | 'medium' | 'high';
  protocols: string[];
}

export interface IYieldOptimizer {
  /**
   * Get available yield strategies
   */
  getStrategies(): Promise<YieldStrategy[]>;

  /**
   * Get optimal strategy for asset
   */
  getOptimalStrategy(asset: string, amount: bigint): Promise<YieldStrategy>;

  /**
   * Deposit into yield strategy
   */
  deposit(strategyId: string, asset: string, amount: bigint): Promise<string>;

  /**
   * Withdraw from yield strategy
   */
  withdraw(strategyId: string, amount: bigint): Promise<string>;

  /**
   * Get current position in strategy
   */
  getPosition(strategyId: string, user: string): Promise<{
    deposited: bigint;
    currentValue: bigint;
    earnedYield: bigint;
  }>;
}

// ============================================
// TRACK 3: AI & Oracles - Extended
// ============================================

export interface AgentDecision {
  action: 'swap' | 'lend' | 'stake' | 'harvest' | 'rebalance' | 'hold';
  confidence: number;
  reasoning: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

export interface AgentContext {
  portfolio: Array<{
    asset: string;
    balance: bigint;
    value: number;
  }>;
  marketConditions: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
  };
  userPreferences?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    yieldTarget: number;
  };
}

export interface IAgentProvider {
  /**
   * Get AI-driven decision for portfolio action
   */
  getDecision(context: AgentContext): Promise<AgentDecision>;

  /**
   * Validate a proposed action
   */
  validateAction(action: AgentDecision, context: AgentContext): Promise<{
    valid: boolean;
    issues: string[];
  }>;

  /**
   * Get explanation for a decision
   */
  explainDecision(decision: AgentDecision): Promise<string>;
}

export interface OracleConsensus {
  price: number;
  sources: Array<{
    provider: string;
    price: number;
    weight: number;
  }>;
  deviation: number;
  timestamp: number;
}

export interface IMultiOracleProvider {
  /**
   * Get consensus price from multiple oracles
   */
  getConsensusPrice(base: string, quote: string): Promise<OracleConsensus>;

  /**
   * Add oracle source
   */
  addSource(provider: IOracleProvider, weight: number): void;

  /**
   * Get deviation threshold
   */
  getDeviationThreshold(): number;

  /**
   * Set deviation threshold for alerts
   */
  setDeviationThreshold(threshold: number): void;
}

// ============================================
// TRACK 4: ZK & Privacy - Extended
// ============================================

export interface DisclosureProof {
  proof: string;
  publicInputs: string[];
  disclosedFields: string[];
  verifierContract: string;
}

export interface ISelectiveDisclosure {
  /**
   * Generate proof disclosing only selected fields
   */
  generateProof(
    credentials: Record<string, unknown>,
    fieldsToDisclose: string[]
  ): Promise<DisclosureProof>;

  /**
   * Verify selective disclosure proof
   */
  verifyProof(proof: DisclosureProof): Promise<boolean>;

  /**
   * Get supported credential types
   */
  getSupportedCredentials(): string[];
}

export interface ZKKYCCredential {
  commitment: string;
  nullifier: string;
  level: KYCStatus['level'];
  jurisdiction: string;
  expiresAt: number;
}

export interface IZKKYCProvider {
  /**
   * Generate ZK-KYC credential from KYC status
   */
  generateCredential(kycStatus: KYCStatus): Promise<ZKKYCCredential>;

  /**
   * Generate proof of KYC without revealing identity
   */
  proveKYC(credential: ZKKYCCredential, minLevel: KYCStatus['level']): Promise<{
    proof: string;
    publicInputs: string[];
  }>;

  /**
   * Verify KYC proof on-chain
   */
  verifyOnChain(proof: string, publicInputs: string[]): Promise<boolean>;
}

// ============================================
// TRACK 5: Infrastructure & Tooling
// ============================================

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface AlertConfig {
  metric: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq';
  severity: 'info' | 'warning' | 'critical';
  cooldown: number;
}

export interface IMonitoringProvider {
  /**
   * Record metric
   */
  recordMetric(metric: MetricData): void;

  /**
   * Get metrics for time range
   */
  getMetrics(name: string, from: number, to: number): Promise<MetricData[]>;

  /**
   * Configure alert
   */
  setAlert(config: AlertConfig): void;

  /**
   * Get active alerts
   */
  getActiveAlerts(): Promise<Array<AlertConfig & { triggered: number }>>;

  /**
   * Get system health summary
   */
  getHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    components: Array<{
      name: string;
      status: 'up' | 'down';
      latency: number;
    }>;
  }>;
}

// ============================================
// Extended Provider Factory Types
// ============================================

export type YieldDistributorType = 'usdy' | 'meth' | 'mock';
export type KYCProviderType = 'ondoid' | 'mock';
export type LendingProviderType = 'lendle' | 'init' | 'mock';
export type YieldOptimizerType = 'pendle' | 'mock';
export type AgentProviderType = 'openai' | 'anthropic' | 'mock';
export type ZKProviderType = 'noir' | 'mock';
export type MonitoringProviderType = 'prometheus' | 'mock';

export interface ExtendedProviderConfig extends ProviderConfig {
  yield: {
    type: YieldDistributorType;
    config?: Record<string, unknown>;
  };
  kyc: {
    type: KYCProviderType;
    config?: Record<string, unknown>;
  };
  lending: {
    type: LendingProviderType;
    config?: Record<string, unknown>;
  };
  yieldOptimizer: {
    type: YieldOptimizerType;
    config?: Record<string, unknown>;
  };
  agent: {
    type: AgentProviderType;
    config?: Record<string, unknown>;
  };
  zkKyc: {
    type: ZKProviderType;
    config?: Record<string, unknown>;
  };
  monitoring: {
    type: MonitoringProviderType;
    config?: Record<string, unknown>;
  };
}
