import type { AckTracker } from './AckTracker.js';
import type { RetryDecision } from './RetryDecision.js';

export class RetryService {
  private intervalHandle: NodeJS.Timeout | undefined;

  constructor(
    private readonly ackTracker: AckTracker,
    private readonly intervalMs: number = 50,
  ) {}

  start(): void {
    if (this.intervalHandle !== undefined) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      this.scan(Date.now());
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalHandle === undefined) {
      return;
    }

    clearInterval(this.intervalHandle);
    this.intervalHandle = undefined;
  }

  scan(now: number = Date.now()): RetryDecision[] {
    return this.ackTracker.collectExpired(now);
  }
}
