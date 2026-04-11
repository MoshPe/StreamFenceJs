/**
 * Controls when the server acknowledges inbound client messages.
 */
export const InboundAckPolicy = {
  ACK_ON_RECEIPT: 'ACK_ON_RECEIPT',
  ACK_AFTER_HANDLER_SUCCESS: 'ACK_AFTER_HANDLER_SUCCESS',
} as const;

export type InboundAckPolicyValue =
  (typeof InboundAckPolicy)[keyof typeof InboundAckPolicy];
