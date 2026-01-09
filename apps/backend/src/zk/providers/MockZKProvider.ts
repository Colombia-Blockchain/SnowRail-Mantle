/**
 * Mock ZK Proof Provider
 *
 * LEGO-swappable implementation for testing and development.
 * Generates deterministic mock proofs based on inputs.
 *
 * SECURITY WARNING: This provider is for DEVELOPMENT/TESTING ONLY.
 * DO NOT use in production environments.
 */

import { ethers } from 'ethers';
import { IZKProofProvider, ZKProofInput, ZKProof } from '../interfaces/IZKProofProvider';

// SECURITY: Throw error if mock provider is used in production
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_MOCK_IN_PROD = process.env.ALLOW_MOCK_PROVIDERS === 'true';

export class MockZKProvider implements IZKProofProvider {
  readonly name = 'mock-zk';
  readonly supportedCircuits = ['price-below', 'price-above', 'amount-range'];

  constructor() {
    // SECURITY: Block mock provider in production unless explicitly allowed
    if (IS_PRODUCTION && !ALLOW_MOCK_IN_PROD) {
      throw new Error(
        'SECURITY ERROR: MockZKProvider cannot be used in production. ' +
        'Use a real ZK proof provider or set ALLOW_MOCK_PROVIDERS=true (NOT RECOMMENDED).'
      );
    }
    if (ALLOW_MOCK_IN_PROD) {
      console.warn(
        '[SECURITY WARNING] MockZKProvider is enabled in production. ' +
        'This is a security risk - proofs are NOT cryptographically verified!'
      );
    }
  }

  async generateProof(input: ZKProofInput): Promise<ZKProof> {
    // Validate circuit support
    if (!this.supportedCircuits.includes(input.type)) {
      throw new Error(`Circuit ${input.type} not supported by MockZKProvider`);
    }

    // Simulate proof generation delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate deterministic mock proof from inputs
    const inputData = JSON.stringify({
      type: input.type,
      public: input.publicInputs,
      // Note: private inputs included in hash but not in output
      private: input.privateInputs,
    });
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes(inputData));

    // Create mock public signals from public inputs
    const publicSignals = Object.entries(input.publicInputs).map(([key, value]) => {
      // Hash each public input to simulate field elements
      return ethers.keccak256(ethers.toUtf8Bytes(`${key}:${value}`));
    });

    return {
      proof: proofHash,
      publicSignals,
      circuitId: input.type,
      // No verifier contract for mock
    };
  }

  async verifyProofOffChain(proof: ZKProof): Promise<boolean> {
    // SECURITY: Mock validation - NOT cryptographically secure
    // This only checks proof format, NOT cryptographic validity
    //
    // In production, this would call a real ZK verifier that:
    // 1. Deserializes the proof into elliptic curve points
    // 2. Verifies the pairing equation (for Groth16/PLONK)
    // 3. Checks public inputs match the proof's commitments
    //
    // Current checks (format only):
    // - Proof starts with 0x
    // - Proof is 66 chars (32 bytes + 0x prefix)
    // - Public signals exist
    // - Circuit ID is valid
    if (!proof.proof.startsWith('0x') || proof.proof.length !== 66) {
      return false;
    }
    if (!proof.publicSignals || proof.publicSignals.length === 0) {
      return false;
    }
    if (!proof.circuitId || !this.supportedCircuits.includes(proof.circuitId)) {
      return false;
    }
    return true;
  }

  async getVerifierContract(_circuitId: string): Promise<string | undefined> {
    // Mock provider has no deployed verifier
    return undefined;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
