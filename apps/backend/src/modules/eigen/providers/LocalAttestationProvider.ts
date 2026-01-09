/**
 * Local Attestation Provider - Production Implementation
 *
 * LEGO-swappable implementation for intent attestation.
 * Uses local signing for attestations (no external infrastructure).
 */

import { ethers } from 'ethers';
import {
  IEigenProvider,
  IntentData,
  IntentType,
  Attestation,
  AttestationVerification,
  OperatorInfo,
  BatchAttestationRequest,
  BatchAttestationResult,
} from '../interfaces/IEigenProvider';

export interface LocalAttestationConfig {
  /** Private key for signing attestations */
  signerPrivateKey: string;
  /** Operator name */
  operatorName: string;
  /** Supported intent types */
  supportedIntents?: IntentType[];
  /** Attestation validity period in seconds */
  attestationValidityPeriod: number;
  /** Chain ID */
  chainId: number;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

// EIP-712 Domain for attestations
const ATTESTATION_DOMAIN_NAME = 'SnowRail Eigen';
const ATTESTATION_DOMAIN_VERSION = '1';

// EIP-712 Types
const ATTESTATION_TYPES = {
  Intent: [
    { name: 'id', type: 'string' },
    { name: 'intentType', type: 'string' },
    { name: 'actor', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
  ],
};

// SECURITY: Maximum entries to prevent memory leaks
const MAX_ATTESTATIONS = 50000;
const MAX_COMMITMENTS = 10000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

export class LocalAttestationProvider implements IEigenProvider {
  readonly name = 'eigen-local';
  readonly operator: string;

  private signer: ethers.Wallet;
  private attestations = new Map<string, Attestation>();
  private intentAttestations = new Map<string, string[]>(); // intentId -> attestationIds
  private commitments = new Map<string, IntentData>();
  private config: LocalAttestationConfig;
  private logger?: Logger;
  private attestationCount = 0;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: LocalAttestationConfig, logger?: Logger) {
    this.config = {
      supportedIntents: config.supportedIntents || [
        'payment', 'swap', 'stake', 'lend', 'transfer', 'approve', 'custom'
      ],
      ...config,
    };
    this.logger = logger;
    this.signer = new ethers.Wallet(config.signerPrivateKey);
    this.operator = this.signer.address;

    // SECURITY: Start cleanup timer to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
  }

  /**
   * SECURITY: Cleanup expired attestations to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleanedCount = 0;

    // Remove expired attestations
    for (const [id, attestation] of this.attestations) {
      if (attestation.expiresAt < now) {
        this.attestations.delete(id);
        cleanedCount++;
      }
    }

    // Clean up intent attestations that reference deleted attestations
    for (const [intentId, attIds] of this.intentAttestations) {
      const validIds = attIds.filter((id) => this.attestations.has(id));
      if (validIds.length === 0) {
        this.intentAttestations.delete(intentId);
      } else if (validIds.length !== attIds.length) {
        this.intentAttestations.set(intentId, validIds);
      }
    }

    // Remove expired commitments (older than attestation validity period)
    const commitmentExpiry = now - this.config.attestationValidityPeriod;
    for (const [commitment, intent] of this.commitments) {
      if (intent.expiresAt < commitmentExpiry) {
        this.commitments.delete(commitment);
      }
    }

    // Enforce maximum sizes
    if (this.attestations.size > MAX_ATTESTATIONS) {
      const entries = Array.from(this.attestations.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = this.attestations.size - MAX_ATTESTATIONS;
      for (let i = 0; i < toDelete; i++) {
        this.attestations.delete(entries[i][0]);
      }
    }

    if (this.commitments.size > MAX_COMMITMENTS) {
      const entries = Array.from(this.commitments.entries());
      const toDelete = this.commitments.size - MAX_COMMITMENTS;
      for (let i = 0; i < toDelete; i++) {
        this.commitments.delete(entries[i][0]);
      }
    }

    if (cleanedCount > 0) {
      this.logger?.debug({ cleanedCount }, '[Eigen] Cleaned up expired attestations');
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
    this.attestations.clear();
    this.intentAttestations.clear();
    this.commitments.clear();
  }

  async attest(intent: IntentData): Promise<Attestation> {
    // Validate intent type is supported
    if (!this.config.supportedIntents?.includes(intent.type)) {
      throw new Error(`Intent type ${intent.type} not supported`);
    }

    // Check intent hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (intent.expiresAt < now) {
      throw new Error('Intent has expired');
    }

    // Create EIP-712 domain
    const domain = {
      name: ATTESTATION_DOMAIN_NAME,
      version: ATTESTATION_DOMAIN_VERSION,
      chainId: this.config.chainId,
    };

    // Create message
    const message = {
      id: intent.id,
      intentType: intent.type,
      actor: intent.actor,
      target: intent.target || ethers.ZeroAddress,
      amount: (intent.amount || BigInt(0)).toString(),
      chainId: intent.chainId,
      expiresAt: intent.expiresAt,
    };

    // Sign
    const signature = await this.signer.signTypedData(domain, ATTESTATION_TYPES, message);

    // Generate attestation ID
    const attestationId = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'address', 'uint256'],
        [intent.id, this.operator, now]
      )
    );

    const attestation: Attestation = {
      id: attestationId,
      intentId: intent.id,
      operator: this.operator,
      signature,
      timestamp: now,
      signatureScheme: 'ecdsa',
      signer: this.operator,
      expiresAt: now + this.config.attestationValidityPeriod,
      metadata: {
        version: ATTESTATION_DOMAIN_VERSION,
        chainId: this.config.chainId,
      },
    };

    // Store
    this.attestations.set(attestationId, attestation);

    // Index by intent
    const existing = this.intentAttestations.get(intent.id) || [];
    existing.push(attestationId);
    this.intentAttestations.set(intent.id, existing);

    this.attestationCount++;

    this.logger?.info(
      { attestationId, intentId: intent.id, operator: this.operator },
      '[Eigen] Intent attested'
    );

    return attestation;
  }

  async attestBatch(request: BatchAttestationRequest): Promise<BatchAttestationResult> {
    const attestations: Attestation[] = [];
    const failures: Record<string, string> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const intent of request.intents) {
      try {
        const attestation = await this.attest(intent);
        attestations.push(attestation);
        successCount++;
      } catch (error) {
        failures[intent.id] = error instanceof Error ? error.message : String(error);
        failureCount++;
      }
    }

    return {
      attestations,
      successCount,
      failureCount,
      failures,
    };
  }

  async verify(attestation: Attestation, intent: IntentData): Promise<AttestationVerification> {
    const errors: string[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Check expiry
    const expired = attestation.expiresAt < now;
    if (expired) {
      errors.push('Attestation has expired');
    }

    // Check intent ID matches
    if (attestation.intentId !== intent.id) {
      errors.push('Intent ID mismatch');
    }

    // Verify signature
    let recoveredSigner: string | undefined;
    try {
      const domain = {
        name: ATTESTATION_DOMAIN_NAME,
        version: ATTESTATION_DOMAIN_VERSION,
        chainId: this.config.chainId,
      };

      const message = {
        id: intent.id,
        intentType: intent.type,
        actor: intent.actor,
        target: intent.target || ethers.ZeroAddress,
        amount: (intent.amount || BigInt(0)).toString(),
        chainId: intent.chainId,
        expiresAt: intent.expiresAt,
      };

      recoveredSigner = ethers.verifyTypedData(
        domain,
        ATTESTATION_TYPES,
        message,
        attestation.signature
      );

      if (recoveredSigner.toLowerCase() !== attestation.signer.toLowerCase()) {
        errors.push(`Signer mismatch: expected ${attestation.signer}, got ${recoveredSigner}`);
      }
    } catch (error) {
      errors.push(`Signature verification failed: ${error}`);
    }

    return {
      valid: errors.length === 0 && !expired,
      errors,
      recoveredSigner,
      expired,
      ttl: expired ? undefined : attestation.expiresAt - now,
    };
  }

  async verifyBatch(
    attestations: Attestation[],
    intents: IntentData[]
  ): Promise<AttestationVerification[]> {
    const intentMap = new Map(intents.map((i) => [i.id, i]));

    return Promise.all(
      attestations.map((attestation) => {
        const intent = intentMap.get(attestation.intentId);
        if (!intent) {
          return {
            valid: false,
            errors: ['Intent not found for attestation'],
            expired: false,
          };
        }
        return this.verify(attestation, intent);
      })
    );
  }

  async createCommitment(intent: IntentData): Promise<string> {
    // Create a commitment hash that hides the intent details
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'string', 'address', 'uint256', 'uint256', 'bytes32'],
        [
          intent.id,
          intent.type,
          intent.actor,
          intent.amount || 0,
          intent.expiresAt,
          ethers.randomBytes(32), // Salt for hiding
        ]
      )
    );

    // Store for later reveal
    this.commitments.set(commitment, intent);

    this.logger?.debug({ commitment, intentId: intent.id }, '[Eigen] Commitment created');

    return commitment;
  }

  async revealCommitment(commitment: string, intent: IntentData): Promise<boolean> {
    const stored = this.commitments.get(commitment);
    if (!stored) {
      return false;
    }

    // Compare key fields
    return (
      stored.id === intent.id &&
      stored.type === intent.type &&
      stored.actor === intent.actor &&
      stored.amount === intent.amount
    );
  }

  async getOperatorInfo(): Promise<OperatorInfo> {
    return {
      address: this.operator,
      name: this.config.operatorName,
      status: 'active',
      supportedIntents: this.config.supportedIntents || [],
      attestationCount: this.attestationCount,
    };
  }

  async supportsIntentType(intentType: IntentType): Promise<boolean> {
    return this.config.supportedIntents?.includes(intentType) ?? false;
  }

  async getAttestation(attestationId: string): Promise<Attestation | null> {
    return this.attestations.get(attestationId) || null;
  }

  async getAttestationsForIntent(intentId: string): Promise<Attestation[]> {
    const ids = this.intentAttestations.get(intentId) || [];
    return ids
      .map((id) => this.attestations.get(id))
      .filter((a): a is Attestation => a !== undefined);
  }

  async healthCheck(): Promise<boolean> {
    // Verify we can sign
    try {
      await this.signer.signMessage('health-check');
      return true;
    } catch {
      return false;
    }
  }
}
