import { describe, expect, it, vi } from 'vitest';
import type { AckTracker } from '../../../../src/internal/delivery/AckTracker.js';
import { RetryService } from '../../../../src/internal/delivery/RetryService.js';

describe('RetryService', () => {
  it('scan delegates to AckTracker.collectExpired', () => {
    const collectExpired = vi.fn().mockReturnValue([]);

    const service = new RetryService(
      {
        collectExpired,
      } as unknown as AckTracker,
      25,
    );

    const decisions = service.scan(1234);

    expect(decisions).toEqual([]);
    expect(collectExpired).toHaveBeenCalledWith(1234);
  });

  it('start and stop manage a periodic timer', () => {
    vi.useFakeTimers();

    const collectExpired = vi.fn().mockReturnValue([]);
    const service = new RetryService(
      {
        collectExpired,
      } as unknown as AckTracker,
      20,
    );

    service.start();
    service.start();

    vi.advanceTimersByTime(45);

    expect(collectExpired).toHaveBeenCalled();

    service.stop();
    const callsAfterStop = collectExpired.mock.calls.length;

    vi.advanceTimersByTime(40);

    expect(collectExpired.mock.calls.length).toBe(callsAfterStop);

    vi.useRealTimers();
  });
});
