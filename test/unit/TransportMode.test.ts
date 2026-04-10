import { describe, expect, it } from 'vitest';
import { TransportMode, type TransportModeValue } from '../../src/TransportMode.js';

describe('TransportMode', () => {
  it('has WS and WSS members matching the Java enum', () => {
    expect(TransportMode.WS).toBe('WS');
    expect(TransportMode.WSS).toBe('WSS');
  });

  it('exposes exactly two members', () => {
    expect(Object.keys(TransportMode)).toHaveLength(2);
  });

  it('is assignable to the TransportModeValue union type', () => {
    const modes: TransportModeValue[] = [TransportMode.WS, TransportMode.WSS];
    expect(modes).toHaveLength(2);
  });
});
