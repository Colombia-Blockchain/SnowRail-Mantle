/**
 * AP2 (Agent Payments Protocol) Interface - LEGO Module
 *
 * Defines the contract for agent payment mandate management.
 * Allows AI agents to execute payments within defined scopes.
 *
 * Key concepts:
 * - Mandate: Authorization from principal to agent for payments
 * - Scope: Limits on what the agent can do (amounts, recipients)
 * - Principal: The user who grants the mandate
 * - Agent: The AI/automated system executing payments
 */

/**
 * Scope defining what an agent is authorized to do
 */
export interface APMandateScope {
  /** Maximum amount per transaction in wei */
  maxAmount: bigint;
  /** Total budget for all transactions (optional) */
  totalBudget?: bigint;
  /** List of allowed recipient addresses (empty = any) */
  allowedRecipients?: string[];
  /** Allowed token addresses (empty = native only) */
  allowedTokens?: string[];
  /** Allowed action types */
  allowedActions?: ('transfer' | 'swap' | 'stake' | 'lend')[];
  /** Rate limit: max transactions per period */
  rateLimit?: {
    maxTransactions: number;
    periodSeconds: number;
  };
}

/**
 * Agent Payment Mandate
 */
export interface APMandate {
  /** Unique mandate identifier */
  id: string;
  /** Agent address authorized to execute */
  agent: string;
  /** Principal address who granted the mandate */
  principal: string;
  /** Scope of authorization */
  scope: APMandateScope;
  /** Expiry timestamp (unix seconds) */
  expiry: number;
  /** EIP-712 signature from principal */
  signature: string;
  /** Creation timestamp */
  createdAt: number;
  /** Mandate status */
  status: 'active' | 'revoked' | 'expired';
  /** Amount already used */
  usedAmount: bigint;
  /** Number of transactions executed */
  transactionCount: number;
}

/**
 * Parameters for creating a new mandate
 */
export interface CreateMandateParams {
  /** Agent address to authorize */
  agent: string;
  /** Principal address (signer) */
  principal: string;
  /** Authorization scope */
  scope: APMandateScope;
  /** Validity duration in seconds */
  duration: number;
}

/**
 * Action to be validated against a mandate
 */
export interface AP2Action {
  /** Type of action */
  type: 'transfer' | 'swap' | 'stake' | 'lend';
  /** Recipient address */
  recipient: string;
  /** Amount in wei */
  amount: bigint;
  /** Token address (undefined = native) */
  token?: string;
  /** Additional action-specific data */
  data?: Record<string, unknown>;
}

/**
 * Decision from AP2 validation
 */
export interface AP2Decision {
  /** Whether the action is approved */
  approved: boolean;
  /** Reason for decision */
  reason: string;
  /** Mandate ID used for validation */
  mandateId: string;
  /** Remaining budget after this action */
  remainingBudget?: bigint;
  /** Remaining transaction count for rate limit */
  remainingTransactions?: number;
  /** Warnings (action approved but close to limits) */
  warnings?: string[];
}

/**
 * Mandate validation result
 */
export interface MandateValidation {
  /** Whether mandate is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Mandate if valid */
  mandate?: APMandate;
}

/**
 * AP2 Provider Interface
 */
export interface IAP2Provider {
  /** Provider identifier */
  readonly name: string;

  /**
   * Create a new payment mandate
   * @param params - Mandate parameters
   * @returns Created mandate
   */
  createMandate(params: CreateMandateParams): Promise<APMandate>;

  /**
   * Validate an action against a mandate
   * @param mandateId - Mandate to validate against
   * @param action - Action to validate
   * @returns Validation decision
   */
  validateMandate(mandateId: string, action: AP2Action): Promise<AP2Decision>;

  /**
   * Execute an action using a mandate
   * @param mandateId - Mandate to use
   * @param action - Action to execute
   * @returns Transaction hash if successful
   */
  executeAction(mandateId: string, action: AP2Action): Promise<string>;

  /**
   * Record that an action was executed (update usage tracking)
   * @param mandateId - Mandate used
   * @param action - Action that was executed
   * @param txHash - Transaction hash
   */
  recordExecution(mandateId: string, action: AP2Action, txHash: string): Promise<void>;

  /**
   * Revoke a mandate
   * @param mandateId - Mandate to revoke
   */
  revokeMandate(mandateId: string): Promise<void>;

  /**
   * Get mandate by ID
   * @param mandateId - Mandate ID
   * @returns Mandate or null
   */
  getMandate(mandateId: string): Promise<APMandate | null>;

  /**
   * Get all mandates for an agent
   * @param agent - Agent address
   * @returns List of mandates
   */
  getMandatesForAgent(agent: string): Promise<APMandate[]>;

  /**
   * Get all mandates from a principal
   * @param principal - Principal address
   * @returns List of mandates
   */
  getMandatesFromPrincipal(principal: string): Promise<APMandate[]>;

  /**
   * Validate mandate signature and structure
   * @param mandate - Mandate to validate
   * @returns Validation result
   */
  validateMandateSignature(mandate: APMandate): Promise<MandateValidation>;

  /**
   * Health check for the provider
   * @returns true if provider is operational
   */
  healthCheck(): Promise<boolean>;
}
