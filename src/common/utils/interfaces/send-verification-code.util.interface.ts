export interface SendVerificationCodeToEmail {
  email: string;
  subject: string;
  contents: string;
  verificationCode: string;
  expireTime: number;
}
