import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    {
      provide: LoggerService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new LoggerService(config.get<string>('app.logLevel') ?? 'info')
    }
  ],
  exports: [LoggerService]
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
