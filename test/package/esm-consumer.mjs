import {
  StreamFenceServer,
  StreamFenceServerBuilder,
  DeliveryMode,
  OverflowAction,
  TransportMode,
  AuthMode,
  EngineIoTransportMode,
  InboundAckPolicy,
  AuthDecision,
  TlsConfig,
  NamespaceSpec,
  PromServerMetrics,
  NoopServerMetrics,
} from '../../dist/index.js';

console.assert(typeof StreamFenceServer === 'function', 'StreamFenceServer missing');
console.assert(typeof StreamFenceServerBuilder === 'function', 'StreamFenceServerBuilder missing');
console.assert(DeliveryMode.BEST_EFFORT === 'BEST_EFFORT', 'DeliveryMode.BEST_EFFORT missing');
console.assert(DeliveryMode.AT_LEAST_ONCE === 'AT_LEAST_ONCE', 'DeliveryMode.AT_LEAST_ONCE missing');
console.assert(OverflowAction.DROP_OLDEST === 'DROP_OLDEST', 'OverflowAction.DROP_OLDEST missing');
console.assert(OverflowAction.REJECT_NEW === 'REJECT_NEW', 'OverflowAction.REJECT_NEW missing');
console.assert(TransportMode.WS === 'WS', 'TransportMode.WS missing');
console.assert(TransportMode.WSS === 'WSS', 'TransportMode.WSS missing');
console.assert(AuthMode.NONE === 'NONE', 'AuthMode.NONE missing');
console.assert(AuthMode.TOKEN === 'TOKEN', 'AuthMode.TOKEN missing');
console.assert(EngineIoTransportMode.WEBSOCKET_ONLY === 'WEBSOCKET_ONLY', 'EngineIoTransportMode missing');
console.assert(InboundAckPolicy.ACK_ON_RECEIPT === 'ACK_ON_RECEIPT', 'InboundAckPolicy missing');
console.assert(typeof AuthDecision.accept === 'function', 'AuthDecision.accept missing');
console.assert(typeof AuthDecision.reject === 'function', 'AuthDecision.reject missing');
console.assert(typeof TlsConfig.create === 'function', 'TlsConfig.create missing');
console.assert(typeof NamespaceSpec.builder === 'function', 'NamespaceSpec.builder missing');
console.assert(typeof PromServerMetrics === 'function', 'PromServerMetrics missing');
console.assert(typeof NoopServerMetrics === 'function', 'NoopServerMetrics missing');

// Verify static factory methods exist on builder
console.assert(typeof StreamFenceServerBuilder.fromYaml === 'function', 'fromYaml missing');
console.assert(typeof StreamFenceServerBuilder.fromJson === 'function', 'fromJson missing');

console.log('ESM consumer: OK');
