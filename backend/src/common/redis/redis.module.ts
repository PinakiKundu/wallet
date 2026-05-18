import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new RedisService(config.get<string>('database.redisUrl'))
    }
  ],
  exports: [RedisService]
})
export class RedisModule {}
