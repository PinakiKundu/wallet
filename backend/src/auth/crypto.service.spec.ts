import { ConfigService } from '@nestjs/config';
import { AuthCryptoService } from './crypto.service';

describe('AuthCryptoService', () => {
  it('compares hashes using the configured secret', () => {
    const service = new AuthCryptoService({
      getOrThrow: jest.fn().mockReturnValue('a-secure-test-secret-with-32-chars')
    } as unknown as ConfigService);

    const hash = service.hashSecret('refresh-token');

    expect(service.equalsHash('refresh-token', hash)).toBe(true);
    expect(service.equalsHash('other-token', hash)).toBe(false);
  });
});
