import { OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt?: number;
}

export class RedisService implements OnModuleDestroy {
  private readonly client?: Redis;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(redisUrl?: string) {
    if (redisUrl && redisUrl !== 'memory' && redisUrl !== 'disabled') {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      this.memory.clear();
      return;
    }

    if (this.client.status === 'wait' || this.client.status === 'end') {
      return;
    }

    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      const entry = this.memory.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        this.memory.delete(key);
        return null;
      }

      return entry.value;
    }

    return this.client.get(key);
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) {
      this.memory.set(key, {
        value: JSON.stringify(value),
        expiresAt: Date.now() + ttlSeconds * 1000
      });
      return;
    }

    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      this.memory.delete(key);
      return;
    }

    await this.client.del(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client) {
      const current = await this.get(key);
      const count = Number(current ?? 0) + 1;
      this.memory.set(key, {
        value: String(count),
        expiresAt: current ? this.memory.get(key)?.expiresAt : Date.now() + ttlSeconds * 1000
      });
      return count;
    }

    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    const ttl = Number(results?.[1]?.[1] ?? -1);

    if (ttl < 0) {
      await this.client.expire(key, ttlSeconds);
    }

    return count;
  }

  async ping(): Promise<string> {
    if (!this.client) {
      return 'PONG';
    }

    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    return this.client.ping();
  }
}
