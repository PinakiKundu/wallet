import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => ({
  upiPayeeVpa: process.env.UPI_PAYEE_VPA,
  upiPayeeName: process.env.UPI_PAYEE_NAME
}));
