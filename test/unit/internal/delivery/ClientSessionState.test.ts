import { describe, expect, it } from 'vitest';
import { ClientSessionState } from '../../../../src/internal/delivery/ClientSessionState.js';
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
});
