import { writeFile, rename, readdir, readFile, unlink } from 'node:fs/promises';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { serialize, deserialize } from './SpilledEntry.js';
import type { SpilledEntryData } from './SpilledEntry.js';
import type { LaneEntry } from './LaneEntry.js';

export class DiskSpillQueue {
  private count: number;
  private nextSeq: number;
  private readonly flushPromises = new Set<Promise<void>>();

  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
    const existing = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    this.count = existing.length;
    if (existing.length > 0) {
      const lastFile = existing[existing.length - 1];
      this.nextSeq = parseInt(lastFile!.replace('.json', ''), 10) + 1;
    } else {
      this.nextSeq = 1;
    }
  }

  spill(entry: LaneEntry): void {
    const seq = this.nextSeq;
    this.nextSeq += 1;
    this.count += 1;
    const p = this.writeEntry(entry, seq);
    this.flushPromises.add(p);
    void p.finally(() => this.flushPromises.delete(p));
  }

  private async writeEntry(entry: LaneEntry, seq: number): Promise<void> {
    const data = serialize(entry);
    const filename = String(seq).padStart(8, '0') + '.json';
    const tmpPath = join(this.dir, filename + '.tmp');
    const finalPath = join(this.dir, filename);
    try {
      await writeFile(tmpPath, JSON.stringify(data), 'utf8');
      await rename(tmpPath, finalPath);
    } catch {
      this.count = Math.max(0, this.count - 1);
    }
  }

  hasSpilled(): boolean {
    return this.count > 0;
  }

  get spilledCount(): number {
    return this.count;
  }

  async recover(maxCount: number): Promise<LaneEntry[]> {
    if (this.flushPromises.size > 0) {
      await Promise.allSettled(Array.from(this.flushPromises));
    }
    const files = (await readdir(this.dir)).filter(f => f.endsWith('.json')).sort();
    const toRecover = files.slice(0, maxCount);
    const entries: LaneEntry[] = [];
    for (const file of toRecover) {
      const filePath = join(this.dir, file);
      try {
        const raw = await readFile(filePath, 'utf8');
        const data = JSON.parse(raw) as SpilledEntryData;
        entries.push(deserialize(data));
        await unlink(filePath);
        this.count -= 1;
      } catch {
        // skip corrupt or missing files
      }
    }
    return entries;
  }

  async clear(): Promise<void> {
    const pending = Array.from(this.flushPromises);
    this.flushPromises.clear();
    this.count = 0;
    await Promise.allSettled(pending);
    try {
      const files = await readdir(this.dir);
      await Promise.all(
        files
          .filter(f => f.endsWith('.json') || f.endsWith('.tmp'))
          .map(f => unlink(join(this.dir, f)).catch(() => {})),
      );
    } catch {
      // best-effort cleanup
    }
  }
}
