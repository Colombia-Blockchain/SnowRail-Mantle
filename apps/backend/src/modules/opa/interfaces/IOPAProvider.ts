/**
 * OPA (Open Policy Agent) Interface - LEGO Module
 *
 * Defines the contract for policy evaluation and enforcement.
 * Provides a simplified TypeScript-based policy engine.
 *
 * Key concepts:
 * - Policy: A set of rules defining allowed/denied actions
 * - Context: Information about the action being evaluated
 * - Decision: The result of policy evaluation
 */

/**
 * Types of actions that can be evaluated
 */
export type OPAActionType =
  | 'payment'
  | 'swap'
  | 'transfer'
  | 'stake'
  | 'lend'
  | 'withdraw'
  | 'approve'
  | 'custom';

/**
 * Context for policy evaluation
 */
export interface OPAPolicyContext {
  /** Type of action */
  action: OPAActionType;
  /** Actor performing the action */
  actor: string;
  /** Target of the action (recipient, contract, etc.) */
  target?: string;
  /** Amount involved (in wei) */
  amount?: bigint;
  /** Token address (null for native) */
  token?: string | null;
  /** Chain ID */
  chainId: number;
  /** Timestamp */
  timestamp: number;
  /** Additional context-specific data */
  data?: Record<string, unknown>;
}

/**
 * Result of policy evaluation
 */
export interface OPADecision {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for the decision */
  reason: string;
  /** Which policies were evaluated */
  policiesEvaluated: string[];
  /** Which policy caused denial (if denied) */
  denyingPolicy?: string;
  /** Warnings (allowed but flagged) */
  warnings?: string[];
  /** Required modifications to action */
  requiredModifications?: Record<string, unknown>;
  /** Evaluation timestamp */
  evaluatedAt: number;
}

/**
 * Policy definition
 */
export interface OPAPolicy {
  /** Unique policy identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the policy does */
  description: string;
  /** Priority (lower = evaluated first) */
  priority: number;
  /** Whether policy is active */
  enabled: boolean;
  /** Action types this policy applies to */
  appliesTo: OPAActionType[];
  /** Policy conditions */
  conditions: OPAPolicyCondition[];
  /** Effect when conditions match */
  effect: 'allow' | 'deny' | 'warn';
  /** Created timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Policy condition
 */
export interface OPAPolicyCondition {
  /** Field to check */
  field: string;
  /** Operator */
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'matches';
  /** Value to compare against */
  value: unknown;
}

/**
 * Bulk evaluation result
 */
export interface OPABulkDecision {
  /** Individual decisions */
  decisions: OPADecision[];
  /** Overall result (all allowed = allowed) */
  overallAllowed: boolean;
  /** Summary of denials */
  denialSummary: string[];
}

/**
 * OPA Provider Interface
 */
export interface IOPAProvider {
  /** Provider identifier */
  readonly name: string;

  /**
   * Evaluate a single action against policies
   * @param context - Action context
   * @returns Policy decision
   */
  evaluate(context: OPAPolicyContext): Promise<OPADecision>;

  /**
   * Evaluate multiple actions in batch
   * @param contexts - List of action contexts
   * @returns Bulk decision
   */
  evaluateBatch(contexts: OPAPolicyContext[]): Promise<OPABulkDecision>;

  /**
   * Add a new policy
   * @param policy - Policy to add
   */
  addPolicy(policy: Omit<OPAPolicy, 'createdAt' | 'updatedAt'>): Promise<OPAPolicy>;

  /**
   * Update an existing policy
   * @param id - Policy ID
   * @param updates - Fields to update
   */
  updatePolicy(id: string, updates: Partial<OPAPolicy>): Promise<OPAPolicy>;

  /**
   * Remove a policy
   * @param id - Policy ID
   */
  removePolicy(id: string): Promise<void>;

  /**
   * Get a policy by ID
   * @param id - Policy ID
   * @returns Policy or null
   */
  getPolicy(id: string): Promise<OPAPolicy | null>;

  /**
   * List all policies
   * @param filter - Optional filter
   * @returns List of policies
   */
  listPolicies(filter?: { enabled?: boolean; appliesTo?: OPAActionType }): Promise<OPAPolicy[]>;

  /**
   * Enable/disable a policy
   * @param id - Policy ID
   * @param enabled - Whether to enable
   */
  setEnabled(id: string, enabled: boolean): Promise<void>;

  /**
   * Validate a policy definition
   * @param policy - Policy to validate
   * @returns Validation result
   */
  validatePolicy(policy: Partial<OPAPolicy>): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Health check
   * @returns true if provider is operational
   */
  healthCheck(): Promise<boolean>;
}
