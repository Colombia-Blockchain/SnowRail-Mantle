/**
 * Mock X402 Handler
 *
 * LEGO-swappable implementation for testing and development.
 * Simulates the x402 payment flow without blockchain interactions.
 */

import { ethers } from 'ethers';
import {
  IX402Handler,
  X402Challenge,
  X402Payment,
  X402Receipt,
  X402ValidationResult,
  X402AccessResult,
  X402ResourcePricing,
} from '../interfaces/IX402Provider';

export interface MockX402Config {
  /** Always accept payments */
  acceptAll?: boolean;
  /** Default access duration in seconds */
  defaultAccessDuration?: number;
  /** Challenge validity in seconds */
  challengeValidity?: number;
  /** Simulated delay in ms */
  simulatedDelay?: number;
}

export class MockX402Handler implements IX402Handler {
  readonly name = 'mock-x402';

  private challenges = new Map<string, X402Challenge>();
  private receipts = new Map<string, X402Receipt>();
  private accessTokens = new Map<string, X402Receipt>();
  private resourcePricing = new Map<string, X402ResourcePricing>();
  private config: MockX402Config;

  constructor(config?: MockX402Config) {
    this.config = {
      acceptAll: config?.acceptAll ?? true,
      defaultAccessDuration: config?.defaultAccessDuration ?? 3600,
      challengeValidity: config?.challengeValidity ?? 300,
      simulatedDelay: config?.simulatedDelay ?? 0,
    };
  }

  private async delay(): Promise<void> {
    if (this.config.simulatedDelay && this.config.simulatedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulatedDelay));
    }
  }

  async createChallenge(
    resourceId: string,
    customPricing?: Partial<X402ResourcePricing>
  ): Promise<X402Challenge> {
    await this.delay();

    let pricing = this.resourcePricing.get(resourceId);
    if (!pricing) {
      pricing = {
        resourceId,
        price: BigInt(1000000000000000), // 0.001 ETH
        currency: null,
        acceptedMethods: ['native'],
        accessDuration: this.config.defaultAccessDuration!,
      };
    }

    if (customPricing) {
      pricing = { ...pricing, ...customPricing };
    }

    const now = Math.floor(Date.now() / 1000);
    const challengeId = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-challenge-${resourceId}-${now}`)
    );

    const challenge: X402Challenge = {
      id: challengeId,
      resourceId,
      amount: pricing.price,
      currency: pricing.currency,
      method: pricing.acceptedMethods[0],
      recipient: '0x' + '1'.repeat(40), // Mock recipient
      expiresAt: now + this.config.challengeValidity!,
      chainId: 5003, // Mantle Sepolia
      metadata: {
        accessDuration: pricing.accessDuration,
        mock: true,
      },
    };

    this.challenges.set(challengeId, challenge);

    return challenge;
  }

  async validatePayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402ValidationResult> {
    await this.delay();

    // Accept all in mock mode
    if (this.config.acceptAll) {
      const challenge = this.challenges.get(challengeId);
      return {
        valid: true,
        errors: [],
        confirmedPayment: {
          amount: challenge?.amount || BigInt(0),
          payer: payment.payer,
        },
      };
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return {
        valid: false,
        errors: ['Challenge not found'],
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= challenge.expiresAt) {
      return {
        valid: false,
        errors: ['Challenge has expired'],
      };
    }

    if (payment.challengeId !== challengeId) {
      return {
        valid: false,
        errors: ['Challenge ID mismatch'],
      };
    }

    return {
      valid: true,
      errors: [],
      confirmedPayment: {
        amount: challenge.amount,
        payer: payment.payer,
      },
    };
  }

  async processPayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402Receipt> {
    await this.delay();

    const validation = await this.validatePayment(challengeId, payment);
    if (!validation.valid) {
      throw new Error(`Invalid payment: ${validation.errors.join(', ')}`);
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const now = Math.floor(Date.now() / 1000);
    const accessDuration =
      (challenge.metadata?.accessDuration as number) || this.config.defaultAccessDuration!;

    const receiptId = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-receipt-${challengeId}-${now}`)
    );

    const accessToken = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-token-${receiptId}-${Math.random()}`)
    );

    const mockSignature = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-sig-${receiptId}`)
    );

    const receipt: X402Receipt = {
      id: receiptId,
      challengeId,
      paymentId: payment.txHash || `mock-payment-${Date.now()}`,
      accessToken,
      expiresAt: now + accessDuration,
      signature: mockSignature,
      metadata: {
        resourceId: challenge.resourceId,
        payer: payment.payer,
        amount: challenge.amount.toString(),
        currency: challenge.currency,
      },
    };

    this.receipts.set(receiptId, receipt);
    this.accessTokens.set(accessToken, receipt);
    this.challenges.delete(challengeId);

    return receipt;
  }

  async checkAccess(accessToken: string): Promise<X402AccessResult> {
    await this.delay();

    const receipt = this.accessTokens.get(accessToken);

    if (!receipt) {
      return {
        granted: false,
        reason: 'Access token not found',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= receipt.expiresAt) {
      this.accessTokens.delete(accessToken);
      return {
        granted: false,
        reason: 'Access token has expired',
      };
    }

    return {
      granted: true,
      receipt,
      ttl: receipt.expiresAt - now,
    };
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await this.delay();
    this.accessTokens.delete(accessToken);
  }

  async getChallenge(challengeId: string): Promise<X402Challenge | null> {
    await this.delay();
    return this.challenges.get(challengeId) || null;
  }

  async getReceipt(receiptId: string): Promise<X402Receipt | null> {
    await this.delay();
    return this.receipts.get(receiptId) || null;
  }

  async setResourcePricing(pricing: X402ResourcePricing): Promise<void> {
    await this.delay();
    this.resourcePricing.set(pricing.resourceId, pricing);
  }

  async getResourcePricing(resourceId: string): Promise<X402ResourcePricing | null> {
    await this.delay();
    return this.resourcePricing.get(resourceId) || null;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  setAcceptAll(value: boolean): void {
    this.config.acceptAll = value;
  }

  clearAll(): void {
    this.challenges.clear();
    this.receipts.clear();
    this.accessTokens.clear();
  }

  getChallengeCount(): number {
    return this.challenges.size;
  }

  getActiveTokenCount(): number {
    return this.accessTokens.size;
  }
}
