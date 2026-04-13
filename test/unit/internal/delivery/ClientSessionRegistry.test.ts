import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { OverflowAction } from '../../../../src/OverflowAction.js';
import { ClientLane } from '../../../../src/internal/delivery/ClientLane.js';
import { ClientSessionRegistry } from '../../../../src/internal/delivery/ClientSessionRegistry.js';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
import { DiskSpillQueue } from '../../../../src/internal/delivery/DiskSpillQueue.js';
import { makeLaneEntry, makePublishedMessage, makeFakeTransportClient, makeTopicPolicy } from './helpers.js';

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

  it('purges spilled lane files when a session is removed', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-session-registry-'));

    try {
      const spillDir = join(spillRoot, 'feed', 'client-1', 'snapshot');
      const registry = new ClientSessionRegistry();
      const session = new ClientSessionState(
        'client-1',
        '/feed',
        makeFakeTransportClient('client-1'),
        (topic, policy) => new ClientLane(policy, new DiskSpillQueue(join(spillRoot, 'feed', 'client-1', topic))),
      );

      registry.register(session);
      registry.subscribe(session, 'snapshot');

      const lane = session.lane('snapshot', makeTopicPolicy({
        namespace: '/feed',
        topic: 'snapshot',
        overflowAction: OverflowAction.SPILL_TO_DISK,
        maxQueuedMessagesPerClient: 1,
      }));
      if (lane === undefined) {
        throw new Error('expected lane to be created');
      }

      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
      lane.enqueue(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }));

      expect(readdirSync(spillDir).filter((file) => file.endsWith('.json'))).toHaveLength(1);

      registry.remove('client-1');

      expect(readdirSync(spillDir).filter((file) => file.endsWith('.json'))).toEqual([]);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });
});
