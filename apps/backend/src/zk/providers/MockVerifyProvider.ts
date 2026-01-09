/**
 * Mock Verification Provider
 *
 * LEGO-swappable implementation for testing and development.
 * All addresses are verified by default, or use whitelist mode.
 *
 * SECURITY WARNING: This provider is for DEVELOPMENT/TESTING ONLY.
 * DO NOT use in production environments.
 */

import { IVerifyProvider, VerificationResult } from '../interfaces/IVerifyProvider';

// SECURITY: Throw error if mock provider is used in production
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_MOCK_IN_PROD = process.env.ALLOW_MOCK_PROVIDERS === 'true';

export class MockVerifyProvider implements IVerifyProvider {
  readonly name = 'mock-verify';

  private verifiedAddresses = new Set<string>();
  private verifyAll: boolean;

  constructor(options?: { verifyAll?: boolean; initialVerified?: string[] }) {
    // SECURITY: Block mock provider in production unless explicitly allowed
    if (IS_PRODUCTION && !ALLOW_MOCK_IN_PROD) {
      throw new Error(
        'SECURITY ERROR: MockVerifyProvider cannot be used in production. ' +
        'Use a real verification provider or set ALLOW_MOCK_PROVIDERS=true (NOT RECOMMENDED).'
      );
    }

    // SECURITY: In production (if allowed), force whitelist mode - never verify-all
    if (IS_PRODUCTION) {
      this.verifyAll = false;
      console.warn(
        '[SECURITY WARNING] MockVerifyProvider is enabled in production with whitelist mode. ' +
        'This is a security risk - consider using a real verification provider!'
      );
    } else {
      // In development, allow verify-all mode (default: false for safety)
      this.verifyAll = options?.verifyAll ?? false;
    }

    if (options?.initialVerified) {
      options.initialVerified.forEach((addr) => this.verifiedAddresses.add(addr.toLowerCase()));
    }
  }

  async isVerified(address: string): Promise<boolean> {
    if (this.verifyAll) {
      return true;
    }
    return this.verifiedAddresses.has(address.toLowerCase());
  }

  async getVerificationStatus(address: string): Promise<VerificationResult> {
    const isVerified = await this.isVerified(address);
    return {
      isVerified,
      level: isVerified ? 'basic' : undefined,
      metadata: {
        provider: this.name,
        mode: this.verifyAll ? 'verify-all' : 'whitelist',
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  addVerified(address: string): void {
    this.verifiedAddresses.add(address.toLowerCase());
  }

  removeVerified(address: string): void {
    this.verifiedAddresses.delete(address.toLowerCase());
  }

  setVerifyAll(value: boolean): void {
    this.verifyAll = value;
  }
}
