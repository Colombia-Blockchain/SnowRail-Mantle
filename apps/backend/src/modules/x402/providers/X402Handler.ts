/**
 * X402 Handler - Production Implementation
 *
 * LEGO-swappable implementation for HTTP 402 payment flows.
 * Handles challenge creation, payment validation, and receipt issuance.
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

export interface X402HandlerConfig {
  /** Chain ID for on-chain payments */
  chainId: number;
  /** RPC URL for payment verification */
  rpcUrl: string;
  /** Recipient address for payments */
  recipientAddress: string;
  /** Private key for signing receipts */
  signerPrivateKey?: string;
  /** Default access duration in seconds */
  defaultAccessDuration: number;
  /** Challenge validity in seconds */
  challengeValidity: number;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

export class X402Handler implements IX402Handler {
  readonly name = 'x402-production';

  private challenges = new Map<string, X402Challenge>();
  private receipts = new Map<string, X402Receipt>();
  private accessTokens = new Map<string, X402Receipt>();
  private resourcePricing = new Map<string, X402ResourcePricing>();
  private config: X402HandlerConfig;
  private logger?: Logger;
  private signer?: ethers.Wallet;
  private provider?: ethers.JsonRpcProvider;

  constructor(config: X402HandlerConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;

    if (config.signerPrivateKey) {
      this.signer = new ethers.Wallet(config.signerPrivateKey);
    }

    if (config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }
  }

