/**
 * Mock OPA Provider
 *
 * LEGO-swappable implementation for testing and development.
 * Provides configurable policy responses without real evaluation.
 */

import {
  IOPAProvider,
  OPAPolicy,
  OPAPolicyContext,
  OPADecision,
  OPABulkDecision,
  OPAActionType,
} from '../interfaces/IOPAProvider';

export interface MockOPAConfig {
  /** Default decision (allow/deny all) */
  defaultDecision?: 'allow' | 'deny';
  /** Specific decisions for action types */
  actionDecisions?: Record<OPAActionType, 'allow' | 'deny'>;
  /** Simulate evaluation delay */
  simulatedDelay?: number;
  /** Addresses to always deny */
  denyAddresses?: string[];
}

export class MockOPAProvider implements IOPAProvider {
  readonly name = 'mock-opa';

  private policies = new Map<string, OPAPolicy>();
  private config: MockOPAConfig;
  private denyAddresses: Set<string>;

  constructor(config?: MockOPAConfig) {
    this.config = {
      defaultDecision: config?.defaultDecision ?? 'allow',
      actionDecisions: config?.actionDecisions,
      simulatedDelay: config?.simulatedDelay ?? 0,
      denyAddresses: config?.denyAddresses,
    };
    this.denyAddresses = new Set(
      (config?.denyAddresses || []).map((a) => a.toLowerCase())
    );
  }

  private async delay(): Promise<void> {
    if (this.config.simulatedDelay && this.config.simulatedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulatedDelay));
    }
  }

  async evaluate(context: OPAPolicyContext): Promise<OPADecision> {
    await this.delay();

    const now = Math.floor(Date.now() / 1000);

    // Check deny addresses
    if (context.target && this.denyAddresses.has(context.target.toLowerCase())) {
      return {
        allowed: false,
        reason: 'Mock: Address in deny list',
        policiesEvaluated: ['mock-deny-list'],
        denyingPolicy: 'mock-deny-list',
        evaluatedAt: now,
      };
    }

    // Check action-specific decisions
    if (this.config.actionDecisions?.[context.action]) {
      const decision = this.config.actionDecisions[context.action];
      return {
        allowed: decision === 'allow',
        reason: `Mock: Action-specific decision for ${context.action}`,
        policiesEvaluated: [`mock-action-${context.action}`],
        denyingPolicy: decision === 'deny' ? `mock-action-${context.action}` : undefined,
        evaluatedAt: now,
      };
    }

    // Default decision
    const allowed = this.config.defaultDecision === 'allow';
    return {
      allowed,
      reason: `Mock: Default decision (${this.config.defaultDecision})`,
      policiesEvaluated: ['mock-default'],
      denyingPolicy: allowed ? undefined : 'mock-default',
      evaluatedAt: now,
    };
  }

  async evaluateBatch(contexts: OPAPolicyContext[]): Promise<OPABulkDecision> {
    await this.delay();

    const decisions = await Promise.all(contexts.map((c) => this.evaluate(c)));

    return {
      decisions,
      overallAllowed: decisions.every((d) => d.allowed),
      denialSummary: decisions.filter((d) => !d.allowed).map((d) => d.reason),
    };
  }

  async addPolicy(
    policy: Omit<OPAPolicy, 'createdAt' | 'updatedAt'>
  ): Promise<OPAPolicy> {
    await this.delay();

    const now = Math.floor(Date.now() / 1000);
    const fullPolicy: OPAPolicy = {
      ...policy,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    return fullPolicy;
  }

  async updatePolicy(id: string, updates: Partial<OPAPolicy>): Promise<OPAPolicy> {
    await this.delay();

    const existing = this.policies.get(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    const updated: OPAPolicy = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    this.policies.set(id, updated);
    return updated;
  }

  async removePolicy(id: string): Promise<void> {
    await this.delay();
    this.policies.delete(id);
  }

  async getPolicy(id: string): Promise<OPAPolicy | null> {
    await this.delay();
    return this.policies.get(id) || null;
  }

  async listPolicies(filter?: {
    enabled?: boolean;
    appliesTo?: OPAActionType;
  }): Promise<OPAPolicy[]> {
    await this.delay();

    let policies = Array.from(this.policies.values());

    if (filter?.enabled !== undefined) {
      policies = policies.filter((p) => p.enabled === filter.enabled);
    }

    if (filter?.appliesTo) {
      policies = policies.filter((p) => p.appliesTo.includes(filter.appliesTo!));
    }

    return policies;
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.delay();

    const policy = this.policies.get(id);
    if (policy) {
      policy.enabled = enabled;
      policy.updatedAt = Math.floor(Date.now() / 1000);
    }
  }

  async validatePolicy(
    policy: Partial<OPAPolicy>
  ): Promise<{ valid: boolean; errors: string[] }> {
    await this.delay();

    // Mock validation - always valid unless obviously broken
    const errors: string[] = [];

    if (!policy.id) errors.push('ID required');
    if (!policy.name) errors.push('Name required');

    return { valid: errors.length === 0, errors };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  setDefaultDecision(decision: 'allow' | 'deny'): void {
    this.config.defaultDecision = decision;
  }

  setActionDecision(action: OPAActionType, decision: 'allow' | 'deny'): void {
    this.config.actionDecisions = this.config.actionDecisions || {} as Record<OPAActionType, 'allow' | 'deny'>;
    this.config.actionDecisions[action] = decision;
  }

  addDenyAddress(address: string): void {
    this.denyAddresses.add(address.toLowerCase());
  }

  removeDenyAddress(address: string): void {
    this.denyAddresses.delete(address.toLowerCase());
  }

  clearPolicies(): void {
    this.policies.clear();
  }
}
