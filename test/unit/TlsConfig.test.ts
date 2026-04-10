import { describe, expect, it } from 'vitest';
import { TlsConfig } from '../../src/TlsConfig.js';

describe('TlsConfig', () => {
  it('creates a config with the provided fields and defaults protocol to TLSv1.3', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/etc/ssl/cert.pem',
      privateKeyPemPath: '/etc/ssl/key.pem',
    });
    expect(cfg.certChainPemPath).toBe('/etc/ssl/cert.pem');
    expect(cfg.privateKeyPemPath).toBe('/etc/ssl/key.pem');
    expect(cfg.privateKeyPassword).toBeNull();
    expect(cfg.protocol).toBe('TLSv1.3');
  });

  it('accepts an explicit private-key passphrase', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/a',
      privateKeyPemPath: '/b',
      privateKeyPassword: 'secret',
    });
    expect(cfg.privateKeyPassword).toBe('secret');
  });

  it('accepts an explicit protocol version', () => {
    const cfg = TlsConfig.create({
      certChainPemPath: '/a',
      privateKeyPemPath: '/b',
      protocol: 'TLSv1.2',
    });
    expect(cfg.protocol).toBe('TLSv1.2');
  });

  it('throws when certChainPemPath is missing or blank', () => {
    expect(() => TlsConfig.create({ certChainPemPath: '', privateKeyPemPath: '/b' })).toThrow(
      'certChainPemPath is required',
    );
  });

  it('throws when privateKeyPemPath is missing or blank', () => {
    expect(() => TlsConfig.create({ certChainPemPath: '/a', privateKeyPemPath: '   ' })).toThrow(
      'privateKeyPemPath is required',
    );
  });

  it('returns a frozen object', () => {
    const cfg = TlsConfig.create({ certChainPemPath: '/a', privateKeyPemPath: '/b' });
    expect(Object.isFrozen(cfg)).toBe(true);
  });
});
