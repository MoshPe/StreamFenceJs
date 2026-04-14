import { join } from 'node:path';
import { DiskSpillQueue } from './DiskSpillQueue.js';

export interface DiskSpillQueueFactory {
  create(namespace: string, clientId: string, topic: string): DiskSpillQueue;
}

export class DefaultDiskSpillQueueFactory implements DiskSpillQueueFactory {
  constructor(private readonly spillRootPath: string) {}

  create(namespace: string, clientId: string, topic: string): DiskSpillQueue {
    const sanitizedNs = namespace.replace(/^\//, '').replace(/\//g, '_') || '_root';
    return new DiskSpillQueue(join(this.spillRootPath, sanitizedNs, clientId, topic));
  }
}
