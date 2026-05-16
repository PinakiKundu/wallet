export interface OtpDeliveryInput {
  mobileNumber: string;
  otp: string;
  purpose: string;
}

export interface OtpDeliveryResult {
  provider: string;
  messageId?: string;
}

export interface OtpDeliveryProvider {
  sendOtp(input: OtpDeliveryInput): Promise<OtpDeliveryResult>;
}
