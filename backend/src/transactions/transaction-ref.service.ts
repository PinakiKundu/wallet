import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class TransactionRefService {
  generate(prefix = 'txn'): string {
    return `${prefix}_${Date.now().toString(36)}_${randomBytes(8).toString('hex')}`;
  }
}
