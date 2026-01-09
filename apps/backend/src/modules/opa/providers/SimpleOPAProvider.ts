/**
 * Simple OPA Provider - TypeScript-based Policy Engine
 *
 * LEGO-swappable implementation that evaluates policies locally.
 * No external OPA server required - pure TypeScript rules.
 */

import {
  IOPAProvider,
  OPAPolicy,
  OPAPolicyContext,
  OPAPolicyCondition,
  OPADecision,
  OPABulkDecision,
  OPAActionType,
} from '../interfaces/IOPAProvider';
import { DEFAULT_PAYMENT_POLICIES } from '../policies/payment-rules';

export interface SimpleOPAConfig {
  /** Initial policies to load */
  initialPolicies?: OPAPolicy[];
  /** Blacklisted addresses */
  blacklist?: string[];
  /** Whether to use default policies */
  useDefaults?: boolean;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

export class SimpleOPAProvider implements IOPAProvider {
  readonly name = 'simple-opa';

  private policies = new Map<string, OPAPolicy>();
  private blacklist = new Set<string>();
  private logger?: Logger;

  constructor(config?: SimpleOPAConfig, logger?: Logger) {
    this.logger = logger;

    // Load defaults if enabled
    if (config?.useDefaults !== false) {
      DEFAULT_PAYMENT_POLICIES.forEach((p) => this.policies.set(p.id, p));
    }

    // Load initial policies
    if (config?.initialPolicies) {
      config.initialPolicies.forEach((p) => this.policies.set(p.id, p));
    }

    // Load blacklist
    if (config?.blacklist) {
      config.blacklist.forEach((addr) => this.blacklist.add(addr.toLowerCase()));
    }
  }

  async evaluate(context: OPAPolicyContext): Promise<OPADecision> {
    const policiesEvaluated: string[] = [];
    const warnings: string[] = [];
    let denyingPolicy: string | undefined;

    // Get applicable policies sorted by priority
    const applicablePolicies = Array.from(this.policies.values())
      .filter((p) => p.enabled && p.appliesTo.includes(context.action))
      .sort((a, b) => a.priority - b.priority);

    this.logger?.debug(
      { action: context.action, policyCount: applicablePolicies.length },
      '[OPA] Evaluating policies'
    );

    for (const policy of applicablePolicies) {
      policiesEvaluated.push(policy.id);

      // Check if all conditions match
      const matches = this.evaluateConditions(policy.conditions, context);

      if (matches) {
        switch (policy.effect) {
          case 'deny':
            denyingPolicy = policy.id;
            this.logger?.info(
              { policy: policy.id, action: context.action },
              '[OPA] Action denied by policy'
            );
            return {
              allowed: false,
              reason: `Denied by policy: ${policy.name}`,
              policiesEvaluated,
              denyingPolicy,
              evaluatedAt: Math.floor(Date.now() / 1000),
            };

          case 'warn':
            warnings.push(`${policy.name}: ${policy.description}`);
            break;

          case 'allow':
            // Continue to check other policies (deny policies might still apply)
            break;
        }
      }
    }

    // No deny policies matched
    this.logger?.debug(
      { action: context.action, warnings: warnings.length },
      '[OPA] Action allowed'
    );

    return {
      allowed: true,
      reason: 'All policies passed',
      policiesEvaluated,
      warnings: warnings.length > 0 ? warnings : undefined,
      evaluatedAt: Math.floor(Date.now() / 1000),
    };
  }

  private evaluateConditions(
    conditions: OPAPolicyCondition[],
    context: OPAPolicyContext
  ): boolean {
    // All conditions must match (AND)
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, context);
      const matches = this.evaluateCondition(condition, value);

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  private getFieldValue(field: string, context: OPAPolicyContext): unknown {
    // Handle nested fields with dot notation
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  private evaluateCondition(condition: OPAPolicyCondition, value: unknown): boolean {
    const { operator, value: conditionValue } = condition;

    // Special handling for blacklist check
    if (condition.field === 'target' && operator === 'in' && Array.isArray(conditionValue)) {
      // Check both against condition value and internal blacklist
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (this.blacklist.has(lower)) {
          return true;
        }
      }
    }

    switch (operator) {
      case 'eq':
        return this.compareValues(value, conditionValue) === 0;

      case 'neq':
        return this.compareValues(value, conditionValue) !== 0;

      case 'gt':
        return this.compareValues(value, conditionValue) > 0;

      case 'gte':
        return this.compareValues(value, conditionValue) >= 0;

      case 'lt':
        return this.compareValues(value, conditionValue) < 0;

      case 'lte':
        return this.compareValues(value, conditionValue) <= 0;

      case 'in':
        if (!Array.isArray(conditionValue)) return false;
        return conditionValue.some((v) => this.compareValues(value, v) === 0);

      case 'notIn':
        if (!Array.isArray(conditionValue)) return true;
        return !conditionValue.some((v) => this.compareValues(value, v) === 0);

      case 'contains':
        if (typeof value === 'string' && typeof conditionValue === 'string') {
          return value.includes(conditionValue);
        }
        if (Array.isArray(value)) {
          return value.some((v) => this.compareValues(v, conditionValue) === 0);
        }
        return false;

      case 'matches':
        if (typeof value === 'string' && typeof conditionValue === 'string') {
          try {
            // SECURITY: Validate regex pattern to prevent ReDoS attacks
            // 1. Limit pattern length
            if (conditionValue.length > 200) {
              this.logger?.warn({ pattern: conditionValue.slice(0, 50) }, '[OPA] Regex pattern too long');
              return false;
            }
            // 2. Check for dangerous patterns (nested quantifiers, excessive backtracking)
            const dangerousPatterns = [
              /\(\?[<>=!]/, // Lookahead/lookbehind
              /\([^)]*\+\)[*+]/, // (x+)+ patterns
              /\([^)]*\*\)[*+]/, // (x*)+ patterns
              /\.\*\.\*\.\*/, // Multiple .* patterns
            ];
            for (const dangerous of dangerousPatterns) {
              if (dangerous.test(conditionValue)) {
                this.logger?.warn({ pattern: conditionValue }, '[OPA] Potentially dangerous regex pattern blocked');
                return false;
              }
            }
            // 3. Use timeout-based execution (via limiting input length)
            const maxInputLength = 10000;
            const truncatedValue = value.length > maxInputLength ? value.slice(0, maxInputLength) : value;
            return new RegExp(conditionValue).test(truncatedValue);
          } catch {
            return false;
          }
        }
        return false;

      default:
        return false;
    }
  }

