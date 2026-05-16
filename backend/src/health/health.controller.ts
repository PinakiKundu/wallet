import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get('live')
  @ApiOkResponse({ description: 'Process is alive' })
  live() {
    return {
      status: 'ok',
      service: 'digital-wallet-backend',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Dependencies are reachable' })
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.ping();

    return {
      status: 'ok',
      dependencies: {
        database: 'ok',
        redis: 'ok'
      },
      timestamp: new Date().toISOString()
    };
  }
}
