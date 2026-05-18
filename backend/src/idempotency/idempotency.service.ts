import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {ActorType, IdempotencyKey, IdempotencyStatus, Prisma} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../common/database/prisma.service';

export interface BeginIdempotencyInput {
  actorType: ActorType;
  actorId: string;
  scope: string;
  key: string;
  requestBody: unknown;
  ttlSeconds?: number;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async begin(input: BeginIdempotencyInput, tx: Prisma.TransactionClient = this.prisma) {
    if (!input.key || input.key.length > 120) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }

    const requestHash = this.hashRequest(input.requestBody);
    const lockedUntil = new Date(Date.now() + (input.ttlSeconds ?? 120) * 1000);
    const existing = await tx.idempotencyKey.findUnique({
      where: {
        actorType_actorId_scope_key: {
          actorType: input.actorType,
          actorId: input.actorId,
          scope: input.scope,
          key: input.key
        }
      }
    });

    if (!existing) {
      return {
        state: 'started' as const,
        record: await tx.idempotencyKey.create({
          data: {
            actorType: input.actorType,
            actorId: input.actorId,
            scope: input.scope,
            key: input.key,
            requestHash,
            status: IdempotencyStatus.in_progress,
            lockedUntil
          }
        })
      };
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException('Idempotency key was reused with a different payload');
    }

    if (existing.status === IdempotencyStatus.completed) {
      return {
        state: 'replay' as const,
        record: existing,
        responseCode: existing.responseCode,
        responseBody: existing.responseBody
      };
    }

    if (existing.lockedUntil && existing.lockedUntil > new Date()) {
      throw new ConflictException('Request with this idempotency key is already in progress');
    }

    return {
      state: 'resumed' as const,
      record: await tx.idempotencyKey.update({
        where: { id: existing.id },
        data: {
          status: IdempotencyStatus.in_progress,
          lockedUntil
        }
      })
    };
  }

  async complete(
    recordId: string,
    responseCode: number,
    responseBody: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient = this.prisma
  ): Promise<IdempotencyKey> {
    return tx.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: IdempotencyStatus.completed,
        responseCode,
        responseBody,
        lockedUntil: null
      }
    });
  }

  async fail(recordId: string, tx: Prisma.TransactionClient = this.prisma): Promise<IdempotencyKey> {
    return tx.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: IdempotencyStatus.failed,
        lockedUntil: null
      }
    });
  }

  hashRequest(body: unknown): string {
    return createHash('sha256').update(this.stableStringify(body)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
      .join(',')}}`;
  }
}
