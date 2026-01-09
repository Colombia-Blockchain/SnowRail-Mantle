/**
 * OPA Module - Open Policy Agent
 *
 * LEGO module for policy-based access control and validation.
 * Provides TypeScript-based policy engine.
 */

export * from './interfaces/IOPAProvider';
export * from './providers/SimpleOPAProvider';
export * from './providers/MockOPAProvider';
export * from './policies/payment-rules';
export * from './factory';
