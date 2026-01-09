/**
 * Default Sentinel Provider - Production Implementation
 *
 * LEGO-swappable implementation for security monitoring.
 * Provides reputation scoring, blacklist management, and threat analysis.
 */

import { ethers } from 'ethers';
import {
  ISentinelProvider,
  ReputationScore,
  ReputationFactor,
  BlacklistEntry,
  TransactionData,
  TransactionAnalysis,
  ThreatIndicator,
  PatternMatch,
} from '../interfaces/ISentinelProvider';

export interface DefaultSentinelConfig {
  /** Base reputation score for new addresses */
  baseReputationScore: number;
  /** Score validity period in seconds */
  scoreValidityPeriod: number;
  /** Minimum transactions for reliable score */
  minTransactionsForScore: number;
  /** High value threshold in wei */
  highValueThreshold: bigint;
  /** Velocity limit (transactions per hour) */
  velocityLimit: number;
  /** Auto-expire blacklist entries after seconds (null = never) */
  blacklistExpiry: number | null;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

// Default configuration
const DEFAULT_CONFIG: DefaultSentinelConfig = {
  baseReputationScore: 50,
  scoreValidityPeriod: 86400, // 24 hours
  minTransactionsForScore: 5,
  highValueThreshold: BigInt('10000000000000000000'), // 10 ETH
  velocityLimit: 50,
  blacklistExpiry: null,
};

// SECURITY: Maximum entries to prevent memory leaks
const MAX_REPUTATIONS = 50000;
const MAX_BLACKLIST = 10000;
const MAX_ALERTS_TOTAL = 100000;
const MAX_TX_HISTORY_TOTAL = 500000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

export class DefaultSentinelProvider implements ISentinelProvider {
  readonly name = 'sentinel-default';

  private reputations = new Map<string, ReputationScore>();
  private blacklist = new Map<string, BlacklistEntry>();
  private alerts = new Map<string, Array<{ activity: string; severity: string; timestamp: number }>>();
  private transactionHistory = new Map<string, TransactionData[]>();
  private config: DefaultSentinelConfig;
  private logger?: Logger;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<DefaultSentinelConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;

    // SECURITY: Start cleanup timer to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
  }

