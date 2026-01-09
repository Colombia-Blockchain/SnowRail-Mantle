/**
 * x402 (HTTP 402 Payment Required) Interface - LEGO Module
 *
 * Defines the contract for HTTP 402 payment flow handling.
 * Implements the request -> 402 challenge -> payment -> receipt -> unlock flow.
 *
 * Key concepts:
 * - Challenge: Payment requirements for accessing a resource
 * - Payment: Cryptographic proof of payment
 * - Receipt: Server-issued proof of successful payment
 * - Resource: The protected content/service
 */

/**
 * Payment methods supported by x402
 */
export type X402PaymentMethod = 'native' | 'erc20' | 'lightning' | 'subscription';

/**
 * Payment challenge issued in 402 response
 */
export interface X402Challenge {
  /** Unique challenge identifier */
  id: string;
  /** Resource being accessed */
  resourceId: string;
  /** Payment amount in smallest unit */
  amount: bigint;
  /** Currency/token address (null for native) */
  currency: string | null;
  /** Payment method */
  method: X402PaymentMethod;
  /** Recipient address for payment */
  recipient: string;
  /** Challenge expiry timestamp */
  expiresAt: number;
  /** Chain ID for on-chain payments */
  chainId: number;
  /** Optional payment memo/reference */
  memo?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Payment proof submitted by client
 */
export interface X402Payment {
  /** Challenge ID this payment is for */
  challengeId: string;
  /** Transaction hash (for on-chain) */
  txHash?: string;
  /** Lightning payment preimage */
  preimage?: string;
  /** Subscription ID */
  subscriptionId?: string;
  /** Payer address */
  payer: string;
  /** Payment signature (EIP-712) */
  signature: string;
  /** Timestamp of payment */
  timestamp: number;
}

/**
 * Receipt issued after successful payment
 */
export interface X402Receipt {
  /** Receipt identifier */
  id: string;
  /** Challenge that was fulfilled */
  challengeId: string;
  /** Payment that fulfilled the challenge */
  paymentId: string;
  /** Resource access token */
  accessToken: string;
  /** Token expiry */
  expiresAt: number;
  /** Server signature on receipt */
  signature: string;
  /** Receipt metadata */
  metadata?: {
    resourceId: string;
    payer: string;
    amount: string;
    currency: string | null;
  };
}

/**
 * Validation result for payments
 */
export interface X402ValidationResult {
  /** Whether payment is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Confirmed payment details */
  confirmedPayment?: {
    amount: bigint;
    payer: string;
    blockNumber?: number;
  };
}

/**
 * Resource access result
 */
export interface X402AccessResult {
  /** Whether access is granted */
  granted: boolean;
  /** Reason for denial */
  reason?: string;
  /** Receipt if access granted */
  receipt?: X402Receipt;
  /** Time until expiry (seconds) */
  ttl?: number;
}

/**
 * Pricing configuration for resources
 */
export interface X402ResourcePricing {
  /** Resource identifier */
  resourceId: string;
  /** Base price */
  price: bigint;
  /** Currency (null for native) */
  currency: string | null;
  /** Accepted payment methods */
  acceptedMethods: X402PaymentMethod[];
  /** Discount for subscriptions (basis points) */
  subscriptionDiscount?: number;
  /** Access duration in seconds */
  accessDuration: number;
}

/**
 * x402 Handler Interface
 */
export interface IX402Handler {
  /** Handler identifier */
  readonly name: string;

  /**
   * Create a payment challenge for resource access
   * @param resourceId - Resource being accessed
   * @param pricing - Optional custom pricing
   * @returns Payment challenge
   */
  createChallenge(
    resourceId: string,
    pricing?: Partial<X402ResourcePricing>
  ): Promise<X402Challenge>;

  /**
   * Validate a payment against a challenge
   * @param challengeId - Challenge to validate against
   * @param payment - Payment to validate
   * @returns Validation result
   */
  validatePayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402ValidationResult>;

  /**
   * Process payment and issue receipt
   * @param challengeId - Challenge being fulfilled
   * @param payment - Valid payment
   * @returns Receipt for access
   */
  processPayment(
    challengeId: string,
    payment: X402Payment
  ): Promise<X402Receipt>;

  /**
   * Check if access token is valid
   * @param accessToken - Token to validate
   * @returns Access result
   */
  checkAccess(accessToken: string): Promise<X402AccessResult>;

  /**
   * Revoke access token
   * @param accessToken - Token to revoke
   */
  revokeAccess(accessToken: string): Promise<void>;

  /**
   * Get challenge by ID
   * @param challengeId - Challenge ID
   * @returns Challenge or null
   */
  getChallenge(challengeId: string): Promise<X402Challenge | null>;

  /**
   * Get receipt by ID
   * @param receiptId - Receipt ID
   * @returns Receipt or null
   */
  getReceipt(receiptId: string): Promise<X402Receipt | null>;

  /**
   * Set pricing for a resource
   * @param pricing - Resource pricing configuration
   */
  setResourcePricing(pricing: X402ResourcePricing): Promise<void>;

  /**
   * Get pricing for a resource
   * @param resourceId - Resource ID
   * @returns Pricing or null
   */
  getResourcePricing(resourceId: string): Promise<X402ResourcePricing | null>;

  /**
   * Health check
   * @returns true if handler is operational
   */
  healthCheck(): Promise<boolean>;
}
