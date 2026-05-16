import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Response } from 'supertest';
import { AppModule } from '../../src/app.module';

const describeE2E = process.env.RUN_E2E === 'true' ? describe : describe.skip;

describeE2E('runtime smoke checks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    app.setGlobalPrefix(config.getOrThrow<string>('app.apiPrefix'));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves liveness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body.status ?? body.data?.status).toBe('ok');
      });
  });

  it('reaches database and redis readiness dependencies', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body.status ?? body.data?.status).toBe('ok');
      });
  });
});
