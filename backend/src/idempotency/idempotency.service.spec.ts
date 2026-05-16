import { ConflictException } from '@nestjs/common';
import { ActorType, IdempotencyStatus } from '@prisma/client';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const makeTx = (existing: Record<string, unknown> | null = null) => {
    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'idem-1', ...data })),
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
      }
    };

    return tx;
  };

  it('creates a new idempotency record for a first request', async () => {
    const service = new IdempotencyService({} as never);
    const tx = makeTx();

    const result = await service.begin(
      {
        actorType: ActorType.user,
        actorId: '00000000-0000-0000-0000-000000000001',
        scope: 'wallet-payment',
        key: 'key-1',
        requestBody: { amount: 100, merchantCode: 'MWK-DEMO001' }
      },
      tx as never
    );

    expect(result.state).toBe('started');
    expect(tx.idempotencyKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: ActorType.user,
        scope: 'wallet-payment',
        key: 'key-1',
        status: IdempotencyStatus.in_progress
      })
    });
  });

  it('replays completed responses for matching payloads', async () => {
    const service = new IdempotencyService({} as never);
    const requestBody = { b: 2, a: 1 };
    const tx = makeTx({
      id: 'idem-1',
      requestHash: service.hashRequest({ a: 1, b: 2 }),
      status: IdempotencyStatus.completed,
      responseCode: 200,
      responseBody: { ok: true }
    });

    const result = await service.begin(
      {
        actorType: ActorType.user,
        actorId: '00000000-0000-0000-0000-000000000001',
        scope: 'wallet-payment',
        key: 'key-1',
        requestBody
      },
      tx as never
    );

    expect(result).toMatchObject({
      state: 'replay',
      responseCode: 200,
      responseBody: { ok: true }
    });
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    const service = new IdempotencyService({} as never);
    const tx = makeTx({
      id: 'idem-1',
      requestHash: service.hashRequest({ amount: 100 }),
      status: IdempotencyStatus.completed
    });

    await expect(
      service.begin(
        {
          actorType: ActorType.user,
          actorId: '00000000-0000-0000-0000-000000000001',
          scope: 'wallet-payment',
          key: 'key-1',
          requestBody: { amount: 200 }
        },
        tx as never
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