  async createChallenge(
    resourceId: string,
    customPricing?: Partial<X402ResourcePricing>
  ): Promise<X402Challenge> {
    // Get base pricing
    let pricing = this.resourcePricing.get(resourceId);
    if (!pricing) {
      // Default pricing
      pricing = {
        resourceId,
        price: BigInt(1000000000000000), // 0.001 ETH default
        currency: null,
        acceptedMethods: ['native'],
        accessDuration: this.config.defaultAccessDuration,
      };
    }

    // Apply custom pricing overrides
    if (customPricing) {
      pricing = { ...pricing, ...customPricing };
    }

    const now = Math.floor(Date.now() / 1000);
    const challengeId = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'uint256', 'uint256'],
        [resourceId, pricing.price, now]
      )
    );

    const challenge: X402Challenge = {
      id: challengeId,
      resourceId,
      amount: pricing.price,
      currency: pricing.currency,
      method: pricing.acceptedMethods[0],
      recipient: this.config.recipientAddress,
      expiresAt: now + this.config.challengeValidity,
      chainId: this.config.chainId,
      metadata: {
        accessDuration: pricing.accessDuration,
      },
    };

    this.challenges.set(challengeId, challenge);

    this.logger?.info(
      { challengeId, resourceId, amount: pricing.price.toString() },
      '[x402] Challenge created'
    );

    return challenge;
  }

  async validatePayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402ValidationResult> {
    const errors: string[] = [];

    // Get challenge
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return {
        valid: false,
        errors: ['Challenge not found'],
      };
    }

    // Check challenge expiry
    const now = Math.floor(Date.now() / 1000);
    if (now >= challenge.expiresAt) {
      return {
        valid: false,
        errors: ['Challenge has expired'],
      };
    }

    // Verify payment matches challenge
    if (payment.challengeId !== challengeId) {
      errors.push('Payment challenge ID mismatch');
    }

    // For on-chain payments, verify transaction
    if (payment.txHash && this.provider) {
      try {
        const tx = await this.provider.getTransaction(payment.txHash);
        if (!tx) {
          errors.push('Transaction not found');
        } else {
          // Verify recipient
          if (tx.to?.toLowerCase() !== challenge.recipient.toLowerCase()) {
            errors.push('Transaction recipient mismatch');
          }

          // Verify amount
          if (tx.value < challenge.amount) {
            errors.push(`Insufficient payment: ${tx.value} < ${challenge.amount}`);
          }

          // Wait for confirmation
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) {
            errors.push('Transaction not confirmed or failed');
          }

          if (errors.length === 0) {
            return {
              valid: true,
              errors: [],
              confirmedPayment: {
                amount: tx.value,
                payer: tx.from,
                blockNumber: receipt?.blockNumber,
              },
            };
          }
        }
      } catch (error) {
        errors.push(`Transaction verification failed: ${error}`);
      }
    }

    // For signature-based payments (off-chain or pre-approved)
    if (payment.signature && errors.length === 0) {
      try {
        // Verify EIP-712 signature
        const domain = {
          name: 'SnowRail x402',
          version: '1',
          chainId: this.config.chainId,
        };

        const types = {
          Payment: [
            { name: 'challengeId', type: 'bytes32' },
            { name: 'payer', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
          ],
        };

        const message = {
          challengeId,
          payer: payment.payer,
          timestamp: payment.timestamp,
        };

        const recoveredAddress = ethers.verifyTypedData(
          domain,
          types,
          message,
          payment.signature
        );

        if (recoveredAddress.toLowerCase() !== payment.payer.toLowerCase()) {
          errors.push('Invalid payment signature');
        } else {
          return {
            valid: true,
            errors: [],
            confirmedPayment: {
              amount: challenge.amount,
              payer: payment.payer,
            },
          };
        }
      } catch (error) {
        errors.push(`Signature verification failed: ${error}`);
      }
    }

    if (errors.length === 0 && !payment.txHash && !payment.signature) {
      errors.push('No valid payment proof provided');
    }

    return { valid: false, errors };
  }

  async processPayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402Receipt> {
    // Validate payment first
    const validation = await this.validatePayment(challengeId, payment);
    if (!validation.valid) {
      throw new Error(`Invalid payment: ${validation.errors.join(', ')}`);
    }

    const challenge = this.challenges.get(challengeId)!;
    const now = Math.floor(Date.now() / 1000);
    const accessDuration =
      (challenge.metadata?.accessDuration as number) || this.config.defaultAccessDuration;

    // Generate receipt ID and access token
    const receiptId = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes32', 'address', 'uint256'],
        [challengeId, payment.payer, now]
      )
    );

    const accessToken = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes32', 'uint256', 'bytes32'],
        [receiptId, now, ethers.randomBytes(32)]
      )
    );

    // Sign receipt
    let signature = '0x';
    if (this.signer) {
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['bytes32', 'bytes32', 'uint256'],
          [receiptId, accessToken, now + accessDuration]
        )
      );
      signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    }

    const receipt: X402Receipt = {
      id: receiptId,
      challengeId,
      paymentId: payment.txHash || `sig-${payment.signature.slice(0, 10)}`,
      accessToken,
      expiresAt: now + accessDuration,
      signature,
      metadata: {
        resourceId: challenge.resourceId,
        payer: payment.payer,
        amount: challenge.amount.toString(),
        currency: challenge.currency,
      },
    };

    this.receipts.set(receiptId, receipt);
    this.accessTokens.set(accessToken, receipt);

    // Mark challenge as used
    this.challenges.delete(challengeId);

    this.logger?.info(
      { receiptId, resourceId: challenge.resourceId, payer: payment.payer },
      '[x402] Payment processed, receipt issued'
    );

    return receipt;
  }

  async checkAccess(accessToken: string): Promise<X402AccessResult> {
    const receipt = this.accessTokens.get(accessToken);

    if (!receipt) {
      return {
        granted: false,
        reason: 'Access token not found',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= receipt.expiresAt) {
      // Clean up expired token
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
    const receipt = this.accessTokens.get(accessToken);
    if (receipt) {
      this.accessTokens.delete(accessToken);
      this.logger?.info({ accessToken: accessToken.slice(0, 10) }, '[x402] Access revoked');
    }
  }

  async getChallenge(challengeId: string): Promise<X402Challenge | null> {
    return this.challenges.get(challengeId) || null;
  }

  async getReceipt(receiptId: string): Promise<X402Receipt | null> {
    return this.receipts.get(receiptId) || null;
  }

  async setResourcePricing(pricing: X402ResourcePricing): Promise<void> {
    this.resourcePricing.set(pricing.resourceId, pricing);
    this.logger?.info(
      { resourceId: pricing.resourceId, price: pricing.price.toString() },
      '[x402] Resource pricing set'
    );
  }

  async getResourcePricing(resourceId: string): Promise<X402ResourcePricing | null> {
    return this.resourcePricing.get(resourceId) || null;
  }

  async healthCheck(): Promise<boolean> {
    // Check RPC connection if configured
    if (this.provider) {
      try {
        await this.provider.getBlockNumber();
      } catch {
        return false;
      }
    }
    return true;
  }
}