  private compareValues(a: unknown, b: unknown): number {
    // Handle BigInt comparison
    if (typeof a === 'bigint' || typeof b === 'bigint') {
      const aNum = typeof a === 'bigint' ? a : BigInt(String(a || 0));
      const bNum = typeof b === 'bigint' ? b : BigInt(String(b || 0));
      if (aNum < bNum) return -1;
      if (aNum > bNum) return 1;
      return 0;
    }

    // Handle string comparison (case-insensitive)
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }

    // Handle null comparison
    if (a === null && b === null) return 0;
    if (a === null) return -1;
    if (b === null) return 1;

    // Handle number comparison
    if (typeof a === 'number' && typeof b === 'number') {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }

    // Default to string comparison
    return String(a).localeCompare(String(b));
  }

  async evaluateBatch(contexts: OPAPolicyContext[]): Promise<OPABulkDecision> {
    const decisions = await Promise.all(contexts.map((c) => this.evaluate(c)));

    const denialSummary = decisions
      .filter((d) => !d.allowed)
      .map((d) => d.reason);

    return {
      decisions,
      overallAllowed: decisions.every((d) => d.allowed),
      denialSummary,
    };
  }

  async addPolicy(
    policy: Omit<OPAPolicy, 'createdAt' | 'updatedAt'>
  ): Promise<OPAPolicy> {
    const now = Math.floor(Date.now() / 1000);
    const fullPolicy: OPAPolicy = {
      ...policy,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    this.logger?.info({ policyId: policy.id }, '[OPA] Policy added');

    return fullPolicy;
  }

  async updatePolicy(id: string, updates: Partial<OPAPolicy>): Promise<OPAPolicy> {
    const existing = this.policies.get(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    const updated: OPAPolicy = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot change
      createdAt: existing.createdAt,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    this.policies.set(id, updated);
    this.logger?.info({ policyId: id }, '[OPA] Policy updated');

    return updated;
  }

  async removePolicy(id: string): Promise<void> {
    this.policies.delete(id);
    this.logger?.info({ policyId: id }, '[OPA] Policy removed');
  }

  async getPolicy(id: string): Promise<OPAPolicy | null> {
    return this.policies.get(id) || null;
  }

  async listPolicies(filter?: {
    enabled?: boolean;
    appliesTo?: OPAActionType;
  }): Promise<OPAPolicy[]> {
    let policies = Array.from(this.policies.values());

    if (filter?.enabled !== undefined) {
      policies = policies.filter((p) => p.enabled === filter.enabled);
    }

    if (filter?.appliesTo) {
      policies = policies.filter((p) => p.appliesTo.includes(filter.appliesTo!));
    }

    return policies.sort((a, b) => a.priority - b.priority);
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Policy not found: ${id}`);
    }

    policy.enabled = enabled;
    policy.updatedAt = Math.floor(Date.now() / 1000);
    this.logger?.info({ policyId: id, enabled }, '[OPA] Policy enabled state changed');
  }

  async validatePolicy(
    policy: Partial<OPAPolicy>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!policy.id || policy.id.length < 1) {
      errors.push('Policy ID is required');
    }

    if (!policy.name || policy.name.length < 1) {
      errors.push('Policy name is required');
    }

    if (!policy.effect || !['allow', 'deny', 'warn'].includes(policy.effect)) {
      errors.push('Policy effect must be allow, deny, or warn');
    }

    if (!policy.appliesTo || !Array.isArray(policy.appliesTo) || policy.appliesTo.length === 0) {
      errors.push('Policy must apply to at least one action type');
    }

    if (policy.conditions) {
      for (let i = 0; i < policy.conditions.length; i++) {
        const cond = policy.conditions[i];
        if (!cond.field) {
          errors.push(`Condition ${i}: field is required`);
        }
        if (!cond.operator) {
          errors.push(`Condition ${i}: operator is required`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Helper methods for managing blacklist
  addToBlacklist(address: string): void {
    this.blacklist.add(address.toLowerCase());
    this.logger?.info({ address }, '[OPA] Address added to blacklist');
  }

  removeFromBlacklist(address: string): void {
    this.blacklist.delete(address.toLowerCase());
    this.logger?.info({ address }, '[OPA] Address removed from blacklist');
  }

  isBlacklisted(address: string): boolean {
    return this.blacklist.has(address.toLowerCase());
  }

  getBlacklist(): string[] {
    return Array.from(this.blacklist);
  }
}
