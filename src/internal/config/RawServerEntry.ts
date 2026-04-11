import type { RawNamespaceConfig } from './RawNamespaceConfig.js';

/**
 * Raw (unparsed/unvalidated) server entry configuration as read from the config file.
 * All fields are optional to accommodate partial overrides or defaults applied later.
 *
 * @internal
 */
export interface RawServerEntry {
  host?: string;
  port?: number;
  managementPort?: number;
  transport?: string;
  engineIoTransport?: string;
  auth?: string;
  spillRootPath?: string;
  namespaces?: RawNamespaceConfig[];
}
