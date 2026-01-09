/**
 * Eigen (Intent Attestation) Interface - LEGO Module
 *
 * Defines the contract for intent attestation and cryptographic signing.
 * Provides verifiable proofs of agent intents and decisions.
 *
 * Key concepts:
 * - Attestation: Cryptographic proof of an intent/decision
 * - Intent: An action the agent intends to perform
 * - Operator: Entity providing attestation services
 */

/**
 * Types of intents that can be attested
 */
export type IntentType =
  | 'payment'
  | 'swap'
  | 'stake'
  | 'lend'
  | 'transfer'
  | 'approve'
  | 'custom';

/**
 * Intent data to be attested
 */
export interface IntentData {
  /** Unique intent identifier */
  id: string;
  /** Type of intent */
  type: IntentType;
  /** Actor initiating the intent */
  actor: string;
  /** Target of the intent */
  target?: string;
  /** Amount involved (in wei) */
  amount?: bigint;
  /** Token address (null for native) */
  token?: string | null;
  /** Chain ID */
  chainId: number;
  /** Intent creation timestamp */
  createdAt: number;
  /** Intent expiry timestamp */
  expiresAt: number;
  /** Additional intent-specific data */
  data?: Record<string, unknown>;
}

/**
 * Attestation result
 */
export interface Attestation {
  /** Attestation identifier */
  id: string;
  /** Intent that was attested */
  intentId: string;
  /** Operator that provided the attestation */
  operator: string;
  /** Attestation signature */
  signature: string;
  /** Attestation timestamp */
  timestamp: number;
  /** Signature scheme used */
  signatureScheme: 'ecdsa' | 'bls' | 'ed25519';
  /** Public key or address of signer */
  signer: string;
  /** Attestation expiry */
  expiresAt: number;
  /** Attestation metadata */
  metadata?: {
    version: string;
    chainId: number;
    commitment?: string;
  };
}

/**
 * Verification result
 */
export interface AttestationVerification {
  /** Whether attestation is valid */
  valid: boolean;
  /** Verification errors */
  errors: string[];
  /** Recovered signer address */
  recoveredSigner?: string;
  /** Whether attestation has expired */
  expired: boolean;
  /** Time until expiry (seconds) */
  ttl?: number;
}

/**
 * Operator information
 */
export interface OperatorInfo {
  /** Operator address */
  address: string;
  /** Operator name */
  name: string;
  /** Operator status */
  status: 'active' | 'inactive' | 'slashed';
  /** Stake amount (if applicable) */
  stake?: bigint;
  /** Supported intent types */
  supportedIntents: IntentType[];
  /** Attestation count */
  attestationCount: number;
}

/**
 * Batch attestation request
 */
export interface BatchAttestationRequest {
  /** Intents to attest */
  intents: IntentData[];
  /** Required number of attestations per intent */
  threshold?: number;
}

/**
 * Batch attestation result
 */
export interface BatchAttestationResult {
  /** Individual attestations */
  attestations: Attestation[];
  /** Aggregated signature (if supported) */
  aggregatedSignature?: string;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Failures by intent ID */
  failures: Record<string, string>;
}

/**
 * Eigen Provider Interface
 */
export interface IEigenProvider {
  /** Provider identifier */
  readonly name: string;
  /** Operator address */
  readonly operator: string;

  // ============================================
  // Attestation
  // ============================================

  /**
   * Create attestation for an intent
   * @param intent - Intent to attest
   * @returns Attestation
   */
  attest(intent: IntentData): Promise<Attestation>;

  /**
   * Create attestations for multiple intents
   * @param request - Batch request
   * @returns Batch result
   */
  attestBatch(request: BatchAttestationRequest): Promise<BatchAttestationResult>;

  /**
   * Verify an attestation
   * @param attestation - Attestation to verify
   * @param intent - Original intent (for comparison)
   * @returns Verification result
   */
  verify(attestation: Attestation, intent: IntentData): Promise<AttestationVerification>;

  /**
   * Verify multiple attestations
   * @param attestations - Attestations to verify
   * @param intents - Original intents (matched by ID)
   * @returns Verification results
   */
  verifyBatch(
    attestations: Attestation[],
    intents: IntentData[]
  ): Promise<AttestationVerification[]>;

  // ============================================
  // Commitment Schemes
  // ============================================

  /**
   * Create a commitment to an intent (without revealing details)
   * @param intent - Intent to commit to
   * @returns Commitment hash
   */
  createCommitment(intent: IntentData): Promise<string>;

  /**
   * Reveal and verify a commitment
   * @param commitment - Commitment hash
   * @param intent - Intent to reveal
   * @returns Whether commitment matches
   */
  revealCommitment(commitment: string, intent: IntentData): Promise<boolean>;

  // ============================================
  // Operator Management
  // ============================================

  /**
   * Get operator information
   * @returns Operator info
   */
  getOperatorInfo(): Promise<OperatorInfo>;

  /**
   * Check if operator supports an intent type
   * @param intentType - Type to check
   * @returns Whether supported
   */
  supportsIntentType(intentType: IntentType): Promise<boolean>;

  // ============================================
  // Attestation Retrieval
  // ============================================

  /**
   * Get attestation by ID
   * @param attestationId - Attestation ID
   * @returns Attestation or null
   */
  getAttestation(attestationId: string): Promise<Attestation | null>;

  /**
   * Get attestations for an intent
   * @param intentId - Intent ID
   * @returns List of attestations
   */
  getAttestationsForIntent(intentId: string): Promise<Attestation[]>;

  /**
   * Health check
   * @returns true if provider is operational
   */
  healthCheck(): Promise<boolean>;
}
