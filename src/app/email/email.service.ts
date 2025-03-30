import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  constructor() {
    this.resend = new Resend('re_9r9boxcm_JcGv47LLDk7viRvwF3xQqmgw');
  }

  public async sendVerifyCode(email: string) {
    try {
      const data = await this.resend.emails.send({
        from: 'Rating Everything <onboarding@resend.dev>',
        to: email,
        subject: 'Verification Code',
        html: '<p>Your verification code is: <strong>cf1a3f828287</strong></p>',
      });
      console.log('success:', data);
    } catch (error) {
      console.error('error:', error);
    }
  }
}
