import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  mobileNumber: string;
  deviceSessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  correlationId?: string;
}
