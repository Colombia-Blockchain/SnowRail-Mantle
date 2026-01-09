/**
 * Sentinel (Security) Interface - LEGO Module
 *
 * Defines the contract for security monitoring and threat analysis.
 * Provides reputation scoring, blacklist management, and transaction analysis.
 *
 * Key concepts:
 * - Reputation: Score indicating trustworthiness of an address
 * - Risk: Assessment of potential threats
 * - Blacklist: Known malicious addresses
 * - Pattern: Behavioral analysis of transactions
 */

/**
 * Reputation score for an address
 */
export interface ReputationScore {
  /** Address being scored */
  address: string;
  /** Overall reputation score (0-100) */
  score: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Risk category */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Factors contributing to score */
  factors: ReputationFactor[];
  /** Last update timestamp */
  updatedAt: number;
  /** Score validity period */
  validUntil: number;
}

/**
 * Individual factor contributing to reputation
 */
export interface ReputationFactor {
  /** Factor name */
  name: string;
  /** Factor contribution (-100 to +100) */
  contribution: number;
  /** Factor weight (0-1) */
  weight: number;
  /** Factor description */
  description: string;
}

/**
 * Blacklist entry
 */
export interface BlacklistEntry {
  /** Blacklisted address */
  address: string;
  /** Reason for blacklisting */
  reason: string;
  /** Severity level */
  severity: 'warning' | 'danger' | 'critical';
  /** Source of blacklist entry */
  source: string;
  /** When address was blacklisted */
  addedAt: number;
  /** Expiry (null = permanent) */
  expiresAt: number | null;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Transaction to analyze
 */
export interface TransactionData {
  /** Transaction hash (if available) */
  txHash?: string;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Value in wei */
  value: bigint;
  /** Token address (null for native) */
  token?: string | null;
  /** Transaction data/input */
  data?: string;
  /** Gas limit */
  gasLimit?: bigint;
  /** Chain ID */
  chainId: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Transaction risk analysis result
 */
export interface TransactionAnalysis {
  /** Transaction identifier */
  txId: string;
  /** Overall risk score (0-100, higher = riskier) */
  riskScore: number;
  /** Risk level category */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Detected threats */
  threats: ThreatIndicator[];
  /** Recommendations */
  recommendations: string[];
  /** Should transaction be blocked */
  shouldBlock: boolean;
  /** Analysis timestamp */
  analyzedAt: number;
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  /** Threat type */
  type: 'blacklist' | 'pattern' | 'anomaly' | 'contract' | 'amount' | 'velocity';
  /** Severity */
  severity: 'info' | 'warning' | 'danger' | 'critical';
  /** Threat description */
  description: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Pattern detection result
 */
export interface PatternMatch {
  /** Pattern name */
  patternName: string;
  /** Pattern type */
  patternType: 'suspicious' | 'malicious' | 'fraud' | 'wash_trading' | 'custom';
  /** Match confidence (0-1) */
  confidence: number;
  /** Matched addresses */
  involvedAddresses: string[];
  /** Description */
  description: string;
  /** Detection timestamp */
  detectedAt: number;
}

/**
 * Sentinel Provider Interface
 */
export interface ISentinelProvider {
  /** Provider identifier */
  readonly name: string;

  // ============================================
  // Reputation Management
  // ============================================

  /**
   * Get reputation score for an address
   * @param address - Address to check
   * @returns Reputation score
   */
  getReputation(address: string): Promise<ReputationScore>;

  /**
   * Update reputation for an address
   * @param address - Address to update
   * @param factor - Factor to add/update
   */
  updateReputation(address: string, factor: ReputationFactor): Promise<ReputationScore>;

  /**
   * Check if address meets minimum reputation threshold
   * @param address - Address to check
   * @param minScore - Minimum required score
   * @returns Whether address meets threshold
   */
  meetsReputationThreshold(address: string, minScore: number): Promise<boolean>;

  // ============================================
  // Blacklist Management
  // ============================================

  /**
   * Check if address is blacklisted
   * @param address - Address to check
   * @returns Blacklist entry if found
   */
  checkBlacklist(address: string): Promise<BlacklistEntry | null>;

  /**
   * Add address to blacklist
   * @param entry - Blacklist entry
   */
  addToBlacklist(entry: Omit<BlacklistEntry, 'addedAt'>): Promise<void>;

  /**
   * Remove address from blacklist
   * @param address - Address to remove
   */
  removeFromBlacklist(address: string): Promise<void>;

  /**
   * Get all blacklisted addresses
   * @param filter - Optional filter
   * @returns List of blacklist entries
   */
  getBlacklist(filter?: { severity?: string; source?: string }): Promise<BlacklistEntry[]>;

  // ============================================
  // Transaction Analysis
  // ============================================

  /**
   * Analyze a transaction for threats
   * @param tx - Transaction data
   * @returns Analysis result
   */
  analyzeTransaction(tx: TransactionData): Promise<TransactionAnalysis>;

  /**
   * Analyze multiple transactions in batch
   * @param transactions - Transactions to analyze
   * @returns Analysis results
   */
  analyzeBatch(transactions: TransactionData[]): Promise<TransactionAnalysis[]>;

  /**
   * Detect patterns across transactions
   * @param transactions - Transactions to analyze
   * @returns Detected patterns
   */
  detectPatterns(transactions: TransactionData[]): Promise<PatternMatch[]>;

  // ============================================
  // Real-time Monitoring
  // ============================================

  /**
   * Report suspicious activity
   * @param address - Address involved
   * @param activity - Activity description
   * @param severity - Severity level
   */
  reportActivity(
    address: string,
    activity: string,
    severity: 'info' | 'warning' | 'danger' | 'critical'
  ): Promise<void>;

  /**
   * Get recent alerts for an address
   * @param address - Address to check
   * @param limit - Max alerts to return
   * @returns Recent alerts
   */
  getRecentAlerts(
    address: string,
    limit?: number
  ): Promise<Array<{ activity: string; severity: string; timestamp: number }>>;

  /**
   * Health check
   * @returns true if provider is operational
   */
  healthCheck(): Promise<boolean>;
}
