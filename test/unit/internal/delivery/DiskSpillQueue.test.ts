import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DiskSpillQueue } from '../../../../src/internal/delivery/DiskSpillQueue.js';
import { makeLaneEntry, makePublishedMessage } from './helpers.js';

describe('DiskSpillQueue', () => {
  it('round-trips spilled entries and preserves FIFO order', async () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-disk-spill-'));

    try {
      const queue = new DiskSpillQueue(spillRoot);
      queue.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
      queue.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }));

      const recovered = await queue.recover(10);

      expect(recovered.map((entry) => entry.messageId)).toEqual(['m1', 'm2']);
      expect(queue.hasSpilled()).toBe(false);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });

  it('picks up pre-existing files on construction after writes settle', async () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-disk-spill-recreate-'));

    try {
      const writer = new DiskSpillQueue(spillRoot);
      writer.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));
      writer.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm2' }) }));

      // recover(0) awaits pending flushes without consuming entries
      await writer.recover(0);

      const reader = new DiskSpillQueue(spillRoot);
      const recovered = await reader.recover(10);

      expect(recovered.map((entry) => entry.messageId)).toEqual(['m1', 'm2']);
      expect(reader.hasSpilled()).toBe(false);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });

  it('clears spilled json and temp files', async () => {
    const spillRoot = mkdtempSync(join(tmpdir(), 'streamfence-disk-spill-clear-'));

    try {
      const queue = new DiskSpillQueue(spillRoot);
      queue.spill(makeLaneEntry({ publishedMessage: makePublishedMessage({ messageId: 'm1' }) }));

      await queue.clear();

      expect(queue.hasSpilled()).toBe(false);
      expect(await queue.recover(10)).toEqual([]);
    } finally {
      rmSync(spillRoot, { force: true, recursive: true });
    }
  });
});
