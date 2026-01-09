/**
 * Audit Logger for SnowRail
 *
 * Security-focused logging for:
 * - Intent creation and lifecycle events
 * - Transaction execution
 * - Security events (auth failures, rate limits, suspicious activity)
 * - System events
 *
 * COMPLIANCE NOTES:
 * - All audit logs include request IDs for tracing
 * - Sensitive data (private keys, secrets) should NEVER be logged
 * - Logs are structured for easy ingestion into SIEM systems
 * - In production, logs should be shipped to a secure, immutable log store
 */

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export type AuditEventType =
  // Intent lifecycle
  | 'INTENT_CREATED'
  | 'INTENT_UPDATED'
  | 'INTENT_FUNDED'
  | 'INTENT_EXECUTED'
  | 'INTENT_FAILED'
  | 'INTENT_CANCELLED'
  // Transaction events
  | 'TX_SUBMITTED'
  | 'TX_CONFIRMED'
  | 'TX_FAILED'
  | 'TX_REVERTED'
  // Security events
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ACCESS_DENIED'
  // Mixer events
  | 'MIXER_DEPOSIT'
  | 'MIXER_WITHDRAW'
  | 'MIXER_PROOF_GENERATED'
  // System events
  | 'SYSTEM_START'
  | 'SYSTEM_STOP'
  | 'CONFIG_CHANGE'
  | 'PROVIDER_ERROR';

export type AuditSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AuditLogEntry {
  // Core fields
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  message: string;

  // Tracing
  requestId?: string;
  traceId?: string;
  spanId?: string;

  // Actor information
  actor?: {
    type: 'user' | 'service' | 'system' | 'anonymous';
    id?: string;
    walletAddress?: string;
    apiKeyName?: string;
    ip?: string;
  };

  // Resource information
  resource?: {
    type: 'intent' | 'transaction' | 'mixer' | 'system';
    id?: string;
    action?: string;
  };

  // Event-specific data
  data?: Record<string, unknown>;

  // Security context
  security?: {
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    indicators?: string[];
  };
}

// ============================================
// Audit Logger Class
// ============================================

class AuditLogger {
  private fastifyLogger: FastifyInstance['log'] | null = null;
  private serviceName = 'snowrail';
  private environment = process.env.NODE_ENV || 'development';

  /**
   * Initialize the audit logger with a Fastify logger instance
   */
  initialize(logger: FastifyInstance['log']): void {
    this.fastifyLogger = logger;
  }

  /**
   * Generate a unique audit ID for this log entry
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a structured audit log entry
   */
  private createEntry(
    eventType: AuditEventType,
    severity: AuditSeverity,
    message: string,
    details?: Partial<AuditLogEntry>
  ): AuditLogEntry {
    return {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      message,
      ...details,
    };
  }

  /**
   * Write an audit log entry
   */
  private write(entry: AuditLogEntry): void {
    const logData = {
      audit: true,
      auditId: this.generateAuditId(),
      service: this.serviceName,
      environment: this.environment,
      ...entry,
    };

    const message = `[AUDIT] ${entry.eventType}: ${entry.message}`;

    // Use Fastify logger if available, otherwise fall back to console
    if (this.fastifyLogger) {
      switch (entry.severity) {
        case 'CRITICAL':
        case 'ERROR':
          this.fastifyLogger.error(logData, message);
          break;
        case 'WARN':
          this.fastifyLogger.warn(logData, message);
          break;
        case 'INFO':
        default:
          this.fastifyLogger.info(logData, message);
      }
    } else {
      // Fallback to console for early initialization
      switch (entry.severity) {
        case 'CRITICAL':
        case 'ERROR':
          console.error(message, JSON.stringify(logData, null, 2));
          break;
        case 'WARN':
          console.warn(message, JSON.stringify(logData, null, 2));
          break;
        case 'INFO':
        default:
          console.log(message, JSON.stringify(logData, null, 2));
      }
    }
  }

  // ============================================
  // Intent Lifecycle Events
  // ============================================

  /**
   * Log intent creation
   */
  intentCreated(
    intentId: string,
    requestId: string,
    details: {
      amount: string;
      currency: string;
      recipient: string;
      conditionType: string;
      creatorAddress?: string;
      creatorIp?: string;
    }
  ): void {
    this.write(
      this.createEntry('INTENT_CREATED', 'INFO', `Intent ${intentId} created`, {
        requestId,
        actor: {
          type: details.creatorAddress ? 'user' : 'anonymous',
          walletAddress: details.creatorAddress,
          ip: details.creatorIp,
        },
        resource: {
          type: 'intent',
          id: intentId,
          action: 'create',
        },
        data: {
          amount: details.amount,
          currency: details.currency,
          recipient: details.recipient,
          conditionType: details.conditionType,
        },
      })
    );
  }

