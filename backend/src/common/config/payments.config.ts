import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => ({
  upiPayeeVpa: process.env.UPI_PAYEE_VPA ?? '9561999@upi',
  upiPayeeName: process.env.UPI_PAYEE_NAME ?? 'PiPay'
}));
