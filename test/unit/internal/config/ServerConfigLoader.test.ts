import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadServerConfig } from '../../../../src/internal/config/ServerConfigLoader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../../../fixtures/config');

describe('loadServerConfig', () => {
  it('loads a valid YAML file and returns a RawServerConfig', () => {
    const config = loadServerConfig(join(fixturesDir, 'streamfence.valid.yaml'));
    expect(config.servers).toBeDefined();
    expect(config.servers['feed']).toBeDefined();
    expect(config.servers['feed']?.port).toBe(3000);
    expect(config.servers['control']).toBeDefined();
    expect(config.servers['control']?.port).toBe(3001);
  });

  it('loads a valid JSON file and returns a RawServerConfig', () => {
    const config = loadServerConfig(join(fixturesDir, 'streamfence.valid.json'));
    expect(config.servers['feed']?.host).toBe('127.0.0.1');
    expect(config.servers['feed']?.namespaces[0]?.path).toBe('/feed');
  });

  it('also accepts .yml extension', () => {
    const config = loadServerConfig(join(fixturesDir, 'streamfence.minimal.yml'));
    expect(config.servers['feed']?.port).toBe(3000);
  });

  it('throws a descriptive error for unsupported file extensions', () => {
    const badPath = join(fixturesDir, 'config.toml');
    expect(() => loadServerConfig(badPath)).toThrow(
      'Unsupported config file extension ".toml" (expected .yaml, .yml, or .json)',
    );
  });

  it('throws a descriptive error when the file does not exist', () => {
    const missingPath = join(fixturesDir, 'does-not-exist.yaml');
    expect(() => loadServerConfig(missingPath)).toThrow(
      `Failed to read config file "${missingPath}"`,
    );
  });

  it('throws a descriptive error when the YAML is malformed', () => {
    expect(() =>
      loadServerConfig(join(fixturesDir, 'streamfence.invalid.yaml')),
    ).toThrow(/Failed to parse config file/);
  });

  it('throws a descriptive error when the JSON is malformed', () => {
    expect(() =>
      loadServerConfig(join(fixturesDir, 'streamfence.invalid.json')),
    ).toThrow(/Failed to parse config file/);
  });
});
