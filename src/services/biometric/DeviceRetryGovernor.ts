import { DeviceSyncFailure, DeviceSyncJob } from '../../types/biometric';

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export class DeviceRetryGovernor {
  private static defaultPolicy: RetryPolicy = {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    jitterFactor: 0.2
  };

  /**
   * Calculate exponential backoff with jitter
   */
  public static calculateBackoffDelay(retryAttempt: number, policy: RetryPolicy = this.defaultPolicy): number {
    const rawDelay = policy.baseDelayMs * Math.pow(2, Math.min(retryAttempt, 6));
    const cappedDelay = Math.min(rawDelay, policy.maxDelayMs);
    const jitter = cappedDelay * policy.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(policy.baseDelayMs, Math.round(cappedDelay + jitter));
  }

  /**
   * Determine if a failed transaction can be retried
   */
  public static canRetry(failure: DeviceSyncFailure, policy: RetryPolicy = this.defaultPolicy): boolean {
    return !failure.isResolved && (failure.retryCount || 0) < policy.maxRetries;
  }

  /**
   * Evaluate dead-letter queue escalation
   */
  public static isDeadLetter(failure: DeviceSyncFailure, policy: RetryPolicy = this.defaultPolicy): boolean {
    return !failure.isResolved && (failure.retryCount || 0) >= policy.maxRetries;
  }

  /**
   * Generate next scheduled retry timestamp
   */
  public static getNextRetryTimestampIso(currentAttempt: number, policy: RetryPolicy = this.defaultPolicy): string {
    const delayMs = this.calculateBackoffDelay(currentAttempt, policy);
    return new Date(Date.now() + delayMs).toISOString();
  }
}
