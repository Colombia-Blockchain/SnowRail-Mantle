/**
 * Mock AP2 Provider
 *
 * LEGO-swappable implementation for testing and development.
 * Simulates mandate creation and validation without cryptographic operations.
 */

import { ethers } from 'ethers';
import {
  IAP2Provider,
  APMandate,
  CreateMandateParams,
  AP2Action,
  AP2Decision,
  MandateValidation,
} from '../interfaces/IAP2Provider';

export interface MockAP2Config {
  /** Always approve actions (bypass validation) */
  approveAll?: boolean;
  /** Initial mandates to load */
  initialMandates?: APMandate[];
  /** Simulate network delay in ms */
  simulatedDelay?: number;
}

export class MockAP2Provider implements IAP2Provider {
  readonly name = 'mock-ap2';

  private mandates = new Map<string, APMandate>();
  private nonceCounter = 0;
  private approveAll: boolean;
  private simulatedDelay: number;

  constructor(config?: MockAP2Config) {
    this.approveAll = config?.approveAll ?? false;
    this.simulatedDelay = config?.simulatedDelay ?? 0;

    if (config?.initialMandates) {
      config.initialMandates.forEach((m) => this.mandates.set(m.id, m));
    }
  }

  private async delay(): Promise<void> {
    if (this.simulatedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedDelay));
    }
  }

  async createMandate(params: CreateMandateParams): Promise<APMandate> {
    await this.delay();

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + params.duration;
    const nonce = this.nonceCounter++;

    // Generate deterministic mock mandate ID
    const mandateId = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-mandate-${params.agent}-${params.principal}-${nonce}`)
    );

    // Generate mock signature
    const mockSignature = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-sig-${mandateId}`)
    );

    const mandate: APMandate = {
      id: mandateId,
      agent: params.agent,
      principal: params.principal,
      scope: params.scope,
      expiry,
      signature: mockSignature,
      createdAt: now,
      status: 'active',
      usedAmount: BigInt(0),
      transactionCount: 0,
    };

    this.mandates.set(mandateId, mandate);

    return mandate;
  }

  async validateMandate(mandateId: string, action: AP2Action): Promise<AP2Decision> {
    await this.delay();

    // Bypass validation in approveAll mode
    if (this.approveAll) {
      return {
        approved: true,
        reason: 'Mock: approveAll mode enabled',
        mandateId,
      };
    }

    const mandate = this.mandates.get(mandateId);

    if (!mandate) {
      return {
        approved: false,
        reason: 'Mandate not found',
        mandateId,
      };
    }

    if (mandate.status !== 'active') {
      return {
        approved: false,
        reason: `Mandate is ${mandate.status}`,
        mandateId,
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= mandate.expiry) {
      mandate.status = 'expired';
      return {
        approved: false,
        reason: 'Mandate has expired',
        mandateId,
      };
    }

    // Check amount
    if (action.amount > mandate.scope.maxAmount) {
      return {
        approved: false,
        reason: `Amount exceeds max: ${action.amount} > ${mandate.scope.maxAmount}`,
        mandateId,
      };
    }

    // Check budget
    if (mandate.scope.totalBudget !== undefined) {
      const newTotal = mandate.usedAmount + action.amount;
      if (newTotal > mandate.scope.totalBudget) {
        return {
          approved: false,
          reason: 'Would exceed total budget',
          mandateId,
          remainingBudget: mandate.scope.totalBudget - mandate.usedAmount,
        };
      }
    }

    // Check allowed recipients
    if (mandate.scope.allowedRecipients && mandate.scope.allowedRecipients.length > 0) {
      const allowed = mandate.scope.allowedRecipients.map((r) => r.toLowerCase());
      if (!allowed.includes(action.recipient.toLowerCase())) {
        return {
          approved: false,
          reason: 'Recipient not in allowed list',
          mandateId,
        };
      }
    }

    return {
      approved: true,
      reason: 'Mock validation passed',
      mandateId,
      remainingBudget: mandate.scope.totalBudget
        ? mandate.scope.totalBudget - mandate.usedAmount - action.amount
        : undefined,
    };
  }

  async executeAction(mandateId: string, action: AP2Action): Promise<string> {
    await this.delay();

    const decision = await this.validateMandate(mandateId, action);
    if (!decision.approved) {
      throw new Error(`Action not approved: ${decision.reason}`);
    }

    // Generate mock transaction hash
    const txHash = ethers.keccak256(
      ethers.toUtf8Bytes(`mock-tx-${mandateId}-${Date.now()}`)
    );

    await this.recordExecution(mandateId, action, txHash);

    return txHash;
  }

  async recordExecution(mandateId: string, action: AP2Action, _txHash: string): Promise<void> {
    const mandate = this.mandates.get(mandateId);
    if (mandate) {
      mandate.usedAmount = mandate.usedAmount + action.amount;
      mandate.transactionCount += 1;
    }
  }

  async revokeMandate(mandateId: string): Promise<void> {
    await this.delay();

    const mandate = this.mandates.get(mandateId);
    if (mandate) {
      mandate.status = 'revoked';
    }
  }

  async getMandate(mandateId: string): Promise<APMandate | null> {
    await this.delay();
    return this.mandates.get(mandateId) || null;
  }

  async getMandatesForAgent(agent: string): Promise<APMandate[]> {
    await this.delay();
    const agentLower = agent.toLowerCase();
    return Array.from(this.mandates.values()).filter(
      (m) => m.agent.toLowerCase() === agentLower
    );
  }

  async getMandatesFromPrincipal(principal: string): Promise<APMandate[]> {
    await this.delay();
    const principalLower = principal.toLowerCase();
    return Array.from(this.mandates.values()).filter(
      (m) => m.principal.toLowerCase() === principalLower
    );
  }

  async validateMandateSignature(mandate: APMandate): Promise<MandateValidation> {
    await this.delay();

    // Mock always validates signature in approveAll mode
    if (this.approveAll) {
      return { valid: true, errors: [], mandate };
    }

    const errors: string[] = [];

    if (!ethers.isAddress(mandate.agent)) {
      errors.push('Invalid agent address');
    }
    if (!ethers.isAddress(mandate.principal)) {
      errors.push('Invalid principal address');
    }
    if (mandate.expiry <= Math.floor(Date.now() / 1000)) {
      errors.push('Mandate has expired');
    }
    if (!mandate.signature || mandate.signature.length < 10) {
      errors.push('Missing or invalid signature');
    }

    return {
      valid: errors.length === 0,
      errors,
      mandate: errors.length === 0 ? mandate : undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Test helpers
  setApproveAll(value: boolean): void {
    this.approveAll = value;
  }

  clearMandates(): void {
    this.mandates.clear();
  }

  getMandateCount(): number {
    return this.mandates.size;
  }
}
