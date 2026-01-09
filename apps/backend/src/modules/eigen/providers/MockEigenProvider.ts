/**
 * Mock Eigen Provider
 *
 * LEGO-swappable implementation for testing and development.
 * Provides mock attestations without cryptographic operations.
 *
 * SECURITY WARNING: This provider is for DEVELOPMENT/TESTING ONLY.
 * DO NOT use in production environments.
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

// SECURITY: Throw error if mock provider is used in production
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_MOCK_IN_PROD = process.env.ALLOW_MOCK_PROVIDERS === 'true';

// SECURITY: Maximum entries to prevent memory leaks
const MAX_ATTESTATIONS = 10000;
const MAX_COMMITMENTS = 10000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

export interface MockEigenConfig {
  /** Mock operator address */
  operatorAddress?: string;
  /** Operator name */
  operatorName?: string;
  /** Always verify attestations */
  alwaysVerify?: boolean;
  /** Attestation validity period in seconds */
  attestationValidityPeriod?: number;
  /** Simulated delay */
  simulatedDelay?: number;
}

export class MockEigenProvider implements IEigenProvider {
  readonly name = 'mock-eigen';
  readonly operator: string;

  private attestations = new Map<string, Attestation>();
  private intentAttestations = new Map<string, string[]>();
  private commitments = new Map<string, IntentData>();
  private attestationCount = 0;
  private config: MockEigenConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: MockEigenConfig) {
    // SECURITY: Block mock provider in production unless explicitly allowed
    if (IS_PRODUCTION && !ALLOW_MOCK_IN_PROD) {
      throw new Error(
        'SECURITY ERROR: MockEigenProvider cannot be used in production. ' +
        'Use a real Eigen attestation provider or set ALLOW_MOCK_PROVIDERS=true (NOT RECOMMENDED).'
      );
    }

    // SECURITY: In production (if allowed), force strict verification
    const alwaysVerify = IS_PRODUCTION ? false : (config?.alwaysVerify ?? true);

    if (IS_PRODUCTION && ALLOW_MOCK_IN_PROD) {
      console.warn(
        '[SECURITY WARNING] MockEigenProvider is enabled in production. ' +
        'This is a security risk - attestations are NOT cryptographically verified!'
      );
    }

    this.config = {
      operatorAddress: config?.operatorAddress || '0x' + '1'.repeat(40),
      operatorName: config?.operatorName || 'Mock Operator',
      alwaysVerify,
      attestationValidityPeriod: config?.attestationValidityPeriod ?? 3600,
      simulatedDelay: config?.simulatedDelay ?? 0,
    };
    this.operator = this.config.operatorAddress!;

    // SECURITY: Start cleanup timer to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
  }

  /**
   * SECURITY: Cleanup expired attestations to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleanedAttestations = 0;

    for (const [id, attestation] of this.attestations) {
      if (attestation.expiresAt < now) {
        this.attestations.delete(id);
        cleanedAttestations++;
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

    // Enforce maximum size limits
    if (this.attestations.size > MAX_ATTESTATIONS) {
      const toDelete = this.attestations.size - MAX_ATTESTATIONS;
      const iterator = this.attestations.keys();
      for (let i = 0; i < toDelete; i++) {
        const key = iterator.next().value;
        if (key) this.attestations.delete(key);
      }
    }

    if (this.commitments.size > MAX_COMMITMENTS) {
      const toDelete = this.commitments.size - MAX_COMMITMENTS;
      const iterator = this.commitments.keys();
      for (let i = 0; i < toDelete; i++) {
        const key = iterator.next().value;
        if (key) this.commitments.delete(key);
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
    this.attestations.clear();
    this.intentAttestations.clear();
    this.commitments.clear();
  }

  private async delay(): Promise<void> {
    if (this.config.simulatedDelay && this.config.simulatedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulatedDelay));
    }
  }

  async attest(intent: IntentData): Promise<Attestation> {
    await this.delay();

    const now = Math.floor(Date.now() / 1000);

    // Check intent hasn't expired
    if (intent.expiresAt < now) {
      throw new Error('Intent has expired');
    }

    // Generate mock attestation ID
    const attestationId = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-attestation-${intent.id}-${now}`)
    );

    // Generate mock signature
    const mockSignature = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-sig-${intent.id}-${this.operator}`)
    );

    const attestation: Attestation = {
      id: attestationId,
      intentId: intent.id,
      operator: this.operator,
      signature: mockSignature,
      timestamp: now,
      signatureScheme: 'ecdsa',
      signer: this.operator,
      expiresAt: now + this.config.attestationValidityPeriod!,
      metadata: {
        version: '1',
        chainId: intent.chainId,
      },
    };

    // Store
    this.attestations.set(attestationId, attestation);

    const existing = this.intentAttestations.get(intent.id) || [];
    existing.push(attestationId);
    this.intentAttestations.set(intent.id, existing);

    this.attestationCount++;

    return attestation;
  }

  async attestBatch(request: BatchAttestationRequest): Promise<BatchAttestationResult> {
    await this.delay();

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
    await this.delay();

    const now = Math.floor(Date.now() / 1000);
    const expired = attestation.expiresAt < now;

    // In mock mode with alwaysVerify, accept any attestation
    if (this.config.alwaysVerify && !expired) {
      return {
        valid: true,
        errors: [],
        recoveredSigner: attestation.signer,
        expired: false,
        ttl: attestation.expiresAt - now,
      };
    }

    const errors: string[] = [];

    if (expired) {
      errors.push('Attestation has expired');
    }

    if (attestation.intentId !== intent.id) {
      errors.push('Intent ID mismatch');
    }

    // Mock signature check
    if (!attestation.signature.startsWith('0x')) {
      errors.push('Invalid signature format');
    }

    return {
      valid: errors.length === 0,
      errors,
      recoveredSigner: attestation.signer,
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
    await this.delay();

    const commitment = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-commitment-${intent.id}-${Date.now()}`)
    );

    this.commitments.set(commitment, intent);

    return commitment;
  }

  async revealCommitment(commitment: string, intent: IntentData): Promise<boolean> {
    await this.delay();

    const stored = this.commitments.get(commitment);
    if (!stored) return false;

    return stored.id === intent.id;
  }

  async getOperatorInfo(): Promise<OperatorInfo> {
    await this.delay();

    return {
      address: this.operator,
      name: this.config.operatorName!,
      status: 'active',
      supportedIntents: ['payment', 'swap', 'stake', 'lend', 'transfer', 'approve', 'custom'],
      attestationCount: this.attestationCount,
    };
  }

  async supportsIntentType(_intentType: IntentType): Promise<boolean> {
    await this.delay();
    return true; // Mock supports all types
  }

  async getAttestation(attestationId: string): Promise<Attestation | null> {
    await this.delay();
    return this.attestations.get(attestationId) || null;
  }

  async getAttestationsForIntent(intentId: string): Promise<Attestation[]> {
    await this.delay();
    const ids = this.intentAttestations.get(intentId) || [];
    return ids
      .map((id) => this.attestations.get(id))
      .filter((a): a is Attestation => a !== undefined);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  setAlwaysVerify(value: boolean): void {
    this.config.alwaysVerify = value;
  }

  clearAttestations(): void {
    this.attestations.clear();
    this.intentAttestations.clear();
    this.attestationCount = 0;
  }

  getAttestationCount(): number {
    return this.attestationCount;
  }
}
