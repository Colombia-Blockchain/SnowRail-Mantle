/**
 * Sentinel Module - Security Monitoring
 *
 * LEGO module for security, reputation, and threat analysis.
 * Provides blacklist management and transaction risk scoring.
 */

export * from './interfaces/ISentinelProvider';
export * from './providers/DefaultSentinelProvider';
export * from './providers/MockSentinelProvider';
export * from './factory';
