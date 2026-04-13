import { mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { serialize, deserialize } from './SpilledEntry.js';
import type { SpilledEntryData } from './SpilledEntry.js';
import type { LaneEntry } from './LaneEntry.js';

export class DiskSpillQueue {
  private count: number;
  private nextSeq: number;

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
    const data = serialize(entry);
    const seq = this.nextSeq;
    this.nextSeq += 1;
    const filename = String(seq).padStart(8, '0') + '.json';
    const tmpPath = join(this.dir, filename + '.tmp');
    const finalPath = join(this.dir, filename);
    writeFileSync(tmpPath, JSON.stringify(data), 'utf8');
    renameSync(tmpPath, finalPath);
    this.count += 1;
  }

  hasSpilled(): boolean {
    return this.count > 0;
  }

  get spilledCount(): number {
    return this.count;
  }

  recover(maxCount: number): LaneEntry[] {
    const files = readdirSync(this.dir).filter(f => f.endsWith('.json')).sort();
    const toRecover = files.slice(0, maxCount);
    const entries: LaneEntry[] = [];
    for (const file of toRecover) {
      const filePath = join(this.dir, file);
      const raw = readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw) as SpilledEntryData;
      entries.push(deserialize(data));
      unlinkSync(filePath);
      this.count -= 1;
    }
    return entries;
  }

  clear(): void {
    const files = readdirSync(this.dir).filter(f => f.endsWith('.json') || f.endsWith('.tmp'));
    for (const file of files) {
      unlinkSync(join(this.dir, file));
    }
    this.count = 0;
  }
}
