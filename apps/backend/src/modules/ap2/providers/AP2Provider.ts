/**
 * AP2 Provider - Production Implementation
 *
 * LEGO-swappable implementation for Agent Payments Protocol.
 * Manages mandates with EIP-712 signatures for authorization.
 */

import { ethers } from 'ethers';
import {
  IAP2Provider,
  APMandate,
  APMandateScope,
  CreateMandateParams,
  AP2Action,
  AP2Decision,
  MandateValidation,
} from '../interfaces/IAP2Provider';

export interface AP2ProviderConfig {
  /** Chain ID for EIP-712 domain */
  chainId: number;
  /** Verifying contract address */
  verifyingContract?: string;
  /** Wallet for signing (optional, for agent-side) */
  signerPrivateKey?: string;
}

interface Logger {
  info: Function;
  warn: Function;
  error: Function;
  debug: Function;
}

// EIP-712 Domain for mandate signatures
const MANDATE_DOMAIN_NAME = 'SnowRail AP2';
const MANDATE_DOMAIN_VERSION = '1';

// EIP-712 Types
const MANDATE_TYPES = {
  Mandate: [
    { name: 'agent', type: 'address' },
    { name: 'principal', type: 'address' },
    { name: 'maxAmount', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export class AP2Provider implements IAP2Provider {
  readonly name = 'ap2-production';

  private mandates = new Map<string, APMandate>();
  private nonceCounter = 0;
  private rateTracker = new Map<string, { count: number; windowStart: number }>();
  private config: AP2ProviderConfig;
  private logger?: Logger;
  private signer?: ethers.Wallet;

  constructor(config: AP2ProviderConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;

    if (config.signerPrivateKey) {
      this.signer = new ethers.Wallet(config.signerPrivateKey);
    }
  }

  async createMandate(params: CreateMandateParams): Promise<APMandate> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + params.duration;
    const nonce = this.nonceCounter++;

    // Generate mandate ID
    const mandateId = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'address', 'uint256', 'uint256'],
        [params.agent, params.principal, expiry, nonce]
      )
    );

    // Create EIP-712 signature if we have a signer
    let signature = '0x';
    if (this.signer) {
      const domain = {
        name: MANDATE_DOMAIN_NAME,
        version: MANDATE_DOMAIN_VERSION,
        chainId: this.config.chainId,
        verifyingContract: this.config.verifyingContract || ethers.ZeroAddress,
      };

      const message = {
        agent: params.agent,
        principal: params.principal,
        maxAmount: params.scope.maxAmount.toString(),
        expiry,
        nonce,
      };

      signature = await this.signer.signTypedData(domain, MANDATE_TYPES, message);
    }

    const mandate: APMandate = {
      id: mandateId,
      agent: params.agent,
      principal: params.principal,
      scope: params.scope,
      expiry,
      signature,
      createdAt: now,
      status: 'active',
      usedAmount: BigInt(0),
      transactionCount: 0,
    };

    this.mandates.set(mandateId, mandate);

    this.logger?.info(
      { mandateId, agent: params.agent, principal: params.principal },
      '[AP2] Mandate created'
    );

    return mandate;
  }

  async validateMandate(mandateId: string, action: AP2Action): Promise<AP2Decision> {
    const mandate = this.mandates.get(mandateId);

    if (!mandate) {
      return {
        approved: false,
        reason: 'Mandate not found',
        mandateId,
      };
    }

    // Check if mandate is active
    if (mandate.status !== 'active') {
      return {
        approved: false,
        reason: `Mandate is ${mandate.status}`,
        mandateId,
      };
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now >= mandate.expiry) {
      mandate.status = 'expired';
      return {
        approved: false,
        reason: 'Mandate has expired',
        mandateId,
      };
    }

    const warnings: string[] = [];
    const scope = mandate.scope;

    // Check amount limit
    if (action.amount > scope.maxAmount) {
      return {
        approved: false,
        reason: `Amount ${action.amount} exceeds max ${scope.maxAmount}`,
        mandateId,
      };
    }

    // Check total budget
    if (scope.totalBudget !== undefined) {
      const newTotal = mandate.usedAmount + action.amount;
      if (newTotal > scope.totalBudget) {
        return {
          approved: false,
          reason: `Action would exceed total budget`,
          mandateId,
          remainingBudget: scope.totalBudget - mandate.usedAmount,
        };
      }

      // Warn if close to budget
      const remaining = scope.totalBudget - newTotal;
      if (remaining < scope.maxAmount) {
        warnings.push(`Low remaining budget: ${remaining}`);
      }
    }

    // Check allowed recipients
    if (scope.allowedRecipients && scope.allowedRecipients.length > 0) {
      const recipientLower = action.recipient.toLowerCase();
      const allowed = scope.allowedRecipients.map((r) => r.toLowerCase());
      if (!allowed.includes(recipientLower)) {
        return {
          approved: false,
          reason: 'Recipient not in allowed list',
          mandateId,
        };
      }
    }

    // Check allowed tokens
    if (action.token) {
      if (!scope.allowedTokens || scope.allowedTokens.length === 0) {
        return {
          approved: false,
          reason: 'Token transfers not allowed (native only)',
          mandateId,
        };
      }
      const tokenLower = action.token.toLowerCase();
      const allowed = scope.allowedTokens.map((t) => t.toLowerCase());
      if (!allowed.includes(tokenLower)) {
        return {
          approved: false,
          reason: 'Token not in allowed list',
          mandateId,
        };
      }
    }

    // Check allowed actions
    if (scope.allowedActions && scope.allowedActions.length > 0) {
      if (!scope.allowedActions.includes(action.type)) {
        return {
          approved: false,
          reason: `Action type '${action.type}' not allowed`,
          mandateId,
        };
      }
    }

    // Check rate limit
    if (scope.rateLimit) {
      const rateKey = mandateId;
      const tracker = this.rateTracker.get(rateKey);
      const windowStart = now - scope.rateLimit.periodSeconds;

      if (tracker && tracker.windowStart >= windowStart) {
        if (tracker.count >= scope.rateLimit.maxTransactions) {
          return {
            approved: false,
            reason: 'Rate limit exceeded',
            mandateId,
            remainingTransactions: 0,
          };
        }
      }
    }

    // Calculate remaining values
    const remainingBudget = scope.totalBudget
      ? scope.totalBudget - mandate.usedAmount - action.amount
      : undefined;

    const remainingTransactions = scope.rateLimit
      ? scope.rateLimit.maxTransactions - mandate.transactionCount - 1
      : undefined;

    return {
      approved: true,
      reason: 'Action approved within mandate scope',
      mandateId,
      remainingBudget,
      remainingTransactions,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async executeAction(mandateId: string, action: AP2Action): Promise<string> {
    // Validate first
    const decision = await this.validateMandate(mandateId, action);
    if (!decision.approved) {
      throw new Error(`Action not approved: ${decision.reason}`);
    }

    // In production, this would submit the transaction
    // For now, return a mock transaction hash
    const txHash = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [mandateId, action.recipient, action.amount, Date.now()]
      )
    );

    // Record the execution
    await this.recordExecution(mandateId, action, txHash);

    this.logger?.info({ mandateId, txHash, action: action.type }, '[AP2] Action executed');

    return txHash;
  }

  async recordExecution(mandateId: string, action: AP2Action, txHash: string): Promise<void> {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }

    // Update usage tracking
    mandate.usedAmount = mandate.usedAmount + action.amount;
    mandate.transactionCount += 1;

    // Update rate tracker
    const now = Math.floor(Date.now() / 1000);
    const rateKey = mandateId;
    const tracker = this.rateTracker.get(rateKey);

    if (tracker && mandate.scope.rateLimit) {
      const windowStart = now - mandate.scope.rateLimit.periodSeconds;
      if (tracker.windowStart >= windowStart) {
        tracker.count += 1;
      } else {
        this.rateTracker.set(rateKey, { count: 1, windowStart: now });
      }
    } else {
      this.rateTracker.set(rateKey, { count: 1, windowStart: now });
    }

    this.logger?.debug({ mandateId, txHash }, '[AP2] Execution recorded');
  }

  async revokeMandate(mandateId: string): Promise<void> {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      throw new Error('Mandate not found');
    }

    mandate.status = 'revoked';
    this.logger?.info({ mandateId }, '[AP2] Mandate revoked');
  }

  async getMandate(mandateId: string): Promise<APMandate | null> {
    return this.mandates.get(mandateId) || null;
  }

  async getMandatesForAgent(agent: string): Promise<APMandate[]> {
    const agentLower = agent.toLowerCase();
    return Array.from(this.mandates.values()).filter(
      (m) => m.agent.toLowerCase() === agentLower
    );
  }

  async getMandatesFromPrincipal(principal: string): Promise<APMandate[]> {
    const principalLower = principal.toLowerCase();
    return Array.from(this.mandates.values()).filter(
      (m) => m.principal.toLowerCase() === principalLower
    );
  }

  async validateMandateSignature(mandate: APMandate): Promise<MandateValidation> {
    const errors: string[] = [];

    // Basic validation
    if (!ethers.isAddress(mandate.agent)) {
      errors.push('Invalid agent address');
    }
    if (!ethers.isAddress(mandate.principal)) {
      errors.push('Invalid principal address');
    }
    if (mandate.expiry <= Math.floor(Date.now() / 1000)) {
      errors.push('Mandate has expired');
    }
    if (!mandate.signature || mandate.signature === '0x') {
      errors.push('Missing signature');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Verify EIP-712 signature
    try {
      const domain = {
        name: MANDATE_DOMAIN_NAME,
        version: MANDATE_DOMAIN_VERSION,
        chainId: this.config.chainId,
        verifyingContract: this.config.verifyingContract || ethers.ZeroAddress,
      };

      // Reconstruct the signed message (simplified - would need nonce in production)
      const message = {
        agent: mandate.agent,
        principal: mandate.principal,
        maxAmount: mandate.scope.maxAmount.toString(),
        expiry: mandate.expiry,
        nonce: 0, // Would need to track nonces properly in production
      };

      const recoveredAddress = ethers.verifyTypedData(
        domain,
        MANDATE_TYPES,
        message,
        mandate.signature
      );

      if (recoveredAddress.toLowerCase() !== mandate.principal.toLowerCase()) {
        errors.push('Signature does not match principal');
        return { valid: false, errors };
      }
    } catch (error) {
      errors.push(`Signature verification failed: ${error}`);
      return { valid: false, errors };
    }

    return { valid: true, errors: [], mandate };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