  /**
   * SECURITY: Cleanup expired entries to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Math.floor(Date.now() / 1000);

    // Clean expired reputations
    for (const [key, rep] of this.reputations) {
      if (rep.validUntil < now) {
        this.reputations.delete(key);
      }
    }

    // Clean expired blacklist entries
    for (const [key, entry] of this.blacklist) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.blacklist.delete(key);
      }
    }

    // Enforce maximum sizes - remove oldest entries if over limit
    if (this.reputations.size > MAX_REPUTATIONS) {
      const entries = Array.from(this.reputations.entries())
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toDelete = this.reputations.size - MAX_REPUTATIONS;
      for (let i = 0; i < toDelete; i++) {
        this.reputations.delete(entries[i][0]);
      }
    }

    if (this.blacklist.size > MAX_BLACKLIST) {
      const entries = Array.from(this.blacklist.entries())
        .sort((a, b) => a[1].addedAt - b[1].addedAt);
      const toDelete = this.blacklist.size - MAX_BLACKLIST;
      for (let i = 0; i < toDelete; i++) {
        this.blacklist.delete(entries[i][0]);
      }
    }

    // Count total alerts and trim if needed
    let totalAlerts = 0;
    for (const alerts of this.alerts.values()) {
      totalAlerts += alerts.length;
    }
    if (totalAlerts > MAX_ALERTS_TOTAL) {
      for (const [key, alerts] of this.alerts) {
        if (alerts.length > 10) {
          this.alerts.set(key, alerts.slice(-10));
        }
      }
    }

    // Count total tx history and trim if needed
    let totalTx = 0;
    for (const txs of this.transactionHistory.values()) {
      totalTx += txs.length;
    }
    if (totalTx > MAX_TX_HISTORY_TOTAL) {
      for (const [key, txs] of this.transactionHistory) {
        if (txs.length > 50) {
          this.transactionHistory.set(key, txs.slice(-50));
        }
      }
    }
  }

  /**
   * Cleanup resources when provider is destroyed
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.reputations.clear();
    this.blacklist.clear();
    this.alerts.clear();
    this.transactionHistory.clear();
  }

  // ============================================
  // Reputation Management
  // ============================================

  async getReputation(address: string): Promise<ReputationScore> {
    const key = address.toLowerCase();
    const existing = this.reputations.get(key);
    const now = Math.floor(Date.now() / 1000);

    // Return existing if still valid
    if (existing && existing.validUntil > now) {
      return existing;
    }

    // Calculate new reputation
    const score = await this.calculateReputation(key);
    this.reputations.set(key, score);

    return score;
  }

  private async calculateReputation(address: string): Promise<ReputationScore> {
    const now = Math.floor(Date.now() / 1000);
    const factors: ReputationFactor[] = [];
    let totalScore = this.config.baseReputationScore;

    // Check if blacklisted
    const blacklistEntry = this.blacklist.get(address);
    if (blacklistEntry && (!blacklistEntry.expiresAt || blacklistEntry.expiresAt > now)) {
      factors.push({
        name: 'blacklisted',
        contribution: -100,
        weight: 1,
        description: `Blacklisted: ${blacklistEntry.reason}`,
      });
      totalScore = 0;
    }

    // Check transaction history
    const history = this.transactionHistory.get(address) || [];
    if (history.length >= this.config.minTransactionsForScore) {
      const historyFactor = this.analyzeTransactionHistory(history);
      factors.push(historyFactor);
      totalScore += historyFactor.contribution * historyFactor.weight;
    }

    // Age factor (if we tracked first seen)
    factors.push({
      name: 'account_age',
      contribution: 10,
      weight: 0.2,
      description: 'Account age contribution',
    });
    totalScore += 2;

    // Normalize score
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (totalScore >= 70) riskLevel = 'low';
    else if (totalScore >= 50) riskLevel = 'medium';
    else if (totalScore >= 25) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      address,
      score: totalScore,
      confidence: Math.min(history.length / 20, 1), // Max confidence at 20 transactions
      riskLevel,
      factors,
      updatedAt: now,
      validUntil: now + this.config.scoreValidityPeriod,
    };
  }

  private analyzeTransactionHistory(history: TransactionData[]): ReputationFactor {
    let contribution = 0;

    // Consistent activity is good
    if (history.length >= 10) {
      contribution += 10;
    }

    // Check for suspicious patterns
    const recentTransactions = history.slice(-10);
    const uniqueRecipients = new Set(recentTransactions.map((t) => t.to.toLowerCase()));

    // Diversity of recipients is good
    if (uniqueRecipients.size >= 5) {
      contribution += 5;
    }

    // Too many transactions to same address might be suspicious
    if (uniqueRecipients.size === 1 && recentTransactions.length > 5) {
      contribution -= 10;
    }

    return {
      name: 'transaction_history',
      contribution,
      weight: 0.5,
      description: `Based on ${history.length} transactions`,
    };
  }

  async updateReputation(address: string, factor: ReputationFactor): Promise<ReputationScore> {
    const key = address.toLowerCase();
    const existing = await this.getReputation(key);

    // Add or update factor
    const factorIndex = existing.factors.findIndex((f) => f.name === factor.name);
    if (factorIndex >= 0) {
      existing.factors[factorIndex] = factor;
    } else {
      existing.factors.push(factor);
    }

    // Recalculate score
    let totalScore = this.config.baseReputationScore;
    for (const f of existing.factors) {
      totalScore += f.contribution * f.weight;
    }
    existing.score = Math.max(0, Math.min(100, totalScore));

    // Update risk level
    if (existing.score >= 70) existing.riskLevel = 'low';
    else if (existing.score >= 50) existing.riskLevel = 'medium';
    else if (existing.score >= 25) existing.riskLevel = 'high';
    else existing.riskLevel = 'critical';

    existing.updatedAt = Math.floor(Date.now() / 1000);
    this.reputations.set(key, existing);

    this.logger?.info({ address, newScore: existing.score }, '[Sentinel] Reputation updated');

    return existing;
  }

  async meetsReputationThreshold(address: string, minScore: number): Promise<boolean> {
    const reputation = await this.getReputation(address);
    return reputation.score >= minScore;
  }

  // ============================================
  // Blacklist Management
  // ============================================

  async checkBlacklist(address: string): Promise<BlacklistEntry | null> {
    const key = address.toLowerCase();
    const entry = this.blacklist.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (entry.expiresAt && entry.expiresAt < now) {
      this.blacklist.delete(key);
      return null;
    }

    return entry;
  }

  async addToBlacklist(entry: Omit<BlacklistEntry, 'addedAt'>): Promise<void> {
    const key = entry.address.toLowerCase();
    const now = Math.floor(Date.now() / 1000);

    const fullEntry: BlacklistEntry = {
      ...entry,
      address: key,
      addedAt: now,
    };

    this.blacklist.set(key, fullEntry);

    // Invalidate reputation cache
    this.reputations.delete(key);

    this.logger?.info(
      { address: entry.address, reason: entry.reason, severity: entry.severity },
      '[Sentinel] Address added to blacklist'
    );
  }

  async removeFromBlacklist(address: string): Promise<void> {
    const key = address.toLowerCase();
    this.blacklist.delete(key);

    // Invalidate reputation cache
    this.reputations.delete(key);

    this.logger?.info({ address }, '[Sentinel] Address removed from blacklist');
  }

  async getBlacklist(filter?: { severity?: string; source?: string }): Promise<BlacklistEntry[]> {
    const now = Math.floor(Date.now() / 1000);
    let entries = Array.from(this.blacklist.values());

    // Filter expired
    entries = entries.filter((e) => !e.expiresAt || e.expiresAt > now);

    if (filter?.severity) {
      entries = entries.filter((e) => e.severity === filter.severity);
    }

    if (filter?.source) {
      entries = entries.filter((e) => e.source === filter.source);
    }

    return entries;
  }

  // ============================================
  // Transaction Analysis
  // ============================================

  async analyzeTransaction(tx: TransactionData): Promise<TransactionAnalysis> {
    const threats: ThreatIndicator[] = [];
    let riskScore = 0;

    // Check blacklist
    const fromBlacklist = await this.checkBlacklist(tx.from);
    const toBlacklist = await this.checkBlacklist(tx.to);

    if (fromBlacklist) {
      threats.push({
        type: 'blacklist',
        severity: fromBlacklist.severity === 'critical' ? 'critical' : 'danger',
        description: `Sender is blacklisted: ${fromBlacklist.reason}`,
        details: { address: tx.from, entry: fromBlacklist },
      });
      riskScore += fromBlacklist.severity === 'critical' ? 50 : 30;
    }

    if (toBlacklist) {
      threats.push({
        type: 'blacklist',
        severity: toBlacklist.severity === 'critical' ? 'critical' : 'danger',
        description: `Recipient is blacklisted: ${toBlacklist.reason}`,
        details: { address: tx.to, entry: toBlacklist },
      });
      riskScore += toBlacklist.severity === 'critical' ? 50 : 30;
    }

    // Check high value
    if (tx.value >= this.config.highValueThreshold) {
      threats.push({
        type: 'amount',
        severity: 'warning',
        description: `High value transaction: ${ethers.formatEther(tx.value)} ETH`,
        details: { value: tx.value.toString(), threshold: this.config.highValueThreshold.toString() },
      });
      riskScore += 15;
    }

    // Check velocity
    const senderHistory = this.transactionHistory.get(tx.from.toLowerCase()) || [];
    const recentHour = tx.timestamp - 3600;
    const recentCount = senderHistory.filter((t) => t.timestamp >= recentHour).length;

    if (recentCount >= this.config.velocityLimit) {
      threats.push({
        type: 'velocity',
        severity: 'warning',
        description: `High transaction velocity: ${recentCount} in last hour`,
        details: { count: recentCount, limit: this.config.velocityLimit },
      });
      riskScore += 20;
    }

    // Check reputation
    const senderReputation = await this.getReputation(tx.from);
    if (senderReputation.riskLevel === 'high' || senderReputation.riskLevel === 'critical') {
      threats.push({
        type: 'pattern',
        severity: 'warning',
        description: `Low sender reputation: ${senderReputation.score}/100`,
        details: { reputation: senderReputation },
      });
      riskScore += 10;
    }

    // Store transaction for history
    this.storeTransaction(tx);

    // Normalize risk score
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore < 20) riskLevel = 'low';
    else if (riskScore < 40) riskLevel = 'medium';
    else if (riskScore < 70) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Consider additional verification before proceeding');
    }
    if (threats.some((t) => t.type === 'blacklist')) {
      recommendations.push('Block transaction - involves blacklisted address');
    }
    if (threats.some((t) => t.type === 'velocity')) {
      recommendations.push('Apply rate limiting');
    }

    const txId = tx.txHash || ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'address', 'uint256', 'uint256'],
        [tx.from, tx.to, tx.value, tx.timestamp]
      )
    );

    return {
      txId,
      riskScore,
      riskLevel,
      threats,
      recommendations,
      shouldBlock: riskLevel === 'critical' || threats.some((t) => t.type === 'blacklist'),
      analyzedAt: Math.floor(Date.now() / 1000),
    };
  }

  private storeTransaction(tx: TransactionData): void {
    const key = tx.from.toLowerCase();
    const history = this.transactionHistory.get(key) || [];
    history.push(tx);

    // Keep only last 100 transactions per address
    if (history.length > 100) {
      history.shift();
    }

    this.transactionHistory.set(key, history);
  }

  async analyzeBatch(transactions: TransactionData[]): Promise<TransactionAnalysis[]> {
    return Promise.all(transactions.map((tx) => this.analyzeTransaction(tx)));
  }

  async detectPatterns(transactions: TransactionData[]): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Group by sender
    const bySender = new Map<string, TransactionData[]>();
    for (const tx of transactions) {
      const key = tx.from.toLowerCase();
      const list = bySender.get(key) || [];
      list.push(tx);
      bySender.set(key, list);
    }

    // Detect wash trading pattern (same sender/receiver)
    for (const [sender, txs] of bySender) {
      const selfTransfers = txs.filter((t) => t.to.toLowerCase() === sender);
      if (selfTransfers.length >= 3) {
        patterns.push({
          patternName: 'Self-transfer Activity',
          patternType: 'suspicious',
          confidence: Math.min(selfTransfers.length / 10, 1),
          involvedAddresses: [sender],
          description: `${selfTransfers.length} self-transfers detected`,
          detectedAt: now,
        });
      }
    }

    // Detect circular transfers
    const edges = new Map<string, Set<string>>();
    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      if (!edges.has(from)) edges.set(from, new Set());
      edges.get(from)!.add(to);
    }

    for (const [sender, recipients] of edges) {
      for (const recipient of recipients) {
        if (edges.get(recipient)?.has(sender)) {
          patterns.push({
            patternName: 'Circular Transfer',
            patternType: 'wash_trading',
            confidence: 0.7,
            involvedAddresses: [sender, recipient],
            description: `Circular transfers between ${sender.slice(0, 10)}... and ${recipient.slice(0, 10)}...`,
            detectedAt: now,
          });
        }
      }
    }

    return patterns;
  }

  // ============================================
  // Real-time Monitoring
  // ============================================

  async reportActivity(
    address: string,
    activity: string,
    severity: 'info' | 'warning' | 'danger' | 'critical'
  ): Promise<void> {
    const key = address.toLowerCase();
    const alerts = this.alerts.get(key) || [];
    const now = Math.floor(Date.now() / 1000);

    alerts.push({ activity, severity, timestamp: now });

    // Keep only last 50 alerts per address
    if (alerts.length > 50) {
      alerts.shift();
    }

    this.alerts.set(key, alerts);

    this.logger?.info({ address, activity, severity }, '[Sentinel] Activity reported');
  }

  async getRecentAlerts(
    address: string,
    limit: number = 10
  ): Promise<Array<{ activity: string; severity: string; timestamp: number }>> {
    const key = address.toLowerCase();
    const alerts = this.alerts.get(key) || [];
    return alerts.slice(-limit);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