  /**
   * Log intent funding
   */
  intentFunded(
    intentId: string,
    requestId: string,
    details: {
      txHash: string;
      amount: string;
      funderAddress?: string;
    }
  ): void {
    this.write(
      this.createEntry('INTENT_FUNDED', 'INFO', `Intent ${intentId} funded`, {
        requestId,
        actor: {
          type: details.funderAddress ? 'user' : 'anonymous',
          walletAddress: details.funderAddress,
        },
        resource: {
          type: 'intent',
          id: intentId,
          action: 'fund',
        },
        data: {
          txHash: details.txHash,
          amount: details.amount,
        },
      })
    );
  }

  /**
   * Log intent execution
   */
  intentExecuted(
    intentId: string,
    requestId: string,
    details: {
      txHash: string;
      amount: string;
      recipient: string;
      executedBy?: 'agent' | 'manual';
    }
  ): void {
    this.write(
      this.createEntry('INTENT_EXECUTED', 'INFO', `Intent ${intentId} executed`, {
        requestId,
        resource: {
          type: 'intent',
          id: intentId,
          action: 'execute',
        },
        data: {
          txHash: details.txHash,
          amount: details.amount,
          recipient: details.recipient,
          executedBy: details.executedBy || 'agent',
        },
      })
    );
  }

  /**
   * Log intent failure
   */
  intentFailed(
    intentId: string,
    requestId: string,
    details: {
      reason: string;
      errorCode?: string;
      txHash?: string;
    }
  ): void {
    this.write(
      this.createEntry('INTENT_FAILED', 'ERROR', `Intent ${intentId} failed`, {
        requestId,
        resource: {
          type: 'intent',
          id: intentId,
          action: 'execute',
        },
        data: {
          reason: details.reason,
          errorCode: details.errorCode,
          txHash: details.txHash,
        },
      })
    );
  }

  // ============================================
  // Security Events
  // ============================================

  /**
   * Log authentication success
   */
  authSuccess(
    requestId: string,
    details: {
      authType: 'api-key' | 'wallet';
      identifier: string;
      ip?: string;
      endpoint?: string;
    }
  ): void {
    this.write(
      this.createEntry('AUTH_SUCCESS', 'INFO', 'Authentication successful', {
        requestId,
        actor: {
          type: 'user',
          id: details.identifier,
          ip: details.ip,
        },
        data: {
          authType: details.authType,
          endpoint: details.endpoint,
        },
      })
    );
  }

  /**
   * Log authentication failure
   */
  authFailure(
    requestId: string,
    details: {
      authType: 'api-key' | 'wallet';
      reason: string;
      ip?: string;
      endpoint?: string;
      attemptedIdentifier?: string;
    }
  ): void {
    this.write(
      this.createEntry('AUTH_FAILURE', 'WARN', 'Authentication failed', {
        requestId,
        actor: {
          type: 'anonymous',
          ip: details.ip,
        },
        resource: {
          type: 'system',
          action: 'authenticate',
        },
        data: {
          authType: details.authType,
          reason: details.reason,
          endpoint: details.endpoint,
          // Only log prefix of attempted key for security
          attemptedIdentifier: details.attemptedIdentifier
            ? `${details.attemptedIdentifier.substring(0, 8)}...`
            : undefined,
        },
        security: {
          riskLevel: 'medium',
          indicators: ['authentication_failure'],
        },
      })
    );
  }

  /**
   * Log rate limit exceeded
   */
  rateLimitExceeded(
    requestId: string,
    details: {
      identifier: string;
      ip?: string;
      endpoint?: string;
      limit: number;
    }
  ): void {
    this.write(
      this.createEntry('RATE_LIMIT_EXCEEDED', 'WARN', 'Rate limit exceeded', {
        requestId,
        actor: {
          type: 'anonymous',
          ip: details.ip,
        },
        data: {
          identifier: details.identifier,
          endpoint: details.endpoint,
          limit: details.limit,
        },
        security: {
          riskLevel: 'medium',
          indicators: ['rate_limit_exceeded'],
        },
      })
    );
  }

  /**
   * Log invalid input attempt
   */
  invalidInput(
    requestId: string,
    details: {
      endpoint: string;
      errors: string[];
      ip?: string;
    }
  ): void {
    this.write(
      this.createEntry('INVALID_INPUT', 'WARN', 'Invalid input received', {
        requestId,
        actor: {
          type: 'anonymous',
          ip: details.ip,
        },
        data: {
          endpoint: details.endpoint,
          errors: details.errors,
        },
      })
    );
  }

  /**
   * Log suspicious activity
   */
  suspiciousActivity(
    requestId: string,
    details: {
      description: string;
      indicators: string[];
      ip?: string;
      walletAddress?: string;
    }
  ): void {
    this.write(
      this.createEntry('SUSPICIOUS_ACTIVITY', 'WARN', 'Suspicious activity detected', {
        requestId,
        actor: {
          type: 'anonymous',
          walletAddress: details.walletAddress,
          ip: details.ip,
        },
        data: {
          description: details.description,
        },
        security: {
          riskLevel: 'high',
          indicators: details.indicators,
        },
      })
    );
  }

