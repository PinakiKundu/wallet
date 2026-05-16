import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }])
          }
        },
        {
          provide: RedisService,
          useValue: {
            ping: jest.fn().mockResolvedValue('PONG')
          }
        }
      ]
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns liveness status', () => {
    expect(controller.live()).toMatchObject({
      status: 'ok',
      service: 'digital-wallet-backend'
    });
  });

  it('checks readiness dependencies', async () => {
    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
      dependencies: {
        database: 'ok',
        redis: 'ok'
      }
    });
  });
});
