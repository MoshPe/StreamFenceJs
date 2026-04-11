import { describe, expect, it } from 'vitest';
import {
  EngineIoTransportMode,
  type EngineIoTransportModeValue,
} from '../../src/EngineIoTransportMode.js';

describe('EngineIoTransportMode', () => {
  it('exposes websocket-only and websocket-or-polling values', () => {
    const websocketOnly: EngineIoTransportModeValue = EngineIoTransportMode.WEBSOCKET_ONLY;
    const websocketOrPolling: EngineIoTransportModeValue =
      EngineIoTransportMode.WEBSOCKET_OR_POLLING;

    expect(websocketOnly).toBe('WEBSOCKET_ONLY');
    expect(websocketOrPolling).toBe('WEBSOCKET_OR_POLLING');
    expect(Object.keys(EngineIoTransportMode)).toEqual([
      'WEBSOCKET_ONLY',
      'WEBSOCKET_OR_POLLING',
    ]);
  });
});
