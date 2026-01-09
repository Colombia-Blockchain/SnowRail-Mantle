/**
 * Mock Sentinel Provider
 *
 * LEGO-swappable implementation for testing and development.
 * Provides configurable responses for security checks.
 */

import { ethers } from 'ethers';
import {
  ISentinelProvider,
  ReputationScore,
  ReputationFactor,
  BlacklistEntry,
  TransactionData,
  TransactionAnalysis,
  PatternMatch,
} from '../interfaces/ISentinelProvider';

export interface MockSentinelConfig {
  /** Default reputation score for all addresses */
  defaultReputationScore?: number;
  /** Addresses with custom reputation scores */
  customScores?: Record<string, number>;
  /** Addresses to blacklist */
  blacklistedAddresses?: string[];
  /** Always return safe analysis */
  alwaysSafe?: boolean;
  /** Simulated delay */
  simulatedDelay?: number;
}

export class MockSentinelProvider implements ISentinelProvider {
  readonly name = 'mock-sentinel';

  private reputations = new Map<string, ReputationScore>();
  private blacklist = new Map<string, BlacklistEntry>();
  private alerts = new Map<string, Array<{ activity: string; severity: string; timestamp: number }>>();
  private config: MockSentinelConfig;

  constructor(config?: MockSentinelConfig) {
    this.config = {
      defaultReputationScore: config?.defaultReputationScore ?? 75,
      customScores: config?.customScores ?? {},
      blacklistedAddresses: config?.blacklistedAddresses ?? [],
      alwaysSafe: config?.alwaysSafe ?? true,
      simulatedDelay: config?.simulatedDelay ?? 0,
    };

    // Initialize blacklist
    for (const addr of this.config.blacklistedAddresses || []) {
      this.blacklist.set(addr.toLowerCase(), {
        address: addr.toLowerCase(),
        reason: 'Mock blacklisted',
        severity: 'danger',
        source: 'mock',
        addedAt: Math.floor(Date.now() / 1000),
        expiresAt: null,
        tags: ['mock'],
      });
    }
  }

  private async delay(): Promise<void> {
    if (this.config.simulatedDelay && this.config.simulatedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulatedDelay));
    }
  }

  // ============================================
  // Reputation Management
  // ============================================

  async getReputation(address: string): Promise<ReputationScore> {
    await this.delay();

    const key = address.toLowerCase();
    const existing = this.reputations.get(key);
    if (existing) return existing;

    const now = Math.floor(Date.now() / 1000);

    // Check for custom score
    const customScore = this.config.customScores?.[key] ??
                       this.config.customScores?.[address];

    const score = customScore ?? this.config.defaultReputationScore ?? 75;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 70) riskLevel = 'low';
    else if (score >= 50) riskLevel = 'medium';
    else if (score >= 25) riskLevel = 'high';
    else riskLevel = 'critical';

    const reputation: ReputationScore = {
      address,
      score,
      confidence: 0.9,
      riskLevel,
      factors: [
        {
          name: 'mock_factor',
          contribution: score - 50,
          weight: 1,
          description: 'Mock reputation factor',
        },
      ],
      updatedAt: now,
      validUntil: now + 86400,
    };

    this.reputations.set(key, reputation);
    return reputation;
  }

  async updateReputation(address: string, factor: ReputationFactor): Promise<ReputationScore> {
    await this.delay();

    const reputation = await this.getReputation(address);
    reputation.factors.push(factor);
    reputation.score = Math.max(0, Math.min(100, reputation.score + factor.contribution * factor.weight));
    reputation.updatedAt = Math.floor(Date.now() / 1000);

    this.reputations.set(address.toLowerCase(), reputation);
    return reputation;
  }

  async meetsReputationThreshold(address: string, minScore: number): Promise<boolean> {
    const reputation = await this.getReputation(address);
    return reputation.score >= minScore;
  }

  // ============================================
  // Blacklist Management
  // ============================================

  async checkBlacklist(address: string): Promise<BlacklistEntry | null> {
    await this.delay();
    return this.blacklist.get(address.toLowerCase()) || null;
  }

  async addToBlacklist(entry: Omit<BlacklistEntry, 'addedAt'>): Promise<void> {
    await this.delay();

    const fullEntry: BlacklistEntry = {
      ...entry,
      address: entry.address.toLowerCase(),
      addedAt: Math.floor(Date.now() / 1000),
    };

    this.blacklist.set(entry.address.toLowerCase(), fullEntry);
  }

  async removeFromBlacklist(address: string): Promise<void> {
    await this.delay();
    this.blacklist.delete(address.toLowerCase());
  }

  async getBlacklist(filter?: { severity?: string; source?: string }): Promise<BlacklistEntry[]> {
    await this.delay();

    let entries = Array.from(this.blacklist.values());

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
    await this.delay();

    const now = Math.floor(Date.now() / 1000);
    const txId = tx.txHash || ethers.keccak256(
      ethers.toUtf8Bytes(`mock-tx-${tx.from}-${tx.to}-${now}`)
    );

    // If alwaysSafe, return clean analysis
    if (this.config.alwaysSafe) {
      return {
        txId,
        riskScore: 5,
        riskLevel: 'low',
        threats: [],
        recommendations: [],
        shouldBlock: false,
        analyzedAt: now,
      };
    }

    // Check blacklist
    const fromBlacklist = this.blacklist.get(tx.from.toLowerCase());
    const toBlacklist = this.blacklist.get(tx.to.toLowerCase());

    if (fromBlacklist || toBlacklist) {
      return {
        txId,
        riskScore: 95,
        riskLevel: 'critical',
        threats: [
          {
            type: 'blacklist',
            severity: 'critical',
            description: 'Blacklisted address involved',
          },
        ],
        recommendations: ['Block transaction'],
        shouldBlock: true,
        analyzedAt: now,
      };
    }

    return {
      txId,
      riskScore: 10,
      riskLevel: 'low',
      threats: [],
      recommendations: [],
      shouldBlock: false,
      analyzedAt: now,
    };
  }

  async analyzeBatch(transactions: TransactionData[]): Promise<TransactionAnalysis[]> {
    return Promise.all(transactions.map((tx) => this.analyzeTransaction(tx)));
  }

  async detectPatterns(transactions: TransactionData[]): Promise<PatternMatch[]> {
    await this.delay();

    // Mock: no patterns detected
    return [];
  }

  // ============================================
  // Real-time Monitoring
  // ============================================

  async reportActivity(
    address: string,
    activity: string,
    severity: 'info' | 'warning' | 'danger' | 'critical'
  ): Promise<void> {
    await this.delay();

    const key = address.toLowerCase();
    const alerts = this.alerts.get(key) || [];
    alerts.push({
      activity,
      severity,
      timestamp: Math.floor(Date.now() / 1000),
    });
    this.alerts.set(key, alerts);
  }

  async getRecentAlerts(
    address: string,
    limit: number = 10
  ): Promise<Array<{ activity: string; severity: string; timestamp: number }>> {
    await this.delay();
    const alerts = this.alerts.get(address.toLowerCase()) || [];
    return alerts.slice(-limit);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  setCustomScore(address: string, score: number): void {
    this.config.customScores = this.config.customScores || {};
    this.config.customScores[address.toLowerCase()] = score;
    this.reputations.delete(address.toLowerCase());
  }

  setAlwaysSafe(value: boolean): void {
    this.config.alwaysSafe = value;
  }

  clearAll(): void {
    this.reputations.clear();
    this.blacklist.clear();
    this.alerts.clear();
  }
}
