/**
 * TLS/SSL configuration for a `TransportMode.WSS` server.
 *
 * Paths are resolved at server start time. When a `TlsConfig` is present, the server
 * loads the PEM-encoded certificate chain and private key via Node's built-in `tls`
 * module.
 *
 * Mirrors `io.streamfence.TLSConfig` in the parent Java library. The Node version
 * drops `keyStorePassword` (no PKCS12 conversion needed) and names the type
 * `TlsConfig` to match TypeScript naming conventions.
 */
export interface TlsConfig {
  readonly certChainPemPath: string;
  readonly privateKeyPemPath: string;
  readonly privateKeyPassword: string | null;
  readonly protocol: string;
}

export interface TlsConfigInput {
  certChainPemPath: string;
  privateKeyPemPath: string;
  privateKeyPassword?: string;
  protocol?: string;
}

const DEFAULT_PROTOCOL = 'TLSv1.3';

function requireNonBlank(value: string | undefined, fieldName: string): string {
  if (value === undefined || value === null || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

/**
 * Static factory for building validated, immutable `TlsConfig` instances.
 */
export const TlsConfig = Object.freeze({
  /**
   * Builds a new `TlsConfig` from the given input, applying defaults (`protocol` =
   * `TLSv1.3`) and validating that required fields are non-blank.
   *
   * @throws Error if `certChainPemPath` or `privateKeyPemPath` is missing or blank
   */
  create(input: TlsConfigInput): TlsConfig {
    const certChainPemPath = requireNonBlank(input.certChainPemPath, 'certChainPemPath');
    const privateKeyPemPath = requireNonBlank(input.privateKeyPemPath, 'privateKeyPemPath');
    const privateKeyPassword =
      input.privateKeyPassword === undefined || input.privateKeyPassword === ''
        ? null
        : input.privateKeyPassword;
    const protocol =
      input.protocol === undefined || input.protocol.trim() === ''
        ? DEFAULT_PROTOCOL
        : input.protocol;

    return Object.freeze({
      certChainPemPath,
      privateKeyPemPath,
      privateKeyPassword,
      protocol,
    });
  },
});
