import { describe, expect, it } from 'vitest';
import { ClientSessionRegistry } from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
import { makeFakeTransportClient } from './helpers.js';

function makeSession(clientId: string): ClientSessionState {
  return new ClientSessionState(clientId, '/feed', makeFakeTransportClient(clientId));
}

describe('ClientSessionRegistry', () => {
  it('registers and resolves sessions by client id', () => {
    const registry = new ClientSessionRegistry();
    const session = makeSession('client-1');

    registry.register(session);

    expect(registry.get('client-1')).toBe(session);

    registry.remove('client-1');

    expect(registry.get('client-1')).toBeUndefined();
  });

  it('indexes subscribers per namespace/topic key', () => {
    const registry = new ClientSessionRegistry();
    const first = makeSession('client-1');
    const second = makeSession('client-2');

    registry.register(first);
    registry.register(second);
    registry.subscribe(first, 'snapshot');
    registry.subscribe(second, 'snapshot');

    expect(registry.subscribersOf('/feed', 'snapshot').map((s) => s.clientId)).toEqual([
      'client-1',
      'client-2',
    ]);

    registry.unsubscribe(first, 'snapshot');

    expect(registry.subscribersOf('/feed', 'snapshot').map((s) => s.clientId)).toEqual([
      'client-2',
    ]);
  });
});
