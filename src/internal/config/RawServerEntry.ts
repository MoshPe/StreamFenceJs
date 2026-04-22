import type { RawNamespaceConfig } from './RawNamespaceConfig.js';

/**
 * Raw (unvalidated) server entry as parsed from a YAML/JSON config file.
 *
 * All fields except `port` and `namespaces` are optional — missing fields are
 * defaulted by `SpecMapper` to match `StreamFenceServerBuilder` defaults.
 *
 * @internal
 */
export interface RawServerEntry {
  host?: string;
  port: number;
  transport?: string;
  engineIoTransport?: string;
  auth?: string;
  spillRootPath?: string;
  tls?: {
    certChainPemPath: string;
    privateKeyPemPath: string;
    protocol?: string;
    privateKeyPassword?: string;
  };
  namespaces: RawNamespaceConfig[];
}
