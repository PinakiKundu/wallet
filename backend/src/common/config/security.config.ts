import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  mockUpiWebhookSecret: process.env.MOCK_UPI_WEBHOOK_SECRET
}));
