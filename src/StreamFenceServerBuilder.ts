import { extname } from 'node:path';
import { AuthMode, type AuthModeValue } from './AuthMode.js';
import {
  EngineIoTransportMode,
  type EngineIoTransportModeValue,
} from './EngineIoTransportMode.js';
import { loadServerConfig } from './internal/config/ServerConfigLoader.js';
import { mapServerConfig } from './internal/config/SpecMapper.js';
import type { NamespaceSpec } from './NamespaceSpec.js';
import type { ServerEventListener } from './ServerEventListener.js';
import { NoopServerMetrics, type ServerMetrics } from './ServerMetrics.js';
import { StreamFenceServer } from './StreamFenceServer.js';
import {
  createStreamFenceServerSpec,
  type StreamFenceServerSpec,
} from './StreamFenceServerSpec.js';
import type { TlsConfig } from './TlsConfig.js';
import type { TokenValidator } from './TokenValidator.js';
import { TransportMode, type TransportModeValue } from './TransportMode.js';

export class StreamFenceServerBuilder {
  private hostValue = '0.0.0.0';
  private portValue = 0;
  private managementPortValue: number | null = null;
  private transportModeValue: TransportModeValue = TransportMode.WS;
  private engineIoTransportModeValue: EngineIoTransportModeValue =
    EngineIoTransportMode.WEBSOCKET_OR_POLLING;
  private authModeValue: AuthModeValue = AuthMode.NONE;
  private tokenValidatorValue: TokenValidator | null = null;
  private tlsConfigValue: TlsConfig | null = null;
  private readonly listenersValue: ServerEventListener[] = [];
  private metricsValue: ServerMetrics = new NoopServerMetrics();
  private spillRootPathValue = '.streamfence-spill';
  private readonly namespacesValue: NamespaceSpec[] = [];

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  static fromYaml(filePath: string, options: { server: string }): StreamFenceServerBuilder {
    const raw = loadServerConfig(filePath);
    const spec = mapServerConfig(raw, options.server);
    return StreamFenceServerBuilder.fromSpec(spec);
  }

  static fromJson(filePath: string, options: { server: string }): StreamFenceServerBuilder {
    const ext = extname(filePath).toLowerCase();
    if (ext !== '.json') {
      throw new Error(
        `Unsupported config file extension "${ext}" for fromJson (expected .json): ${filePath}`,
      );
    }
    const raw = loadServerConfig(filePath);
    const spec = mapServerConfig(raw, options.server);
    return StreamFenceServerBuilder.fromSpec(spec);
  }

  private static fromSpec(spec: StreamFenceServerSpec): StreamFenceServerBuilder {
    const builder = new StreamFenceServerBuilder();
    builder.hostValue = spec.host;
    builder.portValue = spec.port;
    builder.managementPortValue = spec.managementPort;
    builder.transportModeValue = spec.transportMode;
    builder.engineIoTransportModeValue = spec.engineIoTransportMode;
    builder.authModeValue = spec.authMode;
    builder.tokenValidatorValue = spec.tokenValidator;
    builder.tlsConfigValue = spec.tlsConfig;
    builder.metricsValue = spec.metrics;
    builder.spillRootPathValue = spec.spillRootPath;
    for (const listener of spec.listeners) {
      builder.listenersValue.push(listener);
    }
    for (const ns of spec.namespaces) {
      builder.namespacesValue.push(ns);
    }
    return builder;
  }

  host(value: string): this {
    this.hostValue = value;
    return this;
  }

  port(value: number): this {
    this.portValue = value;
    return this;
  }

  managementPort(value: number | null): this {
    this.managementPortValue = value;
    return this;
  }

  transportMode(value: TransportModeValue): this {
    this.transportModeValue = value;
    return this;
  }

  engineIoTransportMode(value: EngineIoTransportModeValue): this {
    this.engineIoTransportModeValue = value;
    return this;
  }

  authMode(value: AuthModeValue): this {
    this.authModeValue = value;
    return this;
  }

  tokenValidator(value: TokenValidator | null): this {
    this.tokenValidatorValue = value;
    return this;
  }

  tlsConfig(value: TlsConfig | null): this {
    this.tlsConfigValue = value;
    return this;
  }

  listener(value: ServerEventListener): this {
    this.listenersValue.push(value);
    return this;
  }

  metrics(value: ServerMetrics): this {
    this.metricsValue = value;
    return this;
  }

  spillRootPath(value: string): this {
    this.spillRootPathValue = value;
    return this;
  }

  namespace(value: NamespaceSpec): this {
    if (this.namespacesValue.some((item) => item.path === value.path)) {
      throw new Error(`duplicate namespace path: ${value.path}`);
    }

    this.namespacesValue.push(value);
    return this;
  }

  buildSpec(): StreamFenceServerSpec {
    return createStreamFenceServerSpec({
      host: this.hostValue,
      port: this.portValue,
      managementPort: this.managementPortValue,
      transportMode: this.transportModeValue,
      engineIoTransportMode: this.engineIoTransportModeValue,
      authMode: this.authModeValue,
      tokenValidator: this.tokenValidatorValue,
      tlsConfig: this.tlsConfigValue,
      listeners: this.listenersValue,
      metrics: this.metricsValue,
      spillRootPath: this.spillRootPathValue,
      namespaces: this.namespacesValue,
    });
  }

  buildServer(): StreamFenceServer {
    if (this.namespacesValue.length === 0) {
      throw new Error('StreamFenceServer requires at least one namespace');
    }

    return new StreamFenceServer(this.buildSpec());
  }
}
