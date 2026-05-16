import { BadRequestException } from '@nestjs/common';

export const INR = 'INR';
export const MAX_SAFE_PAISE = BigInt(Number.MAX_SAFE_INTEGER);

export function parsePositivePaise(value: number | string | bigint): bigint {
  const amount = typeof value === 'bigint' ? value : BigInt(value);

  if (amount <= 0n) {
    throw new BadRequestException('Amount must be greater than zero');
  }

  return amount;
}

export function paiseToApi(value: bigint): string {
  return value.toString();
}

export function assertSafeApiAmount(value: bigint): number {
  if (value > MAX_SAFE_PAISE || value < -MAX_SAFE_PAISE) {
    throw new BadRequestException('Amount exceeds safe integer range');
  }

  return Number(value);
}