  /**
   * Log access denied
   */
  accessDenied(
    requestId: string,
    details: {
      reason: string;
      requiredPermission?: string;
      ip?: string;
      endpoint?: string;
    }
  ): void {
    this.write(
      this.createEntry('ACCESS_DENIED', 'WARN', 'Access denied', {
        requestId,
        actor: {
          type: 'anonymous',
          ip: details.ip,
        },
        data: {
          reason: details.reason,
          requiredPermission: details.requiredPermission,
          endpoint: details.endpoint,
        },
        security: {
          riskLevel: 'medium',
          indicators: ['access_denied'],
        },
      })
    );
  }

  // ============================================
  // Transaction Events
  // ============================================

  /**
   * Log transaction submission
   */
  txSubmitted(
    requestId: string,
    details: {
      txHash: string;
      from: string;
      to: string;
      value?: string;
      intentId?: string;
    }
  ): void {
    this.write(
      this.createEntry('TX_SUBMITTED', 'INFO', `Transaction submitted: ${details.txHash}`, {
        requestId,
        resource: {
          type: 'transaction',
          id: details.txHash,
          action: 'submit',
        },
        data: {
          from: details.from,
          to: details.to,
          value: details.value,
          intentId: details.intentId,
        },
      })
    );
  }

  /**
   * Log transaction confirmation
   */
  txConfirmed(
    requestId: string,
    details: {
      txHash: string;
      blockNumber: number;
      gasUsed?: string;
      intentId?: string;
    }
  ): void {
    this.write(
      this.createEntry('TX_CONFIRMED', 'INFO', `Transaction confirmed: ${details.txHash}`, {
        requestId,
        resource: {
          type: 'transaction',
          id: details.txHash,
          action: 'confirm',
        },
        data: {
          blockNumber: details.blockNumber,
          gasUsed: details.gasUsed,
          intentId: details.intentId,
        },
      })
    );
  }

  /**
   * Log transaction failure/revert
   */
  txFailed(
    requestId: string,
    details: {
      txHash?: string;
      reason: string;
      errorCode?: string;
      intentId?: string;
    }
  ): void {
    this.write(
      this.createEntry('TX_FAILED', 'ERROR', `Transaction failed: ${details.reason}`, {
        requestId,
        resource: {
          type: 'transaction',
          id: details.txHash,
          action: 'execute',
        },
        data: {
          reason: details.reason,
          errorCode: details.errorCode,
          intentId: details.intentId,
        },
      })
    );
  }

  // ============================================
  // Mixer Events
  // ============================================

  /**
   * Log mixer deposit
   */
  mixerDeposit(
    requestId: string,
    details: {
      commitment: string;
      txHash?: string;
      leafIndex?: number;
      ip?: string;
    }
  ): void {
    this.write(
      this.createEntry('MIXER_DEPOSIT', 'INFO', 'Mixer deposit prepared', {
        requestId,
        actor: {
          type: 'anonymous', // Privacy-preserving
          ip: details.ip,
        },
        resource: {
          type: 'mixer',
          id: details.commitment,
          action: 'deposit',
        },
        data: {
          // Only log commitment prefix for privacy
          commitmentPrefix: details.commitment.substring(0, 10) + '...',
          txHash: details.txHash,
          leafIndex: details.leafIndex,
        },
      })
    );
  }

  /**
   * Log mixer withdrawal
   */
  mixerWithdraw(
    requestId: string,
    details: {
      nullifierHash: string;
      recipient: string;
      txHash?: string;
      ip?: string;
    }
  ): void {
    this.write(
      this.createEntry('MIXER_WITHDRAW', 'INFO', 'Mixer withdrawal prepared', {
        requestId,
        actor: {
          type: 'anonymous', // Privacy-preserving
          ip: details.ip,
        },
        resource: {
          type: 'mixer',
          action: 'withdraw',
        },
        data: {
          // Only log prefix for privacy
          nullifierHashPrefix: details.nullifierHash.substring(0, 10) + '...',
          recipient: details.recipient,
          txHash: details.txHash,
        },
      })
    );
  }

  // ============================================
  // System Events
  // ============================================

  /**
   * Log system start
   */
  systemStart(details: { version?: string; config?: Record<string, unknown> }): void {
    this.write(
      this.createEntry('SYSTEM_START', 'INFO', 'SnowRail system started', {
        actor: {
          type: 'system',
        },
        resource: {
          type: 'system',
          action: 'start',
        },
        data: {
          version: details.version,
          environment: this.environment,
          // Only log safe config values
          config: details.config,
        },
      })
    );
  }

  /**
   * Log provider error
   */
  providerError(
    requestId: string,
    details: {
      provider: string;
      error: string;
      operation?: string;
    }
  ): void {
    this.write(
      this.createEntry('PROVIDER_ERROR', 'ERROR', `Provider error: ${details.provider}`, {
        requestId,
        resource: {
          type: 'system',
          id: details.provider,
          action: details.operation,
        },
        data: {
          error: details.error,
        },
      })
    );
  }
}

// ============================================
// Singleton Export
// ============================================

export const auditLogger = new AuditLogger();

// Export the class for testing
export { AuditLogger };
