import { describe, expectTypeOf, it } from 'vitest';
import type { AckPayload } from '../../../../src/internal/protocol/AckPayload.js';
import type { ErrorPayload } from '../../../../src/internal/protocol/ErrorPayload.js';
import type { PublishRequest } from '../../../../src/internal/protocol/PublishRequest.js';
import type { SubscriptionRequest } from '../../../../src/internal/protocol/SubscriptionRequest.js';

describe('small protocol records - type shape', () => {
  it('AckPayload has topic + messageId strings', () => {
    expectTypeOf<AckPayload>().toEqualTypeOf<{
      readonly topic: string;
      readonly messageId: string;
    }>();
  });

  it('ErrorPayload has code + message strings', () => {
    expectTypeOf<ErrorPayload>().toEqualTypeOf<{
      readonly code: string;
      readonly message: string;
    }>();
  });

  it('PublishRequest has topic string, unknown payload, nullable token', () => {
    expectTypeOf<PublishRequest>().toEqualTypeOf<{
      readonly topic: string;
      readonly payload: unknown;
      readonly token: string | null;
    }>();
  });

  it('SubscriptionRequest has topic string and nullable token', () => {
    expectTypeOf<SubscriptionRequest>().toEqualTypeOf<{
      readonly topic: string;
      readonly token: string | null;
    }>();
  });
});
