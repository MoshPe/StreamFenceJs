import { describe, expect, it } from 'vitest';
import { OverflowAction, type OverflowActionValue } from '../../src/OverflowAction.js';

describe('OverflowAction', () => {
  it('has all five members matching the Java enum', () => {
    expect(OverflowAction.DROP_OLDEST).toBe('DROP_OLDEST');
    expect(OverflowAction.REJECT_NEW).toBe('REJECT_NEW');
    expect(OverflowAction.COALESCE).toBe('COALESCE');
    expect(OverflowAction.SNAPSHOT_ONLY).toBe('SNAPSHOT_ONLY');
    expect(OverflowAction.SPILL_TO_DISK).toBe('SPILL_TO_DISK');
  });

  it('exposes exactly five members', () => {
    expect(Object.keys(OverflowAction)).toHaveLength(5);
  });

  it('is assignable to the OverflowActionValue union type', () => {
    const actions: OverflowActionValue[] = [
      OverflowAction.DROP_OLDEST,
      OverflowAction.REJECT_NEW,
      OverflowAction.COALESCE,
      OverflowAction.SNAPSHOT_ONLY,
      OverflowAction.SPILL_TO_DISK,
    ];
    expect(actions).toHaveLength(5);
  });
});
