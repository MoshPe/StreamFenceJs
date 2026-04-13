import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DiskSpillQueue } from '../../../../src/internal/delivery/DiskSpillQueue.js';
import { makeLaneEntry, makePublishedMessage } from './helpers.js';

describe('DiskSpillQueue', () => {
  it('round-trips spilled entries and preserves FIFO order across queue recreation', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-disk-spill-'));

    try {
      const writer = new DiskSpillQueue(spillRoot);
      writer.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
      writer.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }));

      const reader = new DiskSpillQueue(spillRoot);
      const recovered = reader.recover(10);

      expect(recovered.map((entry) => entry.messageId)).toEqual(['m1', 'm2']);
      expect(reader.hasSpilled()).toBe(false);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });

  it('clears spilled json and temp files', () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-disk-spill-clear-'));

    try {
      const queue = new DiskSpillQueue(spillRoot);
      queue.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));

      queue.clear();

      expect(queue.hasSpilled()).toBe(false);
      expect(queue.recover(10)).toEqual([]);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });
});
