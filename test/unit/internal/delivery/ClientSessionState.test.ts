import { describe, expect, it, vi } from 'vitest';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
import { ClientLane } from '../../../../src/internal/delivery/ClientLane.js';
import { makeFakeTransportClient, makeTopicPolicy } from './helpers.js';

describe('ClientSessionState', () => {
  it('tracks subscriptions and lazily creates topic lanes', () => {
    const session = new ClientSessionState(
      'client-1',
      '/feed',
      makeFakeTransportClient('client-1'),
    );

    session.subscribe('snapshot');

    expect(session.isSubscribed('snapshot')).toBe(true);
    expect(session.subscribedTopics()).toEqual(['snapshot']);
    expect(session.lane('snapshot')).toBeUndefined();

    const lane = session.lane(
      'snapshot',
      makeTopicPolicy({ namespace: '/feed', topic: 'snapshot' }),
    );

    expect(lane).toBeDefined();
    expect(session.lane('snapshot')).toBe(lane);
  });

  it('guards topic drains so only one can run at a time', () => {
    const session = new ClientSessionState(
      'client-1',
      '/feed',
      makeFakeTransportClient('client-1'),
    );

    expect(session.startDrain('snapshot')).toBe(true);
    expect(session.startDrain('snapshot')).toBe(false);
    expect(session.isDraining('snapshot')).toBe(true);

    session.finishDrain('snapshot');

    expect(session.isDraining('snapshot')).toBe(false);
    expect(session.startDrain('snapshot')).toBe(true);
  });

  it('uses the injected lane factory when creating topic lanes', () => {
    const laneFactory = vi.fn((topic: string, policy: ReturnType<typeof makeTopicPolicy>) => {
      expect(topic).toBe('snapshot');
      return new ClientLane(policy);
    });

    const session = new ClientSessionState(
      'client-1',
      '/feed',
      makeFakeTransportClient('client-1'),
      laneFactory,
    );
    const policy = makeTopicPolicy({ namespace: '/feed', topic: 'snapshot' });

    const lane = session.lane('snapshot', policy);

    expect(laneFactory).toHaveBeenCalledWith('snapshot', policy);
    expect(session.lane('snapshot')).toBe(lane);
  });
});
