/**
 * Payment Rules - TypeScript-based Policy Definitions
 *
 * Defines common payment policies in TypeScript for the SimpleOPAProvider.
 * These replace Rego policies for simpler deployment.
 */

import { OPAPolicy, OPAPolicyCondition, OPAActionType } from '../interfaces/IOPAProvider';

/**
 * Create a policy builder for easier policy creation
 */
export class PolicyBuilder {
  private policy: Partial<OPAPolicy> = {
    priority: 100,
    enabled: true,
    conditions: [],
    appliesTo: [],
  };

  id(id: string): PolicyBuilder {
    this.policy.id = id;
    return this;
  }

  name(name: string): PolicyBuilder {
    this.policy.name = name;
    return this;
  }

  description(desc: string): PolicyBuilder {
    this.policy.description = desc;
    return this;
  }

  priority(p: number): PolicyBuilder {
    this.policy.priority = p;
    return this;
  }

  enabled(e: boolean): PolicyBuilder {
    this.policy.enabled = e;
    return this;
  }

  appliesTo(...actions: OPAActionType[]): PolicyBuilder {
    this.policy.appliesTo = actions;
    return this;
  }

  effect(e: 'allow' | 'deny' | 'warn'): PolicyBuilder {
    this.policy.effect = e;
    return this;
  }

  condition(field: string, operator: OPAPolicyCondition['operator'], value: unknown): PolicyBuilder {
    this.policy.conditions = this.policy.conditions || [];
    this.policy.conditions.push({ field, operator, value });
    return this;
  }

  build(): OPAPolicy {
    const now = Math.floor(Date.now() / 1000);
    return {
      ...this.policy,
      createdAt: now,
      updatedAt: now,
    } as OPAPolicy;
  }
}

/**
 * Helper to create policy builder
 */
export function policy(): PolicyBuilder {
  return new PolicyBuilder();
}

// ============================================
// Default Payment Policies
// ============================================

/**
 * Maximum single payment limit
 */
export const maxPaymentLimit = policy()
  .id('max-payment-limit')
  .name('Maximum Payment Limit')
  .description('Deny payments exceeding maximum allowed amount')
  .priority(10)
  .appliesTo('payment', 'transfer')
  .effect('deny')
  .condition('amount', 'gt', BigInt('100000000000000000000')) // 100 ETH
  .build();

/**
 * Blacklisted addresses
 */
export const blacklistCheck = policy()
  .id('blacklist-check')
  .name('Blacklist Check')
  .description('Deny actions to/from blacklisted addresses')
  .priority(1) // High priority - check first
  .appliesTo('payment', 'transfer', 'swap', 'stake', 'lend')
  .effect('deny')
  .condition('target', 'in', []) // Will be populated dynamically
  .build();

/**
 * Minimum payment threshold
 */
export const minPaymentThreshold = policy()
  .id('min-payment-threshold')
  .name('Minimum Payment Threshold')
  .description('Deny payments below dust threshold')
  .priority(20)
  .appliesTo('payment', 'transfer')
  .effect('deny')
  .condition('amount', 'lt', BigInt('1000000000000')) // 0.000001 ETH
  .build();

/**
 * Allowed tokens only
 */
export const allowedTokensOnly = policy()
  .id('allowed-tokens')
  .name('Allowed Tokens Only')
  .description('Only allow approved tokens')
  .priority(15)
  .appliesTo('swap', 'transfer', 'stake')
  .effect('allow')
  .condition('token', 'in', [
    null, // Native token
    '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9', // USDC on Mantle
    '0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111', // ETH wrapper
  ])
  .build();

/**
 * Rate limit warning
 */
export const rateLimitWarning = policy()
  .id('rate-limit-warning')
  .name('Rate Limit Warning')
  .description('Warn when approaching rate limits')
  .priority(50)
  .appliesTo('payment', 'transfer', 'swap')
  .effect('warn')
  .condition('data.transactionCount24h', 'gte', 80) // 80% of limit
  .build();

/**
 * High value transaction warning
 */
export const highValueWarning = policy()
  .id('high-value-warning')
  .name('High Value Warning')
  .description('Warn on high value transactions')
  .priority(40)
  .appliesTo('payment', 'transfer', 'swap')
  .effect('warn')
  .condition('amount', 'gte', BigInt('10000000000000000000')) // 10 ETH
  .build();

/**
 * Default allow policy (lowest priority)
 */
export const defaultAllow = policy()
  .id('default-allow')
  .name('Default Allow')
  .description('Allow all actions not explicitly denied')
  .priority(1000)
  .appliesTo('payment', 'transfer', 'swap', 'stake', 'lend', 'withdraw', 'approve')
  .effect('allow')
  .build();

// ============================================
// Policy Collections
// ============================================

/**
 * Default payment policies for new deployments
 */
export const DEFAULT_PAYMENT_POLICIES: OPAPolicy[] = [
  maxPaymentLimit,
  blacklistCheck,
  minPaymentThreshold,
  highValueWarning,
  rateLimitWarning,
  defaultAllow,
];

/**
 * Strict policies for production environments
 */
export const STRICT_POLICIES: OPAPolicy[] = [
  // More restrictive limits
  policy()
    .id('strict-payment-limit')
    .name('Strict Payment Limit')
    .description('Lower payment limit for production')
    .priority(10)
    .appliesTo('payment', 'transfer')
    .effect('deny')
    .condition('amount', 'gt', BigInt('10000000000000000000')) // 10 ETH
    .build(),

  // Require KYC for larger amounts
  policy()
    .id('kyc-required')
    .name('KYC Required')
    .description('Require KYC for transactions over threshold')
    .priority(5)
    .appliesTo('payment', 'transfer', 'swap')
    .effect('deny')
    .condition('amount', 'gt', BigInt('1000000000000000000')) // 1 ETH
    .condition('data.kycVerified', 'neq', true)
    .build(),

  blacklistCheck,
  minPaymentThreshold,
  highValueWarning,
  defaultAllow,
];

/**
 * Permissive policies for testing
 */
export const TEST_POLICIES: OPAPolicy[] = [
  blacklistCheck,
  defaultAllow,
];

/**
 * Get policies by environment
 */
export function getPoliciesForEnvironment(env: 'production' | 'staging' | 'development' | 'test'): OPAPolicy[] {
  switch (env) {
    case 'production':
      return STRICT_POLICIES;
    case 'staging':
      return DEFAULT_PAYMENT_POLICIES;
    case 'development':
      return DEFAULT_PAYMENT_POLICIES;
    case 'test':
      return TEST_POLICIES;
    default:
      return DEFAULT_PAYMENT_POLICIES;
  }
}
