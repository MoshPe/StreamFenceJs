import type { RawServerEntry } from './RawServerEntry.js';

/**
 * Top-level shape of a StreamFence YAML/JSON config file after parsing.
 *
 * The `servers` map key is the server name used in
 * `StreamFenceServerBuilder.fromYaml(path, { server: '<name>' })`.
 *
 * @internal
 */
export interface RawServerConfig {
  servers: Record<string, RawServerEntry>;
}
