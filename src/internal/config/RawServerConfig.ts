import type { RawServerEntry } from './RawServerEntry.js';

/**
 * Raw (unparsed/unvalidated) root configuration as read from the config file.
 * Contains a map of server entries (typically 'feed' and 'control').
 *
 * @internal
 */
export interface RawServerConfig {
  servers?: Record<string, RawServerEntry>;
}
