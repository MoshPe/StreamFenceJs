export class AuthRateLimiter {
  private readonly entries = new Map<string, FailureState>();
  private readonly now: () => number;

  constructor(private readonly options: {
    maxFailures: number;
    cooldownMs: number;
    now?: () => number;
  }) {
    this.now = options.now ?? (() => Date.now());
  }

  isLimited(remoteAddress: string): boolean {
    const state = this.entries.get(remoteAddress);
    if (state === undefined) {
      return false;
    }

    if (state.cooldownUntil === 0) {
      return false;
    }

    if (state.cooldownUntil <= this.now()) {
      this.entries.delete(remoteAddress);
      return false;
    }

    return true;
  }

  recordFailure(remoteAddress: string): void {
    const current = this.entries.get(remoteAddress);
    const failures = (current?.failures ?? 0) + 1;

    if (failures < this.options.maxFailures) {
      this.entries.set(remoteAddress, {
        failures,
        cooldownUntil: 0,
      });
      return;
    }

    this.entries.set(remoteAddress, {
      failures,
      cooldownUntil: this.now() + this.options.cooldownMs,
    });
  }

  recordSuccess(remoteAddress: string): void {
    this.entries.delete(remoteAddress);
  }
}

interface FailureState {
  failures: number;
  cooldownUntil: number;
}
