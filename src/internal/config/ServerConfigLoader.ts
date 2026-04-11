import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { RawServerConfig } from './RawServerConfig.js';

/**
 * Reads a YAML or JSON config file from disk and returns the raw parsed content.
 *
 * Supported extensions: `.yaml`, `.yml`, `.json`
 *
 * This function performs no validation of field values — field mapping and
 * validation is the responsibility of `SpecMapper`.
 *
 * @throws Error with descriptive message for: unsupported extension, missing
 *   file, or parse failure.
 *
 * @internal
 */
export function loadServerConfig(filePath: string): RawServerConfig {
  const ext = extname(filePath).toLowerCase();

  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
    throw new Error(
      `Unsupported config file extension "${ext}" (expected .yaml, .yml, or .json)`,
    );
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read config file "${filePath}": ${message}`);
  }

  try {
    if (ext === '.json') {
      return JSON.parse(raw) as RawServerConfig;
    }
    return parseYaml(raw) as RawServerConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse config file "${filePath}": ${message}`);
  }
}
